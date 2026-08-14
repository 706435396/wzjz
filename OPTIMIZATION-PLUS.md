# 200 站变现与站群增收 · 深度优化补充（AI 开发指令版）

> 本文是 **OPTIMIZATION.md（基础优化：sitemap / CF Pages / 采集 / 前端 / 运维 / 风控）** 与 **MONETIZATION.md（变现落地：Adsterra+AdSense+CPS+风控+收款）** 之上的**增收与风控深化补充**。
> 覆盖你给出的 **8 大类 + CI/流水线 + 长期扩容** 共 30+ 项，全部适配 **零 ICP 备案 · Cloudflare Pages · 200 子域名站群**，可直接整段粘贴进 AI 开发指令分阶段实施。
> 原则：不破坏已落地的 `build-sitemap` / Functions / `main-crawl` 主流程；新增脚本/组件一律**幂等**、默认关、填配置才生效。

---

## 〇、全局原则（贯穿全部 30+ 项）

1. **零备案、零国内资质**：任何新依赖不得引入需 ICP 备案的国内广告（百度联盟/百青藤/穿山甲/优量汇）、国内支付（微信/支付宝商户）、国内统计（51.la 已弃用，统一 Cloudflare Web Analytics）。
2. **分级路由不变**：中文站（`lang=zh-CN`/`region=cn`）只走 **Adsterra + Cloudflare Web Analytics**；小语种站（`es/de/vi/en`/`region=global`）走 **AdSense + 多账号隔离**。绝不给中文站加载 Google 脚本。
3. **联盟账户安全优先**：广告账号、联盟 PID、Payoneer 收款按**中/英文站点拆分**，单账号违规不牵连全站群；注册邮箱用 Outlook/ProtonMail，禁用 Gmail 串联。
4. **隐私合规前置**：Adsterra/AdSense 强制要求英文/多语种隐私政策与 Cookie 告知——无 ICP 时中文隐私声明无境外法律效力，必须补多语种页面。
5. **幂等 + 默认关**：所有新增脚本写盘前比对哈希，无变化不写；所有新开关在 `config.json` 默认 `false`，填 ID 才生效，可先部署后补。

---

## 一、海外广告模块补充优化（Adsterra + AdSense）

### 1.1 广告填充兜底（RevenueHits 第三渠道）
- **痛点**：主广告无填充时页面空白，曝光与收入浪费，小语种冷门站尤甚。
- **方案**：`providers.fallback`（已预留 `network:"revenuehits"`）补全真实 `src` 与 `fill` 开关；`ads.js` 主广告位 `watchFill()` 监听 N 秒（默认 `delayMs:4000`）未渲染则注入 fallback 原生广告；填充成功即停。
- **文件**：改 `public/common/ads.js`、`public/common/config.json`。
- **配置**：`providers.fallback.enabled`、`providers.fallback.src`、`providers.fallback.delayMs`、`providers.fallback.network`。
- **无备案适配**：RevenueHits 为塞浦路斯公司，零备案可用；仅小语种/中文站通用，不引国内平台。
- **优先级**：P1（直接增收，改动小）。

### 1.2 分时广告开关
- **痛点**：凌晨低流量时段展示广告属无效曝光，易被联盟判低质流量、拉低 eCPM。
- **方案**：`config.json` 新增 `schedule`（时区 + 关闭时段 + 按 region 覆盖）；`ads.js` 在 `initAds` 早期读本地时间比对，命中关闭时段直接 `el.remove()` 且不发请求。
- **文件**：改 `public/common/ads.js`、`public/common/config.json`。
- **配置**：`schedule.enabled`、`schedule.timezone`（如 `Asia/Shanghai` / `UTC`）、`schedule.offHours:[{start:"00:00",end:"07:00"}]`、`schedule.regionOverrides:{global:{offHours:[...]}}`。
- **无备案适配**：中文站按中国时区、小语种站按 UTC/目标国时区分别配置。
- **优先级**：P2。

### 1.3 广告防屏蔽兼容（AdBlock 轻量降级）
- **痛点**：用户装 AdBlock 时主广告被拦，变现曝光丢失。
- **方案**：`ads.js` 注入一段极轻量检测（尝试创建被常见过滤规则命中的 class 探针元素，纯前端、不弹窗）；命中则在同容器渲染「极简文字工具推荐」（复用 `affiliate.js` 的 `boxHTML`，已合规 `sponsored nofollow`）。
- **文件**：改 `public/common/ads.js`、`public/common/config.json`、`public/common/style.css`。
- **配置**：`adblock.enabled`、`adblock.fallbackText`（如「为你精选好用的工具」）。
- **无备案适配**：降级展示的是工具推荐而非广告，不触发联盟「强制关停广告」违规；不弹窗、不强制，合规。
- **优先级**：P2。

