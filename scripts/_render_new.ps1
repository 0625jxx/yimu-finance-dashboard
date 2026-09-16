$ErrorActionPreference = 'Stop'
$docPath = 'C:\Users\30216\Desktop\个人财务管理与可视化看板\deliverables\个人财务管理与可视化看板-综合实训设计报告.docx'
$pdfPath = 'C:\Users\30216\Desktop\个人财务管理与可视化看板\deliverables\个人财务管理与可视化看板-综合实训设计报告.pdf'

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docPath, $false, $true)
    # 更新所有域（含目录 TOC）
    foreach ($f in $doc.Fields) { $null = $f.Update() }
    # 若存在 TablesOfContents 再更新一次
    for ($i = 1; $i -le $doc.TablesOfContents.Count; $i++) {
        $null = $doc.TablesOfContents.Item($i).Update()
    }
    $doc.Repaginate()
    # 导出 PDF（格式 17）
    $doc.SaveAs([ref]$pdfPath, [ref]17)
    $doc.Close($false)
    Write-Output 'PDF_OK'
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
