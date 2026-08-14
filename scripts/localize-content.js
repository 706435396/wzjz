#!/usr/bin/env node
/*
 * localize-content.js — 本地内容语言清洗（无需任何 AI API key）
 * ----------------------------------------------------------------
 * 解决「站群里混进英文/裸 GitHub 仓库名」问题：爬虫在没有 LLM key 时，
 * 会把 GitHub trending 的 URL 路径 `owner/repo` 直接当成工具名，且 desc 是
 * GitHub 原文（英文），但分类已是目标语种 —— 于是中文/西/德站里混进了
 * `megadose/holehe` 这种英文名 + 英文简介。
 *
 * 本脚本离线修复：
 *   1) 把 `owner/repo` 形态的工具名 humanize 成干净品牌名（Holehe / LTX 2）
 *   2) 把「语种与站点不符」的简介用对应语种模板重写（zh/es/de）
 *   3) 当 tags 为空时，从 category 派生一个标签
 *   4) 修正文章里引用了裸名的标题/正文（保留真实 GitHub URL 不变）
 *
 * 设计原则（与项目一致）：无 key 不崩、幂等、默认只报告、--apply 才写盘。
 * 用法：
 *   node scripts/localize-content.js                 # 仅报告将改什么
 *   node scripts/localize-content.js --apply         # 写回 data/list.json + article/list.json
 *   node scripts/localize-content.js --apply --only agent/browser
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DRY = !process.argv.includes('--apply');
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

// ---- 子站清单（与 public/common/domain-map.json 的 map 同步）----
function subsiteDirs() {
  const map = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'common', 'domain-map.json'), 'utf8'));
  return Object.values(map.map); // ['agent/browser', ...]
}

// ---- 语言判定 ----
const CJK = /[一-鿿]/;
const ES = /[áéíóúñ¿¡]/i;
const DE = /[äöüß]/i;
function hasLang(text, lang) {
  if (!text) return false;
  if (lang.startsWith('zh')) return CJK.test(text);
  if (lang === 'es') return ES.test(text) || /\b(el|la|los|las|de|herramienta|gratis|para|cómo|guía)\b/i.test(text);
  if (lang === 'de') return DE.test(text) || /\b(der|die|das|und|werkzeug|kostenlos|anleitung|wie|für)\b/i.test(text);
  return true;
}

// ---- owner/repo 检测 ----
const OWNER_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

// ---- humanize：owner/repo -> 干净品牌名 ----
function humanize(raw) {
  let s = raw.split('/').pop();           // 丢掉 owner
  s = s.replace(/[_]+/g, ' ').replace(/-/g, ' ').trim();
  // 全大写 token（含数字）保留，其余首字母大写
  s = s.split(' ').map((w) => {
    if (!w) return w;
    if (w === w.toUpperCase()) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
  return s;
}

// ---- 各语种简介模板 ----
function tmplDesc(name, cat, lang) {
  if (lang.startsWith('zh')) return `${name} 是一款面向「${cat}」场景的工具，本站已整理其使用方式、适用场景与常见问答，进入详情页可查看官方入口与实操步骤。`;
  if (lang === 'es') return `${name} es una herramienta de la categoría «${cat}». En 72tool encontrarás su descripción, preguntas frecuentes y el enlace oficial.`;
  if (lang === 'de') return `${name} ist ein Werkzeug der Kategorie «${cat}». Bei 72tool findest du Beschreibung, häufige Fragen und den offiziellen Link.`;
  return `${name} — ${cat}.`;
}

// ---- 安全替换：避免改到 github.com/ 后的真实路径 ----
function safeReplace(text, oldName, newName) {
  if (!text || typeof text !== 'string' || oldName === newName) return text;
  const esc = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const re = new RegExp('(?<!github\\.com/)' + esc, 'g');
    return text.replace(re, newName);
  } catch (e) {
    // 老 Node 不支持 lookbehind 时的兜底
    return text.split(oldName).join(newName);
  }
}

// ---- 处理单个子站 ----
function processSite(dir) {
  const base = path.join(PUBLIC, dir);
  const cfgPath = path.join(base, 'config.json');
  const dataPath = path.join(base, 'data', 'list.json');
  const artPath = path.join(base, 'article', 'list.json');
  if (!fs.existsSync(cfgPath) || !fs.existsSync(dataPath)) {
    console.log(`  · 跳过 ${dir}（缺 config/data）`);
    return { site: dir, fixed: 0, renamed: 0, artFixed: 0 };
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const lang = cfg.lang || 'zh-CN';
  let tools = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  tools = Array.isArray(tools) ? tools : (tools.tools || []);

  const renameMap = {}; // oldName -> newName
  let fixed = 0;
  for (const t of tools) {
    const rawName = (t.name || '').trim();
    if (OWNER_REPO.test(rawName)) {
      const nn = humanize(rawName);
      renameMap[rawName] = nn;
      t.name = nn;
      fixed++;
    }
    const desc = (t.desc || t.description || '');
    if (!hasLang(desc, lang)) {
      t.desc = tmplDesc(t.name, t.category || '', lang);
      fixed++;
    }
    if (!t.tags || !t.tags.length) {
      if (t.category) t.tags = [t.category];
    }
  }

  // 文章：把引用了裸名的标题/正文替换成新名（保留真实 URL）
  let artFixed = 0;
  if (fs.existsSync(artPath)) {
    let arts = JSON.parse(fs.readFileSync(artPath, 'utf8'));
    arts = Array.isArray(arts) ? arts : (arts.articles || arts.list || []);
    for (const a of arts) {
      for (const [oldN, newN] of Object.entries(renameMap)) {
        for (const f of ['title', 'summary', 'desc', 'body', 'keywords']) {
          if (a[f]) {
            const before = a[f];
            a[f] = safeReplace(a[f], oldN, newN);
            if (a[f] !== before) artFixed++;
          }
        }
        // 标题里残留的 owner/repo（未被 map 覆盖的情况）
        if (typeof a.title === 'string' && OWNER_REPO.test(a.title)) {
          a.title = safeReplace(a.title, a.title, humanize(a.title));
          artFixed++;
        }
      }
    }
    if (!DRY) {
      // 写回（保持数组形态）
      const orig = JSON.parse(fs.readFileSync(artPath, 'utf8'));
      const target = Array.isArray(orig) ? arts : orig;
      if (!Array.isArray(orig)) {
        if (orig.articles) orig.articles = arts;
        else if (orig.list) orig.list = arts;
      }
      fs.writeFileSync(artPath, JSON.stringify(orig, null, 2) + '\n', 'utf8');
    }
  }

  if (!DRY) {
    const origTools = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    if (Array.isArray(origTools)) fs.writeFileSync(dataPath, JSON.stringify(tools, null, 2) + '\n', 'utf8');
    else { origTools.tools = tools; fs.writeFileSync(dataPath, JSON.stringify(origTools, null, 2) + '\n', 'utf8'); }
  }

  console.log(`  · ${dir} [${lang}] 工具改名=${Object.keys(renameMap).length} 简介重写=${fixed - Object.keys(renameMap).length} 文章修正=${artFixed}`);
  if (Object.keys(renameMap).length) console.log('       ', JSON.stringify(renameMap));
  return { site: dir, renamed: Object.keys(renameMap).length, fixed, artFixed };
}

// ---- main ----
console.log(DRY ? '【DRY RUN】仅报告，不写盘。加 --apply 写回。' : '【APPLY】写回 data/list.json + article/list.json');
const dirs = subsiteDirs().filter((d) => (ONLY ? d === ONLY : true));
let total = 0, totalArt = 0, totalRen = 0;
for (const d of dirs) {
  const r = processSite(d);
  total += r.fixed; totalArt += r.artFixed; totalRen += r.renamed;
}
console.log(`\n汇总：子站=${dirs.length} 工具项修正=${total}（其中改名=${totalRen}） 文章修正=${totalArt}`);
if (DRY) console.log('（dry-run 未改动任何文件）');
