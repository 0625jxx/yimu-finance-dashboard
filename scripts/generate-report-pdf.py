from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "deliverables" / "个人财务管理与可视化看板-综合实训设计报告.pdf"
ASSETS = ROOT / "deliverables" / "assets"
SCREENSHOTS = ROOT / "tests" / "artifacts"

pdfmetrics.registerFont(TTFont("CN", r"C:\Windows\Fonts\simhei.ttf"))

INK = colors.HexColor("#17324D")
GREEN = colors.HexColor("#167B68")
BLUE = colors.HexColor("#4B729B")
ORANGE = colors.HexColor("#E36A3D")
MIST = colors.HexColor("#EDF2F3")
LINE = colors.HexColor("#DCE5E8")
SOFT = colors.HexColor("#687D8F")


class ReportDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, leftMargin=2.2 * cm, rightMargin=2.2 * cm,
                         topMargin=2.0 * cm, bottomMargin=1.8 * cm,
                         title="个人财务管理与可视化看板综合实训设计报告",
                         author="一目项目组")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates(PageTemplate(id="main", frames=frame, onPage=self._footer))

    def _footer(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.line(self.leftMargin, 1.35 * cm, A4[0] - self.rightMargin, 1.35 * cm)
        canvas.setFont("CN", 8)
        canvas.setFillColor(SOFT)
        canvas.drawString(self.leftMargin, 0.9 * cm, "一目 · 个人财务管理与可视化看板")
        canvas.drawRightString(A4[0] - self.rightMargin, 0.9 * cm, str(doc.page))
        canvas.restoreState()


styles = getSampleStyleSheet()
body = ParagraphStyle("BodyCN", fontName="CN", fontSize=10.5, leading=18, textColor=INK,
                      alignment=TA_JUSTIFY, spaceAfter=8)
h1 = ParagraphStyle("H1CN", fontName="CN", fontSize=18, leading=25, textColor=INK,
                    spaceBefore=8, spaceAfter=12, keepWithNext=True)
h2 = ParagraphStyle("H2CN", fontName="CN", fontSize=13.5, leading=20, textColor=GREEN,
                    spaceBefore=10, spaceAfter=7, keepWithNext=True)
caption = ParagraphStyle("CaptionCN", fontName="CN", fontSize=8.5, leading=13, textColor=SOFT,
                         alignment=TA_CENTER, spaceAfter=10)
small = ParagraphStyle("SmallCN", fontName="CN", fontSize=8.5, leading=13, textColor=SOFT)
cover = ParagraphStyle("Cover", fontName="CN", fontSize=27, leading=40, textColor=INK,
                       alignment=TA_CENTER, spaceAfter=18)


def P(text):
    return Paragraph(text, body)


def H1(text):
    return Paragraph(text, h1)


def H2(text):
    return Paragraph(text, h2)


def bullets(items):
    return [Paragraph(f"- {item}", ParagraphStyle("bullet", parent=body, leftIndent=14, firstLineIndent=-10,
                                                   spaceAfter=4)) for item in items]


def data_table(headers, rows, widths=None):
    data = [[Paragraph(str(value), ParagraphStyle("th", parent=small, textColor=colors.white,
                                                  alignment=TA_CENTER)) for value in headers]]
    for row in rows:
        data.append([Paragraph(str(value), small) for value in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="CENTER")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F9FA")]),
    ]))
    return table


def figure(path, width, height, label):
    return KeepTogether([Image(str(path), width=width, height=height), Paragraph(label, caption)])


