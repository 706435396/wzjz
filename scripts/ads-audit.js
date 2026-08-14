/* ============================================================
 * scripts/ads-audit.js —— 广告联盟过审风控自检
 * ------------------------------------------------------------
 * 为什么需要：Adsterra / AdSense 对「纯工具链接堆砌、无原创内容」的站群会直接拒审甚至封账户。
 *   与其被封，不如自己先卡住：不达标的站点写入屏蔽名单，前端 ads.js 读到后**不展示广告**，
 *   等资讯补足再自动放开 —— 用一个账号安全承载 200 个站的关键。
 *
 * 检查项（门槛读 public/common/config.json → quality）：
 *   1) 工具数    >= minTools
 *   2) 资讯篇数  >= minArticles         （海外联盟过审的核心条件）
 *   3) 资讯正文总字数 >= minArticleChars（防"只有标题没有内容"的空壳资讯）
 *   4) 灰产关键词（翻墙/破解/盗版等）零命中  → 命中即屏蔽（否则广告账户+域名双封）
 *   5) 资讯栏目未被 config.article.enabled=false 关掉
 *
 * 产出：public/common/ads-blocked.json（前端自动读取；幂等写盘，无变化不产生假 diff）
 *
 * 用法：
 *   node scripts/ads-audit.js            # 生成/更新屏蔽名单
 *   node scripts/ads-audit.js --strict   # 有站点不达标时退出码 1（可作 CI/部署门禁）
 *   node scripts/ads-audit.js --verbose  # 打印每站明细
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, BLOCKLIST, parseSites, readTools, readArticles } = require('./_sites');

const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const VERBOSE = argv.includes('--verbose');

const CONFIG_PATH = path.join(PUBLIC_DIR, 'common', 'config.json');
const OUT_PATH = path.join(PUBLIC_DIR, 'common', 'ads-blocked.json');

function readJSON(p, fb) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; }
}

/* 去 HTML 标签后统计正文字数（中文按字计，更贴近联盟人工审核的观感） */
function textLen(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, '')
    .replace(/\s+/g, '')
    .length;
}

/* 灰产关键词检测（复用采集侧同一份黑名单，标准一致） */
function grayHits(site, data, adata) {
  const words = (BLOCKLIST || []).map((w) => String(w).toLowerCase());
  if (!words.length) return [];
  const hay = [];
  (data && data.tools || []).forEach((t) => hay.push([t.name, t.desc, t.url, (t.tags || []).join(' ')].join(' ')));
  (adata && adata.articles || []).forEach((a) => hay.push([a.title, a.summary, a.body].join(' ')));
  const text = hay.join(' ').toLowerCase();
  return words.filter((w) => w && text.indexOf(w) >= 0);
}

function main() {
  const gcfg = readJSON(CONFIG_PATH, {});
  const q = Object.assign(
    { enforce: true, minTools: 8, minArticles: 3, minArticleChars: 600, blockGray: true },
    gcfg.quality || {}
  );

  const sites = parseSites();
  const blockedHosts = [];
  const detail = {};
  let pass = 0;

  for (const s of sites) {
    const data = readTools(s.abs) || { tools: [] };
    const adata = readArticles(s.abs) || { articles: [] };
    const scfg = readJSON(path.join(s.abs, 'config.json'), {});

    const tools = (data.tools || []).length;
    const articles = (adata.articles || []).length;
    const chars = (adata.articles || []).reduce((n, a) => n + textLen(a.body || a.summary || ''), 0);
    const gray = q.blockGray ? grayHits(s, data, adata) : [];
    const articleOff = !!(scfg.article && scfg.article.enabled === false);

    const reasons = [];
    if (tools < q.minTools) reasons.push('工具数 ' + tools + '<' + q.minTools);
    if (articles < q.minArticles) reasons.push('资讯 ' + articles + '篇<' + q.minArticles);
    if (chars < q.minArticleChars) reasons.push('正文 ' + chars + '字<' + q.minArticleChars);
    if (gray.length) reasons.push('灰产词命中[' + gray.join('|') + ']');
    if (articleOff) reasons.push('资讯栏目被关闭');

    // §5.2 整改清单：明确「还差多少」才能达标，供 lowquality-fix.js 汇总
    const remediation = [];
    if (tools < q.minTools) remediation.push('补 ' + (q.minTools - tools) + ' 个工具');
    if (articles < q.minArticles) remediation.push('补 ' + (q.minArticles - articles) + ' 篇资讯');
    if (chars < q.minArticleChars) remediation.push('正文再写 ' + (q.minArticleChars - chars) + ' 字');
    if (gray.length) remediation.push('清理灰产词[' + gray.join('|') + ']');
    if (articleOff) remediation.push('开启资讯栏目(article.enabled=true)');

    detail[s.domain] = { dir: s.dir, tools, articles, chars, gray, ok: reasons.length === 0, reasons, remediation };
    if (reasons.length) blockedHosts.push(s.domain);
    else pass++;

    if (VERBOSE || reasons.length) {
      console.log(
        (reasons.length ? '✗ ' : '✓ ') + s.domain.padEnd(26),
        '工具', String(tools).padStart(3),
        '| 资讯', String(articles).padStart(3),
        '| 正文', String(chars).padStart(6), '字',
        reasons.length ? '| 屏蔽原因: ' + reasons.join('; ') : ''
      );
    }
  }

  // 幂等：只在实质内容（名单/明细/门槛）变化时才写盘并更新时间戳
  const core = { thresholds: q, hosts: blockedHosts.sort(), detail };
  const prev = readJSON(OUT_PATH, null);
  const prevCore = prev ? { thresholds: prev.thresholds, hosts: prev.hosts, detail: prev.detail } : null;
  const changed = JSON.stringify(prevCore) !== JSON.stringify(core);
  if (changed) {
    fs.writeFileSync(OUT_PATH, JSON.stringify(Object.assign(
      { _note: '广告过审风控名单：hosts 中的域名不展示广告（由 scripts/ads-audit.js 生成，勿手改）', generated: new Date().toISOString().slice(0, 10) },
      core
    ), null, 2));
  }

  console.log('\n===== 广告过审自检 =====');
  console.log('站点总数', sites.length, '| 达标可挂广告', pass, '| 暂被屏蔽', blockedHosts.length);
  console.log('门槛：工具≥' + q.minTools, '资讯≥' + q.minArticles + '篇', '正文≥' + q.minArticleChars + '字', q.blockGray ? '灰产词零容忍' : '');
  console.log('名单文件', path.relative(process.cwd(), OUT_PATH), changed ? '（已更新）' : '（无变化，未写盘）');
  if (blockedHosts.length) {
    console.log('\n提示：被屏蔽站点补足资讯后重跑本脚本即自动放开，无需改代码。');
    console.log('      批量补资讯：node scripts/main-crawl.js  → 再 node scripts/ads-audit.js');
  }

  if (STRICT && blockedHosts.length) process.exit(1);
}

try { main(); } catch (e) {
  console.error('广告自检异常:', e.message);
  process.exit(1);
}