### 1.4 AdSense 多账号隔离
- **痛点**：单 AdSense 账号承载全站群，一处违规封号牵连所有海外站。
- **方案**：`providers.adsense` 由单 `client` 升级为 `accounts` 数组，按站点 `hostname`/`lang` 分组映射到不同 `client`+`slots`；`ads.js` 按当前站解析所属账号。
- **文件**：改 `public/common/ads.js`、`public/common/config.json`、各子站 `config.json`（可加 `ads.adsenseAccount:"B"`）。
- **配置**：`providers.adsense.accounts:[{id:"A",client:"ca-pub-...",slots:{...},sites:["es","de"]},{id:"B",client:"ca-pub-...",slots:{...},sites:["en","vi"]}]`。
- **无备案适配**：多账号用不同 Outlook 邮箱注册，规避单账号风控扩散。
- **优先级**：P1（站群安全核心）。

### 1.5 广告数据简易报表（API → 企业微信）
- **痛点**：每日登录多个联盟后台看收益繁琐。
- **方案**：新增 `scripts/ad-report.js`，定时（CI 每日）调用 Adsterra / AdSense 开放 API（需各自 API key/token 存 Secrets），拉取曝光/点击/收益，生成 Markdown 报表 POST 企业微信 `WEBHOOK_URL`。
- **文件**：新 `scripts/ad-report.js`；`.github/workflows/monit.yml` 加日任务。
- **配置**：`report.wecomWebhook`、`report.schedule`、`secrets.ADSTERRA_API_KEY`、`secrets.ADSENSE_ACCESS_TOKEN`。
- **无备案适配**：报表走企业微信（国内可用、免备案），不依赖 Gmail。
- **优先级**：P2。

---

## 二、CPS 分销体系深度优化（增收核心）

### 2.1 多级分销分层推荐（佣金权重排序）
- **痛点**：当前 `affiliate.js boxHTML` 随机/顺序展示，高佣金 SaaS 混在低佣金里，转化上限低。
- **方案**：`affiliate-map.json` 每条规则增 `commission` 权重（1–10）；`affiliate.js` 的 `boxHTML`/卡片排序按权重降序，资讯页/工具详情页优先展示高佣工具。
- **文件**：改 `scripts/affiliate-map.json`、`public/common/affiliate.js`。
- **配置**：`affiliate.networks.*` 不变；规则加 `commission` 字段；`affiliate.sortByCommission:true`。
- **无备案适配**：纯前端排序，零备案。
- **优先级**：P1（直接增收）。

### 2.2 分销活动自动更新（折扣/免费试用标签）
- **痛点**：免费试用类点击率远高于普通，但活动需人工跟。
- **方案**：新增 `scripts/aff-promo.js` 定期抓各联盟优惠活动页（CJ/Impact 促销 API 或 RSS），匹配商家→在 `affiliate-map.json` 规则写 `promo:{type:"trial"|"discount",text:"免费试用 14 天"}`；前端卡片/推荐位读取并展示角标。
- **文件**：新 `scripts/aff-promo.js`；改 `public/common/affiliate.js`、`public/common/app.js`（卡片角标）。
- **配置**：`affiliate.promo.enabled`、`affiliate.promo.cacheHours`。
- **无备案适配**：抓海外联盟公开活动，零备案。
- **优先级**：P2。

### 2.3 短链分销优化
- **痛点**：长联盟跳转链接（`anrdoezrs.net/links/...`）易被邮件/社媒拦截，跳转丢失率高。
- **方案**：集成独立短链域名（**与主站 72tool 不同域，隔离风控**），如 `72link.cc`；新增 `scripts/aff-short.js` 调短链服务 API 把 `affFor(url)` 结果压缩，写入工具 `affShort` 字段；前端优先用短链。
- **文件**：新 `scripts/aff-short.js`；改 `public/common/affiliate.js`、`scripts/_aff.js`、`scripts/main-crawl.js`。
- **配置**：`affiliate.shortlink.enabled`、`affiliate.shortlink.domain`、`secrets.SHORTLINK_API`。
- **无备案适配**：短链域名同样免备案（海外注册），但**必须独立域**避免主域被联盟关联风控。
- **优先级**：P2。**注意**：免费短链服务可能自身被墙/跑路，建议自托管短链（如 YOURLS）或用独立域 CNAME。
- **风控提醒**：短链服务若兼做广告跳转，可能被 AdSense 判「redirect」，建议短链仅用于 CPS 分销、与广告位物理隔离。

### 2.4 失效分销链接自动巡检（`aff-check.js`）
- **痛点**：联盟活动下线/商家改 URL 导致分销死链，用户点空白页流失。
- **方案**：新增 `scripts/aff-check.js` 每周批量 HEAD/GET 所有 `aff`/`affShort` 链接，检测 404/超时/落地页变更；失效自动回退官网原链（`affFor` 返回 `null` 逻辑复用），并写报告。
- **文件**：新 `scripts/aff-check.js`。
- **配置**：`affiliate.check.enabled`、`affiliate.check.schedule`。
- **无备案适配**：纯脚本巡检，零备案。
- **优先级**：P1（防流失）。

