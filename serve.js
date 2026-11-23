const http = require('http');
const fs = require('fs');
const path = require('path');

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const root = __dirname;
const port = process.env.PORT || 8080;

http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root)) { res.statusCode = 403; res.end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not found'); return; }
    res.setHeader('Content-Type', mime[path.extname(p)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(port, () => console.log(` serving at http://localhost:${port}`));
