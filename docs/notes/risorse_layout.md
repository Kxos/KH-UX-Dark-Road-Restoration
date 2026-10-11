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
  I-001/I-006), `PetInfoScene_ver320`, `PetInfoAnim`, tutte le `lwf/pet`.

<a id="wipe"></a>
## Tendine dei cambi di parte

All'uscita fra parti di una missione `[fn]` mostra `img/wipe/wipe_%d.png` con %d = worldId
della tabella `world` il cui worldName e' il prefisso della stanza (`[fn]`, tabella master
0x22; nessuna corrispondenza -> 1). Nelle risorse c'e' solo `wipe_1` (DB): senza file
`Sprite::initWithFile` fallisce (`[fn]`) e il distruttore cocos crasha.
`make_textures.py` copia `wipe_1` in `wipe_2..10`, `10000`, `10001`. Gli originali per mondo non
si trovano online (ISSUES I-027).
