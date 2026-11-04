import fs from 'fs';
import path from 'path';
import os from 'os';
import busboy from 'busboy';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import QRCode from 'qrcode';

// Load .env from server directory
const envPath = path.resolve(process.cwd(), 'server', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const DATA_FILE = path.resolve(process.cwd(), 'data', 'submissions.json');
const QUESTIONS_FILE = path.resolve(process.cwd(), 'data', 'survey_questions.json');
const VOTERS_FILE = path.resolve(process.cwd(), 'data', 'voters.json');
const VOTES_FILE = path.resolve(process.cwd(), 'data', 'votes.json');
const REPORT_TEMPLATE_FILE = path.resolve(process.cwd(), 'server', 'templates', 'report_template.xlsx');
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'videos');
const AVATAR_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'avatars');
const GRAPHIC_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'graphics');

// Ensure data folder, upload folder and seed file exist
function initStorage() {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  }
  if (!fs.existsSync(GRAPHIC_DIR)) {
    fs.mkdirSync(GRAPHIC_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
  if (!fs.existsSync(QUESTIONS_FILE)) {
    fs.writeFileSync(QUESTIONS_FILE, '[]', 'utf-8');
  }
  if (!fs.existsSync(VOTERS_FILE)) {
    fs.writeFileSync(VOTERS_FILE, '[]', 'utf-8');
  }
  if (!fs.existsSync(VOTES_FILE)) {
    fs.writeFileSync(VOTES_FILE, '[]', 'utf-8');
  }
}

// Alibaba Cloud OSS Client state
let ossClient = null;
async function getOssClient() {
  if (ossClient) return ossClient;
  if (process.env.OSS_BUCKET && process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET) {
    try {
      const OSSModule = await import('ali-oss');
      const OSS = OSSModule.default || OSSModule;
      ossClient = new OSS({
        region: process.env.OSS_REGION || 'oss-cn-shenzhen',
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
        bucket: process.env.OSS_BUCKET,
        secure: true
      });
      return ossClient;
    } catch (e) {
      console.warn('[OSS] ali-oss load notice:', e.message);
    }
  }
  return null;
}

// Upload local file to Alibaba Cloud OSS with automatic large file multipart support
async function uploadToOss(objectKey, localFilePath) {
  const oss = await getOssClient();
  if (!oss) return null;
  try {
    const stats = fs.statSync(localFilePath);
    if (stats.size > 20 * 1024 * 1024) {
      // Large files (>20MB) use multipart upload for maximum network resilience
      await oss.multipartUpload(objectKey, localFilePath, {
        partSize: 10 * 1024 * 1024,
        parallel: 4,
        progress: (p) => {
          console.log(`[OSS] Uploading ${path.basename(objectKey)}: ${(p * 100).toFixed(1)}%`);
        }
      });
    } else {
      await oss.put(objectKey, localFilePath);
    }
    const publicUrl = oss.generateObjectUrl(objectKey).replace(/^http:\/\//, 'https://');
    console.log(`[OSS] File successfully uploaded to OSS: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn(`[OSS] Upload failed for ${objectKey}, fallback to local file:`, err.message);
    return null;
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
      connectionLimit: 40,
      queueLimit: 0,
      connectTimeout: 5000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
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
        workType VARCHAR(32) DEFAULT 'video',
        graphicImages LONGTEXT,
        graphicContent LONGTEXT,
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

    // Ensure columns for graphic works, account style and personal intro exist on legacy table
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN workType VARCHAR(32) DEFAULT 'video'`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN graphicImages LONGTEXT`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN graphicContent LONGTEXT`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN targetAccountStyle VARCHAR(150)`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN personalIntro TEXT`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN q26Score INT DEFAULT 0`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN q27Score INT DEFAULT 0`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN reviewComments TEXT`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN reviewerRemark TEXT`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN videoScore INT DEFAULT NULL`); } catch (e) {}
    try { await conn.query(`ALTER TABLE htf_kos_applications ADD COLUMN videoReview TEXT`); } catch (e) {}

    // Dynamic questionnaire questions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS htf_kos_survey_questions (
        id INT PRIMARY KEY,
        moduleId VARCHAR(32) NOT NULL,
        moduleName VARCHAR(100) NOT NULL,
        moduleDesc TEXT,
        type VARCHAR(32) DEFAULT 'scale',
        title VARCHAR(255),
        text TEXT NOT NULL,
        placeholder TEXT,
        sortOrder INT DEFAULT 0,
        status TINYINT DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 1. Voter table (deduplication by jobNo)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS htf_kos_voters (
        jobNo VARCHAR(64) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        submitted TINYINT(1) DEFAULT 0,
        submittedAt VARCHAR(64),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Votes table (each record is one vote for one candidate by one voter)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS htf_kos_votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        voterJobNo VARCHAR(64) NOT NULL,
        voterName VARCHAR(100) NOT NULL,
        candidateId VARCHAR(64) NOT NULL,
        candidateName VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_voter_cand (voterJobNo, candidateId),
        INDEX idx_cand (candidateId),
        INDEX idx_voter (voterJobNo)
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

async function getSurveyQuestions(includeAll = false) {
  initStorage();
  let list = [];
  if (dbAvailable && dbPool) {
    try {
      const sql = includeAll 
        ? 'SELECT * FROM htf_kos_survey_questions ORDER BY sortOrder ASC, id ASC'
        : 'SELECT * FROM htf_kos_survey_questions WHERE status = 1 ORDER BY sortOrder ASC, id ASC';
      const [rows] = await dbPool.query(sql);
      list = rows || [];
    } catch (e) {
      console.warn('[Database] Fetch survey questions failed:', e.message);
    }
  }

  if (!list.length) {
    try {
      if (fs.existsSync(QUESTIONS_FILE)) {
        const fileList = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
        list = includeAll ? fileList : fileList.filter(q => q.status !== 0);
      }
    } catch (e) {}
  }

  // Format into modules list
  const moduleMap = new Map();
  for (const q of list) {
    const mId = q.moduleId || 'm1';
    if (!moduleMap.has(mId)) {
      moduleMap.set(mId, {
        id: mId,
        name: q.moduleName || '',
        desc: q.moduleDesc || '',
        questions: []
      });
    }
    moduleMap.get(mId).questions.push({
      id: q.id,
      type: q.type || 'scale',
      title: q.title || '',
      text: q.text || '',
      placeholder: q.placeholder || '',
      sortOrder: q.sortOrder || q.id
    });
  }

  return {
    rawList: list,
    questions: list,
    modules: Array.from(moduleMap.values())
  };
}

async function saveSurveyQuestion(q) {
  initStorage();
  const id = parseInt(q.id, 10);
  if (isNaN(id)) throw new Error('Invalid question ID');

  if (dbAvailable && dbPool) {
    const sql = `
      INSERT INTO htf_kos_survey_questions (
        id, moduleId, moduleName, moduleDesc, type, title, text, placeholder, sortOrder, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        moduleId=VALUES(moduleId), moduleName=VALUES(moduleName), moduleDesc=VALUES(moduleDesc),
        type=VALUES(type), title=VALUES(title), text=VALUES(text),
        placeholder=VALUES(placeholder), sortOrder=VALUES(sortOrder), status=VALUES(status),
        updatedAt=CURRENT_TIMESTAMP
    `;
    await dbPool.query(sql, [
      id,
      q.moduleId || 'm1',
      q.moduleName || '',
      q.moduleDesc || '',
      q.type || 'scale',
      q.title || '',
      q.text || '',
      q.placeholder || '',
      q.sortOrder || id,
      q.status !== undefined ? (q.status ? 1 : 0) : 1
    ]);
  }

  // Always keep local JSON in sync
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
  } catch (e) {}
  const idx = list.findIndex(item => item.id === id);
  const updatedItem = {
    id,
    moduleId: q.moduleId || (list[idx]?.moduleId || 'm1'),
    moduleName: q.moduleName || (list[idx]?.moduleName || ''),
    moduleDesc: q.moduleDesc || (list[idx]?.moduleDesc || ''),
    type: q.type || (list[idx]?.type || 'scale'),
    title: q.title !== undefined ? q.title : (list[idx]?.title || ''),
    text: q.text !== undefined ? q.text : (list[idx]?.text || ''),
    placeholder: q.placeholder !== undefined ? q.placeholder : (list[idx]?.placeholder || ''),
    sortOrder: q.sortOrder !== undefined ? q.sortOrder : (list[idx]?.sortOrder || id),
    status: q.status !== undefined ? (q.status ? 1 : 0) : (list[idx]?.status ?? 1),
    updatedAt: new Date().toISOString()
  };
  if (idx >= 0) {
    list[idx] = updatedItem;
  } else {
    list.push(updatedItem);
  }
  list.sort((a, b) => (a.sortOrder || a.id) - (b.sortOrder || b.id));
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');

  return updatedItem;
}

// Generate Standard Excel Report (matching 星火计划_每日报名与问卷评分模板 - 向量.xlsx)
async function generateReportExcelBuffer(candidates) {
  if (!fs.existsSync(REPORT_TEMPLATE_FILE)) {
    throw new Error('Report template file not found: ' + REPORT_TEMPLATE_FILE);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(REPORT_TEMPLATE_FILE);

  const wsOverview = wb.getWorksheet('报名总览');
  const wsDetails = wb.getWorksheet('测评与作品明细');
  const wsInst = wb.getWorksheet('导出说明');

  if (!wsOverview || !wsDetails) {
    throw new Error('Template sheets missing: 报名总览 / 测评与作品明细');
  }

  // 1. 打开工作簿第一视角升级：直接激活“报名总览”，赋予高端品牌色标签
  wb.views = [
    { firstSheet: 0, activeTab: 1, visibility: 'visible' }
  ];

  wsOverview.properties.tabColor = { argb: 'FF4A2C10' }; // 汇添富品牌经典暖棕
  wsDetails.properties.tabColor = { argb: 'FFB45309' };  // 琥珀金
  if (wsInst) wsInst.properties.tabColor = { argb: 'FF94A3B8' }; // 沉稳板岩灰

  // 2. 核心视图体验升级：冻结前3列表头，默认滚到首位，开启清晰网格线，自适应缩放
  wsOverview.views = [
    { state: 'frozen', xSplit: 0, ySplit: 3, topLeftCell: 'A4', activeCell: 'A4', showGridLines: true }
  ];
  wsDetails.views = [
    { state: 'frozen', xSplit: 4, ySplit: 3, topLeftCell: 'E4', activeCell: 'A4', showGridLines: true, zoomScale: 90 }
  ];

  // 3. 黄金列宽排版：彻底解决文字截断与 ### 溢出，留有舒适视觉呼吸感
  const overviewWidths = [
    8,  // A: 序号
    14, // B: 数据日期
    14, // C: 评审编号
    20, // D: 提交时间
    20, // E: 问卷完成时间
    13, // F: 审核状态
    13, // G: 姓名
    9,  // H: 性别
    22, // I: 所属部门/团队
    20, // J: 现任岗位/职级
    38, // K: 一句话介绍
    28, // L: 本人账号风格
    14, // M: 总分(145)
    18, // N: 系统定级
    36  // O: 评审意见
  ];
  overviewWidths.forEach((w, i) => {
    wsOverview.getColumn(i + 1).width = w;
  });

  const detailsWidths = [
    8,  // A: 序号
    14, // B: 数据日期
    14, // C: 评审编号
    13, // D: 姓名
    13, 13, 13, 13, 13, 13, // E-J: 模块一至六
    15, // K: 量表总分(125)
    42, // L: Q26 原文
    13, // M: Q26 得分
    42, // N: Q27 原文
    13, // O: Q27 得分
    14, // P: 简答小计(20)
    14, // Q: 总分(145)
    18, // R: 系统定级
    28, // S: 作品标题
    22, // T: 视频文件名
    12, // U: 视频时长
    12, // V: 视频大小
    36, // W: 视频链接
    40, // X: 作品构思
    34  // Y: 评分人/备注
  ];
  detailsWidths.forEach((w, i) => {
    wsDetails.getColumn(i + 1).width = w;
  });

  function calcM(ans, s, e) {
    let sum = 0;
    for (let i = s; i <= e; i++) {
      const v = ans ? Number(ans[i] || ans[String(i)] || 0) : 0;
      sum += isNaN(v) ? 0 : v;
    }
    return sum;
  }

  function normalizeRating(rawRating, scaleTotal, textTotal) {
    const total = scaleTotal + textTotal;
    let r = String(rawRating || '').trim();
    if (r.startsWith('S') || (total >= 112 && scaleTotal >= 102 && textTotal >= 10)) return 'S级·标杆IP';
    if (r.startsWith('A') || (total >= 88 && scaleTotal >= 80 && textTotal >= 4)) return 'A级·主力IP';
    if (r.startsWith('B') || (total >= 65 && scaleTotal >= 60)) return 'B级·储备IP';
    if (r) return r;
    return '暂不推荐·幕后支持';
  }

  function setCellResult(cell, result) {
    if (cell.value && typeof cell.value === 'object') {
      if (cell.value.sharedFormula) {
        cell.value = {
          sharedFormula: cell.value.sharedFormula,
          result: result
        };
      } else if (cell.value.formula) {
        cell.value = {
          formula: cell.value.formula,
          ref: cell.value.ref,
          shareType: cell.value.shareType,
          result: result
        };
      } else {
        cell.value = result;
      }
    } else {
      cell.value = result;
    }
  }

  const borderStyle = {
    left: { style: 'thin', color: { argb: 'FFD9C9A8' } },
    right: { style: 'thin', color: { argb: 'FFD9C9A8' } },
    top: { style: 'thin', color: { argb: 'FFD9C9A8' } },
    bottom: { style: 'thin', color: { argb: 'FFD9C9A8' } }
  };

  function formatCell(cell, opts = {}) {
    cell.style = {
      font: opts.font || { name: '微软雅黑', size: 9.5, color: { argb: 'FF334155' } },
      fill: opts.fill || { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
      border: opts.border || borderStyle,
      alignment: opts.alignment || { vertical: 'middle', horizontal: 'center' }
    };
  }

  const list = candidates || [];

  // 如果候选人人数超过模板预设行数 (第56行是第53位候选人)，动态扩充行高
  if (list.length > 53) {
    const templateRowO = wsOverview.getRow(56);
    const templateRowD = wsDetails.getRow(56);
    for (let r = 57; r < 4 + list.length; r++) {
      const rowO = wsOverview.getRow(r);
      rowO.height = templateRowO.height;
      const rowD = wsDetails.getRow(r);
      rowD.height = templateRowD.height;
    }
  }

  list.forEach((c, idx) => {
    const r = 4 + idx;
    const isEven = idx % 2 === 1;
    const zebraBg = isEven ? 'FFFDFBF7' : 'FFFFFFFF';
    const subDate = (c.submittedAt || '').split(' ')[0] || new Date().toISOString().slice(0, 10);
    const ans = c.surveyAnswers || {};
    const m1 = calcM(ans, 1, 5);
    const m2 = calcM(ans, 6, 10);
    const m3 = calcM(ans, 11, 14);
    const m4 = calcM(ans, 15, 18);
    const m5 = calcM(ans, 19, 21);
    const m6 = calcM(ans, 22, 25);
    let scaleTotal = m1 + m2 + m3 + m4 + m5 + m6;
    if (scaleTotal === 0 && Number(c.surveyScaleScore) > 0) {
      scaleTotal = Number(c.surveyScaleScore);
    }

    const q26Text = ans['26'] || c.specialtyTalent || '';
    const q27Text = ans['27'] || c.accountPersona || '';
    let q26Score = Number(c.q26Score || 0);
    let q27Score = Number(c.q27Score || 0);
    let textTotal = q26Score + q27Score;
    if (textTotal === 0 && Number(c.surveySubjectiveScore) > 0) {
      textTotal = Number(c.surveySubjectiveScore);
      q26Score = Math.floor(textTotal / 2);
      q27Score = Math.ceil(textTotal / 2);
    }

    let totalScore = scaleTotal + textTotal;
    if (totalScore === 0 && Number(c.surveyScore) > 0) {
      totalScore = Number(c.surveyScore);
    }

    const rating = normalizeRating(c.surveyRating, scaleTotal, textTotal);

    // 动态行高计算（总览表）：根据一句话介绍、定位、评语长度自适应展开，绝不遮挡文字
    const introChars = (c.personalIntro || '').length;
    const styleChars = (c.targetAccountStyle || c.accountPersona || '').length;
    const reviewChars = (c.reviewComments || c.videoReview || '').length;
    const ovMaxLines = Math.max(1, Math.ceil(introChars / 18), Math.ceil(styleChars / 13), Math.ceil(reviewChars / 17));
    const ovHeight = Math.max(38, Math.min(120, ovMaxLines * 18 + 14));

    // 动态行高计算（明细表）：根据 Q26、Q27 长文本、作品构思自适应展开
    const q26Chars = (q26Text || '').length;
    const q27Chars = (q27Text || '').length;
    const titleChars = (c.videoTitle || '').length;
    const introVChars = (c.videoIntro || '').length;
    const dtMaxLines = Math.max(1, Math.ceil(q26Chars / 20), Math.ceil(q27Chars / 20), Math.ceil(introVChars / 19), Math.ceil(titleChars / 13));
    const dtHeight = Math.max(48, Math.min(140, dtMaxLines * 18 + 16));

    // 定级胶囊徽章色彩（符合高级金融商务视觉）
    let ratingFill = 'FFF3F4F6', ratingFont = 'FF6B7280';
    if (rating.includes('S级')) { ratingFill = 'FFFEF3C7'; ratingFont = 'FFB45309'; }
    else if (rating.includes('A级')) { ratingFill = 'FFDCFCE7'; ratingFont = 'FF15803D'; }
    else if (rating.includes('B级')) { ratingFill = 'FFFFEDD5'; ratingFont = 'FFC2410C'; }

    // 审核状态色彩
    let statusFont = 'FF4B5563';
    if (c.status === '初筛通过') statusFont = 'FF15803D';
    else if (c.status === '初筛未通过') statusFont = 'FFDC2626';

    // ================= 1. 报名总览 =================
    const rowO = wsOverview.getRow(r);
    rowO.height = ovHeight;

    // A: 序号
    setCellResult(rowO.getCell(1), idx + 1);
    formatCell(rowO.getCell(1), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } } });

    // B: 数据日期
    rowO.getCell(2).value = subDate;
    formatCell(rowO.getCell(2), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } } });

    // C: 评审编号
    rowO.getCell(3).value = c.id || ('XH-' + String(idx + 1).padStart(2, '0'));
    formatCell(rowO.getCell(3), {
      font: { name: '微软雅黑', size: 9.5, bold: true, color: { argb: 'FF1E293B' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // D: 提交时间
    rowO.getCell(4).value = c.submittedAt || '';
    formatCell(rowO.getCell(4), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } } });

    // E: 问卷完成时间
    rowO.getCell(5).value = c.surveyTime || c.submittedAt || '';
    formatCell(rowO.getCell(5), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } } });

    // F: 审核状态
    rowO.getCell(6).value = c.status || '待初筛';
    formatCell(rowO.getCell(6), {
      font: { name: '微软雅黑', size: 9.5, bold: true, color: { argb: statusFont } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // G: 姓名
    rowO.getCell(7).value = c.name || '';
    formatCell(rowO.getCell(7), {
      font: { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF0F172A' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // H: 性别
    rowO.getCell(8).value = c.gender || '男';
    formatCell(rowO.getCell(8), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } } });

    // I: 部门
    rowO.getCell(9).value = c.department || '';
    formatCell(rowO.getCell(9), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // J: 岗位
    rowO.getCell(10).value = c.position || '';
    formatCell(rowO.getCell(10), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // K: 一句话介绍
    rowO.getCell(11).value = c.personalIntro || '';
    formatCell(rowO.getCell(11), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // L: 账号风格
    rowO.getCell(12).value = c.targetAccountStyle || c.accountPersona || '';
    formatCell(rowO.getCell(12), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // M: 总分(145)
    setCellResult(rowO.getCell(13), totalScore);
    formatCell(rowO.getCell(13), {
      font: { name: '微软雅黑', size: 10.5, bold: true, color: { argb: 'FFB45309' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // N: 系统定级 (彩色胶囊徽章底色与专属字体色)
    const cellRatingO = rowO.getCell(14);
    setCellResult(cellRatingO, rating);
    formatCell(cellRatingO, {
      font: { name: '微软雅黑', size: 9.5, bold: true, color: { argb: ratingFont } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: ratingFill } }
    });

    // O: 评审意见
    rowO.getCell(15).value = c.reviewComments || c.videoReview || '';
    formatCell(rowO.getCell(15), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // ================= 2. 测评与作品明细 =================
    const rowD = wsDetails.getRow(r);
    rowD.height = dtHeight;

    // A-D
    setCellResult(rowD.getCell(1), idx + 1);
    formatCell(rowD.getCell(1), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } } });

    rowD.getCell(2).value = subDate;
    formatCell(rowD.getCell(2), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } } });

    rowD.getCell(3).value = c.id || ('XH-' + String(idx + 1).padStart(2, '0'));
    formatCell(rowD.getCell(3), {
      font: { name: '微软雅黑', size: 9.5, bold: true, color: { argb: 'FF1E293B' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    rowD.getCell(4).value = c.name || '';
    formatCell(rowD.getCell(4), {
      font: { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF0F172A' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // E-J (各模块分)
    [m1, m2, m3, m4, m5, m6].forEach((mVal, mIdx) => {
      const cIdx = 5 + mIdx;
      rowD.getCell(cIdx).value = mVal;
      formatCell(rowD.getCell(cIdx), {
        font: { name: '微软雅黑', size: 9.5, color: { argb: 'FF334155' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
      });
    });

    // K: 量表总分
    setCellResult(rowD.getCell(11), scaleTotal);
    formatCell(rowD.getCell(11), {
      font: { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF0F172A' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // L-O: Q26/Q27 原文及得分
    rowD.getCell(12).value = q26Text;
    formatCell(rowD.getCell(12), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    rowD.getCell(13).value = q26Score;
    formatCell(rowD.getCell(13), {
      font: { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF2563EB' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    rowD.getCell(14).value = q27Text;
    formatCell(rowD.getCell(14), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    rowD.getCell(15).value = q27Score;
    formatCell(rowD.getCell(15), {
      font: { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF2563EB' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // P: 简答小计
    setCellResult(rowD.getCell(16), textTotal);
    formatCell(rowD.getCell(16), {
      font: { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF0F172A' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // Q: 总分
    setCellResult(rowD.getCell(17), totalScore);
    formatCell(rowD.getCell(17), {
      font: { name: '微软雅黑', size: 10.5, bold: true, color: { argb: 'FFB45309' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // R: 系统定级 (彩色胶囊徽章)
    const cellRatingD = rowD.getCell(18);
    setCellResult(cellRatingD, rating);
    formatCell(cellRatingD, {
      font: { name: '微软雅黑', size: 9.5, bold: true, color: { argb: ratingFont } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: ratingFill } }
    });

    // S-V: 作品标题, 视频文件名, 时长, 大小
    rowD.getCell(19).value = c.videoTitle || '';
    formatCell(rowD.getCell(19), {
      font: { name: '微软雅黑', size: 9.5, bold: true, color: { argb: 'FF1E293B' } },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    rowD.getCell(20).value = c.videoName || (c.videoUrl ? c.videoUrl.split('/').pop() : '');
    formatCell(rowD.getCell(20), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    rowD.getCell(21).value = c.videoDuration || '';
    formatCell(rowD.getCell(21), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } } });

    rowD.getCell(22).value = c.videoSize || '';
    formatCell(rowD.getCell(22), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } } });

    // W: 视频链接 (可点击超链接对象，优雅蓝色下划线)
    if (c.videoUrl) {
      rowD.getCell(23).value = { text: c.videoUrl, hyperlink: c.videoUrl };
    } else {
      rowD.getCell(23).value = '';
    }
    formatCell(rowD.getCell(23), {
      font: { name: '微软雅黑', size: 8.5, color: { argb: 'FF2563EB' }, underline: true },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // X: 作品构思
    rowD.getCell(24).value = c.videoIntro || '';
    formatCell(rowD.getCell(24), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });

    // Y: 评分人/备注
    const remark = [
      c.reviewerRemark ? ('评审人: ' + c.reviewerRemark) : '',
      (c.videoScore !== null && c.videoScore !== undefined) ? ('视频打分: ' + c.videoScore) : '',
      c.videoReview ? ('评语: ' + c.videoReview) : ''
    ].filter(Boolean).join(' | ');
    rowD.getCell(25).value = remark || c.reviewerRemark || '';
    formatCell(rowD.getCell(25), {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } }
    });
  });

  // 4. 干净收尾：将候选人名单之后的未用模板行彻底隐藏收拢，绝不留多余的空白边框行
  const startEmptyRow = 4 + list.length;
  for (let r = startEmptyRow; r <= wsOverview.rowCount; r++) {
    const rowO = wsOverview.getRow(r);
    rowO.eachCell({ includeEmpty: true }, cell => {
      cell.value = null;
      cell.style = {};
    });
    rowO.hidden = true;
  }
  for (let r = startEmptyRow; r <= wsDetails.rowCount; r++) {
    const rowD = wsDetails.getRow(r);
    rowD.eachCell({ includeEmpty: true }, cell => {
      cell.value = null;
      cell.style = {};
    });
    rowD.hidden = true;
  }

  // 5. 动态同步更新“导出说明”首页封面信息
  if (wsInst) {
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleString('zh-CN', { hour12: false });
    wsInst.getCell('C6').value = dateStr;
    wsInst.getCell('C7').value = timeStr + '（系统自动生成导出）';
    wsInst.getCell('C8').value = `星火计划_每日报名与问卷评分表_${dateStr.replace(/-/g, '')}.xlsx`;
  }

  return await wb.xlsx.writeBuffer();
}


// ==========================================
// High-Concurrency In-Memory Micro-Cache System
// ==========================================
let worksCache = null;
let worksCacheTime = 0;
const WORKS_CACHE_TTL = 3000; // 3 seconds in-memory cache

let leaderboardCache = null;
let leaderboardCacheTime = 0;
const LEADERBOARD_CACHE_TTL = 3000; // 3 seconds in-memory cache

let candidateNameMap = {
  'XH-01': '张振东',
  'XH-02': '夏萌',
  'XH-03': '王炫霄'
};

// ==========================================
// 扫码登录跨端联动会话池 (TTL: 10分钟)
// ==========================================
const scanSessions = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [token, sess] of scanSessions.entries()) {
    if (now - sess.createdAt > 10 * 60 * 1000) {
      scanSessions.delete(token);
    }
  }
}, 60 * 1000);

function invalidateVoteCache() {
  worksCache = null;
  leaderboardCache = null;
}

async function getVoteWorks() {
  const now = Date.now();
  if (worksCache && now - worksCacheTime < WORKS_CACHE_TTL) {
    return worksCache;
  }

  const apps = await getStoredApplications();
  // Filter candidates with valid video URL
  const videoCandidates = apps.filter(c => c.videoUrl && String(c.videoUrl).trim() !== '');

  // Calculate vote count per candidate
  const countMap = {};
  if (dbAvailable && dbPool) {
    try {
      const [rows] = await dbPool.query('SELECT candidateId, COUNT(*) as cnt FROM htf_kos_votes GROUP BY candidateId');
      for (const r of rows) {
        countMap[r.candidateId] = Number(r.cnt);
      }
    } catch (e) {
      console.warn('[Vote] Fetch vote counts failed:', e.message);
    }
  } else {
    try {
      if (fs.existsSync(VOTES_FILE)) {
        const votes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8') || '[]');
        for (const v of votes) {
          countMap[v.candidateId] = (countMap[v.candidateId] || 0) + 1;
        }
      }
    } catch (e) {}
  }

  // Sort candidates by ID ascending (XH-01, XH-02, ...)
  videoCandidates.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));

  // 针对不同视频的开场黑屏、转场淡入或微表情，配置最佳海报抽帧时间点（毫秒）
  const SNAPSHOT_TIMESTAMPS = {
    'XH-04': 500,    // 张燕军: 0.5s 避开 1s 时的闭眼眨眼帧，双眼精神有神
    'XH-06': 3000,   // 马若琳: 3.0s 舞台人物近景特写微笑着装，避开远景暗边
    'XH-07': 6000,   // 晏建军: 6.0s 讲师西装本人正面出镜形象，告别纯文字 PPT
    'XH-11': 34000,  // 濮子千: 34.0s 健身房标志性金句T恤正面特写，告别暗室闹钟
    'XH-17': 2000,   // 王予宁: 2.0s 正对镜头甜美微笑，避开低头闭眼帧
    'XH-18': 10000,  // 王钢: 10.0s 彻底解决前 4 秒纯黑屏问题，大航海战舰正视海报
    'XH-20': 34000,  // 濮子千: 34.0s 对应第二条视频精选封面
  };

  // 权威横屏作品 ID 清单（确保移动端全屏时 100% 自动旋转大屏横向展开）
  const LANDSCAPE_WORK_IDS = new Set(['XH-07', 'XH-11', 'XH-18', 'XH-20']);

  const result = videoCandidates.map((c, idx) => {
    // Keep local candidate name map warm for fast toggleVote
    if (c.id && c.name) candidateNameMap[c.id] = c.name;

    // Generate valid first-frame snapshot for video (with automatic rotation based on video orientation)
    const snapshotTime = (c.id && SNAPSHOT_TIMESTAMPS[c.id]) ? SNAPSHOT_TIMESTAMPS[c.id] : 1000;
    const coverUrl = (c.videoUrl && c.videoUrl.includes('aliyuncs.com'))
      ? `${c.videoUrl}?x-oss-process=video/snapshot,t_${snapshotTime},f_jpg,w_600,m_fast,ar_auto`
      : (c.avatarUrl || '');

    const isLandscape = LANDSCAPE_WORK_IDS.has(c.id) || Boolean(c.isLandscape);

    return {
      id: c.id,
      displayNo: idx + 1,
      name: c.name || '未命名',
      gender: c.gender || '',
      department: c.department || '汇添富团队',
      position: c.position || '创作者',
      avatarUrl: c.avatarUrl || '',
      coverUrl: coverUrl,
      isLandscape: isLandscape,
      videoTitle: c.videoTitle || '自媒体短视频创作提案',
      videoIntro: c.videoIntro || c.personalIntro || '',
      videoUrl: c.videoUrl,
      videoDuration: c.videoDuration || '',
      videoSize: c.videoSize || '',
      accountPersona: c.accountPersona || c.targetAccountStyle || '',
      specialtyTalent: c.specialtyTalent || '',
      votesCount: countMap[c.id] || 0
    };
  });

  worksCache = result;
  worksCacheTime = now;
  return result;
}

async function voterLogin(name, jobNo) {
  const trimmedName = String(name || '').trim();
  let trimmedJobNo = String(jobNo || '').trim();
  if (!trimmedName) {
    throw new Error('请填写您的姓名');
  }
  // 入口只填姓名，无需工号：未输入工号时以姓名标识作为唯一账户记录
  if (!trimmedJobNo) {
    trimmedJobNo = 'L_' + trimmedName;
  }

  let voter = null;
  let likedIds = [];

  if (dbAvailable && dbPool) {
    // Upsert voter
    await dbPool.query(`
      INSERT INTO htf_kos_voters (jobNo, name) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, [trimmedJobNo, trimmedName]);

    // High performance parallel read
    const [[voterRows], [voteRows]] = await Promise.all([
      dbPool.query('SELECT jobNo, name, submitted, submittedAt FROM htf_kos_voters WHERE jobNo = ?', [trimmedJobNo]),
      dbPool.query('SELECT candidateId FROM htf_kos_votes WHERE voterJobNo = ?', [trimmedJobNo])
    ]);

    voter = voterRows[0] || { jobNo: trimmedJobNo, name: trimmedName, submitted: 0 };
    likedIds = (voteRows || []).map(r => r.candidateId);
  } else {
    initStorage();
    let voters = [];
    try { voters = JSON.parse(fs.readFileSync(VOTERS_FILE, 'utf-8') || '[]'); } catch (e) {}
    let existing = voters.find(v => v.jobNo === trimmedJobNo);
    if (!existing) {
      existing = { jobNo: trimmedJobNo, name: trimmedName, submitted: 0, createdAt: new Date().toISOString() };
      voters.push(existing);
      fs.writeFileSync(VOTERS_FILE, JSON.stringify(voters, null, 2), 'utf-8');
    }
    voter = existing;

    let votes = [];
    try { votes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8') || '[]'); } catch (e) {}
    likedIds = votes.filter(v => v.voterJobNo === trimmedJobNo).map(v => v.candidateId);
  }

  return {
    voter: {
      jobNo: voter.jobNo,
      name: voter.name,
      submitted: !!voter.submitted,
      submittedAt: voter.submittedAt || ''
    },
    likedIds,
    budgetTotal: 9999,
    budgetRemaining: 9999
  };
}

async function getUserLikedCandidateIds(voterJobNo) {
  const trimmedJob = String(voterJobNo || '').trim();
  if (!trimmedJob) return [];
  if (dbAvailable && dbPool) {
    try {
      const [rows] = await dbPool.query('SELECT candidateId FROM htf_kos_votes WHERE voterJobNo = ?', [trimmedJob]);
      return (rows || []).map(r => r.candidateId);
    } catch (e) {
      console.warn('[Vote] getUserLikedCandidateIds DB error:', e.message);
      return [];
    }
  } else {
    try {
      if (fs.existsSync(VOTES_FILE)) {
        const votes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8') || '[]');
        return votes.filter(v => v.voterJobNo === trimmedJob).map(v => v.candidateId);
      }
    } catch (e) {}
    return [];
  }
}

async function addLikes(candidateId, count = 1, jobNo = '') {
  const trimmedCandId = String(candidateId || '').trim();
  if (!trimmedCandId) throw new Error('候选人ID不能为空');
  const candName = candidateNameMap[trimmedCandId] || trimmedCandId;
  const trimmedJobNo = String(jobNo || 'guest').trim().substring(0, 64);

  if (dbAvailable && dbPool) {
    // 计数只能一次：利用 MySQL UNIQUE KEY uk_voter_cand (voterJobNo, candidateId)
    // 使用 INSERT IGNORE，单个投票人/设备仅计入 1 票，绝不重复递增计数
    await dbPool.query(
      'INSERT IGNORE INTO htf_kos_votes (voterJobNo, voterName, candidateId, candidateName) VALUES (?, ?, ?, ?)',
      [trimmedJobNo, '观众', trimmedCandId, candName]
    );
    invalidateVoteCache();
    let candidateVotes = 0;
    try {
      const [cntRows] = await dbPool.query('SELECT COUNT(*) as cnt FROM htf_kos_votes WHERE candidateId = ?', [trimmedCandId]);
      candidateVotes = Number(cntRows && cntRows[0] ? cntRows[0].cnt : 0);
    } catch (cntErr) {
      console.warn('[Vote] Count query error:', cntErr.message);
    }
    return { liked: true, candidateVotes };
  } else {
    initStorage();
    let votes = [];
    try { votes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8') || '[]'); } catch (e) {}
    // 计数只能一次：若当前 voterJobNo 已给该候选人点过赞，绝不重复计入
    const alreadyVoted = votes.some(v => v.voterJobNo === trimmedJobNo && v.candidateId === trimmedCandId);
    if (!alreadyVoted) {
      votes.push({
        voterJobNo: trimmedJobNo,
        voterName: '观众',
        candidateId: trimmedCandId,
        candidateName: candName,
        createdAt: new Date().toISOString()
      });
      fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2), 'utf-8');
      invalidateVoteCache();
    }
    const candidateVotes = votes.filter(v => v.candidateId === trimmedCandId).length;
    return { liked: true, candidateVotes };
  }
}

async function toggleVote(jobNo, candidateId, count = 1) {
  if (count && count > 1) {
    return addLikes(candidateId, count, jobNo);
  }
  let trimmedJobNo = String(jobNo || '').trim();
  const trimmedCandId = String(candidateId || '').trim();
  if (!trimmedJobNo) {
    trimmedJobNo = 'guest_' + Date.now();
  }
  if (!trimmedCandId) {
    throw new Error('参数不完整');
  }

  if (dbAvailable && dbPool) {
    // High performance single-round parallel check
    const [[voterRows], [voteRows]] = await Promise.all([
      dbPool.query('SELECT name, submitted FROM htf_kos_voters WHERE jobNo = ?', [trimmedJobNo]),
      dbPool.query('SELECT candidateId FROM htf_kos_votes WHERE voterJobNo = ?', [trimmedJobNo])
    ]);

    let voter = voterRows[0];
    if (!voter) {
      // 容错兜底：若前置未建档，以工号/姓名自动登记
      const autoName = trimmedJobNo.startsWith('L_') ? trimmedJobNo.substring(2) : trimmedJobNo;
      await dbPool.query('INSERT IGNORE INTO htf_kos_voters (jobNo, name) VALUES (?, ?)', [trimmedJobNo, autoName]);
      voter = { name: autoName };
    }

    const candName = candidateNameMap[trimmedCandId] || trimmedCandId;
    const likedIds = (voteRows || []).map(r => r.candidateId);
    const isAlreadyLiked = likedIds.includes(trimmedCandId);

    if (isAlreadyLiked) {
      // 取消推荐
      await dbPool.query('DELETE FROM htf_kos_votes WHERE voterJobNo = ? AND candidateId = ?', [trimmedJobNo, trimmedCandId]);
      const nextLikedIds = likedIds.filter(id => id !== trimmedCandId);
      invalidateVoteCache();
      let candidateVotes = 0;
      try {
        const [cntRows] = await dbPool.query('SELECT COUNT(*) as cnt FROM htf_kos_votes WHERE candidateId = ?', [trimmedCandId]);
        candidateVotes = Number(cntRows && cntRows[0] ? cntRows[0].cnt : 0);
      } catch (cntErr) {
        console.warn('[Vote] Count query error:', cntErr.message);
      }
      return { liked: false, likedIds: nextLikedIds, budgetRemaining: 9999, candidateVotes };
    } else {
      // 点赞直接加票（整体不设上限，领导刷到谁给谁点赞）
      await dbPool.query(`
        INSERT IGNORE INTO htf_kos_votes (voterJobNo, voterName, candidateId, candidateName)
        VALUES (?, ?, ?, ?)
      `, [trimmedJobNo, voter.name, trimmedCandId, candName]);

      const nextLikedIds = [...likedIds, trimmedCandId];
      invalidateVoteCache();
      let candidateVotes = 0;
      try {
        const [cntRows] = await dbPool.query('SELECT COUNT(*) as cnt FROM htf_kos_votes WHERE candidateId = ?', [trimmedCandId]);
        candidateVotes = Number(cntRows && cntRows[0] ? cntRows[0].cnt : 0);
      } catch (cntErr) {
        console.warn('[Vote] Count query error:', cntErr.message);
      }
      return { liked: true, likedIds: nextLikedIds, budgetRemaining: 9999, candidateVotes };
    }
  } else {
    // JSON file fallback
    initStorage();
    let voters = [];
    try { voters = JSON.parse(fs.readFileSync(VOTERS_FILE, 'utf-8') || '[]'); } catch (e) {}
    let voter = voters.find(v => v.jobNo === trimmedJobNo);
    if (!voter) {
      const autoName = trimmedJobNo.startsWith('L_') ? trimmedJobNo.substring(2) : trimmedJobNo;
      voter = { jobNo: trimmedJobNo, name: autoName, submitted: 0, createdAt: new Date().toISOString() };
      voters.push(voter);
      fs.writeFileSync(VOTERS_FILE, JSON.stringify(voters, null, 2), 'utf-8');
    }

    let votes = [];
    try { votes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8') || '[]'); } catch (e) {}
    const exIdx = votes.findIndex(v => v.voterJobNo === trimmedJobNo && v.candidateId === trimmedCandId);
    if (exIdx >= 0) {
      votes.splice(exIdx, 1);
      fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2), 'utf-8');
      const likedIds = votes.filter(v => v.voterJobNo === trimmedJobNo).map(v => v.candidateId);
      invalidateVoteCache();
      const candidateVotes = votes.filter(v => v.candidateId === trimmedCandId).length;
      return { liked: false, likedIds, budgetRemaining: 9999, candidateVotes };
    } else {
      votes.push({
        voterJobNo: trimmedJobNo,
        voterName: voter.name,
        candidateId: trimmedCandId,
        candidateName: '',
        createdAt: new Date().toISOString()
      });
      fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2), 'utf-8');
      const likedIds = votes.filter(v => v.voterJobNo === trimmedJobNo).map(v => v.candidateId);
      invalidateVoteCache();
      const candidateVotes = votes.filter(v => v.candidateId === trimmedCandId).length;
      return { liked: true, likedIds, budgetRemaining: 9999, candidateVotes };
    }
  }
}

