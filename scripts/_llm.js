/* ============================================================
 * scripts/_llm.js  ——  共享智谱 AI 调用助手（新脚本复用，不改动 main-crawl.js）
 * ------------------------------------------------------------
 * 职责：
 *   1) 封装智谱 OpenAI 兼容接口（glm-4-flash 免费模型），与 main-crawl.js 同端点；
 *   2) 内置 429 限流容错：读取 Retry-After，指数退避重试（对应清单「八.2」）；
 *   3) 额度/鉴权失败告警标记，供上层暂停采集、触发 webhook；
 *   4) extractJSON 容错解析，避免多轮调用互相干扰。
 * 零 Google 依赖：仅智谱 BigModel。
 * ============================================================ */
'use strict';

const API_KEY = process.env.ZHIPU_API_KEY || '';
const MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash';
const ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

let _quotaWarned = false;
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* 调用大模型，自动重试 + 限流退避。返回 {ok, text, reason} */
async function callLLM(prompt, opts) {
  opts = opts || {};
  const temperature = opts.temperature != null ? opts.temperature : 0.5;
  const maxTokens = opts.maxTokens || 800;
  const retries = opts.retries || 3;
  if (!API_KEY) return { ok: false, reason: 'no-key', text: '' };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          temperature,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      // 429 限流容错：读 Retry-After，指数退避后重试
      if (res.status === 429) {
        const ra = parseInt(res.headers.get('retry-after') || '', 10);
        const wait = (isNaN(ra) ? 0 : ra) * 1000 + attempt * 2000;
        console.warn('[智谱] 429 限流，第', attempt, '次，等待', wait, 'ms');
        if (attempt < retries) { await sleep(wait); continue; }
        return { ok: false, reason: 'rate-limit', text: '' };
      }
      // 额度/鉴权失败：触发一次性告警，上层应暂停采集
      if (res.status === 401 || res.status === 403) {
        if (!_quotaWarned) { console.warn('[智谱] 鉴权/额度失败，请检查 ZHIPU_API_KEY 余额'); _quotaWarned = true; }
        return { ok: false, reason: 'auth', text: '' };
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);

      const j = await res.json();
      const text = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
      return { ok: true, text, raw: j };
    } catch (e) {
      if (attempt >= retries) return { ok: false, reason: 'error:' + e.message, text: '' };
      await sleep(attempt * 1500);
    }
  }
  return { ok: false, reason: 'unknown', text: '' };
}

/* 从模型文本中提取首个 JSON（数组或对象），失败返回 null */
function extractJSON(text) {
  const m = String(text || '').match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

module.exports = { callLLM, extractJSON, sleep, hasKey: !!API_KEY, MODEL };
