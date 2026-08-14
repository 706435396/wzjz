# 初次上线清单（Launch Checklist）

> 适用：基于 `toolnav/` 的 200 站 Cloudflare Pages 多子域工具+资讯导航站群。
> 目标：首次把项目干净地部署上线，并被搜索引擎正常收录。
> 配套文档：`README.md`（入门）、`CLOUDFLARE-DEPLOY.md`（CF 操作）、`ACCOUNT-ISOLATION.md`（双账号）、`OPTIMIZATION.md`（优化总册）、`TROUBLESHOOTING.md`（故障排查）。

---

## 0. 代码侧已完成（本仓库已落地，无需再做）

| 项 | 状态 |
|----|------|
| 静态 `public/robots.txt` 与 Function 冲突 → 已删除，仅保留 `functions/robots.txt.js` | ✅ |
| 外链 `rel="nofollow noopener"`（第三方工具站 + 站外社群导流） | ✅ |
| `.gitignore` 已忽略 `.verify/`、`_fntest/`、`_sf.mjs`、`_sf_runner.mjs`、`backups/*.tar.gz` | ✅ |
| 验证残留已从磁盘清除 | ✅ |
| 8 个真实 bug 已修（中文相似度、process 遮蔽、longtail 空数组、image-sitemap loc、robots 漏声明等） | ✅ |
| 全量脚本/Function 语法、5 个 workflow YAML、23 个 sitemap XML、Function 24/24 断言 | ✅ |

---

## 1. GitHub Repo Secrets（CI 全部依赖，缺失则降级/失败）

在 GitHub 仓库 `Settings → Secrets and variables → Actions → New repository secret` 逐个添加：

| Secret 名 | 用途 | 缺省后果 |
|-----------|------|----------|
| `ZHIPU_API_KEY` | 智谱 AI：采集分类/长尾词/查重改写/翻译（零 Google 依赖） | 走本地启发式降级，内容质量下降 |
| `CF_API_TOKEN` | `wrangler pages deploy` 部署 | 部署失败 |
| `CF_ACCOUNT_ID` | 同上 | 部署失败 |
| `BAIDU_TOKEN` | 百度站长 sitemap 推送（`push-index*.js`） | 不推送，需手动提交 |
| `BING_TOKEN` | Bing/IndexNow 推送（可选） | 不推送 |
| `WEBHOOK_URL` | 安全周扫/流量日报/采集告警/变现报表的接收地址（企业微信/飞书/自定义，不用 Gmail）。**注意**：所有 workflow 统一用此名（非 ALERT_WEBHOOK） | 告警无接收端 |
| `CF_ACCOUNT_ID_B` / `CF_API_TOKEN_B` | 双账号隔离时的第二组（见第 6 节） | 单账号风险 |

> 提示：Cloudflare API Token 需授予 `Account → Cloudflare Pages → Edit` 权限；不要用车库全局 API Key。

---

## 2. Cloudflare Pages 项目开通

1. **建项目**：Cloudflare 控制台 → Workers & Pages → Create → Pages → 连接 GitHub 仓库（或 `Direct upload`）。
   - Project name：`toolnav`（与 `deploy.yml` 中 `--project-name=toolnav` 一致）。
   - **Build command：留空**（纯静态，省构建额度）。
   - **Build output directory：`public`**。
   - **Root directory（如有）：仓库根**（项目在 `toolnav/` 子目录时需指向该目录）。
2. **开启 Functions**：本项目用了 `functions/`，免费版可用，但注意额度（见下）。
3. **关闭 Preview deployments**：仓库设 `CF_PAGES_PREVIEW_DISABLED=true` 或控制台关闭，避免 PR/分支偷吃构建额度。
4. **额度评估（Functions）**：免费版 10 万请求/日、CPU 10ms/请求；200 子域的 sitemap/robots 全走 Function，高峰期可能触顶 → 评估 **Pages Pro**（或把 sitemap 改成构建期静态生成、仅 robots 走 Function）。

---

## 3. DNS + 200 子域绑定（上线硬前置）

1. **根域接入**：把 `72tool.com` 的 NS 切到 Cloudflare（或仅加站点并在各 NS 服务商处加 CF 给出的 CNAME/NS）。
2. **逐个绑定自定义域**：对每个 `# SITE <域名> <目录>`：
   - 控制台 Pages → 项目 → Custom domains → Add domain；或批量：
     ```bash
     # 在本地遍历 _redirects 的 SITE 行批量绑定
     while read -r _ _ dom dir; do
       npx --yes wrangler pages domain add "$dom" --project-name=toolnav
     done < <(grep '^# SITE' public/_redirects)
     ```
   - 每个子域会自动签发 SSL（Universal SSL，免费）。
