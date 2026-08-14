/* ============================================================
 * public/common/mobile.js  ——  移动端体验增强（纯前端，localStorage）
 * ------------------------------------------------------------
 * 对应清单「五.2」：底部悬浮导航、一键收藏（本地存储）、一键复制工具链接，
 * 无第三方依赖、不阻塞首屏。由 app.js / article.js 在初始化后调用 initMobile()。
 * 收藏 key 按 hostname + 工具/文章名隔离，仅存本地，不涉及任何账号。
 * ============================================================ */
(function () {
  'use strict';
  function favKey() { return 'fav:' + location.hostname + ':' + (location.pathname + location.search); }

  function initMobile() {
    if (!('IntersectionObserver' in window)) return;
    // 底部悬浮导航（移动端显示，桌面端靠 CSS 隐藏）
    var bar = document.createElement('nav');
    bar.className = 'mobile-bar';
    bar.innerHTML =
      '<a href="/" aria-label="首页">🏠</a>' +
      '<a href="/article" aria-label="教程">📚</a>' +
      '<button id="mbFav" aria-label="收藏">☆</button>' +
      '<button id="mbCopy" aria-label="复制链接">🔗</button>' +
      '<a href="#top" aria-label="顶部">⬆️</a>';
    document.body.appendChild(bar);

    var fav = document.getElementById('mbFav');
    var copy = document.getElementById('mbCopy');
    if (localStorage.getItem(favKey())) fav.textContent = '★';
    fav.addEventListener('click', function () {
      if (localStorage.getItem(favKey())) { localStorage.removeItem(favKey()); fav.textContent = '☆'; }
      else { localStorage.setItem(favKey(), '1'); fav.textContent = '★'; }
    });
    copy.addEventListener('click', function () {
      var url = location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { copy.textContent = '✓'; setTimeout(function () { copy.textContent = '🔗'; }, 1500); });
      }
    });
  }
  window.initMobile = initMobile;
})();
