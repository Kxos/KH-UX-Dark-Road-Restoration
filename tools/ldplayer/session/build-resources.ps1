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
# -NoRaisedraw: versione completa senza le LWF del risultato delle estrazioni (raisedraw_gen,
#   import_jp_raisedraw.py); KHUX_GACHA_SIZES va ridotto a 1 (solo raidgacha_result_display_01 servita).
# I pacchetti statici di una versione completa sono scritti in resource_data\<N>\packs.txt: -Quick e
# -DryRun usano quelli della versione installata (senza packs.txt: niente stanze, versioni <= 34).
param([int]$Version, [switch]$Quick, [switch]$DryRun, [switch]$NoJp, [switch]$NoRooms, [switch]$NoEnemies, [switch]$NoRaisedraw)
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
$key = python -I -c "import sys; d=open(sys.argv[1],'rb').read(); print(d[[offset]:[offset]+32].hex())" "$D\apk501\ext\lib\arm64-v8a\libcocos2dcpp.so"
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
# KeyBlade_ef6/ef8 e star01 di GuiltBonus_max (fonte per nome, NAME_WW di import_jp_raisedraw.py, 19-10)
if (-not (Test-Path "$rw\lwf\battleresult\Result_LuxLevelUp")) { python -I recon\tools\res_bulk.py "$D\resource_data\names_v4.tsv" "$D\resource_data\7\data" $rw lwf/battleresult/Result_LuxLevelUp/ }
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
# testi di dialogo degli NPC (text/drama/2040xxxxx, I-154): citati dai record npc delle mappe gia' in
# $sg\files\stage, scaricati dal CDN nell'originale (nelle risorse WW solo 204010301); dal pacchetto
# 2016 (inglese), in mancanza dal JP 4.3.1 (segnalati); senza, toccare l'NPC con la nuvoletta non fa nulla
python -I recon\tools\import_npc_talk.py "$D\resource_data\names_v4.tsv" "$D\tmp\thethiny_x\bundle2016" `
  "$D\[local reference data]\\[local reference data]\data\[local reference data]\data\jp_final_4.3.1\text\drama" `
  "$sg\files\stage" "$sg\files" --report "$sg\npc_talk.json"
if ($LASTEXITCODE) { throw 'import_npc_talk fallito' }
# pulsante «Overwrite Skill» del Level Up acceso (I-157): [fn] carica skill_mix_button_On/_Disable e,
# acceso, le cornici Medal_Syn_Select_Panel02 in img/ui; WW serve solo _Off (acceso restava grigio). BTF del 2016
# Icona skill 3 (thumbId 3: Lux Plus e le combo «& Lux Plus»): WW serve img/skill/Skill_Icon1,2,4-9 ma non la 3;
# senza, il riquadro teneva l'icona di prima (Lux Plus con la freccia rossa di Attack Boost, banco 18-10)
# Controllo delle immagini dal nome composto con un numero (18-10, risorse_layout.md#icone-numerate): le
# mancanti con una fonte. Dal pacchetto 2016 (BTF uguali byte per byte ai WW dove ci sono entrambi):
# - IncentiveIcon_NN: icona di un premio per tipo, costanti di [fn] (tipo 7 titolo, 8 CP, 9 HP, 26 Skip
#   Ticket, ... usati da reward/mission); WW serve solo 02/04/14. Escluse 10 e 12 (giapponese disegnato)
# - material_54 (material.materialId 54, Remembrance Gem; [fn] tipo 5, riga material +0)
# - Prize_Treasure02-04 ([fn], «Prize_Treasure%02d» dal premio +0x48; WW solo 01)
# - Topinfo_BarBut1,3-7 _Off/_On ([fn]/[fn]/[fn]: «Button_%d», indice+1; WW solo 2)
# - Deck_Arrow_U/R1-3 (frecce del bonus di attributo del deck, [fn]; WW solo publish/Deck_Arrow_U1)
# - tutorial_N ([fn] -> [fn] «tutorial_%d», id 1-65 costanti dei chiamanti): le 19 del 2016
#   in inglese; quelle dei soli dati JP (48-65) hanno il testo giapponese e restano assenti (ISSUES I-159)
# - light/NPC/39994,39996,39997 (immagini dei SEQ light novel 1010151/1989901, comando 4002)
$img16 = @('ui\skill_mix_button_On', 'ui\skill_mix_button_Disable', 'ui\Medal_Syn_Select_Panel02', 'skill\Skill_Icon3',
  'material\material_54', 'prizes\Prize_Treasure02', 'prizes\Prize_Treasure03', 'prizes\Prize_Treasure04',
  'light\NPC\39994', 'light\NPC\39996', 'light\NPC\39997')
