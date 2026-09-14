const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const PptxGenJS = require("pptxgenjs");
const {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat,
  PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableOfContents,
  TableRow, TextRun, VerticalAlign, WidthType,
} = require("docx");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "deliverables");
const assetDir = path.join(outDir, "assets");
fs.mkdirSync(assetDir, { recursive: true });

const colors = { ink: "17324D", green: "167B68", greenSoft: "DDEFEA", orange: "E36A3D", mist: "EDF2F3", paper: "FCFDFC", blue: "4B729B", soft: "687D8F", white: "FFFFFF", line: "DCE5E8" };
const fonts = { body: "Microsoft YaHei", heading: "Microsoft YaHei" };

const svg = (content, width = 1400, height = 700) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#FCFDFC"/><style>text{font-family:'Microsoft YaHei','Arial',sans-serif;fill:#17324D}.title{font-size:36px;font-weight:700}.label{font-size:27px;font-weight:700}.small{font-size:21px;fill:#687D8F}.box{fill:#fff;stroke:#DCE5E8;stroke-width:3}.accent{fill:#DDEFEA;stroke:#167B68;stroke-width:3}.arrow{stroke:#4B729B;stroke-width:5;fill:none;marker-end:url(#a)}</style><defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#4B729B"/></marker></defs>${content}</svg>`;

async function makeDiagrams() {
  const architecture = svg(`
    <text class="title" x="55" y="62">MVC 分层与本地运行边界</text>
    <rect class="accent" x="70" y="145" rx="22" width="260" height="130"/><text class="label" x="145" y="202">View</text><text class="small" x="110" y="240">HTML / CSS / DOM</text>
    <rect class="box" x="570" y="145" rx="22" width="260" height="130"/><text class="label" x="635" y="202">Controller</text><text class="small" x="610" y="240">交互编排与校验</text>
    <rect class="accent" x="1070" y="145" rx="22" width="260" height="130"/><text class="label" x="1140" y="202">Model</text><text class="small" x="1100" y="240">领域规则与计算</text>
    <path class="arrow" d="M330 210 H555"/><path class="arrow" d="M830 210 H1055"/>
    <rect class="box" x="1070" y="430" rx="22" width="260" height="120"/><text class="label" x="1113" y="480">localStorage</text><text class="small" x="1110" y="520">浏览器本地持久化</text>
    <path class="arrow" d="M1200 275 V415"/>
    <rect class="box" x="70" y="430" rx="22" width="760" height="120"/><text class="label" x="105" y="482">Java 17 本地静态服务器</text><text class="small" x="105" y="522">仅监听 127.0.0.1 · CSP · 路径约束 · GET/HEAD</text>
    <path class="arrow" d="M450 430 V292 H200 V290"/>`);
  const observer = svg(`
    <text class="title" x="55" y="62">观察者模式：一次变更，全部视图一致刷新</text>
    <rect class="box" x="70" y="150" rx="20" width="250" height="110"/><text class="label" x="118" y="208">用户操作</text>
    <rect class="box" x="420" y="150" rx="20" width="280" height="110"/><text class="label" x="465" y="208">AppController</text>
    <rect class="accent" x="800" y="150" rx="20" width="300" height="110"/><text class="label" x="850" y="198">FinanceStore</text><text class="small" x="855" y="232">Subject / 主题</text>
    <rect class="box" x="800" y="430" rx="20" width="300" height="110"/><text class="label" x="850" y="478">DashboardView</text><text class="small" x="866" y="512">Observer / 观察者</text>
    <path class="arrow" d="M320 205 H405"/><text class="small" x="330" y="185">click / submit</text>
    <path class="arrow" d="M700 205 H785"/><text class="small" x="718" y="185">调用</text>
    <path class="arrow" d="M950 260 V415"/><text class="small" x="970" y="350">publish(event)</text>
    <path class="arrow" d="M785 485 H560 V275"/><text class="small" x="575" y="465">render(snapshot)</text>`);
  const dataModel = svg(`
    <text class="title" x="55" y="62">核心数据对象与关系</text>
    <rect class="accent" x="540" y="120" rx="20" width="320" height="150"/><text class="label" x="615" y="165">Transaction</text><text class="small" x="575" y="205">账户 · 类型 · 金额(分)</text><text class="small" x="575" y="238">日期 · 分类 · 批次标识</text>
    <rect class="box" x="70" y="400" rx="20" width="280" height="130"/><text class="label" x="150" y="450">Account</text><text class="small" x="110" y="490">1 ← N 笔交易</text>
    <rect class="box" x="410" y="400" rx="20" width="260" height="130"/><text class="label" x="485" y="450">Budget</text><text class="small" x="448" y="490">按月 + 分类聚合</text>
    <rect class="box" x="730" y="400" rx="20" width="260" height="130"/><text class="label" x="815" y="450">Goal</text><text class="small" x="772" y="490">独立进度与期限</text>
    <rect class="box" x="1050" y="400" rx="20" width="280" height="130"/><text class="label" x="1092" y="450">ImportBatch</text><text class="small" x="1090" y="490">1 ← N 笔导入交易</text>
    <path class="arrow" d="M580 270 L260 385"/><path class="arrow" d="M650 270 L555 385"/><path class="arrow" d="M800 270 L860 385"/><path class="arrow" d="M850 270 L1160 385"/>`);
  const diagrams = { architecture, observer, dataModel };
  for (const [name, markup] of Object.entries(diagrams)) {
    await sharp(Buffer.from(markup)).png().toFile(path.join(assetDir, `${name}.png`));
  }
}

