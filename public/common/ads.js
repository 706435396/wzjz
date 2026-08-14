/* ============================================================
 * public/common/ads.js —— 全站统一广告管理（海外联盟版，无需 ICP 备案）
 * ------------------------------------------------------------
 * 设计要点（对应变现方案「三.1 广告加载规则」）：
 *   1) 只接海外联盟：中文站 Adsterra、小语种站 Google AdSense；
 *      绝不加载百度联盟 / 百青藤 / 穿山甲 / 优量汇等需 ICP 备案的国内平台。
 *   2) 语种自动路由：读 /common/config.json 的 langProvider，按站点 cfg.lang 选广告商，
 *      站点 config.json 可用 ads.provider 单站覆盖。
 *   3) 全部广告 JS 均 async 异步注入，不阻塞首屏渲染（降低跳出率、不影响 LCP）。
 *   4) 三类广告位：sidebar（宽屏侧边固定，1 处）/ article（资讯内文，收益最高）/
 *      mobile（移动端底部轻量横幅，可一键关闭，无强制弹窗）。
 *   5) 风控过滤：低质站点（资讯太少/字数不足/命中灰词）自动**不展示广告**，
 *      避免被广告联盟判定低质站群导致拒审或封号（名单见 /common/ads-blocked.json）。
 *   6) 未配置 ID 时只渲染占位，不发起任何网络请求 —— 可以先部署、后补广告 ID。
 *
 * 说明：AdSense 是 Google 脚本，仅在 langProvider 指定为 adsense 的小语种站加载；
 *       中文站维持「零 Google 依赖」原则。统计走 Cloudflare Web Analytics（免备案、无 Cookie）。
 *
 * 用法：页面放 <div data-ad="sidebar|article|top"></div>，渲染完成后调用
 *       initAds(cfg, { tools: 12, articles: 5 });   // stats 用于风控门槛判定
 *       动态插入（如资讯正文中段）用 window.mountAd(el, 'article')。
 * ============================================================ */