$img16 += @(6, 7, 8, 9, 11, 15, 16, 17, 26, 28, 29) | ForEach-Object { 'incentive\IncentiveIcon_{0:D2}' -f $_ }
$img16 += @(1, 3, 4, 5, 6, 7) | ForEach-Object { "ui\Topinfo_BarBut${_}_Off"; "ui\Topinfo_BarBut${_}_On" }
$img16 += @(1, 2, 3) | ForEach-Object { "ui\Deck_Arrow_U$_"; "ui\Deck_Arrow_R$_" }
$img16 += @(12, 13, 16, 17, 20, 21, 22, 23, 24, 25, 27, 29, 30, 32, 33, 34, 45, 46, 47) | ForEach-Object { "tutorial\tutorial_$_" }
foreach ($n in $img16) {
    $src = "$D\tmp\thethiny_x\bundle2016\files\img\$n.png"
    if (-not (Test-Path $src)) { throw "manca $src" }
    New-Item -ItemType Directory -Force (Split-Path "$sg\files\img\$n.png") | Out-Null
    Copy-Item $src "$sg\files\img\$n.png" -Force
}
# Dai dati JP 4.3.1 (PNG, revisione piu' alta; btf_fix le premoltiplica), senza testo disegnato:
# - IncentiveIcon_30-32, 35-41 ([fn]: 40 Platinum Ticket e 41 Draw Ticket nelle missioni 4059/4060/4091)
# - AvtInfo_CrownIcon1-3 / trophyIcon1-2 del Profilo ([fn]: corona = (mvpCount-1)/50+1, trofeo =
#   (pvpMvpCount-1)/50+1 senza segno, fino a 4; col nostro 0 il client chiede CrownIcon1 e trophyIcon4)
# - cifre del danno dmgGuardBreak/dmgReflection_num0-9 e _comma (tabella 0x1f2c2a0 di [fn], tipi 5 e 6)
$jpImg = "$D\[local reference data]\\[local reference data]\data\[local reference data]\data\jp_final_4.3.1\img"
$imgJp = @(30, 31, 32, 35, 36, 37, 38, 39, 40, 41) | ForEach-Object { 'incentive\IncentiveIcon_{0:D2}' -f $_ }
$imgJp += @('ui\AvtInfo_CrownIcon1', 'ui\AvtInfo_CrownIcon2', 'ui\AvtInfo_CrownIcon3', 'ui\AvtInfo_trophyIcon1', 'ui\AvtInfo_trophyIcon2')
foreach ($k in 'GuardBreak', 'Reflection') { $imgJp += @(0..9 | ForEach-Object { "damage\dmg${k}_num$_" }) + "damage\dmg${k}_comma" }
# - arco dell'HP in battaglia (PlayerStatusIndicator, I-032): oltre 3000 HP il client carica Avatar_Circle_06 e
#   Avatar_Side_02-04, assenti dalle risorse WW (prima: HP del giocatore fermo a 3000)
$imgJp += @('ui\PlayerStatusIndicator\Avatar_Circle_06') + (2..4 | ForEach-Object { "ui\PlayerStatusIndicator\Avatar_Side_0$_" })
foreach ($n in $imgJp) {
    $leaf = Split-Path -Leaf $n
    $cand = @(Get-ChildItem (Split-Path "$jpImg\$n.png") -File | Where-Object { $_.Name -match ('^' + [regex]::Escape($leaf) + '(\.\d{8})?\.png$') } |
      Sort-Object { if ($_.Name -match '\.(\d{8})\.png$') { [int]$Matches[1] } else { -1 } })
    if (-not $cand) { throw "manca $jpImg\$n.png" }
    New-Item -ItemType Directory -Force (Split-Path "$sg\files\img\$n.png") | Out-Null
    Copy-Item $cand[-1].FullName "$sg\files\img\$n.png" -Force
}
# Serviti solo sotto cocostudio/publish (non valgono per img/...): stesso file anche in img/ (WW localizzate:
# CrownIcon4, trophyIcon3/4, IncentiveIcon_42 Premium Ticket). Estratti una volta in catalog\img_alias
$alias = @{ 'ui\AvtInfo_CrownIcon4' = 'cocostudio/publish/AvtInfo_CrownIcon4.png'; 'ui\AvtInfo_trophyIcon3' = 'cocostudio/publish/AvtInfo_trophyIcon3.png'
  'ui\AvtInfo_trophyIcon4' = 'cocostudio/publish/AvtInfo_trophyIcon4.png'; 'incentive\IncentiveIcon_42' = 'cocostudio/publish/IncentiveIcon_42.png'
  # arco dell'HP (I-032): nelle risorse WW solo sotto cocostudio/publish, stesse dimensioni di quelle in img/ui
  'ui\PlayerStatusIndicator\Avatar_Circle_01' = 'cocostudio/publish/Avatar_Circle_01.png'; 'ui\PlayerStatusIndicator\Avatar_Side_01' = 'cocostudio/publish/Avatar_Side_01.png' }
