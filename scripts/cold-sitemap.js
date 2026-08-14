/* ============================================================
 * scripts/cold-sitemap.js  ——  冷门站点静态 sitemap 预生成（省 Function 请求）
 * ------------------------------------------------------------
 * 对应清单「二.3」：自动识别 30 天无更新的子站，确保它们的 sitemap 已是
 * 预生成的静态文件落地（/public/<dir>/sitemap.xml），从而访问时由 CDN 直接返回，
 * 不再占用 Pages Function 的每日 10 万免费请求额度（Functions 仍兜底热站动态路由）。
 * 行为：
 *   1) 重新生成所有子站静态 sitemap（调用 build-sitemap，幂等）；
 *   2) 读取各子站 updated，标记超过 30 天未更新的为“冷站”，写入 common/cold-sites.json；
 *   3) 冷站清单可供 functions/sitemap.xml.js 读取以进一步拉长缓存（见该文件注释）。
 * 用法：node scripts/cold-sitemap.js   （建议每周 merge 时运行一次）
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, parseSites, readTools } = require('./_sites');

const COLD_DAYS = 30;

function daysSince(dateStr) {
  if (!dateStr) return 9999;
  const d = new Date(dateStr); if (isNaN(d)) return 9999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function main() {
  require('./build-sitemap'); // 保证所有静态 sitemap 最新（幂等，无变化不写）

  const sites = parseSites();
  const cold = [];
  for (const s of sites) {
    const t = readTools(s.abs);
    const days = daysSince(t ? t.updated : '');
    if (days > COLD_DAYS) cold.push({ domain: s.domain, dir: s.dir, days });
  }
  const out = path.join(PUBLIC_DIR, 'common', 'cold-sites.json');
  fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), coldDays: COLD_DAYS, cold }, null, 2));
  console.log('冷站（>' + COLD_DAYS + '天未更新）:', cold.length, '个 ->', out);
  cold.forEach((c) => console.log('  ·', c.domain, '(', c.days, '天)'));
}

main();
