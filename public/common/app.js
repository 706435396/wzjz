/* ============================================================
   72tool 多子域名站群 - 公共前端渲染逻辑 (app.js)
   核心职责：
   1) 读取当前访问域名 window.location.hostname
   2) 映射到对应子目录（HOST_MAP），本地调试可用 ?site= 强制指定
   3) 拉取该子站的 config.json（TDK）与 data/list.json（工具数据）
   4) 渲染页面、分类筛选、站内搜索、暗色切换
   5) 注入 Schema.org 结构化数据；首屏懒加载（对应清单「四.1 懒加载」）
   6) 支持 ?tool=<slug> 深链：打开即定位并高亮对应工具卡片
   说明：Cloudflare Pages 给同一项目添加多个自定义域名，所有域名共用
        同一份构建；本文件是“子域名隔离为独立站点”的关键。
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 1. 域名 -> 子目录映射表（新增站点在此追加一行） ---------- */
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

  /* slug：与 build-sitemap.js 保持一致，用于 ?tool= 深链锚点 */
  function slugify(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  }

  /* ---------- 2. 深色 / 浅色模式 ---------- */
  function applyTheme() {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
  applyTheme();
  document.getElementById('themeToggle').addEventListener('click', function () {
    var isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

  /* ---------- 3. 工具函数 ---------- */
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

  /* ---------- 4. 渲染各区块 ---------- */
  function renderMeta(cfg) {
    document.title = cfg.title || cfg.name;
    document.documentElement.lang = cfg.lang || 'zh-CN';
    var metaDesc = document.querySelector('meta[name=description]');
    if (metaDesc) metaDesc.setAttribute('content', cfg.description || '');
    var canonical = document.getElementById('canonical');
    if (canonical) canonical.setAttribute('href', location.origin + '/');
  }
  function renderNav(cfg) {
    // 教程资讯入口：hostname 感知的 /article，全子域名共用一份 article.html
    // 导航顺序支持 config.theme.navOrder 差异化（降站群模板特征）
    var order = (cfg.theme && cfg.theme.navOrder) || ['首页', '教程资讯', 'Agent 集群', '工具集群'];
    var map = {
      '首页': '/', '教程资讯': '/article',
      'Agent 集群': 'https://browseragent.72tool.com/?site=agent/browser',
      '工具集群': 'https://txtclean.72tool.com/?site=tools/txtclean',
      '商家合作': '/cooperation', '开发者社群': '/community'
    };
    var links = order.map(function (t) { return { t: t, h: map[t] || '/' }; });
    document.getElementById('topnav').innerHTML = links.map(function (l) {
      return '<a href="' + esc(l.h) + '">' + esc(l.t) + '</a>';
    }).join('');
    document.getElementById('brand').textContent = (cfg.domain || '72tool').split('.')[0];
  }

  /* 应用差异化主题（品牌色 + 布局），批量消除模板站群特征 */
  function applyThemeStyle(cfg) {
    var th = (cfg.theme || {});
    if (th.brand) document.documentElement.style.setProperty('--brand', th.brand);
    var grid = document.getElementById('grid');
    if (grid && th.layout) grid.classList.add('layout-' + th.layout);
  }
  function renderHero(cfg) {
    document.getElementById('siteTitle').textContent = cfg.name || '工具导航';
    document.getElementById('siteDesc').textContent = cfg.description || '';
  }
  function renderCats(data) {
    var cats = [];
    data.tools.forEach(function (t) {
      if (t.category && cats.indexOf(t.category) < 0) cats.push(t.category);
    });
    var html = '<button data-c="" class="chip active">全部</button>';
    html += cats.map(function (c) {
      return '<button data-c="' + esc(c) + '" class="chip">' + esc(c) + '</button>';
    }).join('');
    document.getElementById('catFilter').innerHTML = html;
  }

  function cardHTML(t) {
    var tags = (t.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    var slug = slugify(t.name);
    // 图片 SEO：有预览图则懒加载并填充 alt（AI 关键词），无图则不渲染
    var img = t.img
      ? '<img class="card-img" src="' + esc(t.img) + '" alt="' + esc(t.alt || t.name) + '" loading="lazy" decoding="async">'
      : '';
    // 长尾词：隐藏 span 供搜索引擎收录（前端 longtail-keywords.js 生成）
    var lt = (t.longtail || []).map(function (w) { return esc(w); }).join(' ');
    var ltMeta = lt ? '<span class="longtail" hidden>' + lt + '</span>' : '';
    return '' +
      '<article class="card" id="tool-' + esc(slug) + '" itemscope itemtype="https://schema.org/SoftwareApplication">' +
        img +
        '<h3 class="card-title">' +
          // 分销链接：有 CPS 追踪则走专属链接并标「分销合作」，否则普通外链统一 nofollow
          // （站群大量 dofollow 外链易被百度判链接农场；AFF 由 affiliate.js 注入）
          '<a itemprop="url" href="' + esc(AFF.href(t)) + '" target="_blank" rel="' + esc(AFF.rel(t)) + '">' + esc(t.name) + '</a>' +
          AFF.badge(t) +
        '</h3>' +
        '<p class="card-desc" itemprop="description">' + esc(t.desc) + '</p>' +
        '<div class="card-tags">' + tags + '</div>' +
        ltMeta +
        '<meta itemprop="name" content="' + esc(t.name) + '">' +
        '<meta itemprop="applicationCategory" content="' + esc(t.category || '') + '">' +
        '<meta itemprop="operatingSystem" content="Web">' +
      '</article>';
  }

  /* ★ 付费置顶区块：data.tools 中 top=true 的工具独立展示（见 cooperation.html） */
  function renderTop(data) {
    var box = document.getElementById('topBlock'), grid = document.getElementById('topGrid');
    if (!box || !grid) return;
    var tops = (data.tools || []).filter(function (t) { return t.top; })
      .sort(function (a, b) { return (a.topRank || 99) - (b.topRank || 99); });
    if (!tops.length) { box.hidden = true; return; }
    box.hidden = false;
    grid.innerHTML = tops.map(cardHTML).join('');
  }

  /* ---------- 4.1 懒加载：首屏 12 个，滚动异步追加 ---------- */
  var CHUNK = 12;
  var _filtered = [];   // 当前筛选/搜索后的全量列表
  var _rendered = 0;    // 已渲染数量
  var _io = null;

  function renderChunk() {
    var grid = document.getElementById('grid');
    var next = _filtered.slice(_rendered, _rendered + CHUNK);
    if (!next.length) { if (_io) _io.disconnect(); return; }
    grid.insertAdjacentHTML('beforeend', next.map(cardHTML).join(''));
    _rendered += next.length;
    document.getElementById('empty').hidden = _filtered.length > 0;
  }

  function resetGrid(list) {
    _filtered = list;
    _rendered = 0;
    document.getElementById('grid').innerHTML = '';
    renderChunk();
    if (_io) _io.disconnect();
    var sentinel = document.getElementById('sentinel');
    if (sentinel && 'IntersectionObserver' in window) {
      _io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) renderChunk();
      }, { rootMargin: '200px' });
      _io.observe(sentinel);
    }
  }

  function currentFilter() {
    var kw = document.getElementById('searchInput').value;
    var active = document.querySelector('.chip.active');
    var cat = active ? active.dataset.c : '';
    return function (t) {
      var okCat = !cat || t.category === cat;
      var okKw = !kw || (t.name + ' ' + t.desc + ' ' + (t.tags || []).join(' ')).toLowerCase().indexOf(kw.toLowerCase()) >= 0;
      return okCat && okKw;
    };
  }

  function renderGrid(data) {
    resetGrid((data.tools || []).filter(currentFilter()));
  }

  function renderFooter(cfg, data, gconf) {
    // §7.4 多语种本地化免责：按子站 lang 渲染对应地区合规声明（FTC/GDPR 等），地区合规、零备案
    var disc = '';
    var dl = (gconf && gconf.compliance && gconf.compliance.disclaimer) || {};
    if (dl.enabled !== false) {
      var lk = String(cfg.lang || 'zh-CN').split('-')[0];
      var txt = dl.byLang && dl.byLang[lk];
      if (txt) disc = '<span class="footer-disclaimer">' + esc(txt) + '</span>';
    }
    document.getElementById('footer').innerHTML =
      '<span>© ' + new Date().getFullYear() + ' ' + esc(cfg.domain || '72tool') + '</span>' +
      '<span>共 ' + (data.tools || []).length + ' 个工具 · 更新于 ' + esc(data.updated || '-') + '</span>' +
      '<span class="footer-links"><a href="/privacy" rel="nofollow noopener">隐私政策</a></span>' + disc;
    // 私域导流统一入口（config.community 开关控制）
    var ce = document.getElementById('communityEntry');
    if (ce) {
      var com = cfg.community || { enabled: false };
      if (com.enabled) {
        // 社群导流：若填了站外 URL（Telegram/Discord 等）则 nofollow，纯站内 /community 保留
        var cExternal = com.url && /^https?:/i.test(com.url);
        var cRel = cExternal ? ' rel="nofollow noopener"' : '';
        var cHref = com.url || '/community';
        ce.innerHTML = '<a class="community-link" href="' + esc(cHref) + '"' + cRel + '>🤝 ' + esc(com.title || '加入开发者社群') + '</a>';
      } else {
        ce.innerHTML = '';
      }
    }
  }
  function renderJsonLd(cfg, data) {
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: cfg.name, url: location.origin + '/', description: cfg.description, inLanguage: cfg.lang || 'zh-CN'
    };
    if (cfg.keywords) ld.keywords = cfg.keywords;
    document.getElementById('jsonld').textContent = JSON.stringify(ld);
  }

  /* ---------- 资讯模块：最新教程条 + 工具相关教程双向内链 ---------- */
  function tutCardHTML(a) {
    var tags = (a.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    return '' +
      '<article class="card tut-card" itemscope itemtype="https://schema.org/Article">' +
        '<h3 class="card-title"><a itemprop="url" href="/article/' + esc(a.slug) + '">' + esc(a.title) + '</a></h3>' +
        '<p class="card-desc" itemprop="description">' + esc(a.summary || '') + '</p>' +
        '<div class="card-tags">' + tags + '</div>' +
      '</article>';
  }
  function renderTutorials(articles) {
    var box = document.getElementById('tutorials'), cont = document.getElementById('tutList');
    if (!box || !cont) return;
    var list = (articles || []).slice(0, 3);
    if (!list.length) { box.hidden = true; return; }
    cont.innerHTML = list.map(tutCardHTML).join('');
  }
  function renderRelatedArticles(toolName, articles) {
    var box = document.getElementById('relArticles'), cont = document.getElementById('relList');
    if (!box || !cont) return;
    var rel = (articles || []).filter(function (a) {
      return (a.relatedTools && a.relatedTools.indexOf(toolName) >= 0) ||
             ((a.tags || []).some(function (t) { return toolName.toLowerCase().indexOf(t.toLowerCase()) >= 0; }));
    }).slice(0, 3);
    if (!rel.length) { box.hidden = true; return; }
    box.hidden = false;
    cont.innerHTML = rel.map(tutCardHTML).join('');
  }

  /* ★ 长尾问答 FAQ：打开 ?tool= 时注入（longtail-keywords.js 生成），提升百度问答流量 */
  function renderToolFaq(tool) {
    var lt = tool.longtail || [];
    if (!lt.length) return;
    var box = document.getElementById('toolFaq');
    if (!box) {
      box = document.createElement('section');
      box.id = 'toolFaq'; box.className = 'rel-articles'; box.setAttribute('aria-label', '相关问题');
      var main = document.getElementById('main');
      main.insertBefore(box, main.querySelector('.site-footer') || null);
    }
    box.hidden = false;
    box.innerHTML = '<h2 class="section-title">相关问题</h2><ul class="faq-list">' +
      lt.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
    // 同步写入页面 meta keywords（长尾词）
    var mk = document.querySelector('meta[name=keywords]');
    if (!mk) { mk = document.createElement('meta'); mk.name = 'keywords'; document.head.appendChild(mk); }
    mk.content = (mk.content || '') + ',' + lt.join(',');
  }

  /* ---------- 5. 主流程 ---------- */
  var DEFAULT_CFG = {
    domain: host, name: '72tool', title: '72tool 工具导航',
    description: '精选在线工具与 AI 智能体导航', keywords: '工具,导航',
    category: '工具', lang: 'zh-CN', base: base
  };

  function init() {
    var cfg = Object.assign({}, DEFAULT_CFG);
    var data = { tools: [], updated: '' };
    var adata = { articles: [] };
    var p1 = loadJSON(base + '/config.json').then(function (c) { cfg = Object.assign(cfg, c); })
      .catch(function (e) { console.warn('config 缺失，使用默认:', e); });
    var p2 = loadJSON(base + '/data/list.json').then(function (d) { data = d && d.tools ? d : data; })
      .catch(function (e) { console.warn('data 缺失:', e); });
    // 资讯数据（教程资讯模块）：失败不阻断工具页渲染
    var p3 = loadJSON(base + '/article/list.json').then(function (a) { adata = a && a.articles ? a : adata; })
      .catch(function (e) { console.warn('article 数据缺失:', e); });
    // CPS 分销配置（affiliate.js 注入；失败不阻断工具页渲染）
    var p4 = (window.AFF ? window.AFF.load() : Promise.resolve());
    // 全站合规配置（含 §7.4 多语种免责 byLang）
    var p5 = (window.Site && window.Site.globalConfig) ? window.Site.globalConfig() : Promise.resolve({});

    Promise.all([p1, p2, p3, p4, p5]).then(function (r) {
      var gconf = (r && r[4]) || {};
      if (window.Site && window.Site.applyTpl) window.Site.applyTpl(cfg); // §3.1 模板随机（跨站不同，不闪动）
      window.__data = data;
      window.__articles = adata.articles || [];
      renderMeta(cfg); renderNav(cfg); applyThemeStyle(cfg); renderHero(cfg); renderCats(data);
      renderTop(data); renderGrid(data); renderFooter(cfg, data, gconf); renderJsonLd(cfg, data);
      renderTutorials(adata.articles || []); // 首页“最新教程”条
      // ?tool= 深链：定位并高亮，并推荐配套教程 + 注入长尾 FAQ
      var tk = params.get('tool');
      if (tk) {
        var el = document.getElementById('tool-' + slugify(decodeURIComponent(tk)));
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('hl'); }
        // 反查工具真实名称（data.tools 中匹配 slug）
        var hit = (data.tools || []).find(function (t) { return slugify(t.name) === slugify(decodeURIComponent(tk)); });
        renderRelatedArticles(hit ? hit.name : decodeURIComponent(tk), adata.articles || []);
        if (hit) renderToolFaq(hit); // 长尾问答 FAQ（提升百度问答流量）
      }
      // 广告 + 移动端增强（异步、不阻塞首屏）；传入 stats 供广告过审风控判断质量门槛；tools 供 §1.3 adblock 降级推荐
      if (window.initAds) window.initAds(cfg, { tools: (data.tools || []).length, articles: (adata.articles || []).length }, data.tools || []);
      if (window.initMobile) window.initMobile();
    });
  }

  /* ---------- 6. 交互绑定 ---------- */
  document.getElementById('catFilter').addEventListener('click', function (e) {
    if (e.target.classList.contains('chip')) {
      document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      e.target.classList.add('active');
      renderGrid(window.__data || { tools: [] });
    }
  });
  document.getElementById('searchInput').addEventListener('input', function () {
    renderGrid(window.__data || { tools: [] });
  });

  init();
})();
