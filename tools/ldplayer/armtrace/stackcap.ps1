param([string]$Tag = 'eq2', [int]$MenuY = 430)
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot)); Set-Location $repo
$sp0 = $PSScriptRoot
. .\tools\ldplayer\bench_lib.ps1
$G = '/data/local/tmp/armtrace'
$OUT = "D:\Progetto_Restauro_KH_UX\dumps\armtrace\$Tag"
Push-Location tools\ldplayer\armtrace; .\capture.ps1 -Arm | Out-Null; Pop-Location
Sh "am force-stop com.square_enix.android_googleplay.khuxww" | Out-Null
& .\tools\ldplayer\bench_start.ps1 -Out D:\Progetto_Restauro_KH_UX\logs\server.log -Shot "${Tag}_home" -Settle 6 | Out-Null
Tap 1790 45; Start-Sleep 3; Tap 1745 $MenuY
for ($i = 0; $i -lt 30; $i++) { Start-Sleep -Milliseconds 500; if ("$(Sh "cat $G/pid 2>/dev/null")".Trim()) { break } }
$p = "$(Sh "cat $G/pid")".Trim()
"pid $p"
# houdini regions -> local, find register block (pc in lib), take sp
Sh "rm -rf /sdcard/Pictures/armtrace_h; cp -r $G/houdini /sdcard/Pictures/armtrace_h" | Out-Null
Start-Sleep 1
New-Item -ItemType Directory -Force "$OUT\houdini" | Out-Null
Get-ChildItem (Join-Path $SHARED 'armtrace_h') | Move-Item -Destination "$OUT\houdini" -Force
$regs = python -I "$sp0\findregs.py" "$OUT\houdini"
$regs
$first = ($regs | Select-String 'sp ([0-9a-f]+)' | Select-Object -First 1).Matches[0].Groups[1].Value
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
