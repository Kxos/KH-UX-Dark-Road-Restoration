# Battaglia, stage, sconfitta

Storia: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md) («La prima
battaglia», «Il Prologue giocato», «Il Prologue completato», «Missione 2»).

<a id="api"></a>
## API dello stage

- `GET /stage/support/list` (111): `supportUsers[]` (`FUN_0078a5c4` con `userMedal`, `userSkills`,
  `userAvatar`). Prima di «Begin»: `userDetail.maxMedal` > 0 (altrimenti `PopupNormal_MedalOver`
  assente) e `maxDeckCost` > 0 (`PopupNormal_Cost_Over`).
- `POST /stage/start` (113): `userData.userPoint`, `startStageData` (`FUN_007a1428`),
  `userRandomEnemies[]`, `userEnemyDropItems[]` (`FUN_007a11c8`: `uniqueEnemyId`, `dropItemTypeIds`
  int[] <= 4/5, `stealType`), `userTreasures[]` (`FUN_007a1308`), `campaigns[]`,
  `luxMagnifications`, `supportUsers[]`. `GET /user/keyblade` (11) da' `userKeybladeId`,
  `GET /user/deck` (12) il deck.
- `POST /stage/clear` (116, parser `FUN_007817a0`): `userData.{userPoint,userDetail,
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

- HP: `userPoint` `baseHp`/`hp`/`maxHp` (il client mostra `maxHp`). `FUN_00b157c8` dimensiona
  l'arco dell'HP: oltre 3000 carica `Avatar_Circle_01/06.png` e `Avatar_Side_01..04.png`, assenti da
  ogni pacchetto (crash). HP base 3000 (segnaposto `KHUX_PLAYER_HP`; il valore vero al livello 1 non
  si trova), +20 per nodo delle bacheche (`player.sphereBonus.hp`).
- Tipi di premio (`FUN_00b07090`): 4 monete, 8 CP (barra speciale), 9 HP, 2/3/5/6/7/10 oggetti
  (3 medaglia, 5 materiale, 14 Avatar Coin). Immagini `img/prizes/Prize_{Money,Hp,Cp,Treasure,Lux}NN`.
- Forzieri: `StageUtil::getTreasurePrizes` (`FUN_00e7e980`) alla creazione (`FUN_00b09a38`) cerca
  in `userTreasures` l'`uniqueTreasureId`, legge la riga `reward` della mappa e tiene i premi il cui
  tipo compare nella stessa posizione di `dropItemTypeIds`. Righe vere: 1 barile vuoto, 80 CP 15.000
  (Attack Prize piccolo), 81 CP 30.000 (medio), 90 HP 1.400 (barile con HP); 10100 = medaglia a caso
  (primo nemico di ogni mappa). Quantita' nostre in uso: CP 10.000/5.000, HP 500 (ISSUES I-032).
- Sacchetti (contatore d'argento): drop dei nemici, `FUN_00e7e6e8(.., uid, reward)` cerca la riga
  `reward` (`FUN_00f04580`, tabella interna 7) e **va in crash se manca**. Si aprono in
  CONGRATULATIONS.
- Sfere arancioni (CP) e verdi (HP) dai nemici: tabella `enemy` (Shadow `attackCp` 50, `suppressCp`
  100, `attackHp` 30, `suppressHp` 144).

<a id="livello"></a>
## Livello e RESULTS

Il livello e' il rango Lux: `FUN_009aaad0` -> `FUN_006ea1b4` usa `userDetail.luxRank` e
`userPoint.lux` contro le soglie cumulative `needExp` delle righe `lv` e `lv+1` di `player` (indice
0x5b; serve la riga del livello 0). Il server parte da rango 1 e somma i Lux di ogni `/stage/clear`.
`firstClearFlag` 1 cambia il percorso dopo lo stage (`/user/sphere/reset`, `/user/sphere/check`).

<a id="slot-vuoto"></a>
## Slot vuoto del Keyblade

Il client fa un turno per ogni voce di `userDecks[].deckMedals`: uno 0 diventava una medaglia finta
(master 1, Paperino blu senza costo) che attaccava (`FUN_00b0b87c`/`FUN_00b0c08c`; analisi in
`stage_gen\deck_empty_slot\REPORT.md`). `sentDeckMedalIds()` toglie gli zeri; `player.deck` li
tiene. Limite del client 4.3.1: il moltiplicatore segue la posizione nell'array, il «turno saltato
con moltiplicatore sprecato» degli originali non si riproduce senza patch (commit b159b62).

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
