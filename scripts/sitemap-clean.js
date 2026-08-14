/* ============================================================
 * scripts/sitemap-clean.js  ——  站点地图去重 / 清理失效 404 链接
 * ------------------------------------------------------------
 * 对应清单「七.2」：清理站点地图中已失效的内部链接（工具/资讯被删除后，
 * 其 ?tool=<slug> / /article/<slug> 会变成 404，仍留在地图里浪费爬虫抓取额度）。
 * 行为：遍历各站 sitemap-detail.xml 与 article/sitemap.xml，校验 <loc> 中的 slug
 *       是否仍存在于对应 data/list.json / article/list.json，不存在则剔除后重写。
 * 外部工具链接（tool.url）无法本地校验，保留。幂等。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, parseSites, readTools, readArticles, slugify } = require('./_sites');

function parseLocs(xml) {
  const locs = [];
  const re = /<loc>([\s\S]*?)<\/loc>/g; let m;
  while ((m = re.exec(xml))) locs.push(m[1]);
  return locs;
}
function writeLocs(file, locs) {
  const body = locs.map((l) => '  <url>\n    <loc>' + l + '</loc>\n  </url>').join('\n');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + '\n</urlset>';
  fs.writeFileSync(file, xml);
}

function main() {
  const sites = parseSites();
  let removed = 0;
  for (const s of sites) {
    const t = readTools(s.abs); const a = readArticles(s.abs);
    const toolSlugs = new Set((t ? t.tools : []).map((x) => slugify(x.name)));
    const artSlugs = new Set((a ? a.articles : []).map((x) => x.slug));

    // 详情页地图：?tool=<slug>
    const dFile = path.join(s.abs, 'sitemap-detail.xml');
    if (fs.existsSync(dFile)) {
      const locs = parseLocs(fs.readFileSync(dFile, 'utf8'));
      const keep = locs.filter((l) => {
        const m = l.match(/[?&]tool=([^&]+)/);
        if (!m) return true; // 非工具详情链接保留
        const slug = decodeURIComponent(m[1]);
        return toolSlugs.has(slug);
      });
      removed += locs.length - keep.length;
      if (keep.length !== locs.length) writeLocs(dFile, keep);
    }

    // 资讯地图：/article/<slug>
    const aFile = path.join(s.abs, 'article', 'sitemap.xml');
    if (fs.existsSync(aFile)) {
      const locs = parseLocs(fs.readFileSync(aFile, 'utf8'));
      const keep = locs.filter((l) => {
        const m = l.match(/\/article\/([^/?]+)/);
        if (!m) return true;
        return artSlugs.has(decodeURIComponent(m[1]));
      });
      removed += locs.length - keep.length;
      if (keep.length !== locs.length) writeLocs(aFile, keep);
    }
  }
  console.log('✓ 清理失效链接', removed, '条（已重写对应 sitemap）');
  if (removed) require('./build-sitemap');
}

main();
