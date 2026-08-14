/* ============================================================
   72tool 多子域名站群 - 隐私政策渲染（privacy.js）
   按当前子站 config.json 的 lang 渲染对应语种隐私政策；默认英文（AdSense 审核语言）。
   内容覆盖：运营方 / 分析统计 / 广告网络 / 分销链接 / Cookie / 儿童隐私 / 用户权利 / 联系。
   无 ICP 备案 → 中文隐私声明对海外广告网络无法律效力，必须多语种真实页面才过审。
   ============================================================ */
(function () {
  'use strict';

  var Site = window.Site || { base: '/', meta: function () { return Promise.resolve({}); }, globalConfig: function () { return Promise.resolve({}); } };

  // 把 lang('zh-CN' → 'zh') 归一
  function normLang(l) {
    if (!l) return 'en';
    var s = String(l).toLowerCase();
    if (s.indexOf('zh') === 0) return 'zh';
    if (s.indexOf('es') === 0) return 'es';
    if (s.indexOf('de') === 0) return 'de';
    return 'en';
  }

  var PRIVACY = {
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: 2026-08-14',
      body:
        '<p>This page explains how this site (a sub-site of the 72tool tool-navigation network) handles your data. It applies to all visits to this domain.</p>' +
        '<h2>1. Who we are</h2>' +
        '<p>This site is part of the 72tool network of online-tool and AI-agent navigation sites. For any privacy question, contact <a href="/community">our community</a> or the site operator.</p>' +
        '<h2>2. Analytics</h2>' +
        '<p>We use <strong>Cloudflare Web Analytics</strong>, a privacy-first, cookieless analytics service. It collects only aggregate, non-identifying metrics (page views, approximate region, device type) and does not track you across sites. We do not use Google Analytics.</p>' +
        '<h2>3. Advertising</h2>' +
        '<p>This site may display third-party advertisements (for Chinese-language sites: <strong>Adsterra</strong>; for other language sites: <strong>Google AdSense</strong>). These ad networks may use cookies or non-cookie identifiers to personalize and measure ads, and to combat fraud. Their handling of data is governed by their own policies:</p>' +
        '<ul>' +
        '<li>Adsterra: <a href="https://adsterra.com/privacy-policy" target="_blank" rel="nofollow noopener">adsterra.com/privacy-policy</a></li>' +
        '<li>Google AdSense: <a href="https://policies.google.com/technologies/ads" target="_blank" rel="nofollow noopener">policies.google.com/technologies/ads</a></li>' +
        '</ul>' +
        '<p>You can manage ad personalization in your browser or via the network opt-out pages. We honor a minimal, non-intrusive cookie notice (see below).</p>' +
        '<h2>4. Affiliate links</h2>' +
        '<p>Some tool links on this site are <strong>affiliate / sponsored links</strong> (marked “分销合作 / affiliate”). If you sign up for or purchase a tool through them, we may earn a commission at no extra cost to you. These links use <code>rel="sponsored nofollow"</code> as required by search-engine paid-link disclosure rules. We only recommend tools we believe are useful.</p>' +
        '<h2>5. Cookies</h2>' +
        '<p>We use as few cookies as possible. The only first-party cookie we set is a simple consent flag for the cookie notice. Advertising and analytics cookies are controlled by the third parties above and only used after you interact with the notice. You may clear or block cookies in your browser at any time.</p>' +
        '<h2>6. Children’s privacy</h2>' +
        '<p>This site is intended for a general audience and is not directed at children under 13. We do not knowingly collect personal data from children.</p>' +
        '<h2>7. Your rights</h2>' +
        '<p>Depending on your region (e.g. GDPR for the EEA, UK; CCPA for California), you have the right to access, correct, or delete your data and to object to certain processing. Because we store no personal identifiers ourselves, most requests can be satisfied by clearing cookies in your browser. For anything else, contact us via the community page.</p>' +
        '<h2>8. Changes</h2>' +
        '<p>We may update this policy. Material changes will be reflected on this page with a new “last updated” date.</p>' +
        '<h2>9. Contact</h2>' +
        '<p>Questions? Reach us through the <a href="/community">community page</a>.</p>'
    },
    zh: {
      title: '隐私政策',
      updated: '最后更新：2026-08-14',
      body:
        '<p>本页说明本站点（72tool 工具导航网络的一个子站点）如何处理你的数据，适用于访问本域名下的所有页面。</p>' +
        '<h2>1. 运营方</h2>' +
        '<p>本站是 72tool 在线工具与 AI 智能体导航网络的一部分。如有任何隐私问题，可通过<a href="/community">社群页面</a>联系运营方。</p>' +
        '<h2>2. 网站统计</h2>' +
        '<p>我们使用 <strong>Cloudflare Web Analytics</strong>——隐私优先、无 Cookie 的统计服务，仅收集聚合且不可识别个人的指标（浏览量、大致地区、设备类型），不会跨站追踪你。我们不使用 Google Analytics。</p>' +
        '<h2>3. 广告</h2>' +
        '<p>本站可能展示第三方广告（中文站为 <strong>Adsterra</strong>，其他语种站为 <strong>Google AdSense</strong>）。这些广告网络可能使用 Cookie 或非 Cookie 标识来个性化与衡量广告、防范欺诈，其数据处理受其各自政策约束：</p>' +
        '<ul>' +
        '<li>Adsterra：<a href="https://adsterra.com/privacy-policy" target="_blank" rel="nofollow noopener">adsterra.com/privacy-policy</a></li>' +
        '<li>Google AdSense：<a href="https://policies.google.com/technologies/ads" target="_blank" rel="nofollow noopener">policies.google.com/technologies/ads</a></li>' +
        '</ul>' +
        '<p>你可在浏览器中管理广告个性化，或通过各网络的退出页关闭。我们采用极简、非侵入式的 Cookie 提示（见下）。</p>' +
        '<h2>4. 分销链接</h2>' +
        '<p>本站部分工具链接为<strong>分销 / 赞助链接</strong>（标注「分销合作」）。若你通过它们注册或购买，我们可能获得佣金，且不会增加你的费用。这些链接按搜索引擎付费链接披露要求使用 <code>rel="sponsored nofollow"</code>。我们仅推荐认为有用的工具。</p>' +
        '<h2>5. Cookie</h2>' +
        '<p>我们尽可能少用 Cookie。本站设置的第一方 Cookie 仅为一个记录同意状态的简单标识。广告与分析 Cookie 由上述第三方控制，仅在你就提示做出选择后使用。你可随时在浏览器中清除或阻止 Cookie。</p>' +
        '<h2>6. 儿童隐私</h2>' +
        '<p>本站面向一般大众，不针对 13 岁以下儿童，亦不会有意收集儿童个人数据。</p>' +
        '<h2>7. 你的权利</h2>' +
        '<p>依据你所在地区（如 EEA/英国 GDPR、加州 CCPA），你有权访问、更正或删除你的数据，并对某些处理提出异议。由于本站不存储可识别个人身份的信息，多数请求可通过清除浏览器 Cookie 完成。其他情况请通过社群页面联系我们。</p>' +
        '<h2>8. 变更</h2>' +
        '<p>我们可能更新本政策，重大变更将更新本页“最后更新”日期。</p>' +
        '<h2>9. 联系</h2>' +
        '<p>如有疑问，请通过<a href="/community">社群页面</a>联系我们。</p>'
    },
    es: {
      title: 'Política de Privacidad',
      updated: 'Última actualización: 2026-08-14',
      body:
        '<p>Esta página explica cómo este sitio (un sub-sitio de la red de navegación de herramientas 72tool) trata tus datos. Se aplica a todas las visitas a este dominio.</p>' +
        '<h2>1. Quiénes somos</h2>' +
        '<p>Este sitio forma parte de la red 72tool de sitios de herramientas en línea y agentes de IA. Para cualquier duda de privacidad, contacta con <a href="/community">nuestra comunidad</a>.</p>' +
        '<h2>2. Analítica</h2>' +
        '<p>Usamos <strong>Cloudflare Web Analytics</strong>, un servicio de analítica sin cookies y respetuoso con la privacidad. Solo recoge métricas agregadas y no identificables (visitaspáginas, región aproximada, tipo de dispositivo) y no te rastrea entre sitios. No usamos Google Analytics.</p>' +
        '<h2>3. Publicidad</h2>' +
        '<p>Este sitio puede mostrar anuncios de terceros (para sitios en español: <strong>Google AdSense</strong>). Estas redes pueden usar cookies o identificadores para personalizar y medir anuncios y combatir el fraude, según sus propias políticas:</p>' +
        '<ul>' +
        '<li>Google AdSense: <a href="https://policies.google.com/technologies/ads" target="_blank" rel="nofollow noopener">policies.google.com/technologies/ads</a></li>' +
        '</ul>' +
        '<p>Puedes gestionar la personalización de anuncios en tu navegador. Usamos un aviso de cookies mínimo y no intrusivo (ver abajo).</p>' +
        '<h2>4. Enlaces de afiliado</h2>' +
        '<p>Algunos enlaces de herramientas son <strong>enlaces de afiliado / patrocinados</strong> (marcados “affiliate”). Si te registras o compras a través de ellos, podemos ganar una comisión sin coste adicional para ti. Usan <code>rel="sponsored nofollow"</code> según las normas de divulgación de enlaces de pago. Solo recomendamos herramientas útiles.</p>' +
        '<h2>5. Cookies</h2>' +
        '<p>Usamos el mínimo de cookies. La única cookie propia es una bandera de consentimiento para el aviso. Las cookies de publicidad y analítica las controlan terceros y solo se usan tras tu elección. Puedes borrar o bloquear cookies en tu navegador en cualquier momento.</p>' +
        '<h2>6. Privacidad de menores</h2>' +
        '<p>Este sitio es para público general y no está dirigido a menores de 13 años.</p>' +
        '<h2>7. Tus derechos</h2>' +
        '<p>Según tu región (RGPD en EEE/Reino Unido, CCPA en California), tienes derecho a acceder, rectificar o suprimir tus datos. Como no almacenamos identificadores personales, la mayoría de solicitudes se resuelven borrando las cookies. Para otros casos, contáctanos vía la comunidad.</p>' +
        '<h2>8. Cambios</h2>' +
        '<p>Podemos actualizar esta política; los cambios materiales se reflejarán con una nueva fecha.</p>' +
        '<h2>9. Contacto</h2>' +
        '<p>¿Dudas? Escríbenos por la <a href="/community">página de comunidad</a>.</p>'
    },
    de: {
      title: 'Datenschutzerklärung',
      updated: 'Zuletzt aktualisiert: 2026-08-14',
      body:
        '<p>Diese Seite erklärt, wie dieser Site (eine Unterseite des 72tool-Werkzeug-Navigationsnetzwerks) mit deinen Daten umgeht. Sie gilt für alle Besuche auf dieser Domain.</p>' +
        '<h2>1. Wer wir sind</h2>' +
        '<p>Diese Site ist Teil des 72tool-Netzwerks aus Online-Tools und KI-Agenten. Datenschutzfragen richte bitte an <a href="/community">unsere Community</a>.</p>' +
        '<h2>2. Analytik</h2>' +
        '<p>Wir verwenden <strong>Cloudflare Web Analytics</strong>, einen datenschutzfreundlichen, cookie-losen Dienst. Es werden nur aggregierte, nicht identifizierende Kennzahlen (Seitenaufrufe, ungefähre Region, Gerätetyp) erhoben; kein Tracking über Sites hinweg. Wir nutzen kein Google Analytics.</p>' +
        '<h2>3. Werbung</h2>' +
        '<p>Diese Site kann Anzeigen von Drittanbietern schalten (für deutschsprachige Sites: <strong>Google AdSense</strong>). Diese Netzwerke können Cookies oder Kennungen verwenden, um Anzeigen zu personalisieren und zu messen sowie Betrug zu bekämpfen, gemäß ihren eigenen Richtlinien:</p>' +
        '<ul>' +
        '<li>Google AdSense: <a href="https://policies.google.com/technologies/ads" target="_blank" rel="nofollow noopener">policies.google.com/technologies/ads</a></li>' +
        '</ul>' +
        '<p>Du kannst die Anzeigenpersonalisierung in deinem Browser verwalten. Wir zeigen einen minimalen, nicht aufdringlichen Cookie-Hinweis (siehe unten).</p>' +
        '<h2>4. Partnerlinks</h2>' +
        '<p>Einige Tool-Links sind <strong>Partner-/gesponserte Links</strong> (markiert „affiliate“). Registrierst oder kaufst du über sie, erhalten wir ggf. eine Provision ohne Mehrkosten für dich. Sie nutzen <code>rel="sponsored nofollow"</code> gemäß Offenlegungsregeln. Wir empfehlen nur nützliche Tools.</p>' +
        '<h2>5. Cookies</h2>' +
        '<p>Wir verwenden so wenige Cookies wie möglich. Das einzige eigene Cookie ist ein Einwilligungs-Flag für den Hinweis. Werbe- und Analyse-Cookies steuern Dritte und werden nur nach deiner Auswahl gesetzt. Du kannst Cookies jederzeit im Browser löschen oder blockieren.</p>' +
        '<h2>6. Kinderdatenschutz</h2>' +
        '<p>Diese Site richtet sich an ein allgemeines Publikum und nicht an Kinder unter 13 Jahren.</p>' +
        '<h2>7. Deine Rechte</h2>' +
        '<p>Nach deiner Region (DSGVO im EWR/UK, CCPA in Kalifornien) hast du das Recht auf Auskunft, Berichtigung oder Löschung. Da wir keine personenbezogenen Kennungen speichern, lässt sich das meiste durch Löschen der Cookies erledigen. Sonst kontaktiere uns über die Community.</p>' +
        '<h2>8. Änderungen</h2>' +
        '<p>Wir können diese Erklärung aktualisieren; wesentliche Änderungen erhalten ein neues Datum.</p>' +
        '<h2>9. Kontakt</h2>' +
        '<p>Fragen? Schreib uns über die <a href="/community">Community-Seite</a>.</p>'
    }
  };

  function render() {
    var box = document.getElementById('privacyContent');
    if (!box) return;
    Promise.all([Site.meta(), Site.globalConfig()]).then(function (res) {
      var cfg = res[0] || {};
      var g = res[1] || {};
      var lang = normLang(cfg.lang);
      var p = PRIVACY[lang] || PRIVACY.en;
      var path = (g.compliance && g.compliance.privacy && g.compliance.privacy.path) || '/privacy';
      document.title = (cfg.name ? cfg.name + ' · ' : '') + p.title;
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
      box.innerHTML =
        '<h1>' + p.title + '</h1>' +
        '<p class="privacy-updated">' + p.updated + '</p>' +
        p.body +
        '<p class="privacy-back"><a href="/">← ' + (lang === 'zh' ? '返回首页' : lang === 'es' ? '← Volver al inicio' : lang === 'de' ? '← Zur Startseite' : '← Back to home') + '</a></p>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
