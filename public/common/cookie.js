/* ============================================================
   72tool 多子域名站群 - Cookie 告知组件（cookie.js）
   轻量底部条（非弹窗），一键同意/拒绝，localStorage 记忆；不阻断内容。
   仅按 config.compliance.cookie.regions 在指定 region 显示（空数组=全站显示）。
   合规：GDPR/CCPA 要求 Cookie 告知；海外广告网络过审必备项。
   ============================================================ */
(function () {
  'use strict';

  var Site = window.Site || { base: '/', meta: function () { return Promise.resolve({}); }, globalConfig: function () { return Promise.resolve({}); } };
  var KEY = 'cookie-consent';
  var DAY_MS = 86400000;

  function normLang(l) {
    if (!l) return 'en';
    var s = String(l).toLowerCase();
    if (s.indexOf('zh') === 0) return 'zh';
    if (s.indexOf('es') === 0) return 'es';
    if (s.indexOf('de') === 0) return 'de';
    return 'en';
  }

  var TEXT = {
    en: { msg: 'We use minimal cookies for the cookie notice and to support privacy-first analytics & ads. See our ', policy: 'Privacy Policy', accept: 'Accept', reject: 'Reject' },
    zh: { msg: '我们使用极少量 Cookie 用于提示与隐私优先的统计/广告。查看', policy: '隐私政策', accept: '同意', reject: '拒绝' },
    es: { msg: 'Usamos el mínimo de cookies para el aviso y analítica/anuncios respetuosos con la privacidad. Ver ', policy: 'Política de Privacidad', accept: 'Aceptar', reject: 'Rechazar' },
    de: { msg: 'Wir verwenden minimale Cookies für den Hinweis sowie datenschutzfreundliche Analytik/Werbung. Siehe ', policy: 'Datenschutz', accept: 'Akzeptieren', reject: 'Ablehnen' }
  };

  function alreadyConsented(rememberDays) {
    try {
      var v = localStorage.getItem(KEY);
      if (!v) return false;
      var obj = JSON.parse(v);
      if (!obj || !obj.t) return false;
      if (rememberDays && (Date.now() - obj.t) > rememberDays * DAY_MS) return false;
      return true;
    } catch (e) { return false; }
  }

  function remember() {
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now() })); } catch (e) {}
  }

  function buildBar(lang, policyPath) {
    var t = TEXT[lang] || TEXT.en;
    var bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie notice');
    bar.innerHTML =
      '<div class="cookie-inner">' +
        '<p class="cookie-msg">' + esc(t.msg) + ' <a href="' + esc(policyPath) + '" rel="nofollow noopener">' + esc(t.policy) + '</a>.</p>' +
        '<div class="cookie-actions">' +
          '<button type="button" class="cookie-btn cookie-reject" data-act="reject">' + esc(t.reject) + '</button>' +
          '<button type="button" class="cookie-btn cookie-accept" data-act="accept">' + esc(t.accept) + '</button>' +
        '</div>' +
      '</div>';
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      remember();
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    });
    return bar;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function init() {
    if (alreadyConsented(180)) return; // 默认记忆 180 天
    Promise.all([Site.globalConfig(), Site.meta()]).then(function (res) {
      var g = res[0] || {};
      var cfg = res[1] || {};
      var cc = (g.compliance && g.compliance.cookie) || {};
      if (cc.enabled === false) return;            // 总开关关 → 不显示
      var regions = Array.isArray(cc.regions) ? cc.regions : [];
      var region = cfg.region || '';
      if (regions.length && regions.indexOf(region) < 0) return; // 不在指定 region → 不显示
      var rememberDays = cc.rememberDays || 180;
      if (alreadyConsented(rememberDays)) return;
      var lang = normLang(cfg.lang);
      var policyPath = (g.compliance && g.compliance.privacy && g.compliance.privacy.path) || '/privacy';
      var bar = buildBar(lang, policyPath);
      document.body.appendChild(bar);
    }).catch(function () { /* 任何异常都不阻断页面 */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
