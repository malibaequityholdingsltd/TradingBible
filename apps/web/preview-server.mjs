// Fast local preview: serves the production dist + proxies /hcgi/api to the API server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PREVIEW_PORT || 3002);
const DIST = new URL('../../dist/apps/web/', import.meta.url).pathname;
const API = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain', '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  // API proxy
  if (url.pathname.startsWith('/hcgi/api')) {
    const target = new URL(url.pathname.replace(/^\/hcgi\/api/, '') + url.search, API);
    const proxy = http.request(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('api unreachable'); });
    req.pipe(proxy);
    return;
  }
  // Static files with SPA fallback
  let file = path.join(DIST, decodeURIComponent(url.pathname));
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) file = path.join(DIST, 'index.html');
    fs.readFile(file, (err2, data) => {
      if (err2) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
});

server.listen(PORT, '::', () => console.log(`preview on http://localhost:${PORT} (api -> ${API})`));
