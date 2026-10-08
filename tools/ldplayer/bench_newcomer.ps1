param([string]$Out, [string]$Shot = 'khuxrun', [int]$After = 25, [switch]$NoSkip)
# Flusso nuovo utente fino al filmato, SKIP, poi screenshot e diagnosi del crash.
$ld = 'D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9'
$pkg = 'com.square_enix.android_googleplay.khuxww'
function T($x, $y, $w) { & "$ld\ld.exe" -s 0 "input tap $x $y"; Start-Sleep $w }
& "$ld\ld.exe" -s 0 "logcat -c; logcat -b crash -c; rm -f /data/tombstones/*; am force-stop $pkg; monkey -p $pkg -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1"
Start-Sleep 75
T 200 1020 20; T 1222 978 6; T 958 694 4; T 1222 796 25; T 1220 712 50
if (-not $NoSkip) { T 155 50 $After }
& "$ld\ld.exe" -s 0 "screencap -p /sdcard/Pictures/$Shot.png"
Get-Content $Out | Where-Object { $_ -notmatch '\[dns\]|dns:dirottata|tls:sni|content-type|GET /master/' } |
    Select-String -Pattern '\[master\]|^\S*\[(ok|\?|!)\S*\s+#\d+' | Select-Object -Last 6 | ForEach-Object { $_.Line }
$alive = & "$ld\ld.exe" -s 0 "pidof $pkg"
"pid: $alive"
$tomb = & "$ld\ld.exe" -s 0 "ls /data/tombstones/ 2>/dev/null"
if ($tomb) {
    & "$ld\ld.exe" -s 0 "cp /data/tombstones/tombstone_00 /sdcard/Pictures/tomb.txt"
    $t = Get-Content "$env:USERPROFILE\Documents\XuanZhi9\Pictures\tomb.txt"
    $t[5..7]
    $m = $t | Select-String -Pattern "^\s+([0-9a-f']+)-[0-9a-f']+ r--\s+0\s+\S+\s+.*libcocos2dcpp" | Select-Object -First 1
    $lo = [Convert]::ToInt64(($m.Matches[0].Groups[1].Value -replace "'", ''), 16)
    $hi = $lo + 0x1da3000
    "base libcocos2dcpp: {0:x}" -f $lo
    $sec = ''
    foreach ($l in $t[0..4000]) {
        if ($l -match '^memory near (\w+)') { $sec = $matches[1] }
        if ($l -match '^\s+(#\d+\s+)?([0-9a-f]{16})\s+([0-9a-f]{16})(\s+([0-9a-f]{16}))?') {
            foreach ($k in 3, 5) {
                if (-not $matches[$k]) { continue }
                $v = [Convert]::ToInt64($matches[$k], 16)
                if ($v -ge $lo -and $v -lt $hi) { "  {0} @{1} -> ghidra {2:x}" -f $sec, $matches[2], ($v - $lo + 0x100000) }
            }
        }
    }
}
