/* ============================================================
 * scripts/security-scan.js  ——  全局违规内容定时扫描 + 告警 + 一键下线
 * ------------------------------------------------------------
 * 对应清单「三.1 / 六」：每周自动遍历所有子站 tool-list / article 数据，
 * 检测违规关键词、外链风险站点，生成违规清单并推送企业微信告警；
 * 支持一键批量下线违规站点（追加 # SITE-DISABLED 到 _redirects，被 sitemap/Function 忽略）。
 * 用法：
 *   node scripts/security-scan.js                 # 扫描 + 推送告警
 *   node scripts/security-scan.js --offline <域名> # 下线指定站点
 *   node scripts/security-scan.js --offline-all   # 下线本次扫描命中的全部站点
 * 零 Google：告警走 WEBHOOK_URL（企业微信/飞书/邮件，非 Gmail）。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, REDIRECTS, BLOCKLIST, parseSites, readTools, readArticles } = require('./_sites');

/* 外链风险主机（含翻墙/破解/盗版/DMCA 高风险特征，命中即标记） */
const RISK_HOST_FRAGMENTS = ['crack', 'warez', 'pirate', 'keygen', 'serial', 'torrent', 'vpn', 'proxy', 'porn', 'casino', 'bet', 'leak', '破解', '翻墙', '机场'];

function hostOf(url) { try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; } }
function isRiskHost(url) {
  const h = hostOf(url);
  if (!h) return false;
  return RISK_HOST_FRAGMENTS.some((f) => h.includes(f));
}
function hasBlockword(text) {
  const s = String(text || '').toLowerCase();
  return BLOCKLIST.filter((w) => s.includes(w));
}

function scan() {
  const sites = parseSites();
  const findings = [];
  for (const s of sites) {
    const t = readTools(s.abs); const a = readArticles(s.abs);
    const check = (text, where) => {
      const bw = hasBlockword(text);
      if (bw.length) findings.push({ domain: s.domain, where, type: 'blockword', hit: bw, text: String(text).slice(0, 60) });
    };
    if (t) t.tools.forEach((x, i) => {
      check(x.name + ' ' + x.desc, 'tool#' + i);
      if (isRiskHost(x.url)) findings.push({ domain: s.domain, where: 'tool#url', type: 'riskhost', hit: [x.url], text: x.url });
    });
    if (a) a.articles.forEach((x, i) => {
      check(x.title + ' ' + x.summary + ' ' + x.body, 'article#' + i);
      if (isRiskHost(x.url)) findings.push({ domain: s.domain, where: 'article#url', type: 'riskhost', hit: [x.url], text: x.url });
      (x.relatedTools || []).forEach(() => {});
    });
  }
  return findings;
}

function pushWebhook(findings) {
  const url = process.env.WEBHOOK_URL;
  if (!url) { console.log('（未配置 WEBHOOK_URL，跳过推送）'); return; }
  const msg = '[toolnav 安全扫描] 命中 ' + findings.length + ' 条风险' + (findings.length ? '：\n' + findings.slice(0, 10).map((f) => '· ' + f.domain + ' ' + f.type + ' ' + (f.hit[0] || '')).join('\n') : '，站点健康');
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msg }) }).catch((e) => console.warn('webhook 失败', e.message));
}

function disableSite(domain) {
  let raw = fs.readFileSync(REDIRECTS, 'utf8');
  const lines = raw.split('\n');
  let done = false;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(/^#\s*SITE\s+(\S+)\s+(\S+)\s*$/);
    if (m && m[1].toLowerCase() === domain.toLowerCase()) {
      lines[i] = '# SITE-DISABLED ' + m[1] + ' ' + m[2];
      done = true; break;
    }
  }
  if (done) { fs.writeFileSync(REDIRECTS, lines.join('\n')); console.log('✓ 已下线:', domain); }
  else console.log('未找到站点:', domain);
}

function main() {
  const offlineArg = process.argv.indexOf('--offline');
  if (offlineArg >= 0) { disableSite(process.argv[offlineArg + 1]); return; }
  if (process.argv.includes('--offline-all')) {
    const f = scan();
    const domains = [...new Set(f.map((x) => x.domain))];
    domains.forEach(disableSite);
    console.log('已批量下线', domains.length, '个站点');
    return;
  }
  const findings = scan();
  const out = path.join(__dirname, '.security-report.json');
  fs.writeFileSync(out, JSON.stringify({ ts: Date.now(), count: findings.length, findings }, null, 2));
  console.log('安全扫描完成 | 命中风险', findings.length, '条 ->', out);
  pushWebhook(findings);
  if (findings.length) console.log('提示：node scripts/security-scan.js --offline-all 可一键下线全部命中站点');
}

main();
