/* ============================================================
 * scripts/enrich-detail.js —— 工具详情页元数据富化（离线启发式）
 * ------------------------------------------------------------
 * 为各语言子站工具派生详情页所需的“基础信息 / 优缺点 / 使用步骤”
 * 字段，全部从已有 url / tags / desc / category 启发式推导，无需联网。
 *
 * 产出（写入每个 tool 对象，幂等，可重复运行）：
 *   tool.meta        { openSource, pricing, platforms[], license, updated }
 *   tool.pros[]      优点（按属性生成，非模板套话）
 *   tool.cons[]      注意事项
 *   tool.usageMode   'oss' | 'saas'  （决定使用步骤模板）
 *   tool.usage[]     使用步骤（已按模式展开为自然语言）
 *
 * 支持 lang=zh/de/es，其它语言 fallback 英文。
 * 运行：node scripts/enrich-detail.js --dry-run
 *       node scripts/enrich-detail.js --apply
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const COMMON_DIR = path.join(PUBLIC_DIR, 'common');

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJSON(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8'); }
const lc = function (s) { return String(s || '').toLowerCase(); };

/* ---------- 多语言文案表 ---------- */
const I18N = {
  zh: {
    openSource: '开源', closedSource: '闭源',
    localDeploy: '本地部署', docker: 'Docker', pythonPkg: 'Python 包', api: 'API 接口',
    webCloud: 'Web 云端', windows: 'Windows', macos: 'macOS', linux: 'Linux',
    license: '开源协议（详见仓库 LICENSE）',
    pro_open: '开源免费，代码透明可审计，可自托管保障数据可控',
    pro_saas: '开箱即用，无需本地安装与运维',
    pro_local: '支持本地 / Docker 部署，数据隐私更有保障',
    pro_python: 'Python 生态完善，便于二次开发与集成',
    pro_free: '提供免费版本，个人与小规模使用零成本',
    pro_freemium: '提供免费额度，可先试用再决定是否升级',
    pro_api: '提供 API，便于接入自动化工作流',
    con_tech: '需要一定技术基础完成部署与运行环境配置',
    con_paid: '高级功能与更高额度通常需要付费订阅',
    con_cloud: '依赖网络连接，离线环境无法使用',
    con_license: '务必关注许可证对商业用途的约束',
    con_default: '具体功能边界与限制以官方最新文档为准',
    env_check_title: '检查你的电脑环境',
    env_check_intro: '小白提示：这个工具需要在本地运行，先确认你的电脑满足基本条件。',
    env_check_tip_py: '需要安装 Python 3.10 或更高版本。',
    env_check_tip_node: '需要安装 Node.js 18 或更高版本。',
    env_check_tip_docker: '需要安装 Docker Desktop。',
    env_check_tip_default: '需要安装对应的运行环境（详见仓库 README）。',
    env_check_check: '打开终端输入 {{cmd}}，看到版本号说明环境 OK。',
    clone_title: '把代码下载到本地',
    clone_intro: '在桌面或你喜欢的文件夹里打开终端，复制下面的命令执行：',
    clone_tip: '第一次用 git 的同学：如果提示找不到 git，先去 https://git-scm.com 下载安装。',
    deps_title: '安装依赖',
    deps_intro: '项目需要一些额外的“积木”才能跑起来。',
    deps_tip: '如果命令报错，多半是网络问题。Python 用户可尝试 "pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple"。',
    key_title: '填入必要的 API Key / 账号配置',
    key_intro: '很多 AI 工具需要连接大模型，请按仓库 README 找到配置项并填入。',
    key_code_comment: '示例：把下面的 xxx 换成你的真实 Key',
    key_tip: '不要把 Key 截图发到公开群。建议先申请一个免费/低价 Key（如 GLM-4、DeepSeek）练手。',
    run_title: '启动并运行你的第一个任务',
    run_intro: '执行项目给出的示例命令，观察终端输出。',
    run_check: '如果看到程序正常打印结果（没有红色 Error 字样），说明你已经跑通了。',
    trouble_title: '遇到困难看这里',
    trouble_intro: '第一次本地部署失败很正常，常见问题：',
    trouble_1: '依赖版本不对 → 用仓库推荐的 Python/Node 版本；',
    trouble_2: 'Key 没生效 → 检查环境变量是否设置成功；',
    trouble_3: '网络连不上模型 API → 换国内镜像或换模型商。',
    trouble_tip: '本页下方「相关教程」里有更多具体示例，也可点击「访问官网」查看官方文档。',
    saas_1_title: '进入官网并注册账号',
    saas_1_intro: '点击下方红色「访问官网」按钮，进入 {{name}} 主页。找到「Sign Up / 注册」按钮，用邮箱或 Google/GitHub 账号登录。',
    saas_1_tip: '如果官网打不开，检查网络或稍后再试；也可尝试切换浏览器。',
    saas_2_title: '选择适合你的套餐',
    saas_2_intro: '新用户通常有免费试用或免费额度。建议先选 Free 档，熟悉后再决定是否升级。',
    saas_2_check: '注册成功后，你应该能看到控制台/仪表板（Dashboard）首页。',
    saas_3_title: '创建第一个任务 / 项目',
    saas_3_intro: '按界面引导点击「新建」或「Create New」，填入你的需求。大部分 SaaS 工具会给出模板，新手直接选第一个模板即可。',
    saas_3_tip: '不要一上来就填复杂需求，先用一句简单的话测试，例如「帮我把这份网页内容总结成 3 点」。',
    saas_4_title: '查看结果并保存',
    saas_4_intro: '工具处理完成后会显示结果。确认符合预期后可以导出、复制链接或保存到本地。',
    saas_4_check: '如果结果不满意，可点击「重新生成」或调整提示词再试一次。',
    saas_5_title: '进阶与省钱小技巧',
    saas_5_intro: '1. 先看官方 Quick Start / 文档，避免误用高消耗的模型；\n2. 关注免费额度用量，避免超额扣费；\n3. 本页「相关教程」里有国内访问与使用技巧，可继续参考。'
  },
  de: {
    openSource: 'Open Source', closedSource: 'Closed Source',
    localDeploy: 'Lokale Bereitstellung', docker: 'Docker', pythonPkg: 'Python-Paket', api: 'API-Schnittstelle',
    webCloud: 'Web-Cloud', windows: 'Windows', macos: 'macOS', linux: 'Linux',
    license: 'Open-Source-Lizenz (siehe LICENSE im Repository)',
    pro_open: 'Kostenlos und Open Source, transparenter Code, selbst hostbar für volle Datenkontrolle',
    pro_saas: 'Sofort einsatzbereit, keine lokale Installation oder Wartung nötig',
    pro_local: 'Lokale / Docker-Bereitstellung möglich, mehr Datenschutz',
    pro_python: 'Reiches Python-Ökosystem, einfach erweiterbar und integrierbar',
    pro_free: 'Kostenlose Version verfügbar, für Privatanwender ohne Kosten',
    pro_freemium: 'Kostenlose Teststufe, vor dem Upgrade ausprobieren',
    pro_api: 'Bietet API zur Einbindung in Automatisierungs-Workflows',
    con_tech: 'Technische Grundkenntnisse für Bereitstellung und Konfiguration erforderlich',
    con_paid: 'Erweiterte Funktionen und höhere Limits erfordern oft ein kostenpflichtiges Abo',
    con_cloud: 'Internetverbindung erforderlich, offline nicht nutzbar',
    con_license: 'Lizenzbedingungen für kommerzielle Nutzung beachten',
    con_default: 'Funktionsgrenzen und Einschränkungen siehe aktuelle offizielle Dokumentation',
    env_check_title: 'Prüfen Sie Ihre Umgebung',
    env_check_intro: 'Dieses Tool läuft lokal. Stellen Sie zuerst sicher, dass Ihr Computer die Voraussetzungen erfüllt.',
    env_check_tip_py: 'Python 3.10 oder höher muss installiert sein.',
    env_check_tip_node: 'Node.js 18 oder höher muss installiert sein.',
    env_check_tip_docker: 'Docker Desktop muss installiert sein.',
    env_check_tip_default: 'Installieren Sie die erforderliche Laufzeitumgebung (siehe README).',
    env_check_check: 'Geben Sie im Terminal {{cmd}} ein. Wenn die Versionsnummer erscheint, ist die Umgebung OK.',
    clone_title: 'Laden Sie den Code herunter',
    clone_intro: 'Öffnen Sie ein Terminal in einem Ordner Ihrer Wahl und führen Sie folgende Befehle aus:',
    clone_tip: 'Wenn git nicht gefunden wird, laden Sie es unter https://git-scm.com herunter.',
    deps_title: 'Installieren Sie Abhängigkeiten',
    deps_intro: 'Das Projekt benötigt zusätzliche Pakete, um zu laufen.',
    deps_tip: 'Bei Netzwerkproblemen können Sie alternative PyPI- oder npm-Spiegel verwenden.',
    key_title: 'API-Key / Konfiguration eintragen',
    key_intro: 'Viele KI-Tools benötigen einen API-Key. Tragen Sie ihn gemäß README ein.',
    key_code_comment: 'Beispiel: Ersetzen Sie xxx durch Ihren echten Key',
    key_tip: 'Teilen Sie Ihren Key nicht in öffentlichen Gruppen. Verwenden Sie für Tests einen günstigen Key.',
    run_title: 'Starten Sie Ihre erste Aufgabe',
    run_intro: 'Führen Sie das Beispiel-Skript aus und beobachten Sie die Ausgabe im Terminal.',
    run_check: 'Wenn das Programm Ergebnisse ausgibt und keine roten Error-Zeilen erscheinen, läuft es.',
    trouble_title: 'Bei Problemen',
    trouble_intro: 'Lokale Bereitstellung schlägt oft beim ersten Mal fehl. Häufige Ursachen:',
    trouble_1: 'Abhängigkeitsversion passt nicht → verwenden Sie die im Repository empfohlene Version;',
    trouble_2: 'Key wird nicht erkannt → prüfen Sie die Umgebungsvariablen;',
    trouble_3: 'Keine Verbindung zur Modell-API → wechseln Sie den Anbieter oder verwenden Sie einen Mirror.',
    trouble_tip: 'Weitere Beispiele finden Sie unten unter „Verwandte Anleitungen“ oder auf der offiziellen Website.',
    saas_1_title: 'Offizielle Website öffnen und registrieren',
    saas_1_intro: 'Klicken Sie auf den roten Button „Offizielle Website besuchen“ und registrieren Sie sich auf {{name}} mit E-Mail oder Google/GitHub.',
    saas_1_tip: 'Wenn die Website nicht lädt, prüfen Sie Ihre Verbindung oder probieren Sie einen anderen Browser.',
    saas_2_title: 'Passenden Tarif wählen',
    saas_2_intro: 'Neue Nutzer erhalten oft ein kostenloses Testkontingent. Wählen Sie zunächst die kostenlose Stufe.',
    saas_2_check: 'Nach der Registrierung sollten Sie das Dashboard sehen.',
    saas_3_title: 'Erste Aufgabe / Projekt erstellen',
    saas_3_intro: 'Klicken Sie auf „Neu“ oder „Create New“ und folgen Sie den Anleitungen. Wählen Sie für den Einstieg die erste Vorlage.',
    saas_3_tip: 'Testen Sie zuerst mit einer einfachen Anfrage, z.B. „Fasse diesen Text in 3 Punkten zusammen“.',
    saas_4_title: 'Ergebnis prüfen und speichern',
    saas_4_intro: 'Das Tool zeigt das Ergebnis an. Exportieren, kopieren oder speichern Sie es bei Bedarf.',
    saas_4_check: 'Bei falschen Ergebnissen können Sie die Eingabe anpassen und es erneut versuchen.',
    saas_5_title: 'Profitechniken & Kostensparmöglichkeiten',
    saas_5_intro: '1. Lesen Sie die offizielle Dokumentation, um teure Modelle zu vermeiden;\n2. Beobachten Sie das kostenlose Kontingent, um Überkosten zu vermeiden;\n3. Weitere Tipps finden Sie in den „Verwandte Anleitungen“.',
    code_env_py: 'python --version',
    code_env_node: 'node --version',
    code_env_docker: 'docker --version',
    code_env_default: '对应命令',
    code_deps_py: 'pip install -r requirements.txt',
    code_deps_node: 'npm install',
    code_deps_docker: 'docker build -t {{name}} .',
    code_deps_default: 'make install',
    code_run_py: 'python examples/hello.py',
    code_run_node: 'npm run example',
    code_run_docker: 'docker run -it --rm {{name}}',
    code_run_default: './run.sh'
  },
  es: {
    openSource: 'Código abierto', closedSource: 'Código cerrado',
    localDeploy: 'Implementación local', docker: 'Docker', pythonPkg: 'Paquete Python', api: 'API',
    webCloud: 'Nube web', windows: 'Windows', macos: 'macOS', linux: 'Linux',
    license: 'Licencia de código abierto (ver LICENSE en el repositorio)',
    pro_open: 'Gratis y de código abierto, código transparente, se puede autoalojar',
    pro_saas: 'Listo para usar, sin instalación ni mantenimiento local',
    pro_local: 'Implementación local / Docker, mayor privacidad de datos',
    pro_python: 'Ecosistema Python completo, fácil de extender e integrar',
    pro_free: 'Versión gratuita disponible, sin costo para uso personal',
    pro_freemium: 'Nivel gratuito disponible, prueba antes de actualizar',
    pro_api: 'Ofrece API para integrar en flujos de automatización',
    con_tech: 'Requiere conocimientos técnicos para implementar y configurar',
    con_paid: 'Funciones avanzadas y mayores límites suelen requerir suscripción de pago',
    con_cloud: 'Requiere conexión a Internet, no funciona sin conexión',
    con_license: 'Revise la licencia para uso comercial',
    con_default: 'Consulte la documentación oficial para límites y restricciones',
    env_check_title: 'Verifique su entorno',
    env_check_intro: 'Esta herramienta se ejecuta localmente. Asegúrese primero de que su equipo cumpla los requisitos.',
    env_check_tip_py: 'Debe tener Python 3.10 o superior instalado.',
    env_check_tip_node: 'Debe tener Node.js 18 o superior instalado.',
    env_check_tip_docker: 'Debe tener Docker Desktop instalado.',
    env_check_tip_default: 'Instale el entorno de ejecución requerido (ver README).',
    env_check_check: 'Escriba {{cmd}} en la terminal. Si aparece la versión, el entorno es correcto.',
    clone_title: 'Descargue el código',
    clone_intro: 'Abra una terminal en la carpeta que prefiera y ejecute los siguientes comandos:',
    clone_tip: 'Si git no se encuentra, descárguelo en https://git-scm.com.',
    deps_title: 'Instale las dependencias',
    deps_intro: 'El proyecto necesita paquetes adicionales para funcionar.',
    deps_tip: 'Si hay errores de red, pruebe con espejos alternativos de PyPI o npm.',
    key_title: 'Ingrese API-Key / configuración',
    key_intro: 'Muchas herramientas de IA requieren una API-Key. Ingrésela según el README.',
    key_code_comment: 'Ejemplo: reemplace xxx por su clave real',
    key_tip: 'No comparta su clave en grupos públicos. Use una clave económica para pruebas.',
    run_title: 'Ejecute su primera tarea',
    run_intro: 'Ejecute el script de ejemplo y observe la salida en la terminal.',
    run_check: 'Si el programa imprime resultados y no hay líneas rojas de Error, funciona correctamente.',
    trouble_title: 'Si tiene problemas',
    trouble_intro: 'La implementación local a menudo falla al primer intento. Causas comunes:',
    trouble_1: 'La versión de dependencias no coincide → use la versión recomendada en el repositorio;',
    trouble_2: 'La clave no se reconoce → verifique las variables de entorno;',
    trouble_3: 'No se conecta a la API del modelo → cambie de proveedor o use un espejo.',
    trouble_tip: 'Más ejemplos en „Tutoriales relacionados“ o en el sitio oficial.',
    saas_1_title: 'Abra el sitio oficial y regístrese',
    saas_1_intro: 'Haga clic en „Visitar sitio oficial" y regístrese en {{name}} con correo, Google o GitHub.',
    saas_1_tip: 'Si el sitio no carga, verifique su conexión o pruebe otro navegador.',
    saas_2_title: 'Elija un plan adecuado',
    saas_2_intro: 'Los nuevos usuarios suelen tener prueba gratuita. Comience con el nivel gratuito.',
    saas_2_check: 'Después de registrarse debería ver el panel de control (Dashboard).',
    saas_3_title: 'Cree su primera tarea / proyecto',
    saas_3_intro: 'Haga clic en „Nuevo" o „Create New" y siga las instrucciones. Para empezar, elija la primera plantilla.',
    saas_3_tip: 'Pruebe primero con una solicitud simple, por ejemplo: „Resume este texto en 3 puntos".',
    saas_4_title: 'Revise y guarde los resultados',
    saas_4_intro: 'La herramienta mostrará el resultado. Expórtelo, cópielo o guárdelo según necesite.',
    saas_4_check: 'Si el resultado no es correcto, ajuste la entrada e inténtelo de nuevo.',
    saas_5_title: 'Consejos avanzados y ahorro',
    saas_5_intro: '1. Lea la documentación oficial para evitar modelos costosos;\n2. Controle el uso del nivel gratuito para evitar cargos extras;\n3. Más consejos en „Tutoriales relacionados".',
    code_env_py: 'python --version',
    code_env_node: 'node --version',
    code_env_docker: 'docker --version',
    code_env_default: 'comando correspondiente',
    code_deps_py: 'pip install -r requirements.txt',
    code_deps_node: 'npm install',
    code_deps_docker: 'docker build -t {{name}} .',
    code_deps_default: 'make install',
    code_run_py: 'python examples/hello.py',
    code_run_node: 'npm run example',
    code_run_docker: 'docker run -it --rm {{name}}',
    code_run_default: './run.sh'
  },
  en: {
    openSource: 'Open Source', closedSource: 'Closed Source',
    localDeploy: 'Local Deploy', docker: 'Docker', pythonPkg: 'Python Package', api: 'API',
    webCloud: 'Web Cloud', windows: 'Windows', macos: 'macOS', linux: 'Linux',
    license: 'Open-source license (see LICENSE in repository)',
    pro_open: 'Free and open source, transparent code, self-hostable for full data control',
    pro_saas: 'Ready to use out of the box, no local install or maintenance',
    pro_local: 'Supports local / Docker deployment, better data privacy',
    pro_python: 'Rich Python ecosystem, easy to extend and integrate',
    pro_free: 'Free version available, zero cost for personal use',
    pro_freemium: 'Free tier available, try before you upgrade',
    pro_api: 'Provides API for automation workflows',
    con_tech: 'Requires some technical skill to deploy and configure',
    con_paid: 'Advanced features and higher limits usually require a paid plan',
    con_cloud: 'Requires internet connection, unusable offline',
    con_license: 'Mind the license terms for commercial use',
    con_default: 'Feature limits and restrictions per the official latest docs',
    env_check_title: 'Check your environment',
    env_check_intro: 'This tool runs locally. First make sure your computer meets the basics.',
    env_check_tip_py: 'Python 3.10 or newer is required.',
    env_check_tip_node: 'Node.js 18 or newer is required.',
    env_check_tip_docker: 'Docker Desktop is required.',
    env_check_tip_default: 'Install the required runtime (see README).',
    env_check_check: 'Open a terminal and type {{cmd}}. If you see a version number, your environment is OK.',
    clone_title: 'Download the code to your machine',
    clone_intro: 'Open a terminal in a folder you like and run the commands below:',
    clone_tip: 'New to git? If it says command not found, download it from https://git-scm.com.',
    deps_title: 'Install dependencies',
    deps_intro: 'The project needs some extra building blocks to run.',
    deps_tip: 'If a command errors, it is usually a network issue. Python users can try a mirror.',
    key_title: 'Fill in the API Key / account config',
    key_intro: 'Many AI tools need a model connection. Find the config item in the README and fill it in.',
    key_code_comment: 'Example: replace xxx with your real Key',
    key_tip: 'Do not screenshot your Key in public groups. Get a free/cheap Key (e.g. GLM-4, DeepSeek) to practice.',
    run_title: 'Start and run your first task',
    run_intro: 'Run the example command from the project and watch the terminal output.',
    run_check: 'If the program prints results (no red Error text), you have it working.',
    trouble_title: 'Troubleshooting',
    trouble_intro: 'Failing the first local deploy is normal. Common issues:',
    trouble_1: 'Dependency version mismatch → use the Python/Node version the repo recommends;',
    trouble_2: 'Key not working → check your environment variables;',
    trouble_3: 'Cannot reach the model API → switch mirror or provider.',
    trouble_tip: 'See more examples in "Related tutorials" below, or click "Visit official site".',
    saas_1_title: 'Open the official site and sign up',
    saas_1_intro: 'Click the red "Visit official site" button to open the {{name}} homepage. Find "Sign Up" and log in with email or Google/GitHub.',
    saas_1_tip: 'If the site won’t load, check your connection or try another browser.',
    saas_2_title: 'Pick the plan that fits you',
    saas_2_intro: 'New users usually get a free trial or free quota. Start with the Free tier before upgrading.',
    saas_2_check: 'After sign-up you should see the Dashboard home.',
    saas_3_title: 'Create your first task / project',
    saas_3_intro: 'Click "New" or "Create New" and follow the guide. Pick the first template to start.',
    saas_3_tip: 'Don’t start with a complex request. Test with one simple sentence, e.g. "Summarize this page into 3 points".',
    saas_4_title: 'Review and save the result',
    saas_4_intro: 'When done, the tool shows the result. Export, copy the link, or save locally.',
    saas_4_check: 'If unhappy, click "Regenerate" or tweak the prompt and try again.',
    saas_5_title: 'Advanced & money-saving tips',
    saas_5_intro: '1. Read the official Quick Start / docs to avoid costly models;\n2. Watch your free quota to avoid overcharges;\n3. See "Related tutorials" for more tips.',
    code_env_py: 'python --version',
    code_env_node: 'node --version',
    code_env_docker: 'docker --version',
    code_env_default: 'the command',
    code_deps_py: 'pip install -r requirements.txt',
    code_deps_node: 'npm install',
    code_deps_docker: 'docker build -t {{name}} .',
    code_deps_default: 'make install',
    code_run_py: 'python examples/hello.py',
    code_run_node: 'npm run example',
    code_run_docker: 'docker run -it --rm {{name}}',
    code_run_default: './run.sh'
  }
};

