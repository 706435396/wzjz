# 批量建站操作手册（扩容几十~200 个子站点）

> 配套脚本：`scripts/create-site.js` · `scripts/build-sitemap.js` · Cloudflare Pages 自定义域名
> 目标：在不改动任何前端代码的前提下，用脚手架把站点从 7 个扩到 200 个。

## 一、核心原理（为什么扩容零维护）

本项目「单 Pages 项目承载多子域名」靠三处联动，新增站点只需动这三处，前端/脚本**完全不用改**：

1. `public/_redirects` 的 `# SITE <域名> <目录>` 注册表 → `build-sitemap.js` 自动解析生成 `common/domain-map.json`；
2. 各 `functions/*.js` 读取 `domain-map.json` 自动匹配子目录 → 提供 `域名/sitemap.xml`、`域名/article/sitemap.xml`、`域名/image-sitemap.xml`；
3. 前端 `app.js` / `article.js` 按 `window.location.hostname` 加载对应子目录数据。

所以「扩容 200 站」= 建 200 个目录 + 在 `_redirects` 加 200 行 + CF 控制台加 200 个自定义域名。脚手架 `create-site.js` 把前两步自动化。

## 二、单站创建（手动验证用）

```bash
cd toolnav
# 域名 / 子目录 / 赛道 三件套
node scripts/create-site.js --domain txtclean.72tool.com --dir tools/txtclean --track txtclean --name "文本清洗导航"
# 脚本会自动：建目录 + 写 config.json（含差异化主题/广告/社群开关）+ 建空白 data/article + 复制页面 + 追加 _redirects 路由
node scripts/build-sitemap.js
```

## 三、批量创建（几十个站点）

把站点清单写成 `sites.txt`（每行：`域名,目录,赛道,站名`）：

```
browseragent.72tool.com,agent/browser,browser,Browser Agent 导航
tiktokagent.72tool.com,agent/tiktok,tiktok,TikTok Agent 导航
gpuagent.72tool.com,agent/localgpu,localgpu,本地显卡 Agent 导航
pdfagent.72tool.com,agent/pdf,pdf,PDF 工具导航
videoagent.72tool.com,agent/video,video,视频处理 Agent 导航
...（共 200 行）
```

批量执行脚本（可直接跑，或写成 `scripts/batch-create.js`）：

```bash
while IFS=',' read -r domain dir track name; do
  [ -z "$domain" ] && continue
  node scripts/create-site.js --domain "$domain" --dir "$dir" --track "$track" --name "$name"
done < sites.txt
node scripts/build-sitemap.js
git add -A && git commit -m "feat: 批量新增 N 个站点" && git push
```

> 赛道(track)目前内置：`browser/tiktok/localgpu/txtclean/sitemapgen/es/de`。
> 新增赛道只需在 `main-crawl.js` 的 `ROUTES` 与 `scripts/prompt-library.js` 的 `TRACK_ANGLE` 各加一项（不破坏已有逻辑）。

## 四、Cloudflare 批量绑定子域名

### 方式 A：控制台（少量）
Cloudflare Pages 项目 → Custom domains → 逐个 Add domain（200 个逐个点，费时但稳）。

### 方式 B：Wrangler API 批量（推荐，几十个效率翻倍）
```bash
# 安装 wrangler 并登录（用本项目的 CF 账号令牌）
export CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy
while IFS=',' read -r domain _ _; do
  [ -z "$domain" ] && continue
  npx --yes wrangler pages project domain add "$domain" --project-name=toolnav
done < <(cut -d',' -f1 sites.txt)
```
> 每个域名需在 Cloudflare 添加对应 Zone 并解析 CNAME 到 `toolnav.pages.dev`（见 ACCOUNT-ISOLATION.md 的 Zone 分离建议）。

## 五、多账号拆分（200 站跨 2 个 CF 账号）

按冷热拆分，避免单账号流量突增触发审核：

| 账号 | 承载 | 说明 |
|------|------|------|
| 账号 A（国内） | 中文高流量站 `*.72tool.com` | Zone `72tool.com` 放此账号 |
| 账号 B（海外） | 小语种/低流量站 `lang/*` | 独立 Zone，独立注册邮箱 |

拆分步骤：
1. 账号 B 新建同名 Pages 项目（或不同项目名），把 `public/` 同样部署；
2. `sites.txt` 按账号分成 `sites-a.txt` / `sites-b.txt`，分别批量绑域名；
3. 两个账号的 `CF_API_TOKEN` / `CF_ACCOUNT_ID` 分别用于各自的 deploy.yml（可用仓库环境变量矩阵或不同仓库）。

## 六、验证清单

```bash
# 1) 本地预览（无需真实域名）
npx --yes serve public -l 8799
# 打开 http://localhost:8799/?site=agent/pdf

# 2) 上线后验证（以 txtclean.72tool.com 为例）
curl -s -o /dev/null -w "%{http_code}\n" https://txtclean.72tool.com/          # 200
curl -s -o /dev/null -w "%{http_code}\n" https://txtclean.72tool.com/sitemap.xml   # 200（Function 转发）
curl -s -o /dev/null -w "%{http_code}\n" https://txtclean.72tool.com/article/sitemap.xml  # 200
curl -s -o /dev/null -w "%{http_code}\n" https://txtclean.72tool.com/robots.txt  # 200（差异化 robots）
```

## 七、回滚 / 下线

- 临时下线某站：`node scripts/security-scan.js --offline <域名>`（追加 `# SITE-DISABLED`，被 sitemap/Function 忽略）；
- 恢复：`public/_redirects` 把该行改回 `# SITE` 即可。
