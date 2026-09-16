// Node 版文档校验（替代 tests/validate-docs.ps1，避免依赖 PowerShell 7）
// 逻辑与原 PowerShell 脚本保持一致：必需文件 → product-design 必需标题 → Markdown 相对链接。
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

// 1. 必需文件
for (const file of [join(repositoryRoot, "README.md"), join(repositoryRoot, "docs", "product-design.md")]) {
  if (!existsSync(file)) {
    errors.push(`Missing required file: ${file}`);
  }
}

// 2. product-design.md 必需标题
const productDocument = join(repositoryRoot, "docs", "product-design.md");
if (existsSync(productDocument)) {
  const content = readFileSync(productDocument, "utf8");
  const requiredHeadings = [
    "## 2. 产品概述",
    "## 3. 目标用户与场景",
    "## 4. 产品目标与边界",
    "## 6. 信息架构",
    "## 7. 主要功能设计",
    "## 8. 关键指标与计算口径",
    "## 12. 课程提交版验收标准",
    "## 14. 版本规划",
    "## 16. 待确认事项",
  ];
  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      errors.push(`Product document is missing required heading: ${heading}`);
    }
  }
}

// 3. 全部 Markdown 文件的相对链接检查（排除 .git 与 node_modules）
function walkMarkdown(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

const markdownFiles = walkMarkdown(repositoryRoot);
const linkPattern = /\[[^\]]+\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g;

for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8");
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const relativeTarget = match[1].split("#")[0];
    if (!relativeTarget.trim()) continue;
    const decodedTarget = decodeURIComponent(relativeTarget);
    const resolvedTarget = resolve(dirname(file), decodedTarget);
    if (!existsSync(resolvedTarget)) {
      errors.push(`Broken Markdown link in ${file}: ${relativeTarget}`);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(`Documentation validation passed for ${markdownFiles.length} Markdown files.`);