### 2.5 站群分销数据拆分看板
- **痛点**：200 站共用一套联盟账号，难分辨哪些子站高转化。
- **方案**：复用 `affiliate.js` 已注入的 `subId1=hostname` 归因；新增 `scripts/aff-dashboard.js` 拉联盟后台按 subId 报表，按**赛道/语种**聚合成交与佣金，生成收益排行 Markdown。
- **文件**：新 `scripts/aff-dashboard.js`；接 `WEBHOOK_URL` 推送。
- **配置**：`report.wecomWebhook`、`affiliate.subIdParam`（已为 `subId1`）。
- **无备案适配**：归因靠 subId，无需国内资质。
- **优先级**：P2。

---

## 三、广告联盟过审 & 风控补强（解决站群拒审/封号）

### 3.1 差异化页面模板随机渲染
- **痛点**：200 站同模板易被广告 AI / 搜索引擎判批量站群。
- **方案**：在 `config.json` 现有 `theme` 基础上扩展「排版变体」：正文段距/卡片栅格/内链位置按站点哈希随机微调（预定义 3–5 套安全变体，不破坏布局）；`app.js`/`article.js`/`style.css` 按 `config.templateVariant` 读取。
- **文件**：改 `public/common/config.json`、各子站 `config.json`、`public/common/style.css`、`public/common/app.js`、`public/common/article.js`。
- **配置**：`template.variants:[...]`、`ads` 同级加 `templateVariant`。
- **无备案适配**：模板变化纯前端，零备案。
- **优先级**：P1（过审关键）。

### 3.2 广告密度自动控制
- **痛点**：单页广告过多被联盟判低质堆砌。
- **方案**：`ads.js` 渲染后统计本页 `data-ad` 容器数，资讯内文限制最多 `adDensity.maxPerArticle`（默认 2）；超出自动 `el.remove()` 多余位，仅保留侧边+底部。
- **文件**：改 `public/common/ads.js`、`public/common/config.json`。
- **配置**：`adDensity.enabled`、`adDensity.maxPerArticle`、`adDensity.maxPerPage`。
- **无备案适配**：密度控制提升联盟质量分，间接提升 eCPM。
- **优先级**：P1（过审关键）。

### 3.3 爬虫与真人访问广告隔离
- **痛点**：爬虫抓取页面也加载广告，属无效曝光，拉低广告质量分。
- **方案**：`ads.js` 在 `initAds` 早期检测 `navigator.userAgent` 常见爬虫特征（Googlebot/Bingbot/百度/Yandex 等），命中则不注入任何广告脚本；仅真人访客展示。
- **文件**：改 `public/common/ads.js`、`public/common/config.json`。
- **配置**：`crawlerIsolation.enabled`、`crawlerIsolation.bots:[...]`。
- **无备案适配**：减少无效曝光 → 提升 eCPM；纯前端 UA 判断（弱防 spoof，配合 §3.5 边缘层更佳）。
- **优先级**：P2。

### 3.4 广告申诉素材自动生成（`appeal-gen.js`）
- **痛点**：被联盟限制时需手动整理内容证明合规垂直。
- **方案**：新增 `scripts/appeal-gen.js`，一键导出指定站点的工具清单（名称/URL/分类）、资讯篇数与正文样例、隐私政策链接，生成 PDF/Markdown 申诉包。
- **文件**：新 `scripts/appeal-gen.js`。
- **配置**：无（CLI `--site` 参数）。
- **无备案适配**：申诉材料为英文内容，符合海外联盟审核语言。
- **优先级**：P3（应急）。

### 3.5 广告 IP / 访问风控过滤
- **痛点**：代理/批量点击 IP 造成恶意点击，威胁账户封号。
- **方案**：**边缘层优先**——在 `public/functions/` 新增广告请求前置 Function，读 `request.cf`（Cloudflare 注入的 `cf-threat-score`/`country`/`asn`），对高威胁分/已知代理 ASN 返回 403 不渲染广告位；前端 `ads.js` 再叠加轻量客户端黑名单兜底。
- **文件**：新 `public/functions/ads-guard.js`（或并入 `ads.js` 客户端层）；改 `public/common/ads.js`。
- **配置**：`ipRisk.enabled`、`ipRisk.maxThreatScore`、`ipRisk.blocklist:[]`、`ipRisk.proxyDetect:true`。
- **无备案适配**：Cloudflare 边缘信号零备案可用，比纯前端可靠。
- **优先级**：P1（封号防护核心）。

---

## 四、前端变现体验优化（提停留、降跳出）

### 4.1 分销免费试用独立引导（非广告弹窗）
- **痛点**：静态「分销合作」标签转化弱。
- **方案**：高佣金且 `promo.type:"trial"` 的工具，点击弹出**极简试用引导浮层**（非广告、不触发联盟违规），含一键复制试用链接；浮层用 `<dialog>` 或轻量组件，可关。
- **文件**：改 `public/common/affiliate.js`、`public/common/style.css`、`public/index.html`/`article.html`（挂载点）。
- **配置**：`affiliate.trial.enabled`、`affiliate.trial.popupCooldownHours`。
- **无备案适配**：属内容体验，非广告，合规。
- **优先级**：P2。

