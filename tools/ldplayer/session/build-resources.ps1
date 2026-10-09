# Costruisce resource_data\<N>: pezzi OBB 5.0.1 + addnl della versione 7 (hard link) +
# il pacchetto generato (stage_gen\files: mappe, LWF sostitutivi, layout di
# make_layouts.py) come ultimo pezzo, e l'indice unito. Poi si installa con
# update-resources.ps1 (il server annuncia solo l'ultima versione).
#   .\build-resources.ps1 -Version N
#
# Ciclo rapido per le prove (~1,5 min invece di ~5): -Quick rigenera il pacchetto dentro
# l'ultima versione gia' installata (sostituisce d0035 e l'indice) e lo scrive direttamente
# nel guest. I dati del client sono i pezzi concatenati e spezzati a 2 GiB (files/r/misc.mp4,
# misc.mp4.1): il pacchetto generato e' la coda, gli offset dei pezzi prima non cambiano.
# Si tronca misc.mp4.1 dove inizia d0035, si accoda il nuovo, si copia misc.png, poi
# relogin.ps1 (riavvio del server: ricalcola l'md5 dell'indice annunciato).
#   .\build-resources.ps1 -Quick
param([int]$Version, [switch]$Quick)
$ErrorActionPreference = 'Stop'
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot))
Set-Location $repo
$D = 'D:\Progetto_Restauro_KH_UX'
$sg = "$D\stage_gen"
if ($Quick) {
  $Version = [int](Get-ChildItem "$D\resource_data" -Directory | Where-Object Name -match '^\d+$' |
    Sort-Object { [int]$_.Name } | Select-Object -Last 1).Name
} elseif (-not $Version) { throw 'serve -Version N oppure -Quick' }
$key = python -I -c "import sys; d=open(sys.argv[1],'rb').read(); print(d[0xe6ee54:0xe6ee54+32].hex())" "$D\apk501\ext\lib\arm64-v8a\libcocos2dcpp.so"
python -I recon\tools\make_layouts.py "$D\layouts\orig" "$sg\files"
# testi ui originali dell'IPA 4.4.0 (import_ui_texts.py -> layouts\ui_texts), dopo quelli
# scritti a mano: dove c'e' l'originale prevale
python -I recon\tools\import_ui_texts.py "$D\resource_data\names_v4.tsv" "$D\ipa440\names440misc.tsv" "$D\ipa440\miscdata" "$D\layouts\ui_texts"
Copy-Item "$D\layouts\ui_texts\text\ui\*" "$sg\files\text\ui\" -Force
python -I recon\tools\resource_pack.py "$sg\files" $key "$sg\gen.mp4" "$sg\gen.png"
$v = "$D\resource_data\$Version"
if (-not $Quick) {
  if (Test-Path $v) { throw "$v esiste gia'" }
  New-Item -ItemType Directory -Force "$v\data", "$v\index" | Out-Null
  Get-ChildItem "$D\resource_data\7\data" | Where-Object Name -ne 'd0035' |
    ForEach-Object { New-Item -ItemType HardLink -Path "$v\data\$($_.Name)" -Target $_.FullName | Out-Null }
}
# d0035 e' una copia (non un hard link): sovrascriverla non tocca le altre versioni
Copy-Item "$sg\gen.mp4" "$v\data\d0035" -Force
$o = "$D\obb76"
python -I recon\tools\resource_merge.py recon\tools recon\ext\ww431\libcocos2dcpp.so $key "$v\index\misc.png" `
  "$D\apk501\ext\assets\aliud.png" "$o\main.76.com.square_enix.android_googleplay.khuxww.obb,$o\patch.87.com.square_enix.android_googleplay.khuxww.obb" `
  "$D\ipa431\addnl.png" "$D\ipa431\addnl.mp4" "$sg\gen.png" "$sg\gen.mp4"
if (-not $Quick) { return }

. "$repo\tools\ldplayer\bench_lib.ps1"
$before = (Get-ChildItem "$v\data" | Where-Object Name -ne 'd0035' | Measure-Object Length -Sum).Sum
$split = [int64]2147483648
if ($before -lt $split) { throw 'il pacchetto generato non sta in misc.mp4.1' }
$tail = $before - $split
$genLen = (Get-Item "$v\data\d0035").Length
Copy-Item "$v\data\d0035" "$SHARED\q_gen.bin" -Force
Copy-Item "$v\index\misc.png" "$SHARED\q_index.bin" -Force
$r = "/data/data/$PKG/files/r"
Sh "am force-stop $PKG" | Out-Null
Sh "u=`$(stat -c %u:%g $r/misc.mp4); truncate -s $tail $r/misc.mp4.1 && cat /sdcard/Pictures/q_gen.bin >> $r/misc.mp4.1 && cat /sdcard/Pictures/q_index.bin > $r/misc.png && chown `$u $r/misc.mp4.1 $r/misc.png" | Out-Null
Remove-Item "$SHARED\q_gen.bin", "$SHARED\q_index.bin"
$got = "$(Sh "stat -c %s $r/misc.mp4.1 $r/misc.png")" -split '\s+' | Where-Object { $_ }
$want = @(($tail + $genLen), (Get-Item "$v\index\misc.png").Length)
if ([int64]$got[0] -ne $want[0] -or [int64]$got[1] -ne $want[1]) { throw "scrittura nel guest non riuscita: $got invece di $want" }
"versione $Version aggiornata nel guest: misc.mp4.1 $($got[0]), misc.png $($got[1])"
& "$PSScriptRoot\relogin.ps1" -Tag 'quick' | Select-Object -Last 1
