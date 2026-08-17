/* ============================================================
 * scripts/gen-articles-ai.js —— 用智谱(ZHIPU)大模型批量生成英文教程/指南文章
 * ------------------------------------------------------------
 * 输入：scripts/niches-100.json（站点清单：dir/name/category/kw）
 *       各站 public/<dir>/data/list.json（已有工具名，用于 relatedTools 与主题）
 * 输出：public/<dir>/article/list.json  { updated, articles:[{slug,title,summary,body,tags,category,keywords,relatedTools,updated}] }
 *
 * 用法：
 *   node scripts/gen-articles-ai.js --limit 2                 # 试点前 2 站（dry-run 打印）
 *   node scripts/gen-articles-ai.js --limit 2 --apply          # 试点写入
 *   node scripts/gen-articles-ai.js --apply                    # 全部站点（跳过已有文章的站）
 *
 * 环境变量：
 *   ZHIPU_API_KEY  必填
 *   ZHIPU_MODEL    可选，默认 glm-4-flash
 *   PER_SITE       每站生成文章数（默认 4）
 *   CONCURRENCY    并发数（默认 4）
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const NICHE_FILE = path.join(__dirname, 'niches-100.json');

const API_KEY = process.env.ZHIPU_API_KEY;
const MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash';
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

const PER_SITE = Number(process.env.PER_SITE || 4);
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ---------- 调用 Zhipu ---------- */
async function callZhipu(system, user, maxTokens) {
  if (!API_KEY) throw new Error('ZHIPU_API_KEY 未设置');
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.6,
      max_tokens: maxTokens || 4000
    })
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error('HTTP ' + resp.status + ' ' + txt.slice(0, 200));
  }
  const j = await resp.json();
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
}

/* ---------- 解析模型输出（容忍 ```json 代码块） ---------- */
function parseArticles(text) {
  let s = String(text || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) throw new Error('返回不是数组');
    return arr;
  } catch (e) {
    // 容错：模型偶尔会在字符串字面量里塞裸控制字符（换行/tab），
    // 清掉 0x00-0x1F 后再试一次（标签外的换行对 HTML 正文无影响）
    const cleaned = s.replace(/[\u0000-\u001F]/g, ' ');
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) throw new Error('返回不是数组');
    return arr;
  }
}

function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 70) || ('article-' + Date.now());
}

function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, '').trim(); }

/* ---------- 校验单篇 ---------- */
function validateArticle(raw, siteDomain, toolNames, seenSlugs) {
  if (!raw || typeof raw !== 'object') return null;
  let title = String(raw.title || '').trim();
  let summary = String(raw.summary || '').trim();
  let body = String(raw.body || '').trim();
  let slug = String(raw.slug || '').trim().toLowerCase();
  if (!title || title.length > 90) return null;
  if (!body || !/<(p|h2|h3|ul|ol|li)/i.test(body)) return null; // body 必须是 HTML
  if (!slug) slug = slugify(title);
  if (!/^[a-z0-9-]+$/.test(slug)) slug = slugify(title);
  if (seenSlugs.has(slug)) slug = slug + '-' + (seenSlugs.size + 1);
  seenSlugs.add(slug);
  const tags = Array.isArray(raw.tags) ? raw.tags.map(x => String(x).trim()).filter(Boolean).slice(0, 6) : [];
  let related = Array.isArray(raw.relatedTools) ? raw.relatedTools.map(x => String(x).trim()).filter(Boolean) : [];
  // 仅保留本站真实存在的工具名，最多 3 个
  const lowerTools = toolNames.map(t => t.toLowerCase());
  related = related.filter(r => lowerTools.includes(r.toLowerCase())).slice(0, 3);
  if (!related.length && toolNames.length) related = [toolNames[0]];
  const keywords = String(raw.keywords || '').trim() || (tags.join(', '));
  const category = String(raw.category || 'Guide').trim() || 'Guide';
  return {
    slug,
    title,
    summary: summary || stripHtml(body).slice(0, 160),
    body,
    tags: tags.length ? tags : [category],
    category,
    keywords,
    relatedTools: related,
    updated: new Date().toISOString().slice(0, 10)
  };
}

function buildPrompt(niche, toolNames) {
  const toolList = toolNames.length ? toolNames.join(', ') : '(no specific tools)';
  const system = 'You are an expert SEO content writer for an English-language tools directory. ' +
    'You write original, helpful, non-promotional how-to guides and comparisons. ' +
    'All output must be in English. You never invent fake products. You output valid JSON only.';
  const user =
    `Site topic: "${niche.name}" (category: ${niche.category}; keywords: ${(niche.kw || []).join(', ')}). ` +
    `This site lists these real tools: ${toolList}.\n\n` +
    `Write ${PER_SITE} original English articles for this niche. Each article should be a practical ` +
    `how-to guide, tutorial, or comparison that a user of these tools would search for. ` +
    `Each body must be valid HTML using <h2>, <p> (and optionally <ul>/<li>) tags, 300-600 words, ` +
    `genuinely useful (no fluff, no repeating the title). Include 1-2 internal links to the site ` +
    `homepage using <a href="https://${niche.domain}/">...</a> where natural.\n\n` +
    `Return ONLY a JSON array (no prose, no markdown fences), each item exactly:\n` +
    `{"slug":"kebab-case-english-slug","title":"English title <=90 chars","summary":"1-sentence English summary","` +
    `body":"<h2>..</h2><p>..</p>...","tags":["tag1","tag2"],"category":"Guide or comparison","` +
    `"keywords":"comma,separated,seo,keywords","relatedTools":["RealToolName1"]}\n\n` +
    `Use ONLY real tool names from the list above for relatedTools. Output must be parseable JSON.`;
  return { system, user };
}

