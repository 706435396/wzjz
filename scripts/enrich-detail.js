/* ============================================================
 * scripts/enrich-detail.js —— 工具详情页元数据富化（离线启发式）
 * ------------------------------------------------------------
 * 为已中文化的 zh 子站工具派生详情页所需的“基础信息 / 优缺点 / 使用步骤”
 * 字段，全部从已有 url / tags / desc / category 启发式推导，无需联网。
 *
 * 产出（写入每个 tool 对象，幂等，可重复运行）：
 *   tool.meta        { openSource, pricing, platforms[], license, updated }
 *   tool.pros[]     优点（按属性生成，非模板套话）
 *   tool.cons[]     注意事项
 *   tool.usageMode  'oss' | 'saas'  （决定使用步骤模板）
 *   tool.usage[]    使用步骤（已按模式展开为自然语言）
 *
 * 仅处理 config.lang 以 zh 开头的站点，避免污染 de/es。
 * 运行：node scripts/enrich-detail.js --dry-run
 *       node scripts/enrich-detail.js --apply
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const COMMON_DIR = path.join(PUBLIC_DIR, 'common');

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJSON(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8'); }
const lc = function (s) { return String(s || '').toLowerCase(); };

/* ---------- 启发式推导 ---------- */
function deriveMeta(t) {
  const url = lc(t.url);
  const tags = (t.tags || []).map(lc);
  const desc = lc(t.desc);
  const blob = url + ' ' + tags.join(' ') + ' ' + desc;

  const openSource = /github\.com|gitlab\.com|gitee\.com/.test(url);

  // 定价
  let pricing = 'freemium';
  if (openSource) pricing = 'free';
  else if (/免费|free/.test(blob) && !/付费|订阅|subscription|premium/.test(blob)) pricing = 'free';
  else if (/付费|订阅|subscription|premium|pro\b/.test(blob)) pricing = 'freemium';

  // 支持平台
  const platforms = [];
  if (/docker/.test(blob)) platforms.push('Docker');
  if (/本地部署|本地运行|自托管|self[\- ]?host|本地化/.test(blob) || openSource) {
    if (!platforms.includes('本地部署')) platforms.push('本地部署');
  }
  if (tags.includes('python') || /python/.test(blob)) platforms.push('Python 包');
  if (/api/.test(blob)) platforms.push('API 接口');
  if (/windows/.test(blob)) platforms.push('Windows');
  if (/mac|macos/.test(blob)) platforms.push('macOS');
  if (/linux/.test(blob)) platforms.push('Linux');
  if (/网页|web|云端|saas|在线|浏览器/.test(blob)) platforms.push('Web 云端');
  if (!platforms.length) platforms.push('Web 云端');

  const license = openSource ? '开源协议（详见仓库 LICENSE）' : null;

  return {
    openSource: openSource,
    pricing: pricing,
    platforms: platforms,
    license: license,
    updated: t.updated || null
  };
}

function deriveProsCons(t, meta) {
  const tags = (t.tags || []).map(lc);
  const blob = lc(t.desc) + ' ' + tags.join(' ');
  const pros = [];
  const cons = [];

  if (meta.openSource) {
    pros.push('开源免费，代码透明可审计，可自托管保障数据可控');
  } else {
    pros.push('开箱即用，无需本地安装与运维');
  }
  if (meta.platforms.includes('本地部署') || meta.platforms.includes('Docker')) {
    pros.push('支持本地 / Docker 部署，数据隐私更有保障');
  }
  if (meta.platforms.includes('Python 包') || tags.includes('python')) {
    pros.push('Python 生态完善，便于二次开发与集成');
  }
  if (meta.pricing === 'free') {
    pros.push('提供免费版本，个人与小规模使用零成本');
  } else if (meta.pricing === 'freemium') {
    pros.push('提供免费额度，可先试用再决定是否升级');
  }
  if (/api/.test(blob)) pros.push('提供 API，便于接入自动化工作流');

  if (meta.openSource) {
    cons.push('需要一定技术基础完成部署与运行环境配置');
  }
  if (meta.pricing !== 'free') {
    cons.push('高级功能与更高额度通常需要付费订阅');
  }
  if (meta.platforms.includes('Web 云端')) {
    cons.push('依赖网络连接，离线环境无法使用');
  }
  if (/企业|商业可用|commercial/.test(blob)) {
    cons.push('务必关注许可证对商业用途的约束');
  }
  if (!cons.length) cons.push('具体功能边界与限制以官方最新文档为准');
  if (pros.length > 4) pros.length = 4;
  if (cons.length > 3) cons.length = 3;
  return { pros, cons };
}

function deriveUsage(t, meta) {
  if (meta.openSource) {
    return {
      mode: 'oss',
      steps: [
        '在 GitHub 克隆仓库，或通过包管理器安装（如 pip install / npm i）。',
        '按 README 配置运行环境与依赖（如需 API Key 在此填入）。',
        '启动本地服务或命令行，构造你的第一个任务并试运行。',
        '结合本页下方「相关教程」查看具体部署示例与避坑要点。'
      ]
    };
  }
  return {
    mode: 'saas',
    steps: [
      '点击「访问官网」进入产品主页，完成注册并登录账号。',
      '选择适合的套餐或免费试用，进入控制台。',
      '在控制台挑选所需功能模块，按引导开始使用。',
      '遇到疑问可参考本页「相关教程」与官方文档。'
    ]
  };
}

/* ---------- 站点处理 ---------- */
function processSite(siteDir, apply) {
  const cfgPath = path.join(siteDir, 'config.json');
  if (!fs.existsSync(cfgPath)) return;
  const cfg = loadJSON(cfgPath);
  if (String(cfg.lang || 'zh-CN').split('-')[0] !== 'zh') return;

  const dataPath = path.join(siteDir, 'data', 'list.json');
  if (!fs.existsSync(dataPath)) return;
  const data = loadJSON(dataPath);

  let changed = 0;
  for (const t of (data.tools || [])) {
    const meta = deriveMeta(t);
    const pc = deriveProsCons(t, meta);
    const usage = deriveUsage(t, meta);
    const next = Object.assign({}, t, {
      meta: meta,
      pros: pc.pros,
      cons: pc.cons,
      usageMode: usage.mode,
      usage: usage.steps
    });
    // 仅当字段确实变化时计入 changed
    if (JSON.stringify(next) !== JSON.stringify(t)) {
      Object.assign(t, next);
      changed++;
    }
  }
  if (changed) {
    if (apply) saveJSON(dataPath, data);
    console.log((apply ? '✓ ' : '· '), path.relative(PUBLIC_DIR, siteDir), apply ? '富化 ' : '需富化 ', changed, '个工具详情元数据');
  } else {
    console.log('·', path.relative(PUBLIC_DIR, siteDir), '已是最新');
  }
}

function main() {
  const apply = process.argv.includes('--apply');
  if (!apply) console.log('（dry-run，未写盘。加 --apply 真正写入）\n');
  const domainMap = loadJSON(path.join(COMMON_DIR, 'domain-map.json'));
  const dirs = new Set(Object.values(domainMap.map || {}));
  for (const d of dirs) processSite(path.join(PUBLIC_DIR, d), apply);
  if (!apply) console.log('\n— dry-run 结束，确认无误后加 --apply —');
}

main();
