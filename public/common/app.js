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

  /* slug：与 build-sitemap.js 保持一致（slice 60），用于 ?tool= 深链锚点 */
  function slugify(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
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
    // 多语言导航：config.theme.navOrder 支持字符串（中文站向后兼容）或对象 {key, label}
    var lk = String(cfg.lang || 'zh-CN').split('-')[0];
    var navMap = {
      home: { href: '/', labels: { zh: '首页', de: 'Startseite', es: 'Inicio' } },
      article: { href: '/article', labels: { zh: '教程资讯', de: 'Anleitungen', es: 'Tutoriales' } },
      agents: { href: 'https://browseragent.72tool.com/?site=agent/browser', labels: { zh: 'Agent 集群', de: 'Agent-Cluster', es: 'Agentes' } },
      tools: { href: 'https://txtclean.72tool.com/?site=tools/txtclean', labels: { zh: '工具集群', de: 'Werkzeug-Cluster', es: 'Herramientas' } },
      cooperation: { href: '/cooperation', labels: { zh: '商家合作', de: 'Kooperation', es: 'Cooperación' } },
      community: { href: '/community', labels: { zh: '开发者社群', de: 'Entwickler-Community', es: 'Comunidad' } }
    };
    var order = (cfg.theme && cfg.theme.navOrder) || ['首页', '教程资讯', 'Agent 集群', '工具集群'];
    var links = order.map(function (item) {
      var key = '', label = '';
      if (typeof item === 'string') {
        label = item;
        key = item;
        for (var k in navMap) { if (navMap[k].labels.zh === item) { key = k; break; } }
      } else if (item && typeof item === 'object') {
        key = String(item.key || '');
        label = String(item.label || '');
      }
      var m = navMap[key];
      var href = m ? m.href : '/';
      var display = label || (m && m.labels[lk]) || (m && m.labels.zh) || key;
      return { t: String(display || ''), h: href };
    });
    document.getElementById('topnav').innerHTML = links.map(function (l) {
      return '<a href="' + esc(l.h) + '">' + esc(l.t) + '</a>';
    }).join('');
    document.getElementById('brand').textContent = '72tool';
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
          // ★ 标题链接到站内详情页（?tool=slug），不再直接跳外链；外跳统一放在详情页「访问官网」按钮
          '<a itemprop="url" href="?tool=' + encodeURIComponent(slug) + '">' + esc(t.name) + '</a>' +
          AFF.badge(t) +
        '</h3>' +
        '<p class="card-desc" itemprop="description">' + esc(t.desc) + '</p>' +
        '<div class="card-tags">' + tags + '</div>' +
        ltMeta +
        // 直接外链入口（默认 nofollow，分销时 sponsored），与站内详情页并存
        '<a class="card-visit" href="' + esc(AFF.href(t)) + '" target="_blank" rel="' + esc(AFF.rel(t)) + '">访问官网 ↗</a>' +
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
    var lk = String(cfg.lang || 'zh-CN').split('-')[0];
    var i18n = {
      zh: { toolsCount: function (n) { return '共 ' + n + ' 个工具 · 更新于 '; }, privacy: '隐私政策' },
      de: { toolsCount: function (n) { return n + ' Werkzeuge · Aktualisiert am '; }, privacy: 'Datenschutz' },
      es: { toolsCount: function (n) { return n + ' herramientas · Actualizado el '; }, privacy: 'Privacidad' }
    };
    var t = i18n[lk] || i18n.zh;
    var disc = '';
    var dl = (gconf && gconf.compliance && gconf.compliance.disclaimer) || {};
    if (dl.enabled !== false) {
      var txt = dl.byLang && dl.byLang[lk];
      if (txt) disc = '<span class="footer-disclaimer">' + esc(txt) + '</span>';
    }
    document.getElementById('footer').innerHTML =
      '<span>© ' + new Date().getFullYear() + ' ' + esc(cfg.domain || '72tool') + '</span>' +
      '<span>' + t.toolsCount((data.tools || []).length) + esc(data.updated || '-') + '</span>' +
      '<span class="footer-links"><a href="/privacy" rel="nofollow noopener">' + esc(t.privacy) + '</a></span>' + disc;
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

  /* ---------- 4.2 工具详情视图：/tool=<slug> 展示站内详情，避免一点就跳外链 ---------- */
  // 无 usage 字段时，本地模板派生「使用步骤」（后续 AI 采集可填充 t.usage 覆盖）
  function detailUsageHTML(t) {
    var steps = [
      '打开下方「访问官网」进入 ' + (t.name || '') + ' 主页，完成注册或登录。',
      '在「' + (t.category || '工具') + '」分类下选择所需功能模块。',
      (t.tags && t.tags.length) ? ('参考标签【' + t.tags.join('、') + '】快速定位适用场景。') : '',
      '若遇到操作问题，可查看本页下方的「相关教程」。'
    ].filter(Boolean);
    return '<h2 class="section-title">使用步骤</h2><ol class="usage-list">' +
      steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
  }

  function hideListUI(hide) {
    ['topBlock', 'grid', 'tutorials', 'relArticles', 'catFilter', 'sentinel', 'empty'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = hide && id !== 'sentinel' && id !== 'empty';
    });
  }

  function renderDetail(tool, articles, cfg) {
    if (!tool) return;
    var slug = slugify(tool.name);
    // 视图切换：隐藏列表，显示详情（加 body class 避免列表闪现）
    document.body.classList.add('detail-mode');
    hideListUI(true);
    document.getElementById('detailName').textContent = tool.name;
    document.getElementById('detailCat').textContent = tool.category || '';
    document.getElementById('detailBadge').innerHTML = AFF.badge(tool);
    document.getElementById('detailDesc').textContent = tool.desc || '';
    document.getElementById('detailTags').innerHTML =
      (tool.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    document.getElementById('detailUsage').innerHTML = detailUsageHTML(tool);
    var v = document.getElementById('detailVisit');
    v.href = AFF.href(tool);
    v.rel = AFF.rel(tool);
    // Schema.org 结构化数据（详情级）
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.name, description: tool.desc,
      applicationCategory: tool.category, operatingSystem: 'Web',
      url: location.origin + '/?tool=' + encodeURIComponent(slug),
      inLanguage: cfg.lang || 'zh-CN'
    };
    if (tool.url) ld.sameAs = tool.url;
    document.getElementById('jsonld').textContent = JSON.stringify(ld);
    // 相关教程：按 relatedTools / tags 双向匹配（与 renderRelatedArticles 同源逻辑）
    var relBox = document.getElementById('detailRel'), relList = document.getElementById('detailRelList');
    var rel = (articles || []).filter(function (a) {
      return (a.relatedTools && a.relatedTools.indexOf(tool.name) >= 0) ||
        (a.tags || []).some(function (tg) { return tool.name.toLowerCase().indexOf(tg.toLowerCase()) >= 0; }) ||
        (a.tags || []).some(function (tg) { return (tool.tags || []).indexOf(tg) >= 0; });
    }).slice(0, 3);
    if (rel.length) { relBox.hidden = false; relList.innerHTML = rel.map(tutCardHTML).join(''); }
    else { relBox.hidden = true; }
    // TDK：标题与 canonical 指向详情 URL
    document.title = tool.name + ' - ' + (cfg.name || '72tool');
    var cano = document.getElementById('canonical');
    if (cano) cano.setAttribute('href', location.origin + '/?tool=' + encodeURIComponent(slug));
    var d = document.getElementById('toolDetail');
    d.hidden = false;
    window.scrollTo(0, 0);
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
      // ?tool= 深链：打开对应工具详情视图（/tool=<slug>），并在详情页内联相关教程
      var tk = params.get('tool');
      if (tk) {
        var hit = (data.tools || []).find(function (t) { return slugify(t.name) === slugify(decodeURIComponent(tk)); });
        if (hit) {
          renderDetail(hit, adata.articles || [], cfg);
        } else {
          // 未匹配到工具：回退到列表，并尝试按名称匹配相关教程
          renderRelatedArticles(decodeURIComponent(tk), adata.articles || []);
        }
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

  // 整张卡片点击进入详情页（?tool=slug），但「访问官网」按钮与已有链接除外
  document.getElementById('grid').addEventListener('click', function (e) {
    if (e.target.closest('.card-visit')) return;   // 让外链按钮正常工作
    if (e.target.closest('a')) return;            // 已有链接（标题/标签）自行处理
    var card = e.target.closest('.card');
    if (card && card.id && card.id.indexOf('tool-') === 0) {
      location.href = '?tool=' + encodeURIComponent(card.id.slice(5));
    }
  });

  init();
})();
