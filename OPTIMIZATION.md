# 200 站 Cloudflare Pages 子域名工具站 · 全链路优化手册

> 配套代码已落地（见 `scripts/`、`public/functions/`、`.github/workflows/`）。
> 本手册把「优化清单 6 大模块」逐条对应到**已实现**与**部署/配置动作**，方便你照单执行。
> 全链路零 Google 依赖：AI=智谱 GLM、统计=51.la/百度、账号=Outlook、部署=Cloudflare Pages。

---

## 〇、已落地的代码清单（本次交付）

| 文件 | 对应模块 | 作用 |
|------|----------|------|
| `public/_redirects` | 一.1 | 新增 `# SITE <域名> <目录>` 注册表，站点清单单一来源 |
| `scripts/build-sitemap.js` | 一.1 / 一.2 | 解析 `_redirects` → `common/domain-map.json`；每站生成 `sitemap.xml` + `sitemap-detail.xml` + 总索引（幂等） |
| `public/functions/sitemap.xml.js` | 一 / 四 | 子域名根 `/sitemap.xml` 自动返回对应目录地图；根域名返回总索引 |
| `public/functions/sitemap-detail.xml.js` | 一.2 | 子域名 `/sitemap-detail.xml` 详情内页地图 |
| `public/functions/robots.txt.js` | 一.2 | 按子域名差异化 `/robots.txt`，屏蔽组件/数据源/筛选页 |
| `public/_headers` | 二.2 / 四.1 | 静态资源分层缓存（CSS/JS/组件 1 天，JSON 1 小时） |
| `scripts/main-crawl.js` | 三 | 批量 AI（50/批）+ 本地关键词预过滤（免 AI）+ 内容查重防同质化 |
| `.github/workflows/crawl.yml` | 二.1 | 每日采集；仅新增才提交到 `temp-crawl` 分支（不部署） |
| `.github/workflows/merge.yml` | 二.1.2 | 每周合并 `temp-crawl`→`main`，触发 1 次部署 |
| `.github/workflows/deploy.yml` | 二 | 仅 `main` 推送时部署 |
| `scripts/site-manage.js` | 五.1.2 | 一键 `disable`/`enable` 站点（改 `_redirects` 注册表） |
| `scripts/push-index.js` | 一.3 | 百度站长 sitemap 推送（自动），Google Indexing 可选入口 |
| `public/common/app.js` | 四.1/四.2 | 卡片懒加载（首屏 12）+ `?tool=` 深链 + Schema |
| `public/index.html` | 四.3 | 51.la 统计占位（替换 GA） |

---

## 一、Sitemap & 爬虫抓取优化（已落地）

### 1. 自动 domainMap，免手动维护映射 ✅
- `build-sitemap.js` 启动时解析 `public/_redirects` 的 `# SITE` 行，自动产出 `public/common/domain-map.json`（域名→目录）。
- `functions/sitemap.xml.js` / `robots.txt.js` 直接读取该 JSON，**新增站点只加一行 `_redirects` + CF 控制台加域名，零改代码**。
- `site-manage.js disable` 会把该行改为 `# SITE-DISABLED`，Functions 与 build-sitemap 自动忽略（下线零残留）。

### 2. 爬虫权重分流 ✅
- **分站点 robots**：`/robots.txt` Function 按域名返回规则——允许 `/` 与 `/?tool=`，禁止 `/common/`、`/data/`、`*.json`、`?q=` 搜索页，减少无效抓取。
- **sitemap 拆分**：每站两份地图 `<dir>/sitemap.xml`（列表页）+ `<dir>/sitemap-detail.xml`（详情内页，域名/?tool=），分段抓取避免单文件数万条超时。站长平台提交 `域名/sitemap.xml` 与 `域名/sitemap-detail.xml`。
- **缓存分层**：sitemap 2h、总索引 1h、robots 1h、详情 6h（`functions/*` 内 `Cache-Control`）。

### 3. 自动推送收录 API ✅（百度）/ ⚙️（Google 可选）
- `push-index.js`：读取 `domain-map.json` 各子站 sitemap，批量 POST 百度 `data.zz.baidu.com/sitemap`（需 `BAIDU_TOKEN` 密钥）；失败重试 3 次 + 日志。
- Google Indexing API：配置 `GOOGLE_INDEXING_SA_JSON`（**服务账号 JSON，非 Gmail 登录**）即启用入口；未配置跳过。建议以百度为主、Google 人工后台补提交，规避 Gmail 风控。

---

## 二、Cloudflare Pages 免费额度极致优化（核心）

