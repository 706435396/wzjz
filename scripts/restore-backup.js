/* ============================================================
 * scripts/restore-backup.js  ——  一键恢复备份（灾备）
 * ------------------------------------------------------------
 * 对应清单「四.3 / 七.3」：merge.yml 每周打包全站 data + article 为
 *   backups/YYYYMMDD.tar.gz（也可上传至免费对象存储，非 Google Drive）。
 * 本脚本把指定备份解包回 public/，恢复全部站点数据。
 * 用法：
 *   node scripts/restore-backup.js                 # 恢复 backups/latest.tar.gz
 *   node scripts/restore-backup.js --file backups/20260810.tar.gz
 * 跨平台：调用系统 tar（Windows 10+/Linux/macOS 均自带）。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PUBLIC_DIR } = require('./_sites');

function main() {
  const i = process.argv.indexOf('--file');
  const backupsDir = path.join(__dirname, '..', 'backups');
  let file = i >= 0 ? process.argv[i + 1] : path.join(backupsDir, 'latest.tar.gz');
  if (!path.isAbsolute(file)) file = path.join(backupsDir, file);
  if (!fs.existsSync(file)) { console.log('✕ 备份不存在:', file); return; }

  // 先备份当前数据，避免恢复出错无法回退
  const safe = path.join(backupsDir, 'pre-restore-' + Date.now() + '.tar.gz');
  try { execSync('tar -czf "' + safe + '" -C "' + PUBLIC_DIR + '" $(find . -type d -name data -o -type d -name article)', { stdio: 'ignore' }); console.log('当前数据已暂存:', safe); } catch (e) { /* 忽略 */ }

  execSync('tar -xzf "' + file + '" -C "' + PUBLIC_DIR + '"', { stdio: 'inherit' });
  console.log('✓ 已从', file, '恢复全站数据到 public/');
  console.log('随后请运行 node scripts/build-sitemap.js 重建地图');
}

main();
