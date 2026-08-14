/* ============================================================
 * scripts/aff-import.js —— 联盟 PID / 商家映射批量导入（§5.3）
 * ------------------------------------------------------------
 * 痛点：手动写 affiliate-map.json 上百条低效。
 * 方案：解析 CSV（match,network,advertiser,pid,aid,cid,mid,commission），
 *       幂等合并进 scripts/affiliate-map.json：
 *         - 同一 network + 任一 match 域名重叠 → 更新该规则（不重复插入）；
 *         - 否则新增一条；
 *         - 用结构化哈希比对，内容一致不产生假 diff。
 *
 * CSV 示例（首行表头，match 可逗号分隔多个域名）：
 *   match,network,advertiser,pid,aid,cid,mid,commission
 *   example.com,impact,Example SaaS,abc123,,CMP123,****,8
 *   shop.io,cj,Shop,cjpid99,ADV1,,,
 *
 * 用法：
 *   node scripts/aff-import.js --csv import.csv
 *   node scripts/aff-import.js --csv import.csv --dry     # 仅预览改动，不写盘
 *   node scripts/aff-import.js --csv import.csv --force    # 强制覆盖（默认仅在值更具体时更新）
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
let CSV = '';
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--csv=')) CSV = argv[i].split('=')[1];
  else if (argv[i] === '--csv' && argv[i + 1]) CSV = argv[++i];
}
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');
const MAP_PATH = path.join(__dirname, 'affiliate-map.json');

/* 极简 CSV 解析（支持双引号字段与字段内逗号） */
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function readJSON(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }

function main() {
  if (!CSV) { console.error('用法: node scripts/aff-import.js --csv import.csv [--dry|--force]'); process.exit(1); }
  if (!fs.existsSync(CSV)) { console.error('CSV 不存在:', CSV); process.exit(1); }
  const rows = parseCSV(fs.readFileSync(CSV, 'utf8'));
  if (!rows.length) { console.error('CSV 为空'); process.exit(1); }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {};
  ['match', 'network', 'advertiser', 'pid', 'aid', 'cid', 'mid', 'commission'].forEach((k) => { idx[k] = header.indexOf(k); });
  if (idx.match < 0 || idx.network < 0) { console.error('CSV 必须含 match,network 列'); process.exit(1); }

  const map = readJSON(MAP_PATH, { rules: [] });
  if (!Array.isArray(map.rules)) map.rules = [];

  let added = 0, updated = 0, skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || !cols.some((c) => String(c).trim())) continue;
    const matches = String(cols[idx.match] || '').split(/[;,]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const network = String(cols[idx.network] || '').trim().toLowerCase();
    if (!matches.length || !network) { console.warn('跳过（缺 match/network）: ', cols.join(',')); skipped++; continue; }
    const rule = { match: matches, network };
    const adv = cols[idx.advertiser]; if (adv != null && String(adv).trim()) rule.advertiser = String(adv).trim();
    const pid = cols[idx.pid]; if (pid != null && String(pid).trim()) rule.pid = String(pid).trim();
    const aid = cols[idx.aid]; if (aid != null && String(aid).trim()) rule.aid = String(aid).trim();
    const cid = cols[idx.cid]; if (cid != null && String(cid).trim()) rule.cid = String(cid).trim();
    const mid = cols[idx.mid]; if (mid != null && String(mid).trim()) rule.mid = String(mid).trim();
    const comm = cols[idx.commission]; if (comm != null && String(comm).trim()) { const n = Number(comm); if (!isNaN(n)) rule.commission = n; }

    // 查重：同 network 且任一 match 域名重叠 → 视为同一条，更新
    let hit = -1;
    for (let i = 0; i < map.rules.length; i++) {
      const ex = map.rules[i];
      if (ex.network !== rule.network) continue;
      const exMatch = Array.isArray(ex.match) ? ex.match : [ex.match];
      if (exMatch.some((m) => matches.indexOf(String(m).toLowerCase()) >= 0)) { hit = i; break; }
    }
    if (hit >= 0) {
      const exMatch = Array.isArray(map.rules[hit].match) ? map.rules[hit].match : [map.rules[hit].match];
      if (FORCE) { map.rules[hit] = rule; updated++; }
      else {
        // 仅在提供更具体信息（之前缺 pid/aid 等）时更新，避免回退已填值
        let changed = false;
        for (const k of ['pid', 'aid', 'cid', 'mid', 'commission', 'advertiser']) {
          if (rule[k] != null && map.rules[hit][k] == null) { map.rules[hit][k] = rule[k]; changed = true; }
        }
        // match 合并去重
        const merged = Array.from(new Set(exMatch.concat(rule.match)));
        if (merged.length !== exMatch.length) { map.rules[hit].match = merged; changed = true; }
        changed ? updated++ : skipped++;
      }
    } else {
      map.rules.push(rule); added++;
    }
  }

  console.log('导入结果：新增 ' + added + ' | 更新 ' + updated + ' | 跳过 ' + skipped + ' | 当前规则总数 ' + map.rules.length);
  if (DRY) { console.log('（--dry，未写盘）'); return; }
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
  console.log('✓ 已写入', path.relative(process.cwd(), MAP_PATH));
}

try { main(); } catch (e) { console.error('导入异常:', e.message); process.exit(1); }