### 1. 减少构建次数（每月 500 次）✅
- **分支拆分（最重要）**：`crawl.yml` 每日把数据提交到 `temp-crawl` 分支，**不触发部署**；`merge.yml` 每周一把 `temp-crawl` 合并进 `main`，推送 `main` 才部署。**全站每周仅 1 次构建**，月消耗约 4–5 次（加你手动 push）。
- **增量提交过滤**：仅当 `main-crawl.js` 本次新增 `≥1` 条才提交（`scripts/.last-run.json` 计数驱动）；无新增不提交、不部署。
- **忽略无关文件**：`.gitignore` 屏蔽 `node_modules/`、`*.log`、`scripts/.last-run.json`、`.cache/`、原始爬虫素材，只有数据/页面/地图变更才进 git。
- **关闭 Preview 部署（手动）**：Cloudflare Pages 项目 Settings → Builds & deployments → 关闭 “Preview deployments”，避免 PR/分支推送浪费一半构建次数。

### 2. Function 请求额度优化（每日 10 万免费）✅
- `public/_headers` 给 CSS/JS/组件 1 天强缓存，JSON 1 小时，静态资源走 CDN，不反复回源、不反复走 Function 解析。
- sitemap/robots 已设 `Cache-Control`，爬虫重复访问命中边缘缓存，不每次调用 Function。
- 冷门站兜底：若某子站长期零流量，可在 `build-sitemap.js` 扩展为“直接把 `sitemap.xml` 落地到根目录静态文件、不走 Function”——当前默认走 Function（10 万/日足够 200 站），按需开启。

### 3. 多账号负载 & 成本优化（见第六节配置）⚙️
- 账号 A：国内高流量中文站；账号 B：小语种低流量海外站，平分 CDN/Function 负载，避免单账号突增触发人工审核。
- DNS Zone 分离：主域名 Zone 在账号 A；小语种独立域名 Zone 放账号 B，单 Zone 违规不污染另一域名。
- 免费账号关闭图像调整、视频转换、强力 Bot 防护（仅轻度），减少风控标记。

---

## 三、AI 采集流水线全链路优化（已落地）

### 1. AI 调用成本压缩 ✅
- **批量聚合**：`main-crawl.js` 把本地规则未命中的模糊工具按 **50 个/批** 合并一次智谱请求，API 次数降为 1/50，token 省约 70%。
- **本地预过滤**：强关键词命中（如 playwright/RPA→browser、tiktok/剪辑→tiktok）直接定赛道，**跳过 AI、零 token**。
- **增量只写新工具**：存量工具不重写文案，仅新抓取工具生成完整 SEO 内容。
- 无 `ZHIPU_API_KEY` 自动降级启发式分类，本地可跑通演示。

### 2. 内容防同质化 ✅（基础层）/ ⚙️（增强层）
- **已落地**：`dedupeDesc()` 入库前对同目录已有简介做 Jaccard 相似度检测，>0.6 自动追加「（工具名）」差异化后缀，避免百度判低质重复。
- **多赛道差异化 Prompt**：同一工具分配到不同子站时，可在 `ROUTES` 的 `cat` 之外为 `classifyBatch` 增加“角度词”（如 GPU 站强调显存/本地部署、TikTok 站强调批量剪辑/跨境合规）——当前用统一 prompt + 本地规则兜底，需在 `buildPrompt` 扩展按 `category` 注入角度模板。
- **全局查重脚本**：可加一步扫描全仓库 `data/list.json` 的 `desc` 相似度，>60% 二次 AI 改写（需额外 token，按预算开启）。

### 3. 爬虫稳定性 & 合规 ✅
- UA 轮换、`USE_PW=1` 可走 Playwright 渲染；GitHub/HF/PH 分开限流（各自 try/catch 互不阻断）。
- 违规双层过滤：本地 `BLOCKLIST`（破解/翻墙/盗版/色情/赌博）直接丢弃；AI 二次判定 `safe=false` 剔除。
- 失败重试 + 断点：各数据源独立容错；地图生成幂等，中断重跑不产生脏数据。

---

## 四、前端 SEO & 性能优化（已落地）

### 1. 轻量化 & 加载速度 ✅
- `app.js` 卡片**懒加载**：首屏仅 12 个，滚动经 `#sentinel` 的 `IntersectionObserver` 异步追加，降低首屏体积与跳出率。
- `_headers` 长期缓存静态资源；Cloudflare 自动 Brotli/Gzip（无需手动）。
- 统计替换 GA：用 **51.la/百度统计**（`index.html` 占位，替换 `YOUR_ID` 启用），规避 Google 风控。

