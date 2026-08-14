/* ============================================================
 * scripts/compress-static.js  ——  静态资源预构建压缩（部署前运行）
 * ------------------------------------------------------------
 * 对应清单「二.1」：进一步降低页面体积与 CDN 流量消耗。
 * 行为：
 *   1) CSS 压缩：去除块注释与多余空白（安全，不改变语义）；
 *   2) HTML 压缩：去除注释与连续空行（保守，保留 <!--[if]--> 之外的常规注释）；
 *   3) JS：保留原样——Cloudflare Pages 已默认 Brotli/Gzip 压缩传输，重复压缩收益低且易错；
 *   4) 图片 WebP：若项目已 npm install sharp，则把 public 下 png/jpg 转 webp（无损质量 80），
 *      否则跳过并提示（避免引入重依赖拖慢 CI）。
 * 用法：node scripts/compress-static.js   （在 deploy.yml 部署前自动调用）
 * 注意：仅压缩“源”文件不影响功能；如需保留源，请提交前勿提交压缩产物（见 .gitignore）。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR } = require('./_sites');

const SKIP = new Set(['node_modules', '.git', 'functions']); // functions 为边缘脚本，不压缩

function walk(dir, cb) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')          // 去块注释
    .replace(/\s*([{}:;,>])\s*/g, '$1')         // 去选择器/属性周围空白
    .replace(/\s+/g, ' ')
    .replace(/;}/g, '}')
    .trim();
}

function minifyHTML(html) {
  return html
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')    // 去普通 HTML 注释（保留 [if] 条件注释）
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

async function tryWebP() {
  let sharp;
  try { sharp = require('sharp'); } catch (e) { return 0; }
  let n = 0;
  walk(PUBLIC_DIR, (f) => {
    if (!/\.(png|jpe?g)$/i.test(f)) return;
    const out = f.replace(/\.(png|jpe?g)$/i, '.webp');
    if (fs.existsSync(out)) return;
    try { sharp(f).webp({ quality: 80 }).toFile(out); n++; } catch (e) { /* 跳过单文件 */ }
  });
  return n;
}

function main() {
  let cssN = 0, htmlN = 0;
  walk(PUBLIC_DIR, (f) => {
    if (/\.css$/i.test(f)) { const s = fs.readFileSync(f, 'utf8'); const m = minifyCSS(s); if (m !== s) { fs.writeFileSync(f, m); cssN++; } }
    else if (/\.html?$/i.test(f)) { const s = fs.readFileSync(f, 'utf8'); const m = minifyHTML(s); if (m !== s) { fs.writeFileSync(f, m); htmlN++; } }
  });
  console.log('✓ CSS 压缩', cssN, '个 | HTML 压缩', htmlN, '个');
  tryWebP().then((n) => { console.log('✓ WebP 转换', n, '张（无 sharp 则跳过）'); });
}

main();
