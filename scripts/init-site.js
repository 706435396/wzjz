/* ============================================================
 * 72tool 站群 - 一键建站脚手架（init-site.js）
 * ------------------------------------------------------------
 * 用途：为「新增一个英文利基子站」生成完整骨架，免去手工复制：
 *   1) 建 public/<dir>/ 目录
 *   2) 写 config.json（英文模板，含随机 brand 色 + layout 变体，anti-detection）
 *   3) 写 data/list.json（tools:[] 空模板，等 enrich/AI 采集填充）
 *   4) 复制 public/index.html 到子目录
 *   5) 自动追加 # SITE <domain> <dir> 到 public/_redirects（build-sitemap 会自动读它生成 domain-map.json）
 *
 * 用法：
 *   node scripts/init-site.js --all                 # 按 scripts/niches-100.json 批量建站
 *   node scripts/init-site.js --one --domain aibg.72tool.com --dir tools/aibg --name "AI Background Remover" --category "AI Tools"
 *   node scripts/init-site.js --dry --all            # 只打印将要创建的内容，不落盘
 *
 * 注意：建站后只需在 Cloudflare Pages 控制台给项目加一个自定义域名，
 *       然后跑 node scripts/build-sitemap.js 即可（它会重建 domain-map.json + 根站聚合）。
 *       前端 app.js 运行时动态读 domain-map.json，无需改前端、无需升版本号。
 * ============================================================ */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var PUBLIC = path.join(ROOT, 'public');

// 品牌色板（跨站轮换，规避广告联盟判批量站群雷同）
var BRANDS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#a855f7'];
var LAYOUTS = ['grid', 'masonry', 'list'];

// 英文 UI 文案块（app.js 的 DEFAULT_UI 是中文兜底，英文站必须在 config.ui 显式提供）
var EN_UI = {
  searchPlaceholder: 'Search tools…',
  emptyResult: 'No matching tools found. Try another keyword.',
  backToList: '← Back to tools',
  detailInfoTitle: 'Basic Info',
  detailUsageTitle: 'How to use',
  detailProsTitle: '✅ Pros',
  detailConsTitle: '⚠️ Cons',
  detailVisitBtn: 'Visit official site ↗',
  detailRelTutorials: 'Related tutorials',
  detailRelTools: 'Similar tools',
  detailFaqTitle: 'Related questions',
  detailCardBtn: 'View details →',
  latestTutorials: 'Latest tutorials',
  readTimePrefix: '⏱ Reading',
  readTimeSuffix: 'min',
  copyCode: 'Copy',
  copyCodeDone: 'Copied',
  copyCodeFail: 'Copy failed',
  copyPromo: 'Copy promo link',
  freeTrial: 'Free trial',
  allTools: 'All',
  openSource: 'Open Source / Closed',
  openSourceValue: 'Open Source',
  closedSourceValue: 'Closed Source',
  pricing: 'Pricing',
  pricingFree: 'Free',
  pricingFreemium: 'Free + Paid',
  pricingPaid: 'Paid',
  platforms: 'Platforms',
  license: 'License',
  updated: 'Updated',
  footerToolsCount: '{{n}} tools · Updated ',
  privacy: 'Privacy',
  promoBadge: 'Affiliate',
  communityTitle: 'Join Developer Community',
  usageTipLabel: '💡 Tip:',
  usageCheckLabel: '✅ Check:',
  breadcrumbHome: 'Home',
  breadcrumbAgents: 'Agent Clusters',
  breadcrumbTools: 'Tool Clusters'
};

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function makeConfig(n, idx) {
  var brand = BRANDS[idx % BRANDS.length];
  var layout = LAYOUTS[idx % LAYOUTS.length];
  var kw = (n.kw && n.kw.length) ? n.kw.join(', ') : slugify(n.category).replace(/-/g, ', ');
  var desc = n.desc ||
    ('Curated directory of the best ' + (n.category || 'online') + ' tools. Hand-picked ' +
     (n.name || 'tools') + ' with pros, cons, pricing and step-by-step guides — updated regularly.');
  return {
    domain: n.domain,
    name: n.name,
    title: n.name + ' | Best ' + (n.category || 'Online') + ' Tools & Reviews',
    description: desc,
    keywords: kw,
    category: n.category || 'Tools',
    lang: 'en',
    base: '/' + n.dir.replace(/^\/+|\/+$/g, ''),
    article: { enabled: true, categories: ['Guide', 'Tips', 'Compare', 'Pitfalls'] },
    ads: { enabled: true, region: 'global', provider: 'adsense', slots: { top: '', sidebar: '', article: '' } },
    theme: {
      brand: brand,
      layout: layout,
      navOrder: [
        { key: 'home', label: 'Home' },
        { key: 'article', label: 'Blog' },
        { key: 'agents', label: 'Agents' },
        { key: 'tools', label: 'Tools' }
      ]
    },
    community: { enabled: true, title: 'Developer Community', url: '/community' },
    top: false,
    imageSitemap: true,
    ui: EN_UI
  };
}

