# 子站栏目 + 工具清单 + 正文总览

_生成时间：2026-08-14T10:55（北京） · 数据源：各子站 `data/list.json` + `article/list.json`_  

## browseragent.72tool.com  ——  Browser Agent 导航

> 工具数 **13** · 资讯/长尾文数 **11**

### 一、栏目（category）
- 工具栏目：`通用浏览器 Agent`、`自动化框架`、`数据提取`、`浏览器自动化`
- 文章栏目：`部署教程`、`选型对比`、`避坑指南`、`浏览器自动化`

### 二、工具清单（13）

| # | 名称 | 栏目 | 标签 | 链接 | 简介 |
|---|---|---|---|---|---|
1 | Browser Use | 通用浏览器 Agent | Python/AI Agent/网页操作 | [https://github.com/browser-use/browser-use](https://github.com/browser-use/browser-use) | 开源的浏览器使用 AI 智能体，用自然语言驱动网页操作，支持表单填写、信息提取与多步任务编排。 |
2 | Playwright | 自动化框架 | 自动化/抓取/测试 | [https://playwright.dev](https://playwright.dev) | 微软出品的跨浏览器自动化框架，支持 Chromium/Firefox/WebKit，适合稳定可靠的网页抓取与端到端测试。 |
3 | Puppeteer | 自动化框架 | Node/爬虫/截图 | [https://pptr.dev](https://pptr.dev) | 基于 Chrome DevTools 协议的 Node 自动化库，轻量易用，常用于爬虫、截图与页面渲染监控。 |
4 | AgentQL | 数据提取 | 语义选择/数据提取 | [https://agentql.com](https://agentql.com) | 用类自然语言语义选择器定位页面元素，告别脆弱的 XPath，让数据提取更稳定。 |
5 | Skyvern | 通用浏览器 Agent | LLM/CV/工作流 | [https://github.com/Skyvern-AI/skyvern](https://github.com/Skyvern-AI/skyvern) | 结合 LLM 与计算机视觉的网页自动化智能体，能自适应页面结构变化完成复杂工作流。 |
6 | smicallef/spiderfoot | 浏览器自动化 |  | [https://github.com/smicallef/spiderfoot](https://github.com/smicallef/spiderfoot) | SpiderFoot automates OSINT for threat intelligence and mappi |
7 | Lightricks/LTX-2 | 浏览器自动化 |  | [https://github.com/Lightricks/LTX-2](https://github.com/Lightricks/LTX-2) | Official Python inference and LoRA trainer package for the L |
8 | megadose/holehe | 浏览器自动化 |  | [https://github.com/megadose/holehe](https://github.com/megadose/holehe) | holehe allows you to check if the mail is used on different  |
9 | msitarzewski/agency-agents | 浏览器自动化 |  | [https://github.com/msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) | A complete AI agency at your fingertips - From frontend wiza |
10 | huangruiteng/loopx | 浏览器自动化 |  | [https://github.com/huangruiteng/loopx](https://github.com/huangruiteng/loopx) | Lightweight loop engineering state kernel for long-running A |
11 | virgiliojr94/book-to-skill | 浏览器自动化 |  | [https://github.com/virgiliojr94/book-to-skill](https://github.com/virgiliojr94/book-to-skill) | Turn any technical book PDF into a Claude Code skill — ready |
12 | kepano/obsidian-skills | 浏览器自动化 |  | [https://github.com/kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | Agent skills for Obsidian. Teach your agent to use Obsidian  |
13 | vitali87/code-graph-rag | 浏览器自动化 |  | [https://github.com/vitali87/code-graph-rag](https://github.com/vitali87/code-graph-rag) | The ultimate RAG for your monorepo. Query, understand, and e |

### 三、正文（11 篇）

#### 1. Browser Use 本地部署教程：5 分钟跑通浏览器自动化 AI 智能体
- slug：`browser-use-deploy-tutorial` · 栏目：`部署教程` · 字数≈231
- 摘要：从环境安装到第一个自然语言任务，手把手教你本地部署 Browser Use，让 AI 自动操作网页完成表单填写与数据抓取。
- 正文：

<p>Browser Use 是目前最易上手的浏览器自动化 Agent，用自然语言即可驱动网页。本教程覆盖 Python 环境准备、API Key 配置与第一个多步任务。</p><h2>一、环境准备</h2><p>建议使用 Python 3.11+，新建虚拟环境后执行 <code>pip install browser-use</code>。</p><h2>二、跑通第一个任务</h2><p>用十余行代码让智能体打开搜索页、输入关键词并提取结果，适合刚接触自动化Agent的新手。</p><h2>三、常见问题</h2><p>遇到反爬时可切换为本地模型或加入人工确认步骤，详见本站相关工具。</p>

#### 2. Playwright 还是 Puppeteer？2026 浏览器自动化框架选型对比
- slug：`playwright-vs-puppeteer-2026` · 栏目：`选型对比` · 字数≈202
- 摘要：从多浏览器支持、稳定性、学习曲线到生态，全面对比 Playwright 与 Puppeteer，帮你按场景选对自动化框架。
- 正文：

<p>两者都是主流的浏览器自动化框架。Playwright 原生支持 Chromium/Firefox/WebKit，适合跨浏览器测试；Puppeteer 更轻量、与 Chrome 绑定更紧。</p><h2>核心差异</h2><p>多浏览器、自动等待、Trace 调试是 Playwright 的优势；Puppeteer 在上手速度与社区资料上更友好。</p><h2>怎么选</h2><p>需要稳定端到端测试选 Playwright；做轻量爬虫与截图选 Puppeteer。</p>

#### 3. 浏览器 Agent 遇到验证码怎么办？5 个合规避坑技巧
- slug：`browser-agent-captcha-avoid` · 栏目：`避坑指南` · 字数≈130
- 摘要：分享浏览器自动化 Agent 在登录、下单场景遇到验证码时的稳妥处理方案，守住合规底线、降低封号风险。
- 正文：

<p>验证码是自动化 Agent 最常见的拦路虎。本文列举人工确认、语义选择器降脆弱度等合规做法。</p><h2>一、优先人工确认</h2><p>对涉及账号安全的步骤加入人工确认，避免触发风控。</p><h2>二、用语义选择器降低脆弱度</h2><p>使用 AgentQL 这类语义定位方案，减少 XPath 脆弱导致的重复尝试。</p>

#### 4. 如何使用 Browser Use 进行批量处理？
- slug：`如何使用-browser-use-进行批量处理` · 栏目：`浏览器自动化` · 字数≈90
- 摘要：Browser Use 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次
- 正文：

<p>Browser Use 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次性处理大量数据导致等待过久。</p><p>相关工具：<a href="https://github.com/browser-use/browser-use">Browser Use</a></p>

#### 5. Playwright 支持哪些文件格式？
- slug：`playwright-支持哪些文件格式` · 栏目：`浏览器自动化` · 字数≈81
- 摘要：具体支持的格式以 Playwright 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要求，避
- 正文：

<p>具体支持的格式以 Playwright 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要求，避免解析失败。</p><p>相关工具：<a href="https://playwright.dev">Playwright</a></p>

#### 6. Puppeteer 免费版有哪些限制？
- slug：`puppeteer-免费版有哪些限制` · 栏目：`浏览器自动化` · 字数≈69
- 摘要：Puppeteer 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。
- 正文：

<p>Puppeteer 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。</p><p>相关工具：<a href="https://pptr.dev">Puppeteer</a></p>

#### 7. 如何在 AgentQL 中导出结果？
- slug：`如何在-agentql-中导出结果` · 栏目：`浏览器自动化` · 字数≈126
- 摘要：处理完成后，AgentQL 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若
- 正文：

<p>处理完成后，AgentQL 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://agentql.com">AgentQL</a></p>

#### 8. 如何使用 Skyvern 进行批量处理？
- slug：`如何使用-skyvern-进行批量处理` · 栏目：`浏览器自动化` · 字数≈138
- 摘要：用 Skyvern 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能一次性提交。
- 正文：

<p>用 Skyvern 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能一次性提交。处理前用 2–3 条样本验证输出格式与速度，确认无误再扩展到全量，避免大批量出错后难以回滚；若支持并发，可逐步上调并发数观察稳定性。</p><p>相关工具：<a href="https://github.com/Skyvern-AI/skyvern">Skyvern</a></p>

#### 9. smicallef/spiderfoot 支持哪些文件格式？
- slug：`smicallef-spiderfoot-支持哪些文件格式` · 栏目：`浏览器自动化` · 字数≈157
- 摘要：smicallef/spiderfoot 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、
- 正文：

<p>smicallef/spiderfoot 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Markdown 及主流图片/表格格式。上传前请确认编码为 UTF-8、单文件不超过站点限制，避免解析失败；批量场景建议统一格式后再一次性导入。</p><p>相关工具：<a href="https://github.com/smicallef/spiderfoot">smicallef/spiderfoot</a></p>

#### 10. Lightricks/LTX-2 免费版有哪些限制？
- slug：`lightricks-ltx-2-免费版有哪些限制` · 栏目：`浏览器自动化` · 字数≈131
- 摘要：Lightricks/LTX-2 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、
- 正文：

<p>Lightricks/LTX-2 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、并发数或导出格式。使用前在官网「定价」页核对当前套餐明细，按实际体量选择，避免生产环境触达上限中断。</p><p>相关工具：<a href="https://github.com/Lightricks/LTX-2">Lightricks/LTX-2</a></p>

#### 11. 如何在 megadose/holehe 中导出结果？
- slug：`如何在-megadose-holehe-中导出结果` · 栏目：`浏览器自动化` · 字数≈142
- 摘要：处理完成后，megadose/holehe 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或
- 正文：

<p>处理完成后，megadose/holehe 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/megadose/holehe">megadose/holehe</a></p>

---

## tiktokagent.72tool.com  ——  TikTok Agent 导航

> 工具数 **13** · 资讯/长尾文数 **10**

### 一、栏目（category）
- 工具栏目：`视频剪辑`、`AI 剪辑`、`数据分析`、`内容生成`、`账号运营`、`跨境短视频`
- 文章栏目：`部署教程`、`避坑指南`、`跨境短视频`

### 二、工具清单（13）

| # | 名称 | 栏目 | 标签 | 链接 | 简介 |
|---|---|---|---|---|---|
1 | CapCut 跨境版 | 视频剪辑 | 剪辑/字幕/模板 | [https://www.capcut.com](https://www.capcut.com) | 字节旗下剪辑工具，内置多语言字幕、智能抠像与爆款模板，适合批量产出 TikTok 短视频。 |
2 | Opus Clip | AI 剪辑 | 长转短/AI/竖屏 | [https://www.opus.pro](https://www.opus.pro) | AI 长转短工具，自动识别高光片段并生成竖屏短视频，支持多语种标题与标签。 |
3 | Exolyt | 数据分析 | 数据分析/选品/趋势 | [https://exolyt.com](https://exolyt.com) | TikTok 数据分析与爆款挖掘平台，追踪热门话题、音乐与创作者，辅助内容选题。 |
4 | Predis.ai | 内容生成 | 脚本/文案/生成 | [https://predis.ai](https://predis.ai) | 输入产品描述即可生成带字幕的短视频与帖子文案，覆盖 TikTok/Reels/Shorts 多平台。 |
5 | Combo Creator | 账号运营 | 矩阵/定时发布/开源 | [https://github.com/](https://github.com/) | 开源的 TikTok 账号矩阵运营脚本，支持多账号定时发布与素材池管理（示例条目）。 |
6 | holaboss-ai/holaOS | 跨境短视频 |  | [https://github.com/holaboss-ai/holaOS](https://github.com/holaboss-ai/holaOS) | Open-source All in One AI agent workspace. Run any agent — C |
7 | cathrynlavery/diagram-design | 跨境短视频 |  | [https://github.com/cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) | 29 editorial diagram types for Claude Code. Self-contained H |
8 | smicallef/spiderfoot | 跨境短视频 |  | [https://github.com/smicallef/spiderfoot](https://github.com/smicallef/spiderfoot) | SpiderFoot automates OSINT for threat intelligence and mappi |
9 | Lightricks/LTX-2 | 跨境短视频 |  | [https://github.com/Lightricks/LTX-2](https://github.com/Lightricks/LTX-2) | Official Python inference and LoRA trainer package for the L |
10 | addyosmani/agent-skills | 跨境短视频 |  | [https://github.com/addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | Production-grade engineering skills for AI coding agents. |
11 | anthropics/skills | 跨境短视频 |  | [https://github.com/anthropics/skills](https://github.com/anthropics/skills) | Public repository for Agent Skills |
12 | 3b1b/manim | 跨境短视频 |  | [https://github.com/3b1b/manim](https://github.com/3b1b/manim) | Animation engine for explanatory math videos |
13 | huangruiteng/loopx | 跨境短视频 |  | [https://github.com/huangruiteng/loopx](https://github.com/huangruiteng/loopx) | Lightweight loop engineering state kernel for long-running A |

### 三、正文（10 篇）

#### 1. 跨境短视频批量剪辑工作流：CapCut + Opus Clip 一天产出 50 条
- slug：`tiktok-batch-clip-workflow` · 栏目：`部署教程` · 字数≈128
- 摘要：用 CapCut 跨境版模板与 Opus Clip 长转短，搭建可复制的 TikTok 批量短视频生产线，适合矩阵运营。
- 正文：

<p>跨境短视频矩阵的核心是「模板化 + 批量」。本工作流用 CapCut 的爆款模板统一画风，再用 Opus Clip 把长素材切高光。</p><h2>一、素材标准化</h2><p>统一分辨率与字幕语言，避免逐条调整。</p><h2>二、长转短自动化</h2><p>Opus Clip 自动识别高光并生成竖屏，省去人工剪辑。</p>

#### 2. TikTok 跨境内容合规避坑：音乐、带货与文案红线
- slug：`tiktok-cross-border-compliance` · 栏目：`避坑指南` · 字数≈82
- 摘要：梳理跨境短视频常见的音乐版权、带货资质与文案合规红线，用 Predis.ai 与矩阵脚本守住底线。
- 正文：

<p>跨境内容最易踩的是音乐版权与带货资质。本文给出可落地的合规清单。</p><h2>一、音乐版权</h2><p>优先使用平台曲库与商用授权音乐。</p><h2>二、带货资质</h2><p>不同地区对带货有不同要求，提前准备资质文件。</p>

#### 3. 如何使用 CapCut 跨境版 进行批量处理？
- slug：`如何使用-capcut-跨境版-进行批量处理` · 栏目：`跨境短视频` · 字数≈88
- 摘要：CapCut 跨境版 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次性
- 正文：

<p>CapCut 跨境版 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次性处理大量数据导致等待过久。</p><p>相关工具：<a href="https://www.capcut.com">CapCut 跨境版</a></p>

#### 4. Opus Clip 支持哪些文件格式？
- slug：`opus-clip-支持哪些文件格式` · 栏目：`跨境短视频` · 字数≈79
- 摘要：具体支持的格式以 Opus Clip 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要求，避免
- 正文：

<p>具体支持的格式以 Opus Clip 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要求，避免解析失败。</p><p>相关工具：<a href="https://www.opus.pro">Opus Clip</a></p>

#### 5. Exolyt 免费版有哪些限制？
- slug：`exolyt-免费版有哪些限制` · 栏目：`跨境短视频` · 字数≈63
- 摘要：Exolyt 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。
- 正文：

<p>Exolyt 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。</p><p>相关工具：<a href="https://exolyt.com">Exolyt</a></p>

#### 6. 如何在 Predis.ai 中导出结果？
- slug：`如何在-predis-ai-中导出结果` · 栏目：`跨境短视频` · 字数≈130
- 摘要：处理完成后，Predis.ai 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式
- 正文：

<p>处理完成后，Predis.ai 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://predis.ai">Predis.ai</a></p>

#### 7. 如何使用 Combo Creator 进行批量处理？
- slug：`如何使用-combo-creator-进行批量处理` · 栏目：`跨境短视频` · 字数≈150
- 摘要：用 Combo Creator 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能
- 正文：

<p>用 Combo Creator 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能一次性提交。处理前用 2–3 条样本验证输出格式与速度，确认无误再扩展到全量，避免大批量出错后难以回滚；若支持并发，可逐步上调并发数观察稳定性。</p><p>相关工具：<a href="https://github.com/">Combo Creator</a></p>

#### 8. holaboss-ai/holaOS 支持哪些文件格式？
- slug：`holaboss-ai-holaos-支持哪些文件格式` · 栏目：`跨境短视频` · 字数≈153
- 摘要：holaboss-ai/holaOS 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Ma
- 正文：

<p>holaboss-ai/holaOS 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Markdown 及主流图片/表格格式。上传前请确认编码为 UTF-8、单文件不超过站点限制，避免解析失败；批量场景建议统一格式后再一次性导入。</p><p>相关工具：<a href="https://github.com/holaboss-ai/holaOS">holaboss-ai/holaOS</a></p>

#### 9. cathrynlavery/diagram-design 免费版有哪些限制？
- slug：`cathrynlavery-diagram-design-免费版有哪些限制` · 栏目：`跨境短视频` · 字数≈155
- 摘要：cathrynlavery/diagram-design 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制
- 正文：

<p>cathrynlavery/diagram-design 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、并发数或导出格式。使用前在官网「定价」页核对当前套餐明细，按实际体量选择，避免生产环境触达上限中断。</p><p>相关工具：<a href="https://github.com/cathrynlavery/diagram-design">cathrynlavery/diagram-design</a></p>

#### 10. 如何在 smicallef/spiderfoot 中导出结果？
- slug：`如何在-smicallef-spiderfoot-中导出结果` · 栏目：`跨境短视频` · 字数≈152
- 摘要：处理完成后，smicallef/spiderfoot 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、J
- 正文：

<p>处理完成后，smicallef/spiderfoot 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/smicallef/spiderfoot">smicallef/spiderfoot</a></p>

---

## gpuagent.72tool.com  ——  GPU Agent 导航

> 工具数 **13** · 资讯/长尾文数 **12**

### 一、栏目（category）
- 工具栏目：`本地大模型`、`图像生成`、`私有知识库`、`本地显卡`
- 文章栏目：`部署教程`、`选型对比`、`本地显卡`

### 二、工具清单（13）

| # | 名称 | 栏目 | 标签 | 链接 | 简介 |
|---|---|---|---|---|---|
1 | Ollama | 本地大模型 | 本地大模型/离线/GPU | [https://ollama.com](https://ollama.com) | 一行命令在本地跑大模型（Llama、Qwen、Gemma 等），支持 GPU 加速，数据完全离线。 |
2 | Stable Diffusion WebUI | 图像生成 | 出图/SD/插件 | [https://github.com/AUTOMATIC1111/stable-diffusion-webui](https://github.com/AUTOMATIC1111/stable-diffusion-webui) | 最流行的本地出图界面，支持插件生态与显卡优化，免费生成 AI 图像。 |
3 | LM Studio | 本地大模型 | GUI/推理/兼容API | [https://lmstudio.ai](https://lmstudio.ai) | 图形化本地推理客户端，免命令行加载 GGUF 模型，内置聊天与 OpenAI 兼容接口。 |
4 | PrivateGPT | 私有知识库 | 知识库/向量库/私有 | [https://github.com/Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm) | 基于本地向量库的私有知识库问答，文档不出本机，适合企业内网部署。 |
5 | unslothai/unsloth | 本地显卡 | localgpu | [https://github.com/unslothai/unsloth](https://github.com/unslothai/unsloth) | 精选 unslothai/unsloth：Local UI to run and train LLMs and d，适用 |
6 | NVIDIA-NeMo/Switchyard | 本地显卡 | localgpu | [https://github.com/NVIDIA-NeMo/Switchyard](https://github.com/NVIDIA-NeMo/Switchyard) | 精选 NVIDIA-NeMo/Switchyard：Switchyard lets LLM applications r |
7 | lightningpixel/modly | 本地显卡 | localgpu | [https://github.com/lightningpixel/modly](https://github.com/lightningpixel/modly) | 精选 lightningpixel/modly：Desktop app to generate 3D models fr |
8 | altic-dev/FluidVoice | 本地显卡 |  | [https://github.com/altic-dev/FluidVoice](https://github.com/altic-dev/FluidVoice) | Fastest and only macOS Dictation app with on-device STT and  |
9 | TencentCloud/TencentDB-Agent-Memory | 本地显卡 | localgpu | [https://github.com/TencentCloud/TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) | 精选 TencentCloud/TencentDB-Agent-Memory：TencentDB Agent Memor |
10 | Comfy-Org/ComfyUI | 本地显卡 | localgpu | [https://github.com/Comfy-Org/ComfyUI](https://github.com/Comfy-Org/ComfyUI) | 精选 Comfy-Org/ComfyUI：The most powerful and modular diffus，适用 |
11 | cactus-compute/needle | 本地显卡 |  | [https://github.com/cactus-compute/needle](https://github.com/cactus-compute/needle) | 14MB foundation model for tiny devices; phones, wearables, s |
12 | msitarzewski/agency-agents | 本地显卡 |  | [https://github.com/msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) | A complete AI agency at your fingertips - From frontend wiza |
13 | addyosmani/agent-skills | 本地显卡 |  | [https://github.com/addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | Production-grade engineering skills for AI coding agents. |

### 三、正文（12 篇）

#### 1. 8G 显存本地 AI Agent 怎么部署？Ollama + 工具链实操
- slug：`8g-vram-local-ai-agent-deploy` · 栏目：`部署教程` · 字数≈131
- 摘要：手把手教你用 Ollama 在 8G 显卡跑通本地 AI 智能体，附显存占用、量化参数与提速技巧。
- 正文：

<p>8G 显存也能跑本地 Agent。关键是用量化模型 + 轻量推理客户端，数据完全离线。</p><h2>一、模型量化</h2><p>选择 4-bit 量化的 7B/8B 模型，显存占用可压到 6G 以内。</p><h2>二、推理客户端</h2><p>LM Studio 提供图形界面与 OpenAI 兼容接口，免命令行即可调用。</p>

#### 2. ComfyUI 还是 SD WebUI？本地出图界面选型对比
- slug：`comfyui-vs-webui-choose` · 栏目：`选型对比` · 字数≈85
- 摘要：从节点编排、插件生态与上手门槛对比 ComfyUI 与 Stable Diffusion WebUI，帮你选对本地出图方案。
- 正文：

<p>本地出图两大主流界面各有侧重。WebUI 上手快、插件多；ComfyUI 靠节点编排适合复杂工作流。</p><h2>核心差异</h2><p>需要可复用流水线选 ComfyUI；想快速出图选 WebUI。</p>

#### 3. 如何使用 Ollama 进行批量处理？
- slug：`如何使用-ollama-进行批量处理` · 栏目：`本地显卡` · 字数≈80
- 摘要：Ollama 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次性处理大量
- 正文：

<p>Ollama 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次性处理大量数据导致等待过久。</p><p>相关工具：<a href="https://ollama.com">Ollama</a></p>

#### 4. TencentDB-Agent-Memory
- slug：`tencentdb-agent-memory` · 栏目：`本地显卡` · 字数≈200
- 摘要：TencentDB Agent Memory is a team-level memory hub for AI Agents — turning conversations, docs, and code into four reusable memory assets (Chat Memory, Skill, LLM-Wiki, Code-Graph) that are governed, s
- 正文：

<p>TencentDB Agent Memory is a team-level memory hub for AI Agents — turning conversations, docs, and code into four reusable memory assets (Chat Memory, Skill, LLM-Wiki, Code-Graph) that are governed, s</p>

#### 5. ComfyUI
- slug：`comfyui` · 栏目：`本地显卡` · 字数≈96
- 摘要：The most powerful and modular diffusion model GUI, api and backend with a graph/nodes interface.
- 正文：

<p>The most powerful and modular diffusion model GUI, api and backend with a graph/nodes interface.</p>

#### 6. Stable Diffusion WebUI 支持哪些文件格式？
- slug：`stable-diffusion-webui-支持哪些文件格式` · 栏目：`本地显卡` · 字数≈105
- 摘要：具体支持的格式以 Stable Diffusion WebUI 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传
- 正文：

<p>具体支持的格式以 Stable Diffusion WebUI 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要求，避免解析失败。</p><p>相关工具：<a href="https://github.com/AUTOMATIC1111/stable-diffusion-webui">Stable Diffusion WebUI</a></p>

#### 7. LM Studio 免费版有哪些限制？
- slug：`lm-studio-免费版有哪些限制` · 栏目：`本地显卡` · 字数≈69
- 摘要：LM Studio 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。
- 正文：

<p>LM Studio 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。</p><p>相关工具：<a href="https://lmstudio.ai">LM Studio</a></p>

#### 8. 如何在 PrivateGPT 中导出结果？
- slug：`如何在-privategpt-中导出结果` · 栏目：`本地显卡` · 字数≈132
- 摘要：处理完成后，PrivateGPT 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格
- 正文：

<p>处理完成后，PrivateGPT 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/Mintplex-Labs/anything-llm">PrivateGPT</a></p>

#### 9. 如何使用 unslothai/unsloth 进行批量处理？
- slug：`如何使用-unslothai-unsloth-进行批量处理` · 栏目：`本地显卡` · 字数≈158
- 摘要：用 unslothai/unsloth 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或
- 正文：

<p>用 unslothai/unsloth 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能一次性提交。处理前用 2–3 条样本验证输出格式与速度，确认无误再扩展到全量，避免大批量出错后难以回滚；若支持并发，可逐步上调并发数观察稳定性。</p><p>相关工具：<a href="https://github.com/unslothai/unsloth">unslothai/unsloth</a></p>

#### 10. NVIDIA-NeMo/Switchyard 支持哪些文件格式？
- slug：`nvidia-nemo-switchyard-支持哪些文件格式` · 栏目：`本地显卡` · 字数≈161
- 摘要：NVIDIA-NeMo/Switchyard 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSO
- 正文：

<p>NVIDIA-NeMo/Switchyard 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Markdown 及主流图片/表格格式。上传前请确认编码为 UTF-8、单文件不超过站点限制，避免解析失败；批量场景建议统一格式后再一次性导入。</p><p>相关工具：<a href="https://github.com/NVIDIA-NeMo/Switchyard">NVIDIA-NeMo/Switchyard</a></p>

#### 11. lightningpixel/modly 免费版有哪些限制？
- slug：`lightningpixel-modly-免费版有哪些限制` · 栏目：`本地显卡` · 字数≈139
- 摘要：lightningpixel/modly 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文
- 正文：

<p>lightningpixel/modly 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、并发数或导出格式。使用前在官网「定价」页核对当前套餐明细，按实际体量选择，避免生产环境触达上限中断。</p><p>相关工具：<a href="https://github.com/lightningpixel/modly">lightningpixel/modly</a></p>

#### 12. 如何在 altic-dev/FluidVoice 中导出结果？
- slug：`如何在-altic-dev-fluidvoice-中导出结果` · 栏目：`本地显卡` · 字数≈152
- 摘要：处理完成后，altic-dev/FluidVoice 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、J
- 正文：

<p>处理完成后，altic-dev/FluidVoice 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/altic-dev/FluidVoice">altic-dev/FluidVoice</a></p>

---

## txtclean.72tool.com  ——  TxtClean 文本清洗

> 工具数 **13** · 资讯/长尾文数 **13**

### 一、栏目（category）
- 工具栏目：`文本清洗`、`繁简转换`、`自动标点`
- 文章栏目：`部署教程`、`选型对比`、`文本清洗`

### 二、工具清单（13）

| # | 名称 | 栏目 | 标签 | 链接 | 简介 |
|---|---|---|---|---|---|
1 | TxtClean 古籍清洗 | 文本清洗 | 古籍/清洗/标点 | [https://txtclean.72tool.com](https://txtclean.72tool.com) | 本站核心工具：粘贴 OCR 识别后的古籍文本，一键去除乱码、多余空格与空行，并自动断句标点。 |
2 | OpenCC 开源繁简转换 | 繁简转换 | 繁简/转换/开源 | [https://github.com/BYVoid/OpenCC](https://github.com/BYVoid/OpenCC) | 高质量的中文繁简/港澳繁体互转库，命令行与 API 双形态，适合批量文献转换。 |
3 | Punctuator 自动标点 | 自动标点 | 标点/模型/NLP | [https://github.com/ottokart/punctuator2](https://github.com/ottokart/punctuator2) | 基于神经网络的自动标点恢复模型，对无标点转录文本补全省略号、逗号与句号。 |
4 | 在线去重空行工具 | 文本清洗 | 去空行/去重/整理 | [https://txtclean.72tool.com](https://txtclean.72tool.com) | 合并连续空行、去除首尾空白、按行去重，专为整理扫描文献的脏文本设计（示例条目）。 |
5 | semantica-agi/semantica | 文本清洗 | txtclean | [https://github.com/semantica-agi/semantica](https://github.com/semantica-agi/semantica) | 精选 semantica-agi/semantica：Graph-Native Infrastructure for C |
6 | infiniflow/ragflow | 文本清洗 | txtclean | [https://github.com/infiniflow/ragflow](https://github.com/infiniflow/ragflow) | 精选 infiniflow/ragflow：RAGFlow is a leading open-source Ret，适 |
7 | firecrawl/pdf-inspector | 文本清洗 | txtclean | [https://github.com/firecrawl/pdf-inspector](https://github.com/firecrawl/pdf-inspector) | 精选 firecrawl/pdf-inspector：Fast Rust library for PDF inspect |
8 | TapXWorld/ChinaTextbook | 文本清洗 | txtclean | [https://github.com/TapXWorld/ChinaTextbook](https://github.com/TapXWorld/ChinaTextbook) | 精选 TapXWorld/ChinaTextbook：所有小初高、大学PDF教材。，适用于文本清洗场景，开箱即用。 |
9 | PrimeIntellect-ai/prime-agent | 文本清洗 |  | [https://github.com/PrimeIntellect-ai/prime-agent](https://github.com/PrimeIntellect-ai/prime-agent) | A self-improving RLM agent for coding workflows and long-run |
10 | drawdb-io/drawdb | 文本清洗 |  | [https://github.com/drawdb-io/drawdb](https://github.com/drawdb-io/drawdb) | Free, simple, and intuitive online database diagram editor a |
11 | macro-inc/macro | 文本清洗 |  | [https://github.com/macro-inc/macro](https://github.com/macro-inc/macro) | Macro is a unified workspace for teams: email, chat, docs, t |
12 | Lightricks/LTX-2 | 文本清洗 |  | [https://github.com/Lightricks/LTX-2](https://github.com/Lightricks/LTX-2) | Official Python inference and LoRA trainer package for the L |
13 | LadybirdBrowser/ladybird | 文本清洗 |  | [https://github.com/LadybirdBrowser/ladybird](https://github.com/LadybirdBrowser/ladybird) | Truly independent web browser |

### 三、正文（13 篇）

#### 1. OCR 古籍文本清洗全流程：从乱码到规范标点
- slug：`ocr-ancient-text-clean-pipeline` · 栏目：`部署教程` · 字数≈100
- 摘要：用 TxtClean 与 OpenCC 搭建古籍 OCR 后处理流水线，去除乱码空行、繁简统一并自动断句标点。
- 正文：

<p>古籍经 OCR 后常带乱码与断行错误。本流水线分三步处理：先去乱码空行，再繁简统一，最后自动标点。</p><h2>一、去噪</h2><p>用本站清洗工具合并空行、去除首尾空白。</p><h2>二、繁简统一</h2><p>OpenCC 把港澳繁体转为简体，统一语料。</p>

#### 2. 自动标点工具怎么选？Punctuator 与规则方案对比
- slug：`auto-punctuation-compare` · 栏目：`选型对比` · 字数≈69
- 摘要：对比神经网络自动标点与正则规则方案在转录文本上的效果与成本，给出古籍整理选型建议。
- 正文：

<p>无标点转录文本补标点有两种路线：神经网络模型更准但需算力；规则方案快但灵活性低。</p><h2>选型建议</h2><p>大批量古籍选神经网络模型；少量现代文本用规则即可。</p>

#### 3. 如何使用 TxtClean 古籍清洗 进行批量处理？
- slug：`如何使用-txtclean-古籍清洗-进行批量处理` · 栏目：`文本清洗` · 字数≈94
- 摘要：TxtClean 古籍清洗 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免
- 正文：

<p>TxtClean 古籍清洗 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次性处理大量数据导致等待过久。</p><p>相关工具：<a href="https://txtclean.72tool.com">TxtClean 古籍清洗</a></p>

#### 4. semantica
- slug：`semantica` · 栏目：`文本清洗` · 字数≈66
- 摘要：Graph-Native Infrastructure for Context and Accountable AI Systems
- 正文：

<p>Graph-Native Infrastructure for Context and Accountable AI Systems</p>

#### 5. pdf-inspector
- slug：`pdf-inspector` · 栏目：`文本清洗` · 字数≈158
- 摘要：Fast Rust library for PDF inspection, classification, and text extraction. Intelligently detects scanned vs text-based PDFs to enable smart routing decisions.
- 正文：

<p>Fast Rust library for PDF inspection, classification, and text extraction. Intelligently detects scanned vs text-based PDFs to enable smart routing decisions.</p>

#### 6. ChinaTextbook
- slug：`chinatextbook` · 栏目：`文本清洗` · 字数≈14
- 摘要：所有小初高、大学PDF教材。
- 正文：

<p>所有小初高、大学PDF教材。</p>

#### 7. OpenCC 开源繁简转换 支持哪些文件格式？
- slug：`opencc-开源繁简转换-支持哪些文件格式` · 栏目：`文本清洗` · 字数≈87
- 摘要：具体支持的格式以 OpenCC 开源繁简转换 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要
- 正文：

<p>具体支持的格式以 OpenCC 开源繁简转换 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要求，避免解析失败。</p><p>相关工具：<a href="https://github.com/BYVoid/OpenCC">OpenCC 开源繁简转换</a></p>

#### 8. Punctuator 自动标点 免费版有哪些限制？
- slug：`punctuator-自动标点-免费版有哪些限制` · 栏目：`文本清洗` · 字数≈81
- 摘要：Punctuator 自动标点 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择
- 正文：

<p>Punctuator 自动标点 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。</p><p>相关工具：<a href="https://github.com/ottokart/punctuator2">Punctuator 自动标点</a></p>

#### 9. 如何在 在线去重空行工具 中导出结果？
- slug：`如何在-在线去重空行工具-中导出结果` · 栏目：`文本清洗` · 字数≈128
- 摘要：处理完成后，在线去重空行工具 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。
- 正文：

<p>处理完成后，在线去重空行工具 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://txtclean.72tool.com">在线去重空行工具</a></p>

#### 10. 如何使用 semantica-agi/semantica 进行批量处理？
- slug：`如何使用-semantica-agi-semantica-进行批量处理` · 栏目：`文本清洗` · 字数≈170
- 摘要：用 semantica-agi/semantica 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过
- 正文：

<p>用 semantica-agi/semantica 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能一次性提交。处理前用 2–3 条样本验证输出格式与速度，确认无误再扩展到全量，避免大批量出错后难以回滚；若支持并发，可逐步上调并发数观察稳定性。</p><p>相关工具：<a href="https://github.com/semantica-agi/semantica">semantica-agi/semantica</a></p>

#### 11. infiniflow/ragflow 支持哪些文件格式？
- slug：`infiniflow-ragflow-支持哪些文件格式` · 栏目：`文本清洗` · 字数≈153
- 摘要：infiniflow/ragflow 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Ma
- 正文：

<p>infiniflow/ragflow 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Markdown 及主流图片/表格格式。上传前请确认编码为 UTF-8、单文件不超过站点限制，避免解析失败；批量场景建议统一格式后再一次性导入。</p><p>相关工具：<a href="https://github.com/infiniflow/ragflow">infiniflow/ragflow</a></p>

#### 12. firecrawl/pdf-inspector 免费版有哪些限制？
- slug：`firecrawl-pdf-inspector-免费版有哪些限制` · 栏目：`文本清洗` · 字数≈145
- 摘要：firecrawl/pdf-inspector 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数
- 正文：

<p>firecrawl/pdf-inspector 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、并发数或导出格式。使用前在官网「定价」页核对当前套餐明细，按实际体量选择，避免生产环境触达上限中断。</p><p>相关工具：<a href="https://github.com/firecrawl/pdf-inspector">firecrawl/pdf-inspector</a></p>

#### 13. 如何在 TapXWorld/ChinaTextbook 中导出结果？
- slug：`如何在-tapxworld-chinatextbook-中导出结果` · 栏目：`文本清洗` · 字数≈158
- 摘要：处理完成后，TapXWorld/ChinaTextbook 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CS
- 正文：

<p>处理完成后，TapXWorld/ChinaTextbook 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/TapXWorld/ChinaTextbook">TapXWorld/ChinaTextbook</a></p>

---

## sitemapgen.72tool.com  ——  SitemapGen 站点地图

> 工具数 **13** · 资讯/长尾文数 **9**

### 一、栏目（category）
- 工具栏目：`站点地图`、`开发库`、`提交平台`、`SEO工具`
- 文章栏目：`使用技巧`、`SEO工具`

### 二、工具清单（13）

| # | 名称 | 栏目 | 标签 | 链接 | 简介 |
|---|---|---|---|---|---|
1 | SitemapGen 在线生成 | 站点地图 | sitemap/生成/SEO | [https://sitemapgen.72tool.com](https://sitemapgen.72tool.com) | 本站核心工具：输入根网址自动爬取整站，生成标准 sitemap.xml，支持分页与多子站索引聚合。 |
2 | Screaming Frog SEO Spider | 站点地图 | 爬取/SEO/桌面 | [https://www.screamingfrog.co.uk/seo-spider/](https://www.screamingfrog.co.uk/seo-spider/) | 桌面端站点爬取神器，免费版可抓取 500 个 URL，导出完整 sitemap 与 SEO 问题报告。 |
3 | xml-sitemap 生成库 | 开发库 | Node/库/流式 | [https://github.com/ekalinin/sitemap.js](https://github.com/ekalinin/sitemap.js) | Node 端 sitemap 生成库，支持超大站点流式写入与图片/新闻扩展协议。 |
4 | Google Search Console | 提交平台 | 提交/收录/诊断 | [https://search.google.com/search-console](https://search.google.com/search-console) | 提交 sitemap、查看收录与索引覆盖率，诊断站点的官方入口。 |
5 | cactus-compute/needle | SEO工具 |  | [https://github.com/cactus-compute/needle](https://github.com/cactus-compute/needle) | 14MB foundation model for tiny devices; phones, wearables, s |
6 | kepano/obsidian-skills | SEO工具 |  | [https://github.com/kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | Agent skills for Obsidian. Teach your agent to use Obsidian  |
7 | anthropics/skills | SEO工具 |  | [https://github.com/anthropics/skills](https://github.com/anthropics/skills) | Public repository for Agent Skills |
8 | holaboss-ai/holaOS | SEO工具 |  | [https://github.com/holaboss-ai/holaOS](https://github.com/holaboss-ai/holaOS) | Open-source All in One AI agent workspace. Run any agent — C |
9 | google/skills | SEO工具 |  | [https://github.com/google/skills](https://github.com/google/skills) | Agent Skills for Google products and technologies |
10 | LadybirdBrowser/ladybird | SEO工具 |  | [https://github.com/LadybirdBrowser/ladybird](https://github.com/LadybirdBrowser/ladybird) | Truly independent web browser |
11 | megadose/holehe | SEO工具 |  | [https://github.com/megadose/holehe](https://github.com/megadose/holehe) | holehe allows you to check if the mail is used on different  |
12 | PrimeIntellect-ai/prime-agent | SEO工具 |  | [https://github.com/PrimeIntellect-ai/prime-agent](https://github.com/PrimeIntellect-ai/prime-agent) | A self-improving RLM agent for coding workflows and long-run |
13 | esengine/DeepSeek-Reasonix | SEO工具 |  | [https://github.com/esengine/DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) | DeepSeek-native AI coding agent for your terminal. Engineere |

### 三、正文（9 篇）

#### 1. 网站地图提交全攻略：Google Search Console 与百度站长平台
- slug：`submit-sitemap-google-baidu` · 栏目：`使用技巧` · 字数≈159
- 摘要：详解用 SitemapGen 生成 sitemap 后，如何向 Google 与百度提交，并监控收录覆盖率与索引异常。
- 正文：

<p>生成 sitemap 只是第一步，提交到站长平台才能加速收录。本文以本站工具生成的标准 sitemap.xml 为例。</p><h2>一、生成标准地图</h2><p>用 SitemapGen 在线生成，确保遵循 sitemaps.org 协议。</p><h2>二、提交与监控</h2><p>在 Google Search Console 与百度站长平台分别提交，定期查看索引覆盖率。</p>

#### 2. 如何使用 SitemapGen 在线生成 进行批量处理？
- slug：`如何使用-sitemapgen-在线生成-进行批量处理` · 栏目：`SEO工具` · 字数≈98
- 摘要：SitemapGen 在线生成 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，
- 正文：

<p>SitemapGen 在线生成 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次性处理大量数据导致等待过久。</p><p>相关工具：<a href="https://sitemapgen.72tool.com">SitemapGen 在线生成</a></p>

#### 3. Screaming Frog SEO Spider 支持哪些文件格式？
- slug：`screaming-frog-seo-spider-支持哪些文件格式` · 栏目：`SEO工具` · 字数≈111
- 摘要：具体支持的格式以 Screaming Frog SEO Spider 官方页面为准。多数在线工具兼容常见的文本与表格格式
- 正文：

<p>具体支持的格式以 Screaming Frog SEO Spider 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要求，避免解析失败。</p><p>相关工具：<a href="https://www.screamingfrog.co.uk/seo-spider/">Screaming Frog SEO Spider</a></p>

#### 4. xml-sitemap 生成库 免费版有哪些限制？
- slug：`xml-sitemap-生成库-免费版有哪些限制` · 栏目：`SEO工具` · 字数≈81
- 摘要：xml-sitemap 生成库 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择
- 正文：

<p>xml-sitemap 生成库 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。</p><p>相关工具：<a href="https://github.com/ekalinin/sitemap.js">xml-sitemap 生成库</a></p>

#### 5. 如何在 Google Search Console 中导出结果？
- slug：`如何在-google-search-console-中导出结果` · 栏目：`SEO工具` · 字数≈154
- 摘要：处理完成后，Google Search Console 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、
- 正文：

<p>处理完成后，Google Search Console 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://search.google.com/search-console">Google Search Console</a></p>

#### 6. 如何使用 cactus-compute/needle 进行批量处理？
- slug：`如何使用-cactus-compute-needle-进行批量处理` · 栏目：`SEO工具` · 字数≈166
- 摘要：用 cactus-compute/needle 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批
- 正文：

<p>用 cactus-compute/needle 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能一次性提交。处理前用 2–3 条样本验证输出格式与速度，确认无误再扩展到全量，避免大批量出错后难以回滚；若支持并发，可逐步上调并发数观察稳定性。</p><p>相关工具：<a href="https://github.com/cactus-compute/needle">cactus-compute/needle</a></p>

#### 7. kepano/obsidian-skills 支持哪些文件格式？
- slug：`kepano-obsidian-skills-支持哪些文件格式` · 栏目：`SEO工具` · 字数≈161
- 摘要：kepano/obsidian-skills 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSO
- 正文：

<p>kepano/obsidian-skills 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Markdown 及主流图片/表格格式。上传前请确认编码为 UTF-8、单文件不超过站点限制，避免解析失败；批量场景建议统一格式后再一次性导入。</p><p>相关工具：<a href="https://github.com/kepano/obsidian-skills">kepano/obsidian-skills</a></p>

#### 8. anthropics/skills 免费版有哪些限制？
- slug：`anthropics-skills-免费版有哪些限制` · 栏目：`SEO工具` · 字数≈133
- 摘要：anthropics/skills 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小
- 正文：

<p>anthropics/skills 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、并发数或导出格式。使用前在官网「定价」页核对当前套餐明细，按实际体量选择，避免生产环境触达上限中断。</p><p>相关工具：<a href="https://github.com/anthropics/skills">anthropics/skills</a></p>

#### 9. 如何在 holaboss-ai/holaOS 中导出结果？
- slug：`如何在-holaboss-ai-holaos-中导出结果` · 栏目：`SEO工具` · 字数≈148
- 摘要：处理完成后，holaboss-ai/holaOS 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSO
- 正文：

<p>处理完成后，holaboss-ai/holaOS 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/holaboss-ai/holaOS">holaboss-ai/holaOS</a></p>

---

## es.72tool.com  ——  Herramientas (ES)

> 工具数 **13** · 资讯/长尾文数 **9**

### 一、栏目（category）
- 工具栏目：`Limpieza de texto`、`SEO`、`Inteligencia artificial`、`Utilidades`
- 文章栏目：`Tutorial`、`Utilidades`

### 二、工具清单（13）

| # | 名称 | 栏目 | 标签 | 链接 | 简介 |
|---|---|---|---|---|---|
1 | Limpiador de texto TxtClean | Limpieza de texto | texto/limpieza/puntuación | [https://txtclean.72tool.com/?site=tools/txtclean](https://txtclean.72tool.com/?site=tools/txtclean) | Herramienta gratuita para limpiar texto antiguo: elimina caracteres extraños, es |
2 | Generador de sitemap | SEO | sitemap/SEO/xml | [https://sitemapgen.72tool.com/?site=tools/sitemapgen](https://sitemapgen.72tool.com/?site=tools/sitemapgen) | Genera un sitemap.xml estándar para tu sitio web y mejora el SEO en buscadores. |
3 | Ollama (IA local) | Inteligencia artificial | ia/local/privado | [https://ollama.com](https://ollama.com) | Ejecuta modelos de lenguaje en tu propia computadora, sin enviar datos a la nube |
4 | cathrynlavery/diagram-design | Utilidades |  | [https://github.com/cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) | 29 editorial diagram types for Claude Code. Self-contained H |
5 | macro-inc/macro | Utilidades |  | [https://github.com/macro-inc/macro](https://github.com/macro-inc/macro) | Macro is a unified workspace for teams: email, chat, docs, t |
6 | 3b1b/manim | Utilidades |  | [https://github.com/3b1b/manim](https://github.com/3b1b/manim) | Animation engine for explanatory math videos |
7 | cactus-compute/needle | Utilidades |  | [https://github.com/cactus-compute/needle](https://github.com/cactus-compute/needle) | 14MB foundation model for tiny devices; phones, wearables, s |
8 | kepano/obsidian-skills | Utilidades |  | [https://github.com/kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | Agent skills for Obsidian. Teach your agent to use Obsidian  |
9 | cloudflare/computer | Utilidades |  | [https://github.com/cloudflare/computer](https://github.com/cloudflare/computer) | Give your agent a computer 👾 |
10 | esengine/DeepSeek-Reasonix | Utilidades |  | [https://github.com/esengine/DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) | DeepSeek-native AI coding agent for your terminal. Engineere |
11 | smicallef/spiderfoot | Utilidades |  | [https://github.com/smicallef/spiderfoot](https://github.com/smicallef/spiderfoot) | SpiderFoot automates OSINT for threat intelligence and mappi |
12 | google/skills | Utilidades |  | [https://github.com/google/skills](https://github.com/google/skills) | Agent Skills for Google products and technologies |
13 | zhaoxuya520/reverse-skill | Utilidades |  | [https://github.com/zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) | Reverse Engineering / Authorized Penetration Testing / Secur |

### 三、正文（9 篇）

#### 1. Cómo limpiar texto antiguo de forma gratuita (guía 2026)
- slug：`limpiar-texto-antiguo-gratis` · 栏目：`Tutorial` · 字数≈288
- 摘要：Guía paso a paso para eliminar caracteres extraños, espacios y líneas vacías de textos antiguos con TxtClean.
- 正文：

<p>Los textos escaneados suelen tener caracteres extraños y saltos de línea rotos. Esta guía usa la herramienta TxtClean para limpiarlos en minutos.</p><h2>Paso 1: Pegar el texto</h2><p>Pega el texto OCR en el cuadro y pulsa limpiar.</p><h2>Paso 2: Puntuación</h2><p>Activa la puntuación automática para mejorar la lectura.</p>

#### 2. 如何使用 Limpiador de texto TxtClean 进行批量处理？
- slug：`如何使用-limpiador-de-texto-txtclean-进行批量处理` · 栏目：`Utilidades` · 字数≈122
- 摘要：Limpiador de texto TxtClean 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上
- 正文：

<p>Limpiador de texto TxtClean 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次性处理大量数据导致等待过久。</p><p>相关工具：<a href="https://txtclean.72tool.com/?site=tools/txtclean">Limpiador de texto TxtClean</a></p>

#### 3. Generador de sitemap 支持哪些文件格式？
- slug：`generador-de-sitemap-支持哪些文件格式` · 栏目：`Utilidades` · 字数≈101
- 摘要：具体支持的格式以 Generador de sitemap 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请
- 正文：

<p>具体支持的格式以 Generador de sitemap 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要求，避免解析失败。</p><p>相关工具：<a href="https://sitemapgen.72tool.com/?site=tools/sitemapgen">Generador de sitemap</a></p>

#### 4. Ollama (IA local) 免费版有哪些限制？
- slug：`ollama-ia-local-免费版有哪些限制` · 栏目：`Utilidades` · 字数≈85
- 摘要：Ollama (IA local) 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需
- 正文：

<p>Ollama (IA local) 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。</p><p>相关工具：<a href="https://ollama.com">Ollama (IA local)</a></p>

#### 5. 如何在 cathrynlavery/diagram-design 中导出结果？
- slug：`如何在-cathrynlavery-diagram-design-中导出结果` · 栏目：`Utilidades` · 字数≈168
- 摘要：处理完成后，cathrynlavery/diagram-design 一般在结果区右上角提供「导出 / 下载」按钮，可保
- 正文：

<p>处理完成后，cathrynlavery/diagram-design 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/cathrynlavery/diagram-design">cathrynlavery/diagram-design</a></p>

#### 6. 如何使用 macro-inc/macro 进行批量处理？
- slug：`如何使用-macro-inc-macro-进行批量处理` · 栏目：`Utilidades` · 字数≈154
- 摘要：用 macro-inc/macro 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列
- 正文：

<p>用 macro-inc/macro 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能一次性提交。处理前用 2–3 条样本验证输出格式与速度，确认无误再扩展到全量，避免大批量出错后难以回滚；若支持并发，可逐步上调并发数观察稳定性。</p><p>相关工具：<a href="https://github.com/macro-inc/macro">macro-inc/macro</a></p>

#### 7. 3b1b/manim 支持哪些文件格式？
- slug：`3b1b-manim-支持哪些文件格式` · 栏目：`Utilidades` · 字数≈137
- 摘要：3b1b/manim 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Markdown 及
- 正文：

<p>3b1b/manim 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Markdown 及主流图片/表格格式。上传前请确认编码为 UTF-8、单文件不超过站点限制，避免解析失败；批量场景建议统一格式后再一次性导入。</p><p>相关工具：<a href="https://github.com/3b1b/manim">3b1b/manim</a></p>

#### 8. cactus-compute/needle 免费版有哪些限制？
- slug：`cactus-compute-needle-免费版有哪些限制` · 栏目：`Utilidades` · 字数≈141
- 摘要：cactus-compute/needle 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、
- 正文：

<p>cactus-compute/needle 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、并发数或导出格式。使用前在官网「定价」页核对当前套餐明细，按实际体量选择，避免生产环境触达上限中断。</p><p>相关工具：<a href="https://github.com/cactus-compute/needle">cactus-compute/needle</a></p>

#### 9. 如何在 kepano/obsidian-skills 中导出结果？
- slug：`如何在-kepano-obsidian-skills-中导出结果` · 栏目：`Utilidades` · 字数≈156
- 摘要：处理完成后，kepano/obsidian-skills 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV
- 正文：

<p>处理完成后，kepano/obsidian-skills 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/kepano/obsidian-skills">kepano/obsidian-skills</a></p>

---

## de.72tool.com  ——  Online-Tools (DE)

> 工具数 **13** · 资讯/长尾文数 **9**

### 一、栏目（category）
- 工具栏目：`Textbereinigung`、`SEO`、`Künstliche Intelligenz`、`Utilities`
- 文章栏目：`Anleitung`、`Utilities`

### 二、工具清单（13）

| # | 名称 | 栏目 | 标签 | 链接 | 简介 |
|---|---|---|---|---|---|
1 | TxtClean Textbereinigung | Textbereinigung | text/bereinigung/interpunktion | [https://txtclean.72tool.com/?site=tools/txtclean](https://txtclean.72tool.com/?site=tools/txtclean) | Kostenloses Werkzeug zur Bereinigung alter Texte: entfernt Sonderzeichen, Leerze |
2 | Sitemap-Generator | SEO | sitemap/SEO/xml | [https://sitemapgen.72tool.com/?site=tools/sitemapgen](https://sitemapgen.72tool.com/?site=tools/sitemapgen) | Erstellt eine standardisierte sitemap.xml für Ihre Website und verbessert die SE |
3 | Ollama (lokale KI) | Künstliche Intelligenz | ki/lokal/privat | [https://ollama.com](https://ollama.com) | Führen Sie Sprachmodelle auf Ihrem eigenen Computer aus, ohne Daten in die Cloud |
4 | anthropics/skills | Utilities |  | [https://github.com/anthropics/skills](https://github.com/anthropics/skills) | Public repository for Agent Skills |
5 | megadose/holehe | Utilities |  | [https://github.com/megadose/holehe](https://github.com/megadose/holehe) | holehe allows you to check if the mail is used on different  |
6 | msitarzewski/agency-agents | Utilities |  | [https://github.com/msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) | A complete AI agency at your fingertips - From frontend wiza |
7 | macro-inc/macro | Utilities |  | [https://github.com/macro-inc/macro](https://github.com/macro-inc/macro) | Macro is a unified workspace for teams: email, chat, docs, t |
8 | 3b1b/manim | Utilities |  | [https://github.com/3b1b/manim](https://github.com/3b1b/manim) | Animation engine for explanatory math videos |
9 | vitali87/code-graph-rag | Utilities |  | [https://github.com/vitali87/code-graph-rag](https://github.com/vitali87/code-graph-rag) | The ultimate RAG for your monorepo. Query, understand, and e |
10 | zhaoxuya520/reverse-skill | Utilities |  | [https://github.com/zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) | Reverse Engineering / Authorized Penetration Testing / Secur |
11 | holaboss-ai/holaOS | Utilities |  | [https://github.com/holaboss-ai/holaOS](https://github.com/holaboss-ai/holaOS) | Open-source All in One AI agent workspace. Run any agent — C |
12 | cloudflare/computer | Utilities |  | [https://github.com/cloudflare/computer](https://github.com/cloudflare/computer) | Give your agent a computer 👾 |
13 | virgiliojr94/book-to-skill | Utilities |  | [https://github.com/virgiliojr94/book-to-skill](https://github.com/virgiliojr94/book-to-skill) | Turn any technical book PDF into a Claude Code skill — ready |

### 三、正文（9 篇）

#### 1. Alte Texte bereinigen: Schritt-für-Schritt-Anleitung
- slug：`text-bereinigen-anleitung` · 栏目：`Anleitung` · 字数≈287
- 摘要：So entfernen Sie Sonderzeichen, Leerzeichen und leere Zeilen aus gescannten Texten mit TxtClean.
- 正文：

<p>Gescannte Texte enthalten oft kaputte Umbrüche. Diese Anleitung nutzt TxtClean, um sie in Minuten zu bereinigen.</p><h2>Schritt 1: Text einfügen</h2><p>Fügen Sie den OCR-Text ein und klicken Sie auf Bereinigen.</p><h2>Schritt 2: Interpunktion</h2><p>Aktivieren Sie die automatische Interpunktion für bessere Lesbarkeit.</p>

#### 2. 如何使用 TxtClean Textbereinigung 进行批量处理？
- slug：`如何使用-txtclean-textbereinigung-进行批量处理` · 栏目：`Utilities` · 字数≈116
- 摘要：TxtClean Textbereinigung 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效
- 正文：

<p>TxtClean Textbereinigung 支持将多个任务合并执行，适合需要重复操作的场景。建议先在小批量上验证效果，再扩展到全量，避免一次性处理大量数据导致等待过久。</p><p>相关工具：<a href="https://txtclean.72tool.com/?site=tools/txtclean">TxtClean Textbereinigung</a></p>

#### 3. Sitemap-Generator 支持哪些文件格式？
- slug：`sitemap-generator-支持哪些文件格式` · 栏目：`Utilities` · 字数≈95
- 摘要：具体支持的格式以 Sitemap-Generator 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格
- 正文：

<p>具体支持的格式以 Sitemap-Generator 官方页面为准。多数在线工具兼容常见的文本与表格格式；上传前请确认格式符合要求，避免解析失败。</p><p>相关工具：<a href="https://sitemapgen.72tool.com/?site=tools/sitemapgen">Sitemap-Generator</a></p>

#### 4. Ollama (lokale KI) 免费版有哪些限制？
- slug：`ollama-lokale-ki-免费版有哪些限制` · 栏目：`Utilities` · 字数≈87
- 摘要：Ollama (lokale KI) 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按
- 正文：

<p>Ollama (lokale KI) 通常提供免费额度或试用，高级功能可能需要订阅。使用前可在官网查看最新的套餐说明，按需选择。</p><p>相关工具：<a href="https://ollama.com">Ollama (lokale KI)</a></p>

#### 5. 如何在 anthropics/skills 中导出结果？
- slug：`如何在-anthropics-skills-中导出结果` · 栏目：`Utilities` · 字数≈146
- 摘要：处理完成后，anthropics/skills 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON
- 正文：

<p>处理完成后，anthropics/skills 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/anthropics/skills">anthropics/skills</a></p>

#### 6. 如何使用 megadose/holehe 进行批量处理？
- slug：`如何使用-megadose-holehe-进行批量处理` · 栏目：`Utilities` · 字数≈154
- 摘要：用 megadose/holehe 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列
- 正文：

<p>用 megadose/holehe 做批量处理时，先把任务清单整理成结构化文件（CSV/JSON），通过其批量导入或队列功能一次性提交。处理前用 2–3 条样本验证输出格式与速度，确认无误再扩展到全量，避免大批量出错后难以回滚；若支持并发，可逐步上调并发数观察稳定性。</p><p>相关工具：<a href="https://github.com/megadose/holehe">megadose/holehe</a></p>

#### 7. msitarzewski/agency-agents 支持哪些文件格式？
- slug：`msitarzewski-agency-agents-支持哪些文件格式` · 栏目：`Utilities` · 字数≈169
- 摘要：msitarzewski/agency-agents 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV
- 正文：

<p>msitarzewski/agency-agents 具体支持的格式以官网文档为准，常见在线工具通常兼容 TXT、CSV、JSON、Markdown 及主流图片/表格格式。上传前请确认编码为 UTF-8、单文件不超过站点限制，避免解析失败；批量场景建议统一格式后再一次性导入。</p><p>相关工具：<a href="https://github.com/msitarzewski/agency-agents">msitarzewski/agency-agents</a></p>

#### 8. macro-inc/macro 免费版有哪些限制？
- slug：`macro-inc-macro-免费版有哪些限制` · 栏目：`Utilities` · 字数≈129
- 摘要：macro-inc/macro 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、并
- 正文：

<p>macro-inc/macro 通常提供免费额度或试用次数，超出后需订阅付费版；免费版可能限制单次处理数量、文件大小、并发数或导出格式。使用前在官网「定价」页核对当前套餐明细，按实际体量选择，避免生产环境触达上限中断。</p><p>相关工具：<a href="https://github.com/macro-inc/macro">macro-inc/macro</a></p>

#### 9. 如何在 3b1b/manim 中导出结果？
- slug：`如何在-3b1b-manim-中导出结果` · 栏目：`Utilities` · 字数≈132
- 摘要：处理完成后，3b1b/manim 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格
- 正文：

<p>处理完成后，3b1b/manim 一般在结果区右上角提供「导出 / 下载」按钮，可保存为 CSV、JSON 或常见文档格式。若页面无明显入口，可在顶部工具栏或每条结果的操作菜单中查找；长期留存建议导出后本地备份，并留意是否含敏感字段。</p><p>相关工具：<a href="https://github.com/3b1b/manim">3b1b/manim</a></p>

---

# 汇总

- 子站数：**7**（外加根域 72tool.com）
- 工具总数：**91**
- 资讯/长尾文总数：**73**
