# Costruisce resource_data\<N>: pezzi OBB 5.0.1 + addnl della versione 7 (hard link) +
# il pacchetto generato (stage_gen\files: mappe, LWF sostitutivi, layout di
# make_layouts.py) come ultimo pezzo, e l'indice unito. Poi si installa con
# update-resources.ps1 (il server annuncia solo l'ultima versione).
#   .\build-resources.ps1 -Version N
#
# Ciclo rapido per le prove (~1 min invece di ~5): -Quick rigenera il pacchetto dentro
# l'ultima versione gia' installata (sostituisce d0035 e l'indice) e lo scrive direttamente
# nel guest. I dati del client sono i pezzi concatenati e spezzati a 2 GiB (files/r/misc.mp4,
# misc.mp4.1): il pacchetto generato e' la coda, gli offset dei pezzi prima non cambiano.
# Si tronca misc.mp4.1 dove inizia d0035, si accoda il nuovo, si copia misc.png, poi
# riavvio dell'app (il server resta acceso). Dimensioni fisse: vedi sotto.
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
# texture assenti da ogni risorsa, ricostruite (Pillow: senza -I)
python recon\tools\make_textures.py "$D\catalog\files" "$sg\files"
if ($LASTEXITCODE) { throw 'make_textures fallito' }
# testi ui originali dell'IPA 4.4.0 (import_ui_texts.py -> layouts\ui_texts), dopo quelli
# scritti a mano: dove c'e' l'originale prevale
python -I recon\tools\import_ui_texts.py "$D\resource_data\names_v4.tsv" "$D\ipa440\names440misc.tsv" "$D\ipa440\miscdata" "$D\layouts\ui_texts" "$D\layouts\served_texts\text\ui"
Copy-Item "$D\layouts\ui_texts\text\ui\*" "$sg\files\text\ui\" -Force
python -I recon\tools\resource_pack.py "$sg\files" $key "$sg\gen.mp4" "$sg\gen.png"
# pacchetto delle immagini delle medaglie (fetch_medal_images.py, ~150 MB): solo nelle
# versioni complete, come penultimo pezzo; -Quick riscrive solo l'ultimo (quello generato)
$mg = "$D\medal_gen"
$medalPack = @()
if (Test-Path "$mg\files") {
  if (-not $Quick) { python -I recon\tools\resource_pack.py "$mg\files" $key "$mg\gen.mp4" "$mg\gen.png"; if ($LASTEXITCODE) { throw 'resource_pack medaglie fallito' } }
  if (Test-Path "$mg\gen.png") { $medalPack = @("$mg\gen.png", "$mg\gen.mp4") }
}
if ($LASTEXITCODE) { throw 'resource_pack fallito' }
$v = "$D\resource_data\$Version"
# Dimensioni fisse: il client confronta le dimensioni dei file installati con quelle del
# download e, se cambiano, butta le risorse e riscarica tutto (resourceRevision 0). Il
# pacchetto generato si riempie di zeri fino a una riserva (letto per offset, la coda non
# e' mai letta) e l'indice ha un nome di riempimento (resource_merge.py): una versione
# completa riserva 16 MiB e 64 KiB, -Quick ritorna alle dimensioni installate.
# l'ultimo pezzo dei dati e' il pacchetto generato (d0035, o d0036 con quello delle medaglie)
$genName = if ($Quick) { (Get-ChildItem "$v\data" | Sort-Object Name | Select-Object -Last 1).Name } elseif ($medalPack) { 'd0036' } else { 'd0035' }
if ($Quick) {
  $dataSize = (Get-Item "$v\data\$genName").Length
  $mergeOpt = @('--fast-md5', '--index-size', (Get-Item "$v\index\misc.png").Length)
} else {
  if (Test-Path $v) { throw "$v esiste gia'" }
  New-Item -ItemType Directory -Force "$v\data", "$v\index" | Out-Null
  Get-ChildItem "$D\resource_data\7\data" | Where-Object Name -ne 'd0035' |
    ForEach-Object { New-Item -ItemType HardLink -Path "$v\data\$($_.Name)" -Target $_.FullName | Out-Null }
  if ($medalPack) { Copy-Item "$mg\gen.mp4" "$v\data\d0035" }
  $dataSize = 16MB   # 4 MiB finiti con le icone dei materiali della khuxwiki (10 ottobre)
  $mergeOpt = @('--filler', 65536)   # riserva dell'indice per i cicli -Quick (4 KB finivano presto)
}
$genLen = (Get-Item "$sg\gen.mp4").Length
if ($genLen -gt $dataSize) { throw "pacchetto generato di $genLen byte oltre la riserva di ${dataSize}: serve una versione completa" }
$fs = [IO.File]::Open("$sg\gen.mp4", 'Open', 'ReadWrite'); $fs.SetLength($dataSize); $fs.Close()
# d0035 e' una copia (non un hard link): sovrascriverla non tocca le altre versioni
Copy-Item "$sg\gen.mp4" "$v\data\$genName" -Force
$o = "$D\obb76"
python -I recon\tools\resource_merge.py --last-wins @mergeOpt recon\tools recon\ext\ww431\libcocos2dcpp.so $key "$v\index\misc.png" `
  "$D\apk501\ext\assets\aliud.png" "$o\main.76.com.square_enix.android_googleplay.khuxww.obb,$o\patch.87.com.square_enix.android_googleplay.khuxww.obb" `
  "$D\ipa431\addnl.png" "$D\ipa431\addnl.mp4" @medalPack "$sg\gen.png" "$sg\gen.mp4"