const text = (value, options = {}) => new TextRun({ text: value, font: fonts.body, size: 22, color: colors.ink, ...options });
const p = (value, options = {}) => new Paragraph({ children: [text(value)], spacing: { after: 140, line: 360 }, alignment: AlignmentType.JUSTIFIED, ...options });
const h = (value, level = HeadingLevel.HEADING_1, pageBreakBefore = false) => new Paragraph({ text: value, heading: level, pageBreakBefore, spacing: { before: 180, after: 140 } });
const bullet = (value, level = 0) => new Paragraph({ children: [text(value)], numbering: { reference: "body-bullets", level }, spacing: { after: 80, line: 320 } });
const imageParagraph = (file, width, height, caption) => [
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: fs.readFileSync(file), transformation: { width, height }, type: "png" })], spacing: { before: 120, after: 80 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [text(caption, { italics: true, size: 18, color: colors.soft })], spacing: { after: 180 } }),
];
const cell = (value, header = false) => new TableCell({
  shading: header ? { type: ShadingType.CLEAR, fill: colors.ink, color: "auto" } : { type: ShadingType.CLEAR, fill: colors.paper, color: "auto" },
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 100, bottom: 100, left: 120, right: 120 },
  children: [new Paragraph({ children: [text(value, { bold: header, color: header ? colors.white : colors.ink, size: 19 })] })],
});
const table = (headers, rows, widths) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  columnWidths: widths,
  rows: [new TableRow({ children: headers.map((v) => cell(v, true)), tableHeader: true }), ...rows.map((row) => new TableRow({ children: row.map((v) => cell(v)) }))],
  borders: { top: { style: BorderStyle.SINGLE, color: colors.line, size: 4 }, bottom: { style: BorderStyle.SINGLE, color: colors.line, size: 4 }, left: { style: BorderStyle.SINGLE, color: colors.line, size: 4 }, right: { style: BorderStyle.SINGLE, color: colors.line, size: 4 }, insideHorizontal: { style: BorderStyle.SINGLE, color: colors.line, size: 3 }, insideVertical: { style: BorderStyle.SINGLE, color: colors.line, size: 3 } },
});

