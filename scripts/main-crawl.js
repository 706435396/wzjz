/* ============================================================
 * scripts/main-crawl.js  ——  全自动采集 + AI 分类 + SEO 生成流水线
 * ------------------------------------------------------------
 * 数据源：GitHub Trending、Hugging Face Spaces(RSS)、ProductHunt(RSS)、开源工具 RSS
 * 爬虫：Node + Playwright（JS 重度页面用浏览器渲染，RSS 用 fetch）
 * AI：智谱 AI（BigModel / GLM），完全不依赖 Google Gemini
 * 流程：抓取 -> 违规过滤 -> 本地关键词预分类(免AI) -> 模糊项批量AI分类(50/批)
 *       -> 内容查重防同质化 -> 增量写入对应子站 data/list.json -> 重建 sitemap
 *
 * 【省 API 成本设计（对应优化清单「三.1」）】
 *   1) 本地关键词预过滤：能直接判定归属赛道的工具，跳过 AI，零 token 消耗；
 *   2) 批量聚合调用：模糊项每 50 个合并一次请求，API 调用次数降为 1/50，token 省约 70%；
 *   3) 增量只写新工具：存量工具不重写文案，避免重复消耗。
 *
 * 运行：node scripts/main-crawl.js   （需环境变量 ZHIPU_API_KEY）
 * 说明：无 API Key 时自动降级为关键词启发式分类，仍可本地跑通演示。
 * 退出前写入 scripts/.last-run.json（added 计数），供 crawl.yml 判断是否提交。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const API_KEY = process.env.ZHIPU_API_KEY || '';
const TODAY = new Date().toISOString().slice(0, 10);
const BATCH = 50; // 每批 AI 调用合并的工具数

/* ---------- 赛道 -> 子目录路由表（新增赛道在此追加） ---------- */
const ROUTES = {
  browser:    { base: '/agent/browser',    cat: '浏览器自动化' },
  tiktok:     { base: '/agent/tiktok',     cat: '跨境短视频' },
  localgpu:   { base: '/agent/localgpu',   cat: '本地显卡' },
  txtclean:   { base: '/tools/txtclean',   cat: '文本清洗' },
  sitemapgen: { base: '/tools/sitemapgen', cat: 'SEO工具' },
  es:         { base: '/lang/es',          cat: 'Utilidades' },
  de:         { base: '/lang/de',          cat: 'Utilities' }
};

/* ---------- 违规内容黑名单（命中即丢弃，保障域名安全） ---------- */
const BLOCKLIST = [
  '破解', '翻墙', '科学上网', '机场', 'vpn', 'crack', 'pirate', 'piracy',
  'porn', '成人', '赌博', 'bet', 'casino', '彩票', 'hack', '黑客工具',
  '入侵', '泄露', 'leak', '盗号', '诈骗', '私彩'
];
function isBlocked(item) {
  const s = ((item.name || '') + ' ' + (item.desc || '') + ' ' + (item.url || '')).toLowerCase();
  return BLOCKLIST.some((w) => s.includes(w));
}

/* slug：详情页锚点（?tool=<slug> / article/<slug>），与 build-sitemap.js 规则一致 */
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* ---------- 本地关键词预过滤（强匹配直接定赛道，跳过 AI） ---------- */
const LOCAL_RULES = [
  { cat: 'browser',    re: /(playwright|puppeteer|browser\.?use|浏览器|网页抓取|web ?scrap|rpa|自动化|selenium)/i },
  { cat: 'tiktok',     re: /(tiktok|短视频|跨境|剪辑|capcut|opus|reels)/i },
  { cat: 'localgpu',   re: /(ollama|stable.?diffusion|comfyui|gpu|显卡|本地|离线|llm\b|diffusion)/i },
  { cat: 'txtclean',   re: /(清洗|clean|标点|繁简|文本|去重|text)/i },
  { cat: 'sitemapgen', re: /(sitemap|站点地图|seo|收录)/i },
  { cat: 'es',         re: /(español|spanish|herramienta|utilidad)/i },
  { cat: 'de',         re: /(deutsch|german|werkzeug|utilität)/i }
];
function localRule(item) {
  const s = (item.name || '') + ' ' + (item.desc || '');
  for (const r of LOCAL_RULES) {
    if (r.re.test(s)) {
      const cat = ROUTES[r.cat].cat;
      return {
        category: r.cat,
        safe: true,
        seoDesc: ('精选 ' + item.name + '：' + (item.desc || '').slice(0, 36) + '，适用于' + cat + '场景，开箱即用。').slice(0, 60),
        tags: [r.cat]
      };
    }
  }
  return null;
}

