param([string]$Out, [string]$Shot = 'khuxstart', [int]$Wait = 25)
# Avvio da zero e KHUX START; poi screenshot e ultime richieste al server.
$ld = 'D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9'
$pkg = 'com.square_enix.android_googleplay.khuxww'
& "$ld\ld.exe" -s 0 "logcat -c; rm -f /data/tombstones/*; am force-stop $pkg; monkey -p $pkg -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1"
Start-Sleep 75
& "$ld\ld.exe" -s 0 "input tap 200 1020"
Start-Sleep $Wait
& "$ld\ld.exe" -s 0 "screencap -p /sdcard/Pictures/$Shot.png"
Get-Content $Out | Where-Object { $_ -notmatch '\[dns\]|dns:dirottata|tls:sni|content-type' } |
    Select-String -Pattern '#\d+ |body\(decifrato|\[master\]' | Select-Object -Last 14 | ForEach-Object { $_.Line.Substring(0, [Math]::Min(220, $_.Line.Length)) }
"pid: " + (& "$ld\ld.exe" -s 0 "pidof $pkg")
