/**
 * Cloudflare Pages Function：广告边缘 IP 风控（§3.5）
 * ------------------------------------------------------------
 * 前端 ads.js 拉取本接口（路由 /api/ads-guard），命中高威胁分 / 匿名代理则本页不展示广告，
 * 从源头挡掉恶意点击 / 代理批量点击，保护 AdSense/Adsterra 账户不被封。
 *
 * 读取 request.cf（Cloudflare 注入）：
 *   - cf.threat_score：0–100，越高越危险（> 阈值即拦截）
 *   - cf.country === 'T1'：Tor / 匿名代理，直接拦截
 * 阈值优先取 /common/config.json 的 ipRisk.maxThreatScore，缺省 20；
 * 可用环境变量 ADS_IP_MAX_SCORE 覆盖（不依赖仓库改动）。
 *
 * 路由：/api/ads-guard（functions 目录文件名即路由，api 为子目录 → /api/ads-guard）
 */
export async function onRequest({ request, env }) {
  const cf = request.cf || {};
  let max = Number(env && env.ADS_IP_MAX_SCORE) || 0;
  if (!max) {
    try {
      const r = await env.ASSETS.fetch(new URL('/common/config.json', request.url));
      if (r.ok) {
        const j = await r.json();
        max = Number((j.ipRisk && j.ipRisk.maxThreatScore) || 0) || 20;
      }
    } catch (e) { /* 退化用默认 20 */ max = 20; }
  }

  const score = Number(cf.threat_score || 0);
  const country = String(cf.country || '').toUpperCase();
  const blocked = score >= max || country === 'T1';

  const body = JSON.stringify({
    blocked,
    score,
    country,
    max,
    ts: Date.now()
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
