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
- Strumenti: `res_get.py <nomi.tsv> <resource_data\N\data> <uscita> <nome>...` (estrae per nome in
  `D:\Progetto_Restauro_KH_UX\layouts\orig\`), `res_bulk.py` (estrazione in blocco, 16 s per 4000
  file), `catalog.py` (catalogo, 2 min), `asset_coverage.py` (asset citati dal binario contro un
  indice), `resource_split.py` (pezzi da 64 MB), `remote_zip.py` (un file da uno zip remoto con
  Range).

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
`recon/tools/jp_coco_layouts.txt` (una radice per riga; opzioni `rev=N`, `need=a,b`, `+absent-ok`;
`? Nome # motivo` = da decidere) e per ogni radice prende la chiusura (sotto-layout delle scene,
armature, texture) e la scrive in `stage_gen\files\cocostudio\publish\` sopra il generato.
- Revisione: entry id piu' alto, salvo `rev=`. **Attenzione**: l'estrattore a volte da' a una
  revisione il contenuto di un altro layout (`PresentBOX_Panel_ver131.00265720` e' un pannello di
  icone): se la revisione scelta ha meno di meta' dei nomi della prima, la radice si ferma.
- Nomi gia' serviti (`names_v4.tsv`): mai copiati, vince la WW (comprese le 11 texture localizzate).
  Radice WW servita che make_layouts sovrascriveva (`MedalInfo_ReleaseWindow`): torna il WW,
  copiato solo per tradurne i testi, con le texture mancanti da JP (Panel07, 9-slice di I-049).
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
si trovano online (ISSUES I-027).

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