### 4.2 移动端广告自适应限流
- **痛点**：手机端广告多→拥挤跳出，移动流量占比高。
- **方案**：`ads.js` 依 `window.matchMedia('(max-width:768px)')` 仅保留底部横幅（`data-ad="mobile"`），隐藏侧边/内文位；`ensureMobileSlot` 已存在，扩展为「仅移动端显示」。
- **文件**：改 `public/common/ads.js`、`public/common/config.json`、`public/common/style.css`。
- **配置**：`mobileAd.limitToBottom:true`。
- **无备案适配**：纯前端，零备案。
- **优先级**：P1（留存）。

### 4.3 广告加载占位骨架屏
- **痛点**：广告异步加载导致布局抖动（CLS），误点击、体验差。
- **方案**：`ads.js` 渲染广告前先注入同尺寸骨架占位（CSS `skeleton` 动画），广告填充后替换；移除时淡出。
- **文件**：改 `public/common/ads.js`、`public/common/style.css`。
- **配置**：`skeleton.enabled`、`skeleton.height`（按 slot 类型）。
- **无备案适配**：纯前端，零备案。
- **优先级**：P2。

### 4.4 一键复制分销短链按钮
- **痛点**：站外社群推广需手动复制长链接。
- **方案**：前端加「复制推广链接」按钮（`navigator.clipboard`），复制 `affShort` 或 `AFF.href(t)`；`localStorage` 记推广记录；适配 §2.3 短链。
- **文件**：改 `public/common/affiliate.js`、`public/common/style.css`、卡片模板。
- **配置**：`affiliate.copyButton.enabled`。
- **无备案适配**：纯前端，零备案。
- **优先级**：P2。

### 4.5 广告一键关闭本地缓存
- **痛点**：用户反感广告无关闭入口→投诉→联盟下架。
- **方案**：每个广告位加「✕」关闭按钮，`localStorage` 记当日关闭（`ensureMobileSlot` 已有），次日自动恢复；关闭仅隐藏本类广告，不影响其他位。
- **文件**：改 `public/common/ads.js`、`public/common/style.css`。
- **配置**：`adClose.enabled`、`adClose.rememberDays:1`。
- **无备案适配**：合规的「可关闭广告」降低举报率。
- **优先级**：P2。

---

## 五、自动化脚本新增 & 升级（降人工运维）

### 5.1 变现全量巡检一体化（`monit-audit.js`）
- **痛点**：质量校验/分销检测/灰产扫描分散，无统一报表。
- **方案**：整合 `ads-audit.js` + `aff-check.js` + 灰产 `BLOCKLIST` 扫描，新增 `scripts/monit-audit.js`，每周 CI 跑，统一输出风险报表 POST 企业微信。
- **文件**：新 `scripts/monit-audit.js`；`.github/workflows/monit.yml`。
- **配置**：`report.wecomWebhook`、`monit.schedule`。
- **无备案适配**：报表走企业微信，零备案。
- **优先级**：P1（运维核心）。

### 5.2 低质站点自动整改提示
- **痛点**：`ads-audit` 只判屏蔽，不告诉缺多少内容。
- **方案**：扩展 `ads-audit.js`，不达标时于 `ads-blocked.json` 的 `detail` 写「缺 N 篇资讯 / 缺 M 个工具 / 正文少 K 字」，并在报表列出整改清单。
- **文件**：改 `scripts/ads-audit.js`。
- **配置**：复用 `quality` 门槛。
- **无备案适配**：纯脚本，零备案。
- **优先级**：P2。

### 5.3 联盟 PID 批量导入（CSV）
- **痛点**：手动写 `affiliate-map.json` 上百条低效。
- **方案**：新增 `scripts/aff-import.js --csv import.csv`，解析 `match,network,advertiser,pid,aid,cid,mid,commission` 列，幂等合并进 `affiliate-map.json`，去重比对哈希。
- **文件**：新 `scripts/aff-import.js`。
- **配置**：无（CLI）。
- **无备案适配**：纯脚本，零备案。
- **优先级**：P2。

### 5.4 收益归档备份
- **痛点**：联盟后台数据丢失难对账。
- **方案**：`ad-report.js`/`aff-dashboard.js` 输出同时落盘 `data/reports/<YYYY-MM>.json`（仓库备份，`.gitignore` 排除敏感 token 仅存聚合数），月度归档。
- **文件**：改 `scripts/ad-report.js`、`scripts/aff-dashboard.js`。
- **配置**：`report.archiveDir`。
- **无备案适配**：本地归档，零备案。
- **优先级**：P3。

---

## 六、收款、财务、税务配套

### 6.1 多币种自动对账表格
- **痛点**：美元/欧元收益换算人民币、月度对账手工繁琐。
- **方案**：新增 `scripts/finance-recon.js`，拉各联盟收益→按当日汇率（固定/API）换算 CNY→生成 CSV/Excel（`exceljs` 或 CSV）月度对账表，存 `data/reports/`。
- **文件**：新 `scripts/finance-recon.js`。
- **配置**：`finance.currency:"CNY"`、`finance.archiveDir`、`secrets.FX_API`（可选）。
- **无备案适配**：纯脚本，零备案；Excel 用于国内个人报税留存。
- **优先级**：P2。

