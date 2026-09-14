param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ClassName,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Instructor
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$deliverables = Join-Path $repositoryRoot 'deliverables'
$targetJar = Join-Path $repositoryRoot 'target\yimu-finance-dashboard.jar'
$deliverableJar = Join-Path $deliverables 'yimu-finance-dashboard.jar'
$deliverableDatabase = Join-Path $deliverables 'yimu-finance-dashboard.db'
$schemaSource = Join-Path $repositoryRoot 'database\schema.sql'
$schemaDeliverable = Join-Path $deliverables 'schema.sql'

$resolvedRoot = [System.IO.Path]::GetFullPath($repositoryRoot)
$resolvedDeliverables = [System.IO.Path]::GetFullPath($deliverables)
$resolvedDatabase = [System.IO.Path]::GetFullPath($deliverableDatabase)
if (-not $resolvedDeliverables.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
    -not $resolvedDatabase.StartsWith($resolvedDeliverables, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw '提交数据库路径超出项目 deliverables 目录。'
}

Push-Location $repositoryRoot
try {
    npm run validate
    mvn -o clean package

    Copy-Item -LiteralPath $targetJar -Destination $deliverableJar -Force
    Copy-Item -LiteralPath $schemaSource -Destination $schemaDeliverable -Force
    if (Test-Path -LiteralPath $resolvedDatabase) {
        Remove-Item -LiteralPath $resolvedDatabase -Force
    }
    java -cp $deliverableJar com.yimu.finance.DatabaseInitializer $resolvedDatabase

    $env:YIMU_CLASS_NAME = $ClassName.Trim()
    $env:YIMU_INSTRUCTOR = $Instructor.Trim()
    node scripts/generate-deliverables.cjs
    py -3 scripts/generate-report-pdf.py

    $artifactNames = @(
        'yimu-finance-dashboard.jar',
        'yimu-finance-dashboard.db',
        'schema.sql',
        '个人财务管理与可视化看板-综合实训设计报告.docx',
        '个人财务管理与可视化看板-综合实训设计报告.pdf',
        '个人财务管理与可视化看板-答辩演示.pptx'
    )
    $checksumLines = foreach ($name in $artifactNames) {
        $file = Join-Path $deliverables $name
        $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
        "$hash  $name"
    }
    [System.IO.File]::WriteAllLines(
        (Join-Path $deliverables 'SHA256SUMS.txt'),
        $checksumLines,
        [System.Text.UTF8Encoding]::new($false)
    )
    Write-Host "提交包已生成：$deliverables"
} finally {
    Pop-Location
}
