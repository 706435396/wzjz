/* ============================================================
 * scripts/prompt-library.js  ——  多维度 AI 差异化 Prompt 库
 * ------------------------------------------------------------
 * 解决清单「一.1」：同款工具分发到不同子站时文案同质化。
 * 设计：
 *   每个赛道(track)内置 4 个文案角度(angle)：deploy / usecase / compare / pitfall；
 *   同工具在不同子站会自动切换角度 Prompt，输出差异化文案，避免搜索引擎判低质重复。
 *   所有脚本通过 promptFor(track, angle, ctx) 获取当前站点角度的 Prompt。
 * 零 Google 依赖：仅智谱。
 * ============================================================ */
'use strict';

/* 赛道文案角度库：新增赛道在此追加 */
const TRACK_ANGLE = {
  browser: {
    label: '浏览器自动化 Agent',
    angles: {
      deploy: '侧重 Playwright/Puppeteer 安装、无头浏览器部署、国内网络提速、依赖冲突解决',
      usecase: '侧重网页抓取、表单自动填、RPA 流程编排、定时任务等实战落地场景',
      compare: '侧重与同类浏览器 Agent 的能力、价格、稳定性横向对比与选型建议',
      pitfall: '侧重反爬封号、登录态保持、iframe 处理、验证码绕过的避坑要点'
    }
  },
  tiktok: {
    label: '跨境短视频 Agent',
    angles: {
      deploy: '侧重 TikTok 批量剪辑环境搭建、本地渲染、海外节点加速',
      usecase: '侧重跨境带货、批量混剪、多账号矩阵、文案生成实战',
      compare: '侧重与 CapCut/Opus 等工具的产能、合规、成本横向对比',
      pitfall: '侧重平台合规、版权音乐、限流规避的避坑要点'
    }
  },
  localgpu: {
    label: '本地显卡 Agent',
    angles: {
      deploy: '侧重 Ollama/ComfyUI 本地部署、显存占用、驱动与量化参数调优',
      usecase: '侧重本地 LLM 推理、SD 出图、离线隐私场景落地',
      compare: '侧重不同模型/显卡/推理框架的性价比横向对比',
      pitfall: '侧重显存不足、CUDA 报错、模型格式转换的避坑要点'
    }
  },
  txtclean: {
    label: '文本清洗工具',
    angles: {
      deploy: '侧重本地批量清洗脚本部署、编码转换、命令行用法',
      usecase: '侧重古籍/论文/爬虫文本去噪、繁简转换、标点规整实战',
      compare: '侧重不同清洗工具的规则灵活度与批处理性能对比',
      pitfall: '侧重乱码、编码丢失、格式破坏的避坑要点'
    }
  },
  sitemapgen: {
    label: 'SEO / 站点地图工具',
    angles: {
      deploy: '侧重静态站 sitemap 生成部署、CI 集成、提交搜索引擎',
      usecase: '侧重收录提速、长尾词覆盖、站内链接结构优化实战',
      compare: '侧重不同 sitemap/SEO 工具的抓取效率与额度对比',
      pitfall: '侧重重复链接、超大文件超时、被搜索引擎忽略的避坑要点'
    }
  },
  es: { label: 'Utilidades en español', angles: { deploy: 'enfoque en despliegue local', usecase: 'casos prácticos', compare: 'comparativa', pitfall: 'errores comunes' } },
  de: { label: 'Utilities auf Deutsch', angles: { deploy: 'Fokus auf lokales Setup', usecase: 'Praxisbeispiele', compare: 'Vergleich', pitfall: 'häufige Fehler' } }
};

/* 角度轮换顺序（保证同工具在不同时间点也能换角度，进一步降重） */
const ANGLE_ORDER = ['deploy', 'usecase', 'compare', 'pitfall'];

/* 根据赛道 + 角度 + 素材，生成差异化 Prompt 字符串 */
function promptFor(track, angle, ctx) {
  const t = TRACK_ANGLE[track] || TRACK_ANGLE.browser;
  const a = t.angles[angle] || Object.values(t.angles)[0];
  return (
    '你是「' + t.label + '」赛道的内容专家。本次文案角度：' + a + '。\n' +
    '请基于以下素材，生成与该赛道通用简介明显差异化、不雷同的中文 SEO 内容；' +
    '禁止直接复制 README/官网原文，调整句式与语序，突出本角度价值。\n' +
    '素材：' + (ctx || '') + '\n' +
    '仅输出一个 JSON（不要多余文字）：\n' +
    '{"title":"40字内标题","desc":"60字内差异化简介","longtail":["长尾问答词1","长尾问答词2","长尾问答词3"]}'
  );
}

/* 给定一个赛道，按顺序取第 n 个角度（用于轮换降重） */
function angleByIndex(track, n) {
  return ANGLE_ORDER[n % ANGLE_ORDER.length];
}

module.exports = { TRACK_ANGLE, ANGLE_ORDER, promptFor, angleByIndex };