$ac = "$D\catalog\img_alias"
$need = @($alias.Values | Where-Object { -not (Test-Path "$ac\$_") })
if ($need) { python -I recon\tools\res_get.py "$D\resource_data\names_v4.tsv" "$D\resource_data\7\data" $ac @need; if ($LASTEXITCODE) { throw 'res_get img_alias fallito' } }
foreach ($k in $alias.Keys) {
    if (-not (Test-Path "$ac\$($alias[$k])")) { throw "manca $ac\$($alias[$k])" }
    New-Item -ItemType Directory -Force (Split-Path "$sg\files\img\$k.png") | Out-Null
    Copy-Item "$ac\$($alias[$k])" "$sg\files\img\$k.png" -Force
}
# piastra «Banner Catalog» dello Shop: testi del pulsante Gold Ticket (106140420-424) e icona
# Star7_Ticket_39 (aveva il segno «仮»), dopo i testi IPA; banner 9001 in server\game_data\gacha_img
python recon\tools\make_shop_art.py "$sg\files" server\game_data
if ($LASTEXITCODE) { throw 'make_shop_art fallito' }
# LWF del risultato delle estrazioni (raisedraw_gen\files, pacchetto statico: vedi sotto) importati PRIMA di
# import_jp_coco: i suoni dei loro eventi (x10 draw 509000390, popup del Nova 509000740, I-152) li cerca
# jp_sound_effects.py, che deve vedere le cartelle gia' scritte anche partendo da raisedraw_gen vuoto. Le
# cartelle files\ di rooms_gen ed enemy_gen non le scrive questo script (make_jp_rooms.py, make_jp_enemies.py):
# ci sono gia' quando parte.
$xg = "$D\raisedraw_gen"
if (-not $NoRaisedraw -and (-not $Quick -or -not (Test-Path "$xg\files"))) {
  # logo «NOVA» del popup del Nova al posto del «BURST» JP (make_nova_logo.py -> raisedraw_gen\nova, fuori
  # da git): sostituisce Burst_Logo / Burst_Logo_B (422x142) di GuiltBonus_BurstLvup con --replace
  python recon\tools\make_nova_logo.py --out "$xg\nova"
  if ($LASTEXITCODE) { throw 'make_nova_logo fallito' }
  $burst = 'lwf/medal/guilt_bonus/GuiltBonus_BurstLvup/GuiltBonus_BurstLvup_'
  $novaReplace = @('--replace', "${burst}42757273745f4c6f676f2e706e67.png=$xg\nova\Burst_Logo.png",
                   '--replace', "${burst}42757273745f4c6f676f5f422e706e67.png=$xg\nova\Burst_Logo_B.png")
  python recon\tools\import_jp_raisedraw.py --ww "$D\catalog\raisedraw_ww" --out "$xg\files" --report "$xg\raisedraw_report.json" @novaReplace
  if ($LASTEXITCODE) { throw 'import_jp_raisedraw fallito' }
}
# layout originali dai dati JP 4.3.1 al posto dei nostri generati (I-117): elenco versionato in
# recon\tools\jp_coco_layouts.txt (togliere una riga = torna il generato), sopra l'uscita di
# make_layouts/make_textures; rapporto e manifest in $sg\jp_import (Pillow: senza -I)
# Copia anche (pure con -NoJp) gli AKB delle BGM Medals e gli effetti sonori se_<nome> dei LWF serviti e
# generati assenti dalle risorse (jp_sound_effects.py, I-152: x10 draw, popup del Nova, nemici JP; ~4,3 MB;
# rapporto $sg\jp_import\sound_effects.json), leggendo anche i LWF dei pacchetti statici.
# -NoJp: niente originali JP (tornano i generati; serve per un -Quick su una versione installata
# prima degli originali: i ~250 nomi nuovi non stanno nella riserva dell'indice)
$jpOpt = @(); if ($NoJp) { $jpOpt = @('--none') }
# pacchetti statici che non saranno nell'indice: esclusi dalla ricerca dei suoni (-NoRooms/-NoEnemies/
# -NoRaisedraw; con -Quick quelli assenti da packs.txt della versione installata)
$seOpt = @()
$instPacks = if ($Quick -and (Test-Path "$D\resource_data\$Version\packs.txt")) { @(Get-Content "$D\resource_data\$Version\packs.txt") } else { @() }
foreach ($sp in @(@('rooms_gen', $NoRooms), @('enemy_gen', $NoEnemies), @('raisedraw_gen', $NoRaisedraw))) {
  if ($sp[1] -or ($Quick -and $instPacks -notcontains $sp[0])) { $seOpt += @('--no-static', $sp[0]) }
}
python recon\tools\import_jp_coco.py --out "$sg\files" --report "$sg\jp_import" @jpOpt @seOpt
if ($LASTEXITCODE) { throw 'import_jp_coco fallito' }
# originali (2016, JP 4.3.1) al posto delle nostre ricostruzioni, dopo tutti i generatori (I-170, recon\tools\originals.tsv)
python -I recon\tools\import_originals.py recon\tools\originals.tsv "$D\tmp\thethiny_x\bundle2016\files" `
  "$D\[local reference data]\\[local reference data]\data\[local reference data]\data\jp_final_4.3.1" "$sg\files" `
  --served "$D\resource_data\names_v4.tsv,$D\ipa431\names_addnl.tsv" --report "$sg\originals.json"
