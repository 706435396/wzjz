#!/usr/bin/env node
'use strict';
/**
 * 批量把子域 CNAME 记录加到 Cloudflare DNS（zone 72tool.com）
 * ============================================================
 * 与 add-domains.js 配套：
 *   - add-domains.js  → 在 Pages 项目注册自定义域（CF 有时不会自动建 DNS 记录）
 *   - add-dns.js      → 在 zone 的 DNS 面板补 CNAME 记录，把子域指向 wzjz.pages.dev
 *
 * 子域清单同样来自 public/common/domain-map.json（站群唯一真相源）的 map key。
 *
 * 用法（本机 Git Bash / PowerShell / macOS）：
 *   # 基础：读清单，把 7 个子域的 CNAME 指向 wzjz.pages.dev
 *   node scripts/add-dns.js --token $CLOUDFLARE_API_TOKEN
 *
 *   # 顺便加 www（解决 CF 顶部「www 无法访问」提示）
 *   node scripts/add-dns.js --token $CLOUDFLARE_API_TOKEN --include-www
 *
 *   # dry-run：只打印将要添加的记录，不调用 API
 *   node scripts/add-dns.js --dry-run
 *
 *   # 指定 zone（本例 72tool.com）或 zone-id；本环境需代理时 --proxy
 *   node scripts/add-dns.js --token $CF --zone-name 72tool.com --proxy http://127.0.0.1:7890
 *
 * 凭据：--token 优先，否则环境变量 CLOUDFLARE_API_TOKEN
 * zone：--zone-id 直接给，或 --zone-name 自动解析（默认 72tool.com）
 *
 * 幂等：已存在的记录 API 返回 1062 "already exists"，脚本识别为「已存在(跳过)」。
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_MAP = path.join(REPO_ROOT, 'public', 'common', 'domain-map.json');
const DEFAULT_TARGET = 'wzjz.pages.dev';
const DEFAULT_ZONE_NAME = '72tool.com';
const API = 'https://api.cloudflare.com/client/v4';

function parseArgs(argv) {
  const o = {
    token: '', zoneId: '', zoneName: DEFAULT_ZONE_NAME, target: DEFAULT_TARGET,
    proxy: '', dryRun: false, includeWww: false, mapFile: DEFAULT_MAP, only: [], help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--token': o.token = argv[++i]; break;
      case '--zone-id': o.zoneId = argv[++i]; break;
      case '--zone-name': o.zoneName = argv[++i]; break;
      case '--target': o.target = argv[++i]; break;
      case '--map-file': o.mapFile = path.resolve(argv[++i]); break;
      case '--proxy': o.proxy = argv[++i]; break;
      case '--only': o.only.push(argv[++i].toLowerCase()); break;
      case '--include-www': o.includeWww = true; break;
      case '--dry-run': o.dryRun = true; break;
      case '-h': case '--help': o.help = true; break;
      default: console.error('未知参数: ' + a + '（用 --help 查看）'); process.exit(2);
    }
  }
  return o;
}

async function cf(method, url, token, body, proxy) {
  if (proxy) {
    const args = ['-sS', '-x', proxy, '-X', method, url,
      '-H', `Authorization: Bearer ${token}`, '-H', 'Content-Type: application/json'];
    if (body) args.push('--data', JSON.stringify(body));
    const out = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 1 << 20 });
    return JSON.parse(out);
  }
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return await r.json();
}

function loadSubdomains(mapFile) {
  if (!fs.existsSync(mapFile)) {
    console.error('✗ 找不到 domain-map.json: ' + mapFile + '\n  先运行 `npm run build`。');
    process.exit(1);
  }
  const j = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  return Object.keys(j.map || {});
}

async function resolveZoneId(o, token) {
  if (o.zoneId) return o.zoneId;
  const res = await cf('GET', `${API}/zones?name=${encodeURIComponent(o.zoneName)}`, token, null, o.proxy);
  if (!res.success || !res.result.length) {
    console.error('✗ 找不到 zone：' + o.zoneName + '（' + JSON.stringify(res.errors) + '）');
    process.exit(1);
  }
  return res.result[0].id;
}

function buildRecords(o) {
  const subs = loadSubdomains(o.mapFile).map((h) => h.toLowerCase());
  let names = subs;
  if (o.only.length) {
    const set = new Set(o.only);
    names = subs.filter((d) => set.has(d));
  }
  const records = names.map((name) => ({ type: 'CNAME', name, content: o.target, ttl: 1, proxied: true }));
  if (o.includeWww) {
    records.push({ type: 'CNAME', name: 'www.' + o.zoneName, content: o.target, ttl: 1, proxied: true });
  }
  return records;
}

async function main() {
  const o = parseArgs(process.argv);
  if (o.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('* 用法')[1]
      ? '用法见脚本头部注释。' : '');
    process.exit(0);
  }

  const records = buildRecords(o);
  if (!records.length) { console.log('没有需要处理的记录。'); process.exit(0); }

  if (o.dryRun) {
    console.log(`[DRY-RUN] 将在 zone ${o.zoneName} 添加以下 DNS 记录 (-> ${o.target})：`);
    records.forEach((r) => console.log(`  ${r.type}  ${r.name} -> ${r.content}  (proxied)`));
    console.log('\n去掉 --dry-run 并传入 --token 即可执行。\n');
    process.exit(0);
  }

  const token = o.token || process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    console.error('\n✗ 缺少凭据：请传 --token 或设置环境变量 CLOUDFLARE_API_TOKEN。');
    process.exit(1);
  }

  const zoneId = await resolveZoneId(o, token);
  console.log(`zone ${o.zoneName} (${zoneId}) 开始添加 ${records.length} 条 CNAME ...\n`);

  const rows = [];
  let ok = 0;
  for (const rec of records) {
    let res;
    try {
      res = await cf('POST', `${API}/zones/${zoneId}/dns_records`, token, rec, o.proxy);
    } catch (e) {
      rows.push([rec.name, '请求异常: ' + e.message]);
      continue;
    }
    if (res.success) { ok++; rows.push([rec.name, '已添加']); }
    else {
      const err = (res.errors || []).map((x) => `${x.code || ''} ${x.message || ''}`.trim()).join('; ');
      if (/1062|already exists|already exist/i.test(err)) rows.push([rec.name, '已存在(跳过)']);
      else rows.push([rec.name, '失败: ' + err]);
    }
  }

  const w = Math.max(...rows.map((r) => r[0].length), 4);
  console.log('域名'.padEnd(w) + '  结果');
  console.log('-'.repeat(w) + '  ' + '-'.repeat(28));
  for (const [name, label] of rows) console.log(name.padEnd(w) + '  ' + label);
  console.log(`\n完成：${ok}/${rows.length} 条成功（含已存在）。\n`);
  console.log('稍后到 Cloudflare → DNS 面板核对；Pages 自定义域状态会从 pending 变 active。');
}

main().catch((e) => { console.error(e); process.exit(1); });
