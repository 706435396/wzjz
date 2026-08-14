/* ============================================================
 * scripts/traffic-report.js  ——  站点流量监控报表（对接 Cloudflare API）
 * ------------------------------------------------------------
 * 对应清单「四.2」：每日自动拉取各子域名访问数据，生成访问量报表并推送企业微信，
 * 快速识别冷热站点，方便流量负载均衡（双账号拆分时分别跑）。
 * 用法：node scripts/traffic-report.js   （需 CF_API_TOKEN + CF_ACCOUNT_ID + WEBHOOK_URL）
 * 说明：用 Cloudflare GraphQL 按 zone 拉取近 1 日请求量，分页聚合 Top 站点。
 * ============================================================ */
'use strict';

const TOKEN = process.env.CF_API_TOKEN || '';
const ACCOUNT = process.env.CF_ACCOUNT_ID || '';
const WEBHOOK = process.env.WEBHOOK_URL || '';

const GQL = 'https://api.cloudflare.com/client/v4/graphql';

async function gql(query, vars) {
  const r = await fetch(GQL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: vars })
  });
  if (!r.ok) throw new Error('CF HTTP ' + r.status);
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

async function fetchZones() {
  const rows = [];
  let cursor = null;
  do {
    const q = `query($a:String!,$c:String){viewer{zones(filter:{accountTag:$a},first:50,after:$c){pageInfo{hasNextPage,endCursor}edges{node{name,httpRequests1dGroups(limit:1){sum{requests,bytes}}}}}}}`;
    const d = await gql(q, { a: ACCOUNT, c: cursor || '' });
    const z = d.viewer.zones;
    z.edges.forEach((e) => rows.push({ name: e.node.name, requests: (e.node.httpRequests1dGroups.sum.requests) || 0 }));
    cursor = z.pageInfo.hasNextPage ? z.pageInfo.endCursor : null;
  } while (cursor);
  return rows;
}

async function main() {
  if (!TOKEN || !ACCOUNT) { console.log('（未配置 CF_API_TOKEN / CF_ACCOUNT_ID，跳过流量报表）'); return; }
  let rows = [];
  try { rows = await fetchZones(); } catch (e) { console.warn('拉取失败:', e.message); return; }
  rows.sort((a, b) => b.requests - a.requests);
  const total = rows.reduce((s, x) => s + x.requests, 0);
  const top = rows.slice(0, 20).map((x) => x.name + ':' + (x.requests / 1000).toFixed(1) + 'k').join('  ');
  const msg = '[toolnav 流量日报] 总请求 ' + (total / 1000).toFixed(0) + 'k | 站点 ' + rows.length + ' | Top: ' + top;
  console.log(msg);
  if (WEBHOOK) fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msg }) }).catch(() => {});
}

main().catch((e) => { console.error('流量报表异常:', e); process.exit(1); });
