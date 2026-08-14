# 72tool 海外变现方案（无 ICP 备案 · Cloudflare Pages）

> 适用前提：**72tool.com 及全部子域名均未做 ICP 备案**。国内广告联盟（百度联盟 / 百青藤 / 穿山甲 / 优量汇）**强制要求 ICP 备案**，因此本方案**完全放弃国内点击广告**，只走两类**零备案**收入：
>
> 1. **海外展示广告**：中文站 → Adsterra；小语种站（es/de/vi/en）→ Google AdSense。
> 2. **SaaS 分销 CPS**：CJ / Impact / PartnerStack / Avangate（2Checkout），工具卡片自动生成专属追踪链接，替代官网原链。

---

## 0. 架构总览（改一处，全站生效）

```
public/
  common/
    config.json        ← ★ 全站唯一变现配置（200 站共用，改这里即可）
    ads.js             ← 广告统一调度（按 lang 选 Adsterra/AdSense，async、风控）
    affiliate.js       ← CPS 前端组件（链接/rel/badge/推荐位）
    ads-blocked.json   ← 低质站点屏蔽名单（scripts/ads-audit.js 自动生成）
  index.html / article.html  ← 已埋 3 类广告位 + 分销位
  common/style.css     ← 广告/分销样式
scripts/
  _aff.js              ← CPS 深链生成器（被采集与回填脚本共用）
  affiliate-map.json   ← 商家域名 → 联盟 + 商家 ID 映射
  affiliate-links.js   ← 批量回填已有工具的 aff 字段
  ads-audit.js         ← 过审风控：不达标写入 ads-blocked.json
```

**关键原则**
- 中文站（`lang=zh-CN` / `region=cn`）**绝不加载 Google 脚本**（AdSense 是 Google 脚本，仅小语种站加载）。统计改用 **Cloudflare Web Analytics**（免备案、无 Cookie、零 Google）。
- 全部广告 JS `async` 异步注入，不阻塞首屏；三类原生广告位（侧边 / 资讯内文 / 移动端底部），**无弹窗**。
- 未填广告 ID / 联盟 PID 时**只渲染占位、不发任何网络请求**——可先部署、后补 ID。
- 低质无资讯站自动**屏蔽广告**，保护联盟账户不被判低质站群。

---

## 1. 广告接入

### 1.1 全局开关（public/common/config.json）

```jsonc
{
  "quality": {                       // 过审风控门槛（见 §4）
    "enforce": true, "minTools": 8, "minArticles": 3,
    "minArticleChars": 600, "blockGray": true
  },
  "langProvider": {                  // ★ 语种 → 广告商路由
    "zh-CN": "adsterra", "zh": "adsterra",
    "es": "adsense", "de": "adsense", "vi": "adsense", "en": "adsense",
    "default": "adsterra"
  },
  "providers": {
    "adsterra": {                    // 中文站主用
      "enabled": false,              // 填好 key/invoke 后改 true
      "slots": {
        "sidebar":  { "type": "native",  "key": "", "invoke": "" },
        "article":  { "type": "native",  "key": "", "invoke": "" },
        "mobile":   { "type": "banner",  "key": "", "invoke": "" },
        "top":      { "type": "off" }
      }
    },
    "adsense": {                     // 小语种海外站主用
      "enabled": false,
      "client": "",                  // ca-pub-xxxxxxxx
      "slots": { "sidebar": "", "article": "", "mobile": "", "top": "" }
    }
  },
  "analytics": { "cfBeaconToken": "" } // Cloudflare Web Analytics Beacon Token
}
```

> 子站 `config.json` 已有 `ads.provider`（中文站 `adsterra` / 海外站 `adsense`），可覆盖全局 `langProvider`；一般无需改，保持与 `lang` 一致即可。

### 1.2 Adsterra（中文站）

1. 注册 https://adsterra.com → 后台 Add Website（填 72tool.com 子域名）→ 审核通过后建 **Native Banner / Direct Link** 广告位。
2. 在 `config.json → providers.adsterra.slots` 填入官方给的：
   - `key`：容器/广告位 ID；
   - `invoke`：官方 `invoke.js` 地址（如 `https://cdn.adsterra.com/.../invoke.js`，可写 `//cdn.adsterra.com/.../invoke.js`）。
