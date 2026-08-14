/* ============================================================
 * scripts/_aff.js —— CPS 分销深链生成器（共享助手）
 * ------------------------------------------------------------
 * 谁在用：
 *   - scripts/affiliate-links.js（批量回填已有工具）
 *   - scripts/main-crawl.js（采集新工具时同步生成，最小侵入）
 *
 * 数据来源：
 *   - public/common/config.json  → affiliate.networks（各联盟 PID 与深链模板）
 *   - scripts/affiliate-map.json → rules（商家域名 -> 联盟 + 商家 ID）
 *
 * 关键规则：
 *   1) 未填 PID 的联盟一律返回 null，工具卡片继续用官网原始链接 —— 绝不生成半成品死链；
 *   2) {URL} 位于模板开头 = 商家自建分销（?ref= 形式），URL 保持原样；
 *      否则 = 联盟跳转链（CJ / Impact），URL 需 encodeURIComponent；
 *      也可在联盟配置里显式写 "urlMode": "raw" | "encoded" 覆盖；
 *   3) 域名按「后缀匹配」，自动覆盖 www. 与各级子域名（如 app.make.com 命中 make.com）。
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'public', 'common', 'config.json');
const MAP_PATH = path.join(__dirname, 'affiliate-map.json');

function readJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

let _cache = null;
function load() {
  if (_cache) return _cache;
  const cfg = readJSON(CONFIG_PATH, {});
  const map = readJSON(MAP_PATH, { rules: [] });
  const aff = cfg.affiliate || {};
  _cache = {
    enabled: aff.enabled !== false,
    networks: aff.networks || {},
    subIdParam: aff.subIdParam || '',
    label: aff.label || '分销合作',
    rules: Array.isArray(map.rules) ? map.rules : []
  };
  return _cache;
}
function resetCache() { _cache = null; } // 单测/改配置后重载用

/* 取 URL 主机名（失败返回空串） */
function hostOf(url) {
  try { return new URL(String(url)).hostname.toLowerCase(); } catch (e) { return ''; }
}

/* 域名后缀匹配：example.com 命中 www.example.com / app.example.com */
function hostMatch(host, pattern) {
  const p = String(pattern || '').toLowerCase().replace(/^\*?\.?/, '');
  if (!p || !host) return false;
  return host === p || host.endsWith('.' + p);
}

/* 找到该 URL 对应的映射规则 */
function ruleFor(url) {
  const host = hostOf(url);
  if (!host) return null;
  const { rules } = load();
  for (const r of rules) {
    const list = Array.isArray(r.match) ? r.match : [r.match];
    if (list.some((m) => hostMatch(host, m))) return r;
  }
  return null;
}

/* 按模板拼接深链；缺少必填项则返回 null（宁缺勿错） */
function buildLink(net, netConf, rule, targetUrl) {
  let tpl = String(netConf.deeplink || '');
  if (!tpl) return null;
  const pid = String(rule.pid || netConf.pid || '').trim();  // §5.3 支持规则级 PID 覆盖网络级
  if (!pid) return null;                       // 没填 PID → 不生成

  const mode = netConf.urlMode || (tpl.indexOf('{URL}') === 0 ? 'raw' : 'encoded');
  const target = rule.landing || targetUrl;
  const urlVal = mode === 'raw' ? target : encodeURIComponent(target);

  const vars = {
    '{PID}': pid,
    '{URL}': urlVal,
    '{DOMAIN}': String(netConf.domain || '').replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    '{AID}': String(rule.aid || ''),
    '{CID}': String(rule.cid || ''),
    '{MID}': String(rule.mid || '')
  };
  // 模板里出现的占位符必须都有值，否则视为配置不全，返回 null
  const need = tpl.match(/\{[A-Z]+\}/g) || [];
  for (const k of need) {
    if (!(k in vars) || vars[k] === '') return null;
    tpl = tpl.split(k).join(vars[k]);
  }
  return tpl;
}

/**
 * 为一个工具官网 URL 生成分销链接
 * @returns {null | { url:string, network:string, advertiser:string }}
 */
function affFor(url) {
  const c = load();
  if (!c.enabled || !url) return null;
  const rule = ruleFor(url);
  if (!rule) return null;
  const netConf = c.networks[rule.network];
  if (!netConf) return null;
  const link = buildLink(rule.network, netConf, rule, url);
  if (!link) return null;
  return {
    url: link,
    network: rule.network,
    advertiser: rule.advertiser || '',
    commission: Number(rule.commission || 0)   // §2.1 佣金权重，前端排序用
  };
}

/* 统计：有多少商家已可分销 / 因缺 PID 待配置（affiliate-links.js 报告用） */
function pendingNetworks() {
  const c = load();
  const used = new Set(c.rules.map((r) => r.network));
  const pending = [];
  used.forEach((n) => {
    const conf = c.networks[n] || {};
    if (!String(conf.pid || '').trim()) pending.push(n);
  });
  return pending;
}

module.exports = { affFor, ruleFor, hostOf, hostMatch, pendingNetworks, load, resetCache };