function t(lang, key, vars) {
  const lk = String(lang || 'zh').split('-')[0];
  const dict = I18N[lk] || I18N.zh;
  let txt = dict[key] || I18N.zh[key] || key;
  if (vars) {
    for (const k in vars) txt = txt.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), vars[k]);
  }
  return txt;
}

/* ---------- 启发式推导 ---------- */
function deriveMeta(tool, lang) {
  const url = lc(tool.url);
  const tags = (tool.tags || []).map(lc);
  const desc = lc(tool.desc);
  const blob = url + ' ' + tags.join(' ') + ' ' + desc;

  const openSource = /github\.com|gitlab\.com|gitee\.com/.test(url);

  // 定价
  let pricing = 'freemium';
  if (openSource) pricing = 'free';
  else if (/免费|free|gratis|kostenlos/.test(blob) && !/付费|订阅|subscription|premium|pro\b|bezahlt|paid/.test(blob)) pricing = 'free';
  else if (/付费|订阅|subscription|premium|pro\b|bezahlt|paid/.test(blob)) pricing = 'freemium';

  // 支持平台（按语言输出）
  const platforms = [];
  if (/docker/.test(blob)) platforms.push(t(lang, 'docker'));
  if (/本地部署|本地运行|自托管|self[\- ]?host|本地化|lokal|local/.test(blob) || openSource) {
    if (!platforms.includes(t(lang, 'localDeploy'))) platforms.push(t(lang, 'localDeploy'));
  }
  if (tags.includes('python') || /python/.test(blob)) platforms.push(t(lang, 'pythonPkg'));
  if (/api/.test(blob)) platforms.push(t(lang, 'api'));
  if (/windows/.test(blob)) platforms.push(t(lang, 'windows'));
  if (/mac|macos/.test(blob)) platforms.push(t(lang, 'macos'));
  if (/linux/.test(blob)) platforms.push(t(lang, 'linux'));
  if (/网页|web|云端|saas|在线|浏览器|web|cloud|nube/.test(blob)) platforms.push(t(lang, 'webCloud'));
  if (!platforms.length) platforms.push(t(lang, 'webCloud'));

  const license = openSource ? t(lang, 'license') : null;

  return {
    openSource: openSource,
    pricing: pricing,
    platforms: platforms,
    license: license,
    updated: t.updated || null
  };
}

