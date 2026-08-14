# Cloudflare Pages 多子域名站群部署教程

> 配套本仓库的纯静态工具导航站群（`public/` 单项目、多自定义域名）。
> 全程不使用任何 Google 服务：注册用 Outlook/Proton 邮箱、AI 用智谱、部署用 Cloudflare、代码托管用 GitHub。

---

## 0. 零 Google 风控前提（重要）

Cloudflare / GitHub 账号若用 Google 快捷登录，一旦 Google 侧风控或封号，会**连锁拖垮**所有站点。请严格遵守：

1. **注册邮箱**：只用 Outlook / Hotmail / Proton / 自建域名邮箱，**禁止** Gmail 快捷登录。
2. **GitHub 账号**：同理，用上述邮箱注册，开启 **2FA**（推荐 Authenticator App，不要绑 Google 验证器之外的账号）。
3. **API Key / Token**：智谱 Key、Cloudflare Token 一律存 **GitHub Secrets**，绝不写进代码或提交仓库。
4. **域名**：主域名（如 `72tool.com`）建议在 Namesilo / Porkbun / Cloudflare Registrar 等**非 Google** 注册商购买。
5. **多账号隔离**：把站群拆到多个 Cloudflare 账号（见第 5 节），单账号出事不会全站连坐。

---

## 1. 创建 Cloudflare Pages 项目（承载上百子站）

1. 登录 Cloudflare 控制台（Outlook 邮箱注册的账号）。
2. 左侧菜单 **Workers & Pages → Create → Pages → Connect to Git**。
3. 授权并选中本仓库（如 `yourname/toolnav`）。
4. 构建设置：
   - **Framework preset**：选 `None`（纯静态，无构建命令）。
   - **Build command**：**留空**（本仓库是现成静态文件，无需 `npm run build`，这能避免每次无谓构建、秒级发布）。
   - **Build output directory**：填 `public`（仓库里静态资源的根目录）。
5. 点 **Save and Deploy**。第一次会生成一个 `*.pages.dev` 预览域名（如 `toolnav.pages.dev`）。
6. 之后 `git push` 到 `main` 分支，会自动触发 `deploy.yml` 部署到这个 Pages 项目。

> 因为 Build command 留空，Cloudflare 只是把 `public/` 原样发布，**几乎不占用构建时长**，对 500 次/月限额极其友好。

---

## 2. 批量绑定子域名（每个子站独立收录）

架构核心：**一个 Pages 项目挂 N 个自定义域名，全部共用同一份 `public/` 构建**；前端 `common/app.js` 读取 `window.location.hostname`，自动加载对应子目录的 `config.json` / `data/list.json`。搜索引擎看到不同域名 + 不同 TDK + 不同内容 = 视为独立站点。

### 2.1 主域名 Zone 接入
1. 控制台 **Websites → Add a Site**，填入主域名 `72tool.com`（按提示把 NS 改到 Cloudflare）。
2. 等 DNS 生效（几分钟到几小时）。

### 2.2 给每个子站加一条 CNAME
在 Zone `72tool.com` 的 **DNS** 里，为每个子域名加一条 CNAME，指向 Pages 项目地址：

| 类型 | 名称 | 目标 | 代理 |
|------|------|------|------|
| CNAME | `browseragent` | `toolnav.pages.dev` | 已代理(橙云) |
| CNAME | `tiktokagent` | `toolnav.pages.dev` | 已代理 |
| CNAME | `gpuagent` | `toolnav.pages.dev` | 已代理 |
| CNAME | `txtclean` | `toolnav.pages.dev` | 已代理 |
| CNAME | `sitemapgen` | `toolnav.pages.dev` | 已代理 |
| CNAME | `es` | `toolnav.pages.dev` | 已代理 |
| CNAME | `de` | `toolnav.pages.dev` | 已代理 |

> 橙色云朵（Proxy）开启后，流量走 Cloudflare CDN，免费版自带无限流量与基础 WAF。

### 2.3 在 Pages 项目里逐个认领自定义域名
进入 **Workers & Pages → toolnav → Custom domains → Set up a custom domain**，依次输入：
`browseragent.72tool.com`、`tiktokagent.72tool.com` …… Cloudflare 会自动签发免费 SSL 证书（Universal SSL，几分钟生效）。