(function () {
  'use strict';

  var GLOBAL_URL = '/common/config.json';    // 全站共用变现配置（200 站改一处生效）
  var BLOCK_URL = '/common/ads-blocked.json'; // 低质站点屏蔽名单（scripts/ads-audit.js 生成）

  var _globalsPromise = null;
  var _ctx = null; // 解析后的上下文：{ provider, providerConf, fallback, allowed }

  function getJSON(url) {
    return fetch(url, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* 全局配置 + 屏蔽名单只请求一次，多页面共享 */
  function loadGlobals() {
    if (!_globalsPromise) {
      _globalsPromise = Promise.all([getJSON(GLOBAL_URL), getJSON(BLOCK_URL)])
        .then(function (a) { return { g: a[0] || {}, block: a[1] || {} }; });
    }
    return _globalsPromise;
  }

  /* 协议相对地址归一化（联盟给的 src 常见 //xxx.com/... 形式） */
  function normSrc(s) {
    s = String(s || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || s.indexOf('//') === 0) return s;
    return '//' + s.replace(/^\/+/, '');
  }

  /* 占位提示（未配置 ID 时用，不发网络请求；线上留空更干净） */
  function placeholder(el, msg) {
    el.innerHTML = '<span class="ad-tip">' + msg + '</span>';
    return false;
  }

  /* §3.3 爬虫隔离：命中常见爬虫 UA → 仅真人访客展示广告（弱防 spoof，配合边缘层） */
  function isCrawler(g, cfg) {
    var conf = (g && g.crawlerIsolation) || {};
    if (conf.enabled === false) return false;
    var bots = Array.isArray(conf.bots) ? conf.bots : [];
    if (!bots.length) return false;
    var ua = (navigator.userAgent || '').toLowerCase();
    if (!ua) return false;
    return bots.some(function (b) { return ua.indexOf(String(b).toLowerCase()) >= 0; });
  }

  /* §1.2 分时广告开关：按配置时区取当前 HH:MM，比对 offHours 与 regionOverrides */
  function inOffHours(g, cfg) {
    var conf = (g && g.schedule) || {};
    if (conf.enabled === false) return false;
    var tz = conf.timezone || 'Asia/Shanghai';
    // 站点可带 region（cn/global）覆盖关闭时段
    var region = (cfg && cfg.region) || (cfg && cfg.ads && cfg.ads.region) || 'global';
    var ranges = ((conf.regionOverrides && conf.regionOverrides[region] && conf.regionOverrides[region].offHours) || conf.offHours) || [];
    var now;
    try {
      now = new Intl.DateTimeFormat('zh-CN', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
        .format(new Date());
    } catch (e) { now = new Date().toTimeString().slice(0, 5); }
    var cur = now.replace(':', ''); // "HHMM"
    function toMin(hhmm) { var p = String(hhmm).split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
    return ranges.some(function (r) {
      var s = toMin(r.start), e = toMin(r.end), m = toMin(cur);
      if (s <= e) return m >= s && m < e;        // 同日区间（如 00:00-07:00）
      return m >= s || m < e;                     // 跨午夜（如 22:00-06:00）
    });
  }

  /* §1.3 广告防屏蔽探针：同步创建被常见过滤规则命中的类，检查是否被隐藏 → 命中则降级工具推荐 */
  function detectAdblock() {
    try {
      var p = document.createElement('div');
      p.className = 'adsbox ad-banner ad-rectangle ad-test-probe';
      p.style.cssText = 'position:absolute;left:-9999px;top:-9999px;height:10px;width:10px;';
      (document.body || document.documentElement).appendChild(p);
      var blocked = (p.offsetHeight === 0 && p.offsetWidth === 0) ||
        (window.getComputedStyle && window.getComputedStyle(p).display === 'none');
      if (p.parentNode) p.parentNode.removeChild(p);
      return blocked;
    } catch (e) { return false; }
  }

  /* §1.3 降级：在广告容器渲染合规工具推荐（复用 affiliate.boxHTML，sponsored nofollow），不弹窗 */
  function renderAdblockFallback(el, tools, conf) {
    var txt = (conf && conf.fallbackText) || '为你精选好用的工具';
    var html = '';
    try {
      if (window.AFF && typeof window.AFF.boxHTML === 'function' && tools && tools.length) {
        html = window.AFF.boxHTML(tools, { count: 2, title: txt });
      }
    } catch (e) { html = ''; }
    if (!html) html = '<p class="ad-fallback">' + txt + '</p>';
    el.innerHTML = html;
    return true;
  }

  /* §4.3 骨架屏：返回占位元素（防 CLS 抖动） */
  function skeletonEl(height) {
    var s = document.createElement('div');
    s.className = 'ad-skeleton';
    s.style.minHeight = (height || 120) + 'px';
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  /* §4.5 广告一键关闭：检查当日是否已关闭；命中则移除容器 */
  function adClosedToday(slot, conf) {
    if (!conf || conf.enabled === false) return false;
    try {
      var raw = localStorage.getItem('adClosedV2:' + slot);
      if (!raw) return false;
      var ts = parseInt(raw, 10) || 0;
      var days = (conf.rememberDays || 1) * 86400000;
      return (Date.now() - ts) < days;
    } catch (e) { return false; }
  }
  function addCloseBtn(el, slot, conf) {
    if (!conf || conf.enabled === false) return;
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'ad-close ad-close-slot'; x.textContent = '×';
    x.setAttribute('aria-label', '关闭广告');
    x.addEventListener('click', function (ev) {
      ev.stopPropagation();
      try { localStorage.setItem('adClosedV2:' + slot, String(Date.now())); } catch (e) { /* ignore */ }
      el.remove();
      var sk = el.querySelector && el.querySelector('.ad-skeleton'); if (sk) sk.remove();
    });
    el.appendChild(x);
  }

  /* ---------- 广告商 1：Adsterra 原生横幅（推荐，async、无弹窗） ---------- */
  function mountAdsterraNative(el, conf) {
    if (!conf.key || !conf.invoke) return placeholder(el, '广告位未配置（Adsterra native）');
    var box = document.createElement('div');
    box.id = 'container-' + conf.key;   // Adsterra 原生代码要求的容器 ID
    el.appendChild(box);
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false'); // 避免被 Cloudflare Rocket Loader 改写
    s.src = normSrc(conf.invoke);
    el.appendChild(s);
    return true;
  }

  /* ---------- 广告商 1b：Adsterra iframe 横幅 ----------
   * 用沙箱 iframe + srcdoc 承载：
   *   - 避免多个广告位争抢同一个 atOptions 全局变量（官方代码的硬伤）；
   *   - 广告脚本运行在独立源，拿不到我们的 DOM/localStorage，安全性更好；
   *   - 若某广告单元在沙箱下不出广告，可在配置里加 "sandbox": false 放开。
   */
  function mountAdsterraBanner(el, conf) {
    if (!conf.key || !conf.invoke) return placeholder(el, '广告位未配置（Adsterra banner）');
    var w = conf.width || 320, h = conf.height || 50;
    var src = normSrc(conf.invoke) + '/' + conf.key + '/invoke.js';
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<style>html,body{margin:0;padding:0;overflow:hidden}</style></head><body>' +
      '<scr' + 'ipt>atOptions=' + JSON.stringify({ key: conf.key, format: 'iframe', height: h, width: w, params: {} }) + ';</scr' + 'ipt>' +
      '<scr' + 'ipt src="' + src + '"></scr' + 'ipt></body></html>';
    var f = document.createElement('iframe');
    f.width = String(w); f.height = String(h);
    f.setAttribute('scrolling', 'no');
    f.setAttribute('frameborder', '0');
    f.setAttribute('title', 'ad');
    f.loading = 'lazy';
    if (conf.sandbox !== false) {
      f.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms');
    }
    f.style.cssText = 'border:0;display:block;margin:0 auto;max-width:100%';
    f.srcdoc = html;
    el.appendChild(f);
    return true;
  }

  /* ---------- 广告商 2：Google AdSense（仅小语种海外站） ---------- */
  var _adsenseLoaded = false;
  function loadAdsenseLib(client) {
    if (_adsenseLoaded) return;
    _adsenseLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
    document.head.appendChild(s);
  }
  function mountAdsense(el, client, slotId) {
    if (!client || !slotId) return placeholder(el, 'AdSense not configured');
    loadAdsenseLib(client);
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', client);
    ins.setAttribute('data-ad-slot', String(slotId));
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    el.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* 忽略 */ }
    return true;
  }

  /* ---------- 填充兜底：主广告没出量时补 PopAds/RevenueHits（仅补空量） ---------- */
  function watchFill(el, fb) {
    if (!fb || !fb.enabled || !fb.src) return;
    if (fb.fill === false) return;  // §1.1 可关闭兜底
    setTimeout(function () {
      if (el.offsetHeight >= 30) return;           // 已成功填充，不动
      if (el.getAttribute('data-ad-fallback')) return;
      el.setAttribute('data-ad-fallback', fb.network || 'fallback');
      var s = document.createElement('script');
      s.async = true; s.src = normSrc(fb.src);
      el.appendChild(s);
    }, fb.delayMs || 4000);
  }

  /* ---------- Cloudflare Web Analytics（免备案 / 无 Cookie / 零 Google） ---------- */
  function mountCfAnalytics(token) {
    if (!token || window.__cfBeacon) return;
    window.__cfBeacon = true;
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: token }));
    document.head.appendChild(s);
  }

  /* ---------- 广告商与广告位解析 ---------- */
  function resolveProvider(g, cfg) {
    var siteAds = cfg.ads || {};
    if (siteAds.provider) return siteAds.provider;         // 站点级强制指定
    var lang = String(cfg.lang || 'zh-CN');
    var lp = g.langProvider || {};
    return lp[lang] || lp[lang.split('-')[0]] || lp.default || 'adsterra';
  }

  /* §1.4 AdSense 多账号隔离：按站点 lang / ads.adsenseAccount 解析到不同 client 账号，
   * 单账号违规不牵连全站群。向后兼容顶层单 client。 */
  function resolveAdsenseAccount(g, cfg, pConf) {
    var siteAds = cfg.ads || {};
    var accounts = (pConf && pConf.accounts) || [];
    if (siteAds.adsenseAccount) {
      var hit = accounts.filter(function (a) { return a.id === siteAds.adsenseAccount; })[0];
      if (hit) return hit;
    }
    if (!accounts.length) {
      if (pConf && pConf.client) return { client: pConf.client, slots: (pConf.slots || {}) };
      return null; // 未配置任何账号 → 不展示
    }
    var lang = String(cfg.lang || '').split('-')[0];
    var host = location.hostname;
    var byLang = accounts.filter(function (a) { return (a.sites || []).indexOf(lang) >= 0; })[0];
    if (byLang) return byLang;
    var byHost = accounts.filter(function (a) {
      return (a.sites || []).some(function (s) { return host.indexOf(s) >= 0; });
    })[0];
    if (byHost) return byHost;
    return accounts[0]; // 默认取首个，单账号违规不牵连（已是该账号）
  }

  /* 站点 config.json 的 ads.slots 可覆盖全局同名广告位（便于个别站单独换单元） */
  function slotConfig(providerName, gProv, siteAds, slot) {
    var gSlot = (gProv.slots || {})[slot];
    var sSlot = ((siteAds || {}).slots || {})[slot];
    if (providerName === 'adsense') {
      return { slotId: (sSlot || gSlot || '') };
    }
    var base = (gSlot && typeof gSlot === 'object') ? gSlot : {};
    var over = (sSlot && typeof sSlot === 'object') ? sSlot : (sSlot ? { key: sSlot } : {});
    var out = {};
    Object.keys(base).forEach(function (k) { if (k.charAt(0) !== '_') out[k] = base[k]; });
    Object.keys(over).forEach(function (k) { if (over[k] !== '' && over[k] != null) out[k] = over[k]; });
    return out;
  }

  /* ---------- 风控：判断本站是否允许展示广告 ---------- */
  function isAllowed(g, block, cfg, stats) {
    var host = location.hostname;
    // ① 人工/自检屏蔽名单（scripts/ads-audit.js 生成）
    var hosts = (block && block.hosts) || [];
    if (hosts.indexOf(host) >= 0) {
      console.info('[ads] 本站在低质屏蔽名单中，已停止展示广告以保护广告账户:', host);
      return false;
    }
    // ② 站点开关
    if (cfg.ads && cfg.ads.enabled === false) return false;
    // ③ 运行时数量门槛（纯工具链接堆砌、无教程资讯的站不挂广告）
    var q = g.quality || {};
    if (q.enforce && stats) {
      if (typeof stats.tools === 'number' && stats.tools < (q.minTools || 0)) {
        console.info('[ads] 工具数不足门槛，暂不展示广告：', stats.tools, '<', q.minTools);
        return false;
      }
      if (typeof stats.articles === 'number' && stats.articles < (q.minArticles || 0)) {
        console.info('[ads] 资讯篇数不足门槛，暂不展示广告：', stats.articles, '<', q.minArticles);
        return false;
      }
    }
    return true;
  }

  /* ---------- 单个广告位挂载（供动态注入调用） ---------- */
  /* §3.2 广告密度控制：内文/全页超出上限自动移除多余位，防联盟判广告堆砌 */
  function densityOver(slot) {
    var d = _ctx.densityConf;
    if (!d || !d.enabled) return false;
    if (slot === 'article' && _ctx.density.article >= (d.maxPerArticle || 2)) return true;
    if (_ctx.density.total >= (d.maxPerPage || 99)) return true;
    return false;
  }

  function mountAd(el, slot) {
    if (!el || !_ctx || !_ctx.allowed) return false;
    if (el.getAttribute('data-ad-done') === '1') return false;
    if (densityOver(slot)) { el.remove(); return false; }   // §3.2 超密度直接移除

    // §4.5 一键关闭：当日已关闭则该位直接移除（仅隐藏本类广告，不影响其他位）
    if (adClosedToday(slot, _ctx.adCloseConf)) { el.remove(); return false; }

    el.setAttribute('data-ad-done', '1');
    el.className = (el.className ? el.className + ' ' : '') + 'ad-slot ad-' + slot;
    el.innerHTML = '';

    // §4.3 骨架屏：渲染广告前先注入同尺寸占位（防 CLS 抖动），广告填充后由超时移除
    var skel = null;
    if (_ctx.skeletonConf && _ctx.skeletonConf.enabled !== false) {
      var sh = (_ctx.skeletonConf.heights && _ctx.skeletonConf.heights[slot]) ||
        (_ctx.skeletonConf.heights && _ctx.skeletonConf.heights.default) || 120;
      skel = skeletonEl(sh);
      el.appendChild(skel);
    }

    // §1.3 广告防屏蔽降级：adblock 命中 → 在容器渲染合规工具推荐，不请求广告、不弹窗
    if (_ctx.adblocked && _ctx.adblockConf && _ctx.adblockConf.enabled !== false) {
      el.className = el.className + ' ad-fallback-slot';
      renderAdblockFallback(el, _ctx.tools, _ctx.adblockConf);
      addCloseBtn(el, slot, _ctx.adCloseConf);
      if (slot === 'article') _ctx.density.article++;
      _ctx.density.total++;
      return true;
    }

    var conf = slotConfig(_ctx.provider, _ctx.providerConf, _ctx.siteAds, slot);
    var ok = false;
    if (_ctx.provider === 'adsense') {
      ok = mountAdsense(el, _ctx.providerConf.client, conf.slotId);
    } else {
      var type = conf.type || 'native';
      if (type === 'off') { el.remove(); return false; }
      ok = (type === 'banner') ? mountAdsterraBanner(el, conf) : mountAdsterraNative(el, conf);
    }
    if (ok) {
      // 广告合规标识（部分联盟要求可识别广告位；也降低用户误点投诉）
      var tag = document.createElement('span');
      tag.className = 'ad-label';
      tag.textContent = _ctx.adLabel;
      el.insertBefore(tag, el.firstChild);
      watchFill(el, _ctx.fallback);
      // §4.3 广告填充后移除骨架占位（兜底：超时移除，避免一直闪）
      if (skel) { setTimeout(function () { if (skel.parentNode) skel.parentNode.removeChild(skel); }, 2600); }
      // §4.5 可关闭按钮
      addCloseBtn(el, slot, _ctx.adCloseConf);
      // 计数（用于下一位密度判断）
      if (slot === 'article') _ctx.density.article++;
      _ctx.density.total++;
    } else if (skel && skel.parentNode) {
      skel.parentNode.removeChild(skel); // 未成功挂载（占位）则清掉骨架
    }
    return ok;
  }

  /* 移动端底部轻量横幅：自动创建容器 + 一键关闭（无强制弹窗，记忆用户选择） */
  function ensureMobileSlot() {
    if (window.innerWidth > 600) return null;
    try { if (localStorage.getItem('adMobileClosed') === '1') return null; } catch (e) { /* 隐私模式 */ }
    var exist = document.querySelector('[data-ad="mobile"]');
    if (exist) return exist;
    var box = document.createElement('div');
    box.className = 'ad-mobile-fixed';
    box.setAttribute('data-ad', 'mobile');
    box.setAttribute('aria-label', 'ad');
    document.body.appendChild(box);
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'ad-close'; x.textContent = '×';
    x.setAttribute('aria-label', '关闭广告');
    x.addEventListener('click', function () {
      try { localStorage.setItem('adMobileClosed', '1'); } catch (e) { /* ignore */ }
      box.remove();
      document.body.classList.remove('has-mobile-ad');
    });
    box.appendChild(x);
    document.body.classList.add('has-mobile-ad'); // 给底部导航栏让位，避免遮挡
    return box;
  }

  /* §3.5 边缘 IP 风控（前端弱兜底）：拉 /api/ads-guard（读 Cloudflare threat_score），
   * 命中高威胁分 / 已知坏 UA 则本页不展示广告；Function 不存在/失败 → 放行（不误伤真人）。 */
  function fetchIpRisk(g) {
    var cfg = g.ipRisk || {};
    if (!cfg.enabled) return Promise.resolve(false);
    try {
      var ua = (navigator.userAgent || '').toLowerCase();
      var bl = Array.isArray(cfg.blocklist) ? cfg.blocklist : [];
      if (bl.some(function (p) { return ua.indexOf(String(p).toLowerCase()) >= 0; })) {
        return Promise.resolve(true);
      }
    } catch (e) { /* ignore */ }
    try { var c = sessionStorage.getItem('ads-iprisk'); if (c) return Promise.resolve(c === '1'); } catch (e) { /* ignore */ }
    return fetch('/api/ads-guard', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var blocked = !!(j && j.blocked);
        try { sessionStorage.setItem('ads-iprisk', blocked ? '1' : '0'); } catch (e) { /* ignore */ }
        return blocked;
      })
      .catch(function () { return false; }); // Function 缺失/网络错 → 放行
  }

  /* ---------- 入口 ---------- */
  function initAds(cfg, stats, tools) {
    cfg = cfg || {};
    return loadGlobals().then(function (o) {
      var g = o.g, block = o.block;

      // 统计（与广告解耦：即使广告被风控屏蔽，统计照常）
      mountCfAnalytics((g.analytics || {}).cfBeaconToken);

      var allowed = isAllowed(g, block, cfg, stats);

      // §3.3 爬虫隔离：命中常见爬虫 UA → 不注入任何广告脚本（仅真人访客展示，减少无效曝光）
      if (allowed && isCrawler(g, cfg)) {
        console.info('[ads] 命中爬虫 UA，暂停广告注入（仅真人访客展示）');
        allowed = false;
      }
      // §1.2 分时开关：命中关闭时段（本地时区比对）→ 不展示、不发请求
      if (allowed && inOffHours(g, cfg)) {
        console.info('[ads] 命中分时关闭时段，暂停广告展示');
        allowed = false;
      }

      var provider = resolveProvider(g, cfg);
      var providerConf = ((g.providers || {})[provider]) || {};
      // §1.4 AdSense 多账号隔离：按站点解析到具体 client 账号
      if (provider === 'adsense') {
        var acc = resolveAdsenseAccount(g, cfg, providerConf);
        if (acc) providerConf = acc;
      }
      // 全局 enabled=false 时视为未开通（只渲染占位，不发请求）
      var providerOn = providerConf.enabled !== false;

      // §3.5 边缘 IP 风控：高威胁分/坏 UA → 本页不展示广告（防恶意点击封号）
      return fetchIpRisk(g).then(function (ipBlocked) {
        if (ipBlocked) {
          console.info('[ads] 命中 IP 风控，本页暂停展示广告');
          allowed = false;
        }

        var adblocked = detectAdblock();   // §1.3 探针（同步；adblock 命中则在容器内降级工具推荐）
        _ctx = {
          provider: provider,
          providerConf: providerConf,
          siteAds: cfg.ads || {},
          fallback: (g.providers || {}).fallback,
          allowed: allowed && providerOn,
          adLabel: provider === 'adsense' ? 'Ad' : '广告',
          densityConf: g.adDensity || {},          // §3.2
          density: { article: 0, total: 0 },
          mobileConf: g.mobileAd || {},             // §4.2
          adblockConf: g.adblock || {},             // §1.3
          adblocked: adblocked,
          skeletonConf: g.skeleton || {},           // §4.3
          adCloseConf: g.adClose || {},             // §4.5
          tools: tools || (stats && stats.tools) || []   // §1.3 降级推荐用的工具列表
        };

        if (!allowed) {
          // 风控不通过：直接移除页面上的广告容器，避免空位影响观感
          document.querySelectorAll('[data-ad]').forEach(function (el) { el.remove(); });
          return false;
        }
        if (!providerOn) {
          document.querySelectorAll('[data-ad]').forEach(function (el) {
            el.className = 'ad-slot ad-' + el.getAttribute('data-ad');
            placeholder(el, '广告位（' + provider + ' 未开通）');
          });
          return false;
        }

        // §4.2 移动端限流：窄屏仅保留底部横幅，移除侧边/内文位
        var mobileLimit = _ctx.mobileConf.limitToBottom &&
          window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

        // 静态广告位
        document.querySelectorAll('[data-ad]').forEach(function (el) {
          var slot = el.getAttribute('data-ad');
          if (mobileLimit && slot !== 'mobile') { el.remove(); return; }
          mountAd(el, slot);
        });
        // 移动端底部横幅（动态创建）
        var mb = ensureMobileSlot();
        if (mb) mountAd(mb, 'mobile');
        return true;
      });
    }).catch(function (e) {
      console.warn('[ads] 初始化失败（不影响页面功能）:', e);
      return false;
    });
  }

  window.initAds = initAds;
  window.mountAd = mountAd;
  window.__adsReady = function () { return !!(_ctx && _ctx.allowed); };
})();