async function makeReport() {
  const architecture = path.join(assetDir, "architecture.png");
  const observer = path.join(assetDir, "observer.png");
  const dataModel = path.join(assetDir, "dataModel.png");
  const dashboard = path.join(root, "tests", "artifacts", "dashboard-desktop.png");
  const reports = path.join(root, "tests", "artifacts", "reports-desktop.png");
  const children = [
    new Paragraph({ spacing: { before: 900, after: 260 }, alignment: AlignmentType.CENTER, children: [text("蚌埠学院", { bold: true, size: 42, color: colors.ink })] }),
    new Paragraph({ spacing: { before: 620, after: 180 }, alignment: AlignmentType.CENTER, children: [text("软件系统设计与体系结构综合实训", { bold: true, size: 34, color: colors.green })] }),
    new Paragraph({ spacing: { after: 750 }, alignment: AlignmentType.CENTER, children: [text("综合实训设计报告", { bold: true, size: 50, color: colors.ink })] }),
    new Paragraph({ spacing: { after: 520 }, alignment: AlignmentType.CENTER, children: [text("个人财务管理与可视化看板", { bold: true, size: 38, color: colors.blue })] }),
    table(["项目", "请填写"], [["学院", "计算机与信息工程学院"], ["姓名", "【请填写姓名】"], ["学号", "【请填写学号】"], ["班级", "【请填写班级】"], ["指导教师", "【请填写指导教师】"], ["完成日期", "2026 年 9 月"]], [2800, 5600]),
    new Paragraph({ children: [new PageBreak()] }),
    h("摘  要", HeadingLevel.HEADING_1),
    p("本项目设计并实现了一套本地优先的个人财务管理与可视化看板“一目”。系统面向拥有多个支付账户、希望建立预算与储蓄习惯的个人用户，围绕账户、交易、预算、目标和报表形成完整业务闭环。用户可以录入收入、支出和账户间转账，系统根据可追溯交易实时推导账户余额、净资产、月度现金流和预算使用状态；同时支持 CSV 账单导入、重复识别、批次撤销、目标进度管理、原始数据导出和彻底删除。"),
    p("系统采用 MVC 分层架构和观察者模式。Model 集中封装金额、余额与报表计算规则，Controller 负责交互编排，View 根据只读状态渲染响应式界面。金额统一以整数分存储，避免浮点累计误差；本地服务器仅监听回环地址，并通过路径约束、内容安全策略和响应头降低本地演示风险。项目提供 30 项自动化测试、真实浏览器回归脚本、Java 17 可执行 JAR 和一键启动脚本，能够满足课程实训的设计、实现、测试、部署与答辩要求。"),
    p("关键词：个人财务；MVC；观察者模式；可视化看板；本地优先；软件体系结构"),
    new Paragraph({ children: [new PageBreak()] }),
    h("目  录", HeadingLevel.HEADING_1),
    new TableOfContents("目录", { hyperlink: true, headingStyleRange: "1-3" }),
    h("1 项目概述", HeadingLevel.HEADING_1, true),
    h("1.1 项目背景", HeadingLevel.HEADING_2),
    p("个人财务数据通常分散在银行卡、第三方支付、现金和信用账户中。传统记账工具容易停留在流水堆积层面，用户仍然难以快速回答“钱在哪里、钱花到哪里、下一步如何调整”。本项目将交易记录作为唯一可追溯事实来源，用统一账户视图、预算节奏、目标进度和趋势报表把记录转化为可执行信息。"),
    h("1.2 建设目标", HeadingLevel.HEADING_2),
    bullet("在一个界面中统一管理资产账户、负债账户及其动态余额。"),
    bullet("完整支持收入、支出、转账的新增、编辑、删除和查询。"),
    bullet("提供月度预算、财务目标、六个月现金流和支出分类分析。"),
    bullet("提供 CSV 导入、重复识别、批次撤销、JSON 导出和数据彻底删除。"),
    bullet("以 MVC 和观察者模式体现体系结构设计，并提供自动化测试与可执行程序。"),
    h("1.3 范围与边界", HeadingLevel.HEADING_2),
    p("课程提交版定位为单用户、本地优先应用，不包含用户注册、云端同步、多人权限、实时金融行情和投资建议。该边界既降低敏感财务数据外泄面，也使体系结构、领域规则和测试证据可以在无网络环境下完整演示。"),
    h("2 需求分析", HeadingLevel.HEADING_1, true),
    h("2.1 功能需求", HeadingLevel.HEADING_2),
    table(["模块", "核心功能", "完成情况"], [
      ["财务概览", "净资产、收支、结余率、资金轨迹、最近交易", "已完成"],
      ["交易管理", "收入/支出/转账、编辑、删除、筛选与搜索", "已完成"],
      ["账户管理", "资产/负债账户、期初余额、实时余额", "已完成"],
      ["预算管理", "月度分类预算、阈值状态、删除", "已完成"],
      ["目标管理", "储蓄/还债目标、新增、更新、删除", "已完成"],
      ["分析报表", "六个月现金流、分类结构、本月洞察", "已完成"],
      ["数据管理", "CSV 导入、重复识别、批次撤销、JSON 导出、彻底删除", "已完成"],
    ], [1900, 5200, 1300]),
    h("2.2 非功能需求", HeadingLevel.HEADING_2),
    bullet("易用性：桌面端和移动端均可操作；表单字段具备明确标签；金额可一键隐藏。"),
    bullet("正确性：金额以整数分计算；转账不计入收支；账户和交易必须满足引用完整性。"),
    bullet("安全性：用户输入输出编码；CSV 大小和字段校验；服务端限制方法、路径和内容类型。"),
    bullet("可维护性：Model、View、Controller 职责分离；计算函数保持纯函数，便于单元测试。"),
    bullet("可部署性：提供 Java 17 可执行 JAR、Node 开发服务器和一键运行脚本。"),
    h("3 总体设计", HeadingLevel.HEADING_1, true),
    h("3.1 体系结构选择", HeadingLevel.HEADING_2),
    p("系统采用 MVC 分层体系结构。表现层由响应式 HTML/CSS 与 DashboardView 组成；控制层由 AppController 统一处理导航、表单、筛选、导入导出和高影响确认；领域层由 FinanceStore 与一组纯计算函数组成；持久化层使用 localStorage，并通过 Java 或 Node 本地服务器交付静态资源。该结构使业务规则与界面实现解耦，后续可以在保持 View/Controller 大部分接口不变的情况下替换为 REST API 和数据库。"),
    ...imageParagraph(architecture, 650, 325, "图 3-1  系统 MVC 分层与本地运行边界"),
    h("3.2 模块划分", HeadingLevel.HEADING_2),
    table(["层次", "主要文件", "职责"], [["组装入口", "src/app.js", "创建 Store、View、Controller 并启动"], ["控制层", "src/controller/app-controller.js", "处理用户事件和业务流程"], ["模型层", "src/model/finance-model.js", "状态、校验、计算、持久化与通知"], ["视图层", "src/view/dashboard-view.js", "渲染六个业务页面和可视化"], ["演示数据", "src/data/seed-data.js", "首次启动时提供可讲解数据"], ["部署层", "src/main/java/.../Main.java", "本地静态资源服务与安全响应头"]], [1600, 3000, 3800]),
    h("4 详细设计", HeadingLevel.HEADING_1, true),
    h("4.1 核心数据模型", HeadingLevel.HEADING_2),
    ...imageParagraph(dataModel, 650, 325, "图 4-1  核心数据对象与关联"),
    table(["对象", "关键字段", "设计说明"], [["Account", "id, name, kind, openingBalanceCents", "账户只保存期初值，实时余额由交易推导"], ["Transaction", "type, amountCents, date, accountId", "收入、支出、转账统一建模"], ["Budget", "month, category, limitCents", "月份与分类构成逻辑唯一键"], ["Goal", "targetCents, currentCents, targetDate", "支持储蓄与还债目标"], ["ImportBatch", "id, transactionCount, status", "保存导入批次并支持整批撤销"]], [1500, 3500, 3400]),
    h("4.2 关键计算规则", HeadingLevel.HEADING_2),
    bullet("资产余额 = 期初余额 + 收入 + 转入 − 支出 − 转出。"),
    bullet("负债余额 = 期初未偿金额 + 消费支出 − 还款转入。"),
    bullet("净资产 = 资产账户余额合计 − 负债账户余额合计。"),
    bullet("结余率 =（收入 − 支出）÷ 收入；收入为零时显示“不适用”。"),
    bullet("预算使用率低于 80% 为正常，达到 80% 为提醒，达到 100% 为超支。"),
    bullet("转账只改变相关账户余额，不进入收入、支出和净现金流统计。"),
    h("4.3 关键业务流程", HeadingLevel.HEADING_2),
    p("新增交易流程为：用户打开表单并选择类型 → Controller 读取并规范化字段 → Store 校验金额和账户引用 → 状态写入 localStorage → Store 发布具名变更事件 → Controller 取得新快照 → View 同步刷新余额、看板、预算和报表。编辑与删除交易复用同一条通知链，因此不会出现局部界面更新而其他指标滞后的问题。"),
    h("5 设计模式应用", HeadingLevel.HEADING_1, true),
    h("5.1 观察者模式", HeadingLevel.HEADING_2),
    p("FinanceStore 作为主题维护观察者集合，subscribe 用于订阅，所有成功写操作在持久化后发布事件。AppController 订阅状态变更并调用 DashboardView.render。这样，新增交易等业务操作无需知道有哪些界面组件依赖它，降低了模型与 DOM 的耦合。"),
    ...imageParagraph(observer, 650, 325, "图 5-1  观察者模式协作过程"),
    h("5.2 策略化计算与适配点", HeadingLevel.HEADING_2),
    p("账户余额、月度汇总、预算进度、现金流序列和分类结构均实现为独立纯函数，可以视为可替换的计算策略。持久化通过统一 load/save 入口与业务操作隔离，当前适配 localStorage，未来可替换为远程仓储；服务器实现也同时提供 Node 开发形态和 Java 交付形态。"),
    h("6 系统实现", HeadingLevel.HEADING_1, true),
    h("6.1 页面与交互", HeadingLevel.HEADING_2),
    p("系统使用深海军蓝、克制绿色和橙色告警构成统一视觉语言。左侧导航在移动端转换为底部六宫格；概览页将净资产和本月现金流置于首要层级；交易、预算和目标均提供明确的创建及维护入口；报表页同时呈现趋势、结构和文字洞察。"),
    ...(fs.existsSync(dashboard) ? imageParagraph(dashboard, 650, 451, "图 6-1  财务概览桌面端界面") : []),
    ...(fs.existsSync(reports) ? imageParagraph(reports, 650, 451, "图 6-2  分析报表界面") : []),
    h("6.2 数据导入与可追溯性", HeadingLevel.HEADING_2),
    p("CSV 解析器支持中文表头和带引号字段，将元转换为整数分。重复指纹由日期、金额、账户和商户组合构成，疑似重复项必须经用户确认后跳过。每次导入形成独立 ImportBatch，并把 batchId 写入相关交易；撤销批次时按该标识精确删除，状态保留为已撤销，便于说明数据变化来源。"),
    h("6.3 打包与运行", HeadingLevel.HEADING_2),
    p("Maven 在构建时把 index.html、styles.css 与 src 下的 JavaScript 复制到 JAR 的 web 目录，Main 类使用 JDK 自带 HttpServer 从类路径读取资源。程序默认只绑定 127.0.0.1:4173，运行后浏览器访问该地址即可。run.bat 封装了 java -jar 命令，适合课堂现场演示。"),
    h("7 测试与质量保证", HeadingLevel.HEADING_1, true),
    h("7.1 测试方法", HeadingLevel.HEADING_2),
    table(["测试层次", "覆盖内容", "结果"], [["领域单元测试", "余额、净资产、预算边界、CSV、重复识别、观察者、目标、报表、清空", "全部通过"], ["结构与安全测试", "MVC 组装、六页面、可访问表单、路径穿越、隐藏目录、JAR 配置", "全部通过"], ["文档检查", "必需章节与 Markdown 内部链接", "全部通过"], ["浏览器回归", "交易编辑、搜索筛选、导入撤销、预算、目标、报表、响应式截图", "全部通过"]], [1800, 5000, 1600]),
    h("7.2 关键测试用例", HeadingLevel.HEADING_2),
    table(["编号", "场景", "预期结果"], [["T01", "资产账户发生收入、支出和转账", "余额按规则准确更新"], ["T02", "信用卡消费后通过资产账户还款", "负债先增加后减少"], ["T03", "收入为零时计算结余率", "返回不适用，无 Infinity/NaN"], ["T04", "CSV 含引号商户并重复导入", "正确解析并提示疑似重复"], ["T05", "撤销一个导入批次", "仅移除该批次交易并重算指标"], ["T06", "访问编码路径穿越地址", "服务器拒绝并不暴露文件"], ["T07", "切换到报表页", "趋势、分类结构和洞察均可见"]], [1000, 4100, 3300]),
    p("截至提交版本，Node 自动化测试共 32 项，全部通过；真实 Chromium 回归执行通过，页面无控制台错误。测试命令为 npm run validate 和 npm run test:browser。"),
    h("8 安全性与可靠性", HeadingLevel.HEADING_1, true),
    bullet("所有写入 innerHTML 的用户字段统一做 HTML 实体编码，降低存储型脚本注入风险。"),
    bullet("CSV 内容上限为 2MB；交易金额必须为正；账户引用必须存在；编辑不存在记录时拒绝静默创建。"),
    bullet("Java 与 Node 服务器都只允许 GET/HEAD，拒绝路径穿越和隐藏目录访问。"),
    bullet("响应包含 CSP、X-Content-Type-Options、X-Frame-Options 和 Referrer-Policy。"),
    bullet("清空全部数据、删除交易、撤销导入等高影响操作均需用户确认。"),
    bullet("本地存储不宣称提供多用户隔离；若产品化，必须增加认证授权、服务端事务、传输和静态加密。"),
    h("9 项目成果与总结", HeadingLevel.HEADING_1, true),
    p("本项目完成了从需求分析、产品设计、体系结构设计、详细设计到编码、测试和部署的完整实训链路。系统不以静态原型结束，而是交付可直接运行的 Java 程序和配套源代码；核心业务闭环、报表分析、数据治理及安全边界均有实现与测试证据。MVC 使关注点清晰分离，观察者模式保证不同视图对同一状态变更保持一致，整数分和纯函数计算提高了财务数据的正确性与可测试性。"),
    p("后续可以在保持领域接口稳定的基础上增加登录与服务端数据库、可视化字段映射、分类维护、年度预算和多端同步。本次实训说明了体系结构并非形式化图示，而是直接影响代码可读性、变化成本、测试难度和部署可靠性的工程决策。"),
    h("10 小组分工", HeadingLevel.HEADING_1, true),
    table(["成员", "学号", "主要工作", "贡献比例"], [["【请填写】", "【请填写】", "需求分析、体系结构设计、前端实现、测试与文档", "100%（个人项目）"], ["【如为小组请新增】", "【请填写】", "【请填写实际分工】", "【请填写】"]], [1800, 1800, 3900, 1200]),
    h("参考文献", HeadingLevel.HEADING_1, true),
    p("[1] 软件系统设计与体系结构综合实训指导书，蚌埠学院计算机与信息工程学院。"),
    p("[2] Gamma E, Helm R, Johnson R, Vlissides J. Design Patterns: Elements of Reusable Object-Oriented Software. Addison-Wesley, 1994."),
    p("[3] Fielding R. Architectural Styles and the Design of Network-based Software Architectures. University of California, Irvine, 2000."),
    p("[4] WHATWG. HTML Living Standard. 表单、Dialog、Web Storage 相关规范。"),
  ];

  const doc = new Document({
    creator: "一目项目组", title: "个人财务管理与可视化看板综合实训设计报告", subject: "软件系统设计与体系结构综合实训",
    styles: {
      default: { document: { run: { font: fonts.body, size: 22, color: colors.ink }, paragraph: { spacing: { line: 360 } } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { font: fonts.heading, size: 44, bold: true, color: colors.ink }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 180, after: 220 } } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: fonts.heading, size: 32, bold: true, color: colors.ink }, paragraph: { outlineLevel: 0, spacing: { before: 260, after: 160 }, keepNext: true } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: fonts.heading, size: 26, bold: true, color: colors.green }, paragraph: { outlineLevel: 1, spacing: { before: 200, after: 120 }, keepNext: true } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: fonts.heading, size: 23, bold: true, color: colors.blue }, paragraph: { outlineLevel: 2, spacing: { before: 160, after: 100 }, keepNext: true } },
      ],
    },
    numbering: { config: [{ reference: "body-bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 520, hanging: 260 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [text("一目 · 个人财务管理与可视化看板    ", { size: 17, color: colors.soft }), new TextRun({ children: [PageNumber.CURRENT], size: 17, color: colors.soft })] })] }) },
      children,
    }],
  });
  fs.writeFileSync(path.join(outDir, "个人财务管理与可视化看板-综合实训设计报告.docx"), await Packer.toBuffer(doc));
}

