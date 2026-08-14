/* ============================================================
 * scripts/aff-check.js —— 失效分销链接自动巡检（§2.4）
 * ------------------------------------------------------------
 * 为什么需要：联盟活动下线 / 商家改 URL / 短链过期，都会导致分销死链，
 *   用户点开是空白页或 404，直接流失转化。与其手动查，不如每周自动扫。
 *
 * 逻辑：
 *   1) 遍历全部子站 data/list.json 中带 aff / affShort 的工具；
 *   2) 先 HEAD、再 GET（部分商家禁 HEAD，自动降级）探测最终状态；
 *   3) 真 4xx/5xx → 回退官网原链（删 aff/affShort/affNetwork/affCommission），
 *      前端 affiliate.js 自动改用 tool.url，绝不生死链；
 *   4) 网络不可达（超时/异常）→ 不轻易断链，记入「无法验证」留人工复核；
 *   5) 幂等写盘（内容无变化不写），避免假 diff 消耗 Cloudflare 构建额度。
 *
 * 用法：
 *   node scripts/aff-check.js            # 全站巡检 + 自动修复死链
 *   node scripts/aff-check.js --dry      # 只预览不写盘
 *   node scripts/aff-check.js --site es.72tool.com
 *   node scripts/aff-check.js --force    # 强制重新校验（即便上次已标记）
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { parseSites, readTools } = require('./_sites');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');
const ONLY = (() => { const i = argv.indexOf('--site'); return i >= 0 ? argv[i + 1] : ''; })();

const TIMEOUT = 8000;
const UA = 'Mozilla/5.0 (compatible; 72tool-affbot/1.0)';

/* 仅在内容变化时写盘（保幂等） */
function writeIfChanged(file, obj) {
  const next = JSON.stringify(obj, null, 2);
  let prev = '';
  try { prev = fs.readFileSync(file, 'utf8'); } catch (e) { /* 新文件 */ }
  if (prev === next) return false;
  if (!DRY) fs.writeFileSync(file, next);
  return true;
}

/* 探测链接可达性：HEAD → GET 兜底；返回 { ok, status?, err? } */
async function probe(url) {
  for (const method of ['HEAD', 'GET']) {
    let ctrl;
    try {
      ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT);
      const r = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'User-Agent': UA }
      });
      clearTimeout(t);
      if (r.status >= 200 && r.status < 400) return { ok: true };
      if (r.status === 405 && method === 'HEAD') continue;   // 禁 HEAD → 试 GET
      if (r.status >= 400) return { ok: false, status: r.status };
      return { ok: true };
    } catch (e) {
      if (ctrl) clearTimeout(ctrl);
      if (method === 'HEAD') continue;                         // HEAD 异常 → 试 GET
      return { ok: false, err: (e && e.name === 'AbortError') ? 'timeout' : (e && e.message) };
    }
  }
  return { ok: true }; // 兜底放行（无法判定不轻易断链）
}

async function main() {
  const sites = parseSites().filter((s) => !ONLY || s.domain === ONLY);
  if (!sites.length) { console.log('未匹配到站点', ONLY || ''); return; }

  let total = 0, checked = 0, broken = 0, fixed = 0, unverified = 0;
  const brokenList = [];

  for (const site of sites) {
    const data = readTools(site.abs);
    if (!data || !Array.isArray(data.tools)) continue;
    let siteFixed = 0;

    for (const t of data.tools) {
      const link = t.affShort || t.aff;
      if (!link) continue;
      total++;
      const res = await probe(link);
      if (res.ok) { checked++; continue; }
      if (res.err) { unverified++; continue; }   // 网络不可达 → 不轻易断链，留人工
      // 真死链 → 回退官网原链
      broken++;
      if (t.url) {
        delete t.aff; delete t.affShort; delete t.affNetwork; delete t.affCommission;
        siteFixed++; fixed++;
        brokenList.push({ site: site.domain, name: t.name, was: link, status: res.status });
      }
    }

    if (siteFixed) {
      const file = path.join(site.abs, 'data', 'list.json');
      const changed = writeIfChanged(file, data);
      console.log((changed ? '✓ ' : '· ') + site.domain + ' | 修复死链 ' + siteFixed + (DRY ? '（dry-run 未写盘）' : ''));
    }
  }

  const summary = { total, checked, broken, fixed, unverified };
  console.log('\n===== 分销链接巡检 =====');
  console.log(JSON.stringify(summary));          // 末行 JSON，供 monit-audit.js 解析
  console.log('检查', total, '| 有效', checked, '| 死链修复', fixed, '| 无法验证', unverified, DRY ? '（dry-run）' : '');
  if (brokenList.length) console.log('死链清单:', brokenList.map((b) => b.site + '/' + b.name + '(HTTP ' + b.status + ')').join(', '));
  if (!total) console.log('（当前工具未配置分销链接，待 affiliate-links.js 回填后才有链接可巡检）');
}

main().catch((e) => { console.error('巡检异常:', e.message); process.exit(1); });
