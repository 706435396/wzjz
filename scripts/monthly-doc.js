/* ============================================================
 * scripts/monthly-doc.js —— 月度变现汇总文档（§9.2）
 * ------------------------------------------------------------
 * 汇总当月归档（ad-report / aff-dashboard / revenue-archive / finance-recon）生成
 * docs/revenue-<YYYY-MM>.md 提交仓库，作为长期收益留存与报税参考。
 * 数据缺失时只写结构概览，不报错。
 *
 * 用法：
 *   node scripts/monthly-doc.js
 *   node scripts/monthly-doc.js --month 2026-08
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const MONTH_ARG = (argv.find((a) => a.startsWith('--month=')) || '').split('=')[1];
const YM = MONTH_ARG || new Date().toISOString().slice(0, 7);
const REPORT_DIR = path.join(process.cwd(), 'data', 'reports');
const DOCS_DIR = path.join(process.cwd(), 'docs');

function readJSON(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } }

function main() {
  const ad = readJSON(path.join(REPORT_DIR, 'ad-report-' + YM + '.json'), null);
  const aff = readJSON(path.join(REPORT_DIR, 'aff-dashboard-' + YM + '.json'), null);
  const reconCsv = readText(path.join(REPORT_DIR, 'recon-' + YM + '.csv'));
  const consol = readJSON(path.join(REPORT_DIR, YM + '.json'), null);

  const L = [];
  L.push('# 月度变现汇总 ' + YM);
  L.push('');
  L.push('_自动生成于 `scripts/monthly-doc.js`（OPTIMIZATION-PLUS §9.2）。所有数字来自 `data/reports/` 归档，含聚合数不含任何密钥。_');
  L.push('');
  L.push('## 一、广告概览');
  if (ad) {
    L.push('- 子站总数：' + ad.total);
    L.push('- 达标可挂广告：' + ad.eligible);
    L.push('- 暂被屏蔽：' + ad.blocked);
    L.push('- 本月收益(USD)：' + (ad.revenueUSD != null ? ad.revenueUSD : '（未提供收益快照）'));
  } else L.push('- 未生成（先跑 `node scripts/ad-report.js`）');
  L.push('');
  L.push('## 二、分销看板');
  if (aff && aff.byNet) {
    L.push('- 已配置分销工具数：' + (aff.totalAffTools != null ? aff.totalAffTools : '-'));
    L.push('- 按网络：');
    Object.keys(aff.byNet).forEach((n) => L.push('  - ' + n + '：工具 ' + aff.byNet[n].tools + '，预估权重 ' + aff.byNet[n].estCommission.toFixed(1)));
    if (aff.top && aff.top.length) {
      L.push('- Top 子站：');
      aff.top.forEach((s, i) => L.push('  ' + (i + 1) + '. ' + s.domain + '（' + s.track + '/' + s.lang + '）权重 ' + s.estCommission.toFixed(1)));
    }
  } else L.push('- 未生成（先跑 `node scripts/aff-dashboard.js`）');
  L.push('');
  L.push('## 三、财务对账（换算 CNY）');
  if (reconCsv) {
    const lines = reconCsv.trim().split('\n');
    const total = lines[lines.length - 1].split(',');
    L.push('- 合计（CNY）：' + (total[4] || '-'));
    L.push('- 明细见 `data/reports/recon-' + YM + '.csv`');
  } else L.push('- 未生成（先放 `data/reports/fx-input-' + YM + '.csv` 再跑 `node scripts/finance-recon.js`）');
  L.push('');
  L.push('## 四、待整改站点');
  const blocked = readJSON(path.join(__dirname, '..', 'public', 'common', 'ads-blocked.json'), null);
  if (blocked && blocked.hosts && blocked.hosts.length) {
    blocked.hosts.forEach((h) => { const d = (blocked.detail && blocked.detail[h]) || {}; L.push('- ' + h + '：' + ((d.remediation || d.reasons || []).join('；') || '未达标')); });
  } else L.push('- 无');
  L.push('');
  L.push('---');
  L.push('归档源：ad-report-' + YM + '.json / aff-dashboard-' + YM + '.json / ' + YM + '.json / recon-' + YM + '.csv');

  const md = L.join('\n');
  try { fs.mkdirSync(DOCS_DIR, { recursive: true }); } catch (e) {}
  const out = path.join(DOCS_DIR, 'revenue-' + YM + '.md');
  fs.writeFileSync(out, md);
  console.log('✓ 月度文档已生成', path.relative(process.cwd(), out));
  console.log(md);
}

try { main(); } catch (e) { console.error('月度文档异常:', e.message); process.exit(1); }
