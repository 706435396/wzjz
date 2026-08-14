/**
 * Cloudflare Pages Function：子域名统一 /robots.txt 差异化返回
 * ------------------------------------------------------------
 * 效果：访问 https://xxx.72tool.com/robots.txt，按当前子域名返回对应赛道规则，
 *   引导爬虫只抓有效页面、跳过后台/分页/筛选/数据源 JSON，减少无效抓取额度。
 *
 * 规则（对应优化清单「一.2 分站点独立 robots.txt」）：
 *   - 允许抓取首页与工具详情页（/?tool=）
 *   - 禁止抓取 /common/ 组件、/data/ 数据源、任意 *.json、搜索筛选页（?q=）
 *   - 末尾给出该子站的 Sitemap 地址，方便站长平台一次性收录
 *
 * 文件名 robots.txt.js 对应路由 /robots.txt（目录 functions 不可改）。
 * 同样读取 common/domain-map.json，新增站点零手动维护。
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const map = await loadMap(env, request.url);
  const imgDomains = await loadImageSites(env, request.url); // §8.3 仅确有图片的站点声明 image-sitemap

  // 未知域名：返回空 robots（等同于全允许，但不暴露站点地图）
  if (!map.map[host] && !map.root.includes(host)) {
    return new Response('User-agent: *\nAllow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
    });
  }

  // 根域名：指向总索引
  if (map.root.includes(host)) {
    const body =
      'User-agent: *\n' +
      'Allow: /\n' +
      'Disallow: /common/\n' +
      'Disallow: /data/\n' +
      'Disallow: /*.json$\n' +
      'Sitemap: https://' + host + '/sitemap-index.xml\n';
    return new Response(body, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
    });
  }

  // 子域名：指向本子站的两份 sitemap（有图站点补 image-sitemap）
  const body =
    'User-agent: *\n' +
    'Allow: /\n' +
    'Allow: /?tool=\n' +
    'Disallow: /common/\n' +
    'Disallow: /data/\n' +
    'Disallow: /*.json$\n' +
    'Disallow: /*?*q=\n' +
    'Sitemap: https://' + host + '/sitemap.xml\n' +
    'Sitemap: https://' + host + '/sitemap-detail.xml\n' +
    'Sitemap: https://' + host + '/article/sitemap.xml\n' +
    (imgDomains.indexOf(host) >= 0 ? 'Sitemap: https://' + host + '/image-sitemap.xml\n' : '');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
}

/* §8.3 读取「有图站点清单」，避免向站长平台声明一个 404 的 image-sitemap */
async function loadImageSites(env, baseUrl) {
  try {
    const r = await env.ASSETS.fetch(new URL('/common/image-sites.json', baseUrl));
    if (r.ok) {
      const j = await r.json();
      return (j && j.domains) || [];
    }
  } catch (e) { /* 退化 */ }
  return [];
}

async function loadMap(env, baseUrl) {
  const fallbackMap = {
    'browseragent.72tool.com': 'agent/browser',
    'tiktokagent.72tool.com': 'agent/tiktok',
    'gpuagent.72tool.com': 'agent/localgpu',
    'txtclean.72tool.com': 'tools/txtclean',
    'sitemapgen.72tool.com': 'tools/sitemapgen',
    'es.72tool.com': 'lang/es',
    'de.72tool.com': 'lang/de'
  };
  try {
    const r = await env.ASSETS.fetch(new URL('/common/domain-map.json', baseUrl));
    if (r.ok) {
      const j = await r.json();
      return { root: j.root || ['72tool.com', 'www.72tool.com'], map: Object.assign({}, fallbackMap, j.map || {}) };
    }
  } catch (e) { /* 退化 */ }
  return { root: ['72tool.com', 'www.72tool.com'], map: fallbackMap };
}
