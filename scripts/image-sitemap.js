/* ============================================================
 * scripts/image-sitemap.js  ——  图片站点地图生成（SEO 富媒体收录）
 * ------------------------------------------------------------
 * 对应清单「六.3」：为工具演示图/资讯配图生成 image-sitemap.xml，
 * 配合 functions/image-sitemap.xml.js 提供「域名/image-sitemap.xml」统一入口。
 *
 * 关键规则（踩坑后修正，务必遵守）：
 *   1) <loc> 必须是「本站自有页面」URL，绝不能填工具官网等外链 —— 图片地图中
 *      跨域 <loc> 会被搜索引擎整体判为无效，等于白做；
 *      工具页 → https://<域名>/?tool=<slug>；资讯页 → https://<域名>/article/<slug>
 *      （与 build-sitemap.js 的 URL 规则严格一致，避免两份地图互相冲突）；
 *   2) <image:loc> 必须是绝对 URL —— 数据里写 /assets/x.jpg 这类相对路径时，
 *      自动补全为 https://<域名>/assets/x.jpg；
 *   3) 补 <image:title>（取工具名/文章标题），提升图片搜索点击率；
 *   4) 无图片的站点不生成文件，不污染索引；
 *   5) 幂等：图片无变化则文件内容完全一致，不产生假 diff（省 CF 构建额度）；
 *   6) xmlns 里的 google.com 仅是 XML 命名空间「标识字符串」，是图片地图格式的
 *      国际标准写法（必应/百度同样按此解析），不发起任何网络请求、不引入 Google
 *      服务依赖，符合「零 Google 依赖」要求。
 * 用法：node scripts/image-sitemap.js
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, parseSites, readTools, readArticles, slugify } = require('./_sites');

/* XML 特殊字符转义（图片 URL 常含 & 参数，不转义会导致 XML 解析失败） */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* 相对路径 → 绝对 URL；已是 http(s)/协议相对则原样保留 */
function absUrl(img, domain) {
  const s = String(img || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return 'https:' + s;
  return 'https://' + domain + (s.startsWith('/') ? s : '/' + s);
}

/* 按 <loc> 聚合：同一页面的多张图片合并进一个 <url> 节点（符合规范，避免重复 loc） */
function build(items) {
  if (!items.length) return '';
  const byLoc = new Map();
  for (const it of items) {
    if (!byLoc.has(it.loc)) byLoc.set(it.loc, []);
    byLoc.get(it.loc).push(it);
  }
  const body = [];
  for (const [loc, list] of byLoc) {
    const imgs = list.map((it) =>
      '    <image:image>\n' +
      '      <image:loc>' + esc(it.img) + '</image:loc>\n' +
      (it.title ? '      <image:title>' + esc(it.title) + '</image:title>\n' : '') +
      '    </image:image>'
    ).join('\n');
    body.push('  <url>\n    <loc>' + esc(loc) + '</loc>\n' + imgs + '\n  </url>');
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    body.join('\n') + '\n</urlset>\n';
}

function main() {
  const sites = parseSites();
  let n = 0, removed = 0;
  const withImages = []; // 记录确有图片地图的域名，供 robots.txt Function 按需声明

  for (const s of sites) {
    const t = readTools(s.abs);
    const a = readArticles(s.abs);
    const imgs = [];

    // 工具：loc 指向本站详情页 /?tool=<slug>，与 build-sitemap.js 完全一致
    if (t) {
      t.tools.forEach((x) => {
        if (!x.img || !x.name) return;
        imgs.push({
          loc: 'https://' + s.domain + '/?tool=' + encodeURIComponent(slugify(x.name)),
          img: absUrl(x.img, s.domain),
          title: x.name
        });
      });
    }

    // 资讯：loc 指向本站文章页 /article/<slug>
    if (a) {
      a.articles.forEach((x) => {
        if (!x.img || !x.slug) return;
        imgs.push({
          loc: 'https://' + s.domain + '/article/' + encodeURIComponent(x.slug),
          img: absUrl(x.img, s.domain),
          title: x.title || ''
        });
      });
    }

    const out = path.join(s.abs, 'image-sitemap.xml');
    if (imgs.length) {
      const xml = build(imgs);
      // 幂等：内容一致则跳过写入，避免无意义 diff 触发部署
      const prev = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
      if (prev !== xml) fs.writeFileSync(out, xml);
      console.log('✓', s.dir + '/image-sitemap.xml', '| 图片', imgs.length, prev === xml ? '(无变化)' : '');
      withImages.push(s.domain);
      n++;
    } else if (fs.existsSync(out)) {
      // 图片被清空后，清掉残留文件，避免索引里留死地图
      fs.unlinkSync(out);
      removed++;
      console.log('- 已清理无图残留:', s.dir + '/image-sitemap.xml');
    }
  }

  /* 输出「有图站点清单」：robots.txt Function 据此只对确有图片的域名声明 image-sitemap，
   * 避免向站长平台声明一个 404 的地图地址（会被记为抓取错误）。幂等写入。 */
  const flagPath = path.join(PUBLIC_DIR, 'common', 'image-sites.json');
  const flagJson = JSON.stringify({ domains: withImages.sort() }, null, 2) + '\n';
  const prevFlag = fs.existsSync(flagPath) ? fs.readFileSync(flagPath, 'utf8') : '';
  if (prevFlag !== flagJson) fs.writeFileSync(flagPath, flagJson);

  console.log('图片地图生成完成 | 含图片站点', n, '个' + (removed ? ' | 清理残留 ' + removed + ' 个' : ''));
  console.log('✓ common/image-sites.json | 声明域名', withImages.length, '个');
  if (!n) console.log('提示：给 data/list.json 的工具或 article/list.json 的资讯加 "img" 字段即可自动生成');
}

main();
