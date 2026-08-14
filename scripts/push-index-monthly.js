/* ============================================================
 * scripts/push-index-monthly.js  ——  月度批量收录推送（避免重复消耗配额）
 * ------------------------------------------------------------
 * 对应清单「七.1」：仅推送 30 天内新增/更新的工具与资讯 sitemap，减少重复推送，
 * 节省百度/谷歌站长平台配额。可由 crawl.yml 末尾串接，或单独月度定时运行。
 * 用法：node scripts/push-index-monthly.js   （需 BAIDU_TOKEN；GOOGLE_INDEXING_SA_JSON 可选）
 * 零 Google：Google 走 Indexing API 服务账号（非 Gmail 登录），百度走普通推送接口。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, parseSites, readTools, readArticles } = require('./_sites');

const BAIDU = process.env.BAIDU_TOKEN || '';  // 格式：站点域名+空格+token
const WINDOW = 30; // 天

function daysSince(d) { if (!d) return 9999; const t = new Date(d); if (isNaN(t)) return 9999; return Math.floor((Date.now() - t.getTime()) / 86400000); }
function recent(d) { return daysSince(d) <= WINDOW; }

async function pushBaidu(urls) {
  if (!BAIDU || !urls.length) return;
  const [site, token] = BAIDU.split(/\s+/);
  try {
    const r = await fetch('http://data.zz.baidu.com/urls?site=' + encodeURIComponent(site) + '&token=' + token, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: urls.join('\n')
    });
    const j = await r.json().catch(() => ({}));
    console.log('[百度] 推送', urls.length, '条 | 剩余', j.remain || '?', '| 当日', j.success || 0);
  } catch (e) { console.warn('[百度] 推送失败', e.message); }
}

async function main() {
  const sites = parseSites();
  const toPush = []; // 仅近 30 天更新的站点 sitemap
  for (const s of sites) {
    const t = readTools(s.abs); const a = readArticles(s.abs);
    if ((t && recent(t.updated)) || (a && recent(a.updated))) {
      toPush.push('https://' + s.domain + '/sitemap.xml');
      toPush.push('https://' + s.domain + '/article/sitemap.xml');
    }
  }
  console.log('近 30 天需推送 sitemap:', toPush.length, '条');
  await pushBaidu(toPush);
  console.log('月度推送完成（无 BAIDU_TOKEN 则仅统计）');
}

main().catch((e) => { console.error('月度推送异常:', e); process.exit(1); });
