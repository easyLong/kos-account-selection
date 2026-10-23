import fs from 'fs';
import path from 'path';
import os from 'os';
import busboy from 'busboy';
import dotenv from 'dotenv';

// Load .env from server directory
const envPath = path.resolve(process.cwd(), 'server', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const DATA_FILE = path.resolve(process.cwd(), 'data', 'submissions.json');
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'videos');

// Ensure data folder, upload folder and seed file exist
function initStorage() {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData = [
      {
        id: 'KOS-202610-1001',
        name: '张雅涵',
        gender: '女',
        department: '财富管理事业部',
        position: '投资顾问经理',
        jobNo: 'EMP0892',
        mobile: '13800138000',
        avatarUrl: '/images/kos_hero.jpg',
        surveyCompleted: true,
        surveyTime: '2026-10-22 14:32',
        surveyScore: 92,
        videoTitle: '3分钟带你读懂震荡市的资产配置底层逻辑',
        videoCategory: '稳健理财与资产配置派',
        videoIntro: '针对当前低利率环境与市场震荡痛点，面向大众白领投资者，以生动的生活场景类比股债平衡，传递长期定投与资产均衡配置的理性投资观。',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-on-a-video-call-with-a-laptop-41484-large.mp4',
        videoSize: '24.5 MB',
        videoDuration: '02:18',
        videoCover: '/images/kos_hero.jpg',
        status: '初筛通过',
        submittedAt: '2026-10-22 15:40:12'
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// Database connection state
let dbPool = null;
let dbAvailable = false;

async function initDatabase() {
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER) {
    console.log('[Storage] No MySQL config provided, using local JSON storage.');
    return;
  }

  try {
    const mysql = await import('mysql2/promise');
    dbPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 4000
    });

    // Test connection
    const conn = await dbPool.getConnection();
    console.log('[Database] MySQL connected successfully to ' + process.env.MYSQL_DATABASE);

    // Auto create table if not exists with full account & questionnaire schema
    await conn.query(`
      CREATE TABLE IF NOT EXISTS htf_kos_applications (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(100),
        gender VARCHAR(10),
        department VARCHAR(100),
        position VARCHAR(100),
        accountName VARCHAR(150),
        jobNo VARCHAR(64),
        mobile VARCHAR(32),
        avatarUrl TEXT,
        surveyCompleted TINYINT(1) DEFAULT 0,
        surveyTime VARCHAR(64),
        surveyScore INT DEFAULT 0,
        surveyScaleScore INT DEFAULT 0,
        surveySubjectiveScore INT DEFAULT 0,
        surveyRating VARCHAR(32),
        surveyAnswers LONGTEXT,
        videoTitle VARCHAR(255),
        videoCategory VARCHAR(100),
        videoIntro TEXT,
        accountPersona TEXT,
        specialtyTalent TEXT,
        videoUrl TEXT,
        videoSize VARCHAR(64),
        videoDuration VARCHAR(64),
        status VARCHAR(64) DEFAULT '待初筛',
        submittedAt VARCHAR(64),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_mobile (mobile)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    conn.release();
    dbAvailable = true;
  } catch (err) {
    console.warn('[Database] MySQL connection notice: ' + err.message);
    console.log('[Storage] Automatically using local high-reliability JSON storage (submissions.json)');
    dbAvailable = false;
  }
}

async function getStoredApplications() {
  initStorage();
  if (dbAvailable && dbPool) {
    try {
      const [rows] = await dbPool.query('SELECT * FROM htf_kos_applications ORDER BY createdAt DESC');
      if (rows && rows.length > 0) {
        return rows.map(r => {
          let parsedAnswers = r.surveyAnswers;
          if (typeof parsedAnswers === 'string') {
            try {
              parsedAnswers = JSON.parse(parsedAnswers);
            } catch (e) {}
          }
          return {
            ...r,
            surveyCompleted: !!r.surveyCompleted,
            surveyAnswers: parsedAnswers
          };
        });
      }
    } catch (e) {
      console.warn('[Database] Query failed, falling back to local file:', e.message);
    }
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

async function saveApplication(appData) {
  initStorage();

  // Save to MySQL if available
  if (dbAvailable && dbPool) {
    try {
      const answersJson = appData.surveyAnswers ? JSON.stringify(appData.surveyAnswers) : null;
      const q26 = appData.surveyAnswers?.['26'] || appData.specialtyTalent || '';
      const q27 = appData.surveyAnswers?.['27'] || appData.accountPersona || '';

      const sql = `
        INSERT INTO htf_kos_applications (
          id, name, gender, department, position, accountName, jobNo, mobile, avatarUrl,
          surveyCompleted, surveyTime, surveyScore, surveyScaleScore, surveySubjectiveScore, surveyRating, surveyAnswers,
          videoTitle, videoCategory, videoIntro, accountPersona, specialtyTalent,
          videoUrl, videoSize, videoDuration, status, submittedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name), gender=VALUES(gender), department=VALUES(department),
          position=VALUES(position), accountName=VALUES(accountName), jobNo=VALUES(jobNo), avatarUrl=VALUES(avatarUrl),
          surveyCompleted=VALUES(surveyCompleted), surveyTime=VALUES(surveyTime),
          surveyScore=VALUES(surveyScore), surveyScaleScore=VALUES(surveyScaleScore), surveySubjectiveScore=VALUES(surveySubjectiveScore),
          surveyRating=VALUES(surveyRating), surveyAnswers=VALUES(surveyAnswers),
          videoTitle=VALUES(videoTitle), videoCategory=VALUES(videoCategory),
          videoIntro=VALUES(videoIntro), accountPersona=VALUES(accountPersona), specialtyTalent=VALUES(specialtyTalent),
          videoUrl=VALUES(videoUrl), videoSize=VALUES(videoSize), videoDuration=VALUES(videoDuration),
          status=VALUES(status), updatedAt=CURRENT_TIMESTAMP
      `;
      await dbPool.query(sql, [
        appData.id,
        appData.name || '',
        appData.gender || '',
        appData.department || '',
        appData.position || '',
        appData.accountName || appData.videoCategory || '',
        appData.jobNo || '',
        appData.mobile || '',
        appData.avatarUrl || '',
        appData.surveyCompleted ? 1 : 0,
        appData.surveyTime || '',
        appData.surveyScore || 0,
        appData.surveyScaleScore || 0,
        appData.surveySubjectiveScore || 0,
        appData.surveyRating || '',
        answersJson,
        appData.videoTitle || '',
        appData.videoCategory || '',
        appData.videoIntro || '',
        q27,
        q26,
        appData.videoUrl || '',
        appData.videoSize || '',
        appData.videoDuration || '',
        appData.status || '待初筛',
        appData.submittedAt || ''
      ]);
    } catch (e) {
      console.warn('[Database] Save to MySQL failed:', e.message);
    }
  }

  // Always keep local JSON in sync as solid local backup
  const list = [];
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    list.push(...JSON.parse(raw));
  } catch (e) {}

  const existingIndex = list.findIndex(item => item.id === appData.id || (item.mobile && item.mobile === appData.mobile));
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...appData, updatedAt: new Date().toISOString() };
  } else {
    list.unshift(appData);
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return list[0] || appData;
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

export function createApiMiddleware() {
  initStorage();
  initDatabase().catch(() => {});

  return (req, res, next) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        // Helper to parse JSON body
        const parseJsonBody = (callback) => {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {};
              callback(null, data);
            } catch (err) {
              callback(err, null);
            }
          });
        };

        // 1. File Upload endpoint (Local high-speed streaming storage)
        if (pathname === '/api/upload' && req.method === 'POST') {
          try {
            initStorage();
            const bb = busboy({ headers: req.headers, limits: { fileSize: 500 * 1024 * 1024 } });
            let savedFilename = '';
            let originalFilename = '';
            let savePromise = null;

            bb.on('file', (name, fileStream, info) => {
              originalFilename = info.filename || 'upload.mp4';
              const ext = path.extname(originalFilename) || '.mp4';
              savedFilename = `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
              const saveTo = path.join(UPLOAD_DIR, savedFilename);
              const writeStream = fs.createWriteStream(saveTo);

              savePromise = new Promise((resolve, reject) => {
                fileStream.pipe(writeStream);
                writeStream.on('finish', () => resolve(true));
                writeStream.on('error', (err) => reject(err));
              });
            });

            bb.on('close', async () => {
              try {
                if (savePromise) {
                  await savePromise;
                  const publicUrl = `/uploads/videos/${savedFilename}`;
                  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                  res.end(JSON.stringify({
                    code: 0,
                    message: '上传成功',
                    url: publicUrl,
                    name: originalFilename
                  }));
                } else {
                  res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                  res.end(JSON.stringify({ code: 400, message: '未接收到有效文件内容' }));
                }
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '文件保存失败: ' + err.message }));
              }
            });

            bb.on('error', (err) => {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 500, message: '上传处理异常: ' + err.message }));
            });

            req.pipe(bb);
            return;
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: 'Upload internal error: ' + e.message }));
            return;
          }
        }

        // 2. System info & IP
        if (pathname === '/api/system/info' && req.method === 'GET') {
          const ip = getLocalIpAddress();
          const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
          const protoHeader = req.headers['x-forwarded-proto'] || 'http';
          const mobileUrl = (hostHeader && !hostHeader.startsWith('localhost') && !hostHeader.startsWith('127.0.0.1'))
            ? `${protoHeader}://${hostHeader}`
            : `http://${ip}:5173`;

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            code: 0,
            data: {
              localIp: ip,
              port: 5173,
              mobileUrl: mobileUrl,
              serverTime: new Date().toISOString(),
              storageType: dbAvailable ? 'mysql' : 'local-json'
            }
          }));
          return;
        }

        // 3. WeChat JS-SDK signature mock
        if (pathname === '/api/wechat/signature' && req.method === 'GET') {
          const queryUrl = url.searchParams.get('url') || req.headers.referer || '';
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            code: 0,
            data: {
              appId: 'wx89af27c0018a99cc',
              timestamp: Math.floor(Date.now() / 1000),
              nonceStr: Math.random().toString(36).substring(2, 15),
              signature: '9a8d76e4f3a5b2c1d0e9f8a7b6c5d4e3f2a1b0c9',
              url: queryUrl
            }
          }));
          return;
        }

        // 4. Get all applications
        if (pathname === '/api/applications' && req.method === 'GET') {
          getStoredApplications().then(list => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 0, data: list, total: list.length }));
          }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: err.message }));
          });
          return;
        }

        // 5. Submit or update application
        if (pathname === '/api/applications' && req.method === 'POST') {
          parseJsonBody(async (err, data) => {
            if (err) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 400, message: 'Invalid JSON body' }));
              return;
            }

            const id = data.id || `KOS-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
            const record = {
              ...data,
              id,
              status: data.status || '待初筛',
              submittedAt: new Date().toLocaleString('zh-CN', { hour12: false })
            };

            const saved = await saveApplication(record);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 0, message: '报名提交成功', data: saved }));
          });
          return;
        }

        // 6. Get application by ID or Mobile
        if (pathname.startsWith('/api/applications/') && req.method === 'GET') {
          const id = pathname.replace('/api/applications/', '');
          getStoredApplications().then(list => {
            const found = list.find(item => item.id === id || item.mobile === id);
            if (found) {
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 0, data: found }));
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 404, message: '未找到报名记录' }));
            }
          });
          return;
        }

        // 7. Mock Wenjuanxing Webhook sync
        if (pathname === '/api/webhook/wenjuanxing' && req.method === 'POST') {
          parseJsonBody(async (err, data) => {
            const mobile = data.mobile || data.sojump_param;
            if (!mobile) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 400, message: 'Missing mobile number' }));
              return;
            }

            const list = await getStoredApplications();
            const target = list.find(item => item.mobile === mobile);
            if (target) {
              target.surveyCompleted = true;
              target.surveyTime = new Date().toLocaleString('zh-CN', { hour12: false });
              target.surveyScore = data.score || 88;
              await saveApplication(target);
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 0, message: '问卷状态已同步', matched: !!target }));
          });
          return;
        }

        next();
  };
}

export function apiMiddlewarePlugin() {
  const handler = createApiMiddleware();
  return {
    name: 'kos-api-middleware',
    configureServer(server) {
      server.middlewares.use(handler);
    }
  };
}
