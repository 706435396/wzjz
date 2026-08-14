/* ============================================================
 * scripts/article-duplicate-check.js  ——  全文相似度检测 + 自动二次改写
 * ------------------------------------------------------------
 * 对应清单「一.1」：全局全文相似度检测，相似度 > 65% 自动二次 AI 改写，
 * 输出独立报告，避免 200 站内容同质化被搜索引擎判低质。
 * 流程：遍历所有子站工具简介 + 资讯正文 -> 同赛道两两 Jaccard 相似度 ->
 *       超阈值者用智谱「差异化改写」Prompt 二次生成 -> 增量写回（不丢其它字段）。
 * 无 API Key 时仅输出相似度报告，不改写（安全降级）。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { parseSites, readTools, readArticles, slugify, sim } = require('./_sites');
const { callLLM } = require('./_llm');

const THRESHOLD = 0.65;   // 相似度阈值（超过即改写）
const MODE = process.argv.includes('--rewrite'); // 是否真正改写（默认只报告）

function rewritePrompt(text, ctx) {
  return (
    '下面这段内容与其他页面相似度过高（>65%），存在被搜索引擎判低质重复的风险。\n' +
    '请在不改变事实的前提下，用不同句式、不同语序重新表述，突出 ' + (ctx || '实用价值') + '，禁止复制原句。\n' +
    '原文：' + (text || '') + '\n' +
    '仅输出改写后的纯文本（不超过原长度）。'
  );
}

async function run() {
  const sites = parseSites();
  console.log('扫描子站:', sites.length, '| 改写模式:', MODE ? '开' : '仅报告');
  const report = { total: 0, overThreshold: 0, rewritten: 0, pairs: [] };

  for (const site of sites) {
    const t = readTools(site.abs);
    const a = readArticles(site.abs);
    let changed = 0; // 本站实际改写条数：为 0 时不写文件，避免制造假 diff 浪费 CF 构建额度
    const texts = [];
    if (t) t.tools.forEach((x, i) => texts.push({ kind: 'tool', idx: i, data: t, text: x.desc || x.name || '' }));
    if (a) a.articles.forEach((x, i) => texts.push({ kind: 'article', idx: i, data: a, text: (x.summary || '') + ' ' + (x.body || '') }));

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const s = sim(texts[i].text, texts[j].text);
        report.total++;
        if (s > THRESHOLD) {
          report.overThreshold++;
          report.pairs.push({ site: site.domain, a: short(texts[i].text), b: short(texts[j].text), sim: +s.toFixed(2) });
          if (MODE && callLLM) {
            const target = texts[j];
            const r = await callLLM(rewritePrompt(target.text, site.domain), { temperature: 0.7, maxTokens: 300 });
            if (r.ok && r.text.trim()) {
              if (target.kind === 'tool') target.data.tools[target.idx].desc = r.text.trim().slice(0, 80);
              else target.data.articles[target.idx].summary = r.text.trim().slice(0, 80);
              report.rewritten++;
              changed++;
            }
          }
        }
      }
    }
    // 写回：仅「改写模式 + 本站确有改动」才落盘，零改动不碰文件（保持幂等，不触发多余部署）
    if (MODE && changed > 0) {
      if (t) fs.writeFileSync(path.join(site.abs, 'data', 'list.json'), JSON.stringify(t, null, 2));
      if (a) fs.writeFileSync(path.join(site.abs, 'article', 'list.json'), JSON.stringify(a, null, 2));
      console.log('  ↻', site.domain, '改写', changed, '条并已写回');
    }
  }

  const out = path.join(__dirname, '.dup-report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('相似度检测完成 | 总对比', report.total, '| 超阈值', report.overThreshold, '| 改写', report.rewritten);
  console.log('报告已写入', out);
  if (!MODE && report.overThreshold > 0) console.log('提示：加 --rewrite 参数可自动二次 AI 改写');
}

function short(s) { return String(s || '').replace(/\s+/g, ' ').slice(0, 40); }

/* 注意：入口函数切勿命名为 process —— 函数声明会提升并遮蔽 Node 全局 process，
 * 导致 process.argv / process.exit 全部失效（已踩坑并修正为 run）。 */
run().catch((e) => { console.error('去重检测异常:', e); process.exit(1); });
