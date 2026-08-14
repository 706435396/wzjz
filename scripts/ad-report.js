/* ============================================================
 * scripts/ad-report.js —— 广告收益简易日报（§1.5）
 * ------------------------------------------------------------
 * 痛点：每日登录多个联盟后台看收益繁琐。
 * 方案：聚合「结构数据（ads-blocked.json 达标/屏蔽）」+「运营手动导出的收益快照」
 *       （data/reports/ad-revenue-<YYYY-MM>.json，由 Adsterra/AdSense 后台导出后粘贴），
 *       生成 Markdown 报表，POST 企业微信 webhook（免备案、不依赖 Gmail），并落盘归档。
 *
 * 为什么同时支持「手动快照」：联盟 API 需各自 key/token，且本地 CI 无网络/无密钥也能跑。
 *       运营每周把后台导出数字存成 JSON 即可出报表，无需写爬虫。
 *       若日后配了 ADSTERRA_API_KEY / ADSENSE_ACCESS_TOKEN，可在此扩展直连拉取。
 *
 * 用法：
 *   node scripts/ad-report.js                 # 生成 + 归档（+ 有 webhook 则推送）
 *   node scripts/ad-report.js --no-push       # 仅生成与归档，不推企业微信
 *   node scripts/ad-report.js --month 2026-08 # 指定月份（默认本月）
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, parseSites } = require('./_sites');

const argv = process.argv.slice(2);
const NO_PUSH = argv.includes('--no-push');
const MONTH_ARG = (argv.find((a) => a.startsWith('--month=') || a === '--month') || '').split('=')[1];

const now = new Date();
const YM = MONTH_ARG || now.toISOString().slice(0, 7); // YYYY-MM
const CONFIG_PATH = path.join(PUBLIC_DIR, 'common', 'config.json');
const BLOCK_PATH = path.join(PUBLIC_DIR, 'common', 'ads-blocked.json');
const REPORT_DIR = path.join(process.cwd(), 'data', 'reports');

function readJSON(p, fb) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; }
}
function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} }

async function postWecom(webhook, markdown) {
  if (!webhook) return false;
  try {
    const body = JSON.stringify({ msgtype: 'markdown', markdown: { content: markdown } });
    const r = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const j = await r.json().catch(() => ({}));
    if (j.errcode === 0 || (r.status >= 200 && r.status < 300)) { console.log('✓ 企业微信推送成功'); return true; }
    console.warn('企业微信推送返回异常:', JSON.stringify(j));
    return false;
  } catch (e) {
    console.warn('企业微信推送失败（不影响归档）:', e.message);
    return false;
  }
}

function main() {
  const cfg = readJSON(CONFIG_PATH, {});
  const rep = Object.assign(
    { wecomWebhook: '', schedule: 'daily', archiveDir: 'data/reports', monthlyDoc: true },
    cfg.report || {}
  );
  const blocked = readJSON(BLOCK_PATH, { hosts: [], detail: {} });
  const sites = parseSites();
  const total = sites.length;
  const blockedHosts = blocked.hosts || [];
  const eligible = total - blockedHosts.length;

  // 运营手动收益快照（Adsterra/AdSense 后台导出后粘贴到 data/reports/）
  const manualPath = path.join(REPORT_DIR, 'ad-revenue-' + YM + '.json');
  const manual = readJSON(manualPath, null);

  // 聚合收益（手动快照优先；无则用占位说明）
  const adsterraRev = (manual && manual.adsterra && typeof manual.adsterra.revenue === 'number') ? manual.adsterra.revenue : null;
  const adsenseRev = (manual && manual.adsense && typeof manual.adsense.revenue === 'number') ? manual.adsense.revenue : null;
  const totalRev = (adsterraRev != null ? adsterraRev : 0) + (adsenseRev != null ? adsenseRev : 0);
  const hasManual = !!manual;

  const lines = [];
  lines.push('# 广告收益日报 ' + YM + '（' + now.toISOString().slice(0, 10) + '）');
  lines.push('');
  lines.push('> 数据来源：结构自检(ads-audit) + 运营导出快照' + (hasManual ? ' ✅已含收益' : ' ⚠️未提供收益快照，仅结构指标'));
  lines.push('');
  lines.push('## 一、站点概览');
  lines.push('- 子站总数：**' + total + '**');
  lines.push('- 达标可挂广告：**' + eligible + '**');
  lines.push('- 暂被屏蔽（质量/灰产）：**' + blockedHosts.length + '**');
  lines.push('');
  lines.push('## 二、收益概览（' + (hasManual ? '本月导出' : '待补充') + '）');
  if (hasManual) {
    lines.push('| 渠道 | 曝光 | 点击 | 收益(USD) |');
    lines.push('| --- | --- | --- | --- |');
    ['adsterra', 'adsense'].forEach((ch) => {
      const d = (manual[ch] || {});
      lines.push('| ' + ch + ' | ' + (d.impressions != null ? d.impressions : '-') + ' | ' + (d.clicks != null ? d.clicks : '-') + ' | ' + (d.revenue != null ? d.revenue : '-') + ' |');
    });
    lines.push('| **合计** | - | - | **' + totalRev.toFixed(2) + '** |');
  } else {
    lines.push('- Adsterra：待补充（把后台导出 JSON 存为 `data/reports/ad-revenue-' + YM + '.json`）');
    lines.push('- AdSense：待补充');
  }
  lines.push('');
  lines.push('## 三、待整改站点（' + blockedHosts.length + '）');
  if (blockedHosts.length) {
    blockedHosts.forEach((h) => {
      const d = (blocked.detail && blocked.detail[h]) || {};
      const rem = (d.remediation && d.remediation.length) ? d.remediation.join('；') : (d.reasons || []).join('；');
      lines.push('- ' + h + '：' + (rem || '未达标'));
    });
  } else {
    lines.push('- 无');
  }
  lines.push('');
  lines.push('---');
  lines.push('自动生成 · 由 `scripts/ad-report.js`（OPTIMIZATION-PLUS §1.5）· 配置 `report.wecomWebhook` 后自动推送');

  const md = lines.join('\n');
  console.log(md);

  // 归档（幂等：内容一致不覆盖时间戳）
  ensureDir(REPORT_DIR);
  const arcPath = path.join(REPORT_DIR, 'ad-report-' + YM + '.md');
  const prev = fs.existsSync(arcPath) ? fs.readFileSync(arcPath, 'utf8') : null;
  if (prev !== md) {
    fs.writeFileSync(arcPath, md);
    console.log('\n✓ 已归档', path.relative(process.cwd(), arcPath));
  } else {
    console.log('\n（归档无变化，跳过写盘）');
  }

  // 同时存一份机器可读 JSON 供 §9.2 月度文档 / finance-recon 复用
  const jsonPath = path.join(REPORT_DIR, 'ad-report-' + YM + '.json');
  const payload = { month: YM, total, eligible, blocked: blockedHosts.length, revenueUSD: hasManual ? totalRev : null, generated: now.toISOString() };
  const prevJ = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, 'utf8') : null;
  if (prevJ !== JSON.stringify(payload, null, 2)) {
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
  }

  if (!NO_PUSH) {
    postWecom(rep.wecomWebhook, md);
  } else {
    console.log('（--no-push，跳过企业微信推送）');
  }
}

try { main(); } catch (e) {
  console.error('广告报表异常:', e.message);
  process.exit(1);
}