function deriveProsCons(tool, meta, lang) {
  const tags = (tool.tags || []).map(lc);
  const blob = lc(tool.desc) + ' ' + tags.join(' ');
  const pros = [];
  const cons = [];

  if (meta.openSource) {
    pros.push(t(lang, 'pro_open'));
  } else {
    pros.push(t(lang, 'pro_saas'));
  }
  if (meta.platforms.includes(t(lang, 'localDeploy')) || meta.platforms.includes(t(lang, 'docker'))) {
    pros.push(t(lang, 'pro_local'));
  }
  if (meta.platforms.includes(t(lang, 'pythonPkg')) || tags.includes('python')) {
    pros.push(t(lang, 'pro_python'));
  }
  if (meta.pricing === 'free') {
    pros.push(t(lang, 'pro_free'));
  } else if (meta.pricing === 'freemium') {
    pros.push(t(lang, 'pro_freemium'));
  }
  if (/api/.test(blob)) pros.push(t(lang, 'pro_api'));

  if (meta.openSource) {
    cons.push(t(lang, 'con_tech'));
  }
  if (meta.pricing !== 'free') {
    cons.push(t(lang, 'con_paid'));
  }
  if (meta.platforms.includes(t(lang, 'webCloud'))) {
    cons.push(t(lang, 'con_cloud'));
  }
  if (/企业|商业可用|commercial|kommerziell/.test(blob)) {
    cons.push(t(lang, 'con_license'));
  }
  if (!cons.length) cons.push(t(lang, 'con_default'));
  if (pros.length > 4) pros.length = 4;
  if (cons.length > 3) cons.length = 3;
  return { pros, cons };
}

