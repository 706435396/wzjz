/* ============================================================
   72tool 多子域名站群 - 站点探测（site.js）
   供隐私页 / Cookie 提示等轻量公共组件复用，避免重复维护 HOST_MAP。
   注意：app.js 仍保留自己的内联 HOST_MAP（不改动现有逻辑），
        新增站点时请同步更新本文件的 HOST_MAP。
   ============================================================ */
(function () {
  'use strict';

  var HOST_MAP = {
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
  var base = forced
    ? '/' + forced.replace(/^\/+|\/+$/g, '')
    : (HOST_MAP[host] || '/');

  // 读取当前子站 config.json，返回 {lang, region, domain, ...}（失败时返回 {}）
  function meta() {
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
    base: base,
    meta: meta,
    globalConfig: globalConfig,
    applyTpl: applyTpl
  };
})();