story = [
    Spacer(1, 1.1 * cm),
    Paragraph("蚌埠学院", ParagraphStyle("school", parent=cover, fontSize=23, textColor=INK)),
    Spacer(1, 1.0 * cm),
    Paragraph("软件系统设计与体系结构综合实训", ParagraphStyle("course", parent=cover, fontSize=18, textColor=GREEN)),
    Paragraph("综合实训设计报告", cover),
    Spacer(1, 0.9 * cm),
    Paragraph("个人财务管理与可视化看板", ParagraphStyle("project", parent=cover, fontSize=22, textColor=BLUE)),
    Spacer(1, 1.0 * cm),
    data_table(["项目", "请填写"], [
        ["学院", "计算机与信息工程学院"], ["姓名", "【请填写姓名】"], ["学号", "【请填写学号】"],
        ["班级", "【请填写班级】"], ["指导教师", "【请填写指导教师】"], ["完成日期", "2026 年 9 月"]
    ], [4.2 * cm, 9.5 * cm]),
    PageBreak(),
    H1("摘  要"),
    P("本项目设计并实现了一套本地优先的个人财务管理与可视化看板“一目”。系统围绕账户、交易、预算、目标和报表形成完整业务闭环。用户可以录入收入、支出和账户间转账，系统根据可追溯交易实时推导账户余额、净资产、月度现金流和预算状态；同时支持 CSV 账单导入、重复识别、批次撤销、目标进度、原始数据导出和彻底删除。"),
    P("系统采用 MVC 分层架构和观察者模式。Model 集中封装金额、余额与报表计算规则，Controller 负责交互编排，View 根据只读状态渲染响应式界面。金额统一以整数分存储；本地服务器仅监听回环地址，并通过路径约束、内容安全策略和安全响应头降低风险。项目提供 30 项自动化测试、真实浏览器回归脚本、Java 17 可执行 JAR 和一键启动脚本，满足课程实训的设计、实现、测试、部署与答辩要求。"),
    P("<b>关键词：</b>个人财务；MVC；观察者模式；可视化看板；本地优先；软件体系结构"),
    PageBreak(),
    H1("1 项目概述"), H2("1.1 项目背景"),
    P("个人财务数据通常分散在银行卡、第三方支付、现金和信用账户中。传统记账工具容易停留在流水堆积层面，用户仍难以快速回答“钱在哪里、钱花到哪里、下一步如何调整”。本项目将交易记录作为唯一可追溯事实来源，用统一账户视图、预算节奏、目标进度和趋势报表把记录转化为可执行信息。"),
    H2("1.2 建设目标"),
    *bullets(["统一管理资产账户、负债账户及其动态余额。", "支持收入、支出、转账的新增、编辑、删除和查询。", "提供月度预算、财务目标、六个月现金流和支出分类分析。", "提供 CSV 导入、重复识别、批次撤销、JSON 导出和数据彻底删除。", "以 MVC 和观察者模式体现体系结构设计，并提供自动化测试与可执行程序。"]),
    H2("1.3 范围与边界"),
    P("课程提交版定位为单用户、本地优先应用，不包含用户注册、云端同步、多人权限、实时金融行情和投资建议。该边界降低敏感财务数据外泄面，也使体系结构、领域规则和测试证据可以在无网络环境下完整演示。"),
    H1("2 需求分析"), H2("2.1 功能需求"),
    data_table(["模块", "核心功能", "完成"], [
        ["财务概览", "净资产、收支、结余率、轨迹、最近交易", "是"], ["交易管理", "收入/支出/转账、编辑、删除、筛选", "是"],
        ["账户管理", "资产/负债账户、期初余额、实时余额", "是"], ["预算管理", "月度分类预算、阈值状态、删除", "是"],
        ["目标管理", "储蓄/还债目标、新增、更新、删除", "是"], ["分析报表", "六个月现金流、分类结构、本月洞察", "是"],
        ["数据治理", "CSV 导入、重复识别、撤销、导出、清空", "是"]
    ], [3.0 * cm, 10.2 * cm, 1.5 * cm]),
    H2("2.2 非功能需求"),
    *bullets(["易用：桌面和移动端均可操作；金额可一键隐藏。", "正确：整数分计算；转账不计入收支；账户引用完整。", "安全：输出编码；CSV 限制；服务器限制方法、路径和内容类型。", "可维护：Model、View、Controller 职责分离；计算函数可独立测试。", "可部署：同时提供 Java 17 JAR、Node 开发服务器和一键运行脚本。"]),
    PageBreak(), H1("3 总体设计"), H2("3.1 MVC 体系结构"),
    P("表现层由响应式 HTML/CSS 与 DashboardView 组成；控制层由 AppController 统一处理导航、表单、导入导出和高影响确认；领域层由 FinanceStore 与纯计算函数组成；持久化层使用 localStorage，并通过 Java 或 Node 本地服务器交付静态资源。"),
    figure(ASSETS / "architecture.png", 16.0 * cm, 8.0 * cm, "图 3-1  系统 MVC 分层与本地运行边界"),
    H2("3.2 模块职责"),
    data_table(["层次", "主要文件", "职责"], [
        ["入口", "src/app.js", "组装并启动系统"], ["控制层", "app-controller.js", "交互与业务流程"],
        ["模型层", "finance-model.js", "状态、校验、计算和通知"], ["视图层", "dashboard-view.js", "六个业务页面及可视化"],
        ["部署层", "Main.java", "本地静态资源服务与安全头"]
    ], [2.5 * cm, 5.0 * cm, 7.2 * cm]),
    PageBreak(), H1("4 详细设计"), H2("4.1 核心数据模型"),
    figure(ASSETS / "dataModel.png", 16.0 * cm, 8.0 * cm, "图 4-1  核心数据对象与关联"),
    data_table(["对象", "关键字段", "说明"], [
        ["Account", "id, kind, openingBalanceCents", "当前余额由交易推导"],
        ["Transaction", "type, amountCents, date, accountId", "收入、支出、转账统一建模"],
        ["Budget", "month, category, limitCents", "月份和分类为逻辑唯一键"],
        ["Goal", "targetCents, currentCents, targetDate", "储蓄或还债进度"],
        ["ImportBatch", "id, transactionCount, status", "批次可追溯和整批撤销"]
    ], [2.7 * cm, 6.2 * cm, 5.8 * cm]),
    H2("4.2 关键计算规则"),
    *bullets(["资产余额 = 期初余额 + 收入 + 转入 - 支出 - 转出。", "负债余额 = 期初未偿金额 + 消费支出 - 还款转入。", "净资产 = 资产余额合计 - 负债余额合计。", "结余率 = (收入 - 支出) / 收入；收入为零时显示不适用。", "预算使用率低于 80% 为正常，达到 80% 为提醒，达到 100% 为超支。", "转账只改变相关账户余额，不进入收入、支出和净现金流统计。"]),
    PageBreak(), H1("5 设计模式应用"), H2("5.1 观察者模式"),
    P("FinanceStore 作为主题维护观察者集合。所有成功写操作在持久化后发布具名事件，AppController 订阅变更并调用 DashboardView.render。模型无需知道有多少界面组件依赖它，从而降低耦合并保证不同视图同步。"),
    figure(ASSETS / "observer.png", 16.0 * cm, 8.0 * cm, "图 5-1  观察者模式协作过程"),
    H2("5.2 策略化计算与适配点"),
    P("账户余额、月度汇总、预算进度、现金流序列和分类结构均为独立纯函数，可作为可替换的计算策略。持久化通过统一入口与业务操作隔离，当前适配 localStorage，未来可替换为远程仓储。"),
    PageBreak(), H1("6 系统实现"), H2("6.1 核心界面"),
    P("系统使用深海军蓝、克制绿色和橙色告警构成统一视觉语言。左侧导航在移动端转换为底部六宫格；概览页将净资产和本月现金流置于首要层级；报表页同时呈现趋势、结构和文字洞察。"),
    figure(SCREENSHOTS / "dashboard-desktop.png", 16.0 * cm, 11.1 * cm, "图 6-1  财务概览桌面端界面"),
    PageBreak(), H2("6.2 分析报表"),
    figure(SCREENSHOTS / "reports-desktop.png", 16.0 * cm, 11.1 * cm, "图 6-2  分析报表界面"),
    H2("6.3 数据导入与部署"),
    P("CSV 解析器支持中文表头和带引号字段，将元转换为整数分。重复指纹由日期、金额、账户和商户组合构成。每次导入形成独立批次并写入关联交易，撤销时只删除该批次。Maven 将 Web 资源打入 JAR，Main 类使用 JDK HttpServer 仅绑定 127.0.0.1:4173；run.bat 封装启动命令。"),
    PageBreak(), H1("7 测试与质量保证"), H2("7.1 测试层次"),
    data_table(["层次", "覆盖内容", "结果"], [
        ["领域单元测试", "余额、净资产、预算、CSV、观察者、目标、报表、清空", "通过"],
        ["结构与安全", "MVC、六页面、表单、路径穿越、隐藏目录、JAR 配置", "通过"],
        ["文档检查", "必需章节与内部链接", "通过"],
        ["浏览器回归", "编辑、筛选、导入撤销、预算、目标、报表、响应式", "通过"]
    ], [3.0 * cm, 10.0 * cm, 1.7 * cm]),
    H2("7.2 代表性测试用例"),
    data_table(["编号", "场景", "预期"], [
        ["T01", "资产账户发生收入、支出和转账", "余额正确"], ["T02", "信用卡消费后还款", "负债先增后减"],
        ["T03", "收入为零时计算结余率", "显示不适用"], ["T04", "重复导入 CSV", "提示并跳过"],
        ["T05", "撤销导入批次", "只移除关联交易"], ["T06", "访问路径穿越地址", "服务器拒绝"],
        ["T07", "切换报表页", "趋势和分类可见"]
    ], [1.5 * cm, 8.1 * cm, 5.1 * cm]),
    P("截至提交版本，Node 自动化测试共 32 项，全部通过；真实 Chromium 回归执行通过，页面无控制台错误。测试命令为 npm run validate 和 npm run test:browser。"),
    H1("8 安全性与可靠性"),
    *bullets(["用户字段在进入 innerHTML 前统一做 HTML 实体编码。", "CSV 上限为 2MB；金额必须为正；账户引用必须存在。", "Java 与 Node 服务器只允许 GET/HEAD，拒绝路径穿越和隐藏目录。", "响应包含 CSP、nosniff、禁止嵌入和来源策略。", "清空数据、删除交易和撤销批次都必须确认。", "产品化时仍需补充认证、授权、服务端事务、加密与备份。"]),
    PageBreak(), H1("9 项目总结"),
    P("本项目完成了从需求分析、产品设计、体系结构设计、详细设计到编码、测试和部署的完整实训链路。系统交付可直接运行的 Java 程序和配套源代码；核心业务闭环、报表分析、数据治理及安全边界均有实现与测试证据。MVC 使关注点清晰分离，观察者模式保证不同视图对同一状态变更保持一致，整数分和纯函数计算提高了财务数据的正确性与可测试性。"),
    P("后续可以在保持领域接口稳定的基础上增加登录与服务端数据库、可视化字段映射、分类维护、年度预算和多端同步。本次实训说明了体系结构会直接影响代码可读性、变化成本、测试难度和部署可靠性。"),
    H1("10 小组分工"),
    data_table(["成员", "学号", "主要工作", "贡献比例"], [["【请填写】", "【请填写】", "需求、架构、实现、测试与文档", "100%（个人）"], ["【如为小组请新增】", "【请填写】", "【请填写实际分工】", "【请填写】"]], [3.0 * cm, 3.0 * cm, 6.0 * cm, 2.7 * cm]),
    H1("参考文献"),
    P("[1] 软件系统设计与体系结构综合实训指导书，蚌埠学院计算机与信息工程学院。<br/>[2] Gamma E, Helm R, Johnson R, Vlissides J. Design Patterns. Addison-Wesley, 1994.<br/>[3] Fielding R. Architectural Styles and the Design of Network-based Software Architectures, 2000.<br/>[4] WHATWG. HTML Living Standard. 表单、Dialog 与 Web Storage 相关规范。"),
]

ReportDoc(str(OUT)).build(story)
print(f"Generated {OUT}")
