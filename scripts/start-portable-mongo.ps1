$ErrorActionPreference = "Stop"

$version = "7.0.22"
$root = Join-Path $env:USERPROFILE "mongodb-portable"
$zipPath = Join-Path $root "mongodb-windows-x86_64-$version.zip"
$extractPath = Join-Path $root "server"
$dataPath = Join-Path $root "data"
$downloadUrl = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-$version.zip"

New-Item -ItemType Directory -Force -Path $root | Out-Null
New-Item -ItemType Directory -Force -Path $dataPath | Out-Null

$mongod = Get-ChildItem -Path $extractPath -Recurse -Filter "mongod.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $mongod) {
  if (-not (Test-Path -LiteralPath $zipPath)) {
    Write-Host "Downloading MongoDB Community Server $version portable zip..."
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
  }

  Write-Host "Extracting MongoDB..."
  New-Item -ItemType Directory -Force -Path $extractPath | Out-Null
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force

  $mongod = Get-ChildItem -Path $extractPath -Recurse -Filter "mongod.exe" | Select-Object -First 1
}

if (-not $mongod) {
  throw "mongod.exe was not found after extracting MongoDB."
}

Write-Host "Starting MongoDB on mongodb://127.0.0.1:27017/smartprep_ai"
Write-Host "Keep this terminal open while using the project."
& $mongod.FullName --dbpath $dataPath --bind_ip 127.0.0.1 --port 27017