### 6.2 W-8BEN 模板自动填充
- **痛点**：美国联盟（AdSense/CJ）需 W-8BEN，字段填错多扣税。
- **方案**：`MONETIZATION.md` 已含指引；新增 `scripts/w8ben.js` 或静态 `docs/w8ben-template.md` + 字段映射表，按联盟表单逐项给出填写示例（姓名/地址/纳税号留空由本人填）。
- **文件**：新 `docs/w8ben-template.md` 或 `scripts/w8ben.js`。
- **配置**：无。
- **无备案适配**：美国税务表单，非国内资质。
- **优先级**：P3。

### 6.3 多 Payoneer 账号拆分
- **痛点**：收入高后单 Payoneer 额度/结汇风控。
- **方案**：`MONETIZATION.md` 收款段扩展「按中/英文站点拆收款渠道」规范；`config.json` `finance.payoneer:[{label:"cn",networks:["adsterra"]},{label:"global",networks:["adsense","cj","impact"]}]` 作为记录，联盟后台对应绑定。
- **文件**：改 `public/common/config.json`、`MONETIZATION.md`。
- **配置**：`finance.payoneer`。
- **无备案适配**：Payoneer 零备案，多账号分散结汇风控。
- **优先级**：P2（规模化后必做）。

### 6.4 提现记录归档提醒
- **痛点**：提现流水散落各联盟后台，年度核算难。
- **方案**：联盟提现成功 → 企业微信推送（`monit.yml` 或人工触发 `finance-recon.js --record-withdrawal`）→ 追加 `data/reports/withdrawals.json` 统一归档。
- **文件**：改 `scripts/finance-recon.js`。
- **配置**：`finance.withdrawalWebhook`。
- **无备案适配**：纯脚本，零备案。
- **优先级**：P3。

---

## 七、站群合规与流量辅助（间接提收益）

### 7.1 海外隐私政策独立页面
- **痛点**：Adsterra/AdSense 强制隐私政策，无 ICP 时中文隐私声明无效。
- **方案**：新增 `privacy.html`（多语种，按访问 `lang` 切中/英/西/德），内容含 cookie/广告/分销披露；各子站 `footer` 加链接；`ads.js` 加载前校验隐私页存在。
- **文件**：新 `public/privacy.html`、`public/common/app.js`（footer 链接）、`public/common/article.js`。
- **配置**：`compliance.privacy.enabled`、`compliance.privacy.langs:["zh","en","es","de"]`。
- **无备案适配**：**核心合规项**，无备案站点必须有真实多语种隐私页才过审。
- **优先级**：P0（过审前置）。

### 7.2 Cookie 简易提示组件
- **痛点**：GDPR/CCPA 要求 Cookie 告知。
- **方案**：轻量静态条（非弹窗），一键「同意」写 `localStorage`；不阻断内容；仅海外站显示（中文站可隐藏或同样展示）。
- **文件**：新 `public/common/cookie.js`、`public/common/style.css`、各 HTML 引入。
- **配置**：`compliance.cookie.enabled`、`compliance.cookie.regions:["global"]`。
- **无备案适配**：GDPR/CCPA 合规，零备案。
- **优先级**：P0（过审前置）。

### 7.3 站外引流配套静态推广页
- **痛点**：小红书/知乎/海外社媒引流无落地页。
- **方案**：新增 `promo.html`（或 `/promo` 路由），按赛道聚合工具合集 + 分销短链，适合社媒 bio 引流；不引广告位，纯 CPS。
- **文件**：新 `public/promo.html`、`public/common/app.js`（路由）、`_redirects` 加规则。
- **配置**：`promo.enabled`、`promo.tracks:[...]`。
- **无备案适配**：静态页零备案，放大站外流量→广告+CPS 双增收。
- **优先级**：P2。

### 7.4 多语种本地化免责声明
- **痛点**：各地法规免责不同，统一中文声明无效。
- **方案**：`footer` 按 `lang` 渲染对应地区免责（如 EU 加 GDPR 数据主体权利、US 加 FTC ENDORSEMENT 披露「含分销链接」）。
- **文件**：改 `public/common/app.js`、`public/common/config.json`（各语种 `disclaimer` 文案）。
- **配置**：`compliance.disclaimer.enabled`、`compliance.disclaimer.byLang:{en:"...",es:"...",de:"..."}`。
- **无备案适配**：地区合规，零备案。
- **优先级**：P2。

---

## 八、流量增收配套（流量↑ → 广告收益↑）

### 8.1 资讯 AI 问答模块拓展长尾词
- **痛点**：教程资讯长尾覆盖有限。
- **方案**：`main-crawl.js` 新增「问答类」模板，批量生成 AI 问答式文章（如「X 工具怎么导出 CSV？」），覆盖百度/谷歌问答长尾；写入各站 `article/list.json`，页面数翻倍。
- **文件**：改 `scripts/main-crawl.js`（问答 prompt + 分类）。
- **配置**：`crawl.qaEnabled`、`crawl.qaRatio`。
- **无备案适配**：内容生成，零备案。
- **优先级**：P1（流量核心）。