async function submitVotes(jobNo) {
  const trimmedJobNo = String(jobNo || '').trim();
  if (!trimmedJobNo) throw new Error('工号不能为空');
  const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });

  if (dbAvailable && dbPool) {
    const [voterRows] = await dbPool.query('SELECT * FROM htf_kos_voters WHERE jobNo = ?', [trimmedJobNo]);
    if (!voterRows.length) throw new Error('未找到投票人记录');
    await dbPool.query('UPDATE htf_kos_voters SET submitted = 1, submittedAt = ? WHERE jobNo = ?', [nowStr, trimmedJobNo]);
    const [votes] = await dbPool.query('SELECT candidateId FROM htf_kos_votes WHERE voterJobNo = ?', [trimmedJobNo]);
    invalidateVoteCache();
    return { submitted: true, submittedAt: nowStr, voteCount: votes.length };
  } else {
    initStorage();
    let voters = [];
    try { voters = JSON.parse(fs.readFileSync(VOTERS_FILE, 'utf-8') || '[]'); } catch (e) {}
    const voter = voters.find(v => v.jobNo === trimmedJobNo);
    if (!voter) throw new Error('未找到投票人');
    voter.submitted = 1;
    voter.submittedAt = nowStr;
    fs.writeFileSync(VOTERS_FILE, JSON.stringify(voters, null, 2), 'utf-8');
    let votes = [];
    try { votes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8') || '[]'); } catch (e) {}
    const myVotes = votes.filter(v => v.voterJobNo === trimmedJobNo);
    invalidateVoteCache();
    return { submitted: true, submittedAt: nowStr, voteCount: myVotes.length };
  }
}

