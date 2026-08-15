/* ============================================================
   72tool 多子域名站群 - 站点探测（site.js）
   供隐私页 / Cookie 提示等轻量公共组件复用。
   域名映射改为运行时动态读取 /common/domain-map.json（由 build-sitemap 生成），
   新增子站只需注册 _redirects，无需改本文件。
   ============================================================ */
(function () {
  'use strict';

  // 硬编码兜底（domain-map.json 加载失败时启用）
  var HARDCODED_MAP = {
    'browseragent.72tool.com': '/agent/browser',
    'tiktokagent.72tool.com': '/agent/tiktok',
    'gpuagent.72tool.com': '/agent/localgpu',
    'txtclean.72tool.com': '/tools/txtclean',
    'sitemapgen.72tool.com': '/tools/sitemapgen',
    'es.72tool.com': '/lang/es',
    'de.72tool.com': '/lang/de',
    'fr.72tool.com': '/lang/fr'
  };

  var params = new URLSearchParams(location.search);
  var forced = params.get('site');
  var host = location.hostname;
  var HOST_MAP = HARDCODED_MAP;
  var ROOTS = ['72tool.com', 'www.72tool.com'];

  function resolveBase(h) {
    if (HOST_MAP[h]) return HOST_MAP[h];
    if (ROOTS.indexOf(h) >= 0) return '/';
    return '/';
  }
  // 动态加载 domain-map.json，覆盖硬编码表（幂等，可重复调用）
  function loadHostMap() {
    return fetch('/common/domain-map.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (dm) {
        if (dm && dm.map) HOST_MAP = Object.assign({}, HARDCODED_MAP, dm.map);
        if (dm && dm.root && dm.root.length) ROOTS = dm.root;
      });
  }
  loadHostMap();

  // 读取当前子站 config.json，返回 {lang, region, domain, ...}（失败时返回 {}）
  // 每次调用按真实域名实时解析 base，避免缓存旧映射
  function meta() {
    var base = forced ? '/' + forced.replace(/^\/+|\/+$/g, '') : resolveBase(host);
    return fetch(base + '/config.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
  }

  // 读取全站变现/合规配置（/common/config.json）
  function globalConfig() {
    return fetch('/common/config.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
  }

  /* §3.1 模板随机渲染：按 子域名+当天 稳定哈希分到不同变体，
   * 跨站不同、同日同站一致（不闪动、SEO 友好），规避广告 AI 判批量站群。仅改排版细节。 */
  function applyTpl(cfg) {
    var v = (cfg && cfg.template && cfg.template.variants) || [];
    if (!v.length) return;
    var day = new Date().toISOString().slice(0, 10);
    var seed = host + '|' + day;
    var h = 0;
    for (var i = 0; i < seed.length; i++) { h = (h * 31 + seed.charCodeAt(i)) >>> 0; }
    document.documentElement.setAttribute('data-tpl', v[h % v.length]);
  }

  window.Site = {
    HOST_MAP: HOST_MAP,
    host: host,
    resolveBase: resolveBase,
    meta: meta,
    globalConfig: globalConfig,
    applyTpl: applyTpl,
    loadHostMap: loadHostMap
  };
})();