function readNiches() {
  var f = path.join(__dirname, 'niches-100.json');
  if (!fs.existsSync(f)) { console.error('缺少 scripts/niches-100.json'); process.exit(1); }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function appendRedirect(domain, dir) {
  var rf = path.join(PUBLIC, '_redirects');
  var line = '# SITE ' + domain + ' ' + dir.replace(/^\/+|\/+$/g, '');
  var content = fs.readFileSync(rf, 'utf8');
  if (new RegExp('# SITE\\s+' + domain.replace(/\./g, '\\.') + '\\b').test(content)) return false;
  fs.appendFileSync(rf, line + '\n');
  return true;
}

function createSite(n, idx, dry) {
  var dir = n.dir.replace(/^\/+|\/+$/g, '');
  var absDir = path.join(PUBLIC, dir);
  var cfg = makeConfig(n, idx);
  if (dry) {
    console.log('[dry] would create', dir, '<-', n.domain, '|', n.name);
    return;
  }
  if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });
  if (!fs.existsSync(path.join(absDir, 'data'))) fs.mkdirSync(path.join(absDir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(absDir, 'config.json'), JSON.stringify(cfg, null, 2));
  fs.writeFileSync(path.join(absDir, 'data', 'list.json'),
    JSON.stringify({ updated: new Date().toISOString().slice(0, 10), tools: [] }, null, 2));
  if (fs.existsSync(path.join(PUBLIC, 'index.html'))) {
    fs.copyFileSync(path.join(PUBLIC, 'index.html'), path.join(absDir, 'index.html'));
  }
  var added = appendRedirect(n.domain, dir);
  console.log((added ? '✓ ' : '· ') + dir + '  <- ' + n.domain + '  | ' + n.name);
}

function main() {
  var args = process.argv.slice(2);
  var dry = args.indexOf('--dry') >= 0;
  var all = args.indexOf('--all') >= 0;
  if (all) {
    var niches = readNiches();
    console.log('批量建站：' + niches.length + ' 个' + (dry ? '（dry-run）' : ''));
    niches.forEach(function (n, i) { createSite(n, i, dry); });
    if (!dry) console.log('完成。下一步：Cloudflare 加自定义域名 + 跑 node scripts/build-sitemap.js');
    return;
  }
  var one = args.indexOf('--one') >= 0;
  if (one) {
    function get(a) { var i = args.indexOf(a); return i >= 0 ? args[i + 1] : ''; }
    var n = {
      domain: get('--domain'), dir: get('--dir'), name: get('--name'),
      category: get('--category'), kw: (get('--kw') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      desc: get('--desc')
    };
    if (!n.domain || !n.dir || !n.name) {
      console.error('用法: node scripts/init-site.js --one --domain x.72tool.com --dir tools/x --name "X" --category "Y" [--kw a,b] [--desc "..."]');
      process.exit(1);
    }
    createSite(n, 0, dry);
    return;
  }
  console.error('用法:\n  node scripts/init-site.js --all\n  node scripts/init-site.js --one --domain x.72tool.com --dir tools/x --name "X"');
  process.exit(1);
}

main();