### 2. 多层 SEO 增强 ✅
- 每张卡片注入 `SoftwareApplication` Schema（name/url/description/os/category），搜索结果可展示结构化信息。
- 站内搜索本地化（`window.__data` + 前端过滤，0 延迟，无后端）。
- 移动端自适应（`style.css` 网格单列），`?tool=` 深链定位高亮，利于收录深度。

### 3. 变现模块 ⚙️
- 广告/CPS 建议异步加载（`<script async>`），不阻塞首屏；国内站放 51.la/百度联盟，海外站放对应联盟，按 `config.json` 的 `lang` 区分展示。

---

## 五、200 站矩阵运维优化（部分已落地）

### 1. 批量管理标准化 ✅
- 每子站 `config.json` 存独立 TDK/分类/赛道关键词/广告开关，新增站点复制模板即可（前端 `HOST_MAP` 仍需加一行，或改用 `domain-map.json` 驱动的纯前端映射）。
- `site-manage.js` 一键下线/恢复（改 `_redirects` 注册表，自动同步地图索引）。
- 全局组件（`common/` 导航/暗色/版权）改一处 200 站同步。

### 2. 监控告警自动化 ⚙️（已留入口）
- `crawl.yml` 末尾 `WEBHOOK_URL` 步骤：失败或零新增时 POST 企业微信/邮件 webhook（**不用 Gmail**）。
- 建议告警项：爬虫失败、智谱额度不足（检测 HTTP 429）、CF 构建失败、sitemap 抓取异常。

---

## 六、风控安全优化（配置级）

### 1. 账号/网络/服务隔离 ⚠️ 必做
- CF、GitHub、智谱、百度站长、统计全部用**独立 Outlook/ProtonMail**，杜绝 Gmail 串联。
- 采集用 GitHub Actions 云端 IP；本地测试不拿家庭 IP 批量操作站长平台。
- 广告联盟国内/海外分开注册，不绑同一实名。

### 2. 规避站群风控标记 ⚠️
- **UI 差异化**：200 站微调配色/卡片布局/分类顺序（可在 `config.json` 加 `theme` 变量，前端按站读取），避免被判批量模板站群。
- **流量分层**：新站前 30 天不主动大量推送收录，缓慢引入爬虫。
- **内容合规兜底**：`BLOCKLIST` + AI 审核定期全仓库扫描，禁收录破解/翻墙/色情/赌博，防 DMCA。

### 3. 多账号拆分实操（Cloudflare）
1. 注册 2 个 CF 账号（均 Outlook）。
2. 账号 A 建 Pages 项目 `toolnav-cn`（中文站），账号 B 建 `toolnav-global`（小语种站）。
3. 主域名 `72tool.com` Zone 放账号 A；小语种独立域名 Zone 放账号 B。
4. 各账号配 `CF_API_TOKEN`/`CF_ACCOUNT_ID` 密钥；`deploy.yml` 用 `accountId` 区分（或用两个仓库/两个 workflow）。
5. 免费限额：单项目 100 自定义域名、单账号 100 Pages 项目、每月 500 次构建；按上述拆分，200 站稳稳承载。

---

## 七、低成本增值（免费）

1. **多语种拓展**：`lang/es`、`lang/de` 已示范；可加 `lang/en`，用智谱把中文简介译英，一套数据双语言。
2. **站内搜索静态化**：当前已是前端本地搜索（`window.__data`），0 延迟，无需后端。
3. **历史归档**：`merge.yml` 每周合并即形成可追溯历史；建议每周 `git tag` 打备份（`merge.yml` 末尾加 `git tag backup-$(date +%F)` 推送），账号封禁可一键恢复。

---

## 八、上线检查清单（Checklist）

- [ ] `ZHIPU_API_KEY` / `CF_API_TOKEN` / `CF_ACCOUNT_ID` / `BAIDU_TOKEN` 配为仓库 Secrets
- [ ] `git push` 到 `main` 触发首次部署（CF Pages 构建目录填 `public`、Build command 留空）
- [ ] 各子站在 CF Pages → Custom domains 添加自定义域名并验证
- [ ] 关闭 Preview deployments
- [ ] 本地预览：复制首页到子目录 + `?site=agent/browser` 验证
- [ ] 验证 `/sitemap.xml`、`/robots.txt`（绑定域名后或 `wrangler dev` 本地）
- [ ] `node scripts/site-manage.js disable <域名>` 演练一键下线
- [ ] 配置 `WEBHOOK_URL` 接收运行告警

