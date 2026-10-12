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
  **assenti** (LWF nullo = crash). Le liste partono solo con `KHUX_GUILT_BURST_POPUP=1`; il Level Up
  manda 0. Per generarli: copia di un LWF con clip omonime (stile `make_medaltype_lwf.py`).
  `MedalInfo_Burst_Info.json` (`[fn]`, dettaglio medaglia) e' nei layout mancanti.
- **Super Burst** (`setupSuperGuiltBurst` `[fn]`, sempre chiamato): per ogni medaglia del
  deck con `validSuperBurst` (+0x500) e `superBurstId` (+0x504) != 0 (`[fn]`) aggiunge un
  pannello a `ActionMap_SuperBurst_SelectWindow/SelectPanel` (serviti). Nessuna medaglia delle
  nostre tabelle ce l'ha: spento. Per accenderlo servono `superBurstId` sulle medaglie, righe burst
  dedicate (`superburstTiming`; animazioni `abl_50xx1`/`eff_50xx1` servite),
  `lwf/battle/Sburst/Sburst.lwf`, `SBurst_Revival.lwf` e `img/ui/SBurst_Icon1..3[R].png` (assenti).
- Da verificare: `abl_15031` (tabella delle mosse dell'avatar, accanto a `fburst_1/2`) assente; altri
  lettori di `isGuilt` (es. `PopupNormal_Guilt_ver130`, layout mancante) non cercati a fondo.
