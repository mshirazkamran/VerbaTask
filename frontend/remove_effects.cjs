const fs = require('fs');
const p = require('path');
function walk(d) {
  let r = [];
  fs.readdirSync(d).forEach(f => {
    const pf = p.join(d, f);
    if (fs.statSync(pf).isDirectory()) r = r.concat(walk(pf));
    else if (pf.endsWith('.jsx')) r.push(pf);
  });
  return r;
}
const files = walk('./src');
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let nc = c.replace(/\bbackdrop-\s?/g, '');
  
  nc = nc.replace(/\bbg-canvas(?:-soft)?(\/[0-9]+)\b/g, (match, p1) => match.replace(p1, ''));
  nc = nc.replace(/\bbg-[a-z]+-[0-9]+(\/30|\/40|\/50|\/60|\/70|\/80|\/90|\/85)\b/g, (match, p1) => match.replace(p1, ''));
  
  nc = nc.replace(/\bborder-hairline(\/[0-9]+)\b/g, (match, p1) => match.replace(p1, ''));
  nc = nc.replace(/\bborder-white(\/[0-9]+)\b/g, (match, p1) => match.replace(p1, ''));
  nc = nc.replace(/\bborder-[a-z]+-[0-9]+(\/[0-9]+)\b/g, (match, p1) => match.replace(p1, ''));

  nc = nc.replace(/  +/g, ' ');

  if (c !== nc) {
    fs.writeFileSync(f, nc);
    console.log('Updated ' + f);
  }
});
