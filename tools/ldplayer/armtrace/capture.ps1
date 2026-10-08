# Backtrace ARM di un crash del gioco sotto houdini (LDPlayer 9), che il tombstone non da'.
#
#   .\capture.ps1 -Arm                       # carica gli script e attende il crash
#   (provocare il crash)
#   .\capture.ps1 -Collect -Tag <nome> [-X0 <hex>]   # registri ARM, stack, backtrace
#   .\capture.ps1 -Release                   # riattiva tombstoned (il gioco muore)
#
# -Collect va lanciato subito: il thread resta fermo solo 30 secondi (timeout di
# crash_dump). Lo stato della CPU ARM si ritrova cercando il valore di x0 visto nel
# tombstone (di default quello del crash dopo l'aggiornamento dei master): x0..x30 a 8
# byte, poi sp e pc. Vedi freeze_on_crash.sh e analyze.py. I dump vanno in
# D:\Progetto_Restauro_KH_UX\dumps\armtrace\<Tag>.
[CmdletBinding()]
param([switch]$Arm, [switch]$Collect, [switch]$Release, [string]$Tag = 'crash',
      [string]$X0 = '4268000043680000', [double]$Wait = 600)
. "$PSScriptRoot\..\bench_lib.ps1"
$G = '/data/local/tmp/armtrace'
$OUT = "D:\Progetto_Restauro_KH_UX\dumps\armtrace\$Tag"
$py = Join-Path $PSScriptRoot 'analyze.py'

function Push([string]$file, [string]$dest) {
    $leaf = Split-Path $file -Leaf
    $t = [IO.File]::ReadAllText((Resolve-Path $file)) -replace "`r`n", "`n"
    [IO.File]::WriteAllText((Join-Path $SHARED $leaf), $t, (New-Object Text.UTF8Encoding $false))
    Start-Sleep -Milliseconds 300
    Sh "mkdir -p $G; cp /sdcard/Pictures/$leaf $dest; chmod 755 $dest; rm /sdcard/Pictures/$leaf" | Out-Null
}

# Cartella del guest -> $OUT\<sub>, passando dalla cartella condivisa.
function Pull([string]$src, [string]$sub) {
    Sh "rm -rf /sdcard/Pictures/armtrace_$sub; cp -r $src /sdcard/Pictures/armtrace_$sub" | Out-Null
    Start-Sleep 1
    New-Item -ItemType Directory -Force "$OUT\$sub" | Out-Null
    Get-ChildItem (Join-Path $SHARED "armtrace_$sub") | Move-Item -Destination "$OUT\$sub" -Force
    Remove-Item (Join-Path $SHARED "armtrace_$sub") -Recurse -Force -ErrorAction SilentlyContinue
    Sh "rm -rf /sdcard/Pictures/armtrace_$sub" | Out-Null
}

if ($Arm) {
    Push "$PSScriptRoot\freeze_on_crash.sh" "$G/freeze.sh"
    Push "$PSScriptRoot\dumprange.sh" "$G/dumprange.sh"
    # vmread (binario, costruito da build_vmread.py): copia senza conversioni
    Copy-Item "$PSScriptRoot\vmread" (Join-Path $SHARED 'vmread') -Force; Start-Sleep -Milliseconds 300
    Sh "cp /sdcard/Pictures/vmread $G/vmread; chmod 755 $G/vmread; rm /sdcard/Pictures/vmread" | Out-Null
    Sh 'pkill -f armtrace/freeze[.]sh' | Out-Null   # da solo: la stessa riga non deve contenere freeze.sh
    Sh "rm -f $G/pid $G/log; (setsid nohup sh $G/freeze.sh > $G/log 2>&1 &); sleep 1; ps -A -o PID,ARGS | grep freeze[.]sh"
}
if ($Collect) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while (-not "$(Sh "cat $G/pid 2>/dev/null")".Trim()) {
        if ($sw.Elapsed.TotalSeconds -gt $Wait) { throw 'nessun crash' }
        Start-Sleep -Milliseconds 300
    }
    $t0 = [Diagnostics.Stopwatch]::StartNew()
    $p = (Sh "cat $G/pid").Trim()
    "stato: " + (Sh "cat $G/log")
    Pull "$G/houdini" 'houdini'
    Sh "cat $G/maps" | Set-Content "$OUT\maps.txt"
    # struttura dei registri: dove compare x0
    $needle = [BitConverter]::GetBytes([Convert]::ToUInt64($X0, 16))
    $hit = $null
    foreach ($f in Get-ChildItem "$OUT\houdini" -Filter *.bin) {
        $b = [IO.File]::ReadAllBytes($f.FullName)
        for ($o = 0; $o -le $b.Length - 0x110; $o += 8) {
            if ([BitConverter]::ToUInt64($b, $o) -eq [BitConverter]::ToUInt64($needle, 0)) { $hit = @{ File = $f; Bytes = $b; Off = $o }; break }
        }
        if ($hit) { break }
    }
    if (-not $hit) { throw "x0 $X0 non trovato nelle regioni di houdini" }
    $regs = 0..33 | ForEach-Object { [BitConverter]::ToUInt64($hit.Bytes, $hit.Off + 8 * $_) }
    $names = (0..30 | ForEach-Object { "x$_" }) + 'sp', 'pc', '+0x110'
    $lines = for ($i = 0; $i -lt $regs.Count; $i++) {
        $v = $regs[$i]; $g = if ($v -ge 0x3308000 -and $v -lt 0x50ab000) { '  Ghidra {0:x}' -f ($v - 0x3308000 + 0x100000) } else { '' }
        '{0,-6} {1:x16}{2}' -f $names[$i], $v, $g
    }
    $lines | Set-Content "$OUT\regs.txt"; $lines
    # stack ARM: la regione che contiene sp
    $sp = $regs[31]
    $r = Get-Content "$OUT\maps.txt" | Where-Object { $_ -match '^([0-9a-f]+)-([0-9a-f]+) ' -and
        [Convert]::ToUInt64($matches[1], 16) -le $sp -and $sp -lt [Convert]::ToUInt64($matches[2], 16) } | Select-Object -First 1
    "stack: $r"
    if ($r -match '^([0-9a-f]+)-([0-9a-f]+) ') {
        Sh "sh $G/dumprange.sh $p $($matches[1]) $($matches[2]) $G/stack.bin; mkdir -p $G/stackdir; mv $G/stack.bin $G/stackdir/$($matches[1]).bin" | Out-Null
        Pull "$G/stackdir" 'stack'
        "copiato in {0:N1} s dal congelamento" -f $t0.Elapsed.TotalSeconds
        python -I $py stack "$OUT\stack\$($matches[1]).bin" $matches[1] ('{0:x}' -f $sp) 40 | Tee-Object "$OUT\backtrace.txt"
    }
}
if ($Release) {
    Sh "kill -CONT `$(pidof tombstoned); rm -rf $G/houdini $G/stackdir $G/pid $G/log; echo riattivato"
    Sh 'pkill -f armtrace/freeze[.]sh' | Out-Null
}
