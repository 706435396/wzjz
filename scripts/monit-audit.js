/* ============================================================
 * scripts/monit-audit.js —— 变现全量巡检一体化（§5.1）
 * ------------------------------------------------------------
 * 整合三项风险巡检，产出统一报表，可选推送企业微信（免备案、不依赖 Gmail）：
 *   1) scripts/ads-audit.js  —— 广告过审质量自检（低质站屏蔽名单）
 *   2) scripts/aff-check.js  —— 分销链接失效巡检（死链回退官网）
 *
 * 设计为每周 CI 自动跑（见 .github/workflows/monit.yml）；质量不达标（ads-audit --strict
 * 退出 1）不会阻断本脚本，但报表会明确标红。填入 report.wecomWebhook 后自动推送。
 *
 * 用法：
 *   node scripts/monit-audit.js                 # 本地输出 + 推送（若配了 webhook）
 *   node scripts/monit-audit.js --no-push       # 仅本地输出
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const NO_PUSH = argv.includes('--no-push');
const NODE = process.execPath;
const HERE = __dirname;

function tail(s, n) { return String(s || '').split('\n').slice(-n).join('\n'); }

function run(script, args) {
  try {
    const out = execFileSync(NODE, [path.join(HERE, script)].concat(args || []), {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    });
    return out;
  } catch (e) {
    // ads-audit --strict 不达标会退出 1，仍需要其 stdout 内容
    return (e.stdout || '') + '\n' + (e.stderr || '');
  }
}

function loadWebhook() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'public', 'common', 'config.json'), 'utf8'));
    return (cfg.report && cfg.report.wecomWebhook) || '';
  } catch (e) { return ''; }
}

async function main() {
  const audit = run('ads-audit.js', ['--verbose']);
  const aff = run('aff-check.js', ['--dry']);

  const date = new Date().toISOString().slice(0, 10);
  const md =
    '# 站群变现巡检日报 · ' + date + '\n\n' +
    '## 一、广告过审自检（ads-audit）\n```\n' + tail(audit, 40) + '\n```\n' +
    '## 二、分销链接巡检（aff-check）\n```\n' + tail(aff, 25) + '\n```\n';

  console.log(md);

  const webhook = NO_PUSH ? '' : loadWebhook();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgtype: 'markdown', markdown: { content: md.slice(0, 4000) } })
      });
      console.log('✓ 已推送企业微信机器人');
    } catch (e) {
      console.warn('⚠ 推送失败（不影响本地报表）:', e.message);
    }
  } else {
    console.log('（未配置 report.wecomWebhook 或 --no-push，仅本地输出）');
  }
}

main().catch((e) => { console.error('monit 异常:', e.message); process.exit(1); });
