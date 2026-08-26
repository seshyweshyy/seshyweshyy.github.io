// static.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export function serveStatic(req, res, rootUrl) {
  const root = fileURLToPath(rootUrl);
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  const requested = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath.slice(1));
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (!err) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
      return;
    }

    // Support extensionless links (e.g. "solo", "online") like GitHub Pages does.
    if (!path.extname(filePath)) {
      const htmlPath = `${filePath}.html`;
      if (htmlPath.startsWith(root)) {
        fs.readFile(htmlPath, (err2, data2) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        });
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
}
