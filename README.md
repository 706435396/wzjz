# 72tool 多子域名垂直工具导航站群

一套 **多子域名垂直工具导航静态站**：1 个 Cloudflare Pages 项目承载上百个独立站点（每个子域名 = 搜索引擎眼中独立网站），共用一套代码、一次构建；配套 GitHub Actions 全自动 AI 采集流水线，无人值守更新 200+ 细分工具站点。

> 全链路脱离 Google 服务：AI 用 **智谱 AI（BigModel/GLM）**，爬虫用 **Node + Playwright**，部署用 **Cloudflare Pages**，账号用 **Outlook 邮箱**。

---

## 一、项目目录树（固定结构）

```
toolnav/
├── public/                          # ★ Cloudflare Pages 读取的根目录（纯静态）
│   ├── _redirects                   # CF Pages 路由文件（URL 规范化 + 说明）
│   ├── robots.txt                   # 全站爬虫规则，指向总站点地图索引
│   ├── sitemap-index.xml            # 总站点地图索引（汇总所有子站 sitemap）
│   ├── common/                      # 全站共用：样式、JS、暗色模式组件
│   │   ├── style.css                #   响应式 + 深色/浅色 CSS 变量
│   │   └── app.js                   #   前端核心：按域名识别子站、加载数据、SEO Schema
│   ├── agent/                       # AI 智能体细分站点集群
│   │   ├── browser/                 #   browseragent.72tool.com 浏览器自动化 Agent
│   │   │   ├── index.html           #   通用首页（复制自根）
│   │   │   ├── config.json          #   该子站 TDK（标题/描述/关键词）
│   │   │   ├── data/list.json       #   该子站工具数据
│   │   │   └── sitemap.xml          #   自动生成的子站地图
│   │   ├── tiktok/                  #   tiktokagent.72tool.com 跨境短视频 Agent
│   │   └── localgpu/                #   gpuagent.72tool.com 本地离线显卡 Agent
│   ├── tools/                       # 轻量化在线单工具站点集群
│   │   ├── txtclean/                #   txtclean.72tool.com 古籍文本清洗工具
│   │   └── sitemapgen/              #   sitemapgen.72tool.com 站点地图生成工具
│   └── lang/                        # 海外小语种站点目录
│       ├── es/                      #   es.72tool.com 西语站
│       └── de/                      #   de.72tool.com 德语站
├── scripts/                         # 自动化脚本（GitHub Actions 定时运行）
│   ├── main-crawl.js                # 全链路爬虫 + 智谱 AI 分类 + SEO 文案生成
│   └── build-sitemap.js             # 批量生成每个子站独立 sitemap.xml + 总索引
├── .github/
│   └── workflows/
│       ├── crawl.yml                # 每日定时自动采集流水线（无更新不提交）
│       └── deploy.yml               # 代码提交自动构建并部署 CF Pages
├── package.json                     # node 依赖与脚本
└── README.md                        # 本文件
```

### 架构原理（务必理解，否则部署会困惑）

Cloudflare Pages **不支持在 `_redirects` 里做「按域名」路由**（它只能做路径级重写）。因此“百个子域名 = 百个独立站点”的真实做法是：

1. **同一个 Pages 项目**添加 **多个自定义域名**（browseragent.72tool.com、txtclean.72tool.com …）。所有域名共用同一份 `public/` 构建。
2. 访客打开 `browseragent.72tool.com` → 拿到根 `index.html` → `common/app.js` 读取 `window.location.hostname`，映射到 `/agent/browser`，加载该目录的 `config.json` + `data/list.json` 渲染。
3. 搜索引擎看到不同域名、不同 TDK、不同内容 → 视为独立站点，各自收录排名。
4. 新增站点 = 新建文件夹 + 在 `common/app.js` 的 `HOST_MAP` 追加一行 + 在 CF 控制台加一个自定义域名。**仅占用 1 个 Pages 项目额度。**

