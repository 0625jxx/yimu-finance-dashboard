import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Maven 项目声明 Java 17、主类和 Web 静态资源", async () => {
  const pom = await read("../pom.xml");
  assert.match(pom, /<maven\.compiler\.release>17<\/maven\.compiler\.release>/);
  assert.match(pom, /com\.yimu\.finance\.Main/);
  assert.match(pom, /<targetPath>web<\/targetPath>/);
  assert.match(pom, /sqlite-jdbc/);
  assert.match(pom, /jackson-databind/);
  assert.match(pom, /junit-jupiter/);
  assert.match(pom, /maven-shade-plugin/);
});

test("可执行入口只监听本机并设置安全响应头", async () => {
  const source = `${await read("../src/main/java/com/yimu/finance/Main.java")}\n${await read("../src/main/java/com/yimu/finance/FinanceHttpServer.java")}`;
  assert.match(source, /InetAddress\.getLoopbackAddress/);
  assert.match(source, /Content-Security-Policy/);
  assert.match(source, /X-Content-Type-Options/);
});

test("提交包包含一键运行脚本", async () => {
  const launcher = await read("../run.bat");
  assert.match(launcher, /java -jar deliverables\\yimu-finance-dashboard\.jar/);
});

test("提交包可由单一脚本带真实课程信息重建", async () => {
  const script = await read("../scripts/build-submission.ps1");
  for (const token of ["ClassName", "Instructor", "mvn -o clean package", "DatabaseInitializer", "generate-deliverables.cjs", "generate-report-pdf.py", "Get-FileHash"]) {
    assert.match(script, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("提交目录包含可执行程序、报告和答辩材料", async () => {
  const artifacts = [
    ["../deliverables/yimu-finance-dashboard.jar", 20_000],
    ["../deliverables/个人财务管理与可视化看板-综合实训设计报告.docx", 100_000],
    ["../deliverables/个人财务管理与可视化看板-综合实训设计报告.pdf", 100_000],
    ["../deliverables/个人财务管理与可视化看板-答辩演示.pptx", 100_000],
    ["../deliverables/yimu-finance-dashboard.db", 10_000],
    ["../deliverables/schema.sql", 1_000],
  ];
  for (const [relativePath, minimumBytes] of artifacts) {
    const file = await stat(new URL(relativePath, import.meta.url));
    assert.ok(file.size > minimumBytes, `${relativePath} 应为非空、可提交的成品文件`);
  }
  const generator = await read("../scripts/generate-deliverables.cjs");
  for (const member of ["蓝思钰 52302042011", "姜萱萱 52302042008", "刘晓盼 52302042019", "王晨 52302042035", "朱婷婷 52302042055"]) {
    assert.match(generator, new RegExp(member), `交付材料生成器应包含成员信息：${member}`);
  }
});

test("提交材料使用一致且可验收的数据库与观察者描述", async () => {
  const generator = await read("../scripts/generate-deliverables.cjs");
  const pdfGenerator = await read("../scripts/generate-report-pdf.py");
  const technicalDesign = await read("../docs/technical-design.md");
  assert.doesNotMatch(generator, /30 项自动化测试|transaction:add 事件/);
  assert.doesNotMatch(generator, /【请填写/);
  assert.doesNotMatch(pdfGenerator, /30 项自动化测试|【请填写/);
  assert.match(generator, /SQLite/);
  assert.match(pdfGenerator, /SQLite/);
  assert.match(generator, /ER 图|ER图/);
  assert.match(technicalDesign, /SQLite/);
  assert.match(technicalDesign, /Controller 订阅/);
});

test("课程提交说明不再使用 MVP 定位", async () => {
  const readme = await read("../README.md");
  const technicalDesign = await read("../docs/technical-design.md");
  assert.doesNotMatch(`${readme}\n${technicalDesign}`, /\bMVP\b/i);
});
