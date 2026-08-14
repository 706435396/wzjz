/**
 * Cloudflare Pages Function：子域名统一 /sitemap-detail.xml 路由转发
 * ------------------------------------------------------------
 * 与 sitemap.xml.js 完全对称：访问 https://xxx.72tool.com/sitemap-detail.xml
 * 自动返回 <dir>/sitemap-detail.xml（工具详情内页地图，分段抓取用）。
 * 文件名 sitemap-detail.xml.js 对应路由 /sitemap-detail.xml（目录 functions 不可改）。
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const map = await loadMap(env, request.url);

  // 子域名 -> 该目录的 sitemap-detail.xml
  const dir = map.map[host];
  if (dir) {
    return serveAsset(env, request.url, `/${dir}/sitemap-detail.xml`);
  }
  // 根域名/未知域名 -> 根总索引（含各子站 sitemap-detail.xml 入口）
  return serveAsset(env, request.url, '/sitemap-index.xml');
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
      return { map: Object.assign({}, fallbackMap, j.map || {}) };
    }
  } catch (e) { /* 退化 */ }
  return { map: fallbackMap };
}

async function serveAsset(env, baseUrl, assetPath) {
  const f = await env.ASSETS.fetch(new URL(assetPath, baseUrl));
  if (!f.ok) return new Response('sitemap-detail 未生成', { status: 404 });
  return new Response(f.body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=7200' }
  });
}
