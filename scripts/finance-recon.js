/* ============================================================
 * scripts/finance-recon.js —— 多币种收益对账 + 提现归档（§6.1 / §6.4）
 * ------------------------------------------------------------
 * §6.1 多币种自动对账：各联盟收益多为 USD/EUR，需按月换算 CNY 做个人报税留存。
 *   运营把各联盟后台导出的月度收益存为 data/reports/fx-input-<YYYY-MM>.csv：
 *     date,channel,currency,amount,note
 *     2026-08-01,Adsterra,USD,123.45,八月广告
 *     2026-08-15,CJ,EUR,89.00,分销佣金
 *   按汇率（config.finance.fx 或默认近似）换算 CNY，输出 data/reports/recon-<YYYY-MM>.csv。
 *
 * §6.4 提现记录归档：--record-withdrawal "Payoneer|500|USD|2026-08-20|结汇" 追加到
 *     data/reports/withdrawals.json，并可选 POST finance.withdrawalWebhook（企业微信）。
 *
 * 用法：
 *   node scripts/finance-recon.js                      # 当月对账
 *   node scripts/finance-recon.js --month 2026-08
 *   node scripts/finance-recon.js --record-withdrawal "Payoneer|500|USD|2026-08-20|结汇"
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR } = require('./_sites');

const argv = process.argv.slice(2);
const MONTH_ARG = (argv.find((a) => a.startsWith('--month=')) || '').split('=')[1];
let WITHDRAWAL = '';
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--record-withdrawal=')) WITHDRAWAL = argv[i].split('=')[1];
  else if (argv[i] === '--record-withdrawal' && argv[i + 1]) WITHDRAWAL = argv[++i];
}
const YM = MONTH_ARG || new Date().toISOString().slice(0, 7);
const REPORT_DIR = path.join(process.cwd(), 'data', 'reports');
const CONFIG_PATH = path.join(PUBLIC_DIR, 'common', 'config.json');

const DEFAULT_FX = { USD: 7.2, EUR: 7.8, GBP: 9.0, CNY: 1 };

function readJSON(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} }

async function postWecom(webhook, text) {
  if (!webhook) return;
  try {
    const r = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msgtype: 'text', text: { content: text } }) });
    const j = await r.json().catch(() => ({}));
    if (j.errcode === 0 || (r.status >= 200 && r.status < 300)) console.log('✓ 提现提醒已推送企业微信');
  } catch (e) { console.warn('推送失败（不影响归档）:', e.message); }
}

function main() {
  const cfg = readJSON(CONFIG_PATH, {});
  const fin = Object.assign({ currency: 'CNY', archiveDir: 'data/reports', payoneer: [], withdrawalWebhook: '' }, cfg.finance || {});
  const fx = Object.assign({}, DEFAULT_FX, fin.fx || {});
  const target = (fin.currency || 'CNY').toUpperCase();

  // §6.4 提现记录
  if (WITHDRAWAL) {
    const parts = WITHDRAWAL.split('|').map((s) => s.trim());
    const rec = { channel: parts[0] || '', amount: Number(parts[1] || 0), currency: (parts[2] || 'USD').toUpperCase(), date: parts[3] || YM + '-01', note: parts[4] || '', recorded: new Date().toISOString() };
    ensureDir(REPORT_DIR);
    const wp = path.join(REPORT_DIR, 'withdrawals.json');
    const list = readJSON(wp, []);
    if (!Array.isArray(list)) list = [];
    list.push(rec);
    fs.writeFileSync(wp, JSON.stringify(list, null, 2));
    console.log('✓ 提现已归档', JSON.stringify(rec));
    const rate = fx[rec.currency] != null ? fx[rec.currency] : 1;
    postWecom(fin.withdrawalWebhook, '提现记录：' + rec.channel + ' ' + rec.amount + ' ' + rec.currency + ' ≈ ' + (rec.amount * rate).toFixed(2) + ' ' + target + '（' + rec.date + '）');
    return;
  }

  // §6.1 对账
  const inputCsv = path.join(REPORT_DIR, 'fx-input-' + YM + '.csv');
  if (!fs.existsSync(inputCsv)) {
    console.log('未找到 ' + path.relative(process.cwd(), inputCsv));
    console.log('请把各联盟后台导出收益存为该 CSV（date,channel,currency,amount,note），再重跑。');
    console.log('（也可填 config.finance.fx 覆盖默认汇率 ' + JSON.stringify(DEFAULT_FX) + '）');
    return;
  }
  const rows = fs.readFileSync(inputCsv, 'utf8').trim().split('\n').slice(1);
  const out = [['date', 'channel', 'originalCurrency', 'originalAmount', target + 'Amount', 'fxRate', 'note']];
  let totalCNY = 0;
  for (const line of rows) {
    if (!line.trim()) continue;
    const c = line.split(',').map((s) => s.trim());
    const date = c[0] || '', channel = c[1] || '', cur = (c[2] || 'USD').toUpperCase(), amt = Number(c[3] || 0), note = c[4] || '';
    const rate = fx[cur] != null ? fx[cur] : 1;
    const cny = amt * rate;
    totalCNY += cny;
    out.push([date, channel, cur, amt.toFixed(2), cny.toFixed(2), rate, note]);
  }
  out.push(['合计', '', '', '', totalCNY.toFixed(2), '', '']);

  ensureDir(REPORT_DIR);
  const outPath = path.join(REPORT_DIR, 'recon-' + YM + '.csv');
  fs.writeFileSync(outPath, out.map((r) => r.join(',')).join('\n'));
  console.log('✓ 对账表已生成', path.relative(process.cwd(), outPath));
  console.log('\n本月合计（换算 ' + target + '）：' + totalCNY.toFixed(2));
  console.log('（Excel 打开 recon csv 做报税留存；汇率默认 ' + JSON.stringify(DEFAULT_FX) + '，可在 config.finance.fx 校准）');
}

try { main(); } catch (e) { console.error('财务对账异常:', e.message); process.exit(1); }
