/* ============================================================
 * public/common/affiliate.js —— CPS 分销前端组件
 * ------------------------------------------------------------
 * 职责：
 *   1) 工具卡片外链自动改用专属追踪链接（data/list.json 的 aff 字段，由 scripts/affiliate-links.js 生成）；
 *   2) 自动追加 subId 参数带上当前子域名 —— 200 个站共用一套联盟账号也能分清哪个站带来的转化；
 *   3) 统一 rel="sponsored nofollow noopener"（付费链接合规披露，百度/必应/Google 均认可）；
 *   4) 提供资讯详情页「相关工具（分销合作）」推荐位 —— 教程内文转化率最高的位置；
 *   5) 卡片上打「分销合作」标识，用户知情、平台合规，不做隐藏跳转。
 *
 * 用法（app.js / article.js 已接好）：
 *   await window.AFF.load();                       // 与其它数据并行加载，不额外拖慢首屏
 *   window.AFF.href(tool)                          // 取最终外链
 *   window.AFF.rel(tool)                           // 取 rel 属性值
 *   window.AFF.badge(tool)                         // 取「分销合作」标识 HTML（无分销时返回空串）
 *   window.AFF.boxHTML(tools)                      // 资讯页推荐位 HTML
 * ============================================================ */
(function () {
  'use strict';

  var CONFIG_URL = '/common/config.json';
  var _conf = null;      // affiliate 配置
  var _promise = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function load() {
    if (_promise) return _promise;
    _promise = fetch(CONFIG_URL, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { _conf = (j && j.affiliate) || { enabled: false }; return _conf; })
      .catch(function () { _conf = { enabled: false }; return _conf; });
    return _promise;
  }

  function enabled() { return !!(_conf && _conf.enabled !== false); }

  /* 追加 subId 归因参数（已有同名参数则不重复添加） */
  function withSubId(url) {
    var p = (_conf && _conf.subIdParam) || '';
    if (!p || !url) return url;
    if (new RegExp('[?&]' + p + '=', 'i').test(url)) return url;
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + encodeURIComponent(p) + '=' + encodeURIComponent(location.hostname);
  }

  /* 最终外链：有分销链接则用它（带 subId），否则用官网原链 */
  function href(tool) {
    if (!tool) return '#';
    if (enabled() && tool.aff) return withSubId(tool.aff);
    return tool.url || '#';
  }

  /* rel：分销链接必须 sponsored（付费链接披露）；普通外链 nofollow 防站群被判链接农场 */
  function rel(tool) {
    return (enabled() && tool && tool.aff) ? 'sponsored nofollow noopener' : 'nofollow noopener';
  }

  function isAff(tool) { return !!(enabled() && tool && tool.aff); }

  /* §4.4 一键复制分销短链：复制 affShort 或最终追踪链接（站外社群推广用） */
  function copyEnabled() { return !!(_conf && _conf.copyButton && _conf.copyButton.enabled); }
  function copyUrlOf(tool) {
    if (tool && tool.affShort) return tool.affShort;   // 优先用短链（§2.3）
    return href(tool);
  }
  function copyHTML(tool) {
    if (!copyEnabled()) return '';
    return '<button type="button" class="copy-btn" data-copy-url="' + esc(copyUrlOf(tool)) + '">复制推广链接</button>';
  }

  /* §4.1 免费试用引导浮层：高佣且 t.promo.type==='trial' 的工具（数据需 §2.2 aff-promo.js 填充；默认关） */
  function trialEnabled() { return !!(_conf && _conf.trial && _conf.trial.enabled); }
  function trialHTML(tool) {
    if (!trialEnabled()) return '';
    if (!tool || !tool.promo || tool.promo.type !== 'trial') return '';
    return '<button type="button" class="trial-btn" data-trial-url="' + esc(copyUrlOf(tool)) +
      '" data-trial-text="' + esc(tool.promo.text || '免费试用') + '">免费试用</button>';
  }

  /* §4.4/§4.1 事件委托：复制按钮 + 试用浮层（模块加载时绑定一次） */
  var _bound = false;
  function bindDelegates() {
    if (_bound) return; _bound = true;
    document.addEventListener('click', function (e) {
      var tEl = e.target.closest ? e.target.closest('[data-copy-url]') : null;
      if (tEl) {
        e.preventDefault();
        var url = tEl.getAttribute('data-copy-url') || '';
        copyToClipboard(url, tEl);
        return;
      }
      var trEl = e.target.closest ? e.target.closest('[data-trial-url]') : null;
      if (trEl) {
        e.preventDefault();
        openTrial(trEl.getAttribute('data-trial-url') || '', trEl.getAttribute('data-trial-text') || '免费试用');
      }
    });
  }
  function copyToClipboard(url, btn) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast(btn, '已复制'); }, function () { toast(btn, '复制失败'); });
      } else { toast(btn, '请手动复制'); }
    } catch (e) { toast(btn, '请手动复制'); }
  }
  function toast(btn, msg) {
    if (!btn) return;
    var old = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = old; }, 1500);
    try { localStorage.setItem('affCopyLog', String(Date.now())); } catch (e) { /* ignore */ }
  }
  function openTrial(url, text) {
    var d = document.getElementById('affTrialDialog');
    if (!d) {
      d = document.createElement('dialog');
      d.id = 'affTrialDialog';
      d.className = 'trial-dialog';
      document.body.appendChild(d);
    }
    d.innerHTML =
      '<div class="trial-card">' +
        '<button type="button" class="trial-close" aria-label="关闭" data-trial-x="1">×</button>' +
        '<h3>免费试用引导</h3>' +
        '<p class="trial-text">' + esc(text || '点击下方按钮复制试用链接，新用户通常可享限时免费试用。') + '</p>' +
        '<div class="trial-actions">' +
          '<button type="button" class="copy-btn" data-copy-url="' + esc(url) + '">复制试用链接</button>' +
        '</div>' +
        '<p class="trial-note">通过本链接注册可能为本站带来佣金，不影响你的价格。</p>' +
      '</div>';
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    d.addEventListener('click', function (ev) {
      if (ev.target === d || (ev.target.getAttribute && ev.target.getAttribute('data-trial-x') === '1')) {
        try { d.close(); } catch (e2) { d.removeAttribute('open'); }
      }
    });
  }

  /* 「分销合作」标识（合规披露，不做隐藏跳转） */
  function badge(tool) {
    if (!isAff(tool)) return '';
    var label = (_conf && _conf.label) || '分销合作';
    return '<span class="aff-badge" title="通过此链接注册或购买，本站可获得佣金，不影响你的价格">' + esc(label) + '</span>';
  }

  /* 资讯详情页推荐位：优先取带分销链接的工具，转化最高；§2.1 默认按佣金权重降序 */
  function sortByCommission() { return !(_conf && _conf.sortByCommission === false); }
  function pick(tools, count) {
    var list = (tools || []).filter(function (t) { return isAff(t); });
    if (sortByCommission()) {
      list = list.slice().sort(function (a, b) { return (Number(b.affCommission) || 0) - (Number(a.affCommission) || 0); });
    }
    if (list.length < count) {
      // 分销位不够时用普通工具补齐，保证版位不空
      (tools || []).forEach(function (t) { if (list.indexOf(t) < 0 && list.length < count) list.push(t); });
    }
    return list.slice(0, count);
  }

  function boxHTML(tools, opts) {
    var box = (_conf && _conf.articleBox) || {};
    if (box.enabled === false) return '';
    var n = (opts && opts.count) || box.count || 2;
    var list = pick(tools, n);
    if (!list.length) return '';
    var title = (opts && opts.title) || box.title || '本文相关工具';
    return '' +
      '<section class="aff-box" aria-label="' + esc(title) + '">' +
        '<h2 class="section-title">' + esc(title) + '</h2>' +
        '<div class="aff-list">' +
          list.map(function (t) {
            return '<div class="aff-item">' +
              '<a class="aff-link" href="' + esc(href(t)) + '" target="_blank" rel="' + rel(t) + '">' +
                '<span class="aff-name">' + esc(t.name) + badge(t) + '</span>' +
                '<span class="aff-desc">' + esc((t.desc || '').slice(0, 60)) + '</span>' +
                '<span class="aff-cta">前往了解 →</span>' +
              '</a>' +
              copyHTML(t) + trialHTML(t) +
            '</div>';
          }).join('') +
        '</div>' +
        '<p class="aff-note">说明：标注「' + esc((_conf && _conf.label) || '分销合作') + '」的链接为合作推广，' +
        '你通过它注册或购买不会多付费用，本站可获得少量佣金以维持服务器与内容更新。</p>' +
      '</section>';
  }

  window.AFF = {
    load: load,
    href: href,
    rel: rel,
    badge: badge,
    isAff: isAff,
    boxHTML: boxHTML,
    copyHTML: copyHTML,
    trialHTML: trialHTML,
    conf: function () { return _conf; }
  };

  // §4.4/§4.1 事件委托（复制按钮 + 试用浮层）模块加载即绑定一次
  if (typeof document !== 'undefined') bindDelegates();
})();
