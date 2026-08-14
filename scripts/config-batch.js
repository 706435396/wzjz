/* ============================================================
 * scripts/config-batch.js —— 多套广告/分销配置批量导入（§10.1）
 * ------------------------------------------------------------
 * 痛点：新增一批站点逐个改 config.json 低效。
 * 方案：把预设模板（广告/分销等字段）批量写入「匹配的子站」config.json。
 *   匹配：--track agent|tools|lang|all  或  --region global|cn|all（目录首段/子站 region）。
 *   合并：top-level 深合并（对象递归、标量覆盖），幂等（哈希比对，无变化不写盘）。
 *
 * 模板 ads-template.json 示例：
 *   { "ads": { "enabled": true, "provider": "adsterra" }, "promo": { "enabled": true } }
 *
 * 用法：
 *   node scripts/config-batch.js --apply ads-template.json --track agent
 *   node scripts/config-batch.js --apply ads-template.json --all --dry
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { parseSites } = require('./_sites');

const argv = process.argv.slice(2);
const APPLY = (() => { for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--apply=')) return argv[i].split('=')[1]; if (argv[i] === '--apply' && argv[i + 1]) return argv[++i]; } return ''; })();
let TRACK = 'all', REGION = 'all';
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--track=')) TRACK = argv[i].split('=')[1];
  else if (argv[i] === '--track' && argv[i + 1]) TRACK = argv[++i];
  if (argv[i].startsWith('--region=')) REGION = argv[i].split('=')[1];
  else if (argv[i] === '--region' && argv[i + 1]) REGION = argv[++i];
}
const DRY = argv.includes('--dry');

function readJSON(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function hash(o) { return JSON.stringify(o); }

/* 深合并：src 覆盖 dst（对象递归，数组直接覆盖） */
function deepMerge(dst, src) {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) {
      deepMerge(dst[k], src[k]);
    } else dst[k] = src[k];
  }
  return dst;
}

function matchSite(s, scfg) {
  const track = s.dir.split('/')[0] || '';
  if (TRACK !== 'all' && track !== TRACK) return false;
  if (REGION !== 'all') {
    const region = (scfg.region || (scfg.lang === 'zh-CN' || scfg.lang === 'zh' ? 'cn' : 'global'));
    if (region !== REGION) return false;
  }
  return true;
}

function main() {
  if (!APPLY) { console.error('用法: node scripts/config-batch.js --apply tpl.json [--track agent|tools|lang|all] [--region global|cn|all] [--dry]'); process.exit(1); }
  if (!fs.existsSync(APPLY)) { console.error('模板不存在:', APPLY); process.exit(1); }
  const tpl = readJSON(APPLY, null);
  if (!tpl || typeof tpl !== 'object') { console.error('模板必须是 JSON 对象'); process.exit(1); }

  const sites = parseSites();
  let applied = 0, skipped = 0;
  for (const s of sites) {
    const cfgPath = path.join(s.abs, 'config.json');
    const scfg = readJSON(cfgPath, null);
    if (!scfg) { console.warn('跳过（无 config.json）: ' + s.domain); skipped++; continue; }
    if (!matchSite(s, scfg)) continue;

    const merged = deepMerge(JSON.parse(JSON.stringify(scfg)), tpl);
    if (hash(merged) === hash(scfg)) { skipped++; continue; }
    applied++;
    console.log((DRY ? '[dry] ' : '') + '写入 ' + s.domain + ' ← ' + Object.keys(tpl).join(','));
    if (!DRY) fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2));
  }
  console.log('\n完成：应用 ' + applied + ' | 跳过/无变化 ' + skipped + (DRY ? '（--dry 未写盘）' : ''));
}

try { main(); } catch (e) { console.error('批量配置异常:', e.message); process.exit(1); }
