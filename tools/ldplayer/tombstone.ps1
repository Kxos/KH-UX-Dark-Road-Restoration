# Ultimo tombstone del guest: registri e puntatori nel codice di libcocos2dcpp (indirizzi Ghidra)
$ld = 'D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9'
& "$ld\ld.exe" -s 0 "cp `$(ls -t /data/tombstones/tombstone_* | head -1) /sdcard/Pictures/tomb.txt"
$t = Get-Content "$env:USERPROFILE\Documents\XuanZhi9\Pictures\tomb.txt"
$t[5..11]
$m = $t | Select-String -Pattern "^\s+([0-9a-f']+)-[0-9a-f']+ r--\s+0\s+\S+\s+.*libcocos2dcpp" | Select-Object -First 1
$lo = [Convert]::ToInt64(($m.Matches[0].Groups[1].Value -replace "'", ''), 16)
$hi = $lo + 0x1da3000
"base libcocos2dcpp: {0:x}" -f $lo
$sec = 'stack'
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
