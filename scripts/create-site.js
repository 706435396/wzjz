/* ============================================================
 * scripts/create-site.js  ——  批量建站脚手架（扩容 200 站效率提升 90%）
 * ------------------------------------------------------------
 * 对应清单「四.4 / 九.1」：输入域名+赛道，自动生成子站目录、基础 config.json、
 * 空白 data/article 文件、复制页面模板、追加 _redirects 路由，无需手动建文件夹。
 * 用法：
 *   node scripts/create-site.js --domain browseragent.72tool.com --dir agent/browser --track browser
 *   node scripts/create-site.js --domain txtclean.72tool.com --dir tools/txtclean --track txtclean --name "文本清洗导航"
 * config.json 自动注入差异化主题（随机品牌色/布局/导航顺序，稳定按域名哈希），
 * 降低模板站群特征（对应清单「六.2 / 三.3」）。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, REDIRECTS } = require('./_sites');

const PALETTE = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#0891b2', '#dc2626', '#4f46e5'];
const LAYOUTS = ['grid', 'list', 'masonry'];
const NAV_BASE = ['首页', '教程资讯', 'Agent 集群', '工具集群'];

function parseArgs() {
  const a = {}; const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--domain') a.domain = argv[++i];
    else if (argv[i] === '--dir') a.dir = argv[++i];
    else if (argv[i] === '--track') a.track = argv[++i];
    else if (argv[i] === '--name') a.name = argv[++i];
  }
  return a;
}

/* 按域名稳定哈希 -> 随机但可复现的主题，避免每次建站漂移 */
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function shuffle(arr, seed) {
  const a = arr.slice(); const r = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return r; };
  for (let i = a.length - 1; i > 0; i--) { const j = seed % (i + 1); [a[i], a[j]] = [a[j], a[i]]; seed = (seed * 1103515245 + 12345) & 0x7fffffff; }
  return a;
}

function main() {
  const a = parseArgs();
  if (!a.domain || !a.dir || !a.track) { console.log('用法：--domain <域名> --dir <子目录> --track <赛道> [--name <站名>]'); return; }
  const seed = hash(a.domain);
  const brand = PALETTE[seed % PALETTE.length];
  const layout = LAYOUTS[(seed >> 3) % LAYOUTS.length];
  const navOrder = shuffle(NAV_BASE, seed >> 5);

  const abs = path.join(PUBLIC_DIR, a.dir.replace(/^\//, ''));
  if (fs.existsSync(path.join(abs, 'config.json'))) { console.log('✕ 站点已存在:', a.dir); return; }
  fs.mkdirSync(path.join(abs, 'data'), { recursive: true });
  fs.mkdirSync(path.join(abs, 'article'), { recursive: true });

  const name = a.name || (a.track + ' 工具导航');
  const cfg = {
    domain: a.domain, name, title: name + ' | 72tool',
    description: '精选 ' + name + ' 工具与教程，开箱即用。',
    keywords: a.track + ',工具,导航',
    category: a.track, lang: 'zh-CN', base: '/' + a.dir.replace(/^\//, ''),
    article: { enabled: true, categories: ['部署教程', '使用技巧', '选型对比', '避坑指南'] },
    ads: { enabled: true, region: 'cn', slots: { top: '', sidebar: '', article: '' } },
    theme: { brand, layout, navOrder },                         // 差异化 UI（降站群特征）
    community: { enabled: true, title: '开发者社群', url: '/community' },
    top: true, imageSitemap: true
  };
  fs.writeFileSync(path.join(abs, 'config.json'), JSON.stringify(cfg, null, 2));
  fs.writeFileSync(path.join(abs, 'data', 'list.json'), JSON.stringify({ updated: '', tools: [] }, null, 2));
  fs.writeFileSync(path.join(abs, 'article', 'list.json'), JSON.stringify({ updated: '', articles: [] }, null, 2));
  copyIf(path.join(PUBLIC_DIR, 'index.html'), path.join(abs, 'index.html'));
  copyIf(path.join(PUBLIC_DIR, 'article.html'), path.join(abs, 'article.html'));

  // 追加 _redirects 路由（幂等：已存在则跳过）
  let raw = fs.readFileSync(REDIRECTS, 'utf8');
  const line = '# SITE ' + a.domain + ' ' + a.dir.replace(/^\//, '');
  if (!raw.includes(line)) {
    raw = raw.replace(/(# ROOT.*\n)/, line + '\n$1');
    fs.writeFileSync(REDIRECTS, raw);
  }
  console.log('✓ 已创建子站:', a.dir, '| 域名', a.domain, '| 主题色', brand, '| 布局', layout);
  console.log('下一步：Cloudflare Pages 控制台给项目加自定义域名', a.domain, '，并运行 node scripts/build-sitemap.js');
}

function copyIf(from, to) { if (fs.existsSync(from)) fs.copyFileSync(from, to); }

main();