3. **通配说明**：Pages 不支持 `*.72tool.com` 单一通配自定义域批量承载不同内容，需**逐域绑定**（脚本化即可）。
4. **新增站点零改代码**：以后加站只需 ① `_redirects` 加一行 `# SITE 新域 新目录`；② CF 绑该域；③ `build-sitemap.js` 会自动写入 `common/domain-map.json`，Function 自动识别。

---

## 4. 搜索引擎验证文件（提交 sitemap 的前置）

把各平台验证 HTML 放到 `public/` 根（部署即全子域可读）：

| 平台 | 文件 |
|------|------|
| 百度搜索资源平台 | `baidu_verify_XXXXXXXX.html` |
| Bing Webmaster | `BingSiteAuth_XXXX.xml` 或 `<meta>` 注入 |
| 360 / 搜狗 | 按平台指引放验证文件或 meta |

> 放好后各平台「验证」即通过，才能提交 sitemap 与查看收录。

---

## 5. Sitemap 提交策略

- **一次性总索引**（推荐）：提交根 `https://www.72tool.com/sitemap-index.xml` 一次，它已聚合全部子站（build-sitemap 生成，21 条目/7 站示例）。覆盖全站群，无需逐域提交。
- **逐子域**（冗余保障）：每个子域 `robots.txt`（Function 动态生成）已声明本站 `sitemap.xml`/`sitemap-detail.xml`/`article/sitemap.xml`，搜索引擎爬 robots 时自行发现。
- **主动推送**：配 `BAIDU_TOKEN` 后，`push-index-monthly.yml`（建议新增 cron）每月仅推近 30 天更新的站点，省百度配额。

---

## 6. 双账号隔离（规避一损俱损）

依据 `ACCOUNT-ISOLATION.md`：
- A 账号承载中文主站群（agent/*、tools/*），B 账号承载小语种（lang/*）与高风险类目。
- 两组 `CF_API_TOKEN` / `CF_ACCOUNT_ID` 分别存为 `_A` / `_B` Secrets；`deploy.yml` 按目录拆分两个 job 或用 matrix。
- 注册/登录全用 Outlook/ProtonMail，不与主力 Gmail 关联。

---

## 7. 上线前最终自检（Go / No-Go）

- [ ] `node scripts/build-sitemap.js` 本地跑通，生成 7 站 sitemap + `sitemap-index.xml` + `common/domain-map.json`，且连跑两次 MD5 一致（幂等）。
- [ ] 每个 `config.json` 的 `title`/`description` 已按站差异化（勿撞名）。
- [ ] 外链已 `nofollow`（已做）；站内互链（`/?tool=`、跨子域导航）保持 dofollow。
- [ ] 真实内容：先跑 `crawl.yml` 或 `create-site.js` + 真实采集，替换开发样例（每站 3–5 工具→建议 ≥15）。
- [ ] 资讯/工具带 `img` 封面字段（否则图片 sitemap 为空）。
- [ ] 7 个 Secrets 已配置；`WEBHOOK_URL` 已收到测试告警。
- [ ] CF 项目+Functions 已开；200 子域 DNS 已绑；SSL 已绿。
- [ ] 搜索引擎验证文件已放 `public/` 根。
- [ ] `.gitignore` 已忽略验证残留与备份（已做）。
- [ ] 备份：先手动跑一次 `merge.yml` 或 `restore-backup.js` 演练恢复。

---

## 8. 上线后监控（已就绪，待配 webhook）

| Workflow | 频率 | 输出 |
|----------|------|------|
| `security.yml` | 每周日 UTC 20:30 | 违规/风险外链扫描，推 `WEBHOOK_URL`，支持 `--offline` 一键下线 |
| `traffic.yml` | 每日 UTC 17:00 | 各 zone 流量报表推 webhook |
| `merge.yml` | 每周 | 合并 + 打包 `backups/*.tar.gz` + 冷站标记 |
| `crawl.yml` + `deploy.yml` | 日采集 / 周部署 | 节流：月构建约 4–5 次 |

> 上线后前 2 周重点看：收录量、各子域独立 IP、是否有「站点群」算法预警（百度搜索资源平台消息）。
