/* ============================================================
 * scripts/fill-detail-ai.js —— 用智谱(ZHIPU)为工具批量补 detail 长描述
 * ------------------------------------------------------------
 * 输入：各站 public/tools/<dir>/data/list.json（tools:[{name,desc,category,...}]）
 * 输出：就地写回，为 detail 为空或偏短（<150 词）的工具补 200-400 词英文长描述
 *
 * 前端 app.js 详情页会把 detail 按 \n\n 分段渲染为 <p>，故此处生成纯文本即可。
 *
 * 用法：
 *   node scripts/fill-detail-ai.js --limit 2                 # 试点前 2 站（dry-run）
 *   node scripts/fill-detail-ai.js --limit 2 --apply          # 试点写入
 *   node scripts/fill-detail-ai.js --apply                    # 全部站点
 *
 * 环境变量：
 *   ZHIPU_API_KEY  必填
 *   ZHIPU_MODEL    可选，默认 glm-4-flash
 *   CONCURRENCY    并发数（默认 4）
 *   MIN_WORDS      低于此词数视为需重填（默认 150）
 *   CHUNK          每批工具数（默认 6，避免单次调用截断）
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const API_KEY = process.env.ZHIPU_API_KEY;
const MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash';
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const MIN_WORDS = Number(process.env.MIN_WORDS || 150);
const CHUNK = Number(process.env.CHUNK || 6);

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function wordCount(s) { return (String(s || '').trim().match(/\S+/g) || []).length; }

async function callZhipu(system, user, maxTokens) {
  if (!API_KEY) throw new Error('ZHIPU_API_KEY 未设置');
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: 0.5,
          max_tokens: maxTokens || 3500
        })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        // 429 限流：退避后重试
        if (resp.status === 429) { lastErr = new Error('HTTP 429 (限流)'); await sleep(2500 + attempt * 2000); continue; }
        throw new Error('HTTP ' + resp.status + ' ' + txt.slice(0, 200));
      }
      const j = await resp.json();
      return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    } catch (e) {
      lastErr = e;
      if (String(e.message).includes('429')) { await sleep(2500 + attempt * 2000); continue; }
      await sleep(800);
    }
  }
  throw lastErr || new Error('callZhipu 重试耗尽');
}

function parseDetails(text) {
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
    // 容错：清理 JSON 字符串字面量里的裸控制字符后重试
    const cleaned = s.replace(/[\u0000-\u001F]/g, ' ');
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) throw new Error('返回不是数组');
    return arr;
  }
}

function buildPrompt(siteName, tools) {
  const list = tools.map(t => `- name: "${t.name}" | category: ${t.category || ''} | short desc: ${t.desc || ''}`).join('\n');
  const system = 'You are a professional SaaS/AI tools copywriter. You write original, helpful, non-spammy ' +
    'English product descriptions of 200-400 words each. Output valid JSON only. No HTML, no markdown. ' +
    'Plain text with blank-line paragraph breaks.';
  const user =
    `The website "${siteName}" lists these tools. For EACH tool, write a DETAILED English description ` +
    `of 200-400 words (do NOT write shorter than 200 words). Cover: what it does, key features, ` +
    `who it is for, and a brief pros/limitations note. Use plain text only (no HTML tags, no markdown). ` +
    `Separate paragraphs with a blank line.\n\n` +
    `Tools:\n${list}\n\n` +
    `Return ONLY a JSON array (no prose), each item exactly:\n` +
    `{"name":"<exact tool name as given>","detail":"<200-400 word English description in plain text>"}\n\n` +
    `You MUST include every tool from the list using the exact name, each detail 200-400 words. Output must be parseable JSON.`;
  return { system, user };
}

function chunkify(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function fillChunk(siteName, chunk, origTools, filledCount) {
  let attempt = 0, err = null;
  while (attempt < 3) {
    attempt++;
    try {
      const { system, user } = buildPrompt(siteName, chunk);
      const text = await callZhipu(system, user, 1800 + chunk.length * 420);
      const raw = parseDetails(text);
      // 精确匹配表（小写）
      const byName = {};
      // 模糊匹配表：原工具名作为子串的（应对模型返回 name 带后缀/前缀）
      const byFuzzy = [];
      for (const r of raw) {
        if (!r || !r.name) continue;
        const wc = wordCount(r.detail);
        if (wc < 80) continue; // 词数过低视为无效
        const k = String(r.name).trim().toLowerCase();
        byName[k] = r.detail;
        byFuzzy.push({ key: k, detail: r.detail });
      }
      let added = 0;
      for (const t of chunk) {
        const key = String(t.name).trim().toLowerCase();
        if (byName[key]) { t.detail = byName[key]; added++; continue; }
        // 后备：模型返回名包含原工具名（或反之）
        const hit = byFuzzy.find(f => f.key.includes(key) || key.includes(f.key));
        if (hit) { t.detail = hit.detail; added++; }
      }
      if (!added) throw new Error('模型未返回匹配内容');
      return added;
    } catch (e) { err = e.message; await sleep(1000); }
  }
  throw new Error(err || 'chunk 失败');
}

async function processSite(dir, siteName, apply) {
  const dataPath = path.join(dir, 'data', 'list.json');
  if (!fs.existsSync(dataPath)) return { ok: false, count: 0, skip: true };

  let data, tools;
  try {
    data = loadJSON(dataPath);
    tools = Array.isArray(data) ? data : (data.tools || []);
  } catch (e) { console.log('· skip（读失败）:', dir, e.message); return { ok: false, count: 0, skip: true }; }

  const need = tools.filter(t => wordCount(t.detail) < MIN_WORDS);
  if (!need.length) { console.log('· skip（已填充）:', siteName); return { ok: false, count: 0, skip: true }; }

  const chunks = chunkify(need, CHUNK);
  let total = 0, failed = false;
  if (apply) {
    try {
      for (const ch of chunks) {
        total += await fillChunk(siteName, ch, tools, total);
      }
      const out = Array.isArray(data) ? tools : Object.assign({}, data, { tools });
      fs.writeFileSync(dataPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
    } catch (e) {
      console.log('✗', siteName, '写入失败:', e.message);
      return { ok: false, count: total };
    }
  } else {
    // dry-run：仅调用不写盘
    try {
      for (const ch of chunks) total += await fillChunk(siteName, ch, tools, total);
    } catch (e) { failed = true; console.log('✗', siteName, '生成失败:', e.message); }
  }
  console.log((apply ? '✓ ' : '· '), siteName, apply ? '填充' : '待填充', total, '个', failed ? '(部分失败)' : '');
  return { ok: !failed, count: total };
}

async function runPool(dirs, apply) {
  let i = 0, done = 0, total = 0, skipped = 0;
  async function worker() {
    while (i < dirs.length) {
      const idx = i++;
      const r = await processSite(dirs[idx].dir, dirs[idx].name, apply);
      done++; total += r.count; if (r.skip || !r.ok) skipped++;
    }
  }
  const ws = [];
  for (let k = 0; k < Math.min(CONCURRENCY, dirs.length); k++) ws.push(worker());
  await Promise.all(ws);
  return { done: dirs.length, total, skipped };
}

async function main() {
  if (!API_KEY) { console.error('✗ 缺少 ZHIPU_API_KEY'); process.exit(1); }
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : Infinity;
  const onlyIdx = argv.indexOf('--only');

  const toolsRoot = path.join(PUBLIC_DIR, 'tools');
  const dirs = [];
  for (const d of fs.readdirSync(toolsRoot)) {
    const dp = path.join(toolsRoot, d);
    if (fs.statSync(dp).isDirectory() && fs.existsSync(path.join(dp, 'data', 'list.json'))) {
      dirs.push({ dir: dp, name: d + '.72tool.com' });
    }
  }
  let picked = dirs;
  if (isFinite(limit)) picked = dirs.slice(0, limit);
  if (onlyIdx >= 0) {
    const onlyDir = argv[onlyIdx + 1];
    picked = dirs.filter(x => x.name === onlyDir + '.72tool.com' || x.dir.endsWith('/' + onlyDir) || x.dir === onlyDir);
    if (!picked.length) { console.error('✗ --only 未匹配到站点:', onlyDir); process.exit(1); }
  }

  console.log(`模型=${MODEL} | 并发=${CONCURRENCY} | 每批=${CHUNK} | 最短=${MIN_WORDS}词 | 站点=${picked.length} | ${apply ? '写入模式' : 'dry-run（加 --apply 写入）'}\n`);
  const t0 = Date.now();
  const { done, total, skipped } = await runPool(picked, apply);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n— 完成：处理 ${done} 站，填充 ${total} 个工具 detail，跳过 ${skipped} 站，用时 ${sec}s —`);
  if (!apply) console.log('（dry-run 未写盘；确认无误后加 --apply）');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
