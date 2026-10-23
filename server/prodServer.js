import http from 'http';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env before reading process.env
const envPath = path.resolve(process.cwd(), 'server', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

import { createApiMiddleware } from './apiMiddleware.js';

const PORT = parseInt(process.env.PORT || '5173', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

const apiHandler = createApiMiddleware();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function serveFile(filePath, req, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Support video chunked/range streaming (required for Chrome/Safari/WeChat mobile seeking)
  if (range && (ext === '.mp4' || ext === '.mov')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer((req, res) => {
  // 1. Pass to API middleware first
  apiHandler(req, res, () => {
    // 2. If not an API route, serve static file
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);

    // Prevent path traversal
    pathname = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');

    // Check in public directory (uploads, images, favicon, etc.)
    if (pathname.startsWith('/uploads/') || pathname.startsWith('/images/') || pathname === '/favicon.svg' || pathname === '/icons.svg') {
      const publicFilePath = path.join(PUBLIC_DIR, pathname);
      if (fs.existsSync(publicFilePath) && fs.statSync(publicFilePath).isFile()) {
        serveFile(publicFilePath, req, res);
        return;
      }
    }

    // Check in dist directory (production bundle)
    let distFilePath = path.join(DIST_DIR, pathname);

    if (fs.existsSync(distFilePath) && fs.statSync(distFilePath).isFile()) {
      serveFile(distFilePath, req, res);
      return;
    }

    // SPA fallback: index.html
    const indexHtml = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
      serveFile(indexHtml, req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <h2>404 - 静态文件未就绪</h2>
        <p>未找到生产静态包，请在服务器项目根目录下执行 <code>npm run build</code> 进行打包构建。</p>
      `);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`  🚀 KOS 生产环境服务已启动`);
  console.log(`  ➜ 本地访问: http://127.0.0.1:${PORT}`);
  console.log(`  ➜ 局域网/公网: http://${HOST}:${PORT}`);
  console.log(`  ➜ 运行模式: 生产环境 (Production)`);
  console.log(`====================================================`);
});
