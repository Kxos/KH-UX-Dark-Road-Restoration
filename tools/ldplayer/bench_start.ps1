param([string]$Out, [string]$Shot = 'khuxstart', [double]$Settle = 8)
# Giocatore esistente (server con KHUX_NEWCOMER=0): lancio e KHUX START, ritoccato
# finche' il server ($Out) riceve POST /khux/login; poi, quando il log resta fermo
# per $Settle secondi, screenshot e ultime richieste. Nessuna attesa fissa.
. "$PSScriptRoot\bench_lib.ps1"
$sw = [Diagnostics.Stopwatch]::StartNew()
$from = LogLines $Out
Sh "logcat -c; rm -f /data/tombstones/*; am force-stop $PKG; monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1" | Out-Null
while (-not (Get-Content $Out | Select-Object -Skip $from | Where-Object { $_ -match 'POST /khux/login' })) {
    if ($sw.Elapsed.TotalSeconds -gt 120) { Write-Host '  KHUX START: nessun /khux/login dopo 120 s'; break }
    # dopo un aggiornamento dei master compare «Download» (rosso) con «Cancel»
    $c = Px @(@(1080, 740), @(600, 740))
    if ((IsRed $c[0]) -and (IsOrange $c[1])) { Tap 1080 740 } else { Tap 40 1020 }
    Start-Sleep -Seconds 2
}
Write-Host ("  {0,-28} {1,5:N1} s" -f 'POST /khux/login', $sw.Elapsed.TotalSeconds)
$n = LogLines $Out; $quiet = [Diagnostics.Stopwatch]::StartNew()
while ($quiet.Elapsed.TotalSeconds -lt $Settle -and $sw.Elapsed.TotalSeconds -lt 300) {
    Start-Sleep -Milliseconds 500
    # il dialogo «Download» (master aggiornati) arriva dopo /khux/login
    $c = Px @(@(1080, 740), @(600, 740))
    if ((IsRed $c[0]) -and (IsOrange $c[1])) { Tap 1080 740; $quiet.Restart() }
    $m = LogLines $Out
    if ($m -ne $n) { $n = $m; $quiet.Restart() }
}
Shot $Shot | Out-Null
Write-Host ("totale {0:N0} s" -f $sw.Elapsed.TotalSeconds)
LastRequests $Out 8
Status
