# Shop > Draw: estrazioni delle medaglie

Sotto-progetto 1 delle estrazioni (16-10-2026): piastra «Banner Catalog» + tre banner originali del primo anno
(DAILY DEAL!, SMALL DEAL!, Epic Medal Carnival) pagati in jewel, banner di prova a biglietti (Platinum Ticket Draw,
solo con `KHUX_GACHA_TEST=1`, sostituito nel sotto-progetto 2 da `KHUX_GACHA_SHOW`). Sotto-progetto 2 (17-10):
elenco dei banner originali, [sotto](#sp2). Codice: `server/gacha-data.js` (funzioni pure), `server/gacha.js` (lista, controlli,
pagamento, pagine web), rotte in `server/server.js`. Generatori (dal sotto-progetto 2): `recon/tools/make_banner_catalog.py`
-> `server/game_data/gacha_catalog.json` (il catalogo), `recon/tools/make_banner_images.py` -> `server/game_data/gacha_img`,
`server/make-banners.js` -> `server/master_data/drawMedalType.json` (il master; il `gacha_banners.json` del sotto-progetto 1
non si scrive piu'). Prove: `node server/test-gacha-data.js`, `node server/test-gacha.js`, `node server/test-gacha-server.js`,
`python recon/tools/test_make_banner_catalog.py`. Piano e spec: `docs/superpowers/plans/2026-10-16-shop-estrazioni.md`.

<a id="protocollo"></a>
## Protocollo (client WW 4.3.1, indirizzi Ghidra)

### GET /gacha/list (azione 75)

- Parser `FUN_00795724` (`gachaList`, elemento `FUN_0079541c`, 0x90 byte) **e** `FUN_00795ba0` (`petGachaList`):
  senza `petGachaList` -> «200 ERROR :75». Salvata nel singleton `FUN_007c1dfc` +0x560.
- `FUN_00a19c84` fa una piastra per elemento (mappa scena+0x998, raggruppate per `sortId` della lista, crescente, poi drawMedalTypeId; il sortId del master non conta): +0x18 drawMedalTypeId,
  +0x1c price, +0x20 lotCount, +0x28 bannerUrl, +0x40 drawType, +0x44 payType, +0x48 isDayLimited,
  +0x4c userLimitedCount (estrazioni RIMASTE oggi), +0x50 userWarrantDisplayOfTime, +0x58 warrantMedalIds.
- Il master **DrawMedalType** (parser `FUN_00ef4454`, getter `FUN_00ef4258`, tabella 0x5c) e' obbligatorio: la piastra
  legge la riga senza controllo (displayTimeLeft in `FUN_00a141c8`, detailUrl in `FUN_00a1509c`). Ogni cambio di
  `drawMedalType.json` = revisione del master (BASE 118 dal 16-10, 119 dal 17-10 con il catalogo dei banner, 120 dal
  17-10 con i limiti delle gratuite nel `comment`).
- `bannerUrl` scaricato in http dal client (`FUN_00a190e0` -> `FUN_00836bf8`), 640x140: `/web/gacha/img/<id>.png`.
  Le immagini delle piastre fuori schermo si scaricano solo quando la piastra entra nella vista (banco: la piastra
  Platinum mostrava il cuore segnaposto finche' `GET /web/gacha/img/10456.png` non era arrivato).

### POST /gacha/draw (azione 76)

- Tocco su DrawButton1/3 -> `FUN_00a1ff24` (busy +0x990/+0x991; drawType in {1,3,5,6}; isDayLimited con
  userLimitedCount 0 -> nessuna azione) -> `FUN_00a1c9a4`: controllo locale jewel (`FUN_00a1d0d4`) o biglietti
  (`FUN_00a19938`), box pieno -> popup 0xd; price 0 -> estrazione diretta `FUN_00a1ed54` (mai price 0), altrimenti
  conferma `FUN_00a1d1b8` -> `FUN_00a1ed54` (richiesta `FUN_007f01d4`, poi `FUN_00c69eb0` -> SceneDrawRaise).
- Richiesta `{"drawMedalTypeId", "count"}` (count = lotCount); payType e prezzo li prende il server dal suo catalogo.
- Risposta (dispatcher ramo 76 a 0x7c46bc; parser `FUN_0078b230`, `FUN_0078f1ac`, `FUN_007a5dec`): `userData.userPoint`,
  `userMedals`, `userSkills`, `userMaterials`, `gachaBonus` `{addType: 1, number: 0, userMedalIds: []}` (addType 0
  apre il popup bonus con un layout mancante), `firstGetUserMedalIds`, `userMedalIds` (ogni id deve esistere dopo la
  fusione di `userMedals`), `effectNumbers` (uno per medaglia, solo 0: 1/2 cercano LWF mancanti),
  `guiltBurstFirstUserMedalIds`, `guiltBurstMaxUserMedalIds`. Niente jewel nella risposta: dopo la risposta il client
  chiede `GET /user/stone`; OK nel risultato (`FUN_00c76c90` -> `FUN_00c78098`) -> `GET /gacha/list` e ritorno allo Shop.
- Scena (`FUN_00c6c110`, popup `FUN_00c6f68c`): `lwf/raisedraw/demo/raidgacha_result_display_%02d` con %02d = numero
  di medaglie (manca = crash; nessuna _11, massimo 10), per medaglia `lwf/raisedraw/Medal/Medal_D_Up|Rev|None<rare>`.
- WebView Details (`FUN_00a2071c`, url del master `detailUrl`): la chiusura (`FUN_00a20ffc`) azzera solo owner+0x991,
  **nessuna nuova /gacha/list** (confermato al banco, sotto).
- Draw Odds: link globale `odds` del login (+0xf0, `FUN_00791070`); il client **accoda il drawMedalTypeId della
  piastra** all'url (banco: `GET /web/gacha/odds9001`), percio' il link e' `/web/gacha/odds/` e la rotta
  `/web/gacha/odds/<id>` mostra le probabilita' di quel banner (tutti per la piastra Catalog 9001).

<a id="piastre"></a>
## Regole delle piastre

- **payType**: 1 jewel (free+pay, unico usato per i jewel), 3 solo payStone (sempre 0: mai), 4-6 drawTicket1-3
  (sempre 0), 7/8 limitedDrawTicket1/2 (Platinum/Draw Ticket, `userPoint` +0x74..), **9 = crash** al disegno (testo
  106240303 assente). payType 1 -> DrawButton1 con il testo del prezzo; 4-9 con biglietti < price -> pulsante
  grigio (`But07_Disable`, dalla risorse 39).
- **price** mai 0 (estrazione senza conferma); **benefitId** sempre 0 (piastra bloccata: lucchetto, il tocco va in
  crash, I-134).
- **comment** del master come formato printf con userWarrantDisplayOfTime (striscia scorrevole sotto il banner, con
  warrantDisplayOfTime 1, userWarrantDisplayOfTime 1, validComment 1); name/description della lista non compaiono.
- Testo dei pulsanti: drawType 1/3/5 + payType -> testi 1061404xx / 1061803xx; il Catalog usa il Gold Ticket
  (payType 6, price 1, nessuno ne ha) con i testi 106140420-424 riscritti da `recon/tools/make_shop_art.py`
  («Open Details to browse the Banner Catalog») e l'icona Star7_Ticket_39 senza «仮».
- Piastra Catalog: tocco sul pulsante grigio = nessuna azione, nessuna richiesta (banco).

<a id="risorse"></a>
## Risorse raisedraw

- `recon/tools/import_jp_raisedraw.py` (lanciato da `build-resources.ps1` nelle versioni complete o se manca la
  cartella) copia dai dati JP 4.3.1 le LWF `raidgacha_result_display_02..10` e `Medal_D_*` complete di texture (le
  texture tolte dall'estrazione JP prese dalla `_01` servita allineando le tabelle delle texture) in
  `D:\Progetto_Restauro_KH_UX\raisedraw_gen\files`; rapporto in `raisedraw_gen\raisedraw_report.json`.
- **Pacchetto statico `raisedraw_gen`** (come enemy_gen): ~33 MB (701 file, 72-78 texture per cartella), nel
  pacchetto generato lo portavano a 136,5 MB, oltre la riserva di 128 MiB. Pezzo d0038 della risorse 40, generato
  d0039, `packs.txt` con `raisedraw_gen`; `-Quick` lo rimette nell'indice se la versione installata lo contiene;
  `-NoRaisedraw` per una versione senza.
- Risorse 40: `_02`..`_10` ok, Medal_D_Up1-12, Rev1-7, None7 ok; **Medal_D_None1-6 incomplete** (texture assente:
  con una medaglia darklight 3 sotto il 7★ la scena del risultato andrebbe in crash). Nessuna delle 44 medaglie
  darklight 3 di `medal.json` e' nel catalogo: lo controlla `recon/tools/test_make_banner_catalog.py`. `KHUX_GACHA_SIZES = "1,2,3,4,5,6,7,8,9,10"` in `run-server.ps1`.

<a id="avvio"></a>
## Avvio

- `run-server.ps1` / `relogin.ps1 -GachaShow B0306,B0456` (dal 17-10, al posto di `-GachaTest`): `KHUX_GACHA_SHOW`,
  rowId del catalogo aggiunti alla lista anche se bloccati o fuori data; senza, la lista e' quella della storia.
- `KHUX_GACHA_SIZES`: numeri di medaglie per estrazione con animazione completa; un banner con lotCount fuori
  dall'elenco non si puo' estrarre.
- Biglietti per le prove: a server fermo `limitedDrawTicket1` nel salvataggio (`server\save\player.json`); a fine
  prova rimetterlo a 0.

<a id="prove"></a>
## Prove al banco (16-10-2026, risorse 40, master BASE 118)

Copia del salvataggio prima: `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-gacha\`; prima della prova dei
biglietti: `tmp\player_before_gachatest.json`. Screenshot in `D:\Progetto_Restauro_KH_UX\screenshots`.

1. **Piastre** (`shop_t6_shop0`, `shop_t6_s1_scroll`): Catalog in cima con il banner nostro, pulsante grigio «Open
   Details to browse the Banner Catalog» con l'icona nuova e contatore 0, striscia «Open Details to browse all
   banners»; sotto DAILY DEAL! («Spend 600 Jewels to get 3 Medals», «Chances left today: 1»), SMALL DEAL! («Spend
   300 Jewels to get 1 Medal»), Epic Medal Carnival («Spend 3000 Jewels to get 10 Medals») con immagini e didascalie
   scorrevoli («3 Medals: 1x 4★+, 2x 3★+ - once per day», ...).
2. **Pulsante grigio del Catalog** (`shop_t6_s2_greytap`): nessun popup, nessuna richiesta nel log.
3. **Details del Catalog** (`shop_t6_s3_catalog`, `shop_t6_s3_bannerdetail`, `shop_t6_s3_closed`): `GET
   /web/gacha/catalog`, tocco su DAILY DEAL! -> `/web/gacha/detail/10001` (probabilita' ricostruite, pool). Chiusa
   con la X: **nessuna nuova `GET /gacha/list`** (come l'analisi statica): la scelta di un gruppo dal catalogo
   (sotto-progetto 3) dovra' dire «esci e rientra nello Shop».
4. **Draw Odds** (`shop_t6_s4_odds`, `shop_t6_s4_odds2`): prima «Banner not found.» (`GET /web/gacha/odds9001`, id
   accodato dal client); corretto il link (`/web/gacha/odds/`), poi `GET /web/gacha/odds/10001` = pagina con le
   probabilita' del DAILY DEAL!.
5. **SMALL DEAL! x1** (`shop_t6_s5_confirm`, `shop_t6_s5_anim1-5`, `shop_t6_s5_back`, `shop_t6_s5_medallist`):
   conferma «Spend 300 Jewels to get 1 Medal? 2076/2263 Held 3560», animazione del Moogle, risultato con 1 medaglia
   (Yuffie 3★, gia' posseduta: niente NEW, giusto), OK -> Shop, jewel 3560 -> 3260. Log: `POST /gacha/draw`
   («B0027 SMALL DEAL!: -300 freeStone, medaglie 32043»), `GET /user/stone`, `GET /gacha/list`. Medal List: slot
   2095/2267 dopo tutte le prove (2076 + 1 + 3 + 10 + 5).
6. **DAILY DEAL! x3** (`shop_t6_s6_confirm`, `shop_t6_s6_anim1-6`, `shop_t6_s6_back`, `shop_t6_s6_greytap`): 3 medaglie
   (4★ + due 3★) in una riga, jewel 3260 -> 2660. Tornati nello Shop il pulsante del DAILY DEAL! e' **grigio** e
   senza «Chances left today»; il tocco non fa niente (nessuna richiesta). Resta grigio anche dopo un relogin.
7. **Epic Medal Carnival x10** (`shop_t6_s7_confirm`, `shop_t6_s7_anim1-8`, `shop_t6_s7_back`): +1000 jewel dati a
   server fermo per la prova (3660), conferma 3000, animazione da 10, **due righe di 5 tessere** (5x 3★, 4x 4★, 1x
   5★), jewel 660.
8. **10 aperture dello Shop** (Home <-> Shop con MENU > Home; `shop_t6_s8_shop1-10`, `shop_t6_s8_home0-10`): nessun
   crash.
9. **Biglietti** (`relogin.ps1 -GachaTest`, `limitedDrawTicket1 = 2`; `shop_t6_s9_plate`, `shop_t6_s9_confirm`,
   `shop_t6_s9_anim1-8`, `shop_t6_s9_back`): piastra Platinum Ticket Draw con 2 biglietti (icona con «仮», I-135),
   conferma «Use 1 Platinum Ticket to get 5 Medals», 5 medaglie 6★ in una riga, biglietti 2 -> 1 («-1
   limitedDrawTicket1» nel log). Poi biglietti a 0 e relogin normale (revisione 118, senza GachaTest).
10. **Notices** (`shop_t6_s10_notices`, `shop_t6_s10_shopnews`, `shop_t6_s10_diff`): notizia «Shop» (Catalog e
    probabilita') e nelle «Differences from the original game» la riga «Shop draw rates are reconstructed...».

Effetti sul salvataggio: -3900 jewel (+1000 dati per la prova: 3560 -> 660), 19 medaglie nuove, DAILY DEAL! gia'
usato oggi, biglietti 0.

### Da verificare al banco (analisi statica): esiti

1. Il cambio di scena aspetta la risposta 76: si' (nessun errore, la scena parte con i dati della risposta).
2. Medal_D_* mancanti: non osservato (pool senza darklight 3; le None1-6 non servono).
3. LWF raisedraw nell'indice: servite dalla risorse 40 (raisedraw_gen), animazioni da 1, 3, 5 e 10 viste.
4. Id ripetuti e Icon_New: non osservato (nessuna medaglia nuova nelle estrazioni fatte; nessun id ripetuto).
5. Popup 0xd del box pieno, errore di /user/stone: non provati.
6. `FUN_00839e5c` (solo analytics): nessun effetto visibile con payType 1.
7. Rifiuto del server («200 ERROR :76»): non provato al banco (coperto da `test-gacha-server.js`).

<a id="sp2"></a>
## Sotto-progetto 2: elenco dei banner originali (17-10-2026)

Spec: [shop-banner-design](../superpowers/specs/2026-10-16-shop-banner-design.md) sezione 9 (vincolante); piano:
`docs/superpowers/plans/2026-10-16-shop-banner-originali.md`. Ricerca e script di appoggio fuori repo in
`D:\Progetto_Restauro_KH_UX\tmp\sp2`.

### Catalogo generato

`server/game_data/gacha_catalog.json` (2,7 MB, fuori repo) scritto da `recon/tools/make_banner_catalog.py` dalle fonti
(tabella della wiki, notice, `recon/tools/banner_overrides.tsv` con la fonte di ogni numero): `version`, `firstRarity`
(prima data di ogni rarita': 6★ dal 15/07/2016, 7★ dal 25/05/2018), `story` (tranche di quest con la data), `subsets`,
`medals` (per nome: `ids` [id, rarita', data], `std`, `alias`, `origin`, `att`) e 808 `banners`: `rowId` B0001-B0808,
`drawMedalTypeId`, `name`, `type`, `start`/`end`, `unlockQuest` (prima quest della tranche in corso all'inizio del
banner - 1, decisione dell'utente del 17-10; 85 sbloccati entro la quest 525), `payType`/`currency`, `prices`
(gradini), `lotCount`, `rarityMix`, `dayLimit`, `totalLimit`, `vipFree`, `pool` (`mode` sets/inherit/released/list/
evolve, `filter`), `guarantee` (list, count, slot, pity, every), `skill`, `bonus`, `catalogOnly`. **Estraibile solo con
`catalogOnly === null`** (mai guardare `flags`, che puo' tenere INCOMPLETE su righe completate dagli override).

Campi aggiunti durante il sotto-progetto 2 (oltre al piano):

- `medals[n].std`: `true` solo per le medaglie standard dei pool `released`/`inherit` (voce della wiki, non alias, non
  SN/Supernova/SN+/SN++/Prime, cls '', SR, L-SR o L, class2 Attack, '', Rare o Super Rare); ogni medalId in una sola
  voce std. Nei pool released/inherit il server prende le std uscite entro la data.
- `medals[n].alias`: voce aggiunta da `medal.json` per risolvere un nome di vetrina o garanzia (SN+/SN++, Key Art,
  redirect della wiki); sempre `std: false`, usabile solo per nome (vetrina, liste, `pool.names`, set).
- `medals[n].origin` (`disney`, `ffkh`, '') e `medals[n].att` (`power`, `speed`, `magic`): per i filtri dei set.
- `pool.filter` (lista, `[]` se nessuno; `disney`, `ffkh`, `power`, `speed`, `magic`): le medaglie dei sotto-set entrano
  solo se `origin` o `att` e' nel filtro; vetrina e liste entrano sempre (B0005, B0006, B0012-B0014, B0026).
- `dayLimit`: anche 5 o 10 (il numero scritto); 1 per ogni gratuita (FREE o prezzo sempre 0) senza altri limiti.
- `totalLimit` (intero, 0 = nessuno): estrazioni in tutto, contate su `player.gacha.count`; 1 per «Available once»
  (15 banner: B0510, B0511, B0525, B0542, B0550, B0555, B0562, B0564, B0569, B0572, B0576, B0589, B0592, B0594, B0604).
- `guarantee.slot` (default 0): indice in `slotRarities` del primo slot a lista (gli altri `count - 1` seguono); 1 su
  B0306-B0308 e B0355, dove lo slot 7★ e' di una garanzia di stella con Tier e la lista sta sullo slot 6★.
- `skill` `{"table": "72415", "slots": "all"}` sui banner SN/SEVEN dal 17/12/2020 (data del notice 72415).
- `catalogOnly`: VIP_TWIN, INCOMPLETE, DRAW_POINTS, PVP_TICKETS dal generatore; `NO_MEDALS` lo mette il server
  (`sanitizeBanners` in `server.js`) ai banner con uno slot senza medaglie (B0370/B0418 Blue Fairy Deal, I-142).

Al 17-10: tipi SN 213, FEATURED 168, FALLING 129, SKILL 69, DAILY 64, SEVEN 48, FREE 36, STANDARD 23, T_TICKET 21,
ITEM 20, T_POINTS 7, BEGINNER 5, T_EVOLVE 5; `catalogOnly` VIP_TWIN 39, INCOMPLETE 24 (I-139), DRAW_POINTS 7,
PVP_TICKETS 4, piu' NO_MEDALS 2 messi dal server (B0370/B0418 Blue Fairy Deal, I-142). 17 Free Deal VIP; 15 banner
con `totalLimit` 1; 4 con `guarantee.slot` 1.

### Comandi, nell'ordine

```powershell
python recon/tools/make_banner_catalog.py              # gacha_catalog.json
python recon/tools/make_banner_images.py --mode palette # 808 immagini 640x140 in server/game_data/gacha_img (31,5 MB)
node server/make-banners.js                            # master drawMedalType.json (809 righe) -> alzare la revisione
.\tools\ldplayer\session\relogin.ps1 -Tag x            # revisione 120 (default degli script dalla correzione finale)
```

**Immagini: decisione «palette»** (Task 1, banco): PNG a 256 colori quantizzato in RGBA (mode P con tRNS), angoli
trasparenti come l'originale; 43 KB invece di 161 KB, nessun crash. Con `convert('RGB')` gli angoli diventano verdi.

**Cache delle immagini nel client**: il client tiene ogni immagine dei banner in
`/data/data/com.square_enix.android_googleplay.khuxww/cache/MM_...` (un file per URL, PNG + ~100-140 byte): un PNG
cambiato sul server non si vede finche' quel file resta. Prima di provare immagini nuove:

```powershell
. .\tools\ldplayer\bench_lib.ps1; Sh "rm /data/data/com.square_enix.android_googleplay.khuxww/cache/MM_*"
```

poi relogin (o uscire e rientrare nello Shop: il client riscarica i file mancanti).

### Lista provvisoria e regole (fino al sotto-progetto 3)

- `shopBanners` (`server/gacha.js`): banner estraibili (payType 1/7/8, `lotCount` in `KHUX_GACHA_SIZES`) sbloccati
  (`unlockQuest` <= ultima quest superata) e attivi alla data della tranche del giocatore, piu' quelli di
  `KHUX_GACHA_SHOW`; al massimo 8, i piu' recenti prima; mai due valute payType 8 insieme. Piastra Catalog sempre
  prima (9001, payType 6).
- Prezzi (9.4): mai 0 (gratuita = 1 Jewel); FIRST_FREE e FALLING dal contatore del giocatore (`player.gacha.count`).
- Valute (9.6-9.7): jewel = payType 1; Platinum = payType 7 (`limitedDrawTicket1`); payType 8 = valute stagionali in
  `player.drawTickets` (draw, holiday, spooky, moogle); payType 4/5/6/9 solo nel catalogo.
- Limiti: `dayLimit` per banner, `totalLimit` in tutto (rifiuto «limite totale raggiunto», senza addebito), una sola
  Free Deal VIP gratuita al giorno fra tutte (`player.gacha.used.vipFree`). La piastra ha `isDayLimited` 1 con uno
  qualsiasi dei tre e `userLimitedCount` = estrazioni rimaste (il minore fra giorno e totale).
- Pity e garanzie (9.2): slot a lista e vetrina scelgono prima la medaglia per nome, poi la variante alla stella
  dello slot; `every` = ogni N estrazioni.
- Rarita' e medaglie solo se uscite entro la data di riferimento del banner (9.3).
- Abilita' (skill) dalle tabelle originali, bonus nei Presents.
- Notices: «Banners unlock as you progress through the Story; in the original game they followed the calendar.»
  (Shop) e le righe nuove delle «Differences» (Free Deal a 1 Jewel, VIP Free Deal per tutti, valute stagionali,
  bonus nei Presents).

### Prove al banco (Task 9, 17-10, risorse 40, revisione 119, quest 132)

Copia del salvataggio: `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-sp2-t9` (e `save-backup-before-sp2` del
Task 1). Cache `MM_*` cancellata prima delle prove. Screenshot in `D:\Progetto_Restauro_KH_UX\screenshots`.

- Master: `GET /master/drawMedalType` al login, revisione 11900051, home raggiunta (`sp2t9_home`).
- **Notices (prova 8, parte)**: `sp2_notice_shop` (testo nuovo dello Shop), `sp2_notice_diff`, `sp2_notice_diff2`
  (righe nuove delle differenze). OK.
- La prima prova dello Shop e' fallita su I-138 (piastre senza `sortId`, «200 ERROR :75», `sp2_t9_shop1`); corretta col
  commit 264a8a6: il client ordina le piastre per il `sortId` della lista (crescente, poi drawMedalTypeId; quello del
  master non lo legge) e `gachaListData` manda Catalog 1, poi 10, 20, ... nell'ordine di `shopBanners`. Dettagli in
  [ISSUES](../ISSUES.md) I-138.

#### Ripresa dopo I-138 (17-10, commit 264a8a6, revisione 119, cache `MM_*` svuotata)

1. **Shop alla quest 132**: OK. Catalog + DAILY DEAL! (grigio, gia' usato oggi), Daily Deal!, Get a 3★-5★ Medal!,
   Get at least one 5★ Medal! (B0001-B0004), immagini riscaricate (`GET /web/gacha/img/9001..10004`) e giuste
   (`sp2r_shop1`, `sp2r_shop1_scroll2`).
2. **Catalogo**: `sp2r_catalog1`, scorrimento veloce di tutta la lista avanti e indietro senza blocchi ne' crash
   (`sp2r_catalog_scroll1-5`); stati visti: «In the Shop now», «Unlocks after Story Quest 805/815 — coming with a
   future update», «Medals not available yet — coming with a future update» (Blue Fairy Deal, `sp2r_catalog_bluefairy`).
   Dettagli: Tier 6-7 Deal 2018 bloccato (`sp2r_detail_a`..`a3`), Platinum Ticket Draw 2019 bloccato con Dual Meow
   Wow LV7 45% / LV8 45% / LV9 10% (`sp2r_detail_plat`), Skills to Thrill SKILL (`sp2r_detail_skill`, `..3`: slot,
   tabella delle abilita' sul primo slot, medaglie per rarita'). VIP_TWIN non visto a schermo.
3. **DAILY DEAL! x3** (B0001): conferma 600 = piastra (`sp2r3_confirm`), risultato Selphie 4★, KH II King Mickey 3★,
   KH II Leon 3★ (`sp2r3_anim5`), tutte del 07/04/2016 (data della tranche 2016-04-07); jewel 20000 -> 19400, piastra
   poi grigia (`sp2r3_back`).
4. **7★ Medal Deal x10** (`-GachaShow B0306,B0008`, prova obbligatoria): conferma 3000 (`sp2r4_confirm`), animazione e
   risultato senza crash (`sp2r4_anim1-8`): The World Ends with You Art 2 7★ (14/05/2018), Saix 6★ e otto 5★, tutte
   uscite entro il 25/05/2018; jewel 19400 -> 16400 (`sp2r4_back`).
5. **Platinum Ticket Draw** (`-GachaShow B0456,B0116,B0713,B0727`, `limitedDrawTicket1 = 2` a server fermo): conferma
   «Use 1 Platinum Ticket» (`sp2r5_confirm`), 5 Dual Meow Wow LV7/LV8 con NEW (`sp2r5_anim7`); il box passa da 2119 a
   2121 posti (una cella per livello, impilati); seconda estrazione (`sp2r5_confirm2`, `sp2r5_result2`: LV7, LV9,
   LV8) senza crash e senza posti in piu' (2131 prima e dopo: le celle crescono), biglietti 2 -> 0 (`sp2r5_back2`).
6. **Falling Price Deal x10** (B0116, 3000/2500/2200/2000/1900): conferma 3000 (`sp2r6_confirm`), 10 medaglie 5-6★
   del 2016 (`sp2r6_result`), poi la piastra mostra **2500** (`sp2r6_back`).
7. **Free Deal VIP** (B0713 e B0727): conferma «Spend 1 Jewel to get 10 Medals» (`sp2r7_confirm`), risultato con SN++
   KH III Kairi 7★ e nove 5★ (`sp2r7_anim8`), jewel -1; poi **entrambe grigie** (`sp2r7_back`, `sp2r7_back2`). Il
   ritorno il giorno dopo non e' stato provato al banco (coperto da `test-gacha.js`).
8. **Dieci aperture dello Shop** (MENU > Home > Shop, `sp2r8_shop1-10`): una `GET /gacha/list` per giro, nessun crash.
   **Notices**: righe nuove (Epic Medals, Blue Fairy Deal, sblocco con la storia) in `sp2r_notices`, `sp2r_notice_diff`.

**Ordine delle piastre** (con `-GachaShow`): 7★ Medal Deal (2018) sopra Skills to Thrill (29/04/2016) sopra DAILY
DEAL! (`sp2r4_shop`, `sp2r4_shop_s1`); Free Deal VIP 2020-10 e 2020-09 sopra Platinum 2019, Falling 2017 e DAILY
DEAL! (`sp2r5_shop`, `sp2r7_back2`): i piu' recenti in alto.

Ripristino: `freeStone` 360 e `limitedDrawTicket1` 0 come nel backup `save-backup-before-sp2-t9` (dati 20000 jewel e 2
biglietti per le prove). Restano nel salvataggio le 43 medaglie estratte e `player.gacha` (contatori di oggi: DAILY
DEAL!, Free Deal VIP, Falling a 2500). Poi relogin normale (revisione 119, senza `-GachaShow`, `sp2r_end_shop`).

<a id="correzione-finale"></a>
### Correzione finale (17-10, commit b9e23cc, revisione 120; provata al banco il 17-10)

- **A. Vetrina e lista del banner di debutto.** La data di ogni variante (`rare_date` di `banner_sources.medal_release`)
  e' interpolata dal numero NA e cadeva 3-11 giorni dopo l'inizio del banner che aveva introdotto la medaglia: in 15
  banner (B0054, B0068, B0084, B0086, B0089, B0106, B0176, B0184, B0199-B0203, B0230, B0246) vetrina o lista erano
  vuote alla loro data e la pity si spegneva in silenzio. `align_debut_dates` (`make_banner_catalog.py`): per ogni nome
  di `pool.featured`/`guarantee.list` di un banner estraibile che inizia il giorno S, se la medaglia e' uscita entro S
  (o S e' il primo banner estraibile che la nomina: B0199-B0203, medaglie datate 24/11, banner del 17/11), le varianti
  datate dopo S prendono S, solo alle stelle del mix gia' uscite e alla stella sopra se gia' uscita (22 varianti). Le
  altre medaglie non cambiano; niente 6★ prima del 15/07/2016 ne' 7★ prima del 25/05/2018. Vetrine ancora vuote, per
  motivo (elencate nel test): stella fuori dal mix (B0023, B0029: 6★ prima del 15/07/2016; B0280 Vexen [+], B0303
  Lexaeus [+]: solo 7★ prima del 25/05/2018; SN++ solo 7★ sui banner [[5,10]] B0663, B0732, B0746, B0759, B0787, B0801)
  e nomi senza varianti d'attacco (Cid, Chip, Moogle, Blue Fairy, Magic Mirror...).
- **B. Gratuite senza limite** (Ruling 28): `totalLimit` 1 per «Available once» (l'unica formulazione nelle note; «can
  only be drawn once» e' accettata ma non compare), `dayLimit` 1 alle gratuite che non avevano limiti (B0220, B0274,
  B0417, B0437, B0497, B0521 e i cinque «[WJE] Monday Only Free Deal!»). `limitText`: «once», «N times in total».
- **C. Lista nello slot giusto**: `guarantee.slot` = indice del primo slot della stella successiva del mix quando il
  testo, prima della lista, garantisce una stella esplicita che non e' una lista (B0306-B0308, B0355: slot 1, il 6★).
  `rollDraw` e `slotOdds` usano gli slot da `slot` a `slot + count - 1`; la pity resta sullo slot 0. Il limite di Tier
  dello slot 7★ non e' applicato (sotto-progetto 2b, [garanzie](#garanzie)).
- **D.** Se `guarantee.list` non e' vuota ma `listNames` si', o c'e' una pity e `featuredNames` e' vuota, dettagli e
  Draw Odds aggiungono «This guarantee is not reproduced yet.».
- **E. Notices** (Differences): limiti di Tier non applicati; Trait, boosted, Special Attack rinforzati e skill al
  massimo sostituiti da una medaglia normale della stessa rarita'; le gratuite «una volta» o «una al giorno» tengono il
  limite.
- Master: 23 commenti cambiati (i limiti nuovi nella striscia) -> BASE 120 negli script di sessione.

**Prove al banco (17-10, revisione 120, nessun crash).** Copia del salvataggio in
`D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-sp2-final`; a server fermo `freeStone` 360 -> 20000, alla fine
riportato a 360 dalla copia (`limitedDrawTicket1` 0, invariato). Il primo relogin con la 120 ha scaricato i master
(`GET /master/drawMedalType`) senza crash. Screenshot in `D:\Progetto_Restauro_KH_UX\screenshots\`:

| Prova | Esito | Screenshot |
|---|---|---|
| 1 B0306 x10 (`-GachaShow B0306`) | OK: Details con la lista su «Medal 2» (6★ 97%, 7★ 3%), Medal 1 7★ 100%; log `[gacha]`: slot 0 SP Roxas 7★, slot 1 **HD Zexion 6★** (della lista), otto 5★; stelle contate nel risultato: 7, 6 e otto da 5; jewel -3000 | sp2f_f1_details, sp2f_f1_details2, sp2f_f1_confirm, sp2f_f1_anim2, sp2f_f1_back |
| 2 B0054 Epic Medal Carnival 2016 | OK: «Featured Medal guaranteed within 10 draws (original).» senza «not reproduced» (vetrina = Illustrated Sephiroth); x10 senza crash (tre 5★, sette 4★) | sp2f_f2_shop, sp2f_f2_details..3, sp2f_f2_result2 |
| 3 B0604 e B0511 gratuite «Available once» | OK: piastre a 1 Jewel con «Chances left today: 1» (il client scrive «today» anche per `totalLimit`); dopo l'estrazione piastra grigia, striscia «... - once», un secondo tocco non manda richieste e non cambia i jewel. B0604: slot 0 Supernova - KH III Zeus 7★ (della lista) | sp2f_f3_shop, sp2f_f3_result, sp2f_f3_back, sp2f_f3_tap2, sp2f_f3b_confirm, sp2f_f3b_result, sp2f_f3b_tap2 |
| 4 «not reproduced» + Notices | OK: B0663 Ticket Draw x10 «Featured Medal guaranteed within 3 draws (original). This guarantee is not reproduced yet.»; Differences con le tre righe nuove (Tier, Trait/boosted/SA/skill, gratuite una volta) | sp2f_f4_details2, sp2f_notice_diff2, sp2f_notice_diff3 |

- Dopo la correzione A nessun banner estraibile ha piu' `guarantee.list` con `listNames` vuoto alla sua data: la
  frase compare solo per la pity con vetrina vuota (25 banner, es. B0663, B0023, B0280, i Ticket/Cookies Deal).
- Restano nel salvataggio le 40 medaglie estratte e i contatori `player.gacha.count` (10511 e 10604 a 1: con
  `-GachaShow` quelle piastre restano grigie).
- Stato finale: server normale rev 120 senza `-GachaShow`, home raggiunta (`sp2f_end_home2`). Dubbi in I-145.

<a id="garanzie"></a>
## Garanzie dei banner: audit e modello slot per slot (sotto-progetto 2b, I-144)

Audit del 17-10 in sola lettura (script e dati intermedi in `D:\Progetto_Restauro_KH_UX\tmp\gaudit\`): 734 banner
estraibili, 701 con una garanzia o una vetrina. Il server di oggi mette `guarantee.list` in `count` slot da
`guarantee.slot` (di solito 0, la stella piu' alta), sceglie per nome e poi la variante alla stella dello slot; la pity
sostituisce lo slot 0 con tutta la vetrina; Tier, Trait, Special Attack rinforzati, boosted e skill non sono letti.

Schemi dell'originale (dai testi e dalle immagini dei banner) e confronto col server:

- **coincidono**: solo vetrina senza garanzia (97 banner); lista sulla stella piu' alta con slot sufficienti (213);
  pity sulla vetrina allo slot 0 (251 dei 386 con pity); «ogni N estrazioni» gia' codificato (B0742, B0765);
- **171 banner con discrepanze riproducibili, in 12 classi** (un banner puo' stare in piu' classi): D1 lista sulla
  stella sbagliata (4, corretta con `guarantee.slot`); D2 lista piu' una medaglia nominata sulla stessa stella (2: B0241,
  B0354); D3 due liste nello stesso banner (3: B0629, B0740, B0750); D4 numero di slot della lista diverso
  dall'immagine (1: B0678); D5 lista nel testo ma non nel catalogo (9: B0049, B0055, B0372, B0695, B0721, B0725, B0726,
  B0734, B0739); D6 lista vuota alla data (2: B0230, B0246, corrette in A); D7 medaglia nominata singola non codificata
  (42); D8 pity spenta (37: 14 per le date, corretti in A salvo B0280/B0303, 8 per stella fuori dal mix, 15 con un
  bersaglio che non e' una medaglia d'attacco); D9 pity a una stella diversa dallo slot 0 (11); D10 pity su un
  sottoinsieme della vetrina (28); D11 pity che ruba uno slot a lista (29); D13 notice ufficiali «ogni N-esima
  estrazione» resi come pity (31);
- **178 banner con un limite di Tier** (D12), riproducibile: `medal.json.guiltValue` e' il Tier (verificato sulle 24
  medaglie 7★ della riserva di B0306, tutte Tier 4);
- **boosted (40), da studiare**: «with 1000 more base strength and defense». Correzione dell'utente (17-10): il +1000
  era **in piu'** del potenziamento con Chip/Dale, che restava tutto disponibile. Quindi NON e' la medaglia al tetto di
  `attackUpperNumber`/`defenseUpperNumber` (tetto `addMaxAttack`/`addMaxDefense` del master, `server/medal-guilt.js`):
  serve un altro modo di alzare la base di +1000 lasciando libero Chip/Dale (campo della medaglia del giocatore da
  cercare nel decompilato, oppure medaglie distinte nel master: verificare). Manca anche la probabilita' («small
  chance» nelle note);
- **non riproducibili**: Trait Medal (89), Special Attack rinforzato (104), skill al massimo (62), Imitation (3), Epic e
  set del 2016 (17 + 17): scritti nelle Notices.

Proposta di campi (retro-compatibile: `guarantee.list/count/slot` restano la prima riserva a lista):

- `guarantee.slots[]`: riserve nell'ordine del testo, `{kind: list|tier|trait, slot, count, star, names, tierMin,
  tierMax}` (`trait` = slot riservato che il server tratta come generico);
- `pityNames` (default `pool.featured`), `pityStar`, `pitySlot`, `pityMode` (`reset` come oggi o `every`);
- Tier come quarto campo di `medals[n].ids` (`[id, rarita', data, tier]`) da `guiltValue`;
- slot assegnati in modo deterministico: le riserve con stella prendono i primi slot liberi di quella stella, le altre
  i primi liberi dall'alto; override manuale per i casi visti solo nelle immagini (B0678, B0740, B0733, i D5).

Domande aperte per l'utente (prima della spec del 2b): (1) slot 6★ delle liste «KH III Medal+» con SN/SN+ che esistono
solo a 7★ (circa 100 banner del 2019-20): lasciare il 7★ o limitare ai nomi con variante 6★; (2) B0733: dividere la
lista in due (3 SN+/SN++ e 7 KH III) come nell'immagine; (3) i 31 banner D13: «ogni N-esima» come i notice o pity come
la wiki; (4) B0419/B0421 (scambio Gula/Aced dichiarato come errore dal notice): riprodurre l'errore o la versione
corretta; (5) B0319, B0402, B0403, B0412 (pity a 6★ con slot 0 a 7★): quale slot sostituisce la pity.

Decisioni dell'utente gia' prese per il 2b (17-10): medaglie boosted riprodotte come sopra; data d'inizio di
B0199-B0203 (deal delle HD [EX], novembre 2017) corretta al **24/11/2017** con un override dal notice, al posto della
regola allargata di `align_debut_dates` («primo banner estraibile che le nomina»).

Il report completo dell'audit (tabelle per schema, regole di estrazione, esiti attesi) e' fuori dal repo:
`D:\Progetto_Restauro_KH_UX\tmp\sp2\audit-guarantees.md`.

