/* ============================================================
 * scripts/chinese-names.js —— 中文子站工具名本地化
 * ------------------------------------------------------------
 * 规则：
 *   1) 仅处理 config.lang 为 zh-CN 的子站；
 *   2) 对已知英文工具名改写为「中文名（English）」；
 *   3) 保留原始名到 originName，并生成 slug（用于 ?tool= 深链与 sitemap）。
 * 运行：node scripts/chinese-names.js
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const COMMON_DIR = path.join(PUBLIC_DIR, 'common');

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJSON(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8'); }

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// 已知英文/无中文工具名 -> 「中文名（English）」
const DICT = {
  'Browser Use': '浏览器使用 (Browser Use)',
  'Playwright': '跨浏览器自动化框架 (Playwright)',
  'Puppeteer': '浏览器控制库 (Puppeteer)',
  'AgentQL': '语义化数据提取 (AgentQL)',
  'Skyvern': '视觉网页智能体 (Skyvern)',
  'Spiderfoot': '开源情报收集 (Spiderfoot)',
  'LTX 2': 'AI 视频生成模型 (LTX 2)',
  'Holehe': '邮箱账号探测 (Holehe)',
  'Agency Agents': '代理智能体框架 (Agency Agents)',
  'Loopx': '浏览器自动化 (Loopx)',
  'Book To Skill': '技能学习转换器 (Book To Skill)',
  'Obsidian Skills': 'Obsidian 技能插件 (Obsidian Skills)',
  'Code Graph Rag': '代码图谱 RAG (Code Graph Rag)',
  'CapCut 跨境版': '剪映国际版 (CapCut)',
  'Opus Clip': 'AI 短视频切片 (Opus Clip)',
  'Exolyt': 'TikTok 数据分析 (Exolyt)',
  'Predis.ai': 'AI 内容生成 (Predis.ai)',
  'Combo Creator': '矩阵发布脚本 (Combo Creator)',
  'Holaos': '短视频自动化 (Holaos)',
  'Diagram Design': '图表设计 (Diagram Design)',
  'Skills': '智能体技能库 (Skills)',
  'Agent Skills': '智能体技能库 (Agent Skills)',
  'Manim': '数学动画引擎 (Manim)',
  'Ollama': '本地大模型运行 (Ollama)',
  'Stable Diffusion WebUI': 'Stable Diffusion 出图界面 (Stable Diffusion WebUI)',
  'LM Studio': '大模型桌面客户端 (LM Studio)',
  'PrivateGPT': '私有知识库问答 (PrivateGPT)',
  'Unsloth': '大模型高效微调 (Unsloth)',
  'Switchyard': '模型路由编排 (Switchyard)',
  'Modly': '模块化 AI 工具 (Modly)',
  'Fluidvoice': '语音交互框架 (Fluidvoice)',
  'Tencentdb Agent Memory': '腾讯数据库智能体 (TencentDB Agent Memory)',
  'Comfyui': 'ComfyUI 工作流出图 (ComfyUI)',
  'Needle': '数据索引框架 (Needle)',
  'TxtClean 古籍清洗': '古籍文本清洗 (TxtClean)',
  'OpenCC 开源繁简转换': '开源繁简转换 (OpenCC)',
  'Punctuator 自动标点': '自动标点模型 (Punctuator)',
  '在线去重空行工具': '在线去重空行工具 (TextClean)',
  'Semantica': '语义化知识管理 (Semantica)',
  'Ragflow': 'RAGFlow 知识库 (Ragflow)',
  'Pdf Inspector': 'PDF 结构检查 (PDF Inspector)',
  'Chinatextbook': '中文教材资源库 (ChinaTextbook)',
  'Prime Agent': '自主 AI 智能体 (Prime Agent)',
  'Drawdb': '数据库关系图 (DrawDB)',
  'Macro': '法律文档自动化 (Macro)',
  'Ladybird': 'Ladybird 浏览器 (Ladybird)',
  'SitemapGen 在线生成': '站点地图生成器 (SitemapGen)',
  'Screaming Frog SEO Spider': '尖叫青蛙 SEO 爬虫 (Screaming Frog)',
  'xml-sitemap 生成库': 'Sitemap 生成库 (xml-sitemap)',
  'Google Search Console': '谷歌搜索控制台 (Google Search Console)',
  'Deepseek Reasonix': 'DeepSeek 推理模型 (Deepseek Reasonix)'
};

const hasCJK = /[\u4e00-\u9fa5]/;

function processSite(siteDir) {
  const cfgPath = path.join(siteDir, 'config.json');
  if (!fs.existsSync(cfgPath)) return;
  const cfg = loadJSON(cfgPath);
  if (String(cfg.lang || 'zh-CN').split('-')[0] !== 'zh') return;

  const dataPath = path.join(siteDir, 'data', 'list.json');
  if (!fs.existsSync(dataPath)) return;
  const data = loadJSON(dataPath);
  let changed = 0;
  for (const t of (data.tools || [])) {
    const old = String(t.name || '');
    // 保留原始英文名供 slug 与旧链接兼容
    if (!t.originName && !hasCJK.test(old)) t.originName = old;
    const mapped = DICT[old];
    if (mapped && mapped !== old) {
      t.name = mapped;
      changed++;
    }
    // 统一生成稳定 slug
    if (!t.slug) {
      t.slug = slugify(t.originName || t.name);
    }
  }
  if (changed) {
    saveJSON(dataPath, data);
    console.log('✓', path.relative(PUBLIC_DIR, siteDir), '已中文化', changed, '个工具名');
  } else {
    console.log('·', path.relative(PUBLIC_DIR, siteDir), '无需修改');
  }
}

function main() {
  const domainMap = loadJSON(path.join(COMMON_DIR, 'domain-map.json'));
  const dirs = new Set(Object.values(domainMap.map || {}));
  for (const d of dirs) processSite(path.join(PUBLIC_DIR, d));
}

main();
