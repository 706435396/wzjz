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

/* 生成小白友好的详细步骤；steps 元素支持多行标记：
 *   Step: 标题
 *   正文说明（可跨行）
 *   Code:\n多行命令\n
 *   Tip:\n小白提示\n
 *   Check:\n验证你是否成功\n
 */
function deriveUsage(t, meta) {
  const name = t.originName || t.name.replace(/（[^）]+）/g, '').trim();
  const repoMatch = String(t.url || '').match(/github\.com\/([^/]+\/[^/]+)/);
  const repo = repoMatch ? repoMatch[1] : '';
  const py = meta.platforms.includes('Python 包') || (t.tags || []).map(String).some(x => /python/i.test(x));
  const npm = /node|npm|javascript|js/i.test((t.tags || []).join(' ') + ' ' + t.desc);
  const docker = meta.platforms.includes('Docker');

  if (meta.openSource) {
    const steps = [
      `Step: 检查你的电脑环境\n小白提示：这个工具需要在本地运行，先确认你的电脑满足基本条件。\nTip:\n` +
      (py ? '需要安装 Python 3.10 或更高版本。' : npm ? '需要安装 Node.js 18 或更高版本。' : docker ? '需要安装 Docker Desktop。' : '需要安装对应的运行环境（详见仓库 README）。') +
      `\nCheck:\n打开终端输入 ${py ? '`python --version`' : npm ? '`node --v`' : docker ? '`docker --version`' : '对应命令'}，看到版本号说明环境 OK。`,
      `Step: 把代码下载到本地\n在桌面或你喜欢的文件夹里打开终端，复制下面的命令执行：\nCode:\n${repo ? `git clone https://github.com/${repo}.git\ncd ${repo.split('/')[1] || name}` : `git clone ${t.url || '仓库地址'}\ncd ${name}`}\nTip:\n第一次用 git 的同学：如果提示找不到 git，先去 https://git-scm.com 下载安装。`,
      `Step: 安装依赖\n项目需要一些额外的“积木”才能跑起来。\nCode:\n${py ? 'pip install -r requirements.txt' : npm ? 'npm install' : docker ? 'docker build -t ' + name + ' .' : 'make install'}\nTip:\n如果命令报错，多半是网络问题。Python 用户可尝试 \\"pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple\\"。`,
      `Step: 填入必要的 API Key / 账号配置\n很多 AI 工具需要连接大模型，请按仓库 README 找到配置项并填入。\nCode:\n# 示例：把下面的 xxx 换成你的真实 Key\nexport OPENAI_API_KEY="sk-xxx"\nTip:\n不要把 Key 截图发到公开群。建议先申请一个免费/低价 Key（如 GLM-4、DeepSeek）练手。`,
      `Step: 启动并运行你的第一个任务\n执行项目给出的示例命令，观察终端输出。\nCode:\n${py ? 'python examples/hello.py' : npm ? 'npm run example' : docker ? 'docker run -it --rm ' + name : './run.sh'}\nCheck:\n如果看到程序正常打印结果（没有红色 Error 字样），说明你已经跑通了。`,
      `Step: 遇到困难看这里\n第一次本地部署失败很正常，常见问题：\n1. 依赖版本不对 → 用仓库推荐的 Python/Node 版本；\n2. Key 没生效 → 检查环境变量是否设置成功；\n3. 网络连不上模型 API → 换国内镜像或换模型商。\nTip:\n本页下方「相关教程」里有更多具体示例，也可点击「访问官网」查看官方文档。`
    ];
    return { mode: 'oss', steps };
  }

  return {
    mode: 'saas',
    steps: [
      `Step: 进入官网并注册账号\n点击下方红色「访问官网」按钮，进入 ${name} 主页。找到「Sign Up / 注册」按钮，用邮箱或 Google/GitHub 账号登录。\nTip:\n如果官网打不开，检查网络或稍后再试；也可尝试切换浏览器。`,
      `Step: 选择适合你的套餐\n新用户通常有免费试用或免费额度。建议先选 Free 档，熟悉后再决定是否升级。\nCheck:\n注册成功后，你应该能看到控制台/仪表板（Dashboard）首页。`,
      `Step: 创建第一个任务 / 项目\n按界面引导点击「新建」或「Create New」，填入你的需求。大部分 SaaS 工具会给出模板，新手直接选第一个模板即可。\nTip:\n不要一上来就填复杂需求，先用一句简单的话测试，例如「帮我把这份网页内容总结成 3 点」。`,
      `Step: 查看结果并保存\n工具处理完成后会显示结果。确认符合预期后可以导出、复制链接或保存到本地。\nCheck:\n如果结果不满意，可点击「重新生成」或调整提示词再试一次。`,
      `Step: 进阶与省钱小技巧\n1. 先看官方 Quick Start / 文档，避免误用高消耗的模型；\n2. 关注免费额度用量，避免超额扣费；\n3. 本页「相关教程」里有国内访问与使用技巧，可继续参考。`
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