function addTitle(slide, title, number, kicker = "软件系统设计与体系结构综合实训") {
  slide.background = { color: colors.paper };
  slide.addText(kicker, { x: 0.75, y: 0.35, w: 7.6, h: 0.28, fontFace: fonts.body, fontSize: 9, color: colors.green, bold: true, charSpacing: 1.5, margin: 0 });
  slide.addText(title, { x: 0.75, y: 0.75, w: 11.6, h: 0.65, fontFace: fonts.heading, fontSize: 28, bold: true, color: colors.ink, margin: 0, breakLine: false, fit: "shrink" });
  slide.addShape("line", { x: 0.75, y: 1.48, w: 11.85, h: 0, line: { color: colors.line, width: 1 } });
  slide.addText(String(number).padStart(2, "0"), { x: 12.15, y: 7.05, w: 0.45, h: 0.2, fontSize: 8, color: colors.soft, align: "right", margin: 0 });
}
function addCard(slide, x, y, w, hgt, title, body, accent = colors.green) {
  slide.addShape("roundRect", { x, y, w, h: hgt, rectRadius: 0.08, fill: { color: colors.white }, line: { color: colors.line, width: 1 } });
  slide.addShape("rect", { x, y, w: 0.07, h: hgt, fill: { color: accent }, line: { color: accent } });
  slide.addText(title, { x: x + 0.25, y: y + 0.18, w: w - 0.45, h: 0.32, fontFace: fonts.heading, fontSize: 16, bold: true, color: colors.ink, margin: 0, fit: "shrink" });
  slide.addText(body, { x: x + 0.25, y: y + 0.62, w: w - 0.45, h: hgt - 0.78, fontFace: fonts.body, fontSize: 11.5, color: colors.soft, breakLine: false, margin: 0, valign: "top", fit: "shrink" });
}
function addNotes(slide, notes) { slide.addNotes(notes); }