### 8.2 站内专题聚合页
- **痛点**：单工具页长尾弱，缺聚合收录页。
- **方案**：新增 `topic.html`（或 `/topic/<slug>`），按用途聚合（如「8G 显存本地 AI 合集」），含广告位 + 分销推荐；`build-sitemap` 自动收录取各站 `topic/` 页。
- **文件**：新 `public/topic.html`、`scripts/build-sitemap.js`（扩展扫描）、`_redirects`。
- **配置**：`topic.enabled`、`topic.defs:[{slug,title,tools:[...]}]`。
- **无备案适配**：静态聚合页零备案，新增大量收录页。
- **优先级**：P2。

### 8.3 图片地图 Image Sitemap
- **痛点**：工具预览图未进图片搜索，丢免费流量。
- **方案**：`build-sitemap.js` 扩展生成 `image-sitemap.xml`（工具预览图绝对 URL），已在 `image-sitemap.js` 基础上补齐；提交站长平台图片地图。
- **文件**：改 `scripts/image-sitemap.js`（已存在）、`scripts/build-sitemap.js`、`functions/`。
- **配置**：复用 `common/image-sites.json`。
- **无备案适配**：图片搜索免费自然流量，零备案。
- **优先级**：P2。

---

## 九、CI / 流水线配套变现优化

### 9.1 构建失败分类告警
- **痛点**：代码错误与站点质量不达标混为一谈。
- **方案**：`deploy.yml`/`monit.yml` 区分退出码——代码错（非 0） vs 质量不达标（`ads-audit --strict` 退出 1）分别 POST 不同企业微信模板；质量类单独推送整改通知（见 §5.2）。
- **文件**：改 `.github/workflows/*.yml`、`scripts/ads-audit.js`（`--strict` 已支持）。
- **配置**：`report.wecomWebhook`、`report.qualityWebhook`（可选分开）。
- **无备案适配**：企业微信告警，零备案。
- **优先级**：P2。

### 9.2 月度变现数据汇总文档
- **痛点**：长期收益无归档。
- **方案**：`monit.yml` 月度任务跑 `ad-report`+`aff-dashboard`+`finance-recon`，汇总生成 `docs/revenue-<YYYY-MM>.md` 提交仓库。
- **文件**：新 `.github/workflows/monit.yml` 月任务；改上述脚本。
- **配置**：`report.monthlyDoc`。
- **无备案适配**：纯脚本，零备案。
- **优先级**：P3。

### 9.3 变现开关快速部署分支
- **痛点**：测广告/分销效果污染 `main`。
- **方案**：建 `feat/monetization` 分支跑试验，`deploy.yml` 允许该分支部署到**测试子域**（如 `test.72tool.com`），验证后 PR 合 `main`；`config.json` 测试分支指向测试广告 ID。
- **文件**：改 `.github/workflows/deploy.yml`（分支白名单 + 测试域）。
- **配置**：`CF_TEST_DOMAIN` 密钥。
- **无备案适配**：分支策略，零备案。
- **优先级**：P2。

---

## 十、长期扩容配套（200 → 300+ 站点）

### 10.1 多套广告配置批量导入
- **痛点**：新增一批站点逐个改 `config.json` 低效。
- **方案**：新增 `scripts/config-batch.js --apply ads-template.json`，把预设广告/分销配置批量写入匹配子站 `config.json`（幂等、哈希比对）。
- **文件**：新 `scripts/config-batch.js`。
- **配置**：无（CLI + 模板 JSON）。
- **无备案适配**：纯脚本，零备案。
- **优先级**：P2（规模化）。

### 10.2 独立变现数据隔离文件夹
- **痛点**：变现配置混在业务代码，后续拆仓库/拆 CF 账号迁移难。
- **方案**：把 `common/config.json`、`affiliate-map.json`、`ads-blocked.json`、`data/reports/` 统一归入 `monetization/`（或 `common/` 下独立子目录），`ads.js`/`affiliate.js` 路径常量集中，后续整体迁移。
- **文件**：改 `public/common/ads.js`、`public/common/affiliate.js` 路径常量；移动文件。
- **配置**：`GLOBAL_URL`/`BLOCK_URL` 等集中到 `monetization/`。
- **无备案适配**：结构优化，零备案。
- **优先级**：P3（架构）。

### 10.3 批量开关广告脚本
- **痛点**：节假日/策略调整需逐站开关。
- **方案**：`scripts/ad-switch.js --region global --on|--off` / `--track agent --off`，改各子站 `ads.enabled`（幂等）。
- **文件**：新 `scripts/ad-switch.js`。
- **配置**：无（CLI）。
- **无备案适配**：纯脚本，零备案。
- **优先级**：P2。

---

## 全局配置扩展（一次性加进 `public/common/config.json`）

