/**
 * Cloudflare Pages Function：子域名统一 /sitemap.xml 路由转发
 * ------------------------------------------------------------
 * 效果：访问任意子域名 https://xxx.72tool.com/sitemap.xml，
 *       自动返回该子域名目录内对应的 <dir>/sitemap.xml，
 *       站长平台只需提交「域名/sitemap.xml」，无需填写长路径。
 *
 * 匹配顺序：
 *   1) 自动映射 common/domain-map.json —— 由 build-sitemap.js 解析
 *      _redirects 的「# SITE」注册表自动生成，新增站点零手动维护；
 *   2) 内置兜底 fallbackMap —— 防止 domain-map.json 尚未生成时也能工作；
 *   3) 根域名（domain-map.json.root 中的域名）—— 返回根总索引 sitemap-index.xml。
 *
 * 说明：文件必须放在 functions/sitemap.xml.js，Cloudflare 按文件名
 *   自动匹配路由 /sitemap.xml（目录名 functions 不可改）。env.ASSETS 是 Pages
 *   默认的静态资源绑定，可读取 public/ 下任意文件。仅拦截 /sitemap.xml 一个路径。
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const map = await loadMap(env, request.url);

  // 3) 根域名 -> 总索引
  if (map.root.includes(host)) {
    return serveAsset(env, request.url, '/sitemap-index.xml', 'index');
  }
  // 1/2) 子域名 -> 该目录的 sitemap.xml
  const dir = map.map[host];
  if (dir) {
    return serveAsset(env, request.url, `/${dir}/sitemap.xml`, 'sitemap');
  }
  return new Response('站点不存在', { status: 404 });
}

/* ---------- 加载域名映射（自动 JSON 优先，失败退化为内置兜底） ---------- */
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

/* ---------- 读取静态文件并返回（带分层缓存头） ---------- */
async function serveAsset(env, baseUrl, assetPath, kind) {
  const f = await env.ASSETS.fetch(new URL(assetPath, baseUrl));
  if (!f.ok) return new Response('sitemap 未生成', { status: 404 });
  // 缓存分层：sitemap 2h，总索引 1h（对应优化清单「一.2 爬虫抓取节流」）
  const cc = kind === 'index' ? 'public, max-age=3600' : 'public, max-age=7200';
  return new Response(f.body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': cc }
  });
}
