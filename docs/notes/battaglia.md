# Battaglia, stage, sconfitta

Storia: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md) («La prima
battaglia», «Il Prologue giocato», «Il Prologue completato», «Missione 2»).

<a id="api"></a>
## API dello stage

- `GET /stage/support/list` (111): `supportUsers[]` (`[fn]` con `userMedal`, `userSkills`,
  `userAvatar`). Prima di «Begin»: `userDetail.maxMedal` > 0 (altrimenti `PopupNormal_MedalOver`
  assente) e `maxDeckCost` > 0 (`PopupNormal_Cost_Over`).
- `POST /stage/start` (113): `userData.userPoint`, `startStageData` (`[fn]`),
  `userRandomEnemies[]`, `userEnemyDropItems[]` (`[fn]`: `uniqueEnemyId`, `dropItemTypeIds`
  int[] <= 4/5, `stealType`), `userTreasures[]` (`[fn]`), `campaigns[]`,
  `luxMagnifications`, `supportUsers[]`. `GET /user/keyblade` (11) da' `userKeybladeId`,
  `GET /user/deck` (12) il deck.
- `POST /stage/clear` (116, parser `[fn]`): `userData.{userPoint,userDetail,
  stageResumption}`, `stageRewardUserMedalIds[]`, `highScoreReward[]`, `firstClearFlag`,
  `stageOpenNum`, `clearMissionIds[]`, `userPvpRanking`, `status`, `pet.userPetParts[]`, `emblemIds[]`,
  inventario aggiornato (`userMaterials`, `userMedals`, `userSkills`, `userTitles`, `userKeyblades`,
  `userDecks`, `userAvatarParts`, `subslotMaxNum`/`userKeybladeSubslots`), `getLux`. Il corpo **non
  contiene stageId** (vale quello di `/stage/start`): `getPoint {exp, money, lux}`, `getMaterials`,
  `getEnemyDropItems`, `getTreasures`, `clearMissionIds`, `enemyDeadNumber`, `maximumDamage`,
  `burst`, `conditions`.
- Obiettivi: il client spunta solo gli id che il server rimanda in `clearMissionIds`; quelli sui Lux
  (`submissionRequire` 29, soglia `submissionNum`) li valuta il server su `getPoint.lux`.
- `POST /stage/continue` (115), `POST /stage/retire` (Give Up): `userKeyblades` e
  `userData.stageResumption`.

<a id="hp"></a>
## HP, CP, forzieri, sacchetti

- HP: `userPoint` `baseHp`/`hp`/`maxHp` (il client mostra `maxHp`). `[fn]` dimensiona
  l'arco dell'HP: oltre 3000 carica `Avatar_Circle_01/06.png` e `Avatar_Side_01..04.png`, assenti da
  ogni pacchetto (crash). HP base 3000 (segnaposto `KHUX_PLAYER_HP`; il valore vero al livello 1 non
  si trova), +20 per nodo delle bacheche (`player.sphereBonus.hp`).
- Tipi di premio (`[fn]`): 4 monete, 8 CP (barra speciale), 9 HP, 2/3/5/6/7/10 oggetti
  (3 medaglia, 5 materiale, 14 Avatar Coin). Immagini `img/prizes/Prize_{Money,Hp,Cp,Treasure,Lux}NN`.
- Forzieri: `StageUtil::getTreasurePrizes` (`[fn]`) alla creazione (`[fn]`) cerca
  in `userTreasures` l'`uniqueTreasureId`, legge la riga `reward` della mappa e tiene i premi il cui
  tipo compare nella stessa posizione di `dropItemTypeIds`. Righe vere: 1 barile vuoto, 80 CP 15.000
  (Attack Prize piccolo), 81 CP 30.000 (medio), 90 HP 1.400 (barile con HP); 10100 = medaglia a caso
  (primo nemico di ogni mappa). Quantita' nostre in uso: CP 10.000/5.000, HP 500 (ISSUES I-032).