3. 侧边/资讯位用 `type:"native"`（原生，异步、无弹窗）；移动端底部用 `type:"banner"`（iframe 沙箱承载，详见 `ads.js` 注释）。
4. 把 `providers.adsterra.enabled` 改为 `true` → 部署后自动出广告。

### 1.3 Google AdSense（小语种海外站，仅 es/de/vi/en）

1. 注册 https://www.google.com/adsense → 添加站点（如 `es.72tool.com`）→ 等 Google 审核（约数天到数周）。
2. 审核通过后建 **Display ad** 广告单元，拿到 `data-ad-client`（ca-pub-xxx）与每个单元的 `data-ad-slot`。
3. 填入 `config.json → providers.adsense.client` 与各 `slots`（sidebar/article/mobile 的 slot ID）。
4. 改 `providers.adsense.enabled` 为 `true`。**注意**：AdSense 脚本仅在 `langProvider`/`ads.provider` 指向 `adsense` 的站点加载，中文站不会触碰 Google。

### 1.4 站点统计（替代 51.la / 百度统计）

- 用 **Cloudflare Web Analytics**：Cloudflare 控制台 → Analytics → Web Analytics → 添加站点 → 拿到 Beacon Token，填入 `config.json → analytics.cfBeaconToken`。`ads.js` 自动注入，免备案、无 Cookie、零 Google。
- 已移除原 51.la 统计代码（需备案，且规避 Google 风控）。

---

## 2. SaaS 分销 CPS（CJ / Impact / PartnerStack / Avangate）

### 2.1 配置（public/common/config.json → affiliate）

```jsonc
{
  "affiliate": {
    "enabled": true,
    "subIdParam": "subId1",        // 归因参数，200 站共用一套联盟账号也能分清来源
    "label": "分销合作",            // 卡片/推荐位标识文案
    "networks": {
      "cj":         { "pid": "", "deeplink": "https://www.anrdoezrs.net/links/{PID}/type/dlg/{URL}" },
      "impact":     { "pid": "", "domain": "", "deeplink": "https://{DOMAIN}/c/{PID}/{CID}/{MID}?u={URL}" },
      "partnerstack": { "pid": "", "deeplink": "{URL}?utm_source=partnerstack&utm_medium=affiliate&ps_partner_key={PID}" },
      "avangate":   { "pid": "", "deeplink": "{URL}?avad={PID}" },
      "generic":    { "pid": "", "deeplink": "{URL}?ref={PID}" }
    },
    "articleBox": { "enabled": true, "count": 2, "title": "本文相关工具" }
  }
}
```

### 2.2 商家 → 联盟映射（scripts/affiliate-map.json）

每条规则：`match`（域名后缀，自动覆盖 www. 与子域）、`network`、`advertiser`、可选 `aid/cid/mid/landing`。

```jsonc
{ "match": ["hostinger.com"], "network": "cj", "advertiser": "Hostinger" }
```

### 2.3 深链生成规则（scripts/_aff.js）

- 未填 PID 的联盟 → 返回 `null` → **不生死链**，卡片继续用官网原链。
- `{URL}` 在模板开头 = 商家自建分销（保持原 URL）；否则 = 联盟跳转链（URL 自动 `encodeURIComponent`）。
- 自动追加 `?subId1=<当前hostname>`，200 站共用一套账号也能分清转化来源。

### 2.4 回填工具链接

- **新工具**：`scripts/main-crawl.js` 采集时已自动调用 `_aff.affFor(url)` 写入 `aff` / `affNetwork`。
- **存量工具**：`node scripts/affiliate-links.js [--site <dir>] [--force] [--dry]`
  - 缺 PID 的联盟会汇总报告、跳过，不影响其它工具。
  - 幂等：无变化不写盘，避免消耗 CF 构建额度。

### 2.5 前端表现（已接好）

- 工具卡片：`AFF.href(t)` + `AFF.rel(t)`（`sponsored nofollow noopener`）+ `AFF.badge(t)`（「分销合作」标识）。
- 资讯详情页：`#affBox` 用 `AFF.boxHTML(tools)` 注入「本文相关工具」推荐位，转化最高的位置。
- 合规披露：分销链接统一 `rel="sponsored nofollow noopener"`；普通外链 `rel="nofollow noopener"`（防站群被判链接农场）。

---

