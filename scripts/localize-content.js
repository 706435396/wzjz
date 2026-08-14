#!/usr/bin/env node
/*
 * localize-content.js — 本地内容语言清洗（无需任何 AI API key）
 * ----------------------------------------------------------------
 * 解决「站群里混进英文/裸 GitHub 仓库名/模板套话」问题：
 *   1) 把 `owner/repo` 形态的工具名 humanize 成干净品牌名
 *   2) 把「语种与站点不符」或明显模板套话的简介用对应语种重写
 *   3) 删除小语种站里混入的中文文章
 *   4) 修正文章里残留的裸仓库名（保留真实 GitHub URL 不变）
 *
 * 设计原则：无 key 不崩、幂等、默认只报告、--apply 才写盘。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DRY = !process.argv.includes('--apply');
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

// ---- 子站清单 ----
function subsiteDirs() {
  const map = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'common', 'domain-map.json'), 'utf8'));
  return Object.values(map.map);
}

// ---- 语言特征 ----
const CJK = /[一-龥]/;
const ES = /[áéíóúñ¿¡]/i;
const DE = /[äöüß]/i;

// 明显模板句（命中即重写）
const TEMPLATE_RES = {
  zh: /是一款面向?「?[^」]*」?场景的工具/,
  de: /ist ein Werkzeug der Kategorie/,
  es: /es una herramienta de la categoría/i
};

// 目标语言关键词（用于粗略判断是否为对应语言）
const LANG_HINTS = {
  zh: /\b(本地|在线|免费|工具|支持|生成|模型|AI|智能|使用|功能)\b/,
  de: /\b(der|die|das|und|oder|Werkzeug|Tool|kostenlos|für|auf|von|mit|Anleitung|Beschreibung)\b/i,
  es: /\b(el|la|los|las|de|en|herramienta|gratis|para|cómo|guía|descripción|enlace)\b/i
};

function baseLang(lang) {
  return String(lang || 'zh-CN').split('-')[0];
}

function shouldRewriteDesc(desc, lang) {
  if (!desc) return true;
  const bl = baseLang(lang);
  // 命中模板句 => 重写
  if (TEMPLATE_RES[bl] && TEMPLATE_RES[bl].test(desc)) return true;

  // 中文站：若简介里完全没有 CJK，或英文单词明显多于中文，视为英文/不完整
  if (bl === 'zh') {
    const cjkCount = (desc.match(/[一-龥]/g) || []).length;
    const enWordCount = (desc.match(/[a-zA-Z]{2,}/g) || []).length;
    if (cjkCount === 0) return true;
    if (enWordCount > cjkCount * 1.5) return true; // 英文占主导
    return false;
  }

  // 小语种站：目标语言特征极少 或 出现大量中文 => 重写
  const cjkCount = (desc.match(/[一-龥]/g) || []).length;
  if (cjkCount > 2) return true;
  const hint = LANG_HINTS[bl];
  if (hint && !hint.test(desc)) return true;
  return false;
}

// ---- owner/repo 检测 ----
const OWNER_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function humanize(raw) {
  let s = raw.split('/').pop();
  s = s.replace(/[_]+/g, ' ').replace(/-/g, ' ').trim();
  s = s.split(' ').map((w) => {
    if (!w) return w;
    if (w === w.toUpperCase()) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
  return s;
}

// ---- 更自然的简介模板 ----
function tmplDesc(name, cat, lang) {
  const bl = baseLang(lang);
  if (bl === 'zh') return `${name} 是一款 ${cat || '实用'}工具，支持在浏览器或本地直接使用，适合想快速上手的用户。`;
  if (bl === 'de') return `${name} ist ein ${cat || 'Utility'}-Tool. Hier findest du kuratierte Infos, häufige Fragen und den offiziellen Link.`;
  if (bl === 'es') return `${name} es una herramienta de ${cat || 'utilidades'}. En 72tool encontrarás su descripción, preguntas frecuentes y el enlace oficial.`;
  return `${name} — ${cat || 'tool'}.`;
}

// ---- 安全替换 ----
function safeReplace(text, oldName, newName) {
  if (!text || typeof text !== 'string' || oldName === newName) return text;
  const esc = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const re = new RegExp('(?<!github\\.com/)' + esc, 'g');
    return text.replace(re, newName);
  } catch (e) {
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
    return { site: dir, fixed: 0, renamed: 0, artRemoved: 0, artFixed: 0 };
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const lang = cfg.lang || 'zh-CN';
  const bl = baseLang(lang);
  let tools = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const isArray = Array.isArray(tools);
  const toolList = isArray ? tools : (tools.tools || []);

  const renameMap = {};
  let fixed = 0;
  let rewritten = 0;

  for (const t of toolList) {
    const rawName = (t.name || '').trim();
    if (OWNER_REPO.test(rawName)) {
      const nn = humanize(rawName);
      renameMap[rawName] = nn;
      t.name = nn;
      fixed++;
    }
    const desc = (t.desc || t.description || '');
    if (shouldRewriteDesc(desc, lang)) {
      t.desc = tmplDesc(t.name, t.category || '', lang);
      rewritten++;
    }
    if (!t.tags || !t.tags.length) {
      if (t.category) t.tags = [t.category];
    }
  }

  // 文章：删除语种不符的文章，并替换裸名
  let artRemoved = 0;
  let artFixed = 0;
  let arts = [];
  let origArtWrapper = null;
  if (fs.existsSync(artPath)) {
    origArtWrapper = JSON.parse(fs.readFileSync(artPath, 'utf8'));
    arts = Array.isArray(origArtWrapper) ? origArtWrapper : (origArtWrapper.articles || origArtWrapper.list || []);

    // 小语种站：标题/摘要里中文占比过高（中德/中西混杂）=> 删除
    const cleaned = [];
    for (const a of arts) {
      const title = String(a.title || '');
      const summary = String(a.summary || '');
      const text = title + ' ' + summary;
      const cjkCount = (text.match(/[一-龥]/g) || []).length;
      const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
      const cjkRatio = alphaCount ? cjkCount / (cjkCount + alphaCount) : (cjkCount ? 1 : 0);
      if (bl !== 'zh' && cjkRatio > 0.2) {
        artRemoved++;
        continue;
      }
      cleaned.push(a);
    }
    arts = cleaned;

    for (const a of arts) {
      for (const [oldN, newN] of Object.entries(renameMap)) {
        for (const f of ['title', 'summary', 'desc', 'body', 'keywords']) {
          if (a[f]) {
            const before = a[f];
            a[f] = safeReplace(a[f], oldN, newN);
            if (a[f] !== before) artFixed++;
          }
        }
      }
      if (typeof a.title === 'string' && OWNER_REPO.test(a.title)) {
        a.title = safeReplace(a.title, a.title, humanize(a.title));
        artFixed++;
      }
    }
  }

  if (!DRY) {
    // 写回 tools
    if (isArray) {
      fs.writeFileSync(dataPath, JSON.stringify(toolList, null, 2) + '\n', 'utf8');
    } else {
      tools.tools = toolList;
      fs.writeFileSync(dataPath, JSON.stringify(tools, null, 2) + '\n', 'utf8');
    }
    // 写回 articles
    if (origArtWrapper) {
      if (Array.isArray(origArtWrapper)) {
        fs.writeFileSync(artPath, JSON.stringify(arts, null, 2) + '\n', 'utf8');
      } else {
        if (origArtWrapper.articles) origArtWrapper.articles = arts;
        else if (origArtWrapper.list) origArtWrapper.list = arts;
        fs.writeFileSync(artPath, JSON.stringify(origArtWrapper, null, 2) + '\n', 'utf8');
      }
    }
  }

  console.log(`  · ${dir} [${lang}] 改名=${Object.keys(renameMap).length} 简介重写=${rewritten} 其他修正=${fixed - Object.keys(renameMap).length} 文章删除=${artRemoved} 文章修正=${artFixed}`);
  if (Object.keys(renameMap).length) console.log('       ', JSON.stringify(renameMap));
  return { site: dir, renamed: Object.keys(renameMap).length, fixed, rewritten, artRemoved, artFixed };
}

// ---- main ----
console.log(DRY ? '【DRY RUN】仅报告，不写盘。加 --apply 写回。' : '【APPLY】写回 data/list.json + article/list.json');
const dirs = subsiteDirs().filter((d) => (ONLY ? d === ONLY : true));
let total = 0, totalRen = 0, totalRew = 0, totalArtRem = 0, totalArtFix = 0;
for (const d of dirs) {
  const r = processSite(d);
  total += r.fixed; totalRen += r.renamed; totalRew += r.rewritten;
  totalArtRem += r.artRemoved; totalArtFix += r.artFixed;
}
console.log(`\n汇总：子站=${dirs.length} 工具改名=${totalRen} 简介重写=${totalRew} 其他修正=${total - totalRen} 文章删除=${totalArtRem} 文章修正=${totalArtFix}`);
if (DRY) console.log('（dry-run 未改动任何文件）');
