# Cattura la memoria del client KHUX nell'istante tra il rapporto del protector
# e l'abort, su un emulatore Android con root (provato su MuMu Player 6.8).
# Vedi README.md in questa cartella.
param(
    [string]$Adb  = 'D:\Progetto_Restauro_KH_UX\MuMuPlayer\nx_main\adb.exe',
    [string]$Serial = '127.0.0.1:16416',  # porta adb dell'istanza (MuMuManager info la stampa)
    [string]$OutRoot = 'D:\Progetto_Restauro_KH_UX\dumps',
    [string]$Delay = '0.25',   # secondi prima del primo SIGSTOP
    [string]$Step  = '0.02',   # passo degli scatti CONT/STOP
    [string]$Name  = 'cap',
    [int]$Tries = 6
)
$adb = $Adb
$s   = $Serial
$sp  = $PSScriptRoot
$out = "$OutRoot\$Name"
$dev = "/data/local/tmp/$Name"

foreach ($f in 'freeze.sh', 'dump.sh') {
    $c = [IO.File]::ReadAllText("$sp\$f") -replace "`r`n", "`n"
    [IO.File]::WriteAllText("$sp\$f", $c)
    & $adb -s $s push "$sp\$f" "/data/local/tmp/$f" | Out-Null
}
& $adb -s $s shell "su -c 'chmod 755 /data/local/tmp/freeze.sh /data/local/tmp/dump.sh'"

# Congela finche' il processo e' vivo e ha gia' scritto il rapporto.
$ok = $false
for ($i = 1; $i -le $Tries; $i++) {
    & $adb -s $s shell "su -c 'rm -rf $dev'"
    $r = (& $adb -s $s shell "su -c '/data/local/tmp/freeze.sh $Delay $dev $Step'") -join ' '
    "tentativo ${i}: $r"
    if ($r -match 'FROZEN' -and $r -match 'error_lines=13') { $ok = $true; break }
}
if (-not $ok) { 'Nessun congelamento nella finestra giusta'; exit 1 }

New-Item -ItemType Directory -Force $out | Out-Null
& $adb -s $s pull "$dev/maps.txt" "$out\maps.txt" | Out-Null
& $adb -s $s pull "$dev/error.txt" "$out\error.txt" | Out-Null
python -I "$sp\pick_regions.py" "$out\maps.txt" > "$out\regions.txt"
$c = [IO.File]::ReadAllText("$out\regions.txt") -replace "`r`n", "`n"
[IO.File]::WriteAllText("$out\regions.txt", $c)
& $adb -s $s push "$out\regions.txt" "$dev/regions.txt" | Out-Null
$pid_ = (& $adb -s $s shell "su -c 'cat $dev/pid'").Trim()
& $adb -s $s shell "su -c '/data/local/tmp/dump.sh $pid_ $dev/regions.txt $dev/mem'"
& $adb -s $s shell "su -c 'kill -9 $pid_'"
& $adb -s $s pull "$dev/mem" "$out" | Select-Object -Last 1
"{0:N1} MB in {1}" -f ((Get-ChildItem "$out\mem" -File | Measure-Object Length -Sum).Sum / 1MB), "$out\mem"