```jsonc
{
  "quality": { "enforce": true, "minTools": 8, "minArticles": 3, "minArticleChars": 600, "blockGray": true },
  "langProvider": { "zh-CN": "adsterra", "zh": "adsterra", "es": "adsense", "de": "adsense", "vi": "adsense", "en": "adsense", "default": "adsterra" },

  "providers": {
    "adsterra": { "enabled": false, "slots": { "sidebar": {"type":"native","key":"","invoke":""}, "article": {"type":"native","key":"","invoke":""}, "mobile": {"type":"banner","key":"","invoke":""}, "top": {"type":"off"} } },
    "adsense": {
      "enabled": false,
      "accounts": [                       // ★ 多账号隔离（§1.4）
        { "id": "A", "client": "", "slots": {"sidebar":"","article":"","mobile":"","top":""}, "sites": ["es","de"] },
        { "id": "B", "client": "", "slots": {"sidebar":"","article":"","mobile":"","top":""}, "sites": ["en","vi"] }
      ]
    },
    "fallback": { "enabled": false, "network": "revenuehits", "src": "", "delayMs": 4000, "fill": true }  // ★ §1.1
  },

  "schedule": { "enabled": false, "timezone": "Asia/Shanghai", "offHours": [{"start":"00:00","end":"07:00"}], "regionOverrides": {"global": {"offHours": [{"start":"00:00","end":"06:00"}]}} }, // §1.2
  "adblock": { "enabled": false, "fallbackText": "为你精选好用的工具" },                    // §1.3
  "adDensity": { "enabled": true, "maxPerArticle": 2, "maxPerPage": 3 },                    // §3.2
  "crawlerIsolation": { "enabled": true, "bots": ["googlebot","bingbot","baiduspider","yandex"] }, // §3.3
  "ipRisk": { "enabled": true, "maxThreatScore": 20, "blocklist": [], "proxyDetect": true }, // §3.5
  "skeleton": { "enabled": true },                                                          // §4.3
  "adClose": { "enabled": true, "rememberDays": 1 },                                        // §4.5
  "mobileAd": { "limitToBottom": true },                                                    // §4.2

  "analytics": { "cfBeaconToken": "" },

  "affiliate": {
    "enabled": true, "subIdParam": "subId1", "label": "分销合作",
    "sortByCommission": true,                 // §2.1
    "promo": { "enabled": false, "cacheHours": 24 },   // §2.2
    "shortlink": { "enabled": false, "domain": "", "api": "" }, // §2.3
    "check": { "enabled": true, "schedule": "weekly" },  // §2.4
    "trial": { "enabled": false, "popupCooldownHours": 24 }, // §4.1
    "copyButton": { "enabled": false },          // §4.4
    "articleBox": { "enabled": true, "count": 2, "title": "本文相关工具" },
    "networks": { "cj": {"pid":"","deeplink":"https://www.anrdoezrs.net/links/{PID}/type/dlg/{URL}"}, "impact": {"pid":"","domain":"","deeplink":"https://{DOMAIN}/c/{PID}/{CID}/{MID}?u={URL}"}, "partnerstack": {"pid":"","deeplink":"{URL}?utm_source=partnerstack&utm_medium=affiliate&ps_partner_key={PID}"}, "avangate": {"pid":"","deeplink":"{URL}?avad={PID}"}, "generic": {"pid":"","deeplink":"{URL}?ref={PID}"} }
  },

  "template": { "variants": ["v1","v2","v3"] },  // §3.1
  "compliance": {
    "privacy":  { "enabled": true,  "langs": ["zh","en","es","de"] },  // §7.1 P0
    "cookie":   { "enabled": true,  "regions": ["global"] },          // §7.2 P0
    "disclaimer": { "enabled": true, "byLang": { "en":"FTC endorsement disclosure...", "es":"...", "de":"..." } } // §7.4
  },
  "promo": { "enabled": false, "tracks": [] },   // §7.3
  "topic": { "enabled": false, "defs": [] },     // §8.2
  "report": { "wecomWebhook": "", "schedule": "daily", "archiveDir": "data/reports", "monthlyDoc": true }, // §1.5/§5.1/§9.2
  "finance": { "currency": "CNY", "archiveDir": "data/reports", "payoneer": [{"label":"cn","networks":["adsterra"]},{"label":"global","networks":["adsense","cj","impact"]}], "withdrawalWebhook": "" }, // §6
  "crawl": { "qaEnabled": true, "qaRatio": 0.3 }  // §8.1
}
```

---

## 实施分期（建议粘贴进 AI 开发指令的顺序）

- **Phase 0（过审前置，必做）**：§7.1 隐私页 + §7.2 Cookie 提示（否则 AdSense 不过审）。
- **Phase 1（安全 + 直接增收）**：§3.1 模板随机、§3.2 广告密度、§3.5 IP 风控、§1.4 AdSense 多账号、§2.1 佣金排序、§2.4 失效巡检、§4.2 移动限流、§5.1 一体巡检、§1.1 RevenueHits 兜底。
- **Phase 2（体验 + 流量）**：§1.2 分时、§1.3 防屏蔽、§3.3 爬虫隔离、§4.1/4.3/4.4/4.5 前端体验、§8.1 问答长尾、§8.2 专题页、§8.3 图片地图、§7.3 推广页、§7.4 免责。
- **Phase 3（运维 + 财务）**：§1.5/§2.5 报表、§5.2/5.3/5.4 脚本、§6 全套财务税务、§9 CI、§10 扩容。

