/* ============================================================
 * scripts/ad-switch.js —— 批量开关广告（§10.3）
 * ------------------------------------------------------------
 * 痛点：节假日/策略调整需逐站开关广告。
 * 方案：按 --track（赛道目录首段）或 --region（子站 region）批量设置各子站
 *       config.json 的 ads.enabled，幂等（已是目标值则跳过）。
 *
 * 用法：
 *   node scripts/ad-switch.js --track agent --off     # agent/* 全关广告
 *   node scripts/ad-switch.js --region global --on    # 小语种站全开
 *   node scripts/ad-switch.js --all --off --dry       # 预览
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { parseSites } = require('./_sites');

const argv = process.argv.slice(2);
let TRACK = '', REGION = '', ALL = argv.includes('--all');
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--track=')) TRACK = argv[i].split('=')[1];
  else if (argv[i] === '--track' && argv[i + 1]) TRACK = argv[++i];
  if (argv[i].startsWith('--region=')) REGION = argv[i].split('=')[1];
  else if (argv[i] === '--region' && argv[i + 1]) REGION = argv[++i];
}
const DRY = argv.includes('--dry');
const ON = argv.includes('--on');
const OFF = argv.includes('--off');
if ((ON ? 1 : 0) + (OFF ? 1 : 0) !== 1) { console.error('必须且只能指定 --on 或 --off'); process.exit(1); }
const want = ON;

function readJSON(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }

function main() {
  const sites = parseSites();
  let changed = 0, skipped = 0;
  for (const s of sites) {
    const cfgPath = path.join(s.abs, 'config.json');
    const scfg = readJSON(cfgPath, null);
    if (!scfg) { skipped++; continue; }
    const track = s.dir.split('/')[0] || '';
    if (!ALL) {
      if (TRACK && track !== TRACK) continue;
      if (REGION) {
        const region = (scfg.region || (scfg.lang === 'zh-CN' || scfg.lang === 'zh' ? 'cn' : 'global'));
        if (region !== REGION) continue;
      }
    }
    const cur = !!(scfg.ads && scfg.ads.enabled);
    if (cur === want) { skipped++; continue; }
    changed++;
    console.log((DRY ? '[dry] ' : '') + (want ? '开' : '关') + '广告: ' + s.domain);
    if (!DRY) {
      if (!scfg.ads) scfg.ads = {};
      scfg.ads.enabled = want;
      fs.writeFileSync(cfgPath, JSON.stringify(scfg, null, 2));
    }
  }
  console.log('\n完成：变更 ' + changed + ' | 跳过/已一致 ' + skipped + (DRY ? '（--dry 未写盘）' : ''));
}

try { main(); } catch (e) { console.error('批量开关异常:', e.message); process.exit(1); }
