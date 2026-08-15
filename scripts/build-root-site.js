/* ============================================================
 * scripts/build-root-site.js  ——  生成根域名总站数据
 * ------------------------------------------------------------
 * 根域名（72tool.com / www.72tool.com）没有专属子目录，本脚本把全部中文
 * 子站（lang=zh 或未指定）的 tools 聚合到 public/config.json +
 * public/data/list.json，让主站成为「总站入口」。
 * 由 build-sitemap.js 在末尾自动调用；也可单独运行：
 *   node scripts/build-root-site.js
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const REDIRECTS = path.join(PUBLIC_DIR, '_redirects');

function parseSites() {
  const sites = [];
  let raw = '';
  try { raw = fs.readFileSync(REDIRECTS, 'utf8'); } catch (e) { return sites; }
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^#\s*SITE\s+(\S+)\s+(\S+)\s*$/);
    if (m) {
      sites.push({ domain: m[1].toLowerCase(), dir: m[2].replace(/\\/g, '/') });
    }
  }
  return sites;
}

function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function isChinese(cfg) {
  const lk = String(cfg.lang || 'zh-CN').split('-')[0].toLowerCase();
  return lk === 'zh';
}

function buildRootSite() {
  const sites = parseSites();
  const allTools = [];
  const allArticles = [];
  let maxUpdated = '';

  for (const s of sites) {
    const siteDir = path.join(PUBLIC_DIR, s.dir);
    const cfg = readJSON(path.join(siteDir, 'config.json'));
    if (!cfg || !isChinese(cfg)) continue;

    const data = readJSON(path.join(siteDir, 'data', 'list.json'));
    if (data && Array.isArray(data.tools)) {
      if (data.updated && data.updated > maxUpdated) maxUpdated = data.updated;
      for (const t of data.tools) {
        if (!t || !t.name) continue;
        allTools.push(t);
      }
    }

    const adata = readJSON(path.join(siteDir, 'article', 'list.json'));
    if (adata && Array.isArray(adata.articles)) {
      if (adata.updated && adata.updated > maxUpdated) maxUpdated = adata.updated;
      for (const a of adata.articles) {
        if (!a || !a.slug) continue;
        allArticles.push(a);
      }
    }
  }

  // 按 slug 去重（保留第一个）
  const seenTool = new Set();
  const uniqueTools = [];
  for (const t of allTools) {
    const key = t.slug || slugify(t.name);
    if (seenTool.has(key)) continue;
    seenTool.add(key);
    uniqueTools.push(t);
  }

  const seenArt = new Set();
  const uniqueArticles = [];
  for (const a of allArticles) {
    if (seenArt.has(a.slug)) continue;
    seenArt.add(a.slug);
    uniqueArticles.push(a);
  }

  // 生成根配置（中文总站）
  const rootCfg = {
    domain: '72tool.com',
    name: '72tool',
    title: '72tool 工具导航',
    description: '精选在线工具与 AI 智能体导航',
    keywords: '工具,导航,AI,智能体,在线工具',
    category: '工具',
    lang: 'zh-CN',
    base: '/',
    article: {
      enabled: true,
      categories: ['部署教程', '使用技巧', '选型对比', '避坑指南']
    },
    ads: {
      enabled: false,
      region: 'cn',
      provider: 'adsterra',
      slots: { top: '', sidebar: '', article: '' }
    },
    theme: {
      brand: '#2563eb',
      layout: 'masonry',
      navOrder: ['首页', '教程资讯', 'Agent 集群', '工具集群']
    },
    community: {
      enabled: true,
      title: '开发者社群',
      url: '/community'
    },
    top: true,
    imageSitemap: true
  };

  fs.writeFileSync(path.join(PUBLIC_DIR, 'config.json'), JSON.stringify(rootCfg, null, 2));
  if (!fs.existsSync(path.join(PUBLIC_DIR, 'data'))) {
    fs.mkdirSync(path.join(PUBLIC_DIR, 'data'), { recursive: true });
  }
  fs.writeFileSync(path.join(PUBLIC_DIR, 'data', 'list.json'), JSON.stringify({ updated: maxUpdated || new Date().toISOString().slice(0, 10), tools: uniqueTools }, null, 2));

  if (!fs.existsSync(path.join(PUBLIC_DIR, 'article'))) {
    fs.mkdirSync(path.join(PUBLIC_DIR, 'article'), { recursive: true });
  }
  fs.writeFileSync(path.join(PUBLIC_DIR, 'article', 'list.json'), JSON.stringify({ updated: maxUpdated || new Date().toISOString().slice(0, 10), articles: uniqueArticles }, null, 2));

  console.log('✓ 根站数据已生成 | 工具', uniqueTools.length, '| 资讯', uniqueArticles.length);
  return { tools: uniqueTools, articles: uniqueArticles };
}

if (require.main === module) {
  buildRootSite();
}

module.exports = { buildRootSite };