---

## 附录 A：可直接粘贴的 AI 开发指令（整合版）

> 复制下面整段给 AI 开发代理，即可按本手册落地（默认不改 `build-sitemap`/Functions/`main-crawl` 主流程，新增全部幂等、默认关）：

```
在 toolnav/（Cloudflare Pages 200 子域名工具+资讯双导航站，零 ICP 备案）中，按 OPTIMIZATION-PLUS.md 的 8 大类 + CI + 扩容共 30+ 项，分阶段增强变现与站群风控，全部零备案、零国内资质：
1. 广告：Adsterra(中文站)+AdSense(小语种，多账号隔离 §1.4)+RevenueHits 兜底(§1.1)；分时开关(§1.2)、AdBlock 降级工具推荐(§1.3)；全部 async、无弹窗；中文站绝不加载 Google 脚本。
2. CPS：佣金权重排序(§2.1)、活动/试用标签(§2.2)、独立短链域(§2.3)、失效巡检回退官网(§2.4)、subId 站群看板(§2.5)；分销链接 rel="sponsored nofollow noopener"，卡片标「分销合作」。
3. 风控：模板随机渲染(§3.1)、广告密度≤2/内文(§3.2)、爬虫UA不加载广告(§3.3)、申诉素材生成(§3.4)、Cloudflare 边缘 IP 风控(§3.5)；不达标写入 ads-blocked.json 屏蔽。
4. 前端：试用引导(§4.1)、移动端仅底部广告(§4.2)、骨架屏(§4.3)、复制短链(§4.4)、可关广告(§4.5)。
5. 自动化：monit-audit 一体巡检(§5.1)、低质整改清单(§5.2)、PID CSV 导入(§5.3)、收益归档(§5.4)。
6. 财务：多币种对账 Excel(§6.1)、W-8BEN 模板(§6.2)、多 Payoneer 拆分(§6.3)、提现归档(§6.4)。
7. 合规：多语种隐私页(§7.1 P0)、Cookie 提示(§7.2 P0)、站外推广页(§7.3)、本地化免责(§7.4)。
8. 流量：AI 问答长尾(§8.1)、专题聚合页(§8.2)、图片 sitemap(§8.3)。
9. CI：失败分类告警(§9.1)、月度收益文档(§9.2)、变现测试分支(§9.3)。
10. 扩容：配置批量导入(§10.1)、变现数据隔离目录(§10.2)、批量广告开关(§10.3)。
统一入口：public/common/config.json（新增 schedule/adblock/adDensity/crawlerIsolation/ipRisk/skeleton/adClose/mobileAd/template/compliance/promo/topic/report/finance 等字段，见手册全局配置扩展）；脚本置于 scripts/ 并幂等；新增页面 privacy.html/promo.html/topic.html 及 functions/ads-guard.js。先落地 Phase 0（隐私+Cookie），再 Phase 1（安全+增收），最后 Phase 2/3。每改一处需 node --check 语法、JSON 合法、并实跑 ads-audit 确认不破坏现有 build-sitemap/Function。
```

---

## 附录 B：新增/改动文件映射

| 项 | 新增文件 | 改动文件 |
|----|----------|----------|
| 广告兜底/分时/防屏蔽/密度/爬虫/IP | — | `public/common/ads.js`、`config.json` |
| AdSense 多账号 | — | `ads.js`、`config.json`、子站 `config.json` |
| 广告报表 | `scripts/ad-report.js` | `monit.yml` |
| 佣金排序/试用/短链/复制 | — | `affiliate.js`、`_aff.js`、`affiliate-map.json`、`app.js` |
| 失效巡检 | `scripts/aff-check.js` | — |
| 分销看板 | `scripts/aff-dashboard.js` | — |
| 模板随机 | — | `style.css`、`app.js`、`article.js`、子站 `config.json` |
| 申诉素材 | `scripts/appeal-gen.js` | — |
| IP 风控 | `public/functions/ads-guard.js` | `ads.js` |
| 前端体验 | — | `affiliate.js`、`style.css`、`index.html`、`article.html` |
| 一体巡检 | `scripts/monit-audit.js` | `ads-audit.js`、`monit.yml` |
| PID 导入 | `scripts/aff-import.js` | — |
| 财务对账 | `scripts/finance-recon.js` | — |
| 隐私/Cookie/免责 | `public/privacy.html`、`public/common/cookie.js` | `app.js`、`article.js`、`config.json` |
| 推广页/专题页 | `public/promo.html`、`public/topic.html` | `app.js`、`build-sitemap.js`、`_redirects` |
| 图片 sitemap | — | `image-sitemap.js`、`build-sitemap.js` |
| 问答长尾 | — | `main-crawl.js` |
| 配置批量/广告开关 | `scripts/config-batch.js`、`scripts/ad-switch.js` | — |
| 变现隔离目录 | 移动 `config.json` 等至 `monetization/` | `ads.js`、`affiliate.js` 路径常量 |