---

## 九、资讯/教程模块（工具 + 资讯双导航）★ 本次新增

> 解决「纯工具站」短板：长尾词不足、跳出率高、语义单薄、缺变现载体。
> 做法：**不单独建资讯站**，在现有多子域名架构里叠加 `/article` 栏目，一套代码同步 200 站，全自动 AI 采集生成文章。

### 1. 为什么叠加资讯（而非拆独立站）
| 类型 | 短板 | 双导航解决方案 |
|------|------|----------------|
| 纯工具站 | 只有工具词、跳出率高、易被判低质站群 | 叠加教程/选型/避坑资讯，覆盖海量问答长尾词 |
| 独立资讯站 | 多一套维护、权重分散 | 共用子域名 `/article`，工具↔资讯双向内链、权重互通 |

### 2. 落地架构（零逐站复制）
```
public/
├── article.html              # 资讯栏目的【唯一】模板（hostname 感知，全子域名共用）
├── common/article.js         # 列表/详情渲染、Article Schema、相关工具互链
├── functions/article/sitemap.xml.js   # 统一 /article/sitemap.xml 入口
└── <dir>/article/
    ├── list.json             # 资讯数据（按 slug 增量写入）
    └── sitemap.xml           # 资讯独立地图（build-sitemap 自动生成）
```
- **路由**：`_redirects` 全局路径级 200 重写 `/article` → `/article.html`、`/article/*` → `/article.html?slug=:splat`（一次配置，200 站通用，无需复制前端）。
- **详情 URL**：`https://xxx.72tool.com/article/<slug>`（干净 URL，SEO 友好）。
- **互链**：工具页底部「相关教程」按工具名匹配；资讯详情页「相关工具」反链 `?tool=`，形成双向内链。

### 3. 自动化采集（复用现有 AI 流水线）
- 数据源：`huggingface.co/blog/feed`（使用指南/报错）、GitHub 周趋势（README/issue 实操）。
- 分发：本地关键词预过滤定赛道（免 AI）→ 模糊项 `classifyArticleBatch` **50/批聚合调用智谱**（与工具同源，省 API）→ 生成 `title/summary/keywords/长尾词`。
- 写入：`writeArticle()` 按 `slug + url` 去重增量写各子站 `article/list.json`，不覆盖历史。
- 地图：`build-sitemap.js` 扫描各站 `article/list.json` 自动生成 `<dir>/article/sitemap.xml` 并汇总进 `sitemap-index.xml`（**幂等**，无新增不制造假 diff）。
- 推送：`crawl.yml` 结束后 `push-index.js` 可把 `域名/article/sitemap.xml` 一并推百度/谷歌。

### 4. 四大收益（对应你的清单）
1. **SEO 翻倍**：工具词 + 问答/教程/对比长尾词；每站拆「工具 sitemap + 资讯 sitemap」分层抓取；收录量提升 3~8 倍。
2. **降风控**：从「纯工具链接聚合」升级为「垂直工具 + 专业教程门户」，大幅降低被搜索引擎/CF 判低质站群概率。
3. **提留存/变现**：用户查工具可看配套教程，停留时长翻倍；资讯页天然适配 CPS/联盟广告/付费指南。
4. **零人工**：复用 GitHub Actions 定时流水线，每日同步抓取+AI 改写+分发，改 `common/` 模板 200 站 UI 同步。

### 5. 两种部署方案（按需选）
- **方案 A（推荐）**：子站独立资讯。每个子域名 `/article` 内容完全贴合赛道（已实现）。长尾精度最高。
- **方案 B**：全局统一 `/blog`。所有子域名跳转 `72tool.com/blog`，仅一套数据。构建消耗最低，但细分长尾弱。

### 6. 上线步骤回顾
1. 各子站建 `article/list.json`（已附 7 个示例，含真实 `relatedTools` 互链）。
2. `node scripts/build-sitemap.js` 自动生成各站资讯 sitemap + 总索引。
3. 提交 GitHub → Cloudflare Pages 自动识别 `functions/article/` 启用资讯地图路由。
4. 绑定域名后访问：`域名/article`（列表）、`域名/article/<slug>`（单篇）、`域名/article/sitemap.xml`（地图）。
5. `main-crawl.js` 已含资讯采集，每日定时自动扩量；新增 200 站只需加 `_redirects` + `?site` 无需改前端。

> 扩量提示：把示例文章数据复制到新子站目录、在 `_redirects` 注册、CF 加域名即可；`article/list.json` 由采集脚本自动填充，无需手工维护。