> 单项目最多 **100 个自定义域名**（免费版），覆盖绝大多数站群。超过 100 个就再建一个 Pages 项目（见第 5 节）。

### 2.4 用 API 批量绑定（省人工，适合 100+ 域名）
在本地用 Cloudflare API 批量添加（需 `CF_API_TOKEN` 含 `Zone:Zone:Edit` 与 `Pages:Edit`）：

```bash
#!/usr/bin/env bash
# batch-add-domains.sh —— 批量认领子域名到 Pages 项目
set -e
ACCOUNT_ID="你的CF账号ID"
PROJECT="toolnav"
TOKEN="$CF_API_TOKEN"
# 子域名列表（改这里即可）
SUBS=(browseragent tiktokagent gpuagent txtclean sitemapgen es de)

for s in "${SUBS[@]}"; do
  curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT/domains" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"name\":\"$s.72tool.com\"}"
  echo " -> 已认领 $s.72tool.com"
done
```

> 注意：批量认领前，2.2 的 CNAME 记录必须已存在，否则 API 会报域名未指向项目。

### 2.5 各子站 sitemap 提交搜索引擎
每个子站 sitemap 物理位于 `public/<子目录>/sitemap.xml`，对外访问地址为：
```
https://browseragent.72tool.com/agent/browser/sitemap.xml
```
在 Google Search Console / 百度搜索资源平台**逐子域名**添加站点并提交该 sitemap URL，即可实现"独立收录"。

> 进阶（可选）：若希望每个子域名根路径直接返回自己的 sitemap（如 `https://browseragent.72tool.com/sitemap.xml`），可在仓库加一个 Cloudflare Pages Function `functions/sitemap.xml.js`，按 `request.headers.get('host')` 读取对应子目录 sitemap 并返回。本教程不默认包含，需要我再补。

---

## 3. 免费额度与优化清单

### 3.1 Cloudflare Pages 免费套餐限额
| 项目 | 免费额度 |
|------|----------|
| 单 Pages 项目自定义域名数 | **100 个** |
| 单 Cloudflare 账号 Pages 项目数 | **100 个** |
| 每月构建次数 | **500 次** |
| 站点带宽 | 无限（走 CDN） |
| 请求数 | 无限 |
| SSL 证书 | 自动签发、无限 |

### 3.2 把额度用到极致（本仓库已内置的优化）
1. **Build command 留空**：发布只是文件拷贝，单次构建秒级，几乎不耗 500 次额度。
2. **无新增不提交**：`crawl.yml` 在 `git diff --cached --quiet` 时直接跳过 commit，不触发 `deploy.yml`，**零构建消耗**。（详见第 4 节）
3. **sitemap 幂等**：`build-sitemap.js` 的 `lastmod` 取自数据 `updated` 字段而非当天日期，数据没变 sitemap 内容就不变，不会因"日期刷新"制造假 diff 而天天部署。（已修复）
4. **Playwright 按需**：默认 `USE_PW=0` 走 `fetch` 抓 RSS/HTML；只有 JS 重度页面才设 `USE_PW=1`，且浏览器二进制走 `actions/cache` 缓存，省 GitHub Actions 分钟（免费 2000 分钟/月）。
5. **增量写入**：爬虫按工具 URL 去重，只追加新条目，不覆盖历史数据，避免无意义的整文件变更。

---

## 4. 全自动采集如何"零消耗"运行（回顾）

- `crawl.yml` 每日北京 02:00 运行 `node scripts/main-crawl.js`。
- 抓取 → 智谱 AI 分类 → **按 URL 去重、违规过滤** → 仅新增工具才写入对应子站 `data/list.json`。
- 仅当 `added > 0` 时内部调用 `build-sitemap.js` 重建地图。
- 末尾判断 `git diff`：无变化则 `echo "无内容变化，跳过提交"`，**当天不部署、不耗构建**。
- 有变化才 `git push` → 触发 `deploy.yml` → 部署 1 次（计入 500 次）。

> 按经验，多数站点每日新增有限，一个月构建次数远低于 500，**免费套餐完全够用**。

---

## 5. 多账号拆分与 Zone 跨账号迁移

当站点接近 100 个 / 单账号上限，或想做风险隔离时，拆账号：

