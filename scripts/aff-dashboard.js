/* ============================================================
 * scripts/aff-dashboard.js —— 站群分销数据拆分看板（§2.5）
 * ------------------------------------------------------------
 * 痛点：200 站共用一套联盟账号，难分辨哪些子站高转化。
 * 方案：复用 affiliate.js 注入的 subId1=hostname 归因（即各子站域名），聚合各子站
 *       affNetwork / affCommission，按「网络 / 赛道(目录) / 语种」统计成交佣金与工具数，
 *       生成收益排行 Markdown，POST 企业微信 + 归档。
 *
 * 说明：真实成交需联盟后台按 subId 回传。本脚本聚合「已配置分销的工具 + 其佣金权重」作为
 *       预估看板；若运营把联盟后台按 subId 导出的真实成交 JSON 存为
 *       data/reports/aff-sales-<YYYY-MM>.json（{ "<domain>": {sales, commission} }），
 *       则自动并入真实成交列。无数据不崩溃。
 *
 * 用法：
 *   node scripts/aff-dashboard.js
 *   node scripts/aff-dashboard.js --no-push
 *   node scripts/aff-dashboard.js --month 2026-08
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, parseSites, readTools } = require('./_sites');

const argv = process.argv.slice(2);
const NO_PUSH = argv.includes('--no-push');
const MONTH_ARG = (argv.find((a) => a.startsWith('--month=')) || '').split('=')[1];
const YM = MONTH_ARG || new Date().toISOString().slice(0, 7);
const CONFIG_PATH = path.join(PUBLIC_DIR, 'common', 'config.json');
const REPORT_DIR = path.join(process.cwd(), 'data', 'reports');

function readJSON(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} }

async function postWecom(webhook, markdown) {
  if (!webhook) return false;
  try {
    const r = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msgtype: 'markdown', markdown: { content: markdown } }) });
    const j = await r.json().catch(() => ({}));
    if (j.errcode === 0 || (r.status >= 200 && r.status < 300)) { console.log('✓ 企业微信推送成功'); return true; }
    console.warn('企业微信推送返回异常:', JSON.stringify(j));
    return false;
  } catch (e) { console.warn('企业微信推送失败（不影响归档）:', e.message); return false; }
}

function main() {
  const cfg = readJSON(CONFIG_PATH, {});
  const rep = Object.assign({ wecomWebhook: '' }, cfg.report || {});
  const sites = parseSites();

  const byNet = {};      // network -> {tools, estCommission}
  const bySite = [];     // {domain, dir, track, lang, tools, estCommission}
  let totalAffTools = 0;

  for (const s of sites) {
    const data = readTools(s.abs);
    const tools = (data && data.tools) || [];
    const scfg = readJSON(path.join(s.abs, 'config.json'), {});
    const lang = (scfg.lang || '').split('-')[0] || 'unknown';
    const track = s.dir.split('/')[0] || 'unknown';
    let siteEst = 0, siteAff = 0;
    for (const t of tools) {
      if (!t.aff && !t.affNetwork) continue;
      siteAff++;
      const comm = Number(t.affCommission || 0);
      siteEst += comm;
      const net = t.affNetwork || 'unknown';
      if (!byNet[net]) byNet[net] = { tools: 0, estCommission: 0 };
      byNet[net].tools++;
      byNet[net].estCommission += comm;
    }
    totalAffTools += siteAff;
    bySite.push({ domain: s.domain, track, lang, tools: siteAff, estCommission: siteEst });
  }

  // 真实成交（可选）
  const salesPath = path.join(REPORT_DIR, 'aff-sales-' + YM + '.json');
  const sales = readJSON(salesPath, null);
  const siteSales = {};
  if (sales) Object.keys(sales).forEach((d) => { siteSales[d] = sales[d]; });

  // 排序
  bySite.sort((a, b) => (b.estCommission + (siteSales[b.domain] ? siteSales[b.domain].commission || 0 : 0)) - (a.estCommission + (siteSales[a.domain] ? siteSales[a.domain].commission || 0 : 0)));

  const lines = [];
  lines.push('# 站群分销看板 ' + YM);
  lines.push('');
  lines.push('> subId 归因：hostname（config.affiliate.subIdParam=subId1）。带「真实成交」列需运营导出联盟后台按 subId 报表。');
  lines.push('');
  lines.push('## 一、按联盟网络（佣金权重预估）');
  const netNames = Object.keys(byNet).sort((a, b) => byNet[b].estCommission - byNet[a].estCommission);
  if (netNames.length) {
    lines.push('| 网络 | 分销工具数 | 预估佣金权重 |');
    lines.push('| --- | --- | --- |');
    netNames.forEach((n) => lines.push('| ' + n + ' | ' + byNet[n].tools + ' | ' + byNet[n].estCommission.toFixed(1) + ' |'));
  } else {
    lines.push('- 暂未配置分销工具');
  }
  lines.push('');
  lines.push('## 二、子站佣金排行 Top ' + Math.min(15, bySite.length));
  lines.push('| 排名 | 子站 | 赛道 | 语种 | 分销工具 | 预估权重 | 真实成交(USD) |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  bySite.slice(0, 15).forEach((s, i) => {
    const real = siteSales[s.domain] ? (siteSales[s.domain].commission != null ? siteSales[s.domain].commission : '-') : '-';
    lines.push('| ' + (i + 1) + ' | ' + s.domain + ' | ' + s.track + ' | ' + s.lang + ' | ' + s.tools + ' | ' + s.estCommission.toFixed(1) + ' | ' + real + ' |');
  });
  if (bySite.length > 15) lines.push('| … | 共 ' + bySite.length + ' 站 | | | | | |');
  lines.push('');
  lines.push('---');
  lines.push('自动生成 · `scripts/aff-dashboard.js`（OPTIMIZATION-PLUS §2.5）');

  const md = lines.join('\n');
  console.log(md);

  ensureDir(REPORT_DIR);
  const arc = path.join(REPORT_DIR, 'aff-dashboard-' + YM + '.md');
  if (fs.existsSync(arc) ? fs.readFileSync(arc, 'utf8') !== md : true) fs.writeFileSync(arc, md);
  const jp = path.join(REPORT_DIR, 'aff-dashboard-' + YM + '.json');
  const payload = { month: YM, totalAffTools, byNet, top: bySite.slice(0, 15), generated: new Date().toISOString() };
  if (fs.existsSync(jp) ? fs.readFileSync(jp, 'utf8') !== JSON.stringify(payload, null, 2) : true) fs.writeFileSync(jp, JSON.stringify(payload, null, 2));
  console.log('\n✓ 已归档', path.relative(process.cwd(), arc));

  if (!NO_PUSH) postWecom(rep.wecomWebhook, md);
  else console.log('（--no-push，跳过推送）');
}

try { main(); } catch (e) { console.error('分销看板异常:', e.message); process.exit(1); }
