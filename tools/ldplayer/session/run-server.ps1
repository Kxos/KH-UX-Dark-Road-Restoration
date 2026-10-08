# Avvia il server KHUX per il banco LDPlayer (vedi HANDOFF, «Come riprendere il lavoro»).
# La chiave delle risorse non sta nel repository: si rilegge dal binario 5.0.1.
# Log: D:\Progetto_Restauro_KH_UX\logs\server.log (lo leggono cycle.ps1 e relogin.ps1).
#   powershell -File run-server.ps1 [-Revision N]
param([int]$Revision = 49)
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot))
$logs = 'D:\Progetto_Restauro_KH_UX\logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$env:KHUX_PUBLIC_URL = 'https://192.168.1.185'
$env:KHUX_REVISION = "$Revision"                      # alzarla dopo ogni modifica dei master
$env:KHUX_RESOURCE_SIZE = '2317958810'
$env:KHUX_RESOURCE_DIR = 'D:\Progetto_Restauro_KH_UX\resource_data'
$env:KHUX_RESOURCE_KEY = python -I -c "import sys; d=open(sys.argv[1],'rb').read(); print(d[0xe6ee54:0xe6ee54+32].hex())" D:\Progetto_Restauro_KH_UX\apk501\ext\lib\arm64-v8a\libcocos2dcpp.so
Set-Location $repo
node server\server.js *> "$logs\server.log"
