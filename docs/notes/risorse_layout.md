# Risorse, layout mancanti, texture

Come sono fatte le risorse servite al client 4.3.1 e come si ricostruiscono le schermate
mancanti. Storia: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md).

<a id="pacchetti"></a>
## Pacchetti BGAD e indici

- Gli asset (`misc.mp4`, `extra.mp4`, `aliud.png`, OBB, `addnl`) sono pacchetti **BGAD** del
  `bg::FileManager`: record con header di 24 byte, cifratura ChaCha8 (chiave a `[offset]` della
  libreria, IV dal nonce in coda). I nomi stanno nell'indice `.png` omonimo, con un secondo strato
  ChaCha8. Nomi dei record offuscati con LCG `seed*0x19660d + 0x3c6ef35f`. Formato descritto in
  testa a `recon/tools/bgad.py`.
- I record con cifratura 3 dei pacchetti montati come risorse si aprono con la chiave di sessione
  (per noi la 5.0.1): `BGAD_KEY=<hex> recon/tools/bgad_extract.py`.
- Il client monta: lato KHUX `r/misc.png`+`r/misc.mp4` (slot 1) e `addnl.png`+`addnl.mp4` (slot 2,
  solo iOS); lato Dark `aliud.png` con [OBB main, OBB patch, `r/.misc.mp4`].
