# Original geometric rice-character mark; not an official artist logo.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

function Write-YonezuIcon([int]$size, [string]$fileName) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#111216'))
    $graphics.ScaleTransform(($size / 512.0), ($size / 512.0))
    $ring = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#5874ba'), 5)
    $stroke = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#e6ebff'), 17)
    $stroke.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $stroke.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    try {
        $graphics.DrawEllipse($ring, 80, 80, 352, 352)
        $graphics.DrawLine($stroke, 256, 148, 256, 364)
        $graphics.DrawLine($stroke, 148, 256, 364, 256)
        $graphics.DrawLine($stroke, 176, 176, 336, 336)
        $graphics.DrawLine($stroke, 336, 176, 176, 336)
        $bitmap.Save((Join-Path $projectRoot $fileName), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $ring.Dispose(); $stroke.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
    }
}
Write-YonezuIcon 192 'icon-192.png'
Write-YonezuIcon 512 'icon-512.png'
Write-YonezuIcon 512 'icon-maskable-512.png'
Write-YonezuIcon 180 'apple-touch-icon.png'