async function makePresentation() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "一目项目组";
  pptx.subject = "软件系统设计与体系结构综合实训答辩";
  pptx.title = "个人财务管理与可视化看板";
  pptx.company = "蚌埠学院计算机与信息工程学院";
  pptx.lang = "zh-CN";
  pptx.theme = { headFontFace: fonts.heading, bodyFontFace: fonts.body, lang: "zh-CN" };

  let slide = pptx.addSlide();
  slide.background = { color: colors.ink };
  slide.addShape("rect", { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: colors.green }, line: { color: colors.green } });
  slide.addText("软件系统设计与体系结构综合实训", { x: 0.85, y: 0.72, w: 7, h: 0.35, fontSize: 11, bold: true, color: "86D3C4", charSpacing: 1.8, margin: 0 });
  slide.addText("个人财务管理与\n可视化看板", { x: 0.85, y: 1.42, w: 7.2, h: 1.65, fontSize: 34, bold: true, color: colors.white, margin: 0, breakLine: false, fit: "shrink" });
  slide.addText("让每一笔交易，都能解释一个财务结论", { x: 0.88, y: 3.42, w: 6.1, h: 0.45, fontSize: 16, color: "DCE5EB", margin: 0 });
  slide.addShape("roundRect", { x: 8.6, y: 1.2, w: 3.65, h: 4.75, fill: { color: colors.white, transparency: 5 }, line: { color: "33536F" }, radius: 0.08 });
  slide.addText("一目", { x: 9.1, y: 2.1, w: 2.65, h: 0.8, fontSize: 36, bold: true, color: colors.green, align: "center", margin: 0 });
  slide.addText("账户 · 交易 · 预算\n目标 · 报表 · 数据治理", { x: 9.05, y: 3.25, w: 2.75, h: 1.0, fontSize: 14, color: colors.ink, align: "center", breakLine: false, margin: 0, fit: "shrink" });
  slide.addText("姓名：【请填写】   学号：【请填写】\n班级：【请填写】   指导教师：【请填写】", { x: 0.88, y: 5.75, w: 6.8, h: 0.75, fontSize: 12, color: "B9CAD5", breakLine: false, margin: 0 });
  addNotes(slide, "开场说明：本项目不是静态原型，而是一套可运行、可测试、可打包的课程提交版。先介绍为什么做，再展示体系结构和现场演示路径。");

  slide = pptx.addSlide(); addTitle(slide, "01  从流水记录到财务决策", 2);
  slide.addText("用户真正需要回答的不是“记了几笔”，而是三个连续问题", { x: 0.78, y: 1.82, w: 7.6, h: 0.45, fontSize: 16, color: colors.soft, margin: 0 });
  addCard(slide, 0.8, 2.55, 3.65, 2.65, "钱在哪里？", "统一资产与负债账户\n从期初余额和交易实时推导当前净资产", colors.blue);
  addCard(slide, 4.85, 2.55, 3.65, 2.65, "花到哪里？", "按月汇总收入与支出\n用预算阈值、分类结构和趋势定位变化", colors.orange);
  addCard(slide, 8.9, 2.55, 3.65, 2.65, "下一步怎么做？", "把结余转化为储蓄或还债目标\n通过本月洞察给出克制、可解释的行动建议", colors.green);
  slide.addText("核心闭环", { x: 0.8, y: 5.75, w: 1.1, h: 0.3, fontSize: 11, bold: true, color: colors.green, margin: 0 });
  slide.addText("记录  →  校验  →  汇总  →  发现偏差  →  调整行动", { x: 1.9, y: 5.68, w: 8.8, h: 0.45, fontSize: 18, bold: true, color: colors.ink, margin: 0 });
  addNotes(slide, "说明产品价值链。强调系统以可解释的指标与行动入口为终点，而不只是保存流水。范围是单用户、本地优先。");

  slide = pptx.addSlide(); addTitle(slide, "02  六个业务模块形成完整闭环", 3);
  const modules = [["财务概览", "净资产 / 收支 / 资金轨迹", colors.green], ["交易管理", "新增 / 编辑 / 筛选 / 删除", colors.blue], ["账户管理", "资产 / 负债 / 动态余额", colors.ink], ["预算管理", "分类额度 / 阈值 / 删除", colors.orange], ["目标管理", "储蓄 / 还债 / 进度", colors.green], ["分析报表", "六个月趋势 / 分类结构", colors.blue]];
  modules.forEach(([title, body, accent], index) => addCard(slide, 0.8 + (index % 3) * 4.08, 1.82 + Math.floor(index / 3) * 2.1, 3.65, 1.65, title, body, accent));
  slide.addShape("roundRect", { x: 0.8, y: 6.05, w: 11.8, h: 0.65, fill: { color: colors.greenSoft }, line: { color: colors.greenSoft } });
  slide.addText("数据治理贯穿全局：CSV 导入 · 重复识别 · 批次撤销 · JSON 导出 · 彻底删除", { x: 1.05, y: 6.21, w: 11.3, h: 0.28, fontSize: 13, bold: true, color: colors.green, align: "center", margin: 0 });
  addNotes(slide, "按导航顺序讲解六个页面。重点指出数据治理不是独立孤岛，而是贯穿交易和所有派生指标。");

  slide = pptx.addSlide(); addTitle(slide, "03  MVC：把变化控制在清晰边界内", 4);
  slide.addImage({ path: path.join(assetDir, "architecture.png"), x: 0.75, y: 1.7, w: 7.25, h: 3.62 });
  addCard(slide, 8.35, 1.72, 4.15, 1.2, "Model", "封装状态、校验、整数分计算与持久化；不依赖 DOM。", colors.green);
  addCard(slide, 8.35, 3.12, 4.15, 1.2, "Controller", "编排表单、导航、导入导出和高影响确认。", colors.blue);
  addCard(slide, 8.35, 4.52, 4.15, 1.2, "View", "消费只读快照，统一渲染六个业务视图。", colors.orange);
  slide.addText("可替换点：localStorage → REST/数据库；Node 开发服务器 → Java 交付程序", { x: 0.85, y: 6.15, w: 11.5, h: 0.35, fontSize: 13, color: colors.soft, align: "center", margin: 0 });
  addNotes(slide, "解释每层只做什么，以及为什么余额、报表计算必须放在 Model。指出未来切换后端时，界面与大部分控制逻辑可保持不变。");

  slide = pptx.addSlide(); addTitle(slide, "04  观察者模式保证所有指标同步", 5);
  slide.addImage({ path: path.join(assetDir, "observer.png"), x: 0.85, y: 1.7, w: 7.1, h: 3.55 });
  slide.addText("新增一笔交易后", { x: 8.35, y: 1.82, w: 3.8, h: 0.4, fontSize: 18, bold: true, color: colors.ink, margin: 0 });
  const steps = ["① Store 校验账户和金额", "② 写入本地状态并持久化", "③ 发布 transaction:add 事件", "④ Controller 获取最新快照", "⑤ 余额、预算、图表、报表同时刷新"];
  steps.forEach((s, i) => slide.addText(s, { x: 8.35, y: 2.45 + i * 0.62, w: 3.9, h: 0.34, fontSize: 13, color: i === 4 ? colors.green : colors.soft, bold: i === 4, margin: 0 }));
  slide.addShape("roundRect", { x: 8.3, y: 5.75, w: 4.05, h: 0.75, fill: { color: colors.greenSoft }, line: { color: colors.greenSoft } });
  slide.addText("收益：低耦合、一致性、可测试", { x: 8.55, y: 5.97, w: 3.55, h: 0.25, fontSize: 14, bold: true, color: colors.green, align: "center", margin: 0 });
  addNotes(slide, "以‘新增 50 元咖啡支出’为例走一遍事件链。观察者模式使 Model 不需要知道页面上有多少卡片或图表。");

  slide = pptx.addSlide(); addTitle(slide, "05  正确性从数据模型开始", 6);
  slide.addImage({ path: path.join(assetDir, "dataModel.png"), x: 0.75, y: 1.65, w: 6.7, h: 3.35 });
  addCard(slide, 7.8, 1.68, 4.72, 1.25, "整数分", "100.01 元存为 10001，避免二进制浮点累计误差。", colors.green);
  addCard(slide, 7.8, 3.13, 4.72, 1.25, "交易可追溯", "账户只保存期初值；当前余额由全部相关交易推导。", colors.blue);
  addCard(slide, 7.8, 4.58, 4.72, 1.25, "统计口径", "转账抵消，不进入收入、支出和净现金流；零收入不计算结余率。", colors.orange);
  slide.addText("净资产 = 资产余额合计 − 负债余额合计", { x: 0.85, y: 5.55, w: 6.45, h: 0.55, fontSize: 20, bold: true, color: colors.ink, align: "center", margin: 0 });
  addNotes(slide, "这页重点回答财务软件如何保证计算可信。可现场举例说明转账不应该同时放大收入和支出。");

  slide = pptx.addSlide(); addTitle(slide, "06  核心界面：一眼看清财务状态", 7);
  const dashboard = path.join(root, "tests", "artifacts", "dashboard-desktop.png");
  if (fs.existsSync(dashboard)) slide.addImage({ path: dashboard, x: 0.75, y: 1.66, w: 8.3, h: 5.05 });
  addCard(slide, 9.35, 1.68, 3.15, 1.25, "首要指标", "净资产、本月收支、结余率", colors.green);
  addCard(slide, 9.35, 3.18, 3.15, 1.25, "可追溯", "最近交易是每个汇总数字的来源", colors.blue);
  addCard(slide, 9.35, 4.68, 3.15, 1.25, "跨端适配", "桌面侧栏在移动端转换为底部导航", colors.orange);
  addNotes(slide, "演示首页时先切换金额隐藏，再新增一笔交易，让净现金流、最近交易和账户余额同时变化。");

  slide = pptx.addSlide(); addTitle(slide, "07  报表把记录转化为行动", 8);
  const reports = path.join(root, "tests", "artifacts", "reports-desktop.png");
  if (fs.existsSync(reports)) slide.addImage({ path: reports, x: 0.75, y: 1.66, w: 8.3, h: 5.05 });
  addCard(slide, 9.35, 1.68, 3.15, 1.25, "趋势", "最近六个月收入与支出并列比较", colors.green);
  addCard(slide, 9.35, 3.18, 3.15, 1.25, "结构", "支出分类按金额排序并展示占比", colors.blue);
  addCard(slide, 9.35, 4.68, 3.15, 1.25, "洞察", "根据净现金流给出可解释的文字建议", colors.orange);
  addNotes(slide, "说明图表数据全部来自同一个交易集合，切换月份即可重算。强调洞察是规则化建议，不是投资建议。");

  slide = pptx.addSlide(); addTitle(slide, "08  安全与可靠性是提交版的一部分", 9);
  const safeguards = [["输入与输出", "字段长度/金额/类型校验\nHTML 实体编码", colors.green], ["导入安全", "文件不超过 2MB\n重复识别与批次撤销", colors.blue], ["服务边界", "仅 127.0.0.1\n只允许 GET / HEAD", colors.ink], ["路径安全", "拒绝路径穿越\n拒绝 .git 等隐藏目录", colors.orange], ["浏览器策略", "CSP / nosniff\n禁止 iframe 嵌入", colors.green], ["用户主权", "JSON 导出\n高风险删除必须确认", colors.blue]];
  safeguards.forEach(([a, b, c], i) => addCard(slide, 0.8 + (i % 3) * 4.08, 1.82 + Math.floor(i / 3) * 2.15, 3.65, 1.72, a, b, c));
  slide.addText("边界声明：localStorage 适合课程单用户演示；产品化必须补充认证、授权、加密和备份", { x: 0.9, y: 6.18, w: 11.55, h: 0.35, fontSize: 12.5, color: colors.soft, align: "center", margin: 0 });
  addNotes(slide, "说明我们没有把本地存储包装成生产级安全。安全设计包括技术控制，也包括清晰的信任边界声明。");

  slide = pptx.addSlide(); addTitle(slide, "09  测试证据与可执行交付", 10);
  slide.addText("32", { x: 0.9, y: 1.78, w: 2.1, h: 0.9, fontSize: 48, bold: true, color: colors.green, align: "center", margin: 0 });
  slide.addText("自动化测试全部通过", { x: 0.9, y: 2.73, w: 2.1, h: 0.35, fontSize: 12, color: colors.soft, align: "center", margin: 0 });
  slide.addText("4", { x: 3.55, y: 1.78, w: 2.1, h: 0.9, fontSize: 48, bold: true, color: colors.blue, align: "center", margin: 0 });
  slide.addText("测试层次", { x: 3.55, y: 2.73, w: 2.1, h: 0.35, fontSize: 12, color: colors.soft, align: "center", margin: 0 });
  slide.addText("0", { x: 6.2, y: 1.78, w: 2.1, h: 0.9, fontSize: 48, bold: true, color: colors.orange, align: "center", margin: 0 });
  slide.addText("浏览器控制台错误", { x: 6.2, y: 2.73, w: 2.1, h: 0.35, fontSize: 12, color: colors.soft, align: "center", margin: 0 });
  addCard(slide, 8.85, 1.75, 3.65, 1.45, "一键运行", "run.bat → Java 17 可执行 JAR\n访问 http://127.0.0.1:4173", colors.green);
  addCard(slide, 0.9, 3.65, 3.55, 1.65, "单元测试", "余额、净资产、预算边界、CSV、观察者、目标和报表", colors.green);
  addCard(slide, 4.83, 3.65, 3.55, 1.65, "结构 / 安全测试", "MVC 页面结构、路径穿越、隐藏目录和安全响应头", colors.blue);
  addCard(slide, 8.76, 3.65, 3.55, 1.65, "真实浏览器回归", "交易编辑、导入撤销、预算、目标、报表和响应式布局", colors.orange);
  slide.addShape("roundRect", { x: 2.1, y: 5.87, w: 9.1, h: 0.65, fill: { color: colors.ink }, line: { color: colors.ink } });
  slide.addText("交付：源代码 + JAR + 报告 + PPT + 测试脚本 + 提交说明", { x: 2.35, y: 6.05, w: 8.6, h: 0.26, fontSize: 13, bold: true, color: colors.white, align: "center", margin: 0 });
  addNotes(slide, "如果老师问如何证明不是静态页面，可现场运行 npm run validate，再双击 run.bat 启动 JAR。浏览器测试还会真实填写表单并截图。");

  slide = pptx.addSlide();
  slide.background = { color: colors.ink };
  slide.addText("总结", { x: 0.9, y: 0.78, w: 2, h: 0.38, fontSize: 12, bold: true, color: "86D3C4", charSpacing: 2, margin: 0 });
  slide.addText("体系结构最终要回答：\n系统能否正确、清晰地应对变化？", { x: 0.9, y: 1.45, w: 7.0, h: 1.35, fontSize: 30, bold: true, color: colors.white, margin: 0, fit: "shrink" });
  slide.addText("本项目给出的答案", { x: 0.93, y: 3.33, w: 2.2, h: 0.3, fontSize: 12, bold: true, color: "86D3C4", margin: 0 });
  slide.addText("MVC 划分职责  ·  观察者保证一致性  ·  整数分保证正确性\n自动化测试证明行为  ·  可执行 JAR 完成交付", { x: 0.93, y: 3.85, w: 7.55, h: 1.0, fontSize: 17, color: "DCE5EB", breakLine: false, margin: 0, fit: "shrink" });
  slide.addShape("roundRect", { x: 9.2, y: 1.55, w: 3.05, h: 3.75, fill: { color: colors.white }, line: { color: "33536F" } });
  slide.addText("Q & A", { x: 9.55, y: 2.4, w: 2.35, h: 0.7, fontSize: 34, bold: true, color: colors.green, align: "center", margin: 0 });
  slide.addText("谢谢老师", { x: 9.55, y: 3.55, w: 2.35, h: 0.4, fontSize: 15, color: colors.ink, align: "center", margin: 0 });
  slide.addText("演示地址\n127.0.0.1:4173", { x: 9.55, y: 4.25, w: 2.35, h: 0.55, fontSize: 10, color: colors.soft, align: "center", margin: 0 });
  slide.addText("【请填写姓名】 · 2026", { x: 0.93, y: 6.42, w: 4, h: 0.25, fontSize: 10, color: "8EA4B5", margin: 0 });
  addNotes(slide, "结束后进入现场演示。建议顺序：概览 → 新增交易 → 预算 → 报表 → 数据导出。然后回答问题。");

  await pptx.writeFile({ fileName: path.join(outDir, "个人财务管理与可视化看板-答辩演示.pptx") });
}

(async () => {
  await makeDiagrams();
  await makeReport();
  await makePresentation();
  console.log(`Generated deliverables in ${outDir}`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
