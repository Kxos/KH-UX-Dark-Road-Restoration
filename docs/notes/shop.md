# Shop > Draw: estrazioni delle medaglie

Sotto-progetto 1 delle estrazioni (16-10-2026): piastra «Banner Catalog» + tre banner originali del primo anno
(DAILY DEAL!, SMALL DEAL!, Epic Medal Carnival) pagati in jewel, banner di prova a biglietti (Platinum Ticket Draw,
solo con `KHUX_GACHA_TEST=1`, sostituito nel sotto-progetto 2 da `KHUX_GACHA_SHOW`). Sotto-progetto 2 (17-10):
elenco dei banner originali, [sotto](#sp2). Codice: `server/gacha-data.js` (funzioni pure), `server/gacha.js` (lista, controlli,
pagamento, pagine web), `server/make-banners.js` (generatore -> `server/game_data/gacha_banners.json`,
`server/master_data/drawMedalType.json`, immagini in `server/game_data/gacha_img`), rotte in `server/server.js`.
Prove: `node server/test-gacha.js`, `node server/test-gacha-server.js`. Piano e spec:
`docs/superpowers/plans/2026-10-16-shop-estrazioni.md`.

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
  `drawMedalType.json` = revisione del master (BASE 118 dal 16-10, 119 dal 17-10 con il catalogo dei banner).
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
  i pool escludono le medaglie darklight 3). `KHUX_GACHA_SIZES = "1,2,3,4,5,6,7,8,9,10"` in `run-server.ps1`.

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
(gradini), `lotCount`, `rarityMix`, `dayLimit`, `vipFree`, `pool` (`mode` sets/inherit/released/list/evolve,
`filter`), `guarantee` (lista, pity, every), `skill`, `bonus`, `catalogOnly`. Estensioni del contratto (std, alias,
filter, dayLimit 5/10, skill 72415 dal 20/12/2020): `.superpowers` del piano, riassunte qui. **Estraibile solo con
`catalogOnly === null`** (mai guardare `flags`).

Al 17-10: tipi SN 213, FEATURED 168, FALLING 129, SKILL 69, DAILY 64, SEVEN 48, FREE 36, STANDARD 23, T_TICKET 21,
ITEM 20, T_POINTS 7, BEGINNER 5, T_EVOLVE 5; `catalogOnly` VIP_TWIN 39, INCOMPLETE 24 (I-139), DRAW_POINTS 7,
PVP_TICKETS 4, piu' NO_MEDALS 2 messi dal server (B0370/B0418 Blue Fairy Deal, I-142). 17 Free Deal VIP.

### Comandi, nell'ordine

```powershell
python recon/tools/make_banner_catalog.py              # gacha_catalog.json
python recon/tools/make_banner_images.py --mode palette # 808 immagini 640x140 in server/game_data/gacha_img (31,5 MB)
node server/make-banners.js                            # master drawMedalType.json (809 righe) -> alzare la revisione
.\tools\ldplayer\session\relogin.ps1 -Tag x            # revisione 119 (default degli script dal 17-10)
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
- Limiti: `dayLimit` per banner, una sola Free Deal VIP gratuita al giorno fra tutte (`player.gacha.used.vipFree`).
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
- **Prova 1: FALLITA, I-138.** Shop > Draw: «A server error has occurred. (200 ERROR :75)» (`sp2_t9_shop1`). Le
  piastre dei banner del catalogo non hanno `sortId`. Con una patch temporanea del sortId (tolta subito, non
  committata) lo Shop si apre con Catalog + DAILY DEAL! + Daily Deal! + Get a 3★-5★ Medal! + la quarta piastra
  (B0001-B0004, come `shopBanners` calcolato sul salvataggio) e immagini giuste dalla cache svuotata
  (`sp2_diag_sortid`, `sp2_diag_sortid_scroll`).
- Prove 2-7 e le dieci aperture dello Shop: **non fatte**, ferme su I-138.
- **Correzione di I-138 (17-10, da provare al banco).** `FUN_0079541c` legge `sortId` della lista a +0xc;
  `FUN_00a19c84` mette gli elementi in una mappa `sortId -> (drawMedalTypeId -> piastra)` e numera le piastre
  visitandola: ordine per sortId crescente, a parita' per drawMedalTypeId. Il sortId del master (riga +8) li' non
  si legge. `gachaListData` manda Catalog 1, poi 10, 20, ... nell'ordine di `shopBanners`; master invariato.

