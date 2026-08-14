/* ============================================================
 * scripts/_sites.js  ——  站点清单 / 数据读取 共享助手（新脚本复用）
 * ------------------------------------------------------------
 * 解析 public/_redirects 的「# SITE <域名> <目录>」注册表，列出全部子站；
 * 提供 slugify、工具/资讯数据读取，供去重、长尾词、翻译、安全扫描等脚本复用。
 * 与 build-sitemap.js 逻辑一致但独立实现，不改动原文件。
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const REDIRECTS = path.join(PUBLIC_DIR, '_redirects');

/* 全局违规黑名单（命中即判定风险，保障域名安全） */
const BLOCKLIST = [
  '破解', '翻墙', '科学上网', '机场', 'vpn', 'crack', 'pirate', 'piracy',
  'porn', '成人', '赌博', 'bet', 'casino', '彩票', 'hack', '黑客工具',
  '入侵', '泄露', 'leak', '盗号', '诈骗', '私彩'
];

/* 解析 _redirects，返回 {domain, dir, abs} 列表（忽略 SITE-DISABLED 与 ROOT） */
function parseSites() {
  const sites = [];
  let raw = '';
  try { raw = fs.readFileSync(REDIRECTS, 'utf8'); } catch (e) { return sites; }
  for (const line of raw.split('\n')) {
    const s = line.trim();
    let m = s.match(/^#\s*SITE\s+(\S+)\s+(\S+)\s*$/);
    if (m) {
      const dir = m[2].replace(/\\/g, '/');
      sites.push({ domain: m[1].toLowerCase(), dir, abs: path.join(PUBLIC_DIR, dir) });
    }
  }
  return sites;
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/* 读取某子站工具数据，返回 {updated, tools:[]} */
function readTools(absDir) {
  const p = path.join(absDir, 'data', 'list.json');
  if (!fs.existsSync(p)) return null;
  try { const d = JSON.parse(fs.readFileSync(p, 'utf8')); return { updated: d.updated || '', tools: d.tools || [] }; }
  catch (e) { return null; }
}

/* 读取某子站资讯数据，返回 {updated, articles:[]} */
function readArticles(absDir) {
  const p = path.join(absDir, 'article', 'list.json');
  if (!fs.existsSync(p)) return null;
  try { const d = JSON.parse(fs.readFileSync(p, 'utf8')); return { updated: d.updated || '', articles: d.articles || [] }; }
  catch (e) { return null; }
}

/* ------------------------------------------------------------
 * 相似度：Jaccard(shingle 集合)
 * 注意：正文以中文为主，中文没有空格，按空格分词会导致整段变成 1 个 token、
 * 相似度恒为 0（实测近义改写也算 0.000），因此这里采用「混合 shingle」：
 *   1) 拉丁字母/数字：按词切（长度≥2），覆盖英文站与技术名词；
 *   2) 中文：按相邻字二元组（bigram）切，等价于轻量分词，无需引入分词库；
 *   3) 先剥离 HTML 标签与标点，避免标记与符号干扰判定。
 * ------------------------------------------------------------ */
function shingles(s) {
  const raw = String(s || '')
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')                                  // 去 HTML 标签
    .replace(/&[a-z]+;|&#\d+;/g, ' ')                          // 去 HTML 实体
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, ' ')                  // 标点/空白统一为分隔符
    .trim();
  const set = new Set();
  for (const w of raw.match(/[a-z0-9]{2,}/g) || []) set.add(w); // 拉丁词
  const cjk = raw.replace(/[^\u4e00-\u9fa5]+/g, '');            // 仅保留汉字后取二元组
  for (let i = 0; i + 2 <= cjk.length; i++) set.add(cjk.slice(i, i + 2));
  return set;
}

function sim(a, b) {
  const A = shingles(a), B = shingles(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((x) => { if (B.has(x)) inter++; });
  return inter / (A.size + B.size - inter);
}

module.exports = { PUBLIC_DIR, REDIRECTS, BLOCKLIST, parseSites, slugify, readTools, readArticles, sim, shingles };
