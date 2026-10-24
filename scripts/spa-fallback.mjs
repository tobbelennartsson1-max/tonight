// GitHub Pages has no SPA rewrites. Copy index.html to 404.html (catch-all, e.g. /together/K7XQ)
// and to each known route's folder so those URLs return 200 instead of a 404 status.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const html = fs.readFileSync(path.join(dist, 'index.html'));
fs.writeFileSync(path.join(dist, '404.html'), html);
for (const route of ['today', 'archive', 'pick', 'together']) {
  fs.mkdirSync(path.join(dist, route), { recursive: true });
  fs.writeFileSync(path.join(dist, route, 'index.html'), html);
}
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('spa-fallback: 404.html + route folders written');
