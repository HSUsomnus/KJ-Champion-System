# 撥離未推送／重複資料，保留 .env 與 API 金鑰
# 執行方式：在專案根目錄 PowerShell 執行 .\cleanup-unpushed.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# 1. 先把 API 金鑰從 current-version/Key 複製到根目錄 Key（避免移走 current-version 後找不到）
$srcKey = Join-Path $root "current-version\Key"
$dstKey = Join-Path $root "Key"
if (Test-Path $srcKey) {
    if (-not (Test-Path $dstKey)) { New-Item -ItemType Directory -Path $dstKey -Force | Out-Null }
    Copy-Item -Path "$srcKey\*" -Destination $dstKey -Recurse -Force
    Write-Host "[OK] API key copied to root\Key\" -ForegroundColor Green
} else {
    Write-Host "[Skip] current-version\Key not found" -ForegroundColor Yellow
}

# 2. 建立歸檔資料夾
$archive = Join-Path $root "_archive_unpushed"
if (-not (Test-Path $archive)) { New-Item -ItemType Directory -Path $archive -Force | Out-Null }
Write-Host "[OK] Archive folder: _archive_unpushed\" -ForegroundColor Green

# 3. 要移入歸檔的項目（未推送／重複用，不影響你現在開發的 api + frontend + server）
$toArchive = @(
    "current-version",
    "frontend-design",
    "update-version",
    "專案更新版本",
    "現有專案版本",
    "do-version-move.ps1"
)

foreach ($name in $toArchive) {
    $path = Join-Path $root $name
    if (Test-Path $path) {
        $dest = Join-Path $archive $name
        if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
        Move-Item -Path $path -Destination $dest -Force
        Write-Host "[Archived] $name" -ForegroundColor Cyan
    }
}

# 4. Done message
Write-Host ""
Write-Host "Done. Kept in root: .env, .env.backup, Key\, api\, frontend\, server\, docs\" -ForegroundColor Green
Write-Host "Archived to _archive_unpushed: " -ForegroundColor Cyan -NoNewline
$toArchive -join ", " | Write-Host
Write-Host "You can delete _archive_unpushed folder later if not needed." -ForegroundColor Gray
