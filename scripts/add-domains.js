#!/usr/bin/env node
'use strict';
/**
 * 批量把子域加为 Cloudflare Pages 自定义域
 * ============================================================
 * 子域清单来自 public/common/domain-map.json（scripts/build-sitemap.js
 * 从 _redirects 的「# SITE」注册表自动生成），是站群的唯一真相源。
 *
 * 用法（在本机 Git Bash / PowerShell / macOS 终端运行）：
 *   # 基础：读 domain-map.json，把全部子域注册到 wzjz 项目
 *   node scripts/add-domains.js \
 *       --token  $CLOUDFLARE_API_TOKEN \
 *       --account $CLOUDFLARE_ACCOUNT_ID
 *
 *   # dry-run（只打印将要添加的域名，不调用 API）
 *   node scripts/add-domains.js --dry-run
 *
 *   # 先重新生成 domain-map.json 再添加（新增站点后同步用）
 *   node scripts/add-domains.js --rebuild --token xxx --account yyy
 *
 *   # 只处理个别子域
 *   node scripts/add-domains.js --only gpuagent.72tool.com --only es.72tool.com --token xxx --account yyy
 *
 *   # 本环境需要代理才能访问 CF API 时
 *   node scripts/add-domains.js --proxy http://127.0.0.1:7890 --token xxx --account yyy
 *
 * 凭据优先级：命令行 --token/--account > 环境变量 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID
 *
 * 重要限制（Cloudflare 平台约束）：
 *   - Pages 自定义域【不支持】通配符 *.example.com（API 直接返回 8000015 invalid），
 *     所以本脚本按子域逐个注册；要真·通配符请用 Cloudflare for SaaS。
 *   - 目标域名必须已经是 Cloudflare 托管的 zone（NS 已改到 CF、状态 Active），
 *     否则 API 报 zone not found。
 *
 * 幂等：已添加的域名 API 会返回 success=true + "already added" 信息，脚本识别为「已存在」跳过。
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PROJECT = 'wzjz';
const DEFAULT_MAP_FILE = path.join(REPO_ROOT, 'public', 'common', 'domain-map.json');
const BUILD_SITEMAP = path.join(REPO_ROOT, 'scripts', 'build-sitemap.js');

function parseArgs(argv) {
  const o = {
    only: [],
    includeRoot: false,
    rebuild: false,
    dryRun: false,
    proxy: '',
    token: '',
    account: '',
    project: DEFAULT_PROJECT,
    mapFile: DEFAULT_MAP_FILE,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--token': o.token = argv[++i]; break;
      case '--account': o.account = argv[++i]; break;
      case '--project': o.project = argv[++i]; break;
      case '--proxy': o.proxy = argv[++i]; break;
      case '--map-file': o.mapFile = path.resolve(argv[++i]); break;
      case '--only': o.only.push(argv[++i].toLowerCase()); break;
      case '--include-root': o.includeRoot = true; break;
      case '--rebuild': o.rebuild = true; break;
      case '--dry-run': o.dryRun = true; break;
      case '-h': case '--help': o.help = true; break;
      default:
        console.error('未知参数: ' + a + '（用 --help 查看用法）');
        process.exit(2);
    }
  }
  return o;
}

function showHelp() {
  console.log(fs.readFileSync(__filename, 'utf8').split('* 用法')[1]
    ? `node scripts/add-domains.js [--token T] [--account A] [--project wzjz]
  [--dry-run] [--rebuild] [--only host ...] [--include-root]
  [--proxy http://127.0.0.1:7890] [--map-file path]
详见脚本头部注释。`
    : '');
}

function loadDomains(mapFile, includeRoot) {
  if (!fs.existsSync(mapFile)) {
    console.error('✗ 找不到 domain-map.json: ' + mapFile);
    console.error('  先运行 `npm run build` 或带 --rebuild 自动生成。');
    process.exit(1);
  }
  const j = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const sub = Object.keys(j.map || {});
  const roots = (j.root || []);
  const all = includeRoot ? [...new Set([...roots, ...sub])] : sub;
  return all.map((h) => h.toLowerCase());
}

async function cfAddDomain(o, name) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${o.account}/pages/projects/${o.project}/domains`;
  const headers = { Authorization: `Bearer ${o.token}`, 'Content-Type': 'application/json' };
  const body = JSON.stringify({ name });

  // 给了代理时用 curl（Node fetch 默认不走 HTTP_PROXY 环境变量）
  if (o.proxy) {
    const out = execFileSync('curl', [
      '-sS', '-x', o.proxy, '-X', 'POST', url,
      '-H', `Authorization: Bearer ${o.token}`,
      '-H', 'Content-Type: application/json',
      '--data', body,
    ], { encoding: 'utf8', maxBuffer: 1 << 20 });
    return JSON.parse(out);
  }
  const r = await fetch(url, { method: 'POST', headers, body });
  return await r.json();
}

function interpret(res, name) {
  if (!res || typeof res.success !== 'boolean') {
    return { ok: false, label: 'API 返回异常: ' + JSON.stringify(res).slice(0, 120) };
  }
  if (res.success) {
    const msg = (res.messages || []).map((m) => (typeof m === 'string' ? m : m.message)).join(' ');
    if (/already|已添加|exists/i.test(msg)) {
      return { ok: true, label: '已存在(跳过)', status: 'exists' };
    }
    const status = res.result && res.result.status ? res.result.status : 'ok';
    return { ok: true, label: '已添加(' + status + ')', status };
  }
  const err = (res.errors || []).map((e) => `${e.code || ''} ${e.message || ''}`.trim()).join('; ');
  // 通配符之类硬错也视为「跳过」而非中断
  if (/8000015|invalid/i.test(err)) return { ok: false, label: '无效域名(跳过): ' + err, status: 'invalid' };
  return { ok: false, label: '失败: ' + err, status: 'error' };
}

async function main() {
  const o = parseArgs(process.argv);
  if (o.help) { showHelp(); process.exit(0); }

  if (o.rebuild && !o.dryRun) {
    console.log('▶ 重新生成 domain-map.json (node scripts/build-sitemap.js) ...');
    execFileSync('node', [BUILD_SITEMAP], { stdio: 'inherit', cwd: REPO_ROOT });
  }

  let domains = loadDomains(o.mapFile, o.includeRoot);
  if (o.only.length) {
    const set = new Set(o.only);
    domains = domains.filter((d) => set.has(d));
    const missing = o.only.filter((d) => !domains.includes(d));
    if (missing.length) console.warn('⚠ 以下 --only 域名不在清单中（仍会尝试添加）: ' + missing.join(', '));
  }
  if (!domains.length) { console.log('没有需要处理的域名。'); process.exit(0); }

  console.log(`\n将对 ${domains.length} 个域名操作（项目 ${o.project}）：`);
  domains.forEach((d) => console.log('  - ' + d));

  if (o.dryRun) {
    console.log('\n[DRY-RUN] 未调用 API。去掉 --dry-run 并传入 --token/--account 即可执行。\n');
    process.exit(0);
  }

  const token = o.token || process.env.CLOUDFLARE_API_TOKEN;
  const account = o.account || process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) {
    console.error('\n✗ 缺少凭据：请传 --token/--account，或设置环境变量 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID。');
    process.exit(1);
  }

  console.log('\n开始调用 Cloudflare API ...\n');
  const rows = [];
  let okCount = 0;
  for (const name of domains) {
    let res;
    try {
      res = await cfAddDomain(o, name);
    } catch (e) {
      rows.push([name, '请求异常: ' + e.message]);
      continue;
    }
    const r = interpret(res, name);
    if (r.ok) okCount++;
    rows.push([name, r.label]);
  }

  // 表格输出
  const w = Math.max(...rows.map((r) => r[0].length), 4);
  console.log('域名'.padEnd(w) + '  结果');
  console.log('-'.repeat(w) + '  ' + '-'.repeat(30));
  for (const [name, label] of rows) {
    console.log(name.padEnd(w) + '  ' + label);
  }
  console.log(`\n完成：${okCount}/${rows.length} 个成功（含已存在）。\n`);
  console.log('稍后用以下命令检查状态（CF 会为每个新增子域自动建 CNAME + 验证证书）：');
  console.log('  GET https://api.cloudflare.com/client/v4/accounts/' + account +
    '/pages/projects/' + o.project + '/domains  (Authorization: Bearer <token>)');
}

main().catch((e) => { console.error(e); process.exit(1); });