- Sacchetti (contatore d'argento): drop dei nemici, `[fn](.., uid, reward)` cerca la riga
  `reward` (`[fn]`, tabella interna 7) e **va in crash se manca**. Si aprono in
  CONGRATULATIONS.
- Sfere arancioni (CP) e verdi (HP) dai nemici: tabella `enemy` (Shadow `attackCp` 50, `suppressCp`
  100, `attackHp` 30, `suppressHp` 144).

<a id="livello"></a>
## Livello e RESULTS

Il livello e' il rango Lux: `[fn]` -> `[fn]` usa `userDetail.luxRank` e
`userPoint.lux` contro le soglie cumulative `needExp` delle righe `lv` e `lv+1` di `player` (indice
0x5b; serve la riga del livello 0). Il server parte da rango 1 e somma i Lux di ogni `/stage/clear`.
`firstClearFlag` 1 cambia il percorso dopo lo stage (`/user/sphere/reset`, `/user/sphere/check`).

<a id="slot-vuoto"></a>
## Slot vuoto del Keyblade

Il client fa un turno per ogni voce di `userDecks[].deckMedals`: uno 0 diventa la medaglia master 1
(«空き», `[fn]`/`[fn]`; analisi in `stage_gen\deck_empty_slot\REPORT.md`). E' la
**Stock Medal** dell'originale (album n. 0, STR/DEF 50, «Placeholder when Medal is not equipped»):
uno slot vuoto, anche in mezzo, giocava il suo turno con un attacco neutro quasi nullo
(`reference\empty_slot`: khuxwiki e ~30 commenti r/KHUx). Dal 12 ottobre il server manda i deck
completi, con uno 0 per slot vuoto fino agli slot sbloccati (`sentKeybladeDeck`), come l'originale;
il 5.0.1 dava alla medaglia 1 l'immagine 90041 (Qui): `make-game-tables.js` le assegna 90000,
disegnata da `recon/tools/make_stock_medal.py` (medaglia grigia col cuore). Banco 12-10 sm_3:
contatore 6/6 con 3 medaglie + 2 slot vuoti + amico, Stock Medal al secondo turno. Prove fallite:
deck compatti in `/stage/start` (il ramo 113 non rilegge `userDecks`), tabella medal senza la
riga 1 (crash in Equipment).
<a id="gauge"></a>
## Gauge degli speciali

L'utente ricorda che la gauge resta salvata nel keyblade. `server.js` salva in
`player.keybladeBurst` il primo campo numerico di `/stage/clear` che nomina burst/gauge e lo rimanda
in `userKeyblades[].burst`: il nome vero del campo e' da verificare sul log «[gauge]» (ISSUES I-030).

<a id="sconfitta"></a>
## Sconfitta in solo

- Funziona (banco 11-10): KO -> «Spend 100 Jewels to continue?» (`PopupNormal_Continue`, Held =
  jewel posseduti). OK -> `POST /stage/continue`: il server scala `CONTINUE_STONE` (100) da
  `freeStone`, HP pieni e gauge speciale MAX (3660 -> 3560 su server e HUD). Cancel -> «Give up
  anyway?» -> OK -> `POST /stage/retire` e ritorno alla lista delle missioni.
- Riproduzione: `player.sphereBonus.hp = -2950` nel salvataggio (HP 50) e relogin; Quest 130
  (Armored Knight) basta. Rimettere `hp = 40` a prova finita.
- Il vecchio «crash in PartyTopScene» era una cattura falsata (i tocchi di avvio di stackcap
  aprivano Party: usare `-NoStart`); le cause vere erano layout mancanti e il 9-slice su Plate21.
- Bilanciamento: Bandit + Red Nocturne (1240 parte 2) azzerano 3040 HP a LV3 (ISSUES I-013).
- Nel tutorial la morte mostra un avviso, mai catturato (ISSUES I-031).

<a id="burst"></a>
## Burst (GuiltBurst)

Pulsante rosso in alto a destra, una volta per missione (anche raid e Colosseo), attacco a tutti
i nemici con potenza dal livello Burst (introdotto in 1.40; khux-guides.tumblr.com/post/152649620061).
Codice: `CarouselGuiltBurst`, setup `[fn]` (battaglia) -> `[fn]` (UI).

- **Condizioni del pulsante** (oggetto cifrato della battaglia, `[fn]`):
  - `+0x1c` = 1 dall'init (`[fn]`), azzerato dopo il primo setup: e' il «solo la prima volta»;
  - `+0x18` = `[fn]` = **`userData.userDetail.isGuilt`** (riga userDetail +0x44,
    singleton `[fn]` +0x128; in multi/raid, `+0x2c` = 2, quella del leader a +0x8b0 -> +0x60).
    Il server mandava 0: **causa del pulsante assente**;
  - livello `[fn]` = **`userPoint.guiltBurstLv`** (riga userPoint +100, singleton +0x118;
    in multi +0x8b0 +4) != 0;
  - non PvP (`[fn]`: CarouselDeck +0x300 = 1 fuori dal PvP).
- **Attacco** (`[fn]`, slot battaglia +0x358): riga **medal 2** (tabella 0x55 = medal,
  `[fn]`): STR +0x4e0, DEF +0x4ec, +0x4d4; potenza = `Lv / 100 x battleMisc 134 / 10000 x
  10000` = **Lv x 400** (battleMisc 134 = 40000; `[data]` = 100, `[data]` = 10000).
  Senza riga medal 2 l'attacco non si prepara. Poi `[fn]` legge **shuffleskill 901 e 902**
  (enemyKind/enemyKindRate, +0xac/+0xb0) **senza controllo del null**: senza righe, crash
  all'avvio della battaglia. Il pulsante: `Guiltburst_UI`, `Guiltburst_but`, `Guilt_Lv_Num` di
  `ActionMap_Guiltburst.json` (servito); usabile se i flag +0x19/!+0x1a/!+0x1b (`[fn]`).
- **Righe master** (`server/make-guilt-burst.js`, idempotente, chiamato anche da
  `make-game-tables.js` e `make-moogleshop.js`): medal 2 «Burst» (copia della 1, STR/DEF 5000
  segnaposto `KHUX_GUILT_BURST_STR`, burstId 11); burst 11 = «11:ギルトボム» (Guilt Bomb, tutti i
  nemici) della 5.0.1, con animazioni `abl_00011`/`eff_00011` assenti -> quelle di Thundaga
  (10145/110145); shuffleskill 901/902 (enemyKind 1/2, bonus 0, icone 60/61). Rev. master +1.
- **Livello** (`server/guilt-burst.js`): +`addGuiltBurstLv` (riga medal +0x4c4; nelle tabelle 0 ->
  1) alla prima guilt di ogni medaglia, +`addGuiltBurstLvMax` (+0x4c8; 0 -> 5) alla prima guilt
  massima. Qui la guilt e' il tier (`guiltValue`, fisso, niente `guiltFactor`): prima guilt = prima
  medaglia (medalId) posseduta con tier > 0; guilt massima = prima copia al `maxLv` (scelta nostra).
  Registro che non scende in `player.guiltBurst {first, max}` (il vecchio `player.guiltBurstLv` non
  si usa piu'). `isGuilt` = 1 se il livello > 0. `KHUX_GUILT_BURST_LV=<n>` fissa il livello per le
  prove (il salvataggio con tutte le medaglie da' Lv 1908 = potenza 763.200).
- **Popup di livello**: `guiltBurstFirstUserMedalIds`/`guiltBurstMaxUserMedalIds` (`[fn]`:
  `/stage/clear`, draw, Moogle Shop, raid reward) e `guiltBurstFirstLv`/`MaxLv` del Level Up
  (`[fn]`) aprono `lwf/medal/guilt_bonus/GuiltBonus_BurstLvup` (`[fn]`, clip
  `FromLv`/`ToLv`, evento `enterFrame` su `_root`) e `GuiltBonus_BurstLvup_num` (`[fn]`),
  importati dai dati JP 4.3.1 (`import_jp_raisedraw.py`, con `GuiltBonus_Wfix0..9` e il layout
  `MedalInfo_Burst_Info.json` di `[fn]`) con il logo «NOVA» al posto di «BURST» (`make_nova_logo.py`,
  `--replace`), risorse 41. Popup acceso per default (`KHUX_GUILT_BURST_POPUP=0` lo spegne): provato al banco dal
  Level Up il 17-10 (+1 «Unlocked X's Special Attack Bonus!», +5 «Maxed out X's Special Attack Bonus!», TAP SCREEN;
  [shop.md#sp2b](shop.md#sp2b)). Il Level Up manda il livello d'arrivo ([guilt.md](guilt.md)); per le liste
  `guiltBurst*UserMedalIds` (draw, /stage/clear) il client calcola i livelli dalla riga medal
  (`addGuiltBurstLv/Max` +0x4c4/+0x4c8, `[fn]`): 1/5 sulle righe che un preset «guilt: max» puo' consegnare (`make-nova-rows.js`, I-149 chiuso, [shop.md#sp2b](shop.md#sp2b)). Registro per `groupId || medalId`.
- **Super Burst** (`setupSuperGuiltBurst` `[fn]`, sempre chiamato): per ogni medaglia del
  deck con `validSuperBurst` (+0x500) e `superBurstId` (+0x504) != 0 (`[fn]`) aggiunge un
  pannello a `ActionMap_SuperBurst_SelectWindow/SelectPanel` (serviti). Nessuna medaglia delle
  nostre tabelle ce l'ha: spento. Per accenderlo servono `superBurstId` sulle medaglie, righe burst
  dedicate (`superburstTiming`; animazioni `abl_50xx1`/`eff_50xx1` servite),
  `lwf/battle/Sburst/Sburst.lwf`, `SBurst_Revival.lwf` e `img/ui/SBurst_Icon1..3[R].png` (assenti).
- Da verificare: `abl_15031` (tabella delle mosse dell'avatar, accanto a `fburst_1/2`) assente; altri
  lettori di `isGuilt` (es. `PopupNormal_Guilt_ver130`, layout mancante) non cercati a fondo.

<a id="hud"></a>
## HUD: confronto con l'originale (I-124)

Riferimento: `reference\battle_hud\hud_khux_utente.jpeg` (originale) contro `screenshots\d14_*.png`.
Tre elementi mancano da noi.

- **«530% BONUS» con la freccia rossa** (in basso a destra, durante il cut-in dello speciale) = guilt
  della medaglia. `CarouselDeck`: `[fn]` prepara i movimenti `GuiltBonus`/`GuiltBonus_Plus`
  dell'armatura `ActMapCarouselAnim` (`[fn]`, tabella 0x1f1e820; `[fn]` torna NULL
  se il movimento manca). Allo speciale `[fn]` legge `darklight` della medaglia (riga medal
  +0x498: 1 cut-in normale, 2 «Dark», 3 nessuno) e la guilt dello slot (`CarouselDeck` +0x4fc +
  4·slot): se != 0 usa il cut-in `_Guilt` e chiama `[fn]`, che scrive `guilt/100 + plus`
  (+0x488, max 999) nelle ossa `GuiltBonusNum1..3` e mette `GuiltBIcon`/`_eff` sull'immagine
  `guiltValue - 1` (riga +0x4c0, il tier). La guilt dello slot viene da `[fn]` = campo +0x10
  della medaglia di battaglia, che `[fn]` copia da `userMedal.guiltFactor` (struttura
  +0x2c, parser `[fn]`) **solo se la battaglia ha `isGuilt`** (record +0x18 =
  `userDetail.isGuilt`) o se e' la medaglia dell'amico (categoria 2). Server: gia' giusto
  (`guiltFactor` in `userMedalElement`, `isGuilt` dalla Quest 34). Da noi manca perche' le medaglie
  del deck hanno guilt 0: nel salvataggio solo la 2216 (Black Coat King Mickey, tier 3, guilt 10000)
  ce l'ha, e non e' nel deck del keyblade 2. Risorsa: il movimento `GuiltBonus` c'e' nella servita,
  ma e' una revisione vecchia (8 movimenti, 52 frame): `GuiltBIcon` ha 8 immagini e
  `[fn]` (changeDisplayWithIndex) non controlla il limite, quindi una medaglia di tier 9/10
  (307 righe nel master) con guilt leggerebbe oltre il vettore = crash al cut-in; mancano anche
  `GuiltBonus_Plus`, il PvP e `MedalAttack_SBurst`. `recon/tools/make_carousel_anim.py` scrive
  l'armatura JP corrente (18 movimenti, icone 1-10) con un solo atlante col nome servito (WW a
  sinistra, i 42 frame solo JP a destra, tela 2048x1024; un plist nuovo non si caricherebbe).
- **Icone di stato sopra l'avatar** («↑↑↑ luna+spada ×15», «Re» col colore dell'attributo):
  `BattleStateIcon`. `[fn]` cicla i 16 tipi (tier a +0x300; >0 buff `BIconNN`, <0 debuff
  `DIconNN`, tabelle 0x1f1be08/0x1f1be88) e carica `lwf/battle/ActMapBuffDeBuffAnim/<nome>/<nome>.lwf`
  piu' il tier `BuffNum_Up/DownNN` (0x1f1bf28, indice tier + 20: «×15» = `BuffNum_Up15`);
  `[fn]` le icone del Reflect `lwf/battle/ActMapReflectionAnim/RIcon_*` (solo se il file
  esiste). Nessuna delle due cartelle e' servita (names_v4, addnl, stage_gen): niente icone, nessun
  crash. Il JP 4.3.1 le ha (69 + 6 cartelle; texture condivise una volta sola, es. «素材画像_Buff01»
  in DIcon02): aggiunte a `JP_LWF` di `import_jp_coco.py` con le stesse cartelle come riempimento
  (101 texture citate, 0 assenti; prova su una copia: 176 file, nomi nuovi nell'indice).
- **Icona blu sotto il Burst** = posto del pulsante **Super Burst (Supernova)**: `SuperBurst_UI` di
  `ActionMap_SuperBurst_SelectWindow` (servito; `createSuperBurstUI` `[fn]`). Si mostra se
  `setupSuperGuiltBurst` (`[fn]` -> `[fn]`) trova una medaglia del deck con
  `validSuperBurst` (+0x500) e `superBurstId` (+0x504) != 0, e la battaglia ha `isGuilt`
  (`[fn]`, record +0x18) oppure e' la medaglia dell'amico. «SB» = Supernova nel WW (wiki:
  «"SB" Sephiroth» -> «Supernova - Sephiroth»; `SBurst_Icon1/2/3` = SN, SN+, SN++). Da noi manca
  perche' nessuna medaglia del master ha `superBurstId`. Nota: il pulsante 4.3.1 usa
  `SBurst_but01.png` (bussola azzurra; `ActionMap_SuperBurst_SelectWindow.json` uguale nel WW e nel
  JP), mentre nella foto c'e' la «bolla» di `SBurst_Icon` senza scritta (= `Supernova icon KHUX.png`
  della khuxwiki): non e' in nessuna versione locale (4.3.1, 4.4.0, 5.0.1), quindi viene da un
  aggiornamento NA successivo. Dal 15-10 (decisione dell'utente) il pulsante usa l'icona SN dei filtri della Medal List:
  `SBurst_SN_but01/02` (SBurst_Icon1 JP ridotta a 80x80, premuto scurito, `make_textures.py`) in una copia di
  `ActionMap_SuperBurst_SelectWindow` (`make_layouts.py`, sorgente WW in `layouts\orig`); provato sul banco. Per accenderlo: righe
  medal/burst delle Supernova (`superburstTiming`), `lwf/battle/Sburst` e `SBurst_Revival` (nel JP,
  da aggiungere a `JP_LWF` insieme ai dati), `img/ui/SBurst_Icon1..3R.png` (JP `img/ui`).

Banco: (1) senza risorse nuove: mettere la 2216 nel deck, uno stage, il suo speciale -> «100% BONUS»
con l'icona del tier 3 e la freccia (serve `isGuilt` 1: Burst visibile = gia' 1). (2) Dopo
`python recon\tools\make_carousel_anim.py` (scrive in `stage_gen\files`) e un build: una medaglia di
tier 9/10 con guilt (Level Up) -> icona viola 9/10 come nella foto, niente crash. (3) Dopo un build
completo (nomi nuovi: non con `-Quick` se la riserva non basta): uno speciale con un buff (STR/DEF
su, effetto della riga burst) o un debuff nemico -> icona e «×N» sopra l'avatar.


<a id="supernova"></a>
## Supernova e campi nuovi di `burst` (client 4.3.1, 14-10)

Riga `burst` in memoria (lettore `[fn]`, getter per id `[fn]`): campi a 4 byte in
ordine di schema da `addTurn` +0x388 fino a `unmatchMagnification` +0x52c (`target` +0x2a8,
`critical` +0x2b8, `criticalPower` +0x2bc, `recovery` +0x4d0, `oprUrgencyId/Value` +0x4d4/+0x4d8,
`addGuiltBonusId/Count/Value` +0x4dc..+0x4e4, `superburstTiming` +0x4e8, `recurringAttribute` +0x4ec,
`reflection*` +0x4f0..+0x4fc, `addBase*` +0x500..+0x51c, `matchCount*` +0x520..+0x52c). Medaglia:
`validBurst` +0x4f8, `burstId` +0x4fc, `validSuperBurst` +0x500, `superBurstId` +0x504.

**Supernova** (certezza alta):
- `superBurstId` e' un `burstId` della tabella `burst`: la Supernova e' una riga `burst` come gli
  speciali. `[fn]` sceglie la riga dell'attacco: con il flag Supernova dell'attacco (+0x6a)
  `superBurstId` (se `validSuperBurst` != 0), altrimenti `burstId` (se `validBurst` != 0). Quindi buff,
  debuff, `addTurn`/`addCount`, `recovery`, guilt bonus ecc. della riga valgono anche per la Supernova.
- Pulsante (`[fn]`, da `setupSuperGuiltBurst` `[fn]`): per ogni slot del deck con
  `validSuperBurst` e `superBurstId` != 0, se la battaglia ha `isGuilt` (`[fn]`) oppure e' la
  medaglia dell'amico (categoria 2), aggiunge il pannello (`[fn]`) e accende il bit dello slot
  (una Supernova per medaglia per quest). Pannello: nome +0x14 e descrizione +0x95 della riga
  `burst`, icona del bersaglio da `target` (1-3), `MultiplyNum_Label`, targa `SBurst_Plate01.png` o,
  con `recurringAttribute` != 0, `SBurst_Plate01re.png` (solo JP).
- `superburstTiming` (`[fn]`, solo IA in PvP in difesa): se > 0 la Supernova scatta prima
  dello slot `min(timing, n slot)` (1 = prima dello slot 1), come «Triggers before slot N is activated
  when defending in PVP» della wiki (Roboloid: campo `Supernova.Timing`).
- `recurringAttribute` (`[fn]`): maschera; dopo la Supernova riaccende la Supernova gia' usata
  delle altre medaglie del deck la cui riga Supernova ha `recurringAttribute` 0 e il cui tipo combacia:
  bit 0/1/2 = attributo Power/Speed/Magic (medaglia +0x494 = 1/2/3), bit 3/4 = Upright/Reversed
  (+0x498 = 1/2) (`[fn](maschera, bit)`). Animazione `lwf/battle/SBurst_Revival` (`[fn]`).
- Banco 14-10 sera, deck di sole Supernova (keyblade 2: Supernova - SP Roxas, Supernova+ - SP Axel,
  Supernova+ - SP Xion, SN+ - Illustrated Sora, SN+ - HD Xion [EX]; costo 230, serve livello giocatore
  ~95 con la sphere: sotto, «Exceeds equipment cost» come nell'originale): il pulsante apre il
  pannello con tutte e 5, la Supernova scelta parte e funziona (provato dall'utente). Senza badge SN
  sulle medaglie del deck (vedi sotto).
- Badge SN/SN+/SN++ (`[fn]`): dal campo +0x18 della riga medaglia (`displayId` in ordine di
  schema): 100/101 e 1100/1101 -> `img/ui/SBurst_Icon1`, 200/201 e 1200/1201 -> `Icon2`, 300/301 e
  1300/1301 -> `Icon3`; da 1100 in su la variante `...R.png`. Da noi `displayId` = id dell'immagine:
  nessun badge. Da verificare se il client usa `displayId` delle medaglie anche per la grafica.
- Animazioni: `lwf/burst/motion/abl_50011..50521` (51) e `lwf/burst/effect/eff_500x1` (40) sono
  servite (WW) e assenti nel JP: con ogni probabilita' `motionId`/`effectId` delle righe Supernova
  (5xxx1, una per Supernova); nessun dato originale lega id e medaglia.
- Nessun dato originale locale ha righe Supernova o `superBurstId` (thethiny: formato vecchio senza
  questi campi; 5.0.1: niente tabella `medal`). Fonte per ricostruirle: Roboloid
  `medal_db.json` campo `Supernova` (`Name`, `Text`, `Multi` = moltiplicatore, `Timing`, `Target`,
  `SelfBuffs`/`EnemyBuffs`), khuxwiki «Supernova».
- Risorse **mancanti** dalle servite (names_v4, addnl): `lwf/battle/Sburst/` (`[fn]`),
  `lwf/battle/SBurst_Revival/`, `lwf/battle/BurstGauge_Recovery/`, `img/ui/SBurst_Icon1..3.png` e
  `..1R..3R.png` (nel JP solo le R in `img/ui`; le non R sono in `cocostudio`),
  `cocostudio/publish/SBurst_Icon1/3.png` e `SBurst_Plate01re.png` (servita solo `SBurst_Icon2`).
  Tutte nel JP 4.3.1 (`lwf\battle\Sburst`, `SBurst_Revival`, `BurstGauge_Recovery`, `img\ui`,
  `cocostudio`): da aggiungere a `JP_LWF`/`JP_IMG` di `import_jp_coco.py`. Servite: `ActionMap_SuperBurst_*`,
  `MedalInfo_SuperBurstWindow_ver*`, `SBurst_but01/02`, `SBurst_eff02..05`, `SBurst_Plate01..03`.

**Campi nuovi** (formato thethiny vecchio senza questi campi):
- `critical` = probabilita' di critico in decimillesimi (5000 = 50%), `criticalPower` = moltiplicatore
  x10000 del colpo critico (10000 = x1), `[fn]` (divisore 10000.0 `[data]`; la
  probabilita' e' scalata per 1 + bonus/10000 dei trait). Certezza alta.
- `recovery` = gauge recuperati dal giocatore («Gauge +N»): `[fn]` -> `[fn]` somma N
  al gauge (+0xbc0) e, se > 0, anima il recupero (`BurstGauge_Recovery`). Certezza alta.
- `oprUrgencyId`/`oprUrgencyValue` = conto alla rovescia dei nemici (`[fn]` ->
  `[fn]`): id 1 = riporta i contatori al valore iniziale («Resets count»), id 2 = somma
  `oprUrgencyValue` (con segno, massimo 999: «Enemy countdown +3» = 3, «±0» = 0) ai contatori degli
  attacchi nemici di tipo 2/3. Altri id: nulla. Certezza alta.
- `addGuiltBonusId`/`Count`/`Value` = «SP ATK B +N%» (`[fn]`/`[fn]` ->
  `[fn]`): voce attiva solo con id != 0, count > 0, value != 0; il bonus mostrato e' il
  **massimo** delle voci attive (`[fn]`), in percento (230 = +230%), scritto nel
  `CarouselDeck` +0x488 (sommato alla guilt/100 nel cut-in, max 999). Id/count = tipo e durata
  (presumibilmente 1 = turni, 2 = attacchi, come `addTurn`/`addCount`): da verificare sul banco.
- `matchCountType`/`matchCountValue`/`matchMagnification`/`unmatchMagnification` (`[fn]`):
  stesso schema a liste (+0x590 con `matchMagnification`, +0x5e0 con `unmatchMagnification`, voce
  attiva con tipo != 0 e valore > 0); moltiplicatori probabilmente x10000. Significato non verificato.
- `reflection*` (`[fn]` -> `[fn]` per ogni bersaglio): attivo con `reflectionTurn` > 0
  (turni), con `reflectionMagnification` e `reflectionAttribute`; `reflectionResetAttribute` letto
  altrove. Icone `ActMapReflectionAnim/RIcon_*`. Unita' non verificate.
- `addBase*` (`[fn]` se' stesso, `[fn]` avversario -> `[fn](tipo, valore,
  atk, def, attributo)`): `addBaseCountType`/`Value` = tipo e durata, `addBaseAtk/DefSelf` e
  `...Opponent` = variazione di STR/DEF base, `addBaseAttribute` = maschera. Unita' non verificate.
- Buff/debuff (dalle 154 righe thethiny confrontate con Roboloid): `buf*` = livelli positivi,
  `debuf*` = livelli **negativi** (-N); `...All` = su tutti i bersagli (speciali con `target` 2),
  senza `All` = sul bersaglio; `addTurn` = durata in turni, `addCount` = durata in attacchi;
  `heal`/`healShake` (cura, es. 2500/500), `cure*` 1 (Esuna), `resetDebuf*` 1 (Dispel), `copyBuf*` 1 +
  `addTurn` (Mirror); attributo neutro = `attribute` 5.
<a id="cornice-avatar"></a>
## Cornice dell'avatar nell'HUD (I-125, 14-10)

`[fn](?, angolo, ?)` (chiamata da `[fn]`, `ActionMap_PlayerStatusField_new`) carica
`img/ui/PlayerStatusIndicator/Avatar_Circle_0N.png` per l'angolo di vita persa
`(1 - HP/HPmax) * [data]` contro le soglie `[data]` = 90 e `[data]` = 180:
< 90 Circle_01, 90-180 Circle_05, >= 180 Circle_06 (poi Side_01/02). La texture nulla non e'
controllata: SIGSEGV a 0x24, pc `0xb17adc` (logcat -b crash: `rbx` = indirizzo ARM). Le risorse WW
servivano solo Circle_03/04/05 e Msk: Circle_06 e Side_02-04 dai dati JP, Circle_01/02 e Side_01 dal
pacchetto 2016 (`import_jp_coco.py`, `JP_IMG`). Per riconoscerlo: crash subito dopo `/stage/start`.

<a id="nemici-jp"></a>
## Grafiche originali dei nemici (enemy_gen, 14-10)

Problema: le risorse WW servono `lwf/character/enemy/<displayId>/` solo per 1, 6, 8, 17, 37, 1020 e
le serie di Dark Road: `make-game-tables.js` dava a tutti gli altri un sostituto (Shadow, Armored
Knight, tabella di Dark Road), es. Munny Egg con lo Shadow.

Cosa carica il client 4.3.1 (Ghidra): `[fn](nemico, stato, n)` formatta la LWF dalla tabella
`0x1f1cc88` = {0 `wait`, 1 `bwait`, 2 `move`, 3 `atk%d_o`, 4 `atkSp`, 5 `knockback`, 6 `dead`} e la
apre con `[fn]`, che rende NULL se il file manca; subito dopo si legge `+0x4a0`: crash.
`[fn]` (creazione) prova solo l'esistenza di `bwait` e `atkSp` (`[fn]`, flag
`+0x892`/`+0x893`): assenti -> stato 1 e 4 ricadono su `wait`. `atk%d_o`: n = `attackMotion` della
riga `enemyAttack` (`[fn]`/`[fn]`, campo `+0x2d8`; 2 = `atkSp`); nel nostro master
tutte le righe hanno `attackMotion` 1. `[fn]` precarica le 7 voci (tollera le assenti).
Quindi **obbligatorie: `wait`, `move`, `atk1_o`, `knockback`, `dead`**; facoltative `bwait`,
`atkSp`, `atkN_o`. `move` serve solo quando il nemico cammina nel campo (`[fn]` stato 3):
142 dei 360 nemici JP non l'hanno (piante, boss fermi, come il 37 servito), ma le nostre mappe
possono farli muovere (crash di Yellow Opera su Dark Road 5075): si ricostruisce da `wait` come
`make_enemy_moves.py`. Effetto di comparsa: `lwf/character/enemy/show_effect_fla/show_effect<showSwf>/`.

`recon/tools/make_jp_enemies.py` (Pillow: senza `-I`; ~40 s) scrive `D:\Progetto_Restauro_KH_UX\enemy_gen\files`
per i displayId originali (`enemy_display_orig.json`) delle righe del master non serviti dagli indici
(names_v4 + addnl): per animazione (1) LWF JP 4.3.1 con tutte le texture JP (le assenti dal 2016 solo
se il LWF 2016 e' identico byte per byte), (2) LWF e texture del pacchetto 2016, (3) LWF JP con le
texture scartate come doppioni riprese da un'altra animazione dello stesso nemico (copie identiche);
PNG -> BTF premoltiplicato. Un nemico entra solo con tutte le obbligatorie complete. Piu' gli
effetti di comparsa originali non serviti (5, 7, 8, 9, 12, 13, 15, 16, 19, 101, 103). Rapporto in
`enemy_gen\report.md`. Formato LWF uguale nelle tre fonti (intestazioni `12101000`/`13121100`).

Risultato (14-10): 121 displayId da coprire, **116 completi** (605 righe enemy su 670, 12.267 file,
51,8 MB; pacchetto 53,2 MB), move da wait per 16 (36, 38, 39, 73, 75, 76, 154, 184, 198, 199, 211,
228, 230, 231, 232, 1023). Incompleti (restano col sostituto): 251 Cannoned Camel, 1501 Gold
Tricholoma (texture di wait/knockback assenti, niente dead), 2001-2003 sEnm (niente knockback ne'
dead in nessuna fonte). Stage di storia: 173 enemyId, 18 serviti WW, 152 con la grafica originale,
3 col sostituto (1501 -> Dark Road 5038, 2001/2002 -> 17).

`make-game-tables.js`: le cartelle `enemy_gen\files\lwf\character\enemy\<id>\wait\wait.lwf` e
`show_effect_fla\show_effect<N>` contano come servite (`KHUX_ENEMY_GEN` per un'altra cartella,
`KHUX_NO_ENEMY_GEN=1` per ignorarle); le righe vere a cui una corsa precedente aveva messo l'effetto
dello Shadow riprendono il loro (show, showSwf, showFrame, hideFrame) se ora e' servito (55 righe).
Build: pacchetto statico `d0037` prima del generato (`build-resources.ps1`, `-NoEnemies`).
Master e pacchetto vanno insieme: un master con i displayId originali su una versione senza
`enemy_gen` va in crash all'avvio delle missioni.
