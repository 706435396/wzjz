/* ============================================================
 * scripts/gen-tools-ai.js —— 用智谱(ZHIPU)大模型批量生成英文工具清单
 * ------------------------------------------------------------
 * 输入：scripts/niches-100.json（站点清单：domain/dir/name/category/kw）
 * 输出：public/<dir>/data/list.json  { updated, tools:[{name,url,desc,category,tags}] }
 * 随后接 enrich-detail.js --apply 离线补 meta/pros/cons/usage。
 *
 * 用法：
 *   node scripts/gen-tools-ai.js --limit 3                 # 试点前 3 站（dry-run 打印）
 *   node scripts/gen-tools-ai.js --limit 3 --apply          # 试点写入
 *   node scripts/gen-tools-ai.js --site aibg.72tool.com --apply
 *   node scripts/gen-tools-ai.js --apply                    # 全部 100 站
 *
 * 环境变量：
 *   ZHIPU_API_KEY  必填（从环境变量读，不入库、不打印）
 *   ZHIPU_MODEL    可选，默认 glm-4-flash
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const COMMON_DIR = path.join(PUBLIC_DIR, 'common');
const NICHE_FILE = path.join(__dirname, 'niches-100.json');

const API_KEY = process.env.ZHIPU_API_KEY;
const MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash';
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

const PER_NICHE = Number(process.env.PER_NICHE || 12); // 每站生成工具数上限
const CONCURRENCY = Number(process.env.CONCURRENCY || 4); // 并发数

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ---------- 调用 Zhipu ---------- */
async function callZhipu(system, user, maxTokens) {
  if (!API_KEY) throw new Error('ZHIPU_API_KEY 未设置（请 export 后运行）');
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.3,
      max_tokens: maxTokens || 1500
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
function parseTools(text) {
  let s = String(text || '').trim();
  // 去 markdown 代码块
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // 取第一个 [ 到最后一个 ]
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  const arr = JSON.parse(s);
  if (!Array.isArray(arr)) throw new Error('返回不是数组');
  return arr;
}

/* ---------- 校验单个工具 ---------- */
function hostKey(url) {
  try {
    const u = new URL(url);
    let h = u.hostname.toLowerCase();
    if (h.startsWith('www.')) h = h.slice(4);
    return h;
  } catch (e) { return url; }
}

function validateTool(raw, category) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim();
  const url = String(raw.url || '').trim();
  const desc = String(raw.desc || '').trim();
  if (!name || name.length > 60) return null;
  if (!/^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) return null; // 仅接受合法 http(s) URL
  const tags = Array.isArray(raw.tags) ? raw.tags.map(x => String(x).trim()).filter(Boolean).slice(0, 6) : [];
  return {
    name: name,
    originName: name,
    url: url,
    desc: desc || name,
    category: String(raw.category || category || 'Tools').trim(),
    tags: tags.length ? tags : [category || 'tools']
  };
}

function buildPrompt(niche) {
  const system = 'You are a meticulous editor for a tools directory. You only list real, verifiable, currently-existing products. You never invent URLs. You output valid JSON only.';
  const user =
    `For the niche "${niche.name}" (category: ${niche.category}; sample keywords: ${(niche.kw || []).join(', ')}), ` +
    `list up to ${PER_NICHE} REAL, well-known, English-language software / AI tools that fit this niche. ` +
    `Each must be a genuine product with a real public homepage URL (prefer the official site). ` +
    `Vary the tools; prefer popular and established ones; no duplicates.\n\n` +
    `Return ONLY a JSON array (no prose, no markdown fences), each item exactly:\n` +
    `{"name":"tool name","url":"https://example.com","desc":"one concise English sentence (<=160 chars)","category":"${niche.category}","tags":["tag1","tag2"]}\n\n` +
    `If fewer than ${PER_NICHE} genuine tools exist, return as many as you can. Output must be parseable JSON.`;
  return { system, user };
}

/* ---------- 单站处理 ---------- */
async function processNiche(niche, apply) {
  const dir = path.join(PUBLIC_DIR, niche.dir);
  const dataPath = path.join(dir, 'data', 'list.json');
  if (!fs.existsSync(dir)) {
    console.log('· skip（目录不存在）:', niche.dir);
    return { ok: false, count: 0 };
  }

  let attempt = 0, tools = null, err = null;
  while (attempt < 3 && !tools) {
    attempt++;
    try {
      const { system, user } = buildPrompt(niche);
      const text = await callZhipu(system, user, 1600);
      const raw = parseTools(text);
      const valid = [];
      const seen = new Set();
      for (const r of raw) {
        const t = validateTool(r, niche.category);
        if (!t) continue;
        const key = hostKey(t.url); // 按域名去重（忽略 www. 与路径），避免同站多页重复
        if (seen.has(key)) continue;
        seen.add(key);
        valid.push(t);
      }
      if (!valid.length) throw new Error('解析为空/校验全失败');
      tools = valid;
    } catch (e) {
      err = e.message;
      await sleep(600);
    }
  }

  if (!tools) {
    console.log('✗', niche.domain, '生成失败:', err);
    return { ok: false, count: 0 };
  }

  if (apply) {
    const data = { updated: new Date().toISOString().slice(0, 10), tools };
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
  console.log((apply ? '✓ ' : '· '), niche.domain, apply ? '写入' : '待写入', tools.length, '个工具');
  return { ok: true, count: tools.length };
}

/* ---------- 并发池 ---------- */
async function runPool(items, apply) {
  let i = 0, done = 0, total = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const r = await processNiche(items[idx], apply);
      done++; total += r.count;
    }
  }
  const ws = [];
  for (let k = 0; k < Math.min(CONCURRENCY, items.length); k++) ws.push(worker());
  await Promise.all(ws);
  return { done: items.length, total };
}

/* ---------- main ---------- */
async function main() {
  if (!API_KEY) {
    console.error('✗ 缺少环境变量 ZHIPU_API_KEY。请先 export ZHIPU_API_KEY=... 再运行。');
    process.exit(1);
  }
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : Infinity;
  const siteIdx = argv.indexOf('--site');
  const siteDomain = siteIdx >= 0 ? argv[siteIdx + 1] : null;

  let niches = loadJSON(NICHE_FILE);
  if (siteDomain) niches = niches.filter(n => n.domain === siteDomain);
  if (!isFinite(limit)) niches = niches.slice(0, limit);

  console.log(`模型=${MODEL} | 并发=${CONCURRENCY} | 每站≤${PER_NICHE} | 站点=${niches.length} | ${apply ? '写入模式' : 'dry-run（加 --apply 写入）'}\n`);

  const t0 = Date.now();
  const { done, total } = await runPool(niches, apply);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n— 完成：处理 ${done} 站，生成 ${total} 个工具，用时 ${sec}s —`);
  if (!apply) console.log('（dry-run 未写盘；确认无误后加 --apply）');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