- **Versione 3** = OBB 5.0.1 (`main.76` + `patch.87`, dati di Dark Road ma con la grafica completa)
  + `addnl` dell'IPA iOS 4.3.1 (layout KHUX della 4.3.1) in un solo pacchetto
  (`resource_merge.py`; a parita' di nome vince il primo). Dalla 4 in poi si aggiunge il pacchetto
  generato (`resource_pack.py`), dalla 30 anche il pacchetto delle medaglie (`medal_gen`, penultimo
  pezzo). `--last-wins`: il pacchetto generato puo' sostituire file originali.
- **Pezzi di una versione completa** (`build-resources.ps1 -Version N`): `d0000`-`d0034` della 7
  (hard link: OBB 5.0.1, `aliud`, `addnl` 4.3.1), poi i pacchetti statici, ricostruiti solo nelle
  versioni complete: `d0035` medaglie (`medal_gen`, ~850 MB), `d0036` **stanze recuperate**
  (`rooms_gen`, `make_jp_rooms.py`, 732 MB nella 35; `-NoRooms` per farne a meno), dalla 36
  `d0037` **grafiche originali dei nemici** (`enemy_gen`, `make_jp_enemies.py`, 53 MB;
  `-NoEnemies` per farne a meno, con il master rigenerato a `KHUX_NO_ENEMY_GEN=1`:
  [battaglia.md#nemici-jp](battaglia.md#nemici-jp)), poi il generato (`stage_gen`, `d0037` fino alla
  35, `d0038` dalla 36, `d0039` dalla 46; riserva 176 MiB nella 47, 168 MiB dalla 48) che vince su tutti. Elenco dei pacchetti statici in
  `resource_data\<N>\packs.txt`: `-Quick`/`-DryRun` rimettono nell'indice quelli della versione
  installata (senza `packs.txt`, versioni <= 34: niente stanze) e non ricostruiscono mai `rooms_gen`
  ne' `enemy_gen`.
  Il client spezza i dati in `misc.mp4`, `misc.mp4.1`, `misc.mp4.2` ... a 2 GiB: la 47 ha
  4.286.993.546 byte (3,99 GiB, **7,6 MiB sotto i 4 GiB**); limiti e misure in [Pezzi e 4 GiB](#pezzi).
  Stanze: [mappe_storia.md#stanze-jp](mappe_storia.md#stanze-jp).
- Strumenti: `res_get.py <nomi.tsv> <resource_data\N\data> <uscita> <nome>...` (estrae per nome in
  `D:\Progetto_Restauro_KH_UX\layouts\orig\`), `res_bulk.py` (estrazione in blocco, 16 s per 4000
  file), `catalog.py` (catalogo, 2 min), `asset_coverage.py` (asset citati dal binario contro un
  indice), `resource_split.py` (pezzi da 64 MB), `remote_zip.py` (un file da uno zip remoto con
  Range).

<a id="pezzi"></a>
## Pezzi e 4 GiB (I-171)

Analisi statica del client WW 4.3.1 (20-10, `D:\Progetto_Restauro_KH_UX\tmp\res4g\client-analysis.md`):
- I "data" scaricati si accodano in `files/r/misc.mp4` e, ogni 2 GiB (0x80000000), nel pezzo dopo:
  `misc.mp4.1`, `misc.mp4.2` ... (`[fn]`, `"%s.%d"`). Il lettore (`[fn]`) apre al
  massimo **10 file** (`misc.mp4` .. `misc.mp4.9`): tetto **20 GiB** (21.474.836.480 byte). Oltre, lo
  scrittore crea `misc.mp4.10` che nessuno legge: dimensioni diverse all'avvio, risorse cancellate e
  riscaricate a ogni avvio.
- Offset, posizioni e totali a 64 bit: pezzo = offset >> 31, offset locale = offset & 0x7fffffff
  (`DividedFilesInputStream::read`, `[fn]`). Gli offset dei record nell'indice BGI sono **u64
  assoluti** nel flusso concatenato (la divisione in pezzi non si vede dall'indice). Dimensione salvata
  `resource_size_64` (8 byte).
- Ogni file di `/system/resource` ha `size` letto come int: **ogni pezzo servito sotto i 2 GiB** (i
  nostri: 64 MiB per OBB/addnl, medaglie ~0,96 GB il piu' grande).
- Il record `size` dell'indice vale solo se < 2^32: oltre 4 GiB e' ignorato (nessun errore, solo un
  controllo in meno).
- **Nessun controllo dello spazio libero** prima del download: disco pieno = «Save error. Please check the
  storage space on your device.» (`fwrite` corto). Picco = dati installati + un pezzo in cache.
- Ancora da provare al banco: un download con `misc.mp4.2` (ricetta in
  `D:\Progetto_Restauro_KH_UX\tmp\res4g\bench-recipe.md`): `build-resources.ps1 -Version N -TestStraddle <nome>`
  mette prima del generato un pezzo di zeri (`resource_parts.py --straddle`, nome del pezzo in
  `resource_data\<N>\testpad.txt`, rispettato da `-Quick`) perche' il record <nome> del generato stia a
  cavallo dei 4 GiB; la versione dopo, senza, torna sotto.

Misure della 47 (`D:\Progetto_Restauro_KH_UX\tmp\res4g\inventory.md`): 40 pezzi, 4.286.993.546 byte; OBB
main+patch 2.185.902.806, addnl 132.056.004, medaglie 965.832.467, stanze 731.805.396, nemici 53.227.192,
raisedraw 33.620.305, generato 184.549.376 (contenuto 138.817.141 + 45.732.235 di zeri della riserva).

Strumenti (20-10):
- `bgad.py read_index` legge gli offset u64 (prima u32: oltre 4 GiB troncati).
- `-Quick` scrive il generato nel pezzo del guest `offset >> 31` e, se lo attraversa, nel successivo
  (`resource_parts.py`); prima controlla che i pacchetti prima del generato siano lunghi quanto i pezzi
  installati.
- **Compattazione** (`resource_compact.py`, di default nelle versioni complete dalla 48, `-NoCompact` per
  farne a meno): OBB, addnl e medaglie riscritti con i soli record citabili dall'indice unito (un record e'
  vivo se un nome del suo pacchetto lo cita e nessun pacchetto prima ha quel nome; restano quelli dei nomi
  che il generato sostituisce, cosi' un `-Quick` che smette di sostituirli ritrova l'originale). Sugli
  ingressi della 47: OBB -30.080.308, addnl -54.662.654, medaglie -4.911.439 byte (stanze, nemici,
  raisedraw: 0). `resource_compare.py` ha verificato che ogni nome (396.297) ha gli stessi byte. Cache
  in `D:\Progetto_Restauro_KH_UX\compact` (pezzi di OBB e addnl condivisi con hard link fra le versioni),
  elenco in `resource_data\<N>\compact.txt` con l'impronta di ogni pacchetto compattato (byte dei dati,
  SHA1 dell'indice, impronta degli ingressi): `-Quick` la ricalcola e si ferma se un build successivo li ha
  rifatti.
- Riserva del generato **168 MiB** (era 176): contenuto 132,4 MiB nella 47, restano ~35,6 MiB di `-Quick`
  (piu' del blocco di originali di I-170, ~33 MB). Una versione completa con queste regole: **~4.188.950.537
  byte (3,90 GiB), ~101 MiB sotto i 4 GiB**, prima di nuovi contenuti.
- Non tolte: le 41 immagini di medaglia senza `imageId`/`thumbId`/`cutinId` in `medal.json` (16 MB): 17
  hanno ancora una riga (le copie 1xxxxx dell'Organizzazione XIII, rimappate da `MEDAL_MAP_FIX` di
  `make-game-tables.js`), 13 sono i doppioni 3004xx di `server.js`; solo 10 (2,6 MB) non sono citate da
  nulla.

<a id="btf"></a>
## Texture BTF

- `\x89BTF`, 38 byte di intestazione: tela a +0x16, ritaglio (+0x1a x,y; +0x1e w,h), dimensione
  compressa +0x22, poi zlib RGBA (tipo 8 RGBA8888, tipo 9 palette + indici; anche RGBA4444).
  `recon/tools/btf.py` decodifica e codifica, `btf_to_png.py` converte.
- **Le originali hanno l'alpha premoltiplicata**: `btf.encode` premoltiplica, `decode` la toglie;
  `btf_fix.py` (nel build) converte PNG e BTF vecchi. Senza: bordi bianchi (es. Paperino).
- `Result_LU_Win_Star.png` usata come ImageView si vede a righe: non usarla.

<a id="regole"></a>
## Regole scoperte (valgono per ogni schermata)

- **Plist nuovi non si caricano**: il client legge solo plist con nomi gia' presenti e usa la
  texture col nome del plist (`X0.plist` -> `X0.png`). Un'armatura nuova con frame propri sostituisce
  plist+png di un'armatura che il binario non cita: liberi `EquipmentBGAction0` (usato da
  `Cursor_Anim_MedalSell`), `MyPageAnime0`, `AdventureTopAnima0`, `GlobalNaviAnimation0`,
  `LuxUpPanelAnimation0`, `ActMapTreasureBox*0`, `Cursor_Anim_QuestPanel0`/`QuestArrow0`.
- `ArmatureAnimation::play` (`[fn]`) con un movimento assente = crash.
- I pulsanti di `[fn]` caricano `img/ui/<nome>_On.png` al tocco: senza, crash (46 copiati).
- Gli ImageView del modello hanno il 9-slice (bordo 50): per icone a dimensione naturale `s9=False`.
- **9-slice + texture assente = crash** in GUIReader (setScale9Enabled ricrea lo Scale9Sprite sul file
  mancante, SIGSEGV a 0x2c, banco absmax). Senza 9-slice la texture mancante e' tollerata. Era il
  `Countdown_panel` (Plate21) di `PopupNormal_Continue_Multi` (Continue, AP_Recovery, Ability_MAX)
  e `Win_Over` (Panel07) di `MedalInfo_ReleaseWindow`; stessa trappola negli originali serviti
  `PassiveResult`, `DeckEdit_SubSlot_Select_Medal_ver260`, `StartDeckProud_*`, `ActionMap_Multi*`.
- **Texture caricate dal codice e assenti = crash** in `ImageView::loadTexture` (SIGSEGV 0x2c, stack
  `[fn]` -> `[fn]`), anche fuori da GUIReader. Caso: la piastra di Shop > Draw
  (`[fn]`) carica sempre in `Lock_icon` (118x118, figlio di `LockMask`) `img/ui/ShopBut_Lock.png`
  (flag +0x350 di `[fn]` acceso) o `ShopBut_Lock_Disable.png`, anche senza blocco; Dark Road le ha
  rinominate `dark_Icon_Lock` / `_Disable` (stessa grafica di `QuestBut_Lock`): `make_shop_lock.py` le copia
  dal catalogo (risorse 39, I-133). Una piastra bloccata spegne i pulsanti di estrazione con
  `[fn](btn, 1)` -> `[fn]`, che carica `img/ui/%s_Disable.png` (anche `_Off`/`_On`) su un ImageView
  con 9-slice: `But07_Disable` mancava (copia di `But24_Disable`, stessa sagoma). Tocco sul lucchetto: I-134.
- Un ImageView di cui il codice prende la texture (renderer +0x598, texture +0x4e8, es. `Image_3`
  del banner Events) deve essere senza 9-slice e con una texture servita.
- `[fn]` accetta il tocco in un rettangolo grande quanto il bersaglio ma **centrato sulla
  sua origine**: i pannelli-pulsante vanno con l'origine al centro della freccia.
- Quando il codice prende «il primo figlio» di `LeftUI`/`RightUI`/`CenterUI`, un pannello vuoto
  manda in crash; un Panel toccabile a schermo intero assorbe i tocchi.
- Un LWF vuoto (`waist_c.lwf` dei costumi, 492 byte) evita i crash dei LWF mancanti, ma un LWF che
  deve avere un'etichetta (es. `SpIcon_Open`) va copiato da uno con l'etichetta (Result_Reward).
- Pulsanti But01 piu' alti di 68: 9-slice verticale a meta' (`TALL9`, capInsetsY 32); con`n  capInsetsY 0 la prima riga quasi trasparente si stira in una fascia chiara (PvP_SelectWindow).
- Testi: `[fn]` legge `text/<categoria>/<id>.txt` (ui/drama/audio); un id mancante =
  crash. 856 id costanti citati (`ui_text_ids.py`, `layouts\ui_text_ids.tsv`); 2.332 originali
  importati dal `misc` dell'IPA 4.4.0 (`import_ui_texts.py`). Mancano anche li': 102850008,
  106260102, 1062402xx (filtri, ora «%d»/«%d+»), 106240301 «Tickets», 101210001-003 (spazio nelle
  risorse inglesi).
- Codici dei widget: `[fn]` figlio per nome, `[fn]` testo di un figlio,
  `[fn]` carica un layout, `[fn]` crea un CustomRichText da una Label
  (`Txt_X` -> `Txt_X_Cus`: non metterlo nel layout), `[fn]` sostituisce un TextField.

<a id="make-layouts"></a>
## `recon/tools/make_layouts.py` e `make_textures.py`

- Tipi di voce: `copy` (da un layout esistente, con `retex` dark_* -> KHUX via `DARK_TO_KHUX`, nomi
  cambiati, `('text', nome, testo)`, `('clone', sorgente, nome, genitore)`), `scene` (nodi vuoti o
  `GUIComponent` che carica un layout: `('CenterUI', 'publish/X.json')`), `build` (da descrizione:
  `P` pannello, `I` immagine, `B` pulsante con Label, `L` etichetta; `scale`; `('frame', ...)` cornice a
  9 fette con 8 ossa), `armature` (copia di `ArrowAnim.ExportJson` rinominata), `func`.
- Scrive in `D:\Progetto_Restauro_KH_UX\stage_gen\files`; poi `build-resources.ps1 -Quick`.
- `make_textures.py` (Pillow): texture che non esistono in nessuna risorsa, disegnate dagli
  screenshot originali (Sf_Switch, frecce, rare_star, Buff, But23, MedalInfo_Guilt9 = copia della 8,
  Mogshop_plate1, But29/31, pagine del Profilo, Sphere_*, wipe_N...).
- Equivalenti KHUX usati spesso: `Panel04` (riquadro blu scuro), `Plate12`/`Plate13`, `But16`
  rosso, `But17` arancione, `Win01`/`Win11`, `Win09` (9-slice con zona elastica centrale),
  `Plate18`, `But06`.
- Ciclo per una schermata mancante: `func_strings.py` + `widget_lookup.py` (nomi cercati dal
  codice), `text_ids.py` (testi mancanti), layout in `make_layouts.py`, texture in
  `make_textures.py`, prova con `-Quick`, crash con la ricetta di [banco.md](banco.md#crash).
  `layout_tree.py` (albero di un layout UI 1.6), `scene_tree.py` (scene SceneEditor).

<a id="mancanti"></a>
## Layout mancanti

- Dei 601 layout cocostudio citati dal binario 4.3.1 ne mancavano 441 con i soli OBB, 285 con
  `addnl`, ~307/250 nelle misure successive; elenco attuale in
  `D:\Progetto_Restauro_KH_UX\catalog\missing_layouts.txt` (254 all'11 ottobre: Album, Chat, Party,
  Ranking, PvP, Pet, TresCommu, ShopBuyItem_*, Purchase_Pop, Information_Save...). Ogni schermata che
  li usa va in crash in GUIReader finche' non si generano (ISSUES I-002, triage in corso).
- La 5.0.1 offline ha tolto le funzioni online e i loro asset; gli asset online della 4.x
  arrivavano dal CDN (`r/misc`), di cui non risulta una copia pubblica.
- Generati finora (vedi `make_layouts.py`): Presents, Medal List/dettaglio/Sort/vendita, Evolve,
  Sell Materials, Moogle Shop, Profilo, Avatar Boards, Other (MenuDialog_ver300), Missioni,
  MyPage_ChirishiBaloon, PopupNormal_Continue, BattleResult_LB_ver120, BattleResult_KB,
  BattleResult_Skill_ver130, PopupNormal_Cost_Over/AP_Recovery/MedalOver/Ability_MAX,
  DeckEdit_Cost_Over_ver131, scheda Events (AdventureTop2_EV_Banner_ver220, _EV_Button, _Raid_Button)
  e altri. Triage dei 254 in `stage_gen\layout_triage\REPORT.md`.
- Mancano ancora tutti i `PartyTop_*` (scena `PartyTopScene` richiesta anche al KO in solo: ISSUES
  I-001/I-006), `PetInfoScene_ver320`, `PetInfoAnim`, `lwf/pet/motion` (generati da
  `make_pet_motions.py`, LWF nostri con «end»: [home_profilo](home_profilo.md#pet)); di
  `lwf/pet/part` c'e' solo `001`.
- **Dati JP 4.3.1 di thethiny** (13-10, ISSUES I-117, `D:\Progetto_Restauro_KH_UX\reference\world_schema\jp431_cocostudio.md`):
  `jp_final_4.3.1\cocostudio\` ha 1.596 layout json (revisione corrente = entry id piu' alto), PNG non premoltiplicate
  (convertire con `btf_fix.py`); 243 dei 256 mancanti, tutte le schermate online complete; i layout JP sono
  quelli WW (284/466 identici). Le texture localizzate WW (11, es. Ch_Logo, World_Stage_Clear) vincono
  sempre. I layout usano testo libero (segnaposto giapponesi, anche nei WW: il codice li sovrascrive
  dagli id text/ui). Senza fonte solo 13 layout propri del WW.
- Dal 13-10 74 dei nostri layout generati sono sostituiti dagli originali JP: vedi
  [sotto](#jp-originali).

<a id="jp-originali"></a>
## Layout originali JP al posto dei generati (I-117)

Decisione dell'utente (13-10): dove abbiamo un layout generato e l'originale e' nei dati JP 4.3.1,
si usa l'originale. Fonte `[local reference data]\\...\jp_final_4.3.1\cocostudio\` (spazio
iniziale nel percorso; sola lettura; dati di terzi, mai nel repository).

**Strumento** `recon/tools/import_jp_coco.py` (Pillow: senza `-I`), lanciato da `build-resources.ps1`
dopo `make_layouts`/`make_textures`/testi e prima di `btf_fix`. Legge l'elenco versionato
`recon/tools/jp_coco_layouts.txt` (una radice per riga; opzioni `rev=N`, `need=a,b`, `+absent-ok`, `clone=`, `set=`, `graft=`;
`? Nome # motivo` = da decidere) e per ogni radice prende la chiusura (sotto-layout delle scene,
armature, texture) e la scrive in `stage_gen\files\cocostudio\publish\` sopra il generato.
- Revisione: entry id piu' alto, salvo `rev=`. **Attenzione**: l'estrattore a volte da' a una
  revisione il contenuto di un altro layout (`PresentBOX_Panel_ver131.00265720` e' un pannello di
  icone): se la revisione scelta ha meno di meta' dei nomi della prima, la radice si ferma.
- Nomi gia' serviti (`names_v4.tsv`): mai copiati, vince la WW (comprese le 11 texture localizzate).
  Radice WW servita che make_layouts sovrascriveva (`MedalInfo_ReleaseWindow`): torna il WW,
  copiato solo per tradurne i testi, con le texture mancanti da JP (Panel07, 9-slice di I-049).
  Eccezione `graft=W1,W2` (solo radici WW servite): innesta nel WW i widget W1, W2 della revisione JP
  (`rev=`), sotto il genitore con lo stesso nome e con la stessa posizione; tag nuovo se gia' usato; gia'
  presenti = nulla. Usata per `BaseBuff_Avt_Null1/2` di `ActionMap_PlayerStatusField_new` (rev. 00360289,
  I-155, [battaglia](battaglia.md#basebuff)): il resto del layout resta WW.
- Sotto-layout nostri non in elenco restano i nostri; texture disegnate da noi sostituite
  dall'originale JP (stessa tela o nessun altro layout generato le usa; mai gli atlanti delle
  armature). Texture di `publish/` che l'estrattore ha tolto come doppioni: si prendono con lo
  stesso nome da `cocostudio/` o `img/` JP (Panel10, BG_Black, MD_Guilt4_On, Complete_icon1...).
- PNG JP (alpha diritta) -> BTF premoltiplicato con `btf.encode`.
- Texture con giapponese disegnato (QuestBut6/7_Title, Rank_Title_3, Comeback_Tutorial_*,
  Camp_Balloon3, TresXTresStartUp_*_Logo): mai importate, contano come assenti.
- Testi: etichetta giapponese uguale (spazi esclusi) a un `text/ui/<id>` JP -> inglese dello stesso
  id se tutti gli id candidati danno lo stesso testo; testi a mano in `recon/tools/jp_coco_texts.tsv`;
  il resto resta segnaposto (lo scrive il codice). Sui 74: 198 sostituiti (1 da `jp_coco_texts.tsv`), 99 segnaposto rimasti
  (elenco in `stage_gen\jp_import\report.json`, `texts_left`).
- Si ferma (resta il generato): 9-slice su texture che non ci sarebbe, plist non servito, texture
  assente (salvo `+absent-ok`), widget `Txt_*_Cus`, `need=` mancante, layout assente in JP.
- Reversibile: `stage_gen\jp_import\manifest.json` (provenienza e sha1) e `orig\` (copie dei nostri
  file sostituiti). Togliere una riga dall'elenco = al build successivo i file non piu' richiesti si
  tolgono o tornano com'erano (solo se nessun generatore li ha riscritti). Provato: import, import di
  nuovo (identico), `--none` -> albero identico a prima (sha1).
- `build-resources.ps1 -NoJp`: build senza originali (pulisce gli importati). `-DryRun`: tutti i
  generatori su una copia (`tmp\stage_gen_dry`), pacchetto e indice confrontati con la riserva di
  `-Quick` dell'ultima versione; niente login, niente guest, niente `resource_data`.

**Controllo dei widget cercati dal codice** (13-10): `who_refs.py` sulle stringhe
`cocostudio/publish/<nome>` (e sulla tabella di puntatori dei layout del Profilo, 0x1f850c0..),
45 finestre di indirizzi attorno ai caricatori decompilate in un solo avvio
(`recon/ghidra/khux_decomp_ranges.py`, 7.406 funzioni, ~10 min), `widget_lookup.py` sulle sole
ricerche ([fn], [fn], [fn], [fn]), `jp_coco_widgets.py` (nomi
nostri assenti dall'originale e cercati dal codice), commenti di `make_layouts.py`, confronto delle
classi. Ogni nome rimasto guardato nel C: quasi tutti sono di altre schermate o controllati (null)
prima dell'uso (FaceBook_PhotoPanel, Count_Label, ImageButton_Buy1/LockMask, Button_Change,
Button_Passive; Txt_Countdown solo nel ramo multi di [fn]; «Count_Rare» = stringa
Plate_Count_Rare + 6, presente nell'originale). **Il JP 4.3.1 non e' sempre il WW 4.3.1**:
`Sphere_Popup_Get_ver240` JP non ha Button_Ok/Txt_Ok che [fn] usa senza controllo.

**Esito** (`-DryRun`, 13-10): 74 radici sostituite, 9 da decidere; 324 file (102 json, 222 texture
BTF, 219 nomi nuovi); json tutti leggibili, nessun 9-slice su texture assente, assenti solo
Camp_Balloon3 (Guilt, fumetto della campagna) e LB_Charge (carta delle bacheche), entrambe senza
9-slice. Pacchetto generato 24,5 MB su 32 MiB; **indice oltre la riserva di `-Quick`** (30.058.100
> 30.049.366 byte, la riserva rimasta era ~3,6 KB): serve una versione completa, `-Version 34`
(indice 30.123.635 con la riserva nuova di 64 KiB). Fino ad allora `-Quick` solo con `-NoJp`.

Sostituiti (elenco completo in `jp_coco_layouts.txt`): Presents (scena, Base, Panel `rev=0`,
IconPanel), Medal List e vendita (scene, Check/Ok, RareCaution e Panel, Guilt, MaxEnhanced), Evolve
(scena, Evo_Medal), ReleaseWindow (WW), Sort, SlideMedalInfo, MedalOver, Cost_Over, DeckEdit
Cost_Over, Subslot (scena e 5 layout), Moogle Shop (scena, righe Traits/Items, IconPanel, MedalSelect,
AddCheck, OverwriteCheck), Sell Materials (scena, Block, Step1/2, Medal_Step1), Avatar Boards
(scena elenco, carta, scena bacheca, Sphere_Incentive e _ver240, SphereCoinCheck), Profilo (scena,
Oneself, User, Txt2, Comment e U13, PlayStyle, AvatarTitle_Base, TresCommu User/Other), Chirithy,
Missioni (Base, Panel), Other (MenuDialog_ver300), Pet (PetInfoScene, PetSkill_Panel, Rename,
TrainingEdit, TrainingProduction, TrainingRestartPop, PetEditScene, PetEdit_Panel, PetEdit_Check2),
risultati (KB, LB, Skill), Continue, AP_Recovery, Ability_MAX, EV_Banner.

Da decidere (restano i generati, motivo nell'elenco): MedalInfo_Information_R1 (crash dopo Evolve
senza Panel_MixResult_Area/Tap_Screen_Area), PetInfo_TrainingSlotCheck_ver320 (Win_under usato senza
controllo da [fn]), Sphere_Popup_Get_ver240 (Button_Ok/Txt_Ok), Sphere_Popup_Comp_ver310
(SphereMap_Complete assente, cornice diversa dal riferimento), PvP_SelectWindow (titoli con
giapponese disegnato), AdventureTop2_EV_Button e _Colosseum_Button (World_Ico7/8 assenti),
AdventureTop2_Colosseum_Panel e _Raid_Button (nomi cercati dalle celle; online, non provabili).

<a id="wipe"></a>
## Tendine dei cambi di parte

All'uscita fra parti di una missione `[fn]` mostra `img/wipe/wipe_%d.png` con %d = worldId
della tabella `world` il cui worldName e' il prefisso della stanza (`[fn]`, tabella master
0x22; nessuna corrispondenza -> 1). Nelle risorse c'e' solo `wipe_1` (DB): senza file
`Sprite::initWithFile` fallisce (`[fn]`) e il distruttore cocos crasha.
`make_textures.py` copia `wipe_1` in `wipe_2..10`, `10000`, `10001`. Gli originali per mondo non
si trovano online (ISSUES I-027). Poi `recon/tools/originals.tsv` mette gli originali JP 4.3.1 di
`wipe_2..8` (sezione 13) e `wipe_11..14` dei mondi di Ralph (sezione 40: righe `world` 11-14 NL/HD/CS/SR aggiunte da
`server/make-story-oltre.js`).

<a id="addnl-431"></a>
## OBB 5.0.1 contro addnl 4.3.1 (I-091)

Nell'indice unito (`resource_merge.py`) a parita' di nome vince l'OBB 5.0.1, che precede l'addnl
dell'IPA 4.3.1; solo il pacchetto generato (ultimo, `--last-wins`) sostituisce. Dei 19805 nomi
dell'addnl, 13148 sono serviti dall'OBB e 2376 di questi hanno contenuto diverso (soprattutto
`lwf/drama`; in `lwf/avatar/motion` 19 file). Il caso visibile: `lwf/avatar/motion/wait/wait.lwf`,
che il client 4.3.1 usa per l'avatar fermo nel campo ([fn] -> [fn](avatar, 0x1b);
camminata = walk 0x1c / move 0x17 / run 0x18 in [fn]). Il keyblade si attacca al movie con
nome di istanza `key` (parte 30 della tabella 0x1f18970, [fn], percorso
`lwf/avatar/keyblade/keyblade_%04d_%02d` da displayId). Il wait 5.0.1 e' una posa frontale
(`serious_o_c`) senza `key`, `shadow`, `mark`; il wait 4.3.1 ha `key`, `shadow`, `mark`,
`face_normal_o_c`, come nei video originali (`reference\field_idle`). Anche `win_levelup` 5.0.1 non
ha `key`/`shadow`/faccia. `recon/tools/prefer_addnl.py` (in `build-resources.ps1`) copia in
`stage_gen\files` le versioni 4.3.1 di wait e win_levelup con le loro texture. Gli altri motion
diversi (bwait, btlEnd, knockback, dead1-3) hanno `key` e `shadow` in entrambe le versioni.

<a id="suoni-jp"></a>
## Effetti sonori dei LWF dal JP 4.3.1 (I-152)

- **Client**: `AudioLWFNode` (`[fn]` -> init `[fn]`) registra gli eventi dei LWF; un evento
  `se_<nome>` arriva a `[fn]`: id = `[fn](<nome>)` (testo `text/audio/<nome>`, es.
  `ui2_se_000039` -> `509000390`), se 0 `atoi(<nome>)`; poi `[fn]` carica `audio/%09d.akb`. Senza
  file non suona nulla e non c'e' errore. `playBGM_<nome>` ([fn]) risolve allo stesso modo.
  Nessun campo del server coinvolto.
- **Caso visto** (17-10): l'estrazione x10 (`raidgacha_result_display_10`, evento `se_ui2_se_000039`) e il
  popup del Nova (`GuiltBonus_BurstLvup`, `se_ui2_se_000074`) erano muti; x1-x9 usano `509000370`, servito.
  I LWF sono identici a quelli JP; mancano gli AKB 509000390 e 509000740 da OBB 5.0.1 + addnl. Servite
  solo 40/90 `ui2_se` e 4/80 `ui_se`. Indagine: `D:\Progetto_Restauro_KH_UX\tmp\sound_draw\report.md`.
- **Strumento** `recon/tools/jp_sound_effects.py` (test `test_jp_sound_effects.py`), chiamato da
  `import_jp_coco.py` dopo tutte le altre scelte (anche con `-NoJp`), come le BGM Medals
  ([medaglie.md#bgm-medals](medaglie.md#bgm-medals)):
  - LWF effettivi: i serviti di `names_v4.tsv` (letti da `resource_data\7\data`), poi `medal_gen`,
    `rooms_gen`, `enemy_gen`, `raisedraw_gen` (`files\`), poi `stage_gen\files` e i LWF JP che l'import sta
    per scrivere (a nome ripetuto vince l'ultimo, come nell'indice unito);
  - eventi dalla sezione `eventName` (indice 25 dell'intestazione: un id di stringa per evento), nomi
    `se_*` e `playBGM_*`; id come il client (testo servito, poi del generato, poi JP; se 0 `atoi`);
  - `audio/%09d.akb` gia' servito, in un pacchetto statico o scritto da un altro generatore: nulla;
    altrimenti la revisione piu' alta del JP (`<id>.<8 cifre>.akb`) nel pacchetto generato. Se manca il
    `text/audio/<nome>` servito si copia anche quello (senza testo l'id sarebbe 0);
  - **ordine nel build**: `make_nova_logo` + `import_jp_raisedraw` (raisedraw_gen\files) girano ora *prima*
    di `import_jp_coco`, cosi' anche partendo da un raisedraw_gen vuoto i LWF dell'estrazione x10 e del
    Nova ci sono quando si cercano i suoni (con `-Quick` stessa condizione di prima: solo se manca
    `raisedraw_gen\files`). Le cartelle `files\` di rooms_gen ed enemy_gen le scrivono `make_jp_rooms.py` e
    `make_jp_enemies.py`, fuori dal build: ci sono gia' all'inizio, il build ne fa solo il pacchetto;
  - pacchetti statici esclusi: `--no-static <nome>` (dal build con `-NoRooms`/`-NoEnemies`/`-NoRaisedraw`
    e, con `-Quick`, per quelli assenti da `packs.txt` della versione installata): i loro LWF e AKB non
    contano;
  - **addnl**: `names_v4.tsv` e' l'indice unito della versione 7 e contiene tutti i 19.806 nomi
    dell'addnl: 13.148 con l'offset della copia OBB (vince, come nell'indice servito) e gli altri con
    quello della copia addnl (fra questi 175 LWF). Leggere names_v4 da' quindi la copia che il client
    carica davvero; le 654 copie addnl perdenti non si caricano mai (le due che servono, wait e
    win_levelup, le mette `prefer_addnl.py` in stage_gen, letto come generato). Senza
    `resource_data\7\data` o `names_v4.tsv` un avviso: si cercano solo i suoni dei LWF generati;
  - deterministico (nomi ordinati), manifest e pulizia di `import_jp_coco.py`; con `--check` niente
    `sound_effects.json` e cache solo letta; rapporto
    `stage_gen\jp_import\sound_effects.json` (id, byte, LWF che li citano, assenti, non risolti); cache
    degli eventi dei serviti in `served_lwf_sounds.json` (impronta di indice e dati; prima corsa ~45 s,
    poi ~5 s). Da solo (`python -I recon/tools/jp_sound_effects.py`) e' un resoconto che non scrive nulla.
- **Prova a secco** (17-10, copia di `stage_gen` in `tmp\se_dry_r1`, risorse 41; ripetuta dopo la revisione con lo stesso esito): 1.395 LWF con suoni, 627 nomi;
  **216 AKB nuovi, 4.327.702 byte**: 509000390/740 (x10, Nova), 509000700 (`BurstGauge_Recovery`),
  509100190/220 (motion `dash`, `excavate` dell'avatar), 509100250 (`Sburst`), 509100310/320
  (`card_evolution_result_*`, animazione dell'Evolve), 508000020-080 (eff_se dei
  nemici), 198 id 504xxxxxx (ene_se dei nemici JP di `enemy_gen` ed effetti `hit_effect_fla`), 503005003,
  505001110, 506002010/020 (boss 7002-7005 e 1023); piu' 4 testi `text/audio` (ene_se_153401-403, npc_se_000503); nessun AKB assente anche
  nel JP. Non risolti (nessun testo ne' id, muti anche nell'originale servito): `bgm_boss0112`,
  `kh2_Laughter` (drama), `ene_se_165101` (nemico 8021), `player_se_000101` (dutch_roll). Pacchetto
  generato 108.128.458 byte su 134.217.728 di riserva (80,6%); indice: entra nella dimensione installata
  della 41 (restano ~57,6 KB di riserva): basta un `-Quick`.
- I suoni sono originali: nessuna riga nelle Notices.

<a id="icone-numerate"></a>
## Immagini dal nome numerato (controllo del 18-10, I-158/I-159)

Il client compone molti percorsi `img/...` con `sprintf` da un id del master o da un numero; se il file manca
`ImageView::loadTexture`/`Sprite::setTexture` lasciano la texture di prima (icona sbagliata, nessun crash: caso
`Skill_Icon3`, I-158). Controllo **offline**: 119 formati `img/` e `cocostudio/publish/...%d` dalle stringhe della
libreria 4.3.1 (`strings` + `who_refs.py` + Ghidra sulle funzioni che li usano), valori dal master servito
(`server/master_data`), file serviti = `names_v4.tsv` + `medal_gen`/`rooms_gen`/`enemy_gen`/`raisedraw_gen`/`stage_gen`
`files\` (un file solo in `cocostudio/publish/` non vale per `img/`). Lavoro e script in
`D:\Progetto_Restauro_KH_UX\tmp\icons\` (`check.py`, `fmt_other.py`, `seq.py`, decompilati `helpers*.c`).

| Formato | Numero da | Valori usati | Mancanti | Fonte / esito |
|---|---|---|---|---|
| `img/skill/Skill_Icon%d` | `skill.thumbId` (riga skill +8, [fn], [fn] tipo 0) | 5 | 0 (la 3 dal 2016, I-158) | - |
| `img/medal/Medal_S_%d` / `Medal_L_%d` | `medal.thumbId` (+8, premio tipo 3) / `medal.imageId` | 2090 | 0 | - |
| `img/Cutin/Cutin_%d` | `medal.cutinId` (+0xc, carosella delle mosse speciali [fn]/[fn]) | 2088 | 173 | nessuna (I-159) |
| `img/art/Art_%d` | `medal.artId` (+0x14, scena `MedalArtAnim` [fn]) | 2088 | 2088 | nessuna; JP 55 id solo giapponesi (I-159) |
| `img/material/material_%d` | `material.materialId` (+0, premio tipo 5) | 53 | 54 | 2016 |
| `img/avatarParts/ai%d` / `ai%03d` | id della parte (premio 0x12-0x14/0x17) | 2824 | 103 (partsType 7) | non chieste: sotto-parti di `setCloth`, mai premio |
| `img/petParts/pi%d` | `petParts.petPartsId` (premio 0x21, missioni tipo 33) | 668 | 0 | - |
| `img/sphere_incentive/%d`, `sphere_board/Board_%04d`, `sphere_kind/Kind_%04d` | `sphere.sphereBoardId` / `boardId` / `kindId` | 118 / 1 / 2 | 0 | - |
| `img/keyBlade/KeyBlade_%06d` | `keyblade.displayId` (+0xcc, premio tipo 13) | 64 | 0 | `make_keyblade_images.py` |
| `img/carouselDeck/*%03d`, `img/ui/Subslot_MedalSlot%03d` | `keyblade.displayId / 100` | 16 | 0 | `make_keyblade_decks.py` |
| `img/kakusei/Kakusei_Icon%04d` | `shuffleskill.category` (+4, [fn]) | 11 | 0 | - |
| `img/userTitle/title_%04d` | `title.label` | 102 | 0 | - |
| `img/Theater/World_Icon_%d`, `img/wipe/wipe_%d`, `stage_select_ico_%d_%d` | `theater.worldId`, `world.worldId`, `stage.worldId`+`thumbId` | 14 / 10 / 99 | 0 | - |
| `img/light/{BG,NPC,NARRATION}/%d` | comando 4002 dei 40 SEQ serviti `img/light/SEQ/*.l` (slot 5003 BG, 5004 narrazione, 5008-5012 NPC) | tutti gli id citati | 4 | 39994/39996/39997 dal 2016; 30019 nessuna (I-159) |
| `img/incentive/IncentiveIcon_NN` | costanti per tipo di premio ([fn]): usati 7, 8, 9, 26, 40, 41 (reward, mission) | 27 nomi | 24 | 06-29 dal 2016 (non 10/12: giapponese disegnato), 30-41 JP (rev. piu' alta), 42 = `cocostudio/publish/IncentiveIcon_42` |
| `img/incentive/Star7_Ticket_%02d`, `draw_Ticket_%02d` | tipo di premio 37-42 | 6 | 0 | serviti con «仮» (segnaposto WW, Star7 39 in `make_shop_art.py`) |
| `img/prizes/Prize_Treasure%02d` | premio +0x48 ([fn]) | 1-4 | 02-04 | 2016 |
| `img/ui/AvtInfo_CrownIcon%d`, `AvtInfo_trophyIcon%d` | Profilo ([fn]): `(mvpCount-1)/50+1`, `(pvpMvpCount-1)/50+1` senza segno, max 4; col nostro 0: Crown1 e trophy4 | 1-4 | tutte | 1-3/1-2 JP, Crown4 e trophy3/4 da `cocostudio/publish/` (WW) |
| `img/ui/Topinfo_BarBut%d_Off/_On` | indice della scheda + 1 (`Button_%d`, finestra Missioni [fn]/[fn]/[fn]) | 1-7 | 1, 3-7 | 2016 (uguali byte per byte a `publish/Topinfo_BarBut*_Off`) |
| `img/ui/Deck_Arrow_U%d` / `R%d` | attributo 1-3 (deck, [fn]) | 1-3 | tutte | 2016 |
| `img/tutorial/tutorial_%d` | id 1-65 costanti dei chiamanti di [fn] (12/41 -> 40, 44 -> 6; 100-120 altro ramo) | 34 dalle costanti | 25 | 19 dal 2016 (inglese, grafica 2016: la 5 servita e' diversa); 49-55, 57-59, 61, 65 solo JP giapponese (I-159) |
| `img/damage/dmgGuardBreak_num%d`, `dmgReflection_num%d` (+ `_comma`) | tipo di danno 5 e 6 (tabella 0x1f2c2a0, [fn]) | 0-9 | tutte | JP |
| `img/download_background/image_%02d` | costante 9 ([fn]) | 9 | 09 | nessuna (I-159) |
| `img/ui/guilt/*%d*`, `Deck_Medal%d`, `Deck_Slot_Num_%d`, `Av_Box_Num%d`, `damage/dmg*_num%d`, `LoginTime_Icon%02d`, `KeyBlade_type_%02d` | livelli, slot, ore | - | 0 | - |
| `talkstamp_%d`, `Emblem_%d`, `gesture/m_act%d`, `Shop_BuyItem_%02d`, `Rank_Title_%d`, `Comeback_Tutorial_%d`, `raid_boss_%d`, `xtres/*`, `union/*`, `colosseum/*`, `result/Result_PvPRank*`, `dark_*` | tabelle vuote o funzioni online / Dark Road | - | - | non controllati oltre (JP ha talkstamp, Emblem, m_act0-13, raid_boss) |

- Le icone di `IncentiveIcon_40/41` nel JP hanno piu' revisioni (biglietti stagionali; l'estrattore ne scambia
  alcune): si prende la piu' alta (40 = biglietto platino, 41 = biglietto azzurro), come `import_jp_coco.py`.
- `tutorial_%d` con id >= 53: `popupFlag` vale 2^53 - 1 a tutorial finito (`server.js`), quindi le finestre
  oltre il bit 52, se il bit e' l'id, si aprirebbero ancora; da vedere al banco se compaiono (tutte senza fonte inglese).
- Nessuna riga nelle Notices: sono grafiche originali (2016, JP o WW sotto altro percorso).
