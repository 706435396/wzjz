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

  /* ---------- 1. 域名 -> 子目录映射（硬编码兜底 + 运行时动态读取 domain-map.json） ----------
   * 优先级：domain-map.json（由 build-sitemap 自动从 _redirects 生成） > 以下硬编码兜底。
   * 这样新增子站只需在 _redirects 加一行 # SITE 并跑 build-sitemap，
   * 无需改本文件、无需升 ?v= 版本号、无需清缓存。 */
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
  var ROOTS = ['72tool.com', 'www.72tool.com'];
  var HOST_MAP = HARDCODED_MAP;
  var host = location.hostname;
  var base = '/';

  // 运行时加载 domain-map.json（含全部子站 域名 -> 子目录），覆盖硬编码表；失败则回退硬编码
  function resolveBase(h) {
    if (HOST_MAP[h]) return HOST_MAP[h];
    if (ROOTS.indexOf(h) >= 0) return '/';
    return '/';
  }
  // 拼接子站资源路径：base='/' 时避免拼出 '//config.json'（协议相对地址）
  function sitePath(sub) { return (base === '/' ? '' : base) + sub; }
  function loadHostMap() {
    return loadJSON('/common/domain-map.json')
      .then(function (dm) {
        if (dm && dm.map) HOST_MAP = Object.assign({}, HARDCODED_MAP, dm.map);
        if (dm && dm.root && dm.root.length) ROOTS = dm.root;
      })
      .catch(function (e) { console.warn('domain-map 加载失败，用硬编码兜底:', e); })
      .then(function () { base = resolveBase(host); });
  }

  var params = new URLSearchParams(location.search);
  var forced = params.get('site');

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
    var si = document.getElementById('searchInput');
    if (si) si.setAttribute('placeholder', uiText(cfg, 'searchPlaceholder'));
    var empty = document.getElementById('empty');
    if (empty) empty.textContent = uiText(cfg, 'emptyResult');
  }

  /* ---------- 多语言 UI 文案 ---------- */
  var DEFAULT_UI = {
    searchPlaceholder: '搜索本站点工具…',
    emptyResult: '没有匹配的工具，换个关键词试试。',
    backToList: '← 返回工具列表',
    detailInfoTitle: '基础信息',
    detailUsageTitle: '使用步骤',
    detailProsTitle: '✅ 优点',
    detailConsTitle: '⚠️ 注意事项',
    detailVisitBtn: '访问官网 ↗',
    detailRelTutorials: '相关教程',
    detailRelTools: '相似相关工具推荐',
    detailFaqTitle: '相关问题',
    detailCardBtn: '查看详情 →',
    latestTutorials: '最新教程',
    readTimePrefix: '⏱ 阅读',
    readTimeSuffix: '分钟',
    copyCode: '复制',
    copyCodeDone: '已复制',
    copyCodeFail: '复制失败',
    copyPromo: '复制推广链接',
    freeTrial: '免费试用',
    allTools: '全部',
    openSource: '开源 / 闭源',
    openSourceValue: '开源',
    closedSourceValue: '闭源',
    pricing: '价格',
    pricingFree: '免费',
    pricingFreemium: '免费 + 付费版',
    pricingPaid: '付费',
    platforms: '支持平台',
    license: '许可证',
    updated: '更新时间',
    footerToolsCount: '共 {{n}} 个工具 · 更新于 ',
    privacy: '隐私政策',
    promoBadge: '分销合作',
    communityTitle: '加入开发者社群',
    usageTipLabel: '💡 小白提示：',
    usageCheckLabel: '✅ 验证是否成功：',
    breadcrumbHome: '首页',
    breadcrumbAgents: 'Agent 集群',
    breadcrumbTools: '工具集群'
  };
  function uiText(cfg, key, vars) {
    var ui = Object.assign({}, DEFAULT_UI, cfg.ui || {});
    var txt = ui[key] || DEFAULT_UI[key] || key;
    if (vars) {
      for (var k in vars) txt = txt.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), vars[k]);
    }
    return txt;
  }
  function renderCats(data, cfg) {
    var cats = [];
    data.tools.forEach(function (t) {
      if (t.category && cats.indexOf(t.category) < 0) cats.push(t.category);
    });
    var html = '<button data-c="" class="chip active">' + esc(uiText(cfg, 'allTools')) + '</button>';
    html += cats.map(function (c) {
      return '<button data-c="' + esc(c) + '" class="chip">' + esc(c) + '</button>';
    }).join('');
    document.getElementById('catFilter').innerHTML = html;
  }

  function cardHTML(t) {
    var cfg = window.__cfg || {};
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
        // 列表卡片不再直接外跳：统一进入站内详情页（带「访问官网」外链 CTA），漏斗更顺、跳出更低
        '<a class="card-visit" href="?tool=' + encodeURIComponent(slug) + '">' + esc(uiText(cfg, 'detailCardBtn')) + '</a>' +
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
    var disc = '';
    var dl = (gconf && gconf.compliance && gconf.compliance.disclaimer) || {};
    if (dl.enabled !== false) {
      var txt = dl.byLang && dl.byLang[lk];
      if (txt) disc = '<span class="footer-disclaimer">' + esc(txt) + '</span>';
    }
    document.getElementById('footer').innerHTML =
      '<span>© ' + new Date().getFullYear() + ' ' + esc(cfg.domain || '72tool') + '</span>' +
      '<span>' + esc(uiText(cfg, 'footerToolsCount', { n: (data.tools || []).length })) + esc(data.updated || '-') + '</span>' +
      '<span class="footer-links"><a href="/privacy" rel="nofollow noopener">' + esc(uiText(cfg, 'privacy')) + '</a></span>' + disc;
    // 私域导流统一入口（config.community 开关控制）
    var ce = document.getElementById('communityEntry');
    if (ce) {
      var com = cfg.community || { enabled: false };
      if (com.enabled) {
        // 社群导流：若填了站外 URL（Telegram/Discord 等）则 nofollow，纯站内 /community 保留
        var cExternal = com.url && /^https?:/i.test(com.url);
        var cRel = cExternal ? ' rel="nofollow noopener"' : '';
        var cHref = com.url || '/community';
        ce.innerHTML = '<a class="community-link" href="' + esc(cHref) + '"' + cRel + '>🤝 ' + esc(com.title || uiText(cfg, 'communityTitle')) + '</a>';
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
    var cfg = window.__cfg || {};
    var box = document.getElementById('tutorials'), cont = document.getElementById('tutList');
    if (!box || !cont) return;
    var title = document.getElementById('tutorialsTitle');
    if (title) title.textContent = uiText(cfg, 'latestTutorials');
    var list = (articles || []).slice(0, 3);
    if (!list.length) { box.hidden = true; return; }
    cont.innerHTML = list.map(tutCardHTML).join('');
  }
  function renderRelatedArticles(toolName, articles) {
    var cfg = window.__cfg || {};
    var box = document.getElementById('relArticles'), cont = document.getElementById('relList');
    if (!box || !cont) return;
    var title = document.getElementById('relArticlesTitle');
    if (title) title.textContent = uiText(cfg, 'detailRelTutorials');
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
      box.id = 'toolFaq'; box.className = 'rel-articles'; box.setAttribute('aria-label', uiText(window.__cfg || {}, 'detailFaqTitle'));
      var main = document.getElementById('main');
      main.insertBefore(box, main.querySelector('.site-footer') || null);
    }
    box.hidden = false;
    box.innerHTML = '<h2 class="section-title">' + esc(uiText(window.__cfg || {}, 'detailFaqTitle')) + '</h2><ul class="faq-list">' +
      lt.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
    // 同步写入页面 meta keywords（长尾词）
    var mk = document.querySelector('meta[name=keywords]');
    if (!mk) { mk = document.createElement('meta'); mk.name = 'keywords'; document.head.appendChild(mk); }
    mk.content = (mk.content || '') + ',' + lt.join(',');
  }

  /* ---------- 4.2 工具详情视图：/tool=<slug> 展示站内详情，避免一点就跳外链 ---------- */
  // 工具别名集合（含中文名 / 原始英文名 / slug），用于匹配相关教程与相似工具
  function toolAliases(t) {
    var s = [t.name, t.originName, t.slug, t.category];
    (t.tags || []).forEach(function (x) { s.push(x); });
    return s.filter(Boolean).map(function (x) { return String(x).toLowerCase(); });
  }
  function matchToolAlias(t, token) {
    token = String(token || '').toLowerCase().trim();
    if (!token) return false;
    return toolAliases(t).some(function (a) { return a === token || a.indexOf(token) >= 0; });
  }

  // 阅读时长预估（中文按 350 字/分钟，英文按 200 词/分钟）
  function readingTime(a) {
    var txt = String(a.body || '').replace(/<[^>]+>/g, '');
    var cjk = (txt.match(/[一-龥]/g) || []).length;
    var en = (txt.replace(/[一-龥]/g, ' ').match(/[a-zA-Z]+/g) || []).length;
    return Math.max(1, Math.round(cjk / 350 + en / 200));
  }

  // 轻量字符串 hash（用于模板随机变体，规避广告联盟判批量雷同）
  function hashStr(s) {
    var h = 0; for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  /* —— 详情页各区块渲染 —— */
  function infoCardHTML(t, cfg) {
    var m = t.meta || {};
    var rows = [];
    if (m.openSource === true) rows.push([uiText(cfg, 'openSource'), uiText(cfg, 'openSourceValue')]);
    else if (m.openSource === false) rows.push([uiText(cfg, 'openSource'), uiText(cfg, 'closedSourceValue')]);
    var pLabel = { free: uiText(cfg, 'pricingFree'), freemium: uiText(cfg, 'pricingFreemium'), paid: uiText(cfg, 'pricingPaid') }[m.pricing];
    if (pLabel) rows.push([uiText(cfg, 'pricing'), pLabel]);
    if (m.platforms && m.platforms.length) rows.push([uiText(cfg, 'platforms'), m.platforms.join('、')]);
    if (m.license) rows.push([uiText(cfg, 'license'), m.license]);
    if (m.updated || t.updated) rows.push([uiText(cfg, 'updated'), m.updated || t.updated]);
    if (!rows.length) return '';
    return '<h2 class="detail-h2">' + esc(uiText(cfg, 'detailInfoTitle')) + '</h2>' +
      '<div class="info-card"><dl>' + rows.map(function (r) {
        return '<div class="info-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
      }).join('') + '</dl></div>';
  }
  function pcHTML(t, cfg) {
    var pros = t.pros || [], cons = t.cons || [];
    if (!pros.length && !cons.length) return '';
    var h = '<div class="pc-grid">';
    if (pros.length) h += '<section class="pc-box pros"><h2 class="pc-title">' + esc(uiText(cfg, 'detailProsTitle')) + '</h2><ul>' +
      pros.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>';
    if (cons.length) h += '<section class="pc-box cons"><h2 class="pc-title">' + esc(uiText(cfg, 'detailConsTitle')) + '</h2><ul>' +
      cons.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>';
    return h + '</div>';
  }
  // 把 usage 步骤字符串解析为带标题/代码/提示/验证的小白友好结构
  function usageHTML(t, cfg) {
    var steps = (t.usage && t.usage.length) ? t.usage : ['打开下方「访问官网」进入主页。', '选择所需功能模块开始使用。', '遇到问题可查看本页相关教程。'];
    return steps.map(function (raw, idx) {
      var s = String(raw);
      var title = '';
      s = s.replace(/^Step:\s*(.+?)(?:\r?\n|$)/, function (_, m) { title = m.trim(); return ''; });
      var parts = { text: '', code: '', tip: '', check: '' };
      var current = 'text';
      s.split(/\r?\n/).forEach(function (line) {
        if (/^Code:\s*$/.test(line)) { current = 'code'; return; }
        if (/^Tip:\s*$/.test(line)) { current = 'tip'; return; }
        if (/^Check:\s*$/.test(line)) { current = 'check'; return; }
        parts[current] += (parts[current] ? '\n' : '') + line;
      });
      var html = '';
      if (title) html += '<div class="usage-title"><span class="usage-num">' + (idx + 1) + '</span>' + esc(title) + '</div>';
      if (parts.text.trim()) html += '<p class="usage-text">' + esc(parts.text.trim()).replace(/`([^`]+)`/g, '<code>$1</code>') + '</p>';
      if (parts.code.trim()) {
        var codeId = 'uc-' + idx + '-' + Math.random().toString(36).slice(2, 8);
        html += '<div class="code-block"><button type="button" class="code-copy" data-copy="' + codeId + '" aria-label="' + esc(uiText(cfg, 'copyCode')) + '">' + esc(uiText(cfg, 'copyCode')) + '</button><pre id="' + codeId + '">' + esc(parts.code.trim()) + '</pre></div>';
      }
      if (parts.tip.trim()) html += '<div class="usage-tip"><b>' + esc(uiText(cfg, 'usageTipLabel')) + '</b>' + esc(parts.tip.trim()) + '</div>';
      if (parts.check.trim()) html += '<div class="usage-check"><b>' + esc(uiText(cfg, 'usageCheckLabel')) + '</b>' + esc(parts.check.trim()) + '</div>';
      return '<li class="usage-step" data-step="' + (idx + 1) + '">' + html + '</li>';
    }).join('');
  }
  function breadcrumbHTML(tool, cfg) {
    var parts = '<a href="/">' + esc(uiText(cfg, 'breadcrumbHome')) + '</a>';
    if (/^\/agent\//.test(base)) parts += '<span class="sep">›</span><a href="https://browseragent.72tool.com/">' + esc(uiText(cfg, 'breadcrumbAgents') || 'Agent 集群') + '</a>';
    else if (/^\/tools\//.test(base)) parts += '<span class="sep">›</span><a href="https://txtclean.72tool.com/">' + esc(uiText(cfg, 'breadcrumbTools') || '工具集群') + '</a>';
    parts += '<span class="sep">›</span><span class="cur">' + esc(tool.name) + '</span>';
    return '<nav class="breadcrumb" aria-label="面包屑">' + parts + '</nav>';
  }
  // 详情页教程卡片：站内跳转（不新开外部），带阅读时长
  function tutCardDetailHTML(a, cfg) {
    var tags = (a.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    return '' +
      '<article class="card tut-card" itemscope itemtype="https://schema.org/Article">' +
        '<h3 class="card-title"><a itemprop="url" href="/article/' + esc(a.slug) + '">' + esc(a.title) + '</a></h3>' +
        '<p class="card-desc" itemprop="description">' + esc(a.summary || '') + '</p>' +
        '<div class="card-tags">' + tags + '</div>' +
        '<span class="read-time">' + esc(uiText(cfg, 'readTimePrefix')) + ' ' + readingTime(a) + ' ' + esc(uiText(cfg, 'readTimeSuffix')) + '</span>' +
      '</article>';
  }
  // 相似相关工具卡片：站内互链（?tool=slug），提升收录与停留
  function relToolCardHTML(t) {
    var slug = t.slug || slugify(t.name);
    var img = t.img
      ? '<img class="card-img" src="' + esc(t.img) + '" alt="' + esc(t.alt || t.name) + '" loading="lazy" decoding="async">'
      : '';
    var tags = (t.tags || []).slice(0, 3).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    return '<article class="card rel-tool" itemscope itemtype="https://schema.org/SoftwareApplication">' +
      img +
      '<h3 class="card-title"><a itemprop="url" href="?tool=' + encodeURIComponent(slug) + '">' + esc(t.name) + '</a></h3>' +
      '<p class="card-desc" itemprop="description">' + esc(String(t.desc || '').slice(0, 72)) + '</p>' +
      '<div class="card-tags">' + tags + '</div>' +
      '</article>';
  }

  function hideListUI(hide) {
    ['topBlock', 'grid', 'tutorials', 'relArticles', 'catFilter', 'sentinel', 'empty'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = hide && id !== 'sentinel' && id !== 'empty';
    });
  }

  /* 返回顶部按钮（长页面体验） */
  var _toTopBound = false;
  function ensureToTop() {
    var btn = document.getElementById('toTop');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'toTop'; btn.type = 'button'; btn.className = 'to-top';
      btn.setAttribute('aria-label', '返回顶部'); btn.textContent = '↑';
      document.body.appendChild(btn);
      btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }
    btn.classList.remove('show');
    if (!_toTopBound) {
      _toTopBound = true;
      window.addEventListener('scroll', function () {
        var b = document.getElementById('toTop');
        if (b) b.classList.toggle('show', window.scrollY > 400);
      }, { passive: true });
    }
  }

  function renderDetail(tool, articles, cfg) {
    if (!tool) return;
    var slug = tool.slug || slugify(tool.name);
    document.body.classList.add('detail-mode');
    hideListUI(true);
    // 详情页只保留「内文中段 + 侧边」两个广告位（控制密度，避免被广告联盟判广告堆砌）
    var top = document.querySelector('[data-ad="top"]');
    if (top) top.remove();

    var tags = (tool.tags || []).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    var variant = (hashStr(slug) % 3) + 1; // 模板随机变体（anti-detection）

    var html = breadcrumbHTML(tool, cfg);
    html += '<a class="back-link" href="/">' + esc(uiText(cfg, 'backToList')) + '</a>';
    html += '<article class="detail-card tpl-v' + variant + '" itemscope itemtype="https://schema.org/SoftwareApplication">';
    html += '<div class="detail-head">' +
      '<h1 class="detail-name" itemprop="name">' + esc(tool.name) + '</h1>' +
      (tool.category ? '<span class="detail-cat">' + esc(tool.category) + '</span>' : '') +
      AFF.badge(tool) + '</div>';
    html += '<div class="detail-tags">' + tags + '</div>';
    html += '<p class="detail-desc" itemprop="description">' + esc(tool.desc || '') + '</p>';
    html += infoCardHTML(tool, cfg);
    html += pcHTML(tool, cfg);
    html += '<h2 class="detail-h2">' + esc(uiText(cfg, 'detailUsageTitle')) + '</h2><ol class="usage-list">' + usageHTML(tool, cfg) + '</ol>';
    html += '<div class="detail-cta">' +
      '<a class="visit-btn" id="detailVisit" target="_blank" rel="' + esc(AFF.rel(tool)) + '">' + esc(uiText(cfg, 'detailVisitBtn')) + '</a>' +
      AFF.copyHTML(tool) + '</div>';
    html += '</article>';

    // 内文中段广告：真人访客可见，爬虫/被 adblock 拦截时不渲染（ads.js 控制）
    html += '<div class="ad-inline" data-ad="article" aria-label="广告位"></div>';

    // 相关教程（站内跳转 + 阅读时长）
    var rel = (articles || []).filter(function (a) {
      return (a.relatedTools && a.relatedTools.some(function (rt) { return matchToolAlias(tool, rt); })) ||
        (a.tags || []).some(function (tg) { return matchToolAlias(tool, tg); }) ||
        (a.tags || []).some(function (tg) { return (tool.tags || []).indexOf(tg) >= 0; });
    }).slice(0, 4);
    if (rel.length) {
      html += '<section class="rel-articles" aria-label="' + esc(uiText(cfg, 'detailRelTutorials')) + '">' +
        '<h2 class="section-title">' + esc(uiText(cfg, 'detailRelTutorials')) + '</h2>' +
        '<div class="grid tut-grid">' + rel.map(function (a) { return tutCardDetailHTML(a, cfg); }).join('') + '</div></section>';
    }

    // 相似相关工具（同站同分类，站内互链）
    var relTools = ((window.__data && window.__data.tools) || [])
      .filter(function (t) { return t !== tool && (t.category === tool.category || (t.tags || []).filter(function (x) { return (tool.tags || []).indexOf(x) >= 0; }).length); })
      .slice(0, 4);
    if (relTools.length) {
      html += '<section class="rel-tools" aria-label="' + esc(uiText(cfg, 'detailRelTools')) + '">' +
        '<h2 class="section-title">' + esc(uiText(cfg, 'detailRelTools')) + '</h2>' +
        '<div class="grid">' + relTools.map(relToolCardHTML).join('') + '</div></section>';
    }

    var d = document.getElementById('toolDetail');
    d.innerHTML = html;
    d.hidden = false;
    document.getElementById('detailVisit').href = AFF.href(tool);

    // Schema.org 详情级
    var ld = {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication',
      name: tool.name, description: tool.desc,
      applicationCategory: tool.category, operatingSystem: 'Web',
      url: location.origin + '/?tool=' + encodeURIComponent(slug), inLanguage: cfg.lang || 'zh-CN'
    };
    if (tool.url) ld.sameAs = tool.url;
    document.getElementById('jsonld').textContent = JSON.stringify(ld);

    // TDK：标题 / canonical / meta description 指向详情
    document.title = tool.name + '｜' + (tool.category || '') + (cfg.name ? ' | ' + cfg.name : '');
    var cano = document.getElementById('canonical');
    if (cano) cano.setAttribute('href', location.origin + '/?tool=' + encodeURIComponent(slug));
    var md = document.querySelector('meta[name=description]');
    if (md) {
      var plat = (tool.meta && tool.meta.platforms) ? (uiText(cfg, 'platforms') + ' ' + tool.meta.platforms.join('/') + '。') : '';
      var detailMeta = uiText(cfg, 'detailInfoTitle') + '、' + uiText(cfg, 'detailUsageTitle') + '、' + uiText(cfg, 'detailProsTitle') + ' ' + uiText(cfg, 'detailConsTitle') + ' ' + uiText(cfg, 'detailRelTutorials');
      md.setAttribute('content', (tool.desc || '') + plat + detailMeta);
    }

    ensureToTop();
    window.scrollTo(0, 0);
  }

  /* ---------- 5. 主流程 ---------- */
  function init() {
    // 先解析域名映射（动态读 domain-map.json），再加载本子站数据
    loadHostMap().then(function () {
      if (forced) base = '/' + forced.replace(/^\/+|\/+$/g, '');
      startInit();
    });
  }

  function startInit() {
    var DEFAULT_CFG = {
      domain: host, name: '72tool', title: '72tool 工具导航',
      description: '精选在线工具与 AI 智能体导航', keywords: '工具,导航',
      category: '工具', lang: 'zh-CN', base: base
    };
    var cfg = Object.assign({}, DEFAULT_CFG);
    var data = { tools: [], updated: '' };
    var adata = { articles: [] };
    var p1 = loadJSON(sitePath('/config.json')).then(function (c) { cfg = Object.assign(cfg, c); })
      .catch(function (e) { console.warn('config 缺失，使用默认:', e); });
    var p2 = loadJSON(sitePath('/data/list.json')).then(function (d) { data = d && d.tools ? d : data; })
      .catch(function (e) { console.warn('data 缺失:', e); });
    // 资讯数据（教程资讯模块）：失败不阻断工具页渲染
    var p3 = loadJSON(sitePath('/article/list.json')).then(function (a) { adata = a && a.articles ? a : adata; })
      .catch(function (e) { console.warn('article 数据缺失:', e); });
    // CPS 分销配置（affiliate.js 注入；失败不阻断工具页渲染）
    var p4 = (window.AFF ? window.AFF.load() : Promise.resolve());
    // 全站合规配置（含 §7.4 多语种免责 byLang）
    var p5 = (window.Site && window.Site.globalConfig) ? window.Site.globalConfig() : Promise.resolve({});

    Promise.all([p1, p2, p3, p4, p5]).then(function (r) {
      var gconf = (r && r[4]) || {};
      window.__cfg = cfg;
      if (window.Site && window.Site.applyTpl) window.Site.applyTpl(cfg); // §3.1 模板随机（跨站不同，不闪动）
      window.__data = data;
      window.__articles = adata.articles || [];
      renderMeta(cfg); renderNav(cfg); applyThemeStyle(cfg); renderHero(cfg); renderCats(data, cfg);
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

  // 详情页代码块「复制」按钮（事件委托，按钮动态生成）
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.code-copy');
    if (!btn) return;
    var pre = document.getElementById(btn.getAttribute('data-copy'));
    if (!pre) return;
    var text = pre.textContent;
    var cfg = window.__cfg || {};
    var original = uiText(cfg, 'copyCode');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = uiText(cfg, 'copyCodeDone'); setTimeout(function () { btn.textContent = original; }, 1500);
      }, function () { fallbackCopy(text, btn); });
    } else { fallbackCopy(text, btn); }
  });
  function fallbackCopy(text, btn) {
    var cfg = window.__cfg || {};
    var original = uiText(cfg, 'copyCode');
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); btn.textContent = uiText(cfg, 'copyCodeDone'); }
    catch (err) { btn.textContent = uiText(cfg, 'copyCodeFail'); }
    document.body.removeChild(ta);
    setTimeout(function () { btn.textContent = original; }, 1500);
  }

  init();
})();
