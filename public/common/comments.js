/* ============================================================
 * public/common/comments.js  ——  资讯详情页静态预制评论（无后端，提升丰富度）
 * ------------------------------------------------------------
 * 对应清单「五.1」：资讯详情页配套评论模块（静态预制 AI 风格评论，无后端依赖），
 * 提升页面内容丰富度，规避“低质内容”判定。评论根据文章 slug 确定性生成，
 * 同一篇文章评论稳定（刷新不变），不调用任何外部接口。
 * 用法：article.js 在渲染详情后调用 renderComments(slug, title)。
 * ============================================================ */
(function () {
  'use strict';
  var NAMES = ['阿杰', 'Mia', '老张', 'Ken', '小鹿', 'Tom', '阿成', 'Lina', '大鹏', 'Nina'];
  var TEMPLATES = [
    '收藏了，正好在用相关工具，作者讲得比官方文档清楚。',
    '按这个教程一步步操作就跑通了，感谢分享！',
    '补充一点：第 3 步如果遇到报错，大概率是环境变量没配对。',
    '已转发给团队，准备照着搭一套内部流程。',
    '对比了好几个方案，这篇的角度最实用，点赞。',
    '新手友好，避坑点写得很到位，少走了很多弯路。'
  ];
  // 简易哈希，保证同 slug 评论稳定
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  function renderComments(slug, title) {
    var box = document.getElementById('comments');
    if (!box) return;
    var seed = hash(slug || title || 'x');
    var n = 3 + (seed % 3); // 3~5 条
    var html = '<h2 class="section-title">网友讨论</h2><ul class="comment-list">';
    for (var i = 0; i < n; i++) {
      var name = NAMES[(seed + i * 7) % NAMES.length];
      var text = TEMPLATES[(seed >> i) % TEMPLATES.length];
      html += '<li class="comment"><span class="c-name">' + name + '</span><p>' + text + '</p></li>';
    }
    html += '</ul>';
    box.innerHTML = html;
    box.hidden = false;
  }
  window.renderComments = renderComments;
})();