/* 生成小白友好的详细步骤；steps 元素支持多行标记：
 *   Step: 标题
 *   正文说明（可跨行）
 *   Code:\n多行命令\n
 *   Tip:\n小白提示\n
 *   Check:\n验证你是否成功\n
 */
function deriveUsage(tool, meta, lang) {
  const name = tool.originName || tool.name.replace(/（[^）]+）/g, '').trim();
  const repoMatch = String(tool.url || '').match(/github\.com\/([^/]+\/[^/]+)/);
  const repo = repoMatch ? repoMatch[1] : '';
  const py = meta.platforms.includes(t(lang, 'pythonPkg')) || (tool.tags || []).map(String).some(x => /python/i.test(x));
  const npm = /node|npm|javascript|js/i.test((tool.tags || []).join(' ') + ' ' + tool.desc);
  const docker = meta.platforms.includes(t(lang, 'docker'));
  const lk = String(lang || 'zh').split('-')[0];

  // 代码片段：中文用硬编码，de/es 从 I18N 读取
  const envCmd = py ? t(lang, 'code_env_py') : npm ? t(lang, 'code_env_node') : docker ? t(lang, 'code_env_docker') : t(lang, 'code_env_default');
  const depsCmd = py ? t(lang, 'code_deps_py') : npm ? t(lang, 'code_deps_node') : docker ? t(lang, 'code_deps_docker') : t(lang, 'code_deps_default');
  const runCmd = py ? t(lang, 'code_run_py') : npm ? t(lang, 'code_run_node') : docker ? t(lang, 'code_run_docker') : t(lang, 'code_run_default');

  // 中文保留原有更细腻的文案；de/es 用 I18N 表
  if (lk === 'zh') {
    if (meta.openSource) {
      const steps = [
        `Step: ${t(lang, 'env_check_title')}\n${t(lang, 'env_check_intro')}\nTip:\n` +
        (py ? t(lang, 'env_check_tip_py') : npm ? t(lang, 'env_check_tip_node') : docker ? t(lang, 'env_check_tip_docker') : t(lang, 'env_check_tip_default')) +
        `\nCheck:\n打开终端输入 \`${envCmd}\`，看到版本号说明环境 OK。`,
        `Step: ${t(lang, 'clone_title')}\n${t(lang, 'clone_intro')}\nCode:\n${repo ? `git clone https://github.com/${repo}.git\ncd ${repo.split('/')[1] || name}` : `git clone ${tool.url || '仓库地址'}\ncd ${name}`}\nTip:\n${t(lang, 'clone_tip')}`,
        `Step: ${t(lang, 'deps_title')}\n${t(lang, 'deps_intro')}\nCode:\n${depsCmd}\nTip:\n${t(lang, 'deps_tip')}`,
        `Step: ${t(lang, 'key_title')}\n${t(lang, 'key_intro')}\nCode:\n# 示例：把下面的 xxx 换成你的真实 Key\nexport OPENAI_API_KEY="sk-xxx"\nTip:\n${t(lang, 'key_tip')}`,
        `Step: ${t(lang, 'run_title')}\n${t(lang, 'run_intro')}\nCode:\n${runCmd}\nCheck:\n${t(lang, 'run_check')}`,
        `Step: ${t(lang, 'trouble_title')}\n${t(lang, 'trouble_intro')}\n1. ${t(lang, 'trouble_1')}\n2. ${t(lang, 'trouble_2')}\n3. ${t(lang, 'trouble_3')}\nTip:\n${t(lang, 'trouble_tip')}`
      ];
      return { mode: 'oss', steps };
    }
    return {
      mode: 'saas',
      steps: [
        `Step: ${t(lang, 'saas_1_title')}\n${t(lang, 'saas_1_intro', { name })}\nTip:\n${t(lang, 'saas_1_tip')}`,
        `Step: ${t(lang, 'saas_2_title')}\n${t(lang, 'saas_2_intro')}\nCheck:\n${t(lang, 'saas_2_check')}`,
        `Step: ${t(lang, 'saas_3_title')}\n${t(lang, 'saas_3_intro')}\nTip:\n${t(lang, 'saas_3_tip')}`,
        `Step: ${t(lang, 'saas_4_title')}\n${t(lang, 'saas_4_intro')}\nCheck:\n${t(lang, 'saas_4_check')}`,
        `Step: ${t(lang, 'saas_5_title')}\n${t(lang, 'saas_5_intro')}`
      ]
    };
  }

  // de / es / fallback
  if (meta.openSource) {
    const steps = [
      `Step: ${t(lang, 'env_check_title')}\n${t(lang, 'env_check_intro')}\nTip:\n${py ? t(lang, 'env_check_tip_py') : npm ? t(lang, 'env_check_tip_node') : docker ? t(lang, 'env_check_tip_docker') : t(lang, 'env_check_tip_default')}\nCheck:\n${t(lang, 'env_check_check', { cmd: '`' + envCmd + '`' })}`,
      `Step: ${t(lang, 'clone_title')}\n${t(lang, 'clone_intro')}\nCode:\n${repo ? `git clone https://github.com/${repo}.git\ncd ${repo.split('/')[1] || name}` : `git clone ${tool.url || '仓库地址'}\ncd ${name}`}\nTip:\n${t(lang, 'clone_tip')}`,
      `Step: ${t(lang, 'deps_title')}\n${t(lang, 'deps_intro')}\nCode:\n${depsCmd}\nTip:\n${t(lang, 'deps_tip')}`,
      `Step: ${t(lang, 'key_title')}\n${t(lang, 'key_intro')}\nCode:\n# ${t(lang, 'key_code_comment')}\nexport OPENAI_API_KEY="sk-xxx"\nTip:\n${t(lang, 'key_tip')}`,
      `Step: ${t(lang, 'run_title')}\n${t(lang, 'run_intro')}\nCode:\n${runCmd}\nCheck:\n${t(lang, 'run_check')}`,
      `Step: ${t(lang, 'trouble_title')}\n${t(lang, 'trouble_intro')}\n1. ${t(lang, 'trouble_1')}\n2. ${t(lang, 'trouble_2')}\n3. ${t(lang, 'trouble_3')}\nTip:\n${t(lang, 'trouble_tip')}`
    ];
    return { mode: 'oss', steps };
  }

  return {
    mode: 'saas',
    steps: [
      `Step: ${t(lang, 'saas_1_title')}\n${t(lang, 'saas_1_intro', { name })}\nTip:\n${t(lang, 'saas_1_tip')}`,
      `Step: ${t(lang, 'saas_2_title')}\n${t(lang, 'saas_2_intro')}\nCheck:\n${t(lang, 'saas_2_check')}`,
      `Step: ${t(lang, 'saas_3_title')}\n${t(lang, 'saas_3_intro')}\nTip:\n${t(lang, 'saas_3_tip')}`,
      `Step: ${t(lang, 'saas_4_title')}\n${t(lang, 'saas_4_intro')}\nCheck:\n${t(lang, 'saas_4_check')}`,
      `Step: ${t(lang, 'saas_5_title')}\n${t(lang, 'saas_5_intro')}`
    ]
  };
}

