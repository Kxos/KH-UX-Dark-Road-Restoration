# Avvia il server KHUX per il banco LDPlayer (vedi HANDOFF, «Come riprendere il lavoro»).
# La chiave delle risorse non sta nel repository: si rilegge dal binario 5.0.1.
# Log: D:\Progetto_Restauro_KH_UX\logs\server.log (lo leggono cycle.ps1 e relogin.ps1).
#   powershell -File run-server.ps1 [-Revision N] [-TutorialFinished]
# -TutorialFinished: il client scarica le risorse (azione 28) solo a tutorial finito;
# dal 9 ottobre 2026 il server lo considera finito gia' dalla fase 995 (dopo il
# Prologue), quindi serve solo a un giocatore fermo prima.
param([int]$Revision = 57, [switch]$TutorialFinished)
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot))
$logs = 'D:\Progetto_Restauro_KH_UX\logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$env:KHUX_PUBLIC_URL = 'https://192.168.1.185'
$env:KHUX_REVISION = "$Revision"                      # alzarla dopo ogni modifica dei master
if ($TutorialFinished) { $env:KHUX_TUTORIAL_FINISHED = '1' }
# dimensione dell'ultima versione delle risorse (cartella numerica piu' alta)
$res = 'D:\Progetto_Restauro_KH_UX\resource_data'
$last = Get-ChildItem $res -Directory | Where-Object Name -match '^\d+$' | Sort-Object { [int]$_.Name } | Select-Object -Last 1
$env:KHUX_RESOURCE_SIZE = [string](Get-ChildItem "$($last.FullName)\data" | Measure-Object Length -Sum).Sum
$env:KHUX_RESOURCE_DIR = $res
$env:KHUX_RESOURCE_KEY = python -I -c "import sys; d=open(sys.argv[1],'rb').read(); print(d[0xe6ee54:0xe6ee54+32].hex())" D:\Progetto_Restauro_KH_UX\apk501\ext\lib\arm64-v8a\libcocos2dcpp.so
Set-Location $repo
node server\server.js *> "$logs\server.log"