1. **多账号注册**：用不同 Outlook 邮箱各注册一个 Cloudflare 账号（每个账号独立 100 项目 / 100×100=10000 子域上限）。
2. **新建 Pages 项目**：在第二个账号重复第 1 节，建 `toolnav2` 等项目，绑定同一仓库（GitHub 可授权给多个 CF 账号）。
3. **Zone 跨账号迁移**（把 `72tool.com` 整体从一个 CF 账号迁到另一个）：
   - 在**目标账号** Add Site `72tool.com`，CF 会给出一组**新的 NS 服务器地址**。
   - 到**域名注册商**（Namesilo/Porkbun 等）把 NS 改成目标账号给的新地址。
   - 等 NS 全球生效（TTL 传播通常 5 分钟~24 小时），原账号的 Zone 自动失效。
   - 迁移后，在目标账号重新加 CNAME 与 Pages 自定义域名即可。
   - ⚠️ 迁移期间 DNS 有短暂切换窗口，建议在低峰期操作，并提前把 DNS 记录导出备份。
4. **子域名分账号**：也可不迁移主 Zone，而是把部分子域名（如 `es.72tool.com`）在注册商侧单独做 NS 委派到另一个账号的 Zone（子域委派），实现"主域一个账号、部分子域另一个账号"。

---

## 6. 上线前必做的一键准备

```bash
# 本地先生成并提交所有子站 sitemap（首次部署必须有，否则仓库里没有 sitemap）
cd toolnav
node scripts/build-sitemap.js
git add -A && git commit -m "init: 生成初始 sitemap" && git push

# 配置仓库 Secrets（Settings > Secrets and variables > Actions）
#   ZHIPU_API_KEY   = 智谱开放平台 Key
#   CF_API_TOKEN    = Cloudflare API Token（Pages:Edit 权限）
#   CF_ACCOUNT_ID   = Cloudflare 账号 ID
```

推送后 `deploy.yml` 自动部署；次日凌晨 `crawl.yml` 开始无人值守采集。

---

## 7. 风险与排查

- **域名未生效 / 证书 pending**：检查 CNAME 是否指向 `*.pages.dev` 且橙色云朵开启；DNS 生效后才能签发证书。
- **子站显示空白 / 加载不到数据**：确认该子目录有 `config.json` 且 `domain` 字段等于绑定的自定义域名；`common/app.js` 用 `hostname` 匹配 `HOST_MAP`。
- **每天都被部署（额度被偷）**：确认 `build-sitemap.js` 用数据 `updated` 做 lastmod（已修复）；若仍每天部署，检查是否有其他文件（如日志）被写进仓库。
- **智谱调用失败**：脚本会自动降级为启发式分类，仍可跑通；上线前填好 `ZHIPU_API_KEY` 即可获得 AI 分类与 SEO 文案。

---

## 8. Functions 统一 /sitemap.xml 路由（推荐）

让每个子域名根路径 `https://xxx.72tool.com/sitemap.xml` 直接返回自己的站点地图，站长平台只需提交 `域名/sitemap.xml`，无需填长路径。

1. 新建 `public/functions/sitemap.xml.js`（目录名 `functions` 不可改，Cloudflare 按文件名自动匹配 `/sitemap.xml` 路由）。逻辑：取 `hostname` → 查 `域名->子目录` 映射 → 用 `env.ASSETS.fetch` 读取该子目录内的 `sitemap.xml` 返回，设 `Cache-Control: max-age=3600`。
2. **映射零维护**：`build-sitemap.js` 已自动生成 `public/sitemap-routes.json`（域名 → 子目录，来自各子站 `config.json.domain`）。Function 优先读取它，新增站点只要 `config.json.domain` 填对即自动收录；内置 `fallbackMap` 兜底防止 JSON 缺失。
3. **主域名特例**：`72tool.com` / `www.72tool.com` 访问 `/sitemap.xml` 返回根总索引 `sitemap-index.xml`（其 `<loc>` 已是各子站 `域名/sitemap.xml`，爬虫一次抓全）。
4. **范围**：该 Function 只拦截 `/sitemap.xml` 这一个路径，其余页面仍走静态资源 + `_redirects`，互不干扰。
5. **额度**：Pages Functions 免费 10 万请求/天，200 站爬虫完全够用，且**不计入 500 次/月构建次数**。
6. **本地测试**：装 `wrangler` 后 `npx wrangler dev`，配合本地 `hosts` 把子域名指向 `127.0.0.1` 即可验证；CF 云端无需任何额外配置，提交代码即自动启用 Functions。
