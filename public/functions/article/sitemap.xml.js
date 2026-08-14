/**
 * Cloudflare Pages Function：子域名统一 /article/sitemap.xml 路由转发
 * ------------------------------------------------------------
 * 效果：访问任意子域名 https://xxx.72tool.com/article/sitemap.xml，
 *       自动返回该子域名目录内对应的 <dir>/article/sitemap.xml，
 *       站长平台只需提交「域名/article/sitemap.xml」，无需填写长路径。
 *
 * 与 functions/sitemap.xml.js 完全对称：工具地图走 /sitemap.xml，资讯地图走
 *   /article/sitemap.xml。两者都读取 build-sitemap.js 生成的 common/domain-map.json
 *   做「域名 -> 目录」自动匹配，新增站点零手动维护映射表。
 *
 * 匹配顺序：
 *   1) 自动映射 common/domain-map.json（build-sitemap.js 解析 _redirects 注册表生成）；
 *   2) 内置兜底 fallbackMap（防 JSON 缺失时仍能工作）；
 *   3) 根域名（domain-map.json.root）—— 返回根总索引 sitemap-index.xml
 *      （其 loc 已含各子站 /article/sitemap.xml，爬虫一次抓全 200 站资讯地图）。
 *
 * 说明：文件必须放在 public/functions/article/sitemap.xml.js，Cloudflare 按文件
 *   路径自动匹配路由 /article/sitemap.xml（functions 目录下二级目录同样生效）。
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const map = await loadMap(env, request.url);

  // 3) 根域名 -> 总索引（含全部子站资讯地图）
  if (map.root.includes(host)) {
    return serveAsset(env, request.url, '/sitemap-index.xml', 'index');
  }
  // 1/2) 子域名 -> 该目录的 article/sitemap.xml
  const dir = map.map[host];
  if (dir) {
    return serveAsset(env, request.url, `/${dir}/article/sitemap.xml`, 'article');
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
  if (!f.ok) return new Response('资讯 sitemap 尚未生成', { status: 404 });
  // 缓存分层：资讯地图 2h（与工具地图一致），总索引 1h
  const cc = kind === 'index' ? 'public, max-age=3600' : 'public, max-age=7200';
  return new Response(f.body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': cc }
  });
}
