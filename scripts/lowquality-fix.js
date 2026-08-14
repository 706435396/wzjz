/* ============================================================
 * scripts/lowquality-fix.js —— 低质站点整改清单（§5.2）
 * ------------------------------------------------------------
 * ads-audit.js 现在在 ads-blocked.json 的 detail 里写出 remediation（还差多少内容）。
 * 本脚本汇总被屏蔽站点，按「整改成本」升序（差得最少的排前面，先补最容易达标的），
 * 输出可勾选的整改清单 Markdown，并归档到 data/reports/。纯本地、零依赖。
 *
 * 用法：
 *   node scripts/lowquality-fix.js          # 打印 + 归档清单
 *   node scripts/lowquality-fix.js --print  # 仅打印不写盘
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR } = require('./_sites');

const argv = process.argv.slice(2);
const PRINT_ONLY = argv.includes('--print');
const BLOCK_PATH = path.join(PUBLIC_DIR, 'common', 'ads-blocked.json');
const REPORT_DIR = path.join(process.cwd(), 'data', 'reports');

function readJSON(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }

function main() {
  const blocked = readJSON(BLOCK_PATH, null);
  if (!blocked || !blocked.detail) { console.log('未找到 ads-blocked.json 或结构为空，请先跑 node scripts/ads-audit.js'); return; }
  const detail = blocked.detail || {};
  const hosts = blocked.hosts || Object.keys(detail).filter((h) => !detail[h].ok);

  const rows = hosts.map((h) => {
    const d = detail[h] || {};
    const rem = d.remediation || d.reasons || [];
    // 整改成本：差的工具+资讯篇数（越接近门槛越优先）
    const toolGap = Math.max(0, (blocked.thresholds && blocked.thresholds.minTools || 0) - (d.tools || 0));
    const artGap = Math.max(0, (blocked.thresholds && blocked.thresholds.minArticles || 0) - (d.articles || 0));
    return { domain: h, dir: d.dir || '', rem, cost: toolGap + artGap };
  }).sort((a, b) => a.cost - b.cost);

  const lines = [];
  lines.push('# 低质站点整改清单（' + new Date().toISOString().slice(0, 10) + '）');
  lines.push('');
  lines.push('共 **' + rows.length + '** 个站点待整改，按「差得最少优先」排序：');
  lines.push('');
  lines.push('| # | 子站 | 目录 | 整改动作 |');
  lines.push('| --- | --- | --- | --- |');
  rows.forEach((r, i) => {
    lines.push('| ' + (i + 1) + ' | ' + r.domain + ' | ' + r.dir + ' | ' + (r.rem.join('；') || '未达标') + ' |');
  });
  lines.push('');
  lines.push('提示：补资讯用 `node scripts/main-crawl.js`，再 `node scripts/ads-audit.js` 重算即自动放开。');
  lines.push('---');
  lines.push('自动生成 · `scripts/lowquality-fix.js`（OPTIMIZATION-PLUS §5.2）');

  const md = lines.join('\n');
  console.log(md);

  if (!PRINT_ONLY) {
    try { fs.mkdirSync(REPORT_DIR, { recursive: true }); } catch (e) {}
    const p = path.join(REPORT_DIR, 'lowquality-' + new Date().toISOString().slice(0, 10) + '.md');
    fs.writeFileSync(p, md);
    console.log('\n✓ 已归档', path.relative(process.cwd(), p));
  }
}

try { main(); } catch (e) { console.error('整改清单异常:', e.message); process.exit(1); }
