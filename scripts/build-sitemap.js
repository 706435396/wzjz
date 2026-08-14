/* ============================================================
 * scripts/build-sitemap.js  ——  批量生成站点地图 + 自动域名映射
 * ------------------------------------------------------------
 * 作用：
 *   1) 解析 public/_redirects 的「# SITE <域名> <目录>」注册表，得到
 *      全部子站点清单（新增站点只加一行 _redirects，零手动维护映射表）；
 *   2) 为每个子站生成三份地图：
 *        <dir>/sitemap.xml          —— 工具列表页（站点根 + 各工具外链）
 *        <dir>/sitemap-detail.xml   —— 工具详情内页（域名/?tool=<slug>，分段抓取）
 *        <dir>/article/sitemap.xml  —— 资讯/教程栏目地图（域名/article/<slug>）★新增
 *   3) 生成根 sitemap-index.xml，汇总所有子站的 sitemap（loc 写成「域名/.../sitemap.xml」，
 *      配合 functions/sitemap.xml.js 与 functions/article/sitemap.xml.js 让各子域名
 *      根路径 /sitemap.xml、/article/sitemap.xml 直接可访问）；
 *   4) 生成 public/common/domain-map.json（域名->目录），供 Pages Function 自动匹配。
 *
 * 运行：node scripts/build-sitemap.js
 * 依赖：仅 Node 内置模块（无需 npm install）
 *
 * 【省额度关键设计】lastmod 一律取自数据自身的 updated 字段（工具取 data/list.json，
 *   资讯取 article/list.json），绝不使用“当天日期”。因此某天没有新增内容时，
 *   sitemap 内容完全不变 -> git 无 diff -> crawl.yml 不提交 -> 不触发部署 ->
 *   不消耗 Cloudflare Pages 的 500 次/月免费构建额度。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const REDIRECTS = path.join(PUBLIC_DIR, '_redirects');
const COMMON_DIR = path.join(PUBLIC_DIR, 'common');

/* ---------- 解析 _redirects 的站点注册表 ---------- */
function parseRedirects() {
  const root = [];
  const map = {};          // domain -> dir
  let raw = '';
  try { raw = fs.readFileSync(REDIRECTS, 'utf8'); } catch (e) { return { root, map }; }
  const lines = raw.split('\n');
  for (const line of lines) {
    const s = line.trim();
    let m = s.match(/^#\s*SITE\s+(\S+)\s+(\S+)\s*$/);
    if (m) { map[m[1].toLowerCase()] = m[2]; continue; }
    m = s.match(/^#\s*SITE-DISABLED\s+(\S+)\s+(\S+)\s*$/);
    if (m) { continue; } // 下线站点：忽略
    m = s.match(/^#\s*ROOT\s+(\S+)\s*$/);
    if (m) { root.push(m[1].toLowerCase()); }
  }
  return { root, map };
}

/* ---------- 兜底：扫描含 config.json 的子站（当 _redirects 无 SITE 时用） ---------- */
function findSites(dir, sites) {
  sites = sites || [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return sites; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const full = path.join(dir, e.name);
    const cfgPath = path.join(full, 'config.json');
    if (fs.existsSync(cfgPath) && fs.statSync(cfgPath).isFile()) sites.push(full);
    findSites(full, sites);
  }
  sites.sort();
  return sites;
}

/* ---------- slug：详情页锚点（用于 ?tool=<slug> / article/<slug>） ---------- */
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* ---------- 生成单个 sitemap 文本 ---------- */
function buildSitemap(urls) {
  if (!urls.length) return ''; // 空地图不写文件（由调用方判断）
  const items = urls
    .map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.freq || 'weekly'}</changefreq>
    <priority>${u.prio || '0.8'}</priority>
  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${items}
</urlset>`;
}

/* §8.3 图片 sitemap 辅助：相对路径 -> 绝对 URL；已是 http(s)/协议相对则原样保留 */
function absUrl(img, domain) {
  const s = String(img || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return 'https:' + s;
  return 'https://' + domain + (s.startsWith('/') ? s : '/' + s);
}
/* 图片 sitemap：按 <loc> 聚合多图，符合 Google 图片地图格式（xmlns 仅为命名空间标识，不发请求） */
function buildImageSitemap(items) {
  if (!items.length) return '';
  const byLoc = new Map();
  for (const it of items) {
    if (!byLoc.has(it.loc)) byLoc.set(it.loc, []);
    byLoc.get(it.loc).push(it);
  }
  const body = [];
  for (const [loc, list] of byLoc) {
    const imgs = list.map((it) =>
      '    <image:image>\n' +
      '      <image:loc>' + escXml(it.img) + '</image:loc>\n' +
      (it.title ? '      <image:title>' + escXml(it.title) + '</image:title>\n' : '') +
      '    </image:image>'
    ).join('\n');
    body.push('  <url>\n    <loc>' + escXml(loc) + '</loc>\n' + imgs + '\n  </url>');
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    body.join('\n') + '\n</urlset>\n';
}
function escXml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function main() {
  const { root, map } = parseRedirects();

  // 读取全站配置（含 §8.2 topic.defs），仅在存在时生效
  let common = {};
  try { common = JSON.parse(fs.readFileSync(path.join(COMMON_DIR, 'config.json'), 'utf8')); } catch (e) { /* ignore */ }

  // 兜底：_redirects 没有 SITE 行时，扫描 config.json（兼容老用法）
  let sites = [];
  if (Object.keys(map).length === 0) {
    const dirs = findSites(PUBLIC_DIR);
    for (const d of dirs) {
      try {
        const cfg = JSON.parse(fs.readFileSync(path.join(d, 'config.json'), 'utf8'));
        if (cfg.domain) map[cfg.domain.replace(/\/+$/, '').toLowerCase()] = path.relative(PUBLIC_DIR, d).split(path.sep).join('/');
      } catch (e) { /* ignore */ }
    }
  }

  const domains = Object.keys(map).sort();
  if (!domains.length) {
    console.error('未在 _redirects 找到任何 # SITE 站点映射');
    process.exit(1);
  }

  const indexUrls = [];        // 总索引条目
  const routes = {};            // 供 Functions 使用的域名->目录映射

  for (const domain of domains) {
    const relDir = map[domain];
    const siteDir = path.join(PUBLIC_DIR, relDir);
    routes[domain] = relDir;

    // 读取工具数据
    let tools = [];
    let dataUpdated = '';
    const dataPath = path.join(siteDir, 'data', 'list.json');
    if (fs.existsSync(dataPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        tools = data.tools || [];
        dataUpdated = (data.updated || '').slice(0, 10);
      } catch (e) { console.warn('解析失败（跳过）:', dataPath, e.message); }
    }
    const baseDate = dataUpdated || new Date().toISOString().slice(0, 10);

    // (a) 列表页 sitemap：站点根 + 各工具外链
    const listUrls = [
      { loc: 'https://' + domain + '/', lastmod: baseDate, freq: 'daily', prio: '1.0' }
    ];
    for (const t of tools) {
      if (t && t.url) {
        listUrls.push({ loc: t.url, lastmod: (t.updated || baseDate).slice(0, 10), freq: 'weekly', prio: '0.7' });
      }
    }
    fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), buildSitemap(listUrls));
    console.log('✓', relDir + '/sitemap.xml', '| 工具', tools.length);

    // (b) 详情页 sitemap：域名/?tool=<slug>（分段抓取，避免单文件几万条超时）
    const detailUrls = [];
    for (const t of tools) {
      if (!t || !t.url) continue;
      const slug = slugify(t.name);
      detailUrls.push({
        loc: 'https://' + domain + '/?tool=' + encodeURIComponent(slug),
        lastmod: (t.updated || baseDate).slice(0, 10),
        freq: 'monthly',
        prio: '0.6'
      });
    }
    fs.writeFileSync(path.join(siteDir, 'sitemap-detail.xml'), buildSitemap(detailUrls));
    console.log('✓', relDir + '/sitemap-detail.xml', '| 详情', detailUrls.length);

    // 总索引登记（工具类）
    indexUrls.push({ loc: 'https://' + domain + '/sitemap.xml', lastmod: baseDate });
    indexUrls.push({ loc: 'https://' + domain + '/sitemap-detail.xml', lastmod: baseDate });

    // ★ (c) 资讯/教程栏目 sitemap：域名/article/<slug>
    //    仅当该子站存在 article/list.json 且含文章时才生成（无资讯站不污染索引）
    const articleDir = path.join(siteDir, 'article');
    const articlePath = path.join(articleDir, 'list.json');
    if (fs.existsSync(articlePath)) {
      let articles = [];
      let aUpdated = baseDate;
      try {
        const adata = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
        articles = adata.articles || [];
        aUpdated = (adata.updated || baseDate).slice(0, 10);
      } catch (e) { console.warn('资讯解析失败（跳过）:', articlePath, e.message); }
      const aUrls = [];
      for (const a of articles) {
        if (!a || !a.slug) continue;
        aUrls.push({
          loc: 'https://' + domain + '/article/' + encodeURIComponent(a.slug),
          lastmod: (a.updated || aUpdated).slice(0, 10),
          freq: 'monthly',
          prio: '0.7'
        });
      }
      if (aUrls.length) {
        if (!fs.existsSync(articleDir)) fs.mkdirSync(articleDir, { recursive: true });
        fs.writeFileSync(path.join(articleDir, 'sitemap.xml'), buildSitemap(aUrls));
        console.log('✓', relDir + '/article/sitemap.xml', '| 资讯', aUrls.length);
        indexUrls.push({ loc: 'https://' + domain + '/article/sitemap.xml', lastmod: aUpdated });
      } else {
        console.log('·', relDir + '/article 无文章，跳过 sitemap');
      }
    } else {
      console.log('·', relDir + ' 暂无 article/list.json，跳过资讯 sitemap');
    }

    // ★ (d) 专题聚合页 sitemap（§8.2）：config.topic.defs 的 slug -> 域名/topic/<slug>
    const topic = (common.topic) || {};
    if (topic.enabled && topic.defs && topic.defs.length) {
      const tUrls = topic.defs
        .filter((d) => d && d.slug)
        .map((d) => ({ loc: 'https://' + domain + '/topic/' + encodeURIComponent(d.slug), lastmod: baseDate, freq: 'monthly', prio: '0.6' }));
      if (tUrls.length) {
        const topicDir = path.join(siteDir, 'topic');
        if (!fs.existsSync(topicDir)) fs.mkdirSync(topicDir, { recursive: true });
        fs.writeFileSync(path.join(topicDir, 'sitemap.xml'), buildSitemap(tUrls));
        console.log('✓', relDir + '/topic/sitemap.xml', '| 专题', tUrls.length);
        indexUrls.push({ loc: 'https://' + domain + '/topic/sitemap.xml', lastmod: baseDate });
      }
    }

    // ★ (e) 图片 sitemap（§8.3）：工具/资讯预览图绝对 URL；无图站点不生成、不进索引
    const imgItems = [];
    for (const t of tools) {
      if (t && t.img && t.name) imgItems.push({ loc: 'https://' + domain + '/?tool=' + encodeURIComponent(slugify(t.name)), img: absUrl(t.img, domain), title: t.name });
    }
    const artPath = path.join(siteDir, 'article', 'list.json');
    if (fs.existsSync(artPath)) {
      try {
        const ad = JSON.parse(fs.readFileSync(artPath, 'utf8'));
        for (const a of (ad.articles || [])) {
          if (a && a.img && a.slug) imgItems.push({ loc: 'https://' + domain + '/article/' + encodeURIComponent(a.slug), img: absUrl(a.img, domain), title: a.title || '' });
        }
      } catch (e) { /* ignore */ }
    }
    if (imgItems.length) {
      fs.writeFileSync(path.join(siteDir, 'image-sitemap.xml'), buildImageSitemap(imgItems));
      console.log('✓', relDir + '/image-sitemap.xml', '| 图片', imgItems.length);
      indexUrls.push({ loc: 'https://' + domain + '/image-sitemap.xml', lastmod: baseDate });
    }
  }

  // 根总索引
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexUrls
  .map((u) => `  <sitemap>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </sitemap>`)
  .join('\n')}
</sitemapindex>`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-index.xml'), indexXml);
  console.log('✓ sitemap-index.xml | 子站', domains.length, '| 条目', indexUrls.length);

  // 自动域名映射 JSON（Functions 直接消费，新增站点零手动维护）
  if (!fs.existsSync(COMMON_DIR)) fs.mkdirSync(COMMON_DIR, { recursive: true });
  const domainMap = { root, map };
  fs.writeFileSync(path.join(COMMON_DIR, 'domain-map.json'), JSON.stringify(domainMap, null, 2));
  console.log('✓ common/domain-map.json | 映射', domains.length, '个域名');
}

main();