async function getVoteLeaderboard() {
  const now = Date.now();
  if (leaderboardCache && now - leaderboardCacheTime < LEADERBOARD_CACHE_TTL) {
    return leaderboardCache;
  }

  const works = await getVoteWorks();
  let allVotes = [];
  let allVoters = [];

  if (dbAvailable && dbPool) {
    try {
      const [voteRows] = await dbPool.query('SELECT * FROM htf_kos_votes ORDER BY createdAt DESC');
      allVotes = voteRows || [];
      const [voterRows] = await dbPool.query('SELECT * FROM htf_kos_voters ORDER BY createdAt DESC');
      allVoters = voterRows || [];
    } catch (e) {
      console.warn('[Leaderboard] DB query error:', e.message);
    }
  } else {
    try { allVotes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8') || '[]'); } catch (e) {}
    try { allVoters = JSON.parse(fs.readFileSync(VOTERS_FILE, 'utf-8') || '[]'); } catch (e) {}
  }

  const candidateVotesMap = {};
  for (const v of allVotes) {
    if (!candidateVotesMap[v.candidateId]) {
      candidateVotesMap[v.candidateId] = [];
    }
    candidateVotesMap[v.candidateId].push({
      voterName: v.voterName,
      voterJobNo: v.voterJobNo,
      time: v.createdAt
    });
  }

  const totalVotesCount = allVotes.length;
  const totalVotersCount = new Set(allVotes.map(v => v.voterJobNo)).size;

  const rankedCandidates = works.map(w => {
    const voters = candidateVotesMap[w.id] || [];
    const voteCount = voters.length;
    const ratio = totalVotesCount > 0 ? ((voteCount / totalVotesCount) * 100).toFixed(1) + '%' : '0.0%';
    return {
      ...w,
      voteCount,
      voteRatio: ratio,
      voters
    };
  }).sort((a, b) => b.voteCount - a.voteCount);

  // Assign ranking numbers
  rankedCandidates.forEach((c, idx) => {
    c.rank = idx + 1;
  });

  const result = {
    totalVotersCount,
    totalVotesCount,
    candidates: rankedCandidates,
    allVotesList: allVotes
  };
  leaderboardCache = result;
  leaderboardCacheTime = now;
  return result;
}

async function generateVoteExcelBuffer() {
  const leaderboard = await getVoteLeaderboard();
  const wb = XLSX.utils.book_new();

  // Sheet 1: 候选人得票排行榜
  const rankHeaders = ['排名', '候选人编号', '姓名', '所属部门/团队', '现任岗位/职级', '短视频作品标题', '总得票数', '得票占比'];
  const rankRows = leaderboard.candidates.map(c => [
    c.rank,
    c.id,
    c.name,
    c.department,
    c.position,
    c.videoTitle,
    c.voteCount,
    c.voteRatio
  ]);
  const wsRank = XLSX.utils.aoa_to_sheet([rankHeaders, ...rankRows]);
  wsRank['!cols'] = [
    { wch: 8 },  // 排名
    { wch: 14 }, // 编号
    { wch: 12 }, // 姓名
    { wch: 18 }, // 部门
    { wch: 18 }, // 岗位
    { wch: 32 }, // 标题
    { wch: 12 }, // 票数
    { wch: 12 }  // 占比
  ];
  XLSX.utils.book_append_sheet(wb, wsRank, '候选人得票排行榜');

  // Sheet 2: 员工投票明细流水表
  const detailHeaders = ['序号', '投票人姓名', '投票人工号', '被投候选人编号', '被投候选人姓名', '投票时间'];
  const detailRows = leaderboard.allVotesList.map((v, i) => [
    i + 1,
    v.voterName,
    v.voterJobNo,
    v.candidateId,
    v.candidateName || '',
    v.createdAt ? (typeof v.createdAt === 'object' ? v.createdAt.toISOString() : v.createdAt) : ''
  ]);
  const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  wsDetail['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, '员工投票明细表');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

let appsCache = null;
let appsCacheTime = 0;
const APPS_CACHE_TTL = 10000; // 10s in-memory cache

async function getStoredApplications() {
  const now = Date.now();
  if (appsCache && now - appsCacheTime < APPS_CACHE_TTL) {
    return appsCache;
  }

  initStorage();
  let list = [];
  if (dbAvailable && dbPool) {
    try {
      const [rows] = await dbPool.query('SELECT * FROM htf_kos_applications ORDER BY createdAt DESC');
      list = (rows || []).map(r => {
        let parsedAnswers = r.surveyAnswers;
        if (typeof parsedAnswers === 'string') {
          try {
            parsedAnswers = JSON.parse(parsedAnswers);
          } catch (e) {}
        }
        let parsedGraphicImages = r.graphicImages;
        if (typeof parsedGraphicImages === 'string') {
          try {
            parsedGraphicImages = JSON.parse(parsedGraphicImages);
          } catch (e) {}
        }
        return {
          ...r,
          workType: r.workType || 'video',
          graphicImages: parsedGraphicImages || [],
          graphicContent: r.graphicContent || '',
          surveyCompleted: !!r.surveyCompleted,
          surveyAnswers: parsedAnswers,
          q26Score: r.q26Score !== undefined && r.q26Score !== null ? Number(r.q26Score) : 0,
          q27Score: r.q27Score !== undefined && r.q27Score !== null ? Number(r.q27Score) : 0,
          reviewComments: r.reviewComments || '',
          reviewerRemark: r.reviewerRemark || '',
          videoScore: r.videoScore !== undefined && r.videoScore !== null ? Number(r.videoScore) : null,
          videoReview: r.videoReview || ''
        };
      });
      appsCache = list;
      appsCacheTime = now;
      return list;
    } catch (e) {
      console.warn('[Database] Query failed, falling back to local file:', e.message);
    }
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    list = JSON.parse(raw);
    appsCache = list;
    appsCacheTime = now;
    return list;
  } catch (e) {
    return [];
  }
}

async function getNextSequentialId() {
  const list = await getStoredApplications();
  let maxNum = 0;
  for (const item of list) {
    const raw = String(item.id || '').trim();
    const match = raw.match(/(?:XH-)?(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = Math.max(maxNum + 1, list.length + 1);
  return `XH-${String(nextNum).padStart(2, '0')}`;
}

async function saveApplication(appData) {
  initStorage();

  // Auto-convert any base64 avatar to persistent disk file
  let finalAvatarUrl = appData.avatarUrl || '';
  if (finalAvatarUrl.startsWith('data:image/')) {
    try {
      const matches = finalAvatarUrl.match(/^data:image\/([A-Za-z0-9-+]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const rawExt = matches[1].toLowerCase().replace('jpeg', 'jpg');
        const ext = rawExt.startsWith('.') ? rawExt : `.${rawExt}`;
        const avatarFilename = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
        const avatarPath = path.join(AVATAR_DIR, avatarFilename);
        fs.writeFileSync(avatarPath, Buffer.from(matches[2], 'base64'));
        finalAvatarUrl = `/uploads/avatars/${avatarFilename}`;
        // Sync to OSS if configured
        const ossUrl = await uploadToOss(`kos/avatars/${avatarFilename}`, avatarPath);
        if (ossUrl) {
          finalAvatarUrl = ossUrl;
        }
        appData.avatarUrl = finalAvatarUrl;
      }
    } catch (e) {
      console.warn('Failed to extract base64 avatar', e);
    }
  }

  // Save to MySQL if available
  if (dbAvailable && dbPool) {
    try {
      const answersJson = appData.surveyAnswers ? JSON.stringify(appData.surveyAnswers) : null;
      const graphicImagesJson = appData.graphicImages ? JSON.stringify(appData.graphicImages) : null;
      const q26 = appData.surveyAnswers?.['26'] || appData.specialtyTalent || '';
      const q27 = appData.surveyAnswers?.['27'] || appData.accountPersona || '';

      const sql = `
        INSERT INTO htf_kos_applications (
          id, name, gender, department, position, personalIntro, accountName, jobNo, mobile, avatarUrl,
          workType, graphicImages, graphicContent,
          surveyCompleted, surveyTime, surveyScore, surveyScaleScore, surveySubjectiveScore, surveyRating, surveyAnswers,
          videoTitle, videoCategory, videoIntro, targetAccountStyle, accountPersona, specialtyTalent,
          videoUrl, videoSize, videoDuration, status, submittedAt,
          q26Score, q27Score, reviewComments, reviewerRemark, videoScore, videoReview
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name), gender=VALUES(gender), department=VALUES(department),
          position=VALUES(position), personalIntro=VALUES(personalIntro), accountName=VALUES(accountName), jobNo=VALUES(jobNo), avatarUrl=VALUES(avatarUrl),
          workType=VALUES(workType), graphicImages=VALUES(graphicImages), graphicContent=VALUES(graphicContent),
          surveyCompleted=VALUES(surveyCompleted), surveyTime=VALUES(surveyTime),
          surveyScore=VALUES(surveyScore), surveyScaleScore=VALUES(surveyScaleScore), surveySubjectiveScore=VALUES(surveySubjectiveScore),
          surveyRating=VALUES(surveyRating), surveyAnswers=VALUES(surveyAnswers),
          videoTitle=VALUES(videoTitle), videoCategory=VALUES(videoCategory),
          videoIntro=VALUES(videoIntro), targetAccountStyle=VALUES(targetAccountStyle), accountPersona=VALUES(accountPersona), specialtyTalent=VALUES(specialtyTalent),
          videoUrl=VALUES(videoUrl), videoSize=VALUES(videoSize), videoDuration=VALUES(videoDuration),
          status=VALUES(status), q26Score=VALUES(q26Score), q27Score=VALUES(q27Score),
          reviewComments=VALUES(reviewComments), reviewerRemark=VALUES(reviewerRemark),
          videoScore=VALUES(videoScore), videoReview=VALUES(videoReview), updatedAt=CURRENT_TIMESTAMP
      `;
      await dbPool.query(sql, [
        appData.id,
        appData.name || '',
        appData.gender || '',
        appData.department || '',
        appData.position || '',
        appData.personalIntro || '',
        appData.accountName || appData.videoCategory || '',
        appData.jobNo || '',
        appData.mobile || '',
        appData.avatarUrl || '',
        appData.workType || 'video',
        graphicImagesJson,
        appData.graphicContent || '',
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
        appData.targetAccountStyle || '',
        q27,
        q26,
        appData.videoUrl || '',
        appData.videoSize || '',
        appData.videoDuration || '',
        appData.status || '待初筛',
        appData.submittedAt || '',
        Number(appData.q26Score || 0),
        Number(appData.q27Score || 0),
        appData.reviewComments || '',
        appData.reviewerRemark || '',
        appData.videoScore !== undefined && appData.videoScore !== null && appData.videoScore !== '' ? Number(appData.videoScore) : null,
        appData.videoReview || ''
      ]);
    } catch (e) {
      console.warn('[Database] Save to MySQL failed:', e.message);
    }
  }

  // Always keep local JSON in sync as solid local backup
  try {
    const list = [];
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      list.push(...JSON.parse(raw));
    } catch (e) {}

    const existingIndex = list.findIndex(item => item.id === appData.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...appData, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(appData);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (fsErr) {
    console.warn('[Storage] Local JSON backup write failed:', fsErr.message);
  }

  appsCache = null;
  invalidateVoteCache();
  return appData;
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

        // 1. File Upload endpoint (Local high-speed streaming storage for video & avatar)
        if (pathname === '/api/upload' && req.method === 'POST') {
          req.setTimeout(15 * 60 * 1000);
          res.setTimeout(15 * 60 * 1000);
          try {
            initStorage();
            const uploadType = url.searchParams.get('type') || 'video';
            const isAvatar = uploadType === 'avatar';
            const isGraphic = uploadType === 'graphic' || uploadType === 'image';
            const targetDir = isGraphic ? GRAPHIC_DIR : (isAvatar ? AVATAR_DIR : UPLOAD_DIR);
            const prefix = isGraphic ? 'graphic_' : (isAvatar ? 'avatar_' : 'video_');
            const subDir = isGraphic ? 'graphics' : (isAvatar ? 'avatars' : 'videos');
            const maxLimit = isGraphic ? 50 * 1024 * 1024 : (isAvatar ? 15 * 1024 * 1024 : 550 * 1024 * 1024);

            const bb = busboy({ headers: req.headers, limits: { fileSize: maxLimit } });
            let savedFilename = '';
            let originalFilename = '';
            let savePromise = null;
            let saveTo = '';

            bb.on('file', (name, fileStream, info) => {
              originalFilename = info.filename || (isGraphic ? 'image.jpg' : (isAvatar ? 'avatar.jpg' : 'upload.mp4'));
              const ext = path.extname(originalFilename) || (isGraphic || isAvatar ? '.jpg' : '.mp4');
              savedFilename = `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
              saveTo = path.join(targetDir, savedFilename);
              const writeStream = fs.createWriteStream(saveTo);

              savePromise = new Promise((resolve, reject) => {
                fileStream.pipe(writeStream);
                writeStream.on('finish', () => resolve(true));
                writeStream.on('error', (err) => reject(err));
              });
            });

            bb.on('close', async () => {
              try {
                if (savePromise && saveTo) {
                  await savePromise;
                  let publicUrl = `/uploads/${subDir}/${savedFilename}`;

                  // If OSS is configured, automatically upload to Alibaba Cloud OSS
                  const ossUrl = await uploadToOss(`kos/${subDir}/${savedFilename}`, saveTo);
                  if (ossUrl) {
                    publicUrl = ossUrl;
                  }

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

        // 1.1 Direct OSS Upload Signature (Bypasses ECS 1Mbps bandwidth for 100x faster uploads)
        if (pathname === '/api/oss/signature' && req.method === 'GET') {
          (async () => {
            try {
              const oss = await getOssClient();
              if (!oss) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 400, message: 'OSS not configured' }));
                return;
              }
              const uploadType = url.searchParams.get('type') || 'video';
              const filename = url.searchParams.get('filename') || 'upload.mp4';
              const ext = path.extname(filename) || (uploadType === 'avatar' ? '.jpg' : '.mp4');
              const subDir = uploadType === 'avatar' ? 'avatars' : (uploadType === 'graphic' ? 'graphics' : 'videos');
              const prefix = uploadType === 'avatar' ? 'avatar_' : (uploadType === 'graphic' ? 'graphic_' : 'video_');
              const savedFilename = `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
              const objectKey = `kos/${subDir}/${savedFilename}`;
              const contentType = url.searchParams.get('contentType') || (uploadType === 'avatar' ? 'image/jpeg' : 'video/mp4');

              const uploadUrl = oss.signatureUrl(objectKey, {
                method: 'PUT',
                'Content-Type': contentType,
                expires: 3600
              }).replace(/^http:\/\//, 'https://');

              const publicUrl = oss.generateObjectUrl(objectKey).replace(/^http:\/\//, 'https://');

              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({
                code: 0,
                data: {
                  uploadUrl,
                  publicUrl,
                  objectKey,
                  filename: savedFilename
                }
              }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 500, message: err.message }));
            }
          })();
          return;
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

            // Assign clean sequential ID with XH- prefix: XH-01, XH-02, XH-03...
            let id = data.id;
            if (!id || /^(XH-\d{6}-|KOS-)/i.test(id)) {
              id = await getNextSequentialId();
            } else if (/^XH-\d+$/i.test(id)) {
              const num = id.replace(/^XH-/i, '');
              id = `XH-${num.padStart(2, '0')}`;
            } else if (/^\d+$/.test(id)) {
              id = `XH-${String(id).padStart(2, '0')}`;
            }

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

        // 6.1 Delete single application
        if (pathname.startsWith('/api/applications/') && req.method === 'DELETE') {
          (async () => {
            const id = decodeURIComponent(pathname.replace('/api/applications/', '')).trim();
            if (dbAvailable && dbPool) {
              try {
                await dbPool.query('DELETE FROM htf_kos_applications WHERE id = ?', [id]);
              } catch (e) {
                console.warn('MySQL delete application failed:', e.message);
              }
            }
            try {
              let list = [];
              if (fs.existsSync(DATA_FILE)) {
                list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
              }
              list = list.filter(item => item.id !== id);
              fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
            } catch (e) {}

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 0, message: '删除成功' }));
          })();
          return;
        }

        // 6.2 Clear all test applications (reset sequential ID to XH-01)
        if (pathname === '/api/applications' && req.method === 'DELETE') {
          (async () => {
            if (dbAvailable && dbPool) {
              try {
                await dbPool.query('DELETE FROM htf_kos_applications');
              } catch (e) {
                console.warn('MySQL delete all applications failed:', e.message);
              }
            }
            try {
              fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
            } catch (e) {}

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 0, message: '已清空所有测试数据，编号将从 XH-01 重新开始' }));
          })();
          return;
        }

        // 6.3 Update candidate review / status / subjective score
        if (pathname.startsWith('/api/applications/') && (req.method === 'PATCH' || req.method === 'PUT')) {
          parseJsonBody(async (err, updates) => {
            if (err) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 400, message: 'Invalid JSON body' }));
              return;
            }
            const id = decodeURIComponent(pathname.replace('/api/applications/', '')).trim();
            try {
              const list = await getStoredApplications();
              const target = list.find(item => item.id === id);
              if (!target) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 404, message: '未找到候选人记录' }));
                return;
              }

              // Update fields
              if (updates.status !== undefined) target.status = updates.status;
              if (updates.reviewComments !== undefined) target.reviewComments = updates.reviewComments;
              if (updates.reviewerRemark !== undefined) target.reviewerRemark = updates.reviewerRemark;
              if (updates.q26Score !== undefined) target.q26Score = Number(updates.q26Score);
              if (updates.q27Score !== undefined) target.q27Score = Number(updates.q27Score);
              if (updates.videoScore !== undefined) target.videoScore = updates.videoScore === '' || updates.videoScore === null ? null : Number(updates.videoScore);
              if (updates.videoReview !== undefined) target.videoReview = updates.videoReview;

              // Recalculate total score & rating
              const q26Score = Number(target.q26Score || 0);
              const q27Score = Number(target.q27Score || 0);
              const textTotal = q26Score + q27Score;
              target.surveySubjectiveScore = textTotal;
              target.surveyScore = Number(target.surveyScaleScore || 0) + textTotal;

              const total = target.surveyScore;
              const scale = Number(target.surveyScaleScore || 0);
              if (total >= 112 && scale >= 102 && textTotal >= 10) target.surveyRating = 'S级·标杆IP';
              else if (total >= 88 && scale >= 80 && textTotal >= 4) target.surveyRating = 'A级·主力IP';
              else if (total >= 65 && scale >= 60) target.surveyRating = 'B级·储备IP';
              else target.surveyRating = '暂不推荐·幕后支持';

              const saved = await saveApplication(target);
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 0, message: '评审信息更新成功', data: saved }));
            } catch (saveErr) {
              console.error('Update review error:', saveErr);
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 500, message: saveErr.message }));
            }
          });
          return;
        }

        // 6.4 Export Standard Daily Excel Report
        if (pathname === '/api/reports/export' && req.method === 'GET') {
          (async () => {
            try {
              const list = await getStoredApplications();
              const buffer = await generateReportExcelBuffer(list);
              const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const filename = `星火计划_每日报名与问卷评分表_${dateStr}.xlsx`;
              const encodedFilename = encodeURIComponent(filename);

              res.writeHead(200, {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': buffer.length
              });
              res.end(buffer);
            } catch (err) {
              console.error('Report export error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 500, message: '生成报表失败: ' + err.message }));
            }
          })();
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

        // 8. Dynamic Survey Questions API
        if (pathname === '/api/survey/questions' && req.method === 'GET') {
          const includeAll = url.searchParams.get('all') === '1' || url.searchParams.get('admin') === '1';
          getSurveyQuestions(includeAll).then(result => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 0, data: result }));
          }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: err.message }));
          });
          return;
        }

        if (pathname === '/api/survey/questions' && req.method === 'POST') {
          parseJsonBody(async (err, data) => {
            if (err) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 400, message: 'Invalid JSON body' }));
              return;
            }
            try {
              const updated = await saveSurveyQuestion(data);
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 0, message: '题目修改成功', data: updated }));
            } catch (saveErr) {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 500, message: saveErr.message }));
            }
          });
          return;
        }

        if (pathname === '/api/survey/questions/batch' && req.method === 'POST') {
          parseJsonBody(async (err, data) => {
            if (err || !Array.isArray(data?.questions)) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 400, message: 'Invalid questions payload' }));
              return;
            }
            try {
              for (const q of data.questions) {
                await saveSurveyQuestion(q);
              }
              const fresh = await getSurveyQuestions();
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 0, message: '批量更新题库成功', data: fresh }));
            } catch (batchErr) {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 500, message: batchErr.message }));
            }
          });
          return;
        }

        // 9. Video Showcase & Voting APIs
        if (pathname === '/api/vote/works' && req.method === 'GET') {
          let voterJobNo = (url.searchParams.get('jobNo') || '').trim();
          if (!voterJobNo && req.headers && req.headers.cookie) {
            const match = String(req.headers.cookie).match(/(?:^|;\s*)xh_df_id=([^;]*)/);
            if (match) voterJobNo = decodeURIComponent(match[1]).trim();
          }

          Promise.all([
            getVoteWorks(),
            voterJobNo ? getUserLikedCandidateIds(voterJobNo) : Promise.resolve([])
          ]).then(([works, userLikedIds]) => {
            const respHeaders = { 'Content-Type': 'application/json; charset=utf-8' };
            if (voterJobNo) {
              respHeaders['Set-Cookie'] = `xh_df_id=${encodeURIComponent(voterJobNo)}; Max-Age=315360000; Path=/; SameSite=Lax`;
            }
            res.writeHead(200, respHeaders);
            res.end(JSON.stringify({ code: 0, data: works, userLikedIds: userLikedIds || [], deviceId: voterJobNo || '' }));
          }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: err.message }));
          });
          return;
        }

        if (pathname === '/api/vote/login' && req.method === 'POST') {
          parseJsonBody(async (err, data) => {
            if (err) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 400, message: 'Invalid JSON body' }));
              return;
            }
            try {
              const result = await voterLogin(data.name, data.jobNo);
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 0, data: result }));
            } catch (loginErr) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: -1, message: loginErr.message }));
            }
          });
          return;
        }

        if ((pathname === '/api/vote/toggle' || pathname === '/api/vote/like') && req.method === 'POST') {
          parseJsonBody(async (err, data) => {
            if (err || !data || !data.candidateId) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 400, message: 'Invalid vote parameters' }));
              return;
            }
            try {
              let result;
              if (pathname === '/api/vote/like' || (data.count && data.count > 1)) {
                result = await addLikes(data.candidateId, data.count || 1, data.jobNo);
              } else {
                result = await toggleVote(data.jobNo, data.candidateId, data.count);
              }
              const respHeaders = { 'Content-Type': 'application/json; charset=utf-8' };
              if (data.jobNo) {
                respHeaders['Set-Cookie'] = `xh_df_id=${encodeURIComponent(String(data.jobNo).trim())}; Max-Age=315360000; Path=/; SameSite=Lax`;
              }
              res.writeHead(200, respHeaders);
              res.end(JSON.stringify({ code: 0, data: result }));
            } catch (voteErr) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: -1, message: voteErr.message }));
            }
          });
          return;
        }

        if (pathname === '/api/vote/submit' && req.method === 'POST') {
          parseJsonBody(async (err, data) => {
            if (err) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 400, message: 'Invalid JSON body' }));
              return;
            }
            try {
              const result = await submitVotes(data.jobNo);
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 0, message: '投票提交成功', data: result }));
            } catch (subErr) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: -1, message: subErr.message }));
            }
          });
          return;
        }

        if (pathname === '/api/vote/results' && req.method === 'GET') {
          getVoteLeaderboard().then(result => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 0, data: result }));
          }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: err.message }));
          });
          return;
        }

        if (pathname === '/api/vote/export' && req.method === 'GET') {
          generateVoteExcelBuffer().then(buffer => {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const filename = encodeURIComponent(`星火计划_员工视频投票结果统计表_${dateStr}.xlsx`);
            res.writeHead(200, {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
              'Content-Length': buffer.length
            });
            res.end(buffer);
          }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: '导出失败: ' + err.message }));
          });
          return;
        }

        // 9.1 生成投票专属二维码 (支持微信直接扫码进入 / 扫码登录)
        if (pathname === '/api/vote/qrcode' && req.method === 'GET') {
          const ip = getLocalIpAddress();
          const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
          const protoHeader = req.headers['x-forwarded-proto'] || 'http';
          const baseVoteUrl = (hostHeader && !hostHeader.startsWith('localhost') && !hostHeader.startsWith('127.0.0.1'))
            ? `${protoHeader}://${hostHeader}/vote`
            : `http://${ip}:5173/vote`;
          const targetUrl = url.searchParams.get('text') || baseVoteUrl;

          if (url.searchParams.get('format') === 'png') {
            QRCode.toBuffer(targetUrl, { margin: 1, width: 280 }).then(buf => {
              res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' });
              res.end(buf);
            }).catch(err => {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 500, message: err.message }));
            });
            return;
          }

          QRCode.toDataURL(targetUrl, {
            margin: 1,
            width: 280,
            color: { dark: '#1C1813', light: '#FFFFFF' }
          }).then(qrDataUrl => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              code: 0,
              data: {
                qrCodeUrl: qrDataUrl,
                voteUrl: baseVoteUrl,
                targetUrl: targetUrl
              }
            }));
          }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: err.message }));
          });
          return;
        }

        // 9.2 生成跨端扫码登录令牌与专属二维码
        if (pathname === '/api/vote/scan-token' && req.method === 'GET') {
          const ip = getLocalIpAddress();
          const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
          const protoHeader = req.headers['x-forwarded-proto'] || 'http';
          const baseVoteUrl = (hostHeader && !hostHeader.startsWith('localhost') && !hostHeader.startsWith('127.0.0.1'))
            ? `${protoHeader}://${hostHeader}/vote`
            : `http://${ip}:5173/vote`;

          const token = 'st_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
          const scanVoteUrl = `${baseVoteUrl}?scanToken=${token}`;

          scanSessions.set(token, {
            status: 'waiting',
            voter: null,
            createdAt: Date.now()
          });

          QRCode.toDataURL(scanVoteUrl, {
            margin: 1,
            width: 280,
            color: { dark: '#1C1813', light: '#FFFFFF' }
          }).then(qrDataUrl => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              code: 0,
              data: {
                token: token,
                scanVoteUrl: scanVoteUrl,
                baseVoteUrl: baseVoteUrl,
                qrCodeUrl: qrDataUrl
              }
            }));
          }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: err.message }));
          });
          return;
        }

        // 9.3 轮询扫码登录授权状态 (电脑端轮询)
        if (pathname === '/api/vote/scan-poll' && req.method === 'GET') {
          const token = url.searchParams.get('token');
          if (!token || !scanSessions.has(token)) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 0, data: { status: 'expired' } }));
            return;
          }
          const sess = scanSessions.get(token);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ code: 0, data: sess }));
          return;
        }

        // 9.4 手机端扫码后确认登录授权 (同步登录电脑端)
        if (pathname === '/api/vote/scan-confirm' && req.method === 'POST') {
          parseJsonBody(async (err, body) => {
            if (err || !body || !body.token || !body.name) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 400, message: '请完整提供授权信息与姓名' }));
              return;
            }
            const token = body.token;
            if (!scanSessions.has(token)) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: -1, message: '扫码会话已过期，请刷新二维码' }));
              return;
            }

            try {
              const voterResult = await voterLogin(body.name, body.jobNo || ('L_' + body.name));
              scanSessions.set(token, {
                status: 'confirmed',
                voter: voterResult,
                createdAt: Date.now()
              });
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: 0, message: '扫码授权成功', data: voterResult }));
            } catch (loginErr) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ code: -1, message: loginErr.message }));
            }
          });
          return;
        }

        if (pathname === '/vote' || pathname === '/vote/' || pathname === '/vote.html' || pathname === '/vote/index.html') {
          const votePath = path.resolve(process.cwd(), 'public', 'vote.html');
          if (fs.existsSync(votePath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            fs.createReadStream(votePath).pipe(res);
            return;
          }
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