/* ---------- 单站处理 ---------- */
async function processNiche(niche, apply) {
  const dir = path.join(PUBLIC_DIR, niche.dir);
  const articlePath = path.join(dir, 'article', 'list.json');
  if (!fs.existsSync(dir)) { console.log('· skip（目录不存在）:', niche.dir); return { ok: false, count: 0 }; }

  // 已有文章则跳过（保留 sitemapgen/txtclean 等历史内容）
  if (fs.existsSync(articlePath)) {
    try {
      const ex = loadJSON(articlePath);
      const exArr = Array.isArray(ex) ? ex : (ex.articles || []);
      if (exArr.length) { console.log('· skip（已有文章）:', niche.domain, exArr.length, '篇'); return { ok: false, count: 0 }; }
    } catch (e) { /* 文件损坏则重写 */ }
  }

  // 读该站真实工具名
  let toolNames = [];
  const dataPath = path.join(dir, 'data', 'list.json');
  if (fs.existsSync(dataPath)) {
    try {
      const d = loadJSON(dataPath);
      const tools = Array.isArray(d) ? d : (d.tools || []);
      toolNames = tools.map(t => t.name).filter(Boolean).slice(0, 12);
    } catch (e) {}
  }

  let attempt = 0, arts = null, err = null;
  while (attempt < 3 && !arts) {
    attempt++;
    try {
      const { system, user } = buildPrompt(niche, toolNames);
      const text = await callZhipu(system, user, 4200);
      const raw = parseArticles(text);
      const seen = new Set();
      const valid = [];
      for (const r of raw) {
        const a = validateArticle(r, niche.domain, toolNames, seen);
        if (a) valid.push(a);
      }
      if (!valid.length) throw new Error('解析/校验全失败');
      arts = valid;
    } catch (e) { err = e.message; await sleep(700); }
  }

  if (!arts) { console.log('✗', niche.domain, '失败:', err); return { ok: false, count: 0 }; }

  if (apply) {
    try {
      const out = { updated: new Date().toISOString().slice(0, 10), articles: arts };
      fs.mkdirSync(path.dirname(articlePath), { recursive: true });
      fs.writeFileSync(articlePath, JSON.stringify(out, null, 2) + '\n', 'utf8');
    } catch (e) {
      console.log('✗', niche.domain, '写入失败:', e.message);
      return { ok: false, count: 0 };
    }
  }
  console.log((apply ? '✓ ' : '· '), niche.domain, apply ? '写入' : '待写入', arts.length, '篇');
  return { ok: true, count: arts.length };
}

/* ---------- 并发池 ---------- */
async function runPool(items, apply) {
  let i = 0, done = 0, total = 0, skipped = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const r = await processNiche(items[idx], apply);
      done++; total += r.count; if (!r.ok) skipped++;
    }
  }
  const ws = [];
  for (let k = 0; k < Math.min(CONCURRENCY, items.length); k++) ws.push(worker());
  await Promise.all(ws);
  return { done: items.length, total, skipped };
}

/* ---------- main ---------- */
async function main() {
  if (!API_KEY) { console.error('✗ 缺少 ZHIPU_API_KEY'); process.exit(1); }
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : Infinity;

  let niches = loadJSON(NICHE_FILE);
  if (isFinite(limit)) niches = niches.slice(0, limit);
  const onlyIdx = argv.indexOf('--only');
  if (onlyIdx >= 0) {
    const onlyDir = argv[onlyIdx + 1];
    niches = niches.filter(n => n.dir === onlyDir || n.dir.endsWith('/' + onlyDir) || n.domain === onlyDir);
    if (!niches.length) { console.error('✗ --only 未匹配到站点:', onlyDir); process.exit(1); }
  }

  console.log(`模型=${MODEL} | 并发=${CONCURRENCY} | 每站=${PER_SITE} | 站点=${niches.length} | ${apply ? '写入模式' : 'dry-run（加 --apply 写入）'}\n`);
  const t0 = Date.now();
  const { done, total, skipped } = await runPool(niches, apply);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n— 完成：处理 ${done} 站，生成 ${total} 篇，跳过 ${skipped} 站，用时 ${sec}s —`);
  if (!apply) console.log('（dry-run 未写盘；确认无误后加 --apply）');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