---

## 二、本地电脑测试运行步骤

> 无需真实域名即可预览：用 `?site=子目录` 强制指定站点。

### 1) 准备环境
- 安装 **Node.js ≥ 18**（建议 20）：https://nodejs.org
- 打开终端，进入项目目录：
```bash
cd toolnav
```

### 2) 安装依赖（仅 Playwright，用于采集；本地预览可不装）
```bash
npm install
# 如需本地跑真实采集，再装浏览器内核：
npx playwright install chromium
```

### 3) 启动本地静态服务器（任选其一）
```bash
# 方式 A：Node 自带（推荐，零依赖）
npx --yes serve public -l 8788

# 方式 B：Python
python -m http.server 8788 -d public
```
打开浏览器访问：
- 根站（默认兜底）：http://localhost:8788/
- 浏览器 Agent 站：http://localhost:8788/?site=agent/browser
- 文本清洗站：http://localhost:8788/?site=tools/txtclean
- 西语站：http://localhost:8788/?site=lang/es

> 直接访问 `http://localhost:8788/agent/browser/`（各子目录已放 index.html 副本）也能看到同样效果。

### 4) 测试 sitemap 生成
```bash
node scripts/build-sitemap.js
```
会为每个子站生成 `sitemap.xml`，并刷新根 `sitemap-index.xml`。检查输出日志是否列出 7 个子站。

### 5) 测试采集流水线（可选，需联网 + 智谱 Key）
```bash
# 无 Key 也能跑：自动降级为「关键词启发式分类」演示
node scripts/main-crawl.js

# 有 Key 时（AI 真实分类 + SEO 文案）：
set ZHIPU_API_KEY=你的智谱APIKey   # Windows
# export ZHIPU_API_KEY=你的智谱APIKey  # macOS/Linux
node scripts/main-crawl.js
```
观察 `public/**/data/list.json` 是否增量新增工具（按 URL 去重，不覆盖原有数据）。

---

## 三、GitHub 仓库上传 + 密钥配置教程

### 1) 新建仓库
- 登录 https://github.com（用 Outlook 邮箱注册的 GitHub 账号，避免 Google 关联）。
- 右上角 **New** → 仓库名 `toolnav` → **Public** → 不勾 Add README（本地已有）→ Create。

### 2) 本地推送到 GitHub
```bash
cd toolnav
git init
git add -A
git commit -m "init: 多子域名工具导航站群"
git branch -M main
git remote add origin https://github.com/你的用户名/toolnav.git
git push -u origin main
```

### 3) 配置密钥（Secrets）
进入仓库 **Settings → Secrets and variables → Actions → New repository secret**，添加：

| 名称 | 值 | 说明 |
|------|----|------|
| `ZHIPU_API_KEY` | 智谱开放平台 Key | https://open.bigmodel.cn 获取，用于 AI 分类 |
| `CF_API_TOKEN` | Cloudflare API Token | 见第四节，需 Pages 编辑权限 |
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID | CF 控制台右下角「Account ID」 |

> 密钥只存于 GitHub 加密 Secrets，脚本通过 `${{ secrets.XXX }}` 注入，不会泄露到代码。

---

## 四、Cloudflare Pages 从零创建 + 绑定所有子域名完整部署流程

### A. 注册 Cloudflare（Outlook 邮箱，禁止 Google 快捷登录）
1. 访问 https://dash.cloudflare.com/sign-up ，用 **Outlook/Hotmail 邮箱**注册（不要用“使用 Google 账号登录”，避免封号连锁风险）。
2. 添加你的主域名 `72tool.com`（按提示改 NS 到 Cloudflare）。

### B. 创建 Pages 项目并首次部署
1. **Workers & Pages → Create → Pages → Connect to Git**。
2. 授权 GitHub，选择 `toolnav` 仓库。
3. 构建配置：
   - **Framework preset**：`None`
   - **Build command**：`node scripts/build-sitemap.js`（生成 sitemap；纯静态可留空）
   - **Build output directory**：`public`  ← 关键，必须指向 public
