const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const ffmpegPath = require('ffmpeg-static');

// Load environment config
const envPath = path.resolve(__dirname, '../server/.env');
dotenv.config({ path: envPath });

const OSS_BUCKET = process.env.OSS_BUCKET || 'xlyq-htf';
const OSS_REGION = process.env.OSS_REGION || 'oss-cn-shenzhen';
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID;
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET;

const VIDEOS = [
  {
    id: 'XH-01',
    name: '张振东',
    originalUrl: 'https://xlyq-htf.oss-cn-shenzhen.aliyuncs.com/kos/videos/video_1793181007873_wgh7e.mov',
    outputFilename: 'video_xh01_zhangzhendong_opt.mp4',
    title: '基金*话'
  },
  {
    id: 'XH-02',
    name: '夏萌',
    originalUrl: 'https://xlyq-htf.oss-cn-shenzhen.aliyuncs.com/kos/videos/video_1793242071909_7u6an.mp4',
    outputFilename: 'video_xh02_xiameng_opt.mp4',
    title: '叮，10月来信'
  },
  {
    id: 'XH-03',
    name: '王炫霄',
    originalUrl: 'https://xlyq-htf.oss-cn-shenzhen.aliyuncs.com/kos/videos/video_1793325035406_zpjfq.mov',
    outputFilename: 'video_xh03_wangxuanxiao_opt.mp4',
    title: '一分钟带你看懂主动ETF'
  }
];

const workDir = path.resolve(__dirname, '../temp_transcoded');
if (!fs.existsSync(workDir)) {
  fs.mkdirSync(workDir, { recursive: true });
}

function runFfmpeg(inputUrl, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`[FFmpeg] Transcoding: ${inputUrl} -> ${outputPath}`);
    const args = [
      '-y',
      '-i', inputUrl,
      '-map', '0:v:0',
      '-map', '0:a:0',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '23',
      '-maxrate', '2800k',
      '-bufsize', '5600k',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-movflags', '+faststart',
      outputPath
    ];

    const child = spawn(ffmpegPath, args);

    child.stderr.on('data', (d) => {
      const line = d.toString();
      if (line.includes('time=')) {
        process.stdout.write(`\r[FFmpeg Progress] ${line.trim().slice(-60)}`);
      }
    });

    child.on('close', (code) => {
      console.log('');
      if (code === 0) {
        const stats = fs.statSync(outputPath);
        console.log(`[FFmpeg] Completed! Output size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function uploadToAliyunOss(localFilePath, objectKey) {
  const OSSModule = await import('ali-oss');
  const OSS = OSSModule.default || OSSModule;
  const ossClient = new OSS({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    secure: true
  });

  console.log(`[OSS] Uploading ${objectKey} (${(fs.statSync(localFilePath).size / 1024 / 1024).toFixed(2)} MB)...`);
  await ossClient.put(objectKey, localFilePath, {
    headers: {
      'Content-Type': 'video/mp4',
      'Cache-Control': 'max-age=31536000'
    }
  });
  const publicUrl = `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com/${objectKey}`;
  console.log(`[OSS] Uploaded successfully: ${publicUrl}`);
  return publicUrl;
}

async function updateDatabase(updates) {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: 3306
  });

  for (const item of updates) {
    console.log(`[DB] Updating ${item.id} (${item.name}) -> ${item.url} (${item.size})`);
    await pool.query(
      'UPDATE htf_kos_applications SET videoUrl = ?, videoSize = ? WHERE id = ?',
      [item.url, item.size, item.id]
    );
  }

  await pool.end();
  console.log('[DB] Database updated successfully.');
}

async function updateLocalSubmissions(updates) {
  const subsFile = path.resolve(__dirname, '../data/submissions.json');
  if (fs.existsSync(subsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(subsFile, 'utf-8'));
      let modified = false;
      for (const item of updates) {
        const found = data.find(x => x.id === item.id || x.name === item.name);
        if (found) {
          found.videoUrl = item.url;
          found.videoSize = item.size;
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(subsFile, JSON.stringify(data, null, 2), 'utf-8');
        console.log('[File] Updated data/submissions.json');
      }
    } catch (e) {
      console.warn('[File] Update submissions.json error:', e.message);
    }
  }
}

async function main() {
  const updates = [];

  for (const v of VIDEOS) {
    console.log(`\n========================================`);
    console.log(`Processing ${v.id}: ${v.name} (${v.title})`);
    console.log(`========================================`);

    const localOut = path.resolve(workDir, v.outputFilename);
    await runFfmpeg(v.originalUrl, localOut);

    const stats = fs.statSync(localOut);
    const sizeStr = (stats.size / 1024 / 1024).toFixed(1) + ' MB';

    const ossKey = `kos/videos/${v.outputFilename}`;
    const newUrl = await uploadToAliyunOss(localOut, ossKey);

    updates.push({
      id: v.id,
      name: v.name,
      url: newUrl,
      size: sizeStr
    });
  }

  console.log('\n--- Updating Database Records ---');
  await updateDatabase(updates);
  await updateLocalSubmissions(updates);

  console.log('\n🎉 ALL VIDEOS OPTIMIZED AND UPLOADED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
