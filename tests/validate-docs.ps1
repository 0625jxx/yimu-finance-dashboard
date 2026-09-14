$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$productDocument = Join-Path $repositoryRoot 'docs/product-design.md'
$readme = Join-Path $repositoryRoot 'README.md'
$errors = [System.Collections.Generic.List[string]]::new()

foreach ($requiredFile in @($readme, $productDocument)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        $errors.Add("Missing required file: $requiredFile")
    }
}

if (Test-Path -LiteralPath $productDocument -PathType Leaf) {
    $content = Get-Content -LiteralPath $productDocument -Raw
    $requiredHeadings = @(
        '## 2. 产品概述',
        '## 3. 目标用户与场景',
        '## 4. 产品目标与边界',
        '## 6. 信息架构',
        '## 7. 主要功能设计',
        '## 8. 关键指标与计算口径',
        '## 12. 课程提交版验收标准',
        '## 14. 版本规划',
        '## 16. 待确认事项'
    )

    foreach ($heading in $requiredHeadings) {
        if (-not $content.Contains($heading)) {
            $errors.Add("Product document is missing required heading: $heading")
        }
    }
}

$markdownFiles = Get-ChildItem -LiteralPath $repositoryRoot -Recurse -File -Filter '*.md' |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' }

foreach ($markdownFile in $markdownFiles) {
    $content = Get-Content -LiteralPath $markdownFile.FullName -Raw
    $matches = [regex]::Matches($content, '\[[^\]]+\]\((?!https?://|mailto:|#)([^)]+)\)')

    foreach ($match in $matches) {
        $relativeTarget = $match.Groups[1].Value.Split('#')[0]
        if ([string]::IsNullOrWhiteSpace($relativeTarget)) {
            continue
        }

        $decodedTarget = [System.Uri]::UnescapeDataString($relativeTarget)
        $resolvedTarget = Join-Path $markdownFile.DirectoryName $decodedTarget
        if (-not (Test-Path -LiteralPath $resolvedTarget)) {
            $errors.Add("Broken Markdown link in $($markdownFile.FullName): $relativeTarget")
        }
    }
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "Documentation validation passed for $($markdownFiles.Count) Markdown files."
