import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export function serveStatic(req, res, publicUrl) {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const safePath = urlPath === '/' ? 'index.html' : (urlPath.startsWith('/') ? urlPath.slice(1) : urlPath);
  const publicPath = fileURLToPath(publicUrl);
  const filePath = path.join(publicPath, safePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}