if ($LASTEXITCODE) { throw 'resource_merge fallito' }
if (-not $Quick) { return }

. "$repo\tools\ldplayer\bench_lib.ps1"
$before = (Get-ChildItem "$v\data" | Where-Object Name -ne $genName | Measure-Object Length -Sum).Sum
$split = [int64]2147483648
if ($before -lt $split) { throw 'il pacchetto generato non sta in misc.mp4.1' }
$tail = $before - $split
$genLen = (Get-Item "$v\data\$genName").Length
Copy-Item "$v\data\$genName" "$SHARED\q_gen.bin" -Force
Copy-Item "$v\index\misc.png" "$SHARED\q_index.bin" -Force
$r = "/data/data/$PKG/files/r"
Sh "am force-stop $PKG" | Out-Null
Sh "u=`$(stat -c %u:%g $r/misc.mp4); truncate -s $tail $r/misc.mp4.1 && cat /sdcard/Pictures/q_gen.bin >> $r/misc.mp4.1 && cat /sdcard/Pictures/q_index.bin > $r/misc.png && chown `$u $r/misc.mp4.1 $r/misc.png" | Out-Null
Remove-Item "$SHARED\q_gen.bin", "$SHARED\q_index.bin"
$got = "$(Sh "stat -c %s $r/misc.mp4.1 $r/misc.png")" -split '\s+' | Where-Object { $_ }
$want = @(($tail + $genLen), (Get-Item "$v\index\misc.png").Length)
if ([int64]$got[0] -ne $want[0] -or [int64]$got[1] -ne $want[1]) { throw "scrittura nel guest non riuscita: $got invece di $want" }
"versione $Version aggiornata nel guest: misc.mp4.1 $($got[0]), misc.png $($got[1])"
# solo l'app riparte: il server resta acceso (riavviarlo ricalcolerebbe gli md5 di 2,3 GB;
# la revisione delle risorse non cambia, quindi nessun download)
if (Get-Process node -ErrorAction SilentlyContinue) {
  & "$repo\tools\ldplayer\bench_start.ps1" -Out 'D:\Progetto_Restauro_KH_UX\logs\server.log' -Shot 'quick_home' -Settle 6 | Select-Object -Last 1
} else { & "$PSScriptRoot\relogin.ps1" -Tag 'quick' | Select-Object -Last 1 }