4. 点 **Save and Deploy**。首次部署即生成 `xxx.pages.dev` 预览地址。

### C. 批量绑定子域名（核心：一个项目挂百个域名）
1. 进入项目 **Settings → Custom domains → Set up a domain**。
2. 逐个输入子域名并确认（Cloudflare 会自动在 `72tool.com` 的 Zone 里加 CNAME 记录）：
   - `browseragent.72tool.com`
   - `tiktokagent.72tool.com`
   - `gpuagent.72tool.com`
   - `txtclean.72tool.com`
   - `sitemapgen.72tool.com`
   - `es.72tool.com`
   - `de.72tool.com`
   - ……（其余 193 个同理，新增站点时在此追加）
3. 等待每个域名的 SSL 证书签发（通常 1–5 分钟，状态变 Active）。
4. 浏览器访问 `https://browseragent.72tool.com` → 自动加载 `/agent/browser` 数据，地址栏域名不变，搜索引擎识别为独立站。

> 所有子域名共享同一份构建；前端 `common/app.js` 按 `hostname` 区分内容。

### D. 域名 Zone 跨账号迁移（多账号站群拆分时用）
当单账号子域名接近上限，需把部分子域名迁到另一个 CF 账号：
1. 在**目标账号**的 Zone 里添加 `72tool.com`（或新建子 Zone）。
2. 在源账号对应域名 **DNS** 把该子域名的 CNAME 指向目标账号的 Pages 地址（`<项目>.pages.dev`）。
3. 在目标账号的 Pages 项目 **Custom domains** 里添加该子域名，Cloudflare 会校验并签发证书。
4. 验证 HTTPS 与内容正常后，删除源账号的该自定义域名。

### E. Cloudflare 免费套餐限额（务必记牢）
| 维度 | 限额 |
|------|------|
| 单 Pages 项目自定义域名数 | **100 个** |
| 单 Cloudflare 账号 Pages 项目数 | **100 个** |
| 单账号每月构建次数 | **500 次** |
| 免费版 Functions 请求 | 10 万次/天 |

**站群容量推算**：1 账号 = 100 项目 × 100 域名 = 最多 1 万个子站点；用 2–3 个 Outlook 账号即可承载 200+ 站点且远低于上限。
**省构建技巧**：采集流水线 `crawl.yml` 仅在「有新增内容」时才 `git push`，从而才触发 `deploy.yml` 构建 → 无更新不消耗构建次数。

---

## 五、无人值守更新机制

- `crawl.yml` 每日 **北京 02:00（UTC 18:00）** 自动运行：抓取 GitHub Trending / HF Spaces / ProductHunt / RSS → 智谱 AI 分类 + 生成 SEO 简介与长尾词 → 按 URL 去重增量写入对应子站 `data/list.json` → 重建所有 sitemap。
- 若有新增：自动 `git commit & push` → 触发 `deploy.yml` 部署到 CF Pages。
- 若无新增：跳过提交，不消耗构建次数。
- 违规内容（破解/翻墙/色情/赌博/黑客攻击等）在 `main-crawl.js` 的 `BLOCKLIST` 中直接丢弃，保障域名安全。

## 六、新增一个子站点的标准动作（3 步）
1. 在 `public/` 下新建目录（如 `agent/voice/`），放入 `config.json` + `data/list.json`，并复制一份 `index.html`。
2. 在 `public/common/app.js` 的 `HOST_MAP` 追加一行 `'voiceagent.72tool.com': '/agent/voice'`，在 `scripts/main-crawl.js` 的 `ROUTES` 追加对应路由（如需 AI 自动归类）。
3. 在 CF Pages 项目 **Custom domains** 添加 `voiceagent.72tool.com`，提交代码即可。

---
© 72tool · 一次构建，百站共生。
