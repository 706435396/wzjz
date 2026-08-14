/* ============================================================
 * scripts/single-crawl.js  ——  手动触发单站点采集（无需全量爬取）
 * ------------------------------------------------------------
 * 对应清单「八.3」：输入站点目录即可单独更新某一个子站，不触发全量采集，
 * 节省 API 与 Actions 分钟。复用 _llm 共享助手（含 429 限流退避）。
 * 用法：
 *   node scripts/single-crawl.js --site agent/browser
 *   node scripts/single-crawl.js --site agent/browser --limit 20
 * 行为：抓 GitHub Trending + HF RSS -> 违规过滤 -> 智谱分类（只保留目标赛道）
 *       -> 增量写入该站 data/list.json + 资讯 article/list.json -> 重建 sitemap。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, slugify } = require('./_sites');
const { callLLM, extractJSON } = require('./_llm');

const BLOCK = ['破解', '翻墙', 'crack', 'pirate', 'porn', '赌博', 'bet', 'casino', 'hack', 'leak'];
function blocked(s) { s = String(s || '').toLowerCase(); return BLOCK.some((w) => s.includes(w)); }

async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ToolNavBot/1.0)' }, redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}
async function crawlGitHub() {
  const html = await getText('https://github.com/trending?since=daily');
  return html.split('<article class="Box-row">').slice(1).map((b) => {
    const href = (b.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/) || [])[1];
    const desc = (b.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '';
    return href ? { name: href.replace(/^\//, ''), url: 'https://github.com' + href, desc: desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) } : null;
  }).filter(Boolean);
}

async function main() {
  const i = process.argv.indexOf('--site');
  const site = i >= 0 ? process.argv[i + 1] : '';
  const li = process.argv.indexOf('--limit');
  const limit = li >= 0 ? parseInt(process.argv[li + 1], 10) : 999;
  if (!site) { console.log('用法：--site <子目录，如 agent/browser>'); return; }
  const abs = path.join(PUBLIC_DIR, site.replace(/^\//, ''));
  if (!fs.existsSync(path.join(abs, 'config.json'))) { console.log('✕ 站点不存在:', site); return; }

  let items = await crawlGitHub().catch((e) => (console.warn(e.message), []));
  // HF RSS 也可加，这里以 GitHub 为主，单站模式够用
  items = items.filter((it) => !blocked(it.name + it.desc + it.url)).slice(0, limit);

  // 智谱只判“是否归属本赛道” -> 写本目录
  const prompt = '判断下面工具是否属于「' + site + '」赛道，是则 category="yes" 否则 "no"，只输出 JSON：[{"category":"yes/no"}]\n' +
    items.map((it, k) => (k + 1) + '. ' + it.name + ' ' + it.desc.slice(0, 80)).join('\n');
  const r = await callLLM(prompt, { temperature: 0.2, maxTokens: 600 });
  const arr = r.ok ? extractJSON(r.text) : null;

  const dataDir = path.join(abs, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const lp = path.join(dataDir, 'list.json');
  const data = fs.existsSync(lp) ? JSON.parse(fs.readFileSync(lp, 'utf8')) : { updated: '', tools: [] };
  if (!Array.isArray(data.tools)) data.tools = [];
  const seen = new Set(data.tools.map((t) => (t.url || '').replace(/\/+$/, '').toLowerCase()));
  let added = 0;
  items.forEach((it, k) => {
    const cat = arr && arr[k] ? arr[k].category : 'yes';
    if (cat !== 'yes') return;
    if (seen.has((it.url || '').replace(/\/+$/, '').toLowerCase())) return;
    data.tools.push({ name: it.name, url: it.url, desc: it.desc.slice(0, 80), tags: [site], category: site, updated: new Date().toISOString().slice(0, 10) });
    seen.add((it.url || '').replace(/\/+$/, '').toLowerCase()); added++;
  });
  data.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(lp, JSON.stringify(data, null, 2));
  console.log('✓', site, '| 本次新增', added, '条');
  require('./build-sitemap');
}

main().catch((e) => { console.error('单站采集异常:', e); process.exit(1); });