/* ---------- 通用 HTTP 抓取 ---------- */
async function getText(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ToolNavBot/1.0; +https://72tool.com)' },
    redirect: 'follow'
  });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' @ ' + url);
  return r.text();
}

/* ---------- Playwright 抓取（可选，失败降级 fetch） ---------- */
let _pwModule = null;
async function getTextPW(url) {
  try {
    if (!_pwModule) _pwModule = require('playwright');
    const browser = await _pwModule.chromium.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (compatible; ToolNavBot/1.0)' });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const html = await page.content();
    await browser.close();
    return html;
  } catch (e) {
    return getText(url);
  }
}

/* ---------- 数据源 1：GitHub Trending ---------- */
async function crawlGitHub() {
  const url = 'https://github.com/trending?since=daily';
  const html = process.env.USE_PW === '1' ? await getTextPW(url) : await getText(url);
  const blocks = html.split('<article class="Box-row">').slice(1);
  const out = [];
  for (const b of blocks) {
    const href = (b.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/) || [])[1];
    if (!href) continue;
    const full = 'https://github.com' + href;
    const name = href.replace(/^\//, '');
    const desc = (b.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '';
    out.push({ name, url: full, desc: desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) });
  }
  console.log('[GitHub Trending] 采集', out.length, '条');
  return out;
}