## 3. Payoneer 收款（注册 + 绑定联盟）

海外联盟普遍用 **Payoneer** 付款（美元/欧元），注册免费：

1. 注册 https://www.payoneer.com → 用**真实姓名拼音 / 执照主体**开户（与税务信息一致，避免提现被冻）。
2. 完成身份核验（KYC）：上传身份证件 + 地址证明。
3. 在 Adsterra / CJ / Impact / Avangate 后台的 **Payment / Payout** 里选择 **Payoneer** 并授权绑定（多数联盟支持 “Pay with Payoneer” 一键关联）。
4. 起付门槛：Adsterra 约 $5–$100（按结算方式），CJ $50，Impact $10，Avangate $100；到帐后提现到国内银行卡（按当天汇率，银行会做外汇申报）。
5. 税务：联盟多为美国/爱尔兰主体，可能要填 **W-8BEN**（非美税务居民豁免预扣）。按平台向导填写即可。

> 提示：收款银行卡建议用支持外币的借记卡；大额可走银行「跨境汇入」并保留交易凭证备税务之需。

---

## 4. 过审优化方案（内容门槛）

`scripts/ads-audit.js` 按以下门槛判定是否允许出广告，不达标写入 `common/ads-blocked.json`，前端自动屏蔽广告：

| 维度 | 门槛 | 说明 |
|------|------|------|
| 工具数 | `minTools` ≥ 8 | 纯链接堆砌站不出广告 |
| 资讯篇数 | `minArticles` ≥ 3 | 无资讯站群不出广告 |
| 正文字数 | `minArticleChars` ≥ 600（单篇） | 太短/采集拼凑易被拒 |
| 灰产词 | `blockGray` | 命中风控黑名单直接屏蔽 |

运行：
```bash
node scripts/ads-audit.js            # 生成 common/ads-blocked.json
node scripts/ads-audit.js --strict   # 有不达标站则退出码 1（CI 用）
node scripts/ads-audit.js --verbose
```
幂等：名单无变化不写盘。

**过审内容要点**
- 每站至少 8 个真实工具 + 3 篇 ≥600 字原创教程（部署/技巧/对比/避坑）。
- 工具卡片含差异化描述（已用 `dedupeDesc` 防同质化）。
- 资讯内文自然嵌入分销推荐（`#affBox`），不要硬塞弹窗/满屏广告。
- 全站 `rel="nofollow/sponsored"` 合规，不堆 dofollow 外链。

---

## 5. 风控雷区（务必规避）

| 雷区 | 后果 | 处理 |
|------|------|------|
| 接入需备案的国内广告 | 违法 + 账户冻结 | 已禁用；只用 Adsterra/AdSense/CPS |
| 中文站加载 Google 脚本 | 风控 + 备案风险 | 仅小语种站走 AdSense；统计用 CF |
| 灰产/违规工具 | 域名被墙 + 联盟封号 | `BLOCKLIST` 采集期过滤 + `blockGray` 风控 |
| 低质无资讯站挂广告 | 联盟判低质站群拒审 | `ads-audit` 自动屏蔽 |
| 弹窗/满屏广告 | 用户投诉 + 联盟下架 | 仅侧边/内文/移动底 3 类原生位，可关闭 |
| 生死链/半成品分销链接 | 用户流失 + 违规 | 未配 PID 一律回退官网原链 |
| 站群 dofollow 外链 | 百度判链接农场 | 外链统一 `nofollow` |

---

## 6. 上线前自检清单

- [ ] `config.json`：填好 `analytics.cfBeaconToken`。
- [ ] `providers.adsterra` 填 key/invoke 且 `enabled:true`（中文站）。
- [ ] `providers.adsense` 填 client/slots 且 `enabled:true`（es/de 站）。
- [ ] `affiliate.networks` 各联盟填 PID。
- [ ] `node scripts/affiliate-links.js --dry` 检查可分销工具数。
- [ ] `node scripts/ads-audit.js --strict` 全站达标。
- [ ] `node --check` 全部脚本、JSON 校验通过。
- [ ] Payoneer 已注册并绑定各联盟。
- [ ] 部署后访问中文站/小语种站，确认广告商切换正确、低质站无广告。

> 详见 `LAUNCH-CHECKLIST.md`（部署/双 CF 账号/DNS 部分）。
