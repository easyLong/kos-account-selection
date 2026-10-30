import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
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

// ==========================================
// High-Performance In-Memory Static Asset Cache (with Gzip)
// ==========================================
const staticMemoryCache = new Map(); // filePath -> { buffer, gzipBuffer, mtime, size, contentType }
const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt']);

function getCachedStaticFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const cached = staticMemoryCache.get(filePath);

    if (cached && cached.mtime >= stat.mtimeMs) {
      return cached;
    }

    // Only cache files under 5MB in RAM
    if (stat.size > 5 * 1024 * 1024) {
      return null;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(filePath);
    let gzipBuffer = null;

    if (COMPRESSIBLE_EXTS.has(ext)) {
      gzipBuffer = zlib.gzipSync(buffer, { level: 6 });
    }

    const item = {
      buffer,
      gzipBuffer,
      mtime: stat.mtimeMs,
      size: stat.size,
      contentType,
      etag: `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`
    };

    staticMemoryCache.set(filePath, item);
    return item;
  } catch (e) {
    return null;
  }
}

function serveFile(filePath, req, res) {
  const ext = path.extname(filePath).toLowerCase();
  const range = req.headers.range;

  // Video range streaming support (videos are primarily hosted on OSS, but local fallback supported)
  if (range && (ext === '.mp4' || ext === '.mov')) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    stream.pipe(res);
    return;
  }

  // High-concurrency RAM cache serving
  const cached = getCachedStaticFile(filePath);
  if (cached) {
    // ETag check
    if (req.headers['if-none-match'] === cached.etag) {
      res.writeHead(304, { 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable' });
      res.end();
      return;
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldGzip = cached.gzipBuffer && acceptEncoding.includes('gzip');

    res.writeHead(200, {
      'Content-Type': cached.contentType,
      'Content-Encoding': shouldGzip ? 'gzip' : undefined,
      'Content-Length': shouldGzip ? cached.gzipBuffer.length : cached.buffer.length,
      'ETag': cached.etag,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    res.end(shouldGzip ? cached.gzipBuffer : cached.buffer);
    return;
  }

  // Fallback streaming for large files
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
  });
  fs.createReadStream(filePath).pipe(res);
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

// High concurrency socket & keepalive tuning
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.maxRequestsPerSocket = 1000;
server.timeout = 5 * 60 * 1000;
server.requestTimeout = 5 * 60 * 1000;

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`  🚀 KOS 生产环境服务已启动 (高并发高性能缓存已启用)`);
  console.log(`  ➜ 本地访问: http://127.0.0.1:${PORT}`);
  console.log(`  ➜ 局域网/公网: http://${HOST}:${PORT}`);
  console.log(`  ➜ 运行模式: 生产环境 (Production + In-Memory Gzip Cache)`);
  console.log(`====================================================`);
});
