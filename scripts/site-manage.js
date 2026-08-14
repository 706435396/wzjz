/* ============================================================
 * scripts/site-manage.js  ——  站点一键启停（对应清单「五.1.2 批量启停」）
 * ------------------------------------------------------------
 * 用法：
 *   node scripts/site-manage.js disable <子域名>    下线站点
 *   node scripts/site-manage.js enable  <子域名>    恢复上线
 * 原理：修改 public/_redirects 中的「# SITE」注册表行
 *   disable -> 改为「# SITE-DISABLED」（build-sitemap 与 Functions 自动忽略）
 *   enable  -> 改回「# SITE」
 * 无需手动删文件、无需改脚本，下次采集/构建即生效。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const REDIRECTS = path.join(__dirname, '..', 'public', '_redirects');

function main() {
  const action = process.argv[2];
  const domain = (process.argv[3] || '').toLowerCase();
  if (!action || !domain || (action !== 'disable' && action !== 'enable')) {
    console.log('用法: node scripts/site-manage.js <disable|enable> <子域名>');
    process.exit(1);
  }
  if (!fs.existsSync(REDIRECTS)) { console.error('_redirects 不存在'); process.exit(1); }

  const lines = fs.readFileSync(REDIRECTS, 'utf8').split('\n');
  let changed = false;
  const out = lines.map((line) => {
    const s = line.trim();
    const en = s.match(/^#\s*SITE\s+(\S+)\s+(\S+)\s*$/);
    const dis = s.match(/^#\s*SITE-DISABLED\s+(\S+)\s+(\S+)\s*$/);
    if (action === 'disable' && en && en[1].toLowerCase() === domain) {
      changed = true; return '# SITE-DISABLED ' + en[1] + ' ' + en[2];
    }
    if (action === 'enable' && dis && dis[1].toLowerCase() === domain) {
      changed = true; return '# SITE ' + dis[1] + ' ' + dis[2];
    }
    return line;
  });

  if (!changed) { console.log('未找到匹配站点', domain, '（确认域名与 _redirects 中一致）'); process.exit(1); }
  fs.writeFileSync(REDIRECTS, out.join('\n'));
  console.log('✓', action === 'disable' ? '已下线' : '已恢复', domain, '— 下次构建生效');
}

main();