/* ---------- 数据源 2/3/4：RSS ---------- */
async function crawlHuggingFace() { return parseRSS(await getText('https://huggingface.co/spaces/rss'), 'HuggingFace'); }
async function crawlProductHunt() { return parseRSS(await getText('https://www.producthunt.com/feed'), 'ProductHunt'); }
async function crawlExtraRSS() {
  // 修正：GitHub weekly trending 是 HTML 页面（非 RSS），改用与 crawlGitHub 相同的 HTML 解析，
  // 否则 parseRSS 返回 0 条、白白浪费一次采集。weekly 与 daily 去重后提供增量候选。
  const out = [];
  try {
    const url = 'https://github.com/trending?since=weekly';
    const html = process.env.USE_PW === '1' ? await getTextPW(url) : await getText(url);
    const blocks = html.split('<article class="Box-row">').slice(1);
    for (const b of blocks) {
      const href = (b.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/) || [])[1];
      if (!href) continue;
      const full = 'https://github.com' + href;
      const name = href.replace(/^\//, '');
      const desc = (b.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '';
      out.push({ name, url: full, desc: desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) });
    }
    console.log('[GitHub Weekly] 采集', out.length, '条');
  } catch (e) { console.warn('[ExtraRSS] 跳过', e.message); }
  return out;
}
function parseRSS(xml, src) {
  const items = xml.split(/<item[>\s]/).slice(1);
  const out = [];
  for (const it of items) {
    const title = (it.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const link = (it.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const desc = (it.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
    if (!link) continue;
    out.push({ name: title.replace(/<[^>]+>/g, '').trim().slice(0, 120), url: link.trim(), desc: desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) });
  }
  console.log('[' + src + '] 采集', out.length, '条');
  return out;
}

/* ---------- 智谱 AI：批量聚合分类（50 个/请求） ---------- */
function extractJSON(text) {
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

async function classifyBatch(items) {
  // items: 需要 AI 判定的模糊项（已是本地规则未命中的）
  if (!items.length) return [];
  if (!API_KEY) return items.map((it) => Object.assign(heuristic(it), { item: it }));
  const results = new Array(items.length);
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    const numbered = chunk.map((it, idx) =>
      (i + idx + 1) + '. 名:' + (it.name || '') + ' 简介:' + (it.desc || '').slice(0, 120) + ' 链接:' + (it.url || '')
    ).join('\n');
    const prompt =
      '你是 SEO 分类助手。请把下面 ' + chunk.length + ' 个工具依次分到赛道之一：browser/tiktok/localgpu/txtclean/sitemapgen/es/de。' +
      '赛道含义：browser=浏览器自动化Agent；tiktok=跨境短视频Agent；localgpu=本地离线显卡Agent；' +
      'txtclean=文本清洗工具；sitemapgen=站点地图/SEO工具；es=西班牙语站；de=德语站。' +
      '违规(破解/翻墙/色情/赌博/黑客攻击)则 category="none"。' +
      '只输出一个 JSON 数组（顺序与编号一致，不要多余文字）：\n' +
      '[{"category":"<key>","safe":true/false,"seoDesc":"中文30-60字","tags":["标签1","标签2"]}]\n\n' + numbered;
    try {
      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'glm-4-flash', temperature: 0.3, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) throw new Error('智谱 HTTP ' + res.status);
      const j = await res.json();
      const content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      const arr = extractJSON(content || '');
      if (Array.isArray(arr)) {
        chunk.forEach((it, idx) => { results[i + idx] = Object.assign(arr[idx] || heuristic(it), { item: it }); });
        console.log('  · AI 批量分类', chunk.length, '条 (第', i / BATCH + 1, '批)');
        continue;
      }
    } catch (e) { console.warn('[智谱] 批量失败，逐条降级:', e.message); }
    // 失败 -> 逐条启发式兜底
    chunk.forEach((it, idx) => { results[i + idx] = Object.assign(heuristic(it), { item: it }); });
  }
  return results;
}

/* ---------- 启发式分类（无 AI / 兜底） ---------- */
function heuristic(item) {
  const s = ((item.name || '') + ' ' + (item.desc || '')).toLowerCase();
  let category = 'none';
  if (/(playwright|puppeteer|browser.?use|浏览器|网页抓取|rpa|自动化)/.test(s)) category = 'browser';
  else if (/(tiktok|短视频|跨境|剪辑|capcut|opus)/.test(s)) category = 'tiktok';
  else if (/(ollama|stable.?diffusion|gpu|显卡|本地|离线|llm|local)/.test(s)) category = 'localgpu';
  else if (/(清洗|clean|标点|繁简|文本|text)/.test(s)) category = 'txtclean';
  else if (/(sitemap|站点地图|seo|收录)/.test(s)) category = 'sitemapgen';
  else if (/(español|spanish|herramienta)/.test(s)) category = 'es';
  else if (/(deutsch|german|werkzeug|utilities)/.test(s)) category = 'de';
  return { category, safe: !isBlocked(item), seoDesc: (item.desc || '').slice(0, 60), tags: [] };
}

/* ---------- 负载均衡兜底（无 API Key 时，未强匹配的合法工具不丢弃，补入当前工具最少的子站） ----------
 * 说明：抓取源（GitHub Trending / HF / ProductHunt）本身全是开发/AI 工具，未强匹配≠不相关。
 * 直接丢弃会导致多语种站(es/de)等永远为空、广告门禁无法放开。改为补入「工具数最少」的子站，
 * 既保证各站都有内容，也避免单站过载。强匹配项仍优先进入对应赛道（相关性优先）。
 * 该逻辑仅在 res.category 为 none/非法时触发，强匹配分支不受影响；幂等（按 URL 去重）。 */
function countToolsOf(base) {
  const p = path.join(PUBLIC_DIR, base.replace(/^\//, ''), 'data', 'list.json');
  try { return (JSON.parse(fs.readFileSync(p, 'utf8')).tools || []).length; } catch (e) { return 0; }
}
function leastFilledCat() {
  let best = 'browser', min = Infinity;
  for (const k of Object.keys(ROUTES)) {
    const c = countToolsOf(ROUTES[k].base);
    if (c < min) { min = c; best = k; }
  }
  return best;
}

/* ---------- 内容查重（防同质化，对应清单「三.2」） ----------
 * 修正说明：原实现按空格分词，中文简介无空格 → 整段视为 1 个 token，
 * 相似度恒为 0，查重实际失效（实测模板化换名文案也算 0.000）。
 * 现复用 _sites.js 的混合 shingle 相似度（中文二元组 + 拉丁词），
 * 阈值 0.6 与下游 dedupeDesc 逻辑保持完全不变，属行为修复而非逻辑变更。
 */
const { sim } = require('./_sites');
const { affFor } = require('./_aff');   // CPS 分销深链（采集新工具时同步生成，最小侵入）
function dedupeDesc(desc, existing, item) {
  // 与同目录已有工具简介相似度 > 0.6 时，追加差异化后缀，避免搜索引擎判低质重复
  for (const e of existing) {
    if (e.desc && sim(desc, e.desc) > 0.6) {
      return (desc + '（' + (item.name || '本工具') + '）').slice(0, 80);
    }
  }
  return desc;
}

/* ---------- 增量写入子站 data/list.json（按 URL 去重） ---------- */
function writeToFolder(base, item, seo) {
  const folder = path.join(PUBLIC_DIR, base.replace(/^\//, ''));
  const dataDir = path.join(folder, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const listPath = path.join(dataDir, 'list.json');

  let data = { updated: TODAY, tools: [] };
  if (fs.existsSync(listPath)) {
    try {
      data = JSON.parse(fs.readFileSync(listPath, 'utf8'));
      if (!Array.isArray(data.tools)) data.tools = [];
    } catch (e) { /* 损坏则重建 */ }
  }

  const norm = (u) => u.replace(/\/+$/, '').toLowerCase();
  const exist = new Set(data.tools.map((t) => norm(t.url)));
  if (exist.has(norm(item.url))) { console.log('  · 已存在跳过:', item.url); return false; }

  const desc = dedupeDesc((seo.seoDesc || item.desc || '').slice(0, 80), data.tools, item);
  // CPS 分销深链：有映射且已配 PID 才写入，否则留空（前端回退官网原链，绝不生死链）
  const aff = affFor(item.url);
  data.tools.push({
    name: item.name,
    url: item.url,
    desc,
    tags: seo.tags && seo.tags.length ? seo.tags : [],
    category: ROUTES[seo.category] ? ROUTES[seo.category].cat : '',
    updated: TODAY,
    aff: aff ? aff.url : '',
    affNetwork: aff ? aff.network : '',
    affCommission: aff ? (aff.commission || 0) : 0   // §2.1 佣金权重，随采集写盘
  });
  data.updated = TODAY;
  fs.writeFileSync(listPath, JSON.stringify(data, null, 2));
  console.log('  ✓ 新增 ->', base, '|', item.name);
  return true;
}

/* ---------- 资讯采集：数据源 + 本地预分类 + 批量 AI 分发 + 增量写入 ---------- */
/* 资讯数据源（垂直赛道素材）：HF 官方博客（使用指南/报错）、GitHub 周趋势（README/issue 实操） */
const ARTICLE_FEEDS = [
  'https://huggingface.co/blog/feed',
  'https://github.com/trending?since=weekly'
];
async function crawlArticles() {
  const out = [];
  for (const f of ARTICLE_FEEDS) {
    try {
      const raw = await getText(f);
      if (/<rss|<feed|<item/i.test(raw)) {
        parseRSS(raw, 'ArticleRSS').forEach((it) => out.push({ title: it.name, url: it.url, desc: it.desc, source: 'rss' }));
      } else {
        const blocks = raw.split('<article class="Box-row">').slice(1);
        for (const b of blocks) {
          const href = (b.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/) || [])[1];
          if (!href) continue;
          const name = href.replace(/^\//, '').split('/').filter(Boolean).pop();
          const desc = (b.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '';
          out.push({ title: name, url: 'https://github.com' + href, desc: desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200), source: 'github' });
        }
      }
    } catch (e) { console.warn('[资讯] 源失败跳过', f, e.message); }
  }
  console.log('[资讯] 采集候选', out.length, '条');
  return out;
}

/* 本地规则预分类（复用工具赛道规则，强匹配直接定，免 AI） */
function articleLocalRule(item) {
  const s = (item.title || '') + ' ' + (item.desc || '');
  for (const r of LOCAL_RULES) if (r.re.test(s)) return { category: r.cat, safe: true };
  return null;
}
function heuristicArticle(item) {
  const r = articleLocalRule(item);
  return { category: r ? r.category : 'none', title: (item.title || '').slice(0, 40), summary: (item.desc || '').slice(0, 60), keywords: '' };
}

/* 批量 AI 分发（50/批，对应优化清单「三.1 聚合调用」）：返回赛道 + 标题 + 摘要 + 长尾词 */
async function classifyArticleBatch(items) {
  if (!items.length) return [];
  if (!API_KEY) return items.map((it) => Object.assign(heuristicArticle(it), { item: it }));
  const results = new Array(items.length);
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    const numbered = chunk.map((it, idx) =>
      (i + idx + 1) + '. 标题:' + (it.title || '') + ' 摘要:' + (it.desc || '').slice(0, 120) + ' 链接:' + (it.url || '')
    ).join('\n');
    const prompt =
      '你是 SEO 资讯助手。请把下面 ' + chunk.length + ' 篇素材分到赛道之一：browser/tiktok/localgpu/txtclean/sitemapgen/es/de，' +
      '并为每篇生成：title(对应语种标题,40字内)、summary(中文60字内干货摘要)、keywords(3个长尾词用逗号分隔)。' +
      '赛道含义：browser=浏览器自动化；tiktok=跨境短视频；localgpu=本地显卡；txtclean=文本清洗；sitemapgen=SEO工具；es=西语；de=德语。' +
      '违规(破解/翻墙/色情/赌博)则 category="none"。' +
      '只输出一个 JSON 数组（顺序与编号一致，不要多余文字）：\n' +
      '[{"category":"<key>","title":"...","summary":"...","keywords":"..."}]\n\n' + numbered;
    try {
      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'glm-4-flash', temperature: 0.4, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) throw new Error('智谱 HTTP ' + res.status);
      const j = await res.json();
      const content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      const arr = extractJSON(content || '');
      if (Array.isArray(arr)) {
        chunk.forEach((it, idx) => { results[i + idx] = Object.assign(arr[idx] || heuristicArticle(it), { item: it }); });
        console.log('  · AI 资讯批量', chunk.length, '条 (第', i / BATCH + 1, '批)');
        continue;
      }
    } catch (e) { console.warn('[智谱] 资讯批量失败，逐条降级:', e.message); }
    chunk.forEach((it, idx) => { results[i + idx] = Object.assign(heuristicArticle(it), { item: it }); });
  }
  return results;
}

/* 增量写入子站 article/list.json（按 slug + url 去重，不覆盖历史） */
function writeArticle(base, item, seo) {
  const folder = path.join(PUBLIC_DIR, base.replace(/^\//, ''), 'article');
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  const listPath = path.join(folder, 'list.json');
  let data = { updated: TODAY, articles: [] };
  if (fs.existsSync(listPath)) {
    try { data = JSON.parse(fs.readFileSync(listPath, 'utf8')); if (!Array.isArray(data.articles)) data.articles = []; } catch (e) {}
  }
  const slug = slugify(seo.title || item.title || item.url);
  const seen = new Set(
    data.articles.map((a) => (a.slug || '').toLowerCase()).concat(data.articles.map((a) => (a.url || '').toLowerCase()))
  );
  if (seen.has(slug.toLowerCase()) || (item.url && seen.has(item.url.toLowerCase()))) { console.log('  · 资讯已存在跳过:', item.url); return false; }
  const kw = seo.keywords ? String(seo.keywords).split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [];
  data.articles.push({
    slug,
    title: seo.title || item.title,
    summary: seo.summary || item.desc,
    body: seo.body || ('<p>' + (seo.summary || item.desc || '') + '</p>'),
    tags: kw,
    category: ROUTES[seo.category] ? ROUTES[seo.category].cat : '教程',
    keywords: seo.keywords || '',
    relatedTools: seo.relatedTools || [],
    updated: TODAY
  });
  data.updated = TODAY;
  fs.writeFileSync(listPath, JSON.stringify(data, null, 2));
  console.log('  ✓ 新增资讯 ->', base + '/article', '|', slug);
  return true;
}

/* §8.1 资讯 AI 问答长尾：从各站工具启发式批量生成问答式文章，覆盖百度/谷歌问答长尾。
 * 无 API_KEY 时走确定性启发式模板（与全站降级策略一致），幂等（slug+url 去重、同内容不重复写）。 */
const QA_TEMPLATES = [
  (t) => ({ q: '如何使用 ' + t.name + ' 进行批量处理？', a: '用 ' + t.name + ' 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能一次性提交。处理前用 2–3 条样本验证输出格式与速度，确认无误再扩展到全量，避免大批量出错后难以回滚；若支持并发，可逐步上调并发数观察稳定性。' }),
  (t) => ({ q: t.name + ' 支持哪些文件格式？', a: t.name + ' 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Markdown 及主流图片/表格格式。上传前请确认编码为 UTF-8、单文件不超过站点限制，避免解析失败；批量场景建议统一格式后再一次性导入。' }),
  (t) => ({ q: t.name + ' 免费版有哪些限制？', a: t.name + ' 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、并发数或导出格式。使用前在官网「定价」页核对当前套餐明细，按实际体量选择，避免生产环境触达上限中断。' }),
  (t) => ({ q: '如何在 ' + t.name + ' 中导出结果？', a: '处理完成后，' + t.name + ' 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。' })
];
function readCommonConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'common', 'config.json'), 'utf8')); } catch (e) { return {}; }
}
function genQaArticles() {
  const cfg = readCommonConfig();
  const crawl = cfg.crawl || {};
  if (crawl.qaEnabled === false) { console.log('[QA] qaEnabled=false，跳过问答长尾生成'); return 0; }
  const ratio = typeof crawl.qaRatio === 'number' ? crawl.qaRatio : 0.3;
  let added = 0;
  for (const key of Object.keys(ROUTES)) {
    const base = ROUTES[key].base;
    const dataPath = path.join(PUBLIC_DIR, base.replace(/^\//, ''), 'data', 'list.json');
    if (!fs.existsSync(dataPath)) continue;
    let tools = [];
    try { tools = (JSON.parse(fs.readFileSync(dataPath, 'utf8')).tools) || []; } catch (e) { continue; }
    if (!tools.length) continue;
    const n = Math.max(1, Math.round(tools.length * ratio));
    for (let i = 0; i < n && i < tools.length; i++) {
      const t = tools[i];
      if (!t || !t.name) continue;
      const tpl = QA_TEMPLATES[i % QA_TEMPLATES.length](t);
      const seo = {
        category: key,
        title: tpl.q,
        summary: tpl.a.slice(0, 60),
        keywords: (t.name + ',教程,问答'),
        body: '<p>' + tpl.a + '</p><p>相关工具：<a href="' + (t.url || '#') + '">' + t.name + '</a></p>',
        relatedTools: [t.name]
      };
      const item = { title: tpl.q, url: (t.url || '') + '#qa-' + i, desc: tpl.a };
      if (writeArticle(base, item, seo)) added++;
    }
  }
  return added;
}

/* ---------- 主流程 ---------- */
async function main() {
  console.log('=== 开始采集 (', TODAY, ') ===');
  if (!API_KEY) console.log('⚠ 未检测到 ZHIPU_API_KEY，本地规则 + 启发式分类（演示模式，仍走批量结构）');

  let items = [];
  items.push(...(await crawlGitHub().catch((e) => (console.warn(e.message), []))));
  items.push(...(await crawlHuggingFace().catch((e) => (console.warn(e.message), []))));
  items.push(...(await crawlProductHunt().catch((e) => (console.warn(e.message), []))));
  items.push(...(await crawlExtraRSS().catch((e) => (console.warn(e.message), []))));

  // 同批内 URL 去重
  const seen = new Set();
  items = items.filter((it) => {
    if (!it.url) return false;
    const n = it.url.replace(/\/+$/, '').toLowerCase();
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  console.log('采集去重后候选:', items.length, '条');

  // 违规过滤
  const safe = items.filter((it) => !isBlocked(it));
  const blocked = items.length - safe.length;
  if (blocked) console.log('✕ 违规过滤丢弃:', blocked, '条');
  items = safe;

  // 本地规则预分类（免 AI）
  const aiQueue = [];
  let localAdded = 0;
  for (const item of items) {
    const r = localRule(item);
    if (r) {
      if (writeToFolder(ROUTES[r.category].base, item, r)) localAdded++;
    } else {
      aiQueue.push(item);
    }
  }
  console.log('本地规则命中(免AI):', items.length - aiQueue.length, '条 | 待 AI 批量:', aiQueue.length, '条');

  // 模糊项批量 AI 分类
  const aiResults = await classifyBatch(aiQueue);
  let aiAdded = 0;
  for (const res of aiResults) {
    const item = res.item;
    if (!res || !res.safe) continue;
    let cat = ROUTES[res.category] ? res.category : null;
    if (!cat) { cat = leastFilledCat(); console.log('  · 未强匹配，负载均衡补入', ROUTES[cat].base, '(', item.name || item.url, ')'); }
    if (writeToFolder(ROUTES[cat].base, item, Object.assign({}, res, { category: cat }))) aiAdded++;
  }

  const added = localAdded + aiAdded;
  console.log('本次新增工具:', added, '条（本地', localAdded, '/ AI', aiAdded, '）');

  // ★ 资讯采集（与工具共用调度，复用本地规则 + 批量 AI，零额外运维）
  let articleAdded = 0;
  try {
    const aItems = await crawlArticles();
    const aSafe = aItems.filter((it) => !isBlocked(it));
    const aQueue = [];
    for (const it of aSafe) {
      const r = articleLocalRule(it);
      if (r && ROUTES[r.category]) {
        if (writeArticle(ROUTES[r.category].base, it, { category: r.category, title: it.title, summary: it.desc })) articleAdded++;
      } else aQueue.push(it);
    }
    const aRes = await classifyArticleBatch(aQueue);
    for (const res of aRes) {
      if (!res || !res.safe) continue;
      let cat = ROUTES[res.category] ? res.category : null;
      if (!cat) cat = leastFilledCat();
      if (writeArticle(ROUTES[cat].base, res.item, Object.assign({}, res, { category: cat }))) articleAdded++;
    }
  } catch (e) { console.warn('[资讯] 采集异常:', e.message); }
  console.log('本次新增资讯:', articleAdded, '篇');

  // ★ §8.1 问答长尾：启发式批量生成问答式文章（覆盖百度/谷歌问答长尾，幂等去重）
  let qaAdded = 0;
  try { qaAdded = genQaArticles(); } catch (e) { console.warn('[QA] 生成异常:', e.message); }
  articleAdded += qaAdded;
  console.log('本次新增问答长尾:', qaAdded, '篇');

  // 写运行计数，供 crawl.yml 判断是否提交（省构建额度）
  fs.writeFileSync(path.join(__dirname, '.last-run.json'), JSON.stringify({ added, articleAdded, ts: Date.now() }));

  if (added > 0 || articleAdded > 0) require('./build-sitemap'); // 重建全部 sitemap + 总索引（含资讯地图，幂等）
  else console.log('无新增内容，跳过 sitemap 重建');
  console.log('=== 采集完成 ===');
}

main().catch((e) => { console.error('采集流水线异常:', e); process.exit(1); });
