# -Taps 'x,y','x,y': tocchi successivi (8 s dopo la voce del menu, poi 4 s l'uno);
# 'swipe:x1,y1,x2,y2' trascina invece di toccare
# -NoStart: niente riavvio ne' tocchi, si arma e si aspetta un crash provocato da un altro script (fino a -WaitSec)
param([string]$Tag = 'eq2', [int]$MenuY = 430, [string[]]$Taps = @(), [switch]$NoMenu, [switch]$NoStart, [int]$WaitSec = 15)
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot)); Set-Location $repo
$sp0 = $PSScriptRoot
. .\tools\ldplayer\bench_lib.ps1
$G = '/data/local/tmp/armtrace'
$OUT = "D:\Progetto_Restauro_KH_UX\dumps\armtrace\$Tag"
Push-Location tools\ldplayer\armtrace; .\capture.ps1 -Arm | Out-Null; Pop-Location
if (-not $NoStart) {
  Sh "am force-stop com.square_enix.android_googleplay.khuxww" | Out-Null
  & .\tools\ldplayer\bench_start.ps1 -Out D:\Progetto_Restauro_KH_UX\logs\server.log -Shot "${Tag}_home" -Settle 6 | Out-Null
}
if (-not $NoMenu -and -not $NoStart) { Tap 1790 45; Start-Sleep 3; Tap 1745 $MenuY }   # -NoMenu: solo -Taps dalla home
if ($Taps) {
  Start-Sleep 8
  foreach ($xy in $Taps) {
    # 'swipe:x1,y1,x2,y2': trascinamento lento (es. una medaglia in uno slot del Level Up)
    if ($xy -like 'swipe:*') { $a = ($xy -replace 'swipe:', '') -split ','; Swipe $a[0] $a[1] $a[2] $a[3] 900 }
    else { $x, $y = $xy -split ','; Tap $x $y }
    Start-Sleep 4
  }
}
for ($i = 0; $i -lt 2 * $WaitSec; $i++) { Start-Sleep -Milliseconds 500; if ("$(Sh "cat $G/pid 2>/dev/null")".Trim()) { break } }
$p = "$(Sh "cat $G/pid")".Trim()
"pid $p"
# houdini regions -> local, find register block (pc in lib), take sp
Sh "rm -rf /sdcard/Pictures/armtrace_h; cp -r $G/houdini /sdcard/Pictures/armtrace_h" | Out-Null
Start-Sleep 1
New-Item -ItemType Directory -Force "$OUT\houdini" | Out-Null
Get-ChildItem (Join-Path $SHARED 'armtrace_h') | Move-Item -Destination "$OUT\houdini" -Force
# base reale della libreria (cambia fra un avvio e l'altro: 0x31c0000, 0x320c000...): con la
# base sbagliata i frame cadono in funzioni a caso (11 ottobre: falso «PetInfoDialog»)
$lib = Sh "grep -m1 libcocos2dcpp /proc/$p/maps"
if ("$lib" -match '^([0-9a-f]+)-') { $env:KHUX_BASE = '0x' + $matches[1]; "base libcocos2dcpp: $env:KHUX_BASE" }
$regs = python -I "$sp0\findregs.py" "$OUT\houdini"
$regs
# il primo blocco col pc dentro la libreria (pc G...): gli altri sono thread di houdini
# (sp a 12 cifre: i blocchi con sp piccolo sono copie spurie dei registri, 11 ottobre)
$hit = $regs | Select-String 'pc G[0-9a-f]+ .*sp ([0-9a-f]{12})\b' | Select-Object -First 1
if (-not $hit) { $hit = $regs | Select-String 'sp ([0-9a-f]+)' | Select-Object -First 1 }
$first = $hit.Matches[0].Groups[1].Value
$spv = [Convert]::ToUInt64($first, 16)
$maps = Sh "cat /proc/$p/maps"
$r = $maps | Where-Object { $_ -match '^([0-9a-f]+)-([0-9a-f]+) ' -and [Convert]::ToUInt64($matches[1], 16) -le $spv -and $spv -lt [Convert]::ToUInt64($matches[2], 16) } | Select-Object -First 1
"stack region: $r"
if ($r -match '^([0-9a-f]+)-([0-9a-f]+) ') {
  $s = $matches[1]; $e = $matches[2]
  Sh "sh $G/dumprange.sh $p $s $e /sdcard/Pictures/stack_$Tag.bin" | Out-Null
  Start-Sleep 1
  Move-Item (Join-Path $SHARED "stack_$Tag.bin") "$OUT\stack.bin" -Force
  "$s $first" | Set-Content "$OUT\stackinfo.txt"
}
Push-Location tools\ldplayer\armtrace; .\capture.ps1 -Release | Out-Null; Pop-Location
