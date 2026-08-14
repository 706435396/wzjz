# 故障排查清单（构建失败 / 爬虫报错 / sitemap 不可访问 / 站点被拦截）

> 收录：绝大多数问题来自「域名未绑 / 构建未跑 / 函数未识别 / 被风控」。按现象自查。

## 一、Cloudflare Pages 构建失败

| 现象 | 原因 | 解决 |
|------|------|------|
| 部署步骤红，报 `pages deploy` 权限错误 | `CF_API_TOKEN` 缺 `Pages:Edit` 权限 | 在 CF → My Profile → API Tokens 重发带 Pages 编辑 + Account 读的令牌 |
| 部署尝试 1/3 失败，重试后成功 | 偶发网络/边缘抖动 | `deploy.yml` 已内置 3 次重试，无需处理 |
| 构建成功但页面空白 | `public/` 未包含 index.html 或被 `.gitignore` 误伤 | 确认 `public/index.html` 已提交；检查 `.gitignore` 是否忽略了 `public` |
| `compress-static.js` 报错 | 个别 HTML 注释语法特殊 | 脚本已做保守处理；可临时注释该行重跑 |

## 二、爬虫 / 采集报错

| 现象 | 原因 | 解决 |
|------|------|------|
| `main-crawl.js` 只抓到少量/0 条 | 数据源限流或 RSS 结构变化 | 看日志 `[GitHub Trending] 采集 N 条`；调大 `USE_PW=1` 用浏览器渲染；更换 RSS 源 |
| 智谱返回 401/403 | `ZHIPU_API_KEY` 失效或额度耗尽 | 更新 Secrets；`_llm.js` 会告警 `鉴权/额度失败` 并暂停，避免空耗 |
| 429 限流频繁 | 单账号 QPS 超 | `scripts/_llm.js` 已自动读 `Retry-After` 退避重试；仍频繁则降低 BATCH 或错峰 |
| `article-duplicate-check --rewrite` 改写少 | 相似度未超 65% | 正常；仅超阈值才改写，可下调 `THRESHOLD` 常量重试 |

## 三、sitemap / robots 不可访问

| 现象 | 原因 | 解决 |
|------|------|
| `域名/sitemap.xml` 返回 404 | 未生成该子站 sitemap 或域名未绑 | 跑 `node scripts/build-sitemap.js`；确认 `_redirects` 有 `# SITE 域名 目录` |
| `域名/sitemap.xml` 返回旧内容 | 浏览器/CDN 缓存 | 默认 `Cache-Control: max-age=3600`~7200；等过期或用 `?v=时间戳` 探测 |
| `域名/article/sitemap.xml` 404 | 该站 `article/list.json` 无文章 | 先跑采集生成资讯；无文章不生成资讯地图（符合预期） |
| `域名/robots.txt` 内容非本赛道 | Function 未匹配到域名 | 确认 `common/domain-map.json` 含该域名；`build-sitemap.js` 已生成 |
| 总索引 `sitemap-index.xml` 缺某站 | 该站被 `# SITE-DISABLED` | 恢复正常 `# SITE` 行并重跑 build-sitemap |

## 四、站点被搜索引擎 / Cloudflare 拦截

| 现象 | 原因 | 解决 |
|------|------|------|
| 整站被 CF 风控标记 | 模板高度一致 / 流量突增 | 开启 `config.theme` 差异化（create-site 已随机主题）；新站前 30 天缓慢引流量 |
| 站点被 DMCA / 投诉下架 | 收录违规内容 | 跑 `node scripts/security-scan.js --offline-all` 下线命中站点；定期 `security.yml` 周扫 |
| 百度不收录 | 未提交 sitemap / 内容重复 | `push-index-monthly.js` 推送；`article-duplicate-check` 降重；资讯模块提升原创度 |
| 谷歌不收录海外站 | 内容纯机翻质量低 | 用 `translate-lang.js` 后人工润色；避免整站机翻 |

## 五、域名 / DNS 问题

| 现象 | 原因 | 解决 |
|------|------|------|
| 自定义域名显示 CF 默认页 | CNAME 未指向 `项目.pages.dev` | Cloudflare Zone 加 CNAME 记录并开启代理 |
| 部分子域名能访问、部分 404 | 仅部分域名加到项目 | 用 `BULK-SITE-MANUAL.md` 的 wrangler 脚本批量补绑 |
| SSL 报错 | 证书未签发 | CF 自动签发，等待或重试；确认域名已代理（橙色云） |

## 六、本地预览不符预期

| 现象 | 原因 | 解决 |
|------|------|------|
| `?site=agent/browser` 显示默认内容 | 未传 site 或目录拼错 | 确认 `?site=` 值与子目录一致；真实域名下由 hostname 自动识别 |
| 置顶区块不显示 | 数据无 `top:true` | 在工具数据加 `"top":true,"topRank":1` |
| 广告位空白 | 未配置 `config.ads.slots` | 填入你的联盟 ID 即可渲染 |

## 七、一键恢复（灾备）

```bash
# merge.yml 每周打包 backups/YYYYMMDD.tar.gz 到仓库
node scripts/restore-backup.js --file backups/20260810.tar.gz
node scripts/build-sitemap.js
git add -A && git commit -m "restore" && git push
```