/* ---------- 站点处理 ---------- */
function processSite(siteDir, apply) {
  const cfgPath = path.join(siteDir, 'config.json');
  if (!fs.existsSync(cfgPath)) return;
  const cfg = loadJSON(cfgPath);
  const lang = String(cfg.lang || 'zh-CN').split('-')[0];

  const dataPath = path.join(siteDir, 'data', 'list.json');
  if (!fs.existsSync(dataPath)) return;
  const data = loadJSON(dataPath);

  let changed = 0;
  for (const t of (data.tools || [])) {
    const meta = deriveMeta(t, lang);
    const pc = deriveProsCons(t, meta, lang);
    const usage = deriveUsage(t, meta, lang);
    const next = Object.assign({}, t, {
      meta: meta,
      pros: pc.pros,
      cons: pc.cons,
      usageMode: usage.mode,
      usage: usage.steps
    });
    // 仅当字段确实变化时计入 changed
    if (JSON.stringify(next) !== JSON.stringify(t)) {
      Object.assign(t, next);
      changed++;
    }
  }
  if (changed) {
    if (apply) saveJSON(dataPath, data);
    console.log((apply ? '✓ ' : '· '), path.relative(PUBLIC_DIR, siteDir), apply ? '富化 ' : '需富化 ', changed, '个工具详情元数据 [lang=' + lang + ']');
  } else {
    console.log('·', path.relative(PUBLIC_DIR, siteDir), '已是最新 [lang=' + lang + ']');
  }
}

function main() {
  const apply = process.argv.includes('--apply');
  if (!apply) console.log('（dry-run，未写盘。加 --apply 真正写入）\n');
  const domainMap = loadJSON(path.join(COMMON_DIR, 'domain-map.json'));
  const dirs = new Set(Object.values(domainMap.map || {}));
  for (const d of dirs) processSite(path.join(PUBLIC_DIR, d), apply);
  if (!apply) console.log('\n— dry-run 结束，确认无误后加 --apply —');
}

main();