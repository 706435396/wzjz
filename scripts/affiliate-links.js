/* ============================================================
 * scripts/affiliate-links.js —— 批量回填 CPS 分销链接
 * ------------------------------------------------------------
 * 作用：扫描全部子站 data/list.json，把命中 affiliate-map.json 的工具官网链接
 *       替换为你的专属追踪链接（写入 aff / affNetwork 字段），前端卡片自动改用它并标注「分销合作」。
 *
 * 用法：
 *   node scripts/affiliate-links.js                  # 全站回填（只补未标记的）
 *   node scripts/affiliate-links.js --dry            # 只预览不写盘
 *   node scripts/affiliate-links.js --force          # 重算并覆盖已有 aff（换联盟/换 PID 后用）
 *   node scripts/affiliate-links.js --site es.72tool.com
 *
 * 幂等：内容无变化不写盘 —— 避免产生假 diff 白白消耗 Cloudflare 每月构建额度。
 * 安全：任一联盟未填 PID → 该商家跳过（保留官网原链），不会生成半成品死链。
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { parseSites, readTools, readArticles } = require('./_sites');
const { affFor, ruleFor, pendingNetworks, load } = require('./_aff');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');
const ONLY = (() => {
  const i = argv.indexOf('--site');
  return i >= 0 ? argv[i + 1] : '';
})();

/* 仅在内容变化时写盘（保幂等） */
function writeIfChanged(file, obj) {
  const next = JSON.stringify(obj, null, 2);
  let prev = '';
  try { prev = fs.readFileSync(file, 'utf8'); } catch (e) { /* 新文件 */ }
  if (prev === next) return false;
  if (!DRY) fs.writeFileSync(file, next);
  return true;
}

function main() {
  const conf = load();
  if (!conf.enabled) {
    console.log('分销未启用（public/common/config.json → affiliate.enabled=false），退出。');
    return;
  }

  const sites = parseSites().filter((s) => !ONLY || s.domain === ONLY);
  if (!sites.length) { console.log('未匹配到站点', ONLY || ''); return; }

  let total = 0, matched = 0, added = 0, updated = 0, cleared = 0, skipped = 0;
  const missPid = new Map();   // 命中规则但联盟缺 PID → 待配置商家统计
  const noRule = new Map();    // 无映射规则的域名 → 可作为「下一批要申请的联盟」清单

  for (const site of sites) {
    const data = readTools(site.abs);
    if (!data || !Array.isArray(data.tools)) continue;
    let siteAdded = 0, siteUpdated = 0;

    for (const t of data.tools) {
      total++;
      if (!t.url) continue;
      if (t.aff && !FORCE) { skipped++; matched++; continue; }

      const hit = affFor(t.url);
      if (hit) {
        matched++;
        if (t.aff === hit.url && t.affNetwork === hit.network) { skipped++; continue; }
        if (t.aff) { siteUpdated++; updated++; } else { siteAdded++; added++; }
        t.aff = hit.url;
        t.affNetwork = hit.network;
        t.affCommission = hit.commission || 0;   // §2.1 佣金权重，随链接一起写盘
      } else {
        // 未命中：区分「有规则但缺 PID」与「完全没有映射规则」
        const r = ruleFor(t.url);
        let host = '';
        try { host = new URL(t.url).hostname.replace(/^www\./, ''); } catch (e) { host = t.url; }
        if (r) missPid.set(r.network, (missPid.get(r.network) || 0) + 1);
        else noRule.set(host, (noRule.get(host) || 0) + 1);
        // FORCE 模式下清理已失效的旧分销链接（换联盟后防死链）
        if (FORCE && t.aff) { delete t.aff; delete t.affNetwork; delete t.affCommission; cleared++; }
      }
    }

    if (siteAdded || siteUpdated || (FORCE && cleared)) {
      const file = path.join(site.abs, 'data', 'list.json');
      const changed = writeIfChanged(file, data);
      console.log(
        (changed ? '✓ ' : '· ') + site.domain,
        '| 新增', siteAdded, '| 更新', siteUpdated, changed ? (DRY ? '(dry-run 未写盘)' : '') : '(无变化)'
      );
    } else {
      console.log('·', site.domain, '| 无需变更');
    }
  }

  console.log('\n===== 分销链接回填汇总 =====');
  console.log('工具总数', total, '| 已带分销链接', matched, '| 本次新增', added, '| 更新', updated,
    cleared ? '| 清理失效 ' + cleared : '', DRY ? '（dry-run，未写盘）' : '');

  const pend = pendingNetworks();
  if (pend.length) {
    console.log('\n⚠ 以下联盟尚未填 PID（public/common/config.json → affiliate.networks），对应商家暂用官网原链：');
    pend.forEach((n) => console.log('   -', n, missPid.get(n) ? '（影响 ' + missPid.get(n) + ' 个工具）' : ''));
    console.log('   填好 pid 后重跑：node scripts/affiliate-links.js --force');
  }

  if (noRule.size) {
    const top = [...noRule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log('\n💡 出现最多但尚无分销映射的商家域名（建议优先去 CJ / Impact 申请这些广告主）：');
    top.forEach(([h, n]) => console.log('   -', h, '×', n));
    console.log('   申请通过后把域名追加到 scripts/affiliate-map.json 的 rules 即可，无需改代码。');
  }
}

try { main(); } catch (e) {
  console.error('分销回填异常:', e.message);
  process.exit(1);
}
