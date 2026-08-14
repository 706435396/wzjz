/* ============================================================
 * scripts/revenue-archive.js —— 月度收益归档合并（§5.4）
 * ------------------------------------------------------------
 * 把 ad-report.js（§1.5）与 aff-dashboard.js（§2.5）各自落盘的 JSON 汇总成
 * 单一月度归档 data/reports/<YYYY-MM>.json，供 §9.2 月度文档 / 财务对账复用。
 * 若运营另外导出真实收益快照（ad-revenue-<YM>.json / aff-sales-<YM>.json）也并入。
 *
 * 用法：
 *   node scripts/revenue-archive.js
 *   node scripts/revenue-archive.js --month 2026-08
 *   node scripts/revenue-archive.js --print
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const MONTH_ARG = (argv.find((a) => a.startsWith('--month=')) || '').split('=')[1];
const PRINT_ONLY = argv.includes('--print');
const REPORT_DIR = path.join(process.cwd(), 'data', 'reports');
const YM = MONTH_ARG || new Date().toISOString().slice(0, 7);

function readJSON(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }

function main() {
  const ad = readJSON(path.join(REPORT_DIR, 'ad-report-' + YM + '.json'), null);
  const aff = readJSON(path.join(REPORT_DIR, 'aff-dashboard-' + YM + '.json'), null);
  const adRev = readJSON(path.join(REPORT_DIR, 'ad-revenue-' + YM + '.json'), null);
  const affSales = readJSON(path.join(REPORT_DIR, 'aff-sales-' + YM + '.json'), null);

  const consolidated = {
    month: YM,
    ad: ad || null,
    affiliate: aff || null,
    manualAdRevenue: adRev || null,
    manualAffSales: affSales || null,
    generated: new Date().toISOString()
  };

  console.log('# 月度收益归档 ' + YM);
  console.log('- 广告报表：' + (ad ? '✅' : '⚠️ 未生成（先跑 ad-report.js）'));
  console.log('- 分销看板：' + (aff ? '✅' : '⚠️ 未生成（先跑 aff-dashboard.js）'));
  console.log('- 手动广告收益：' + (adRev ? '✅' : '无'));
  console.log('- 手动分销成交：' + (affSales ? '✅' : '无'));

  if (PRINT_ONLY) return;
  try { fs.mkdirSync(REPORT_DIR, { recursive: true }); } catch (e) {}
  const out = path.join(REPORT_DIR, YM + '.json');
  fs.writeFileSync(out, JSON.stringify(consolidated, null, 2));
  console.log('\n✓ 已合并归档', path.relative(process.cwd(), out));
}

try { main(); } catch (e) { console.error('归档异常:', e.message); process.exit(1); }
