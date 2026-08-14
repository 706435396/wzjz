/* ============================================================
 * 72tool 多子域名站群 - 资讯/教程栏目渲染逻辑 (article.js)
 * 核心职责（与 app.js 对称，仅针对「资讯」板块）：
 *   1) 识别当前访问域名（hostname）或 ?site= 强制指定 -> 映射子目录；
 *   2) 拉取 config.json（TDK + 资讯开关）与 article/list.json（资讯数据）；
 *   3) 列表态：按分类筛选 + 搜索，渲染资讯卡片（首屏懒加载）；
 *   4) 详情态：?slug=<slug> 或 _redirects 重写后的 /article/<slug> 打开单篇，
 *      渲染正文 HTML、注入 Article Schema、并互链同站相关工具（?tool=）；
 *   5) 工具站反向推荐：本文件导出的 getRelatedArticles() 供 app.js 调用，
 *      在工具详情页推荐配套教程，实现「工具 <-> 资讯」双向内链、权重互通。
 *
 * 说明：所有子域名共用这一个 /article.html（hostname 感知），无需逐站复制模板，
 *   扩到 200 站零额外前端维护；_redirects 已做 /article 与 /article/* 全局 200 重写。
 * ============================================================ */
(function () {
  'use strict';

  /* 域名 -> 子目录映射（与 app.js 保持一致；优先读 build-sitemap 生成的 domain-map.json） */
  var HOST_MAP = {
    'browseragent.72tool.com': '/agent/browser',
    'tiktokagent.72tool.com': '/agent/tiktok',
    'gpuagent.72tool.com': '/agent/localgpu',
    'txtclean.72tool.com': '/tools/txtclean',
    'sitemapgen.72tool.com': '/tools/sitemapgen',
    'es.72tool.com': '/lang/es',
    'de.72tool.com': '/lang/de'
  };

  var params = new URLSearchParams(location.search);
  var forced = params.get('site');
  var host = location.hostname;
  var base = forced
    ? '/' + forced.replace(/^\/+|\/+$/g, '')
    : (HOST_MAP[host] || '/');

  function slugify(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function loadJSON(p) {
    return fetch(p, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('加载失败 ' + p + ' (' + r.status + ')');
      return r.json();
    });
  }

  /* 应用差异化主题（与 app.js 对称，降模板站群特征） */
  function applyThemeStyle(cfg) {
    var th = (cfg.theme || {});
    if (th.brand) document.documentElement.style.setProperty('--brand', th.brand);
  }
  /* 正文图片自动补 alt（图片 SEO，对应清单「五.3」） */
  function addImgAlt(html, alt) {
    return String(html || '').replace(/<img([^>]*?)>/gi, function (m, attrs) {
      if (/alt\s*=/.test(attrs)) return m;
      return '<img' + attrs + ' alt="' + esc(alt || '') + '" loading="lazy">';
    });
  }

  /* 解析真实子目录：优先 ?site=，其次 hostname 查 HOST_MAP，再退化为读取 domain-map.json */
  async function resolveBase() {
    if (forced) return base;
    if (HOST_MAP[host]) return base;
    try {
      var j = await loadJSON('/common/domain-map.json');
      if (j && j.map && j.map[host]) return '/' + j.map[host];
    } catch (e) { /* ignore */ }
    return base;
  }

  /* ---------- 渲染：导航 / Hero / 分类 / 卡片 ---------- */
  function renderNav(cfg) {
    var lk = String(cfg.lang || 'zh-CN').split('-')[0];
    var labels = {
      zh: { tool: '工具', article: '教程资讯' },
      de: { tool: 'Werkzeuge', article: 'Anleitungen' },
      es: { tool: 'Herramientas', article: 'Tutoriales' }
    };
    var lab = labels[lk] || labels.zh;
    var links = [
      { t: lab.tool, h: '/' },
      { t: lab.article, h: '/article', active: true }
    ];
    document.getElementById('topnav').innerHTML = links.map(function (l) {
      return '<a href="' + esc(l.h) + '"' + (l.active ? ' class="active"' : '') + '>' + esc(l.t) + '</a>';
    }).join('');
    document.getElementById('brand').textContent = (cfg.domain || '72tool').split('.')[0];
  }

  function tutCard(a) {
    var tags = (a.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    return '' +
      '<article class="card tut-card" itemscope itemtype="https://schema.org/Article">' +
        '<h3 class="card-title">' +
          '<a itemprop="url" href="/article/' + esc(a.slug) + '">' + esc(a.title) + '</a>' +
        '</h3>' +
        '<p class="card-desc" itemprop="description">' + esc(a.summary || '') + '</p>' +
        '<div class="card-tags">' + tags + '</div>' +
        '<meta itemprop="headline" content="' + esc(a.title) + '">' +
        '<meta itemprop="dateModified" content="' + esc((a.updated || '').slice(0, 10)) + '">' +
      '</article>';
  }

  /* 懒加载（与 app.js 一致） */
  var CHUNK = 9;
  var _filtered = [], _rendered = 0, _io = null;
  function renderChunk() {
    var grid = document.getElementById('grid');
    var next = _filtered.slice(_rendered, _rendered + CHUNK);
    if (!next.length) { if (_io) _io.disconnect(); return; }
    grid.insertAdjacentHTML('beforeend', next.map(tutCard).join(''));
    _rendered += next.length;
    document.getElementById('empty').hidden = _filtered.length > 0;
  }
  function resetGrid(list) {
    _filtered = list; _rendered = 0;
    document.getElementById('grid').innerHTML = '';
    renderChunk();
    if (_io) _io.disconnect();
    var sentinel = document.getElementById('sentinel');
    if (sentinel && 'IntersectionObserver' in window) {
      _io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) renderChunk(); }, { rootMargin: '200px' });
      _io.observe(sentinel);
    }
  }
  function currentFilter() {
    var kw = (document.getElementById('searchInput') || {}).value || '';
    var active = document.querySelector('.chip.active');
    var cat = active ? active.dataset.c : '';
    return function (a) {
      var okCat = !cat || a.category === cat;
      var okKw = !kw || (a.title + ' ' + (a.summary || '') + ' ' + (a.tags || []).join(' ')).toLowerCase().indexOf(kw.toLowerCase()) >= 0;
      return okCat && okKw;
    };
  }

  /* ---------- 详情态渲染（?slug=） ---------- */
  /* §7.4 多语种本地化免责 footer（列表/详情共用） */
  function setFooter(cfg, gconf, countLabel) {
    var f = document.getElementById('footer');
    if (!f) return;
    var lk = String(cfg.lang || 'zh-CN').split('-')[0];
    var i18n = {
      zh: { privacy: '隐私政策' },
      de: { privacy: 'Datenschutz' },
      es: { privacy: 'Privacidad' }
    };
    var t = i18n[lk] || i18n.zh;
    var disc = '';
    var dl = (gconf && gconf.compliance && gconf.compliance.disclaimer) || {};
    if (dl.enabled !== false) {
      var txt = dl.byLang && dl.byLang[lk];
      if (txt) disc = '<span class="footer-disclaimer">' + esc(txt) + '</span>';
    }
    f.innerHTML =
      '<span>© ' + new Date().getFullYear() + ' ' + esc(cfg.domain || '72tool') + '</span>' +
      '<span>' + esc(countLabel || '') + '</span>' +
      '<span class="footer-links"><a href="/privacy" rel="nofollow noopener">' + esc(t.privacy) + '</a></span>' + disc;
  }

  async function renderDetail(cfg, data, slug, gconf) {
    var art = (data.articles || []).find(function (a) { return a.slug === slug; });
    if (!art) { location.href = '/article'; return; }
    document.getElementById('listHero').hidden = true;
    document.getElementById('catFilter').hidden = true;
    document.getElementById('grid').hidden = true;
    document.getElementById('sentinel').hidden = true;

    document.title = art.title + ' | ' + (cfg.name || '72tool');
    var metaDesc = document.querySelector('meta[name=description]');
    if (metaDesc) metaDesc.setAttribute('content', art.summary || '');
    var canonical = document.getElementById('canonical');
    if (canonical) canonical.setAttribute('href', location.origin + '/article/' + encodeURIComponent(slug));

    var d = document.getElementById('detail');
    d.hidden = false;
    document.getElementById('artTitle').textContent = art.title;
    document.getElementById('artMeta').innerHTML =
      '<span>' + esc(art.category || '教程') + '</span>' +
      '<span>' + esc((art.updated || '').slice(0, 10)) + '</span>' +
      (art.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    document.getElementById('artBody').innerHTML = (function () {
      var html = addImgAlt(art.body || '<p>' + esc(art.summary || '') + '</p>', art.title);
      // 正文中段自动插一处 article 广告位（不挤压首屏），initAds 会挂载它
      var mark = '</p>', cut = html.indexOf(mark);
      if (cut >= 0) {
        html = html.slice(0, cut + mark.length) +
          '<div class="ad-inline" data-ad="article" aria-label="广告位"></div>' +
          html.slice(cut + mark.length);
      }
      return html;
    })();

    // CPS 分销数据（详情页推荐位要用，提前加载一次）
    if (window.AFF) { try { await window.AFF.load(); } catch (e) {} }

    // 长尾问答 FAQ + meta keywords（longtail-keywords.js 生成，提升百度问答流量）
    if (art.longtail && art.longtail.length) {
      var box = document.getElementById('toolFaq') || (function () {
        var s = document.createElement('section'); s.id = 'toolFaq'; s.className = 'rel-articles';
        s.innerHTML = '<h2 class="section-title">相关问题</h2><ul class="faq-list">' +
          art.longtail.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
        document.getElementById('detail').appendChild(s); return s;
      })();
      var mk = document.querySelector('meta[name=keywords]');
      if (!mk) { mk = document.createElement('meta'); mk.name = 'keywords'; document.head.appendChild(mk); }
      mk.content = (mk.content || '') + ',' + art.longtail.join(',');
    }
    // 静态预制评论（无后端，见 comments.js）
    if (window.renderComments) window.renderComments(art.slug, art.title);

    // 相关工具互链：匹配 relatedTools 名称 -> 同站工具列表 ?tool=
    // 同时填充资讯详情页 CPS 分销推荐位（#affBox，conversions 最高的位置）
    var relBox = document.getElementById('relTools');
    var affBox = document.getElementById('affBox');
    var toolsCount = 0;
    try {
      var td = await loadJSON(base + '/data/list.json');
      var tools = (td && td.tools) || [];
      toolsCount = tools.length;
      var rel = (art.relatedTools && art.relatedTools.length)
        ? tools.filter(function (t) { return art.relatedTools.indexOf(t.name) >= 0; })
        : [];
      if (rel.length) {
        relBox.hidden = false;
        document.getElementById('relGrid').innerHTML = rel.map(function (t) {
          return '<article class="card" itemscope itemtype="https://schema.org/SoftwareApplication">' +
            '<h3 class="card-title"><a itemprop="url" href="/?tool=' + esc(slugify(t.name)) + '">' + esc(t.name) + '</a></h3>' +
            '<p class="card-desc" itemprop="description">' + esc(t.desc) + '</p></article>';
        }).join('');
      }
      // CPS 推荐位：优先用本文 relatedTools，否则取站内前 N 个工具兜底，保证有多个分销入口
      var recTools = rel.length ? rel : tools.slice(0, ((cfg.affiliate && cfg.affiliate.articleBox && cfg.affiliate.articleBox.count) || 2));
      if (affBox && window.AFF && recTools.length) {
        var abox = (cfg.affiliate && cfg.affiliate.articleBox) || {};
        affBox.innerHTML = window.AFF.boxHTML(recTools, { title: abox.title || '本文相关工具', count: abox.count });
      }
    } catch (e) { /* 工具数据缺失不影响文章 */ }

    // Article Schema
    document.getElementById('jsonld').textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: art.title, description: art.summary, dateModified: (art.updated || '').slice(0, 10),
      articleBody: (art.summary || ''), inLanguage: cfg.lang || 'zh-CN',
      mainEntityOfPage: location.origin + '/article/' + encodeURIComponent(slug)
    });
    // 广告 + 移动端增强（异步、不阻塞首屏）；详情页也需挂载正文中段 + 底部广告位；tools 供 §1.3 adblock 降级
    if (window.initAds) window.initAds(cfg, { tools: toolsCount, articles: 1 }, tools || []);
    if (window.initMobile) window.initMobile();
    setFooter(cfg, gconf, '本文相关工具 · 更新于 ' + esc((art.updated || '').slice(0, 10)));
    window.scrollTo({ top: 0 });
  }

  /* ---------- 供 app.js 调用：取与某工具相关的资讯（双向内链） ---------- */
  window.getRelatedArticles = function (toolName) {
    try {
      var data = JSON.parse(sessionStorage.getItem('__articles_' + base));
      if (!data) return [];
      return (data.articles || []).filter(function (a) {
        return (a.relatedTools && a.relatedTools.indexOf(toolName) >= 0) ||
               ((a.tags || []).some(function (t) { return toolName.toLowerCase().indexOf(t.toLowerCase()) >= 0; }));
      }).slice(0, 3);
    } catch (e) { return []; }
  };
  window.__articleBase = base;

  /* ---------- 主流程 ---------- */
  async function init() {
    var b = await resolveBase();
    base = b;
    window.__articleBase = base;
    var cfg = { domain: host, name: '72tool', title: '教程资讯', description: '垂直工具赛道教程', lang: 'zh-CN' };
    var data = { articles: [], updated: '' };
    try { cfg = Object.assign(cfg, await loadJSON(base + '/config.json')); } catch (e) {}
    try {
      data = await loadJSON(base + '/article/list.json');
      sessionStorage.setItem('__articles_' + base, JSON.stringify(data));
    } catch (e) { console.warn('article 数据缺失:', e); }
    // 全站合规配置（含 §7.4 多语种免责 byLang）
    var gconf = (window.Site && window.Site.globalConfig) ? await window.Site.globalConfig() : {};

    // 资讯开关：config.article.enabled === false 则整站隐藏资讯入口
    var enabled = !(cfg.article && cfg.article.enabled === false);
    if (!enabled) { document.getElementById('listHero').innerHTML = '<h1>本站点暂未开放资讯栏目</h1>'; return; }

    renderNav(cfg);
    applyThemeStyle(cfg); // 差异化主题
    if (window.Site && window.Site.applyTpl) window.Site.applyTpl(cfg); // §3.1 模板随机
    var articles = data.articles || [];

    var slug = params.get('slug');
    if (slug) { renderDetail(cfg, data, slug, gconf); return; }

    // 列表态
    document.getElementById('siteTitle').textContent = (cfg.name || '72tool') + ' · 教程资讯';
    document.getElementById('siteDesc').textContent = '垂直赛道教程、选型对比与避坑指南';
    var cats = [];
    articles.forEach(function (a) { if (a.category && cats.indexOf(a.category) < 0) cats.push(a.category); });
    document.getElementById('catFilter').innerHTML =
      '<button data-c="" class="chip active">全部</button>' +
      cats.map(function (c) { return '<button data-c="' + esc(c) + '" class="chip">' + esc(c) + '</button>'; }).join('');
    resetGrid(articles.filter(currentFilter()));
    setFooter(cfg, gconf, '共 ' + articles.length + ' 篇教程 · 更新于 ' + esc(data.updated || '-'));
    document.getElementById('jsonld').textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: cfg.name + ' 教程', url: location.origin + '/article', description: cfg.description
    });
    // 广告 + 移动端增强（异步、不阻塞首屏）
    if (window.initAds) window.initAds(cfg);
    if (window.initMobile) window.initMobile();
  }

  /* ---------- 交互绑定 ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('chip')) {
      document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      e.target.classList.add('active');
      resetGrid((JSON.parse(sessionStorage.getItem('__articles_' + base) || '{"articles":[]}')).articles.filter(currentFilter()));
    }
  });

  init();
})();
