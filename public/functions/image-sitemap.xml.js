/**
 * Cloudflare Pages Function：子域名统一 /image-sitemap.xml 路由转发（§8.3 图片地图）
 * ------------------------------------------------------------
 * 访问任意子域名 https://xxx.72tool.com/image-sitemap.xml，自动返回该子域名目录内
 *   <dir>/image-sitemap.xml（由 build-sitemap.js / scripts/image-sitemap.js 生成）。
 * 与 /sitemap.xml、/article/sitemap.xml 完全对称，读取 common/domain-map.json 做自动匹配。
 *
 * 仅当该子站确有图片（image-sites.json 记录）时才会有此文件；无图站点访问返回 404，
 *   与 robots.txt Function 的按需声明保持一致（不向站长平台声明 404 地图）。
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const map = await loadMap(env, request.url);

  // 根域名 -> 总索引（其 loc 已含各子站 image-sitemap.xml，爬虫一次抓全）
  if (map.root.includes(host)) {
    return serveAsset(env, request.url, '/sitemap-index.xml', 'index');
  }
  const dir = map.map[host];
  if (dir) {
    return serveAsset(env, request.url, `/${dir}/image-sitemap.xml`, 'image');
  }
  return new Response('站点不存在', { status: 404 });
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
  const fallback = { root: ['72tool.com', 'www.72tool.com'], map: fallbackMap };
  try {
    const r = await env.ASSETS.fetch(new URL('/common/domain-map.json', baseUrl));
    if (r.ok) {
      const j = await r.json();
      return { root: j.root || fallback.root, map: Object.assign({}, fallbackMap, j.map || {}) };
    }
  } catch (e) { /* 退化 */ }
  return fallback;
}

async function serveAsset(env, baseUrl, assetPath, kind) {
  const f = await env.ASSETS.fetch(new URL(assetPath, baseUrl));
  if (!f.ok) return new Response('图片 sitemap 尚未生成（该站点暂无图片）', { status: 404 });
  // 图片地图缓存 2h（与工具/资讯地图一致）
  const cc = kind === 'index' ? 'public, max-age=3600' : 'public, max-age=7200';
  return new Response(f.body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': cc }
  });
}