if ($LASTEXITCODE) { throw 'import_originals fallito' }
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
  # Trait Medal (I-084 parte B): medaglia associata in bianco e nero, id 9000000+N (server/trait_medals.json);
  # ~180 MB, oltre la riserva del pacchetto generato: stanno col pacchetto delle medaglie
  if (-not $Quick) { python recon\tools\make_trait_medal_images.py server\trait_medals.json "$mg\files" "$mg\files"; if ($LASTEXITCODE) { throw 'make_trait_medal_images fallito' } }
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
# pacchetto delle LWF del risultato delle estrazioni (Shop > Draw, raidgacha_result_display_02..10 e
# Medal_D_*): dai dati JP con import_jp_raisedraw.py, complete di texture (le tolte dall'estrazione JP prese
# dalla _01 servita allineando le tabelle delle texture). Nel generato (16-10) lo portavano a 136,5 MB, oltre
# la riserva di 128 MiB (~33 MB: 72-78 texture per cartella): pacchetto statico come enemy_gen, dopo i nemici e
# prima del generato. Importato piu' sopra (prima di import_jp_coco, per i suoni di I-152) nelle versioni
# complete o se manca raisedraw_gen\files; rapporto in raisedraw_gen\raisedraw_report.json (Pillow: senza -I)
$raisedrawPack = @()
if ($Quick) {
  if ((Test-Path "$v\packs.txt") -and ((Get-Content "$v\packs.txt") -contains 'raisedraw_gen')) {
    if (-not (Test-Path "$xg\gen.png")) { throw "la versione $Version contiene raisedraw_gen ma manca $xg\gen.png" }
    $raisedrawPack = @("$xg\gen.png", "$xg\gen.mp4")
  }
} elseif (-not $NoRaisedraw -and (Test-Path "$xg\files")) {
  python recon\tools\btf_fix.py "$xg\files"
  if ($LASTEXITCODE) { throw 'btf_fix raisedraw fallito' }
  python -I recon\tools\resource_pack.py --cache "$xg\files" $key "$xg\gen.mp4" "$xg\gen.png"
  if ($LASTEXITCODE) { throw 'resource_pack raisedraw fallito' }
  $raisedrawPack = @("$xg\gen.png", "$xg\gen.mp4")
}
$staticPacks = $medalPack + $roomsPack + $enemyPack + $raisedrawPack
# Dimensioni fisse: il client confronta le dimensioni dei file installati con quelle del
# download e, se cambiano, butta le risorse e riscarica tutto (resourceRevision 0). Il
# pacchetto generato si riempie di zeri fino a una riserva (letto per offset, la coda non
# e' mai letta) e l'indice ha un nome di riempimento (resource_merge.py): una versione
# completa riserva 16 MiB e 64 KiB, -Quick ritorna alle dimensioni installate.
# l'ultimo pezzo dei dati e' il pacchetto generato: d0035 + uno per pacchetto statico (medaglie
# d0035, stanze d0036, nemici d0037, estrazioni raisedraw d0038, generato d0039)
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
  $names = @(); if ($medalPack) { $names += 'medal_gen' }; if ($roomsPack) { $names += 'rooms_gen' }; if ($enemyPack) { $names += 'enemy_gen' }; if ($raisedrawPack) { $names += 'raisedraw_gen' }
  Set-Content -Encoding ascii "$v\packs.txt" $names
  $dataSize = 176MB  # 128 MiB fino al 19 ottobre (originali di I-170, ~33 MB; 192 MiB portava i dati oltre 4 GiB); 4 MiB finiti con le icone dei materiali (10 ottobre), 16 MiB con le miniature Story (11 ottobre), 32 MiB con la musica delle BGM Medals (15 ottobre, ~55 MB di audio)
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
