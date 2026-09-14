# 一目个人财务看板：课程提交版技术设计

| 项目 | 内容 |
| --- | --- |
| 版本 | v1.0 |
| 更新日期 | 2026-09-14 |
| 技术形态 | 原生 JavaScript 响应式 Web 应用 |
| 数据模式 | SQLite 本地数据库；开发模式降级为浏览器本地存储 |

## 1. 实现目标

当前版本聚焦“账户—交易—预算—目标—看板”闭环：用户新增或编辑一笔交易后，账户余额、净资产、现金流、图表和预算进度在同一次状态变更中刷新。实现不依赖第三方运行时库，便于在实训环境中直接启动、阅读和演示。

当前版本是可运行、可测试、可独立打包的课程实训提交版。Java 17 交付程序提供同源 REST API，并把账户、交易、预算、目标和导入批次规范化存入 SQLite。课程版本仍不包含登录、云端同步和多人协作；若进入真实生产环境，需要补充身份认证、授权、传输加密和备份策略。

## 2. MVC 体系结构

```mermaid
flowchart LR
    U[用户操作] --> C[Controller\nAppController]
    C --> M[Model\nfinance-model]
    M --> A[Persistence Adapter]
    A -->|JAR 模式| R[REST API]
    R --> S[(SQLite)]
    A -->|Node 降级| L[(localStorage)]
    M -->|状态事件| C
    V --> D[DOM 页面]
    D --> U
```

- Model：保存账户、交易、预算和目标数据，负责整数分金额计算、账户余额、月度汇总、预算状态、CSV 解析和重复识别。
- View：把只读状态渲染为看板、交易、账户和预算四个页面，不直接修改业务数据。
- Controller：接收导航、表单、筛选、导入和导出事件，校验交互规则后调用 Model，再驱动 View 更新。
- Persistence：Model 每次成功变更后调用适配器；JAR 模式写入本机 SQLite，Node 开发模式在 API 不可用时回退到 `localStorage`。

代码位置：

```text
src/
├── app.js                         # 组装入口
├── controller/app-controller.js  # Controller
├── model/finance-model.js         # Model 与领域规则
├── view/dashboard-view.js         # View
└── data/seed-data.js              # 首次体验数据
```

## 3. 观察者模式

`createFinanceStore` 是主题（Subject），Controller 订阅它的状态变更。新增交易、删除交易、添加账户、导入数据或修改预算后，Store 发布具名事件；Controller 收到通知并把最新只读快照交给 View 渲染。这使业务变更与具体 DOM 操作解耦。

```mermaid
classDiagram
    class FinanceStore {
      -state
      -observers
      +subscribe(observer)
      +addTransaction(transaction)
      +updateTransaction(id, transaction)
      +removeTransaction(id)
      +addAccount(account)
      +setBudget(budget)
      +saveGoal(goal)
      +importTransactions(transactions, batch)
      +undoImportBatch(id)
    }
    class AppController {
      +start()
      +render()
      +addTransaction(event)
    }
    class DashboardView {
      +render(state, ui)
    }
    AppController --> FinanceStore : 调用领域操作
    FinanceStore --> AppController : 发布状态事件
    AppController --> DashboardView : 传入只读快照
```

## 4. 关键业务规则

所有金额使用整数“分”存储和累计，避免浮点误差。

- 资产账户：收入增加余额，支出和转出减少余额，转入增加余额。
- 负债账户：消费增加未偿金额，还款转入减少未偿金额。
- 转账只影响相关账户余额，不计入收入、支出和净现金流。
- 净资产等于资产账户余额之和减去负债账户未偿金额之和。
- 预算使用率低于 80% 为正常，达到 80% 为提醒，达到 100% 为超支。
- 收入为零时，结余率显示为“不适用”，避免产生无穷或无意义百分比。
- CSV 疑似重复由日期、金额、账户和商户的组合指纹识别；用户确认后跳过重复项。

## 5. 数据对象

```text
Account     { id, name, type, kind, openingBalanceCents }
Transaction { id, type, amountCents, date, accountId, targetAccountId?, category, merchant?, note?, source }
Budget      { month, category, limitCents }
Goal        { id, name, currentCents, targetCents, targetDate }
ImportBatch { id, fileName, createdAt, transactionCount, status }
```

上述对象映射为 `accounts`、`transactions`、`budgets`、`goals`、`import_batches` 五张业务表，另以 `app_meta` 记录数据库初始化状态。外键、索引、ER 图和字段级表结构见[数据库设计文档](database-design.md)，可执行 SQL 位于 `database/schema.sql`。

交易是余额和报表的可追溯来源。账户只保存期初余额，当前余额由期初余额与全部相关交易推导。导入交易保留批次标识，撤销批次时按标识移除全部关联交易，并保留已撤销状态用于追溯。

## 6. CSV 导入格式

首行必须使用以下中文字段名：

```csv
日期,类型,金额,账户,分类,商户,备注
2026-09-08,支出,28.50,现金,餐饮,"好味道,一店",午餐
```

类型支持“收入”“支出”“转账”或对应英文值。金额以元输入，导入后转换为整数分。若账户名称无法匹配，当前版本会使用第一个账户，并通过后续版本的字段映射界面解决这一限制。

## 7. 测试策略

- 领域单元测试：账户余额、净资产、现金流、预算边界、CSV 和观察者通知。
- 结构测试：MVC 组装、核心页面、原生对话框、隐私入口、移动端与键盘支持。
- 浏览器冒烟测试：新增与编辑交易、关键词搜索、类型筛选、导入批次撤销、新增预算、目标管理、桌面和移动截图以及控制台错误。

运行 `npm run validate` 执行 Node 测试与 Markdown 链接检查。浏览器回归脚本位于 `tests/browser-smoke.py`。

## 8. 安全边界

当前主要信任边界是浏览器表单、CSV 文件和本地 HTTP 请求；主要资产是用户录入的财务数据。针对本地课程版本已采用以下控制：

- 所有写入 `innerHTML` 的用户字段都经过 HTML 编码，避免交易备注或商户名称形成脚本。
- CSV 内容上限为 2MB，金额和交易类型在进入 Store 前校验。
- 静态资源只接受 `GET` 和 `HEAD`；状态接口只接受 `GET` 和 `PUT`，请求体限制为 2MB，并在事务中更新 SQLite。
- 静态响应包含 CSP、禁止 MIME 嗅探、禁止嵌入和不发送来源信息等安全响应头。
- 项目没有第三方运行时依赖、远程脚本、身份令牌或源码内密钥。

SQLite 文件和浏览器降级存储都属于本机数据，不构成多用户安全边界。因此当前版本不声称提供多用户隔离；云端版本必须重新完成身份认证、授权、传输加密和静态加密威胁建模。

## 9. 后续演进

1. 将本机 REST API 演进为具备认证、授权和迁移机制的远程服务，并保持 View/Controller 接口不变。
2. 增加用户身份认证、密码哈希、服务端授权和安全审计。
3. 完成 CSV 可视化字段映射和逐条冲突处理。
4. 增加分类与标签维护、目标账户自动关联。
5. 对高数据量列表加入分页或虚拟滚动，并增加端到端性能基线。
