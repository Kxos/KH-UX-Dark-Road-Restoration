param([string]$Out, [string]$Shot = 'khuxtut', [string]$Name = 'Kxos', [int]$Taps = 10)
# Nuovo giocatore, dopo bench_newcomer.ps1 (fermo alla registrazione del nome):
# nome, editor avatar (OK + conferma), scena della vetrata, popup Unions, Unicornis,
# conferma, poi tocchi sulla scena animata. Screenshot e ultime richieste.
$ld = 'D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9'
$pkg = 'com.square_enix.android_googleplay.khuxww'
function T($x, $y, $w) { & "$ld\ld.exe" -s 0 "input tap $x $y"; Start-Sleep $w }
T 958 510 3
& "$ld\ld.exe" -s 0 "input text $Name; input keyevent 66"; Start-Sleep 3
T 958 988 10                       # OK sul nome -> editor avatar
T 1234 1008 6                      # OK nell'editor
T 1220 968 15                      # "Begin with this avatar?" -> OK
foreach ($i in 1..6) { T 960 900 3 } # scena della vetrata
T 958 975 5                        # popup "Unions" -> OK
T 958 300 5                        # Unicornis
T 1222 848 15                      # "Join Unicornis?" -> OK
foreach ($i in 1..$Taps) { T 960 900 3 }
& "$ld\ld.exe" -s 0 "screencap -p /sdcard/Pictures/$Shot.png"
Get-Content $Out | Where-Object { $_ -notmatch '\[dns\]|dns:dirottata|tls:sni|content-type|GET /master/' } |
    Select-String -Pattern '^\S*\[(ok|\?|!)\S*\s+#\d+|body\(decifrato' | Select-Object -Last 8 |
    ForEach-Object { $_.Line.Substring(0, [Math]::Min(300, $_.Line.Length)) }
"pid: " + (& "$ld\ld.exe" -s 0 "pidof $pkg")
& "$ld\ld.exe" -s 0 "ls /data/tombstones/ 2>/dev/null"
