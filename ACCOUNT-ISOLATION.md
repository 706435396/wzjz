# 账号风控隔离操作规范（多 CF 账号 / 多邮箱 / 登录禁忌）

> 目标：杜绝「一处封号、全网连锁」——所有外部服务使用独立身份，禁止互通登录与 Gmail 串联。
> 对应优化清单「六.1 / 六.3 / 二.3 多账号拆分」。

## 一、邮箱矩阵（全部 Outlook / ProtonMail，禁止 Gmail）

| 用途 | 推荐邮箱（示例） | 备注 |
|------|----------------|------|
| Cloudflare 账号 A（国内） | cf-a@outlook.com | 独立密码 + 2FA |
| Cloudflare 账号 B（海外） | cf-b@outlook.com | 与 A 完全隔离 |
| GitHub 仓库账号 | github@outlook.com | 仅用于代码托管 |
| 智谱 AI（内容生成） | ai@outlook.com | `ZHIPU_API_KEY` 存仓库 Secrets |
| 百度站长平台（收录推送） | baidu@outlook.com | `BAIDU_TOKEN` 存 Secrets |
| 广告联盟（国内 / 海外） | ad-cn@outlook.com / ad-global@protonmail.com | 国内百度联盟、海外独立联盟，**不绑同一实名** |
| 企业微信 / 飞书（运维告警） | ops@outlook.com | `WEBHOOK_URL` 存 Secrets |

**铁律**：① 不上 Gmail；② 每个邮箱独立密码 + 独立 2FA；③ 不在同一浏览器会话登录多个账号（用不同浏览器/隐身窗口或设备隔离）。

## 二、Cloudflare 双账号拆分

- **账号 A**：承载国内高流量中文站，根 Zone `72tool.com` 在此账号；
- **账号 B**：承载小语种/低流量海外站，独立 Zone（如 `72tool-es.com`），与 A 的 Zone 物理分离；
- **好处**：一个 Zone 触发 DMCA / 人工审核，不会污染另一个域名的解析与信誉；单账号流量突增不会连带触发全站审核。

## 三、GitHub 隔离

- 仓库账号与 CF 账号邮箱不同（防关联推断）；
- 不使用 GitHub 登录 Cloudflare（OAuth 关联会暴露同主体）；手动填 `CF_API_TOKEN`；
- 私有仓库放源码，公开仓库仅放构建产物（如需）。

## 四、AI 接口隔离

- 智谱 / 通义等仅用于内容生成，Key 存仓库 `Settings → Secrets`，**不写进前端、不进 git**；
- 多站点共用一个 Key 即可（内容生成不涉及账号关联风险），但额度不足时按账号分别充值，避免单 Key 封禁全线停更。

## 五、广告联盟隔离

- 国内站加载百度联盟 / 51.la（`config.ads.region=cn`）；海外小语种站加载独立海外联盟（`region=global`）；
- 国内 / 海外联盟**不绑定同一实名主体与同一收款账户**，降低「站群 + 同一收款」被判定违规的概率。

## 六、采集网络隔离

- GitHub Actions 云端爬虫：使用 GitHub 提供的 runner IP，与本地家庭 IP 分离；
- 本地测试爬虫：仅用家庭/服务器 IP，禁止用同一 IP 批量操作站长平台（推送收录用服务器端 API，非浏览器登录）；
- 多源轮换 UA、请求间隔动态调整（`main-crawl.js` 已含本地规则 + 限流退避），避免单一 IP 高频抓取被封。

## 七、登录禁忌清单（必读）

- ❌ 禁止用 Gmail 注册上述任何服务；
- ❌ 禁止同一浏览器同时登录多个 CF/GitHub 账号；
- ❌ 禁止把 `CF_API_TOKEN` / `ZHIPU_API_KEY` / `BAIDU_TOKEN` 写进代码或前端；
- ❌ 禁止把国内站与海外站绑在同一个 Cloudflare Zone；
- ❌ 禁止国内/海外广告联盟共用同一实名与收款；
- ❌ 禁止用本地家庭 IP 直接调用站长平台批量提交（用服务端 API + GitHub Actions 环境）。

## 八、定期审计

- 每月检查一次：账号邮箱是否仍独立、Key 是否泄露、Zone 是否异常、各账号构建/Function 额度余量；
- 异常账号立即轮换 Key，并下线可疑站点（`security-scan.js --offline-all`）。
