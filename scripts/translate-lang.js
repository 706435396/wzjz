/* ============================================================
 * scripts/translate-lang.js  ——  多语种全自动翻译流水线（复用智谱免费 API）
 * ------------------------------------------------------------
 * 对应清单「一.4 / 七.1」：中文工具/资讯一键生成英文、西语等简介，
 * 自动写入 lang 目录对应站点，适配谷歌海外长尾流量，零 Google 依赖。
 * 用法：
 *   node scripts/translate-lang.js --src agent/browser --target lang/en --to en
 *   node scripts/translate-lang.js --batch        # 预置：把主流中文站翻译为 en+es
 * 行为：
 *   读取源站 data/list.json + article/list.json -> 智谱翻译成目标语种 ->
 *   按 url/slug 去重合并写入目标站（目标站不存在则自动建目录 + config + 复制页面）。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, readTools, readArticles } = require('./_sites');
const { callLLM, extractJSON } = require('./_llm');

const LANG_NAME = { en: 'English', es: 'Español', de: 'Deutsch', ja: '日本語', fr: 'Français' };

function parseArgs() {
  const a = {}; const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--src') a.src = argv[++i];
    else if (argv[i] === '--target') a.target = argv[++i];
    else if (argv[i] === '--to') a.to = argv[++i];
    else if (argv[i] === '--batch') a.batch = true;
  }
  return a;
}

/* 翻译一批文本：返回 [{name,desc,body}] */
async function translateBatch(items, to) {
  const numbered = items.map((it, k) => (k + 1) + '. 名称:' + (it.name || '') + ' | 简介:' + (it.desc || '').slice(0, 60)).join('\n');
  const prompt =
    '把下面 ' + items.length + ' 条中文工具/资讯翻译成 ' + (LANG_NAME[to] || to) + '，保持专业、自然。\n' +
    '只输出 JSON 数组（顺序一致）：[{"name":"译名","desc":"译文简介60字内","body":"译文正文或空"}]\n\n' + numbered;
  const r = await callLLM(prompt, { temperature: 0.3, maxTokens: 1200 });
  const arr = r.ok ? extractJSON(r.text) : null;
  return Array.isArray(arr) ? arr : items.map((it) => ({ name: it.name, desc: it.desc, body: '' }));
}

async function translateSite(srcDir, targetDir, to) {
  const srcAbs = path.join(PUBLIC_DIR, srcDir.replace(/^\//, ''));
  const tgtAbs = path.join(PUBLIC_DIR, targetDir.replace(/^\//, ''));
  if (!fs.existsSync(srcAbs)) { console.warn('源站不存在:', srcDir); return; }

  // 目标站脚手架（不存在则建）
  if (!fs.existsSync(tgtAbs)) {
    fs.mkdirSync(path.join(tgtAbs, 'data'), { recursive: true });
    fs.mkdirSync(path.join(tgtAbs, 'article'), { recursive: true });
    copyIf('index.html', path.join(PUBLIC_DIR, 'index.html'), path.join(tgtAbs, 'index.html'));
    copyIf('article.html', path.join(PUBLIC_DIR, 'article.html'), path.join(tgtAbs, 'article.html'));
    const srcCfg = safeRead(path.join(srcAbs, 'config.json')) || {};
    const cfg = Object.assign({}, srcCfg, {
      domain: (srcCfg.domain || 'site') + '.' + to + 'tool.com',
      lang: to,
      name: (srcCfg.name || 'Tools') + ' (' + to + ')'
    });
    fs.writeFileSync(path.join(tgtAbs, 'config.json'), JSON.stringify(cfg, null, 2));
    fs.writeFileSync(path.join(tgtAbs, 'data', 'list.json'), JSON.stringify({ updated: '', tools: [] }, null, 2));
    fs.writeFileSync(path.join(tgtAbs, 'article', 'list.json'), JSON.stringify({ updated: '', articles: [] }, null, 2));
    console.log('✓ 已创建目标站目录:', targetDir);
  }

  // 工具翻译 + 合并
  const t = readTools(srcAbs); const tg = readTools(tgtAbs) || { updated: '', tools: [] };
  if (t && t.tools.length) {
    const translated = await translateBatch(t.tools.map((x) => ({ name: x.name, desc: x.desc })), to);
    const seen = new Set(tg.tools.map((x) => (x.url || '').toLowerCase()));
    t.tools.forEach((x, i) => {
      const tr = translated[i] || {};
      if (seen.has((x.url || '').toLowerCase())) return;
      tg.tools.push(Object.assign({}, x, { name: tr.name || x.name, desc: tr.desc || x.desc, body: tr.body || '' }));
    });
    tg.updated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(path.join(tgtAbs, 'data', 'list.json'), JSON.stringify(tg, null, 2));
  }

  // 资讯翻译 + 合并
  const a = readArticles(srcAbs); const ag = readArticles(tgtAbs) || { updated: '', articles: [] };
  if (a && a.articles.length) {
    const translated = await translateBatch(a.articles.map((x) => ({ name: x.title, desc: x.summary })), to);
    const seen = new Set(ag.articles.map((x) => (x.slug || '').toLowerCase()));
    a.articles.forEach((x, i) => {
      const tr = translated[i] || {};
      if (seen.has((x.slug || '').toLowerCase())) return;
      ag.articles.push(Object.assign({}, x, { title: tr.name || x.title, summary: tr.desc || x.summary, body: '<p>' + (tr.desc || x.summary || '') + '</p>' }));
    });
    ag.updated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(path.join(tgtAbs, 'article', 'list.json'), JSON.stringify(ag, null, 2));
  }
  console.log('✓ 翻译完成:', srcDir, '->', targetDir, '(', to, ')');
}

function copyIf(name, from, to) { if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to); }
function safeRead(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }

async function main() {
  const a = parseArgs();
  if (a.batch) {
    const srcs = ['agent/browser', 'agent/tiktok', 'agent/localgpu', 'tools/txtclean', 'tools/sitemapgen'];
    for (const s of srcs) {
      await translateSite(s, 'lang/en/' + s.split('/').pop(), 'en').catch((e) => console.warn(e.message));
      await translateSite(s, 'lang/es/' + s.split('/').pop(), 'es').catch((e) => console.warn(e.message));
    }
  } else if (a.src && a.target && a.to) {
    await translateSite(a.src, a.target, a.to);
  } else {
    console.log('用法：--src <源目录> --target <目标目录> --to <语种> | 或 --batch');
    return;
  }
  require('./build-sitemap');
}

main().catch((e) => { console.error('翻译异常:', e); process.exit(1); });
