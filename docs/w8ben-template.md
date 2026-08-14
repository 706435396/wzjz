# W-8BEN 填报模板与字段映射（§6.2）

> 适用：与美国联盟（AdSense / CJ / Impact / PartnerStack 等）结算收益的非美税务居民（个人）。
> 目的：声明「我是外国受益人」，避免美国来源收入被预扣 30% 所得税（协定国可降至更低）。
> 本文件**仅作填写指引**，不代填、不收集任何个人信息。所有带「*由本人填写*」的字段请本人据实填写。

## 一、什么时候需要
- 美国联盟首次提现前通常要求上传 W-8BEN（或后台在线表单）。
- 公司主体用 **W-8BEN-E**（本模板针对个人 W-8BEN）。

## 二、字段逐项映射（IRS Form W-8BEN 2021 版）

| 表单字段 | 含义 | 填写示例 / 说明 |
| --- | --- | --- |
| Part I **Line 1** Name of individual | 法定姓名 | *由本人填写*：与身份证/护照一致拼音 |
| Part I **Line 2** Country of citizenship | 国籍 | *由本人填写*：China |
| Part I **Line 3** Permanent residence address | 永久住址 | *由本人填写*：不填美国地址（填则按 US 纳税人处理） |
| Part I **Line 4** Mailing address | 邮寄地址 | 可选；留空则用 Line 3 |
| Part I **Line 5** Taxpayer Identification Number (foreign) | 外国纳税人识别号 | 中国居民通常留空或填身份证号（非美国 SSN/ITIN，切勿填错） |
| Part I **Line 6** U.S. TIN (if any) | 美国税号 | 无则留空 |
| Part I **Line 7** Date of birth | 出生日期 | *由本人填写* |
| Part II **Line 8** Claim of treaty | 税收协定优惠 | 选「China」；受益类型「Individual」；协定条款通常 Article 9 / 12（按联盟指引） |
| Part II **Line 9** 特殊税率说明 | 协定优惠税率 | 一般留空或按联盟提示 |
| Part III **Line 10** Certification | 声明与签名 | *由本人填写*：签名 + 日期（电子表单在线签） |

## 三、常见填错（会多扣税/被退表）
1. **Line 3 填了美国地址** → 被当美国纳税人，全额预扣。
2. **Line 5 误填美国 SSN/ITIN** → 身份冲突。
3. **Part II 没勾 China 协定** → 无法享受协定低税率。
4. **签名/日期缺失** → 表单无效。

## 四、配套（本仓库相关）
- `config.json` → `finance.payoneer`：按「中文站 / 小语种站」拆分收款渠道（§6.3），降低单账号结汇风控。
- `scripts/finance-recon.js`：每月把各联盟 USD/EUR 收益换算 CNY 出对账表，做个人报税留存（§6.1 / §6.4）。
- 提现记录：`node scripts/finance-recon.js --record-withdrawal "Payoneer|500|USD|2026-08-20|结汇"` 归档到 `data/reports/withdrawals.json`。

> 免责：本模板为操作指引，非税务/法律意见。跨境税务以各国最新法规与联盟后台表单为准，必要时咨询持证税务师。
