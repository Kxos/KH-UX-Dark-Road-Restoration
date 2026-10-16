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
#
# Prova a secco (-DryRun): stessi generatori su una copia di stage_gen\files in
# tmp\stage_gen_dry, pacchetto e indice controllati contro la riserva dell'ultima versione
# installata (come -Quick); non scrive in resource_data, ne' nel guest, ne' fa login.
#   .\build-resources.ps1 -DryRun
# -NoJp: senza i layout originali JP di import_jp_coco.py (elenco recon\tools\jp_coco_layouts.txt).
# -NoRooms: versione completa senza il pacchetto delle stanze recuperate (rooms_gen, make_jp_rooms.py).
# -NoEnemies: versione completa senza le grafiche originali dei nemici (enemy_gen, make_jp_enemies.py);
#   il master va rigenerato con KHUX_NO_ENEMY_GEN=1, altrimenti i nemici citano grafiche assenti (crash).
# I pacchetti statici di una versione completa sono scritti in resource_data\<N>\packs.txt: -Quick e
# -DryRun usano quelli della versione installata (senza packs.txt: niente stanze, versioni <= 34).
param([int]$Version, [switch]$Quick, [switch]$DryRun, [switch]$NoJp, [switch]$NoRooms, [switch]$NoEnemies)
$ErrorActionPreference = 'Stop'
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot))
Set-Location $repo
$D = 'D:\Progetto_Restauro_KH_UX'
$sg = "$D\stage_gen"
if ($DryRun) {
  $Quick = $true
  $sg = "$D\tmp\stage_gen_dry"
  robocopy "$D\stage_gen\files" "$sg\files" /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw 'copia di stage_gen\files non riuscita' }
  $global:LASTEXITCODE = 0
  New-Item -ItemType Directory -Force "$sg\quest_thumbs" | Out-Null
}
if ($Quick) {
  $Version = [int](Get-ChildItem "$D\resource_data" -Directory | Where-Object Name -match '^\d+$' |
    Sort-Object { [int]$_.Name } | Select-Object -Last 1).Name
} elseif (-not $Version) { throw 'serve -Version N oppure -Quick' }
$key = python -I -c "import sys; d=open(sys.argv[1],'rb').read(); print(d[0xe6ee54:0xe6ee54+32].hex())" "$D\apk501\ext\lib\arm64-v8a\libcocos2dcpp.so"
python -I recon\tools\make_layouts.py "$D\layouts\orig" "$sg\files"
# texture assenti da ogni risorsa, ricostruite (Pillow: senza -I)
python recon\tools\make_textures.py "$D\catalog\files" "$sg\files"
if ($LASTEXITCODE) { throw 'make_textures fallito' }
# piastre di Shop > Draw (I-133): lucchetto img/ui/ShopBut_Lock e _Disable (caricato sempre dalla
# piastra) e But07_Disable (pulsante spento di una piastra bloccata); senza, crash 0x2c
python -I recon\tools\make_shop_lock.py "$D\catalog\files" "$sg\files"
if ($LASTEXITCODE) { throw 'make_shop_lock fallito' }
# Stock Medal (medaglia 1 degli slot vuoti, immagine 90000; I-075)
python recon\tools\make_stock_medal.py "$D\reference\empty_slot\stock_medal_khuxwiki.png" "$D\catalog\files\img\medal" "$sg\files"
if ($LASTEXITCODE) { throw 'make_stock_medal fallito' }
# miniature dell'elenco Story stage_select_ico_<mondo>_<thumbId> (95 assenti: il carosello
# mostrava miniature di altre missioni o il «?», I-064), dalle anteprime di Roboloid in cache
python recon\tools\make_quest_thumbs.py server\master_data\stage.json "$D\catalog\files\img\adventure\stage" "$D\external\roboloid\cache\map" "$sg\files" --report "$sg\quest_thumbs\report.json"
if ($LASTEXITCODE) { throw 'make_quest_thumbs fallito' }
# animazione move delle grafiche di Dark Road usate dai nemici (copia di wait)
$env:BGAD_KEY = $key
# immagini dei keyblade img/keyBlade/KeyBlade_%06d.png (popup del keyblade ottenuto), dalle
# bitmap dei LWF lwf/avatar/keyblade (estratte una volta in catalog\keyblade_lwf)
$kl = "$D\catalog\keyblade_lwf"
if (-not (Test-Path "$kl\img\carouselDeck")) { python -I recon\tools\res_bulk.py "$D\resource_data\names_v4.tsv" "$D\resource_data\7\data" $kl lwf/avatar/keyblade/ lwf/medal/medaltype/ lwf/medal/medaldeck/ img/carouselDeck/ rule/ cocostudio/publish/Deck_KeyBlade_0701_05.png }
# LWF del risultato delle estrazioni servite (raidgacha_result_display_01, Medal_D_Up3): fonte delle
# texture tolte dall'estrazione JP per le cartelle 02-10 (import_jp_raisedraw.py)
$rw = "$D\catalog\raisedraw_ww"
if (-not (Test-Path "$rw\lwf\raisedraw")) { python -I recon\tools\res_bulk.py "$D\resource_data\names_v4.tsv" "$D\resource_data\7\data" $rw lwf/raisedraw/ }
# deck per keyblade (img/carouselDeck/Deck%03d...) e bagliore dell'attributo nel deck
# (MedalDeck_Type1/2/11/21/31/01): servite solo 001 e Type3, crash di «Select a Keyblade»
python recon\tools\make_keyblade_decks.py server\master_data\keyblade.json $kl "$sg\files"
if ($LASTEXITCODE) { throw 'make_keyblade_decks fallito' }
# posa del keyblade nei riquadri dei menu (rule/keyblade_rule.bin, una riga per keyblade, centrata
# come Starlight: Treasure Trove era a destra e tagliato in «Select a Keyblade»)
python -I recon\tools\keyblade_rule.py server\master_data\keyblade.json "$kl\rule\keyblade_rule.bin" "$kl\lwf\avatar\keyblade" "$sg\files"
if ($LASTEXITCODE) { throw 'keyblade_rule fallito' }
python recon\tools\make_keyblade_images.py server\master_data\keyblade.json $kl "$sg\files"
if ($LASTEXITCODE) { throw 'make_keyblade_images fallito' }
# bagliore «medaglia del tipo dello slot» MedalType1/2/01 (solo MedalType3 servito: crash di
# Optimize su Treasure Trove, slot Power)
python recon\tools\make_medaltype_lwf.py $kl "$sg\files"
# armatura ActMapCarouselAnim della 4.3.1 JP (GuiltBonus_Plus, icone di tier 1-10: la WW servita ne ha 8, I-124)
python recon\tools\make_carousel_anim.py
if ($LASTEXITCODE) { throw 'make_medaltype_lwf fallito' }
python -I recon\tools\make_enemy_moves.py server\master_data\enemy.json "$D\resource_data\names_v4.tsv" "$D\resource_data\7\data" "$D\catalog\enemy_wait" "$sg\files"
if ($LASTEXITCODE) { throw 'make_enemy_moves fallito' }
# versioni 4.3.1 (addnl) di file cambiati dall'OBB 5.0.1: wait (avatar fermo nel campo, con il
# keyblade) e win_levelup; nell'indice unito vincerebbe l'OBB (I-091)
python -I recon\tools\prefer_addnl.py "$D\ipa431\names_addnl.tsv" "$D\ipa431\addnl.mp4" "$sg\files"
if ($LASTEXITCODE) { throw 'prefer_addnl fallito' }
# testi ui originali dell'IPA 4.4.0 (import_ui_texts.py -> layouts\ui_texts), dopo quelli
# scritti a mano: dove c'e' l'originale prevale, tranne i segnaposto «[id]» dell'IPA (es. i
# filtri Supernova 106240205-215) quando make_layouts.py ha gia' scritto un testo
python -I recon\tools\import_ui_texts.py "$D\resource_data\names_v4.tsv" "$D\ipa440\names440misc.tsv" "$D\ipa440\miscdata" "$D\layouts\ui_texts" "$D\layouts\served_texts\text\ui"
foreach ($t in Get-ChildItem "$D\layouts\ui_texts\text\ui" -File) {
    $dst = Join-Path "$sg\files\text\ui" $t.Name
    if ((Test-Path $dst) -and ([IO.File]::ReadAllText($t.FullName) -match '^\[\d+\]$')) { continue }
    Copy-Item $t.FullName $dst -Force
}
# piastra «Banner Catalog» dello Shop: testi del pulsante Gold Ticket (106140420-424) e icona
# Star7_Ticket_39 (aveva il segno «仮»), dopo i testi IPA; banner 9001 in server\game_data\gacha_img
python recon	ools\make_shop_art.py "$sgiles" server\game_data
if ($LASTEXITCODE) { throw 'make_shop_art fallito' }
# layout originali dai dati JP 4.3.1 al posto dei nostri generati (I-117): elenco versionato in
# recon\tools\jp_coco_layouts.txt (togliere una riga = torna il generato), sopra l'uscita di
# make_layouts/make_textures; rapporto e manifest in $sg\jp_import (Pillow: senza -I)
# -NoJp: niente originali JP (tornano i generati; serve per un -Quick su una versione installata
# prima degli originali: i ~250 nomi nuovi non stanno nella riserva dell'indice)
$jpOpt = @(); if ($NoJp) { $jpOpt = @('--none') }
python recon\tools\import_jp_coco.py --out "$sg\files" --report "$sg\jp_import" @jpOpt
if ($LASTEXITCODE) { throw 'import_jp_coco fallito' }
# LWF del risultato delle estrazioni (Shop > Draw, raidgacha_result_display_02..10 e Medal_D_*):
# dai dati JP, complete di texture (le tolte dall'estrazione JP prese dalla _01 servita allineando
# le tabelle delle texture); rapporto in $sg\raisedraw_report.json (Pillow: senza -I)
python recon\tools\import_jp_raisedraw.py --ww "$D\catalog\raisedraw_ww" --out "$sg\files" --report "$sg\raisedraw_report.json"
if ($LASTEXITCODE) { throw 'import_jp_raisedraw fallito' }
# PNG veri e BTF non premoltiplicati -> BTF come le originali (alpha premoltiplicata)
python recon\tools\btf_fix.py "$sg\files"
if ($LASTEXITCODE) { throw 'btf_fix fallito' }
python -I recon\tools\resource_pack.py "$sg\files" $key "$sg\gen.mp4" "$sg\gen.png"
# pacchetti statici (medaglie, stanze, nemici) con --cache: rifatti solo se i loro file cambiano
# pacchetto delle immagini delle medaglie (fetch_medal_images.py, ~150 MB): solo nelle
# versioni complete, come penultimo pezzo; -Quick riscrive solo l'ultimo (quello generato)
$mg = "$D\medal_gen"
$medalPack = @()
if (Test-Path "$mg\files") {
  if (-not $Quick) { python recon\tools\btf_fix.py "$mg\files"; python -I recon\tools\resource_pack.py --cache "$mg\files" $key "$mg\gen.mp4" "$mg\gen.png"; if ($LASTEXITCODE) { throw 'resource_pack medaglie fallito' } }
  if (Test-Path "$mg\gen.png") { $medalPack = @("$mg\gen.png", "$mg\gen.mp4") }
}
if ($LASTEXITCODE) { throw 'resource_pack fallito' }
$v = "$D\resource_data\$Version"
# pacchetto delle stanze recuperate (make_jp_rooms.py -> rooms_gen\files: stanze JP 4.3.1/2016 con
# tessere e lwf in BTF): solo nelle versioni complete, dopo le medaglie e prima del generato (che
# vince a nome ripetuto); -Quick non lo ricostruisce mai, lo rimette nell'indice solo se la versione
# installata lo contiene (packs.txt)
$rg = "$D\rooms_gen"
$roomsPack = @()
if ($Quick) {
  if ((Test-Path "$v\packs.txt") -and ((Get-Content "$v\packs.txt") -contains 'rooms_gen')) {
    if (-not (Test-Path "$rg\gen.png")) { throw "la versione $Version contiene rooms_gen ma manca $rg\gen.png" }
    $roomsPack = @("$rg\gen.png", "$rg\gen.mp4")
  }
} elseif (-not $NoRooms -and (Test-Path "$rg\files")) {
  python -I recon\tools\resource_pack.py --cache "$rg\files" $key "$rg\gen.mp4" "$rg\gen.png"
  if ($LASTEXITCODE) { throw 'resource_pack stanze fallito' }
  $roomsPack = @("$rg\gen.png", "$rg\gen.mp4")
}
# pacchetto delle grafiche originali dei nemici (make_jp_enemies.py -> enemy_gen\files: lwf/character/enemy
# JP 4.3.1/2016 in BTF, docs/notes/battaglia.md#nemici-jp): come rooms_gen, dopo le stanze e prima del
# generato; make-game-tables.js tiene il displayId originale dei nemici le cui cartelle sono in enemy_gen\files
$eg = "$D\enemy_gen"
$enemyPack = @()
if ($Quick) {
  if ((Test-Path "$v\packs.txt") -and ((Get-Content "$v\packs.txt") -contains 'enemy_gen')) {
    if (-not (Test-Path "$eg\gen.png")) { throw "la versione $Version contiene enemy_gen ma manca $eg\gen.png" }
    $enemyPack = @("$eg\gen.png", "$eg\gen.mp4")
  }
} elseif (-not $NoEnemies -and (Test-Path "$eg\files")) {
  python -I recon\tools\resource_pack.py --cache "$eg\files" $key "$eg\gen.mp4" "$eg\gen.png"
  if ($LASTEXITCODE) { throw 'resource_pack nemici fallito' }
  $enemyPack = @("$eg\gen.png", "$eg\gen.mp4")
} elseif ($NoEnemies -and (Test-Path "$eg\files")) {
  Write-Warning 'senza enemy_gen: il master deve essere rigenerato con KHUX_NO_ENEMY_GEN=1'
}
$staticPacks = $medalPack + $roomsPack + $enemyPack
# Dimensioni fisse: il client confronta le dimensioni dei file installati con quelle del
# download e, se cambiano, butta le risorse e riscarica tutto (resourceRevision 0). Il
# pacchetto generato si riempie di zeri fino a una riserva (letto per offset, la coda non
# e' mai letta) e l'indice ha un nome di riempimento (resource_merge.py): una versione
# completa riserva 16 MiB e 64 KiB, -Quick ritorna alle dimensioni installate.
# l'ultimo pezzo dei dati e' il pacchetto generato: d0035 + uno per pacchetto statico (medaglie
# d0035, stanze d0036, nemici d0037, generato d0038)
$genName = if ($Quick) { (Get-ChildItem "$v\data" | Sort-Object Name | Select-Object -Last 1).Name } else { 'd{0:D4}' -f (35 + $staticPacks.Count / 2) }
if ($Quick) {
  $dataSize = (Get-Item "$v\data\$genName").Length
  $mergeOpt = @('--fast-md5', '--index-size', (Get-Item "$v\index\misc.png").Length)
} else {
  if (Test-Path $v) { throw "$v esiste gia'" }
  New-Item -ItemType Directory -Force "$v\data", "$v\index" | Out-Null
  Get-ChildItem "$D\resource_data\7\data" | Where-Object Name -ne 'd0035' |
    ForEach-Object { New-Item -ItemType HardLink -Path "$v\data\$($_.Name)" -Target $_.FullName | Out-Null }
  # pacchetti statici come pezzi d0035.. (copie: le versioni dopo li ricostruiscono)
  for ($i = 1; $i -lt $staticPacks.Count; $i += 2) { Copy-Item $staticPacks[$i] ("$v\data\d{0:D4}" -f (35 + ($i - 1) / 2)) }
  $names = @(); if ($medalPack) { $names += 'medal_gen' }; if ($roomsPack) { $names += 'rooms_gen' }; if ($enemyPack) { $names += 'enemy_gen' }
  Set-Content -Encoding ascii "$v\packs.txt" $names
  $dataSize = 128MB  # 4 MiB finiti con le icone dei materiali (10 ottobre), 16 MiB con le miniature Story (11 ottobre), 32 MiB con la musica delle BGM Medals (15 ottobre, ~55 MB di audio)
  $mergeOpt = @('--filler', 65536)   # riserva dell'indice per i cicli -Quick (4 KB finivano presto)
}
$genLen = (Get-Item "$sg\gen.mp4").Length
if ($genLen -gt $dataSize) { throw "pacchetto generato di $genLen byte oltre la riserva di ${dataSize}: serve una versione completa" }
$fs = [IO.File]::Open("$sg\gen.mp4", 'Open', 'ReadWrite'); $fs.SetLength($dataSize); $fs.Close()
if ($DryRun) {
  $o = "$D\obb76"
  $packs = @("$D\apk501\ext\assets\aliud.png", "$o\main.76.com.square_enix.android_googleplay.khuxww.obb,$o\patch.87.com.square_enix.android_googleplay.khuxww.obb",
             "$D\ipa431\addnl.png", "$D\ipa431\addnl.mp4") + $staticPacks + @("$sg\gen.png", "$sg\gen.mp4")
  $want = (Get-Item "$v\index\misc.png").Length
  $ErrorActionPreference = 'Continue'
  $out = python -I recon\tools\resource_merge.py --last-wins @mergeOpt recon\tools recon\ext\ww431\libcocos2dcpp.so $key "$sg\misc_dry.png" @packs 2>&1
  $quick = -not $LASTEXITCODE
  if (-not $quick) {
    # oltre la riserva dell'indice: si prova l'indice di una versione completa (riserva di 64 KiB)
    $out2 = python -I recon\tools\resource_merge.py --last-wins --fast-md5 --filler 65536 recon\tools recon\ext\ww431\libcocos2dcpp.so $key "$sg\misc_dry.png" @packs 2>&1
    if ($LASTEXITCODE) { $out2; throw 'resource_merge fallito anche come versione completa' }
  }
  $ErrorActionPreference = 'Stop'
  $ix = (Get-Item "$sg\misc_dry.png").Length
  "prova a secco su versione ${Version}: pacchetto $genLen byte su $dataSize di riserva ($([math]::Round(100 * $genLen / $dataSize, 1))%)"
  if ($quick) { "indice $ix byte = installato: -Quick possibile; niente scritto in resource_data ne' nel guest" }
  else { "indice oltre la riserva di -Quick ($($out | Select-Object -Last 1)): serve una versione completa (-Version $($Version + 1)); come versione completa l'indice e' di $ix byte. Niente scritto in resource_data ne' nel guest" }
  return
}
# d0035 e' una copia (non un hard link): sovrascriverla non tocca le altre versioni
Copy-Item "$sg\gen.mp4" "$v\data\$genName" -Force
$o = "$D\obb76"
python -I recon\tools\resource_merge.py --last-wins @mergeOpt recon\tools recon\ext\ww431\libcocos2dcpp.so $key "$v\index\misc.png" `
  "$D\apk501\ext\assets\aliud.png" "$o\main.76.com.square_enix.android_googleplay.khuxww.obb,$o\patch.87.com.square_enix.android_googleplay.khuxww.obb" `
  "$D\ipa431\addnl.png" "$D\ipa431\addnl.mp4" @staticPacks "$sg\gen.png" "$sg\gen.mp4"
if ($LASTEXITCODE) { throw 'resource_merge fallito' }
if (-not $Quick) {
  # il client spezza i dati in misc.mp4 + misc.mp4.1 a 2 GiB; oltre 4 GiB servirebbe misc.mp4.2
  # (mai provato) e -Quick non saprebbe dove sta il pacchetto generato
  $total = (Get-ChildItem "$v\data" | Measure-Object Length -Sum).Sum
  "versione ${Version}: dati $([math]::Round($total / 1GB, 2)) GiB in $((Get-ChildItem "$v\data").Count) pezzi, pacchetti statici: $((Get-Content "$v\packs.txt") -join ', ')"
  if ($total -gt 2 * [int64]2147483648) { Write-Warning "dati oltre 4 GiB ($total byte): misc.mp4.2 mai provato sul client" }
  return
}

. "$repo\tools\ldplayer\bench_lib.ps1"
$before = (Get-ChildItem "$v\data" | Where-Object Name -ne $genName | Measure-Object Length -Sum).Sum
$split = [int64]2147483648
if ($before -lt $split -or $before -ge 2 * $split) { throw 'il pacchetto generato non sta in misc.mp4.1' }
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
