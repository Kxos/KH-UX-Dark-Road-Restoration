# Rientro di un giocatore ESISTENTE: riavvia il server tenendo il salvataggio
# (server\save\player.json), rilancia l'app e attende la home.
#   .\relogin.ps1 -Tag <prefisso screenshot> [-Revision N]
param([string]$Tag = 'rl', [int]$Revision = 49)
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot))
$log = 'D:\Progetto_Restauro_KH_UX\logs\server.log'
Set-Location $repo
node --check server\server.js; if (-not $?) { throw 'sintassi' }
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Confirm:$false
Start-Sleep 1
Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$PSScriptRoot\run-server.ps1", '-Revision', $Revision
Start-Sleep 5
Get-Content $log -TotalCount 3
& .\tools\ldplayer\bench_start.ps1 -Out $log -Shot "${Tag}_home" -Settle 10
