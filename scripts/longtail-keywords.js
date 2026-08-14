/* ============================================================
 * scripts/longtail-keywords.js  ——  长尾问答词批量生成（提升百度问答流量）
 * ------------------------------------------------------------
 * 对应清单「一.2」：为每个工具、每篇资讯用智谱批量生成 10 个问答式长尾关键词，
 * 写入数据文件的 longtail 字段，前端自动注入页面 title / meta / 正文 FAQ / alt，
 * 提升百度「问答」类长尾流量。
 * 批量聚合调用（每批 30 个），省 API 次数；无 Key 时写占位长尾词（不阻塞）。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { parseSites, readTools, readArticles } = require('./_sites');
const { callLLM, extractJSON } = require('./_llm');

const BATCH = 30;

async function genForSite(site) {
  const items = [];
  const t = readTools(site.abs);
  const a = readArticles(site.abs);
  if (t) t.tools.forEach((x, i) => items.push({ kind: 'tool', idx: i, store: t, name: x.name, text: x.desc || x.name }));
  if (a) a.articles.forEach((x, i) => items.push({ kind: 'article', idx: i, store: a, name: x.title, text: x.summary || x.title }));
  if (!items.length) return;

  let changed = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    const numbered = chunk.map((it, k) => (i + k + 1) + '. ' + (it.name || '') + '：' + (it.text || '').slice(0, 40)).join('\n');
    const prompt =
      '你是 SEO 长尾词专家。为下面 ' + chunk.length + ' 个工具/资讯各生成 10 个「问答式」长尾关键词（如"XX 怎么用""XX 和 YY 哪个好""XX 收费吗"），' +
      '中文、口语化、贴合搜索意图。只输出一个 JSON 数组（顺序与编号一致）：\n' +
      '[{"longtail":["词1","词2",...,"词10"]}]\n\n' + numbered;
    const r = await callLLM(prompt, { temperature: 0.6, maxTokens: 1200 });
    const arr = r.ok ? extractJSON(r.text) : null;

    chunk.forEach((it, k) => {
      // 注意：空数组 [] 在 JS 里是 truthy，写成 `x.longtail || 默认值` 会永远拿到 []，
      //       导致 AI 失败时长尾词全空（已踩坑）。必须显式判断长度。
      const fromAI = Array.isArray(arr) && arr[k] && Array.isArray(arr[k].longtail) ? arr[k].longtail : [];
      const lt = uniq(
        (fromAI.length ? fromAI : defaultLongtail(it.name))
          .map((s) => String(s || '').trim())
          .filter(Boolean)
      ).slice(0, 10);
      if (!lt.length) return;

      const key = it.kind === 'tool' ? 'tools' : 'articles';
      const row = it.store[key][it.idx];
      row.longtail = lt;
      // keywords 合并去重：原实现用字符串直接拼 ','，无 Key 时会产出 ","、
      // 且每次重跑都无限追加重复词（已踩坑）。改为集合合并后重建。
      row.keywords = uniq(
        String(row.keywords || '').split(',').concat(lt.slice(0, 3))
          .map((s) => s.trim()).filter(Boolean)
      ).join(',');
      changed++;
    });
  }

  // 幂等写入：内容无变化则不落盘，避免制造假 diff 触发多余部署
  let wrote = 0;
  if (t) wrote += writeIfChanged(path.join(site.abs, 'data', 'list.json'), t);
  if (a) wrote += writeIfChanged(path.join(site.abs, 'article', 'list.json'), a);
  console.log('✓', site.domain, '| 生成长尾词', changed, '条', wrote ? '' : '(内容无变化，未写盘)');
}

function uniq(list) { return Array.from(new Set(list)); }

function writeIfChanged(file, obj) {
  const next = JSON.stringify(obj, null, 2);
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (prev.trim() === next.trim()) return 0;
  fs.writeFileSync(file, next);
  return 1;
}

function defaultLongtail(name) {
  const n = name || '该工具';
  return [n + ' 是什么', n + ' 怎么用', n + ' 收费吗', n + ' 好用吗', n + ' 和同类比', n + ' 使用教程', n + ' 下载', n + ' 常见问题', n + ' 推荐', n + ' 评测'];
}

async function main() {
  const sites = parseSites();
  for (const s of sites) await genForSite(s).catch((e) => console.warn('跳过', s.domain, e.message));
  console.log('长尾词生成完成（前端自动注入 title/meta/FAQ/alt）');
  require('./build-sitemap'); // 重建 sitemap（幂等）
}

main().catch((e) => { console.error('长尾词异常:', e); process.exit(1); });
