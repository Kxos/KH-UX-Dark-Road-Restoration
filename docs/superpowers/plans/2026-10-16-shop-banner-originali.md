# Shop, sotto-progetto 2: elenco dei banner originali — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** i 808 banner originali (813 meno Blind Box e tutorial) sono descritti da un catalogo generato con tipo, prezzi, valuta, date, quest di sblocco, pool per epoca e garanzie; il server li estrae con le probabilita' ricostruite della spec 9.2, il catalogo WebView li mostra tutti, e lo Shop mostra una lista provvisoria (banner sbloccati e attivi alla data del punto nella storia) finche' il sotto-progetto 3 non porta rotazione e filtri.

**Architecture:** due script Python nel repo (`recon/tools/banner_sources.py`, `recon/tools/make_banner_catalog.py`, portati dagli script di ricerca in `D:\Progetto_Restauro_KH_UX\tmp\sp2\scripts`) leggono wiki, TSV dei banner, notice e `medal.json` e scrivono `server/game_data/gacha_catalog.json`: per ogni banner una **ricetta** del pool (sotto-set, nomi, modalita'), piu' le tabelle dei sotto-set e delle medaglie con la data di ogni rarita'. Un terzo script (`recon/tools/make_banner_images.py`) scrive le immagini 640x140. Il server espande le ricette alla data giusta (`server/gacha-data.js`), applica prezzi, valute, limiti e garanzie (`server/gacha.js`) e scrive il master `drawMedalType` con `server/make-banners.js`.

**Tech Stack:** Node (server, nessuna dipendenza esterna), Python 3 + Pillow (`recon/tools`), PowerShell (banco LDPlayer).

**Spec:** `docs/superpowers/specs/2026-10-16-shop-banner-design.md`, sezione 9 (decisioni del sotto-progetto 2, approvate il 16-10) e sezioni 3, 4.4, 4.8, 6 punto 2. Ricerca e dati di appoggio: `D:\Progetto_Restauro_KH_UX\tmp\sp2\research.md` (+ `banners_sp2.tsv/.json`, `subsets.json`, `medal_release.json`, `ends.tsv`, `incomplete.tsv`, `images.tsv`, `stats.json`, script in `scripts\`). Sotto-progetto 1: `docs/superpowers/plans/2026-10-16-shop-estrazioni.md`, `docs/notes/shop.md`.

## Global Constraints

- APK originale non modificato: si cambiano solo risposte del server, tabelle master, risorse scaricabili e pagine WebView.
- Repo: solo codice e documentazione originali. Mai APK, asset, master data, immagini, testi della wiki o dei notice nel repo: `server/master_data/`, `server/game_data/`, `server/save/` sono ignorati da git. Nel repo solo gli script e `recon/tools/banner_overrides.tsv` (dati scritti da noi: numeri letti dai notice, con la fonte).
- Git: sempre `git -c safe.directory=*`; messaggio in un file UTF-8 senza BOM in `D:\Progetto_Restauro_KH_UX\tmp\msg_*.txt` scritto col tool Write, poi `git commit -F <file>`; `git pull --rebase` prima di `git push`; messaggi in italiano che finiscono con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; mai `git add -A` (file per nome; `.claude/` non e' tracciata). Commit e push a ogni task verificato.
- Shell degli agenti: heredoc ed echo trasformano `\t` e `\f` in byte di controllo. Scrivere i file con Edit/Write e dopo ogni modifica controllare che non ci siano byte di controllo diversi da `\n` (e `\t` solo nei TSV): `python -c "import sys;d=open(sys.argv[1],'rb').read();print([i for i,b in enumerate(d) if b<32 and b not in (9,10,13)][:5])" <file>`.
- Codice e commenti in italiano, nello stile dei file vicini. Testi mostrati al giocatore in inglese.
- Test: script autonomi (`node server/test-<nome>.js`, `python recon/tools/test_<nome>.py`) che stampano `OK: ...` o `ERRORI (n)` ed escono con 1; mai il salvataggio vero (`KHUX_SAVE` in una cartella temporanea).
- Piastre: mai `price` 0, mai `benefitId` != 0, mai payType 3 ne' 9 nella lista. Jewel = payType 1. payType 4/5/6 (Bronze/Silver/Gold, PvP) solo nel catalogo (spec 9.6). La piastra Catalog resta payType 6, id 9001.
- Risposta di `/gacha/draw`: `effectNumbers` solo 0; `gachaBonus` sempre `{addType: 1, number: 0, userMedalIds: []}`; ogni id di `userMedalIds` deve comparire in `userMedals` della risposta; al massimo 10 medaglie.
- Rarita' e medaglie solo se uscite entro la data di riferimento del banner (spec 9.3): niente 6★ estraibili prima del 15/07/2016, niente 7★ prima del 25/05/2018. Nessuna eccezione per i banner gratuiti o VIP (spec 9.5, richiesta dell'utente).
- Ogni differenza dall'originale va spiegata nelle Notices in gioco, in inglese.
- Banco: tocchi solo a gioco vivo (`AppAlive`); SKIP nei dialoghi; copia del salvataggio prima delle prove; file pesanti in `D:\Progetto_Restauro_KH_UX\tmp`; un solo processo Ghidra alla volta.

## Review Focus

1. Banner permanente (DAILY DEAL!, SMALL DEAL!) per un giocatore all'inizio della storia: il pool contiene solo medaglie uscite entro la data del suo punto nella storia, mai medaglie di set successivi (test nel Task 5).
2. Free Deal VIP e banner gratuiti: costano 1 Jewel, una sola estrazione gratuita VIP al giorno fra tutte, e il pool rispetta la data del banner come gli altri (test nel Task 6).
3. Banner con prezzo calante o prima estrazione gratuita: il prezzo della lista e quello scalato coincidono dopo ogni estrazione (contatore salvato in `player.gacha.count`; test nel Task 6).
4. Valute del payType 8: la lista non mostra mai insieme due banner di valute diverse e `limitedDrawTicket2` riporta la valuta elencata; un vecchio salvataggio con `limitedDrawTicket2` non perde biglietti (test nei Task 6 e 8).
5. Medaglie impilabili (Dual Meow Wow del Platinum Ticket Draw): l'id restituito e' quello della cella che il client vede, presente in `userMedals` (test nel Task 8).

---

## File

| File | Stato | Responsabilita' |
|---|---|---|
| `recon/tools/banner_sources.py` | nuovo | sotto-set datati, medaglie per set, data di ogni rarita', note complete delle righe Shop della wiki |
| `recon/tools/make_banner_catalog.py` | nuovo | ricette dei banner: tipo, flag, valuta, prezzi, date, sblocco, pool, garanzie, abilita', motivi «solo catalogo»; scrive `server/game_data/gacha_catalog.json` |
| `recon/tools/banner_overrides.tsv` | nuovo | prezzi/dimensioni/date letti dai notice per le righe incomplete (dati nostri, con la fonte) |
| `recon/tools/make_banner_images.py` | nuovo | immagini 640x140 (PNG a palette o a colori pieni) in `server/game_data/gacha_img/` |
| `recon/tools/test_banner_sources.py`, `test_make_banner_catalog.py`, `test_make_banner_images.py` | nuovi | prove offline |
| `server/gacha-data.js` | modifica | catalogo, data del punto nella storia, espansione dei pool, probabilita' 9.2, estrazione, abilita' |
| `server/make-banners.js` | riscritto | master `drawMedalType` (piastra Catalog + 808 banner) dal catalogo |
| `server/gacha.js` | modifica | lista provvisoria, prezzi dinamici, valute, limiti giornalieri e VIP, pity, pagine WebView |
| `server/server.js` | modifica | caricamento del catalogo, migrazione dei biglietti, celle impilabili, abilita' estratte, `KHUX_GACHA_SHOW` |
| `server/routes-info-album.js` | modifica | Notices |
| `server/test-gacha-data.js`, `test-make-banners.js`, `test-gacha.js`, `test-gacha-server.js` | modifica | prove offline |
| `tools/ldplayer/session/run-server.ps1`, `relogin.ps1`, `cycle.ps1`, `update-resources.ps1` | modifica | revisione 119, `-GachaShow` al posto di `-GachaTest` |
| `docs/notes/shop.md`, `docs/ISSUES.md`, `HANDOFF.md`, `docs/notes/server.md` | modifica | stato |

## Formato di `server/game_data/gacha_catalog.json` (contratto fra Python e Node)

```json
{
  "version": 2,
  "firstRarity": {"3": "2016-04-07", "4": "2016-04-07", "5": "2016-04-07", "6": "2016-07-15", "7": "2018-05-25"},
  "story": [[1, 200, "2016-04-07"], [201, 250, "2016-04-21"]],
  "subsets": {"1.1": {"date": "2016-04-07", "names": ["kairi", "sora"]}},
  "medals": {"sora": {"date": "2016-04-07", "cls": "", "class2": "Attack", "ids": [[1001, 3, "2016-04-07"], [1002, 4, "2016-04-07"]]}},
  "banners": [{
    "rowId": "B0001", "drawMedalTypeId": 10001, "name": "DAILY DEAL!", "type": "DAILY",
    "flags": ["DAY_LIMITED", "PERMANENT"], "start": "2016-04-07", "end": "2018-01-31", "endSource": "original",
    "unlockQuest": 200, "payType": 1, "currency": "jewel", "prices": [600], "lotCount": 3,
    "rarityMix": [[4, 1], [3, 2]], "epicBoost": false, "dayLimit": 1, "vipFree": false,
    "pool": {"mode": "released", "sets": [], "names": [], "featured": [], "inheritAfter": null, "evolve": null},
    "guarantee": {"list": [], "count": 0, "pity": null, "every": null},
    "skill": null, "bonus": [], "catalogOnly": null, "image": "Shop_-_DAILY_DEAL!_banner_KHUX.png", "imageFrom": "B0001",
    "notes": "...", "guaranteesText": "", "notesSource": "wiki"
  }]
}
```

- Nomi delle medaglie sempre **normalizzati** (`norm`: spazi unificati, minuscolo, `\u00a0` -> spazio).
- `medals[n].ids`: solo righe di `medal.json` con `type === 1` e `validPack !== 1`; terzo campo = data della variante (`rare_date` della ricerca, mai prima di `date`).
- `pool.mode`: `sets` (note «Draws from sets»), `list` (note «Draws from the following medals»), `inherit` (ultimo banner documentato + uscite dopo `inheritAfter`), `released` (tutte le medaglie standard uscite entro la data), `evolve` (`evolve: [[medalId, livello], ...]`, ids espliciti anche impilabili).
- `currency`: `jewel`, `platinum`, `draw`, `holiday`, `spooky`, `moogle`, `bronze`, `silver`, `gold`, `points`.
- `catalogOnly`: `null`, `INCOMPLETE`, `PVP_TICKETS`, `DRAW_POINTS`, `VIP_TWIN`.
- `skill`: `null`, `{"table": "50106", "slots": "first"}` (SKILL), `{"table": "72415", "slots": "all"}` (SN, SEVEN).
- `bonus`: oggetti regalati a ogni estrazione (note «Includes N bonus ...», spec 9.2): `[[resourceType, id, numero], ...]` con 3 = medaglia (Magic Mirror 90156, Magic Broom 300948, ...) e 5 = materiale (Power Gem 48, Speed Gem 49, Magic Gem 50, ...); vanno nel Present Box.
- `end`: `null` solo se l'originale non ha fine e nessuna regola la ricostruisce (nessun caso atteso dopo il Task 3).

---

### Task 1: prova al banco del PNG a palette

Modello consigliato: Opus (banco).

**Files:** nessun file del repo. Solo `server/game_data/gacha_img/10001.png` (fuori da git).

**Interfaces:**
- Produces: la decisione «palette» o «full» per `make_banner_images.py` (Task 4), scritta nel registro dell'esecuzione e in `docs/notes/shop.md` al Task 9.

- [ ] **Step 1: Copia e conversione**

Copiare `server\save` in `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-sp2`. Copiare `server\game_data\gacha_img\10001.png` in `D:\Progetto_Restauro_KH_UX\tmp\sp2\10001_full.png`, poi:

```bash
python -c "from PIL import Image;im=Image.open('D:/Progetto_Restauro_KH_UX/tmp/sp2/10001_full.png').convert('RGB');im.quantize(256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.FLOYDSTEINBERG).save('server/game_data/gacha_img/10001.png',optimize=True)"
```

Expected: il file nuovo e' circa un quarto del vecchio; `python -c "from PIL import Image;print(Image.open('server/game_data/gacha_img/10001.png').mode)"` stampa `P`.

- [ ] **Step 2: Banco**

Server con `tools\ldplayer\session\relogin.ps1 -Tag pal` (revisione 118). Con `. .\tools\ldplayer\bench_lib.ps1`: Shop > Draw, screenshot `Shot sp2_palette`. Expected: il banner Daily Deal si vede come prima, senza strisce o immagine vuota; nessun crash.

- [ ] **Step 3: Esito**

Se l'immagine e' corretta: decisione «palette». Se manca o e' rovinata: decisione «full» (PNG a colori pieni, ~129 MB). Rimettere comunque `10001_full.png` al suo posto. Nessun commit (nessun file del repo cambia): annotare l'esito nel registro dell'esecuzione.

---

### Task 2: `recon/tools/banner_sources.py` (sotto-set, date delle medaglie, note complete)

Modello consigliato: Sonnet.

**Files:**
- Create: `recon/tools/banner_sources.py`
- Create: `recon/tools/test_banner_sources.py`

**Interfaces:**
- Consumes: `D:\Progetto_Restauro_KH_UX\tmp\sp2\scripts\common.py`, `sets.py`, `medals.py`, `wikishop.py` (codice di ricerca da portare).
- Produces (usate dal Task 3):
  - `norm(s) -> str`
  - `infomedals(wiki: dict) -> list[dict]`
  - `english_subsets(wiki) -> {'subsets': [...], 'extras': [...], 'nasets': {...}}` (stesso formato di `subsets.json`)
  - `medal_release(subsets: dict, wiki: dict, medal_rows: list, banner_rows: list) -> list[dict]` (stesso formato di `medal_release.json`: `name, set, subset, date, date_src, cls, class1, class2, nano, rows, rare_date`)
  - `wiki_shop_rows(wiki) -> list[dict]` (stesso formato di `wiki_shop_rows.json`)

- [ ] **Step 1: Test che fallisce**

`recon/tools/test_banner_sources.py`, nello stile di `test_import_jp_raisedraw.py` (lista `errori`, `check`, «OK»/«ERRORI»). Wiki sintetica:

```python
WIKI = {
    'Category:English Set 1': "Set 1 was released in April 2016.\n"
        "*'''Medal Set 1.2''' was released on April 21 and consists of [[Alice]] and [[Hades|Hades]].\n"
        "*[[Moogle Medal]] was distributed on May 2.\n",
    'Category:English Set 2': "Set 2 was released in May 2016.\n"
        "*'''Medal Set 2.1''' was released on May 13 and consists of {{KA|1}} and [[Sephiroth]].\n",
    'Template:NASets': "! colspan=2 |Medal Set 1 (Apr. 2016)\n|[[Sora|Sora]] [[Alice|Alice]]<sup>SR</sup> [[Hades|Hades]]\n"
        "! colspan=2 |Medal Set 2 (May 2016)\n|[[Key Art 1|Key Art #1]] [[Sephiroth|Sephiroth]]\n",
    'Sora': "{{InfoMedal\n|name=Sora\n|class1=\n|class2=Attack\n|nano3=10\n|nano4=11\n|nano7=1500\n}}",
    'Sephiroth': "{{InfoMedal\n|name=Sephiroth\n|class2=Attack\n|nano5=200\n}}",
}
```

Per i cicli 1-59 di `english_subsets`, le pagine mancanti valgono testo vuoto e vanno saltate (la ricerca le aveva tutte: aggiungere `if not hm: continue`). Controlli:
- `english_subsets(WIKI)['subsets']` contiene `{'set': 1, 'id': '1.2', 'date': '2016-04-21', 'members': ['Alice', 'Hades'], ...}` e `{'set': 2, 'id': '2.1', 'date': '2016-05-13', 'members': ['Key Art #1', 'Sephiroth'], ...}`;
- `extras` contiene la Moogle Medal con data `2016-05-02`;
- `nasets['1']['medals']` (chiave stringa come nel JSON) ha Alice con `cls` `SR`;
- `medal_release(...)` con `medal_rows = [{'medalId': 1001, 'name': 'Sora', 'rare': 3, 'type': 1, 'validPack': 0, 'darklight': 1}, {'medalId': 301001, 'name': 'Sora', 'rare': 7, 'type': 1, 'validPack': 0, 'darklight': 1}]` e `banner_rows = []`: Sora ha `subset` `1.1`, `date` `2016-04-07`, `rows` con entrambe le righe;
- `norm('Hades\u00a0 A')` == `'hades a'`.

Il test richiama le funzioni con i dati in memoria (nessun file).

- [ ] **Step 2: Verificare che fallisca**

Run: `python recon/tools/test_banner_sources.py`
Expected: ImportError (`banner_sources` non esiste).

- [ ] **Step 3: Implementazione (port)**

Creare `recon/tools/banner_sources.py` copiando le funzioni degli script di ricerca, con questi cambi e nient'altro:
- intestazione: commento sullo scopo (fonti: khuxwiki Category:English Set 1-59, Template:NASets, InfoMedal; righe Shop/2016-2020) e sul fatto che i dati letti restano fuori dal repo;
- da `common.py`: solo `infomedals`; niente percorsi assoluti: le funzioni ricevono i dati come argomenti;
- da `sets.py`: `toks` e il corpo di `main` diventano `english_subsets(wiki)` che **restituisce** il dizionario (niente `json.dump`, niente print), con `if not hm: continue` per le pagine assenti; chiavi di `nasets` come stringhe (`str(n)`);
- da `medals.py`: `norm` e il corpo di `main` diventano `medal_release(subsets, wiki, medal_rows, banner_rows)` che restituisce `out` (niente file); il dizionario `MONABBR` resta locale;
- da `wikishop.py`: `norm_img` e `wiki_shop_rows(wiki)` che restituisce la lista;
- in fondo `if __name__ == '__main__':` che, dato `--wiki`, `--medals`, `--banners` e `--out DIR`, scrive i tre JSON in `DIR` (stessi nomi dei file di ricerca), per confronto manuale.

- [ ] **Step 4: Test e confronto con la ricerca**

Run: `python recon/tools/test_banner_sources.py` -> `OK`.
Run: `python recon/tools/banner_sources.py --wiki D:/Progetto_Restauro_KH_UX/wiki/wiki_all.json --medals server/master_data/medal.json --banners D:/Progetto_Restauro_KH_UX/reference/banners/banners_ww.tsv --out D:/Progetto_Restauro_KH_UX/tmp/sp2/port`
Expected: i tre file in `tmp\sp2\port` sono uguali a quelli di `tmp\sp2` (`python -c` che carica le coppie e confronta con `==`); 248 sotto-set, 816 medaglie, 795 con righe.

- [ ] **Step 5: Commit**

```bash
git -c safe.directory=* add recon/tools/banner_sources.py recon/tools/test_banner_sources.py
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_sp2_t2.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 3: `recon/tools/make_banner_catalog.py` (ricette dei banner)

Modello consigliato: Opus (molte regole, riscontro con i numeri della ricerca).

**Files:**
- Create: `recon/tools/make_banner_catalog.py`
- Create: `recon/tools/banner_overrides.tsv` (solo intestazione in questo task)
- Create: `recon/tools/test_make_banner_catalog.py`

**Interfaces:**
- Consumes: `banner_sources` (Task 2); `D:\Progetto_Restauro_KH_UX\tmp\sp2\scripts\analyze.py` e `incomplete.py` (codice da portare).
- Produces: `server/game_data/gacha_catalog.json` nel formato del contratto sopra; funzioni pubbliche usate dai test: `classify(row, notes)`, `parse_price(p)`, `currency_of(row, typ)`, `end_of(row, typ, rows, notices)`, `unlock_quest(start, story)`, `pool_recipe(row, notes, typ, docs, sub_members)`, `guarantee_of(row, notes)`, `day_limit(notes, typ)`, `vip_twins(rows)`, `bonus_of(notes, medal_rows, material_rows)`, `build_catalog(inputs) -> dict`.

- [ ] **Step 1: Test che fallisce**

`recon/tools/test_make_banner_catalog.py` con righe sintetiche (dizionari con le colonne di `banners_ww.tsv`: `row_id, name, start_pt, end_pt, status, currency, price, draw_size, rarity_mix, featured_medals, guarantees, notes, image_file, image_size, seasonal, event_tie_in, source_url, confidence`). Controlli:

```python
R = lambda **k: {**{c: '' for c in COLS}, **k}
check(m.classify(R(name='Spirit Blind Box'), '') == 'X_BLINDBOX', 'blind box')
check(m.classify(R(name='Platinum Ticket Draw', currency='Platinum Ticket'), '') == 'T_EVOLVE', 'evolve')
check(m.classify(R(name='Spooky Cookies Deal', currency='Spooky Cookie'), '') == 'T_TICKET', 'spooky')
check(m.classify(R(name='Free Deal (VIP)', currency='Free, VIP only'), '') == 'FREE', 'free vip')
check(m.classify(R(name='Supernova - Sephiroth'), '') == 'SN', 'sn')
check(m.classify(R(name='DAILY DEAL!'), '') == 'DAILY', 'daily')
check(m.parse_price('1st: Free, 2nd+: 3000') == [0, 3000], 'first free')
check(m.parse_price('1900, 3000, 2500, 2200') == [3000, 2500, 2200, 1900], 'scalini')
check(m.parse_price('VIP Only Free') == [0], 'gratis')
check(m.currency_of(R(currency='Spooky Cookie'), 'T_TICKET') == (8, 'spooky'), 'valuta spooky')
check(m.currency_of(R(currency='Holiday Draw Ticket'), 'T_TICKET') == (8, 'holiday'), 'valuta holiday')
check(m.currency_of(R(currency='Free, VIP only'), 'FREE') == (1, 'jewel'), 'gratis in jewel')
check(m.currency_of(R(currency='Gold Ticket'), 'T_EVOLVE') == (6, 'gold'), 'gold')
STORY = [[1, 200, '2016-04-07'], [201, 250, '2016-04-21'], [251, 300, '2016-05-12']]
check(m.unlock_quest('2016-04-20', STORY) == 200 and m.unlock_quest('2016-05-12', STORY) == 300, 'sblocco')
check(m.day_limit('You may draw ONCE per day', 'FEATURED') == 1 and m.day_limit('Top-Drawer 3 times per day', 'DAILY') == 3, 'limite giornaliero')
g = m.guarantee_of(R(guarantees='If bought 10 times, at least one Illustrated Cloud is guaranteed'), '')
check(g == {'list': [], 'count': 0, 'pity': 10, 'every': None, 'featured': ['illustrated cloud']}, f'pity {g}')
g = m.guarantee_of(R(), 'Guarantees three of the following Medals: SN++ - Fiend, Key Art #22. *Draws')
check(g['list'] == ['sn++ - fiend', 'key art #22'] and g['count'] == 3, f'lista {g}')
g = m.guarantee_of(R(), 'You are guaranteed to get one of the following Medals every 3rd draw! [[SN++ - Xemnas B]]')
check(g['every'] == 3, 'every 3rd')
twins = m.vip_twins([R(row_id='B1', name='Supernova Deal', start_pt='2019-03-01', currency='Jewels'),
                     R(row_id='B2', name='Supernova Deal (VIP)', start_pt='2019-03-01', currency='Jewels, VIP only'),
                     R(row_id='B3', name='Free Deal (VIP)', start_pt='2020-05-01', currency='Free, VIP only')])
check(twins == {'B2'}, f'gemelli VIP {twins}')
```

`guarantee_of` restituisce anche `featured` (nomi normalizzati della frase «If bought N times ... X»; per «within N draws» `pity = N` e `featured` = medaglie in vetrina della riga). Il test di integrazione (ultimo controllo) gira solo se esistono i file veri:

```python
if os.path.exists(WIKI) and os.path.exists(TSV):
    cat = m.build_catalog(m.default_inputs())
    bs = cat['banners']
    check(len(bs) == 808, f'banner {len(bs)}')
    from collections import Counter
    t = Counter(b['type'] for b in bs)
    check(t == Counter({'SN': 213, 'FEATURED': 168, 'FALLING': 129, 'SKILL': 69, 'DAILY': 64, 'SEVEN': 48, 'FREE': 36,
                        'STANDARD': 23, 'T_TICKET': 21, 'ITEM': 20, 'T_POINTS': 7, 'BEGINNER': 5, 'T_EVOLVE': 5}), f'tipi {t}')
    check(sum(1 for b in bs if b['unlockQuest'] <= 525) == 78, 'sbloccati a 525')
    check(sum(1 for b in bs if b['catalogOnly'] == 'VIP_TWIN') == 41, 'gemelli VIP')
    check(all(b['end'] for b in bs), 'tutte le date di fine')
    b11 = next(b for b in bs if b['rowId'] == 'B0011')
    check(b11['pool']['sets'] == ['1.1', '1.2', '1.3', '2.1'] and b11['epicBoost'], 'B0011 senza 2.2 e Epic')
```

- [ ] **Step 2: Verificare che fallisca**

Run: `python recon/tools/test_make_banner_catalog.py`
Expected: ImportError.

- [ ] **Step 3: Implementazione (port di `analyze.py` + regole della spec 9)**

`make_banner_catalog.py` porta da `analyze.py` `full_notes`, `classify`, `parse_price`, `series_key`, `notice_end`, `end_of`, `unlock_quest`, `setrefs`, `names_listed` e la parte del pool di `main`, senza variabili globali (i dati passano come argomenti). Cambi rispetto alla ricerca:

1. **Ingressi** (`default_inputs()`): `KHUX_WIKI_JSON` (default `D:/Progetto_Restauro_KH_UX/wiki/wiki_all.json`), `KHUX_BANNERS_TSV` (`.../reference/banners/banners_ww.tsv`), `KHUX_STORY_TSV` (`.../reference/story/story_release_ww.tsv`), `KHUX_NOTICES_JSON` (`.../reference/banners/notices.json`: copiarlo una volta da `D:\Progetto_Restauro_KH_UX\tmp\banners\notices.json`, perche' `tmp` non e' durevole), `server/master_data/medal.json`, `server/master_data/material.json`, `recon/tools/banner_overrides.tsv`. Percorsi di default calcolati dalla radice del repo (`<repo>/../..`), come `server/make-banners.js`.
2. **Esclusi:** `X_BLINDBOX` e `X_TUTORIAL` non entrano in `banners`.
3. **`end_of`:** togliere le regole smentite (spec 9.8): via «next of series - 1 day», «weekly Supernova Deal 7 days», «1st of month -> month end». Ordine: originale; Draw Points -> `2021-06-29`; notice con punteggio >= 5; `supernova deal|gem deal|free deal|sn\+ falling price|ffbe campaign` -> 1 giorno (`start`); notice debole; Beginner 2019 -> `2020-10-11`; Beginner 2020 -> `2021-02-24`; altrimenti 1 giorno. `endSource` = la fonte (`original`, `notice <id>`, `1 day (series rule)`, ...).
4. **`currency_of(row, typ)`:** `(payType, currency)` con `{'Bronze Ticket': (4,'bronze'), 'Silver Ticket': (5,'silver'), 'Gold Ticket': (6,'gold'), 'Platinum Ticket': (7,'platinum'), 'Draw Ticket': (8,'draw'), 'Holiday Draw Ticket': (8,'holiday'), 'Spooky Cookie': (8,'spooky'), 'Moogle Point': (8,'moogle'), 'Draw Point': (9,'points')}`, dopo aver tolto `', VIP only'` e `'Free, '`; tutto il resto (Jewels, Free, vuota) `(1, 'jewel')`. B0787 «Ticket Draw x10» (2021-01, «Holiday» nel TSV): `(8, 'draw')` (errore del TSV, research.md §2).
5. **`prices`:** `parse_price`; lista vuota -> riga `INCOMPLETE` salvo override. I prezzi 0 restano 0 nella ricetta: e' `gacha.js` che li porta a 1 Jewel (Task 6).
6. **`day_limit(notes, typ)`:** `3` se `(\d+|three) times per day|3×/day`, `1` se `once (per|a) day` o `typ == 'DAILY'`, altrimenti `0`.
7. **`vipFree`:** `True` se `typ == 'FREE'` e flag `VIP`.
8. **`vip_twins(rows)`:** righe con `VIP` nella valuta o nel prezzo per cui esiste una riga non VIP con la stessa `start_pt` e lo stesso `series_key` del nome senza `(VIP)`/`VIP:`. Atteso sui dati veri: 41. `catalogOnly = 'VIP_TWIN'`.
9. **`catalogOnly`:** in quest'ordine `VIP_TWIN`; `PVP_TICKETS` per payType 4/5/6; `DRAW_POINTS` per payType 9; `INCOMPLETE` se mancano `prices` o `lotCount` dopo fratelli e override.
10. **Righe incomplete:** porta di `incomplete.py` (fratello di serie piu' vicino con prezzo e dimensione: 11 righe), poi gli override di `banner_overrides.tsv` (colonne `row_id`, `field` in `price|draw_size|rarity_mix|end_pt`, `value`, `source`), che vincono su tutto.
11. **`pool`:** 
    - note con set -> `{'mode': 'sets', 'sets': refs espansi}`: `24.3` -> `['24.3a', '24.3b']` se esistono le varianti a lettera; set senza sotto-set nella wiki (27.6, 40.6, 41.x) -> `names` delle medaglie di quel set uscite entro l'inizio (come la ricerca);
    - «Draws from the following medals» -> `{'mode': 'list', 'names': ...}`;
    - nessuna nota e banner `PERMANENT` o nessun banner documentato prima -> `{'mode': 'released'}`;
    - nessuna nota -> `{'mode': 'inherit', 'sets': set dell'ultimo banner documentato dello stesso tipo (o di qualunque tipo), 'inheritAfter': la sua data, 'names': nomi dei link [[...]] nelle note}`;
    - `T_EVOLVE` -> `{'mode': 'evolve', 'evolve': [[medalId, livello], ...]}` dalle righe di `medal.json` con nome `Blue Fairy [SA Bonus LV n]` (Bronze LV1-3, Silver LV4-8 dal 14/09/2018 e LV3-8 prima, Gold LV5-8) o `Dual Meow Wow [SAB LV n]` (Platinum LV7-9); verificare i nomi esatti in `medal.json` con un `grep` prima di scrivere la regex;
    - `featured` = medaglie della colonna `featured_medals` + `guarantee.featured`, normalizzate.
12. **`epicBoost`:** `True` se le note complete contengono `higher chances? of (being|the other \d+ being) Epic` o `chance to obtain Epic` (Epic Medal Carnival, DAILY/SMALL DEAL Epic del 24/06-15/07/2016).
13. **`bonus`:** dalle note complete, `[Ii]ncludes? (a|one|two|three|five|\d+) bonus (.*?)(?:\.|$)` (togliere `'''`): numero in parole -> cifra; nome = primo link `[[...]]` o template `{{b|...}}`/`{{n|...}}` (stessa resa di `banner_sources.toks`); se il nome e' una gemma (`material.json`, campo `name`) -> `[5, materialId, n]`; altrimenti medaglia per nome (e stella se scritta, es. «6★») in `medal.json` di qualunque `type` -> `[3, medalId, n]`; i nomi non trovati (es. «Scrooge Medal with the ... Skill», Trait e Imitation) si saltano e si contano nella stampa finale (`bonus saltati`). Test: `m.bonus_of("Includes '''three''' bonus 6★ [[Magic Mirror]] Medals.", MEDALS, MATERIALS) == [[3, 90156, 3]]` e `m.bonus_of('Includes two bonus [[Power Gem]]s.', MEDALS, MATERIALS) == [[5, 48, 2]]` con tabelle sintetiche nel test.
14. **`skill`:** `SKILL` -> `{'table': '50106', 'slots': 'first'}`; `SN` e `SEVEN` con inizio >= `2020-12-01` (prima data del notice 72415 nei TSV; verificare la data del notice con `notices.json` e usarla) -> `{'table': '72415', 'slots': 'all'}`; altrimenti `None`.
15. **`firstRarity`:** prima comparsa di ogni stella nei `rarity_mix` (come `first_rarity` della ricerca); atteso `6 -> 2016-07-15`, `7 -> 2018-05-25`.
16. **`story`:** righe di `story_release_ww.tsv` come `[first_quest, last_quest, ww_release_date]` in ordine.
17. **`subsets` e `medals`:** da `banner_sources` (Task 2), con nomi normalizzati; `medals[n].ids` solo righe `type 1`, `validPack != 1`; `rare_date` per la variante, minimo `date`.
18. **Uscita:** `main()` scrive `server/game_data/gacha_catalog.json` (UTF-8, `ensure_ascii=False`, separatori compatti) e stampa i conteggi per tipo, `catalogOnly` e sblocchi a 525.

Creare `recon/tools/banner_overrides.tsv` con la sola intestazione `row_id\tfield\tvalue\tsource` (tab vero: scriverlo col tool Write e controllare i byte).

- [ ] **Step 4: Test e numeri**

Run: `python recon/tools/test_make_banner_catalog.py` -> `OK`.
Run: `python recon/tools/make_banner_catalog.py`
Expected: 808 banner; tipi come nel test; `catalogOnly`: VIP_TWIN 41, PVP_TICKETS 4, DRAW_POINTS 7, INCOMPLETE <= 31; sblocchi a 525: 78. File di circa 1 MB.

- [ ] **Step 5: Commit**

```bash
git -c safe.directory=* add recon/tools/make_banner_catalog.py recon/tools/banner_overrides.tsv recon/tools/test_make_banner_catalog.py
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_sp2_t3.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 4: override delle righe incomplete e immagini

Modello consigliato: Sonnet.

**Files:**
- Modify: `recon/tools/banner_overrides.tsv`
- Create: `recon/tools/make_banner_images.py`
- Create: `recon/tools/test_make_banner_images.py`

**Interfaces:**
- Consumes: `gacha_catalog.json` (Task 3); decisione del Task 1 (`palette` o `full`).
- Produces: `server/game_data/gacha_img/<drawMedalTypeId>.png` per ogni banner; `make_banner_images.fit(im) -> Image` (640x140), `make_banner_images.plate(name) -> Image`.

- [ ] **Step 1: Override dai notice**

Per ogni riga ancora `INCOMPLETE` (stampata dal Task 3), leggere il notice in `reference\banners\notices.json` (id nei `source_url` della riga, o ricerca del nome nel titolo) e aggiungere a `banner_overrides.tsv` le righe `price`, `draw_size` (`x10`), `rarity_mix` (formato `6★:1 5★:9`) ed eventualmente `end_pt`, con `source` = `notice <id>`. B0205 (cinque Foreteller in una riga): un solo banner con i valori comuni del notice. Le righe senza dati nel notice restano incomplete (solo catalogo, spec 9.1). Rilanciare `python recon/tools/make_banner_catalog.py` e annotare nel registro quante righe restano `INCOMPLETE`.

- [ ] **Step 2: Test delle immagini che fallisce**

```python
from PIL import Image
import make_banner_images as m
im = m.fit(Image.new('RGB', (1001, 219), (200, 10, 10)))
check(im.size == (640, 140), 'ridimensionata')
im = m.fit(Image.new('RGB', (640, 160), (0, 0, 0)))
check(im.size == (640, 140), 'ritagliata al centro se il rapporto differisce oltre l\'1%')
p = m.plate('Big Deal!!')
check(p.size == (640, 140) and p.mode == 'RGB', 'piastra generata')
check(m.save_png(Image.new('RGB', (640, 140)), os.path.join(tmp, 'a.png'), 'palette') and Image.open(os.path.join(tmp, 'a.png')).mode == 'P', 'palette')
check(Image.open(os.path.join(tmp, 'a.png')).size == (640, 140), 'misura salvata')
```

- [ ] **Step 3: Verificare che fallisca**

Run: `python recon/tools/test_make_banner_images.py` -> ImportError.

- [ ] **Step 4: Implementazione**

`make_banner_images.py`:
- `fit(im)`: `convert('RGB')`; se il rapporto larghezza/altezza differisce da 640/140 meno dell'1% -> `resize((640, 140), Image.LANCZOS)`; altrimenti ritaglio centrale al rapporto 640/140 e poi resize.
- `plate(name)`: sfondo a gradiente verticale blu scuro (`#0d2a4a` -> `#174a5c`, colori della pagina del catalogo), bordo oro 3 px (`#d8b25a`), nome centrato in bianco con `ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 34)` (ripiego `ImageFont.load_default()`), ridotto finche' entra in 600 px.
- `save_png(im, path, mode)`: `palette` -> `im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)`; `full` -> `im.save(path, optimize=True)`; restituisce True.
- `main()`: argomenti `--mode palette|full` (default `palette`), `--img-dir` (default `<repo>/../../reference/banners/img`), `--catalog` (default `server/game_data/gacha_catalog.json`), `--out` (default `server/game_data/gacha_img`). Per ogni banner: immagine `image` (prima parte prima dello spazio se ce ne sono piu' di una) se esiste; altrimenti quella del banner `imageFrom`; altrimenti quella di un banner della stessa serie (`series_key` uguale, da `make_banner_catalog`) con immagine; altrimenti `plate(name)`. Non toccare `9001.png` (piastra Catalog, `make_shop_art.py`). Stampa conteggi (copiate, ridimensionate, da fratello, generate) e MB totali.

Nel Task 3, `imageFrom` vale gia' il `rowId` del banner che fornisce l'immagine per DAILY DEAL/SMALL DEAL Epic (B0022, B0024, B0028, B0030 -> immagine di B0001/B0027), Skills to Thrill 2017 (B0133/B0134/B0147/B0148 -> il Skills to Thrill precedente con immagine) e B0612 Supernova+ - Aced Returns (-> il Supernova Aced precedente); se non e' cosi', aggiungerlo li' (`make_banner_catalog.py`) in questo task e rilanciare il test del Task 3.

- [ ] **Step 5: Test e generazione**

Run: `python recon/tools/test_make_banner_images.py` -> `OK`.
Run: `python recon/tools/make_banner_images.py --mode <decisione del Task 1>`
Expected: 808 file; con `palette` circa 32 MB in tutto; al massimo 5 piastre generate (B0009, B0077, B0493, B0497, B0623). Aprire 3 immagini a caso (una ridimensionata, una da fratello, una generata) col tool Read per controllarle.

- [ ] **Step 6: Commit**

```bash
git -c safe.directory=* add recon/tools/banner_overrides.tsv recon/tools/make_banner_images.py recon/tools/test_make_banner_images.py recon/tools/make_banner_catalog.py
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_sp2_t4.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 5: `server/gacha-data.js` (catalogo, pool per epoca, probabilita', estrazione)

Modello consigliato: Opus.

**Files:**
- Modify: `server/gacha-data.js`
- Modify: `server/test-gacha-data.js`

**Interfaces:**
- Consumes: formato di `gacha_catalog.json` (contratto sopra).
- Produces (Task 6-8):
  - `CATALOG_ID` (9001), `UPGRADE` `{3: 0.10, 4: 0.06, 5: 0.04, 6: 0.03}`, `EPIC_UPGRADE` 0.15, `FEATURED_WEIGHT` 2
  - `loadCatalog(file) -> {banners, subsets, medals, firstRarity, story}` (vuoto ma valido se il file manca o e' rotto)
  - `storyDay(catalog, quest) -> 'YYYY-MM-DD'` (data della tranche che contiene la quest; la prima se quest < 1)
  - `asOf(banner, day) -> 'YYYY-MM-DD'` (inizio del banner; per i `PERMANENT` `day` limitato a [start, end])
  - `expandPool(banner, catalog, asOf) -> {pool: {rare: [ids]}, featuredIds: [ids], listIds: [ids], weighted: [[id, peso]]}`
  - `slotRarities(banner)` (invariata), `parseRarityMix(s)` (invariata)
  - `slotOdds(banner, ex) -> [[{rare, pct}], ...]` (pct con 2 decimali; slot a lista: `[{list: true, pct: 100}]`)
  - `rollDraw(banner, ex, rng, state) -> {medalIds, featured}`; `state = {draws, sinceFeatured}` (estrazioni gia' fatte su quel banner)
  - `SKILL_TABLES`, `rollSkill(spec, slotIndex, skillRows, rng) -> skillId | null`
  - `drawMedalTypeRow(...)` (invariata), `bannerById(list, id)` (invariata)
  - rimossi: `UPGRADE_CHANCE`, `loadBanners`

- [ ] **Step 1: Test che falliscono**

Riscrivere `server/test-gacha-data.js` (tenere i controlli di `parseRarityMix`, `slotRarities`, `drawMedalTypeRow`). Catalogo sintetico:

```js
const CAT = {
  firstRarity: { 3: '2016-04-07', 4: '2016-04-07', 5: '2016-04-07', 6: '2016-07-15', 7: '2018-05-25' },
  story: [[1, 200, '2016-04-07'], [201, 250, '2016-04-21'], [251, 525, '2016-12-08']],
  subsets: { '1.1': { date: '2016-04-07', names: ['sora'] }, '2.2': { date: '2016-05-27', names: ['hades'] } },
  medals: {
    sora: { date: '2016-04-07', cls: '', class2: 'Attack', ids: [[31, 3, '2016-04-07'], [41, 4, '2016-04-07'], [51, 5, '2016-04-07'], [61, 6, '2016-04-07'], [71, 7, '2018-05-14']] },
    hades: { date: '2016-05-27', cls: '', class2: 'Attack', ids: [[32, 3, '2016-05-27'], [42, 4, '2016-05-27']] },
    vip: { date: '2016-04-07', cls: 'V', class2: 'Attack', ids: [[33, 3, '2016-04-07']] },
  },
};
const B = (o) => ({ rowId: 'B9', drawMedalTypeId: 10009, lotCount: 3, rarityMix: [[4, 1], [3, 2]], flags: [], start: '2016-05-01', end: '2016-05-31',
  epicBoost: false, pool: { mode: 'sets', sets: ['1.1'], names: [], featured: [], inheritAfter: null, evolve: null },
  guarantee: { list: [], count: 0, pity: null, every: null }, skill: null, ...o });
```

Controlli:
- `storyDay(CAT, 525) === '2016-12-08'`, `storyDay(CAT, 210) === '2016-04-21'`, `storyDay(CAT, 0) === '2016-04-07'`;
- `asOf(B({}), '2016-12-08') === '2016-05-01'`; `asOf(B({ flags: ['PERMANENT'] }), '2016-12-08') === '2016-05-31'`; `asOf(B({ flags: ['PERMANENT'] }), '2016-04-07') === '2016-05-01'`;
- set: `expandPool(B({}), CAT, '2016-05-01').pool` -> `{3: [31], 4: [41], 5: [51]}` (6★ non estraibile prima del 15/07/2016; niente Hades: 2.2 non citato);
- epoca 7★: con `rarityMix [[6, 1]]` e asOf `2018-06-01` il pool ha `7: [71]`; con asOf `2018-05-01` no;
- `released`: `B({ pool: { mode: 'released', ... } })` a `2016-04-30` -> solo Sora; a `2016-06-01` -> Sora e Hades; mai `vip` (classe V);
- `inherit` con `inheritAfter: '2016-04-07'` e `sets: ['1.1']` a `2016-06-01` -> Sora e Hades;
- sotto-set con data successiva ad asOf ignorato (`sets: ['2.2']` a `2016-05-01` -> pool vuoto);
- `evolve`: `B({ lotCount: 5, pool: { mode: 'evolve', evolve: [[301682, 7], [301683, 8], [301684, 9]] } })` -> `weighted` = `[[301682, 0.45], [301683, 0.45], [301684, 0.1]]`;
- `slotOdds` di `B({})` espanso a `2016-05-01`: slot 4★ -> `[{rare: 4, pct: 94}, {rare: 5, pct: 6}]`; slot 3★ -> `[{rare: 3, pct: 90}, {rare: 4, pct: 10}]`;
- `epicBoost`: slot 3★ -> `[{rare: 3, pct: 85}, {rare: 5, pct: 15}]`;
- `rollDraw` deterministico con `seq(...)`: senza promozione `[41, 31, 31]`; con `rng` 0.01 sul primo slot -> 5★ (51);
- slot a lista: `guarantee: { list: ['sora', 'hades'], count: 1 }`, `featured: ['hades']`, pool a `2016-06-01`: il primo slot pesca da `listIds` con Hades peso 2 (rng 0.0 -> primo elemento; rng 0.99 -> Hades);
- pity: `guarantee: { pity: 3 }`, `featured: ['hades']`, `state {draws: 2, sinceFeatured: 2}` -> il primo slot e' una medaglia di Hades e `featured === true`; con `sinceFeatured: 1` nessun obbligo;
- every: `guarantee: { list: ['hades'], count: 1, every: 3 }`: con `state.draws` 2 (terza estrazione) il primo slot e' Hades; con `draws` 0 no;
- `rollSkill({ table: '72415', slots: 'all' }, 1, rows, () => 0.0)` restituisce l'id di Attack Boost I; con `() => 0.99` `null`; `rollSkill({ table: '50106', slots: 'first' }, 1, rows, () => 0)` `null` (solo il primo slot); con slot 0 restituisce sempre uno skill. `rows` = `new Map([[1100, {skillId: 1100, name: 'Attack Boost I'}], [1102, {name: 'Attack Boost All I', skillId: 1102}], [1101, {name: 'Attack Boost II', skillId: 1101}]])`;
- `loadCatalog('/non/esiste.json')` -> `{banners: [], subsets: {}, medals: {}, firstRarity: {}, story: []}`.

- [ ] **Step 2: Verificare che falliscano**

Run: `node server/test-gacha-data.js`
Expected: `ERRORI` (funzioni assenti).

- [ ] **Step 3: Implementazione**

Sostituire in `server/gacha-data.js` la parte delle probabilita' e del caricamento; intestazione aggiornata (spec 9.2/9.3, catalogo scritto da `recon/tools/make_banner_catalog.py`).

```js
const CATALOG_ID = 9001;
// Probabilita' RICOSTRUITE (spec 9.2): lo slot r★ sale di una stella con UPGRADE[r] se quella
// stella ha medaglie nel pool (cioe' era estraibile alla data del banner); i banner «Epic» del 2016
// mandano 3★/4★ a 5★ con EPIC_UPGRADE. Negli slot a lista la medaglia in vetrina pesa FEATURED_WEIGHT.
const UPGRADE = { 3: 0.10, 4: 0.06, 5: 0.04, 6: 0.03 };
const EPIC_UPGRADE = 0.15;
const FEATURED_WEIGHT = 2;
const STD_CLS = new Set(['', 'SR', 'L']); // classi Template:NASets estraibili (non Event/VIP/Bonus)
const EMPTY = () => ({ banners: [], subsets: {}, medals: {}, firstRarity: {}, story: [] });

function loadCatalog(file) {
  try {
    const c = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(c.banners) ? { ...EMPTY(), ...c } : EMPTY();
  } catch {
    return EMPTY();
  }
}

function storyDay(catalog, quest) {
  const s = catalog.story || [];
  if (!s.length) return '2016-04-07';
  const row = s.find(([a, b]) => quest >= a && quest <= b);
  return row ? row[2] : (quest < s[0][0] ? s[0][2] : s[s.length - 1][2]);
}

function asOf(banner, day) {
  if (!(banner.flags || []).includes('PERMANENT')) return banner.start;
  const end = banner.end || '2099-12-31';
  return day < banner.start ? banner.start : day > end ? end : day;
}

function expandPool(banner, catalog, at) {
  const p = banner.pool || {};
  if (p.mode === 'evolve') {
    const ev = p.evolve || [];
    const top = Math.max(...ev.map(([, lv]) => lv));
    const rest = ev.length > 1 ? 0.9 / (ev.length - 1) : 1;
    const weighted = ev.map(([id, lv]) => [id, ev.length > 1 ? (lv === top ? 0.1 : rest) : 1]);
    return { pool: {}, featuredIds: [], listIds: [], weighted };
  }
  const names = new Set([...(p.names || []), ...(p.featured || []), ...(banner.guarantee?.list || [])]);
  for (const s of p.sets || []) {
    const sub = catalog.subsets[s];
    if (sub && sub.date <= at) sub.names.forEach((n) => names.add(n));
  }
  if (p.mode === 'released' || p.mode === 'inherit') {
    const after = p.mode === 'inherit' ? p.inheritAfter || '' : '';
    for (const [n, m] of Object.entries(catalog.medals)) {
      if (STD_CLS.has(m.cls) && (m.class2 === 'Attack' || m.class2 === '') && m.date > after && m.date <= at) names.add(n);
    }
  }
  const rarities = new Set(banner.rarityMix.map(([r]) => r));
  for (const [r] of banner.rarityMix) if (catalog.firstRarity[r + 1] && catalog.firstRarity[r + 1] <= at) rarities.add(r + 1);
  const feat = new Set(p.featured || []), list = new Set(banner.guarantee?.list || []);
  const pool = {}, featuredIds = new Set(), listIds = new Set();
  for (const n of names) {
    for (const [id, rare, rd] of catalog.medals[n]?.ids || []) {
      if (!rarities.has(rare) || rd > at) continue;
      (pool[rare] ||= new Set()).add(id);
      if (feat.has(n)) featuredIds.add(id);
      if (list.has(n)) listIds.add(id);
    }
  }
  const sorted = (s) => [...s].sort((a, b) => a - b);
  return { pool: Object.fromEntries(Object.entries(pool).map(([r, s]) => [r, sorted(s)])), featuredIds: sorted(featuredIds), listIds: sorted(listIds), weighted: [] };
}
```

Estrazione:

```js
const poolOf = (pool, rare) => pool[rare] || pool[String(rare)] || [];
const pickIndex = (n, rng) => Math.min(n - 1, Math.floor(rng() * n));
function pickWeighted(items, rng) {
  const tot = items.reduce((s, [, w]) => s + w, 0);
  let x = rng() * tot;
  for (const [id, w] of items) { if ((x -= w) < 0) return id; }
  return items[items.length - 1][0];
}
// salita dello slot: { to, p } oppure null
function upgradeOf(banner, pool, rare) {
  if (banner.epicBoost && rare < 5 && poolOf(pool, 5).length) return { to: 5, p: EPIC_UPGRADE };
  if (UPGRADE[rare] && poolOf(pool, rare + 1).length) return { to: rare + 1, p: UPGRADE[rare] };
  return null;
}
function pickSlot(banner, pool, rare, rng) {
  const up = upgradeOf(banner, pool, rare);
  let r = up && rng() < up.p ? up.to : rare;
  while (r >= 1 && !poolOf(pool, r).length) r--;
  const list = poolOf(pool, r);
  if (!list.length) throw new Error(`banner ${banner.drawMedalTypeId}: pool vuoto per ${rare}★`);
  return list[pickIndex(list.length, rng)];
}
const listItems = (ex) => ex.listIds.map((id) => [id, ex.featuredIds.includes(id) ? FEATURED_WEIGHT : 1]);

function rollDraw(banner, ex, rng, state = { draws: 0, sinceFeatured: 0 }) {
  if (banner.pool?.mode === 'evolve') {
    return { medalIds: Array.from({ length: banner.lotCount }, () => pickWeighted(ex.weighted, rng)), featured: false };
  }
  const g = banner.guarantee || {};
  const n = (state.draws || 0) + 1;
  const listOn = ex.listIds.length > 0 && (g.every ? n % g.every === 0 : true);
  const listSlots = listOn ? Math.max(1, g.count || 1) : 0;
  const pityOn = !!g.pity && ex.featuredIds.length > 0 && (state.sinceFeatured || 0) + 1 >= g.pity;
  const medalIds = slotRarities(banner).map((rare, i) => {
    if (i === 0 && pityOn) return ex.featuredIds[pickIndex(ex.featuredIds.length, rng)];
    if (i < listSlots) return pickWeighted(listItems(ex), rng);
    return pickSlot(banner, ex.pool, rare, rng);
  });
  return { medalIds, featured: medalIds.some((id) => ex.featuredIds.includes(id)) };
}

function slotOdds(banner, ex) {
  const listSlots = ex.listIds.length ? Math.max(1, banner.guarantee?.count || 1) : 0;
  const r2 = (x) => Math.round(x * 10000) / 100;
  return slotRarities(banner).map((rare, i) => {
    if (i < listSlots) return [{ list: true, pct: 100 }];
    const up = upgradeOf(banner, ex.pool, rare);
    return up ? [{ rare, pct: r2(1 - up.p) }, { rare: up.to, pct: r2(up.p) }] : [{ rare, pct: 100 }];
  });
}
```

Abilita' (spec 9.2; notice 50106 VIP Daily Skills to Thrill e 72415 SN+ Falling Price; solo le skill che esistono in `skill.json`, il resto della probabilita' va a «nessuna skill»; per 50106 lo slot ha sempre una skill, quindi le probabilita' si riscalano sulle skill presenti; skill al livello 1):

```js
const SKILL_TABLES = {
  50106: [['Attack Boost II', 5], ['Attack Boost All II', 5], ['Attack Prize Plus', 5], ['Lux Plus', 5], ['Defense Boost II', 5], ['No Cost', 1.70394]],
  72415: [['Attack Boost I', 1.68421], ['Attack Boost All I', 1.26315], ['Poison', 1.26315], ['Paralysis', 1.26315], ['Sleep', 1.26315], ['Defense Boost I', 1.26315]],
};
function rollSkill(spec, slotIndex, skillRows, rng) {
  if (!spec || (spec.slots === 'first' && slotIndex !== 0)) return null;
  const byName = new Map([...skillRows.values()].map((r) => [r.name, r.skillId]));
  const items = SKILL_TABLES[spec.table].filter(([n]) => byName.has(n)).map(([n, pct]) => [byName.get(n), pct]);
  if (!items.length) return null;
  if (spec.slots === 'first') return pickWeighted(items, rng);
  let x = rng() * 100;
  for (const [id, pct] of items) { if ((x -= pct) < 0) return id; }
  return null;
}
```

`module.exports` = `{ CATALOG_ID, UPGRADE, EPIC_UPGRADE, FEATURED_WEIGHT, SKILL_TABLES, parseRarityMix, slotRarities, loadCatalog, storyDay, asOf, expandPool, slotOdds, rollDraw, rollSkill, drawMedalTypeRow, bannerById }`.

- [ ] **Step 4: Test**

Run: `node server/test-gacha-data.js` -> `OK`.
Con il catalogo vero: `node -e` che carica `server/game_data/gacha_catalog.json`, espande ogni banner non `catalogOnly` alla sua data (`asOf(b, '2021-06-29')`) e stampa quanti hanno uno slot senza medaglie alla sua stella o sotto. Expected: 0 (oppure elencarli nel registro: li scarta il server, Task 8).

- [ ] **Step 5: Commit**

```bash
git -c safe.directory=* add server/gacha-data.js server/test-gacha-data.js
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_sp2_t5.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

(I test di `gacha.js` e `server.js` si rompono fino ai Task 6-8: e' atteso; il server non va avviato fra il Task 5 e il Task 8.)

---

### Task 6: `server/gacha.js` (lista provvisoria, prezzi, valute, limiti, pity) e `server/make-banners.js`

Modello consigliato: Opus.

**Files:**
- Modify: `server/gacha.js` (logica; le pagine al Task 7)
- Rewrite: `server/make-banners.js`
- Modify: `server/test-gacha.js`, `server/test-make-banners.js`

**Interfaces:**
- Consumes: `gacha-data` (Task 5).
- Produces (Task 7-8):
  - `SHOP_MAX` 8; `drawable(b, sizes) -> bool` (`!b.catalogOnly && sizes.has(b.lotCount)`)
  - `shopBanners(banners, {storyQuest, storyDay, sizes, show}) -> banner[]` (lista provvisoria)
  - `priceFor(banner, player) -> number` (mai 0)
  - `balance(player, banner) -> number`, `walletName(banner) -> string`
  - `gachaListData(banners, player, {realMs, webBase, sizes, storyQuest, storyDay, show}) -> {gachaList, petGachaList}`; scrive `player.gacha.listedCurrency`
  - `checkDraw(banner, player, body, {realMs, freeSlots, sizes, storyQuest, show}) -> string|null`
  - `payDraw(banner, player, realMs, gotFeatured) -> number` (prezzo pagato)
  - `drawState(player, banner) -> {draws, sinceFeatured}`
  - `catalogRow()`, `catalogPlate(webBase)`, `drawResultFields(...)` (invariate)
  - `ticketsOf(player) -> {draw, holiday, spooky, moogle}` (crea `player.drawTickets`, migra `limitedDrawTicket2` una volta)
  - `make-banners.js`: `masterRows(catalog) -> row[]`, `commentOf(banner) -> string`

- [ ] **Step 1: Test che falliscono**

`server/test-gacha.js` (riscrivere le parti cambiate; `realMs` fissi come nei test attuali). Banner sintetici con i campi del contratto. Casi:
- `priceFor`: `prices [0, 3000]` -> 1 alla prima, 3000 dopo una estrazione (`player.gacha.count[id] = 1`); `prices [3000, 2500, 2200, 1900]` -> 3000, 2500, 2200, 1900, 1900 per 0..4 estrazioni; `prices [0]` -> sempre 1;
- `shopBanners` con `storyQuest 525`, `storyDay '2016-12-08'`, `sizes {1,3,10}`: entra un banner `start 2016-12-01 end 2016-12-15 unlockQuest 525`; non entra lo stesso con `unlockQuest 540`; non entra uno con `end 2016-11-30`; entra un `PERMANENT` `2016-04-07 -> 2018-01-31`; non entra un `catalogOnly` ne' uno con `lotCount 5`; `show` (Set di rowId) aggiunge un banner qualunque purche' `drawable`; al massimo `SHOP_MAX`, ordine per `start` decrescente; due banner payType 8 `draw` e `spooky`: entra solo il primo in ordine;
- valute: `ticketsOf({limitedDrawTicket2: 7})` -> `{draw: 7, holiday: 0, spooky: 0, moogle: 0}` e `limitedDrawTicket2` cancellato; `balance` di un banner `spooky` legge `drawTickets.spooky`;
- `gachaListData` con un banner `spooky` elencato: `player.gacha.listedCurrency === 'spooky'`; piastra con `price` = `priceFor` e `userLimitedCount`;
- limiti: `dayLimit 3` -> tre estrazioni nello stesso giorno, la quarta rifiutata; `vipFree` -> dopo una estrazione su un banner VIP gratuito, un secondo banner VIP gratuito dello stesso giorno e' rifiutato (`'estrazione gratuita VIP gia\' usata oggi'`) e `userLimitedCount` 0 per entrambi; il giorno dopo di nuovo 1;
- `checkDraw`: rifiuta `catalogOnly` (`'banner solo nel catalogo'`), `unlockQuest > storyQuest` (`'banner bloccato'`), payType 4/5/6/9, fondi < `priceFor`, box pieno;
- `payDraw`: scala `priceFor` dal portafoglio giusto, incrementa `player.gacha.count[id]`, azzera `sinceFeatured[id]` se `gotFeatured`, altrimenti +1; restituisce il prezzo;
- `make-banners`: `masterRows(catalog)` ha 1 + N righe, prima la piastra 9001; ogni riga ha `price >= 1`, `payType` in `[1, 4, 5, 6, 7, 8]` (payType 9 -> 1), `benefitId 0`; `commentOf` di `rarityMix [[6,1],[5,9]]`, `lotCount 10`, `pity 10` -> `'10 Medals: 1x 6★+, 9x 5★+ - featured Medal guaranteed within 10 draws'`; nessun `%` sciolto.

- [ ] **Step 2: Verificare che falliscano**

Run: `node server/test-gacha.js` e `node server/test-make-banners.js` -> `ERRORI`.

- [ ] **Step 3: Implementazione di `gacha.js`**

Intestazione aggiornata (spec 9.4-9.7; lista provvisoria fino al sotto-progetto 3). Codice:

```js
const SHOP_MAX = 8;
const WALLET = { 1: 'freeStone', 7: 'limitedDrawTicket1' }; // payType 8: player.drawTickets[currency]
const TICKET_CURRENCIES = ['draw', 'holiday', 'spooky', 'moogle'];
const VIP_FREE = 'vipFree'; // chiave del limite condiviso delle Free Deal VIP (spec 9.5)

function ticketsOf(player) {
  if (!player.drawTickets) {
    player.drawTickets = Object.fromEntries(TICKET_CURRENCIES.map((c) => [c, 0]));
    player.drawTickets.draw = player.limitedDrawTicket2 || 0; // salvataggi del sotto-progetto 1
    delete player.limitedDrawTicket2;
  }
  return player.drawTickets;
}
const walletName = (b) => (b.payType === 8 ? `drawTickets.${b.currency}` : WALLET[b.payType]);
function balance(player, b) {
  if (b.payType === 8) return ticketsOf(player)[b.currency] || 0;
  return player[WALLET[b.payType]] || 0;
}
function spend(player, b, n) {
  if (b.payType === 8) ticketsOf(player)[b.currency] -= n;
  else player[WALLET[b.payType]] = (player[WALLET[b.payType]] || 0) - n;
}
const gstate = (player) => (player.gacha ||= {});
const drawCount = (player, b) => gstate(player).count?.[b.drawMedalTypeId] || 0;
function priceFor(b, player) {
  const p = b.prices || [];
  return Math.max(1, p.length ? p[Math.min(drawCount(player, b), p.length - 1)] : 1);
}
const drawable = (b, sizes) => !b.catalogOnly && [1, 7, 8].includes(b.payType) && sizes.has(b.lotCount);
const activeOn = (b, day) => b.start <= day && day <= (b.end || '2099-12-31');

function shopBanners(banners, { storyQuest, storyDay, sizes, show }) {
  const pick = banners.filter((b) => drawable(b, sizes)
    && ((b.unlockQuest <= storyQuest && activeOn(b, storyDay)) || show.has(b.rowId)))
    .sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : a.drawMedalTypeId - b.drawMedalTypeId));
  let currency = null;
  const out = [];
  for (const b of pick) {
    if (b.payType === 8) { if (currency && currency !== b.currency) continue; currency = b.currency; }
    out.push(b);
    if (out.length === SHOP_MAX) break;
  }
  return out;
}
```

Per i `PERMANENT` `activeOn` usa le loro date originali (es. DAILY DEAL! 2016-04-07 -> 2018-01-31), quindi restano nella lista mentre il punto nella storia cade nella loro epoca (spec 4.5).

Limiti giornalieri (sostituiscono `dayLeft`): `player.gacha = {day, used: {id: n, vipFree: n}, count: {id: n}, sinceFeatured: {id: n}, listedCurrency}`; al cambio di giorno (`clock.dayIndex(realMs)`) si azzera solo `used`.

```js
function usedToday(player, key, realMs) {
  const g = gstate(player);
  return g.day === clock.dayIndex(realMs) ? g.used?.[key] || 0 : 0;
}
function dayLeft(player, b, realMs) {
  if (b.vipFree) return Math.max(0, 1 - usedToday(player, VIP_FREE, realMs));
  if (!b.dayLimit) return 0;
  return Math.max(0, b.dayLimit - usedToday(player, b.drawMedalTypeId, realMs));
}
```

`plate(b, webBase, userLimitedCount, price)`: come ora con `price` dal parametro e `isDayLimited: b.dayLimit || b.vipFree ? 1 : 0`. `gachaListData`: `ticketsOf(player)`, lista = `[catalogPlate, ...shopBanners(...).map((b) => plate(b, webBase, dayLeft(player, b, realMs), priceFor(b, player)))]`, `gstate(player).listedCurrency` = currency del primo banner payType 8 elencato (o `'draw'`).

`checkDraw(banner, player, body, {realMs, freeSlots, sizes, storyQuest, show})`, nell'ordine: sconosciuto; `catalogOnly` -> `'banner solo nel catalogo'`; payType non in `[1, 7, 8]` -> `payType N non estraibile`; `unlockQuest > storyQuest` e non in `show` -> `'banner bloccato'`; dimensione senza animazione; limite (`vipFree`: `'estrazione gratuita VIP gia\' usata oggi'`; `dayLimit`: `'limite giornaliero raggiunto'`); `balance < priceFor`; box.

`payDraw(banner, player, realMs, gotFeatured)`: `const price = priceFor(banner, player); spend(...)`; poi `count[id]++`, `sinceFeatured[id] = gotFeatured ? 0 : (sinceFeatured[id] || 0) + 1`; per `vipFree`/`dayLimit` aggiorna `used` (con azzeramento al cambio di giorno, come oggi); restituisce `price`.

`drawState(player, b) = { draws: drawCount(player, b), sinceFeatured: gstate(player).sinceFeatured?.[b.drawMedalTypeId] || 0 }`.

- [ ] **Step 4: Implementazione di `make-banners.js`**

Riscrivere: intestazione (fonte `server/game_data/gacha_catalog.json` scritto da `recon/tools/make_banner_catalog.py`; uscita `server/master_data/drawMedalType.json`; poi alzare `KHUX_REVISION`).

```js
function commentOf(b) {
  const mix = b.rarityMix.map(([r, n]) => `${n}x ${r}★+`).join(', ');
  const extra = b.guarantee?.pity ? ` - featured Medal guaranteed within ${b.guarantee.pity} draws`
    : b.vipFree ? ' - one free VIP draw per day' : b.dayLimit ? ` - ${b.dayLimit === 1 ? 'once' : `${b.dayLimit} times`} per day` : '';
  return `${b.lotCount} Medal${b.lotCount === 1 ? '' : 's'}${mix ? `: ${mix}` : ''}${extra}`;
}
function masterRows(catalog) {
  return [require('./gacha').catalogRow(), ...catalog.banners.map((b, i) => gd.drawMedalTypeRow({
    drawMedalTypeId: b.drawMedalTypeId, name: b.name, payType: [1, 4, 5, 6, 7, 8].includes(b.payType) ? b.payType : 1,
    price: Math.max(1, (b.prices || [])[0] || 1), sortId: 10 + i,
    bannerUrl: `/web/gacha/img/${b.drawMedalTypeId}.png`, detailUrl: `/web/gacha/detail/${b.drawMedalTypeId}`, comment: commentOf(b),
  }))];
}
```

`main()`: carica il catalogo con `gd.loadCatalog`, esce con errore se `banners` e' vuoto («lanciare prima recon/tools/make_banner_catalog.py»), scrive il master, stampa il numero di righe e «poi alzare KHUX_REVISION (drawMedalType)». Niente piu' TSV, wiki, pool o immagini qui. `module.exports = { commentOf, masterRows }`.

- [ ] **Step 5: Test**

Run: `node server/test-gacha.js` e `node server/test-make-banners.js` -> `OK`. Poi `node server/make-banners.js` -> 809 righe.

- [ ] **Step 6: Commit**

```bash
git -c safe.directory=* add server/gacha.js server/make-banners.js server/test-gacha.js server/test-make-banners.js
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_sp2_t6.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 7: pagine WebView (catalogo di 808 banner, dettagli, Draw Odds)

Modello consigliato: Sonnet.

**Files:**
- Modify: `server/gacha.js` (pagine)
- Modify: `server/test-gacha.js`

**Interfaces:**
- Consumes: `gacha-data.slotOdds`, `expandPool` (Task 5); `priceFor`, `drawable`, `shopBanners` (Task 6).
- Produces (Task 8): `RESTORED_QUEST` (525), `catalogPage(banners, ctx) -> html`, `detailPage(banner, ex, medalNames, ctx) -> html`, `oddsPage(entries) -> html` con `entries = [{banner, ex}]`, `stateOf(banner, ctx) -> {key, text}`.

- [ ] **Step 1: Test che falliscono**

In `test-gacha.js`:
- `stateOf` con `ctx = {storyQuest: 300, storyDay: '2016-05-12', sizes, show: new Set(), shown: Set di drawMedalTypeId della lista}`: banner nella lista -> `{key: 'now', text: 'In the Shop now'}`; `unlockQuest 450` -> `{key: 'locked', text: 'Unlocks after Story Quest 450'}`; `unlockQuest 600` -> `{key: 'locked', text: 'Unlocks after Story Quest 600 — coming with a future update'}` (oltre `RESTORED_QUEST` = 525, costante esportata da `gacha.js`, spec 4.4); `catalogOnly 'PVP_TICKETS'` -> `Requires PvP tickets — coming with a future update`; `DRAW_POINTS` -> `Draw Points — coming with a future update`; `VIP_TWIN` -> `VIP variant, not reproduced`; `INCOMPLETE` -> `Original details missing — not available`; dimensione senza animazione -> `This draw size is not available yet`; sbloccato ma fuori periodo -> `Not in the Shop now`;
- `catalogPage` con 3 banner: contiene 3 `loading="lazy"`, i nomi con escape HTML (`<b>` nel nome diventa `&lt;b&gt;`), lo stato di ciascuno e il link `/web/gacha/detail/<id>`;
- `detailPage`: contiene «Draw rates», la parola `reconstructed` accanto alle probabilita' degli slot, `original` accanto alla composizione («Medal rarities of each draw: original») e, se `guarantee.pity`, la frase `Featured Medal guaranteed within N draws (original)`; per `skill` la tabella delle abilita' con `(original rates, notice)`; per `evolve` i livelli con le percentuali (10% al livello piu' alto);
- `oddsPage([{banner, ex}])`: una sezione per banner con le righe di `slotOdds`.

- [ ] **Step 2: Verificare che falliscano**

Run: `node server/test-gacha.js` -> `ERRORI`.

- [ ] **Step 3: Implementazione**

Tenere `page()`, `esc()`; `priceText(b, price)` riceve il prezzo; `PAY` aggiunge `spooky: 'Spooky Cookies'`, `moogle: 'Moogle Points'`, `holiday: 'Holiday Draw Tickets'`, `draw: 'Draw Tickets'` per payType 8 (via `b.currency`). Catalogo: un blocco per banner in ordine di `start`, con `<img loading="lazy" width="640" height="140">`, nome, date originali (con «(end date reconstructed)» se `endSource` non e' `original`), prezzo, stato da `stateOf`; in cima una riga «808 original banners. Banners unlock with the Story, as in the original game.» (numero calcolato). Dettagli: immagine, prezzo, date, stato, «Draw rates» con la nota «Medal rarities of each draw: original. Chances of one more star: reconstructed for this restoration.», tabella `slotOdds` (gli slot a lista: «one of the listed Medals, featured Medals twice as likely»), garanzie, abilita' (`SKILL_TABLES` con le sole skill presenti), elenco delle medaglie per rarita' come oggi (da `ex.pool`, o i livelli per `evolve`). Draw Odds: come oggi con `entries`.

- [ ] **Step 4: Test**

Run: `node server/test-gacha.js` -> `OK`.

- [ ] **Step 5: Commit**

```bash
git -c safe.directory=* add server/gacha.js server/test-gacha.js
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_sp2_t7.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 8: collegamento in `server/server.js`, Notices

Modello consigliato: Opus.

**Files:**
- Modify: `server/server.js` (blocco Shop > Draw, righe ~1108-1210; `userPointData` ~1262-1266; `grantItem` tipo 41 ~1496; caricamento del salvataggio)
- Modify: `server/routes-info-album.js`
- Modify: `server/test-gacha-server.js`, `server/test-notices.js` se controlla i testi

**Interfaces:**
- Consumes: Task 5-7.
- Produces: rotte invariate (`/gacha/list`, `/gacha/draw`, `/web/gacha/*`); `KHUX_GACHA_SHOW` (rowId separati da virgola) al posto di `KHUX_GACHA_TEST`; export di test `gachaCatalog`, `reloadGachaBanners`, `sanitizeBanners`.

- [ ] **Step 1: Test che falliscono**

In `server/test-gacha-server.js` (stesso impianto: `KHUX_SAVE` temporaneo, catalogo sintetico scritto in un file temporaneo passato con `KHUX_GACHA_BANNERS`), sostituire il catalogo del sotto-progetto 1 con uno nel formato nuovo (sotto-set, medaglie con id veri di `medal.json` di rarita' 3-5, un banner `PERMANENT`, un banner VIP gratuito, un banner `evolve` con le righe `Dual Meow Wow [SAB LV 7-9]` di `medal.json`, un banner `catalogOnly`). Casi:
- `/gacha/list` con la storia del salvataggio di prova: piastra 9001 + i banner attesi da `shopBanners`; prezzo dinamico;
- `/gacha/draw` sul banner `PERMANENT`: medaglie solo del pool espanso alla data della storia del giocatore (giocatore alla quest 200: niente medaglie con data > `2016-04-07` nel risultato);
- `/gacha/draw` sul banner `evolve` (con `KHUX_GACHA_SHOW` che lo contiene e 1 biglietto Platinum): ogni id di `userMedalIds` compare in `userMedals` della risposta (cella impilata: l'id della cella, cioe' la prima copia), e due estrazioni di fila restituiscono lo stesso id di cella;
- banner `catalogOnly`: rifiuto `{ret}` senza addebito;
- salvataggio con `limitedDrawTicket2: 4` e nessun `drawTickets`: dopo il primo `/gacha/list`, `userPoint.limitedDrawTicket2` vale 4 e il salvataggio ha `drawTickets.draw === 4`;
- `grantItem(41, 0, 3)` -> `drawTickets.draw` +3;
- bonus: banner con `bonus [[5, 48, 2]]`: dopo l'estrazione `player.presents` ha una voce `resourceType 5`, `resourceId 48`, `number 2`;
- SKILL: banner con `skill {table: '50106', slots: 'first'}`: la risposta contiene in `userSkills` un oggetto con `userMedalId` della prima medaglia e `level 1`, e `player.medalSkills[userMedalId]` esiste;
- catalogo assente: lista con la sola piastra 9001, estrazione rifiutata.

- [ ] **Step 2: Verificare che falliscano**

Run: `node server/test-gacha-server.js` -> `ERRORI`.

- [ ] **Step 3: Implementazione**

Nel blocco Shop > Draw:
- `GACHA_FILE` default `game_data/gacha_catalog.json`; `GACHA_SHOW = new Set((process.env.KHUX_GACHA_SHOW || '').split(',').filter(Boolean))`; togliere `GACHA_TEST`.
- `gachaCatalog()` memorizza `gachaData.loadCatalog(GACHA_FILE)` con i banner passati da `sanitizeBanners`; `reloadGachaBanners()` azzera.
- `sanitizeBanners(catalog)`: per ogni banner non `catalogOnly` e non `evolve`, espande il pool alla data piu' larga (`asOf(b, '2021-06-29')`) e lo scarta (`console.log` come oggi) se uno slot non ha medaglie alla sua stella o sotto. Le medaglie impilabili non entrano gia' nel catalogo (`validPack != 1`, Task 3), tranne `evolve`.
- `storyCtx()` = `{ storyQuest: stageNumber(lastStoryStageId()), storyDay: gachaData.storyDay(cat, storyQuest) }`.
- `expandFor(b)` = `gachaData.expandPool(b, cat, gachaData.asOf(b, storyCtx().storyDay))`, con cache per `drawMedalTypeId + asOf` (Map, svuotata da `reloadGachaBanners`).
- `respondGachaList`: `gacha.gachaListData(cat.banners, player, { realMs, webBase: WEB_BASE, sizes: GACHA_SIZES, show: GACHA_SHOW, ...storyCtx() })`; `savePlayer()` se `ticketsOf` ha migrato o `listedCurrency` e' cambiato.
- `respondGachaDraw`: `checkDraw(..., { ...storyCtx(), show: GACHA_SHOW, ... })`; `const ex = expandFor(banner)`; `rollDraw(banner, ex, Math.random, gacha.drawState(player, banner))`; dopo `grantItem(3, medalId, 1)` l'id da restituire e' quello della cella: `const cell = stackedMedalList().find((c) => c.copies.includes(newId)); userMedalIds.push(cell ? cell.userMedalId : newId)` ([fn]: il client cerca l'id in userMedals; per le impilabili la cella ha l'id della prima copia, `stackedMedalList`); `firstGetUserMedalIds` come oggi ma con l'id della cella. Abilita': per ogni slot `i`, `const sk = gachaData.rollSkill(banner.skill, i, skillRowsById(), Math.random)`; se c'e' e la medaglia non e' impilabile: `player.nextUserSkillId = (player.nextUserSkillId || 0) + 1; (player.medalSkills ||= {})[newId] = { userSkillId: player.nextUserSkillId, skillId: sk, level: 1, exp: 0, getDatetime: realNow() }` (stesso formato dell'Overwrite, ~riga 2491); `inventoryBlocks` manda gia' `userSkills` delle medaglie toccate (verificarlo nel test). `gacha.payDraw(banner, player, realMs, featured)`; per ogni voce di `banner.bonus`: `addPresent(type, id, n, 'Bonus: ' + banner.name)` (il Present Box lo mostra; spec 9.2); log col prezzo restituito.
- `respondGachaWeb`: catalogo con `stateOf` (ctx con `shown` = id della lista attuale), dettagli con `expandFor(banner)` per qualunque banner del catalogo (anche bloccato o solo catalogo: la pagina mostra cosa conterrebbe), odds.
- `userPointData`: `limitedDrawTicket2: gacha.ticketsOf(player)[player.gacha?.listedCurrency || 'draw'] || 0`.
- `grantItem` tipo 41: `gacha.ticketsOf(player).draw += num` (commento: le valute stagionali arrivano con le loro Limited, sotto-progetto 3).

Notices (`routes-info-album.js`), testi in inglese:
- `DIFFERENCES_BODY`: sostituire la riga delle probabilita' con «Shop draw rates are reconstructed where the original game did not publish them (Medal rarities, guarantees and Skill rates are original): Draw Odds and each banner's Details say so.» e aggiungere «Bonus items of a draw (Magic Mirror, Gems...) arrive in your Presents.» e «Free draws cost 1 Jewel. VIP Free Deals are open to everyone, with one free VIP draw per day in total.» e «Seasonal draw currencies (Spooky Cookies, Moogle Points, Holiday Draw Tickets) are kept separately; the Shop shows one of them at a time.»
- notizia «Shop»: aggiungere «Every original banner is in the Banner Catalog. Until the next update the Shop lists the banners that were running at your point in the Story; banners unlock with the Story, as in the original game.»
Aggiornare `test-notices.js` se controlla il numero di righe.

- [ ] **Step 4: Test**

Run: `node server/test-gacha-server.js`, `node server/test-gacha.js`, `node server/test-gacha-data.js`, `node server/test-make-banners.js`, `node server/test-notices.js`, `node server/test-beginner.js`, `node server/test-medal-guilt.js "$PWD/server"` -> tutti `OK`.

- [ ] **Step 5: Commit**

```bash
git -c safe.directory=* add server/server.js server/routes-info-album.js server/test-gacha-server.js server/test-notices.js
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_sp2_t8.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 9: revisione 119, prove al banco e documentazione

Modello consigliato: Opus (banco).

**Files:**
- Modify: `tools/ldplayer/session/run-server.ps1`, `relogin.ps1`, `cycle.ps1`, `update-resources.ps1` (default 118 -> 119; `-GachaTest` -> `[string]$GachaShow` che imposta `$env:KHUX_GACHA_SHOW`)
- Modify: `docs/notes/shop.md`, `docs/ISSUES.md`, `HANDOFF.md`, `docs/notes/server.md`

- [ ] **Step 1: Generazione**

Copia del salvataggio in `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-sp2` (se non gia' fatta al Task 1). Poi:
`python recon/tools/make_banner_catalog.py`, `python recon/tools/make_banner_images.py --mode <decisione>`, `node server/make-banners.js`.

- [ ] **Step 2: Script e revisione 119**

Default 118 -> 119 nei quattro script; `-GachaShow` passato fino a `run-server.ps1`. `.\tools\ldplayer\session\update-resources.ps1 -Revision 119` (nessuna risorsa nuova: solo master). Expected: `GET /master/drawMedalType` nel log, home raggiunta.

- [ ] **Step 3: Prove al banco (in serie, `AppAlive` prima di ogni tocco, SKIP nei dialoghi, screenshot `Shot sp2_<nome>`)**

1. Shop > Draw con la storia attuale: piastra Catalog + i banner attivi alla data del punto nella storia (annotare quali e confrontarli con `shopBanners` calcolato a mano); immagini corrette.
2. Details della Catalog: elenco di 808 banner che scorre senza blocchi, stati («In the Shop now», «Unlocks after Story Quest N — coming with a future update», «VIP variant, not reproduced»); aprire tre dettagli (uno bloccato del 2019, uno SKILL, un Platinum).
3. Estrazione x3 o x10 da un banner della lista; medaglie del periodo giusto (confronto con il log `[gacha]`); jewel scalati come il prezzo della piastra.
4. Banco con `relogin.ps1 -Tag s7 -GachaShow B0306` (7★ Medal Deal, id >= 300000) e jewel sufficienti: animazione e risultato corretti con medaglie 7★ (spec 9.3, prova obbligatoria). Se crasha: fermare tutto, `tools\ldplayer\armtrace\tombstone.ps1`, annotare e aprire un ISSUE; il Task resta aperto finche' non e' chiaro.
5. Platinum Ticket Draw: `-GachaShow B0456`, 1 biglietto Platinum nel salvataggio (a server fermo); estrazione x5: Dual Meow Wow LV7-9 nell'elenco, impilati in una cella; seconda estrazione con un altro biglietto: la cella cresce, nessun crash.
6. Prezzo calante: `-GachaShow` con un banner FALLING del catalogo che abbia `lotCount` 10 (sceglierlo da `gacha_catalog.json`); dopo una estrazione la piastra mostra lo scalino successivo.
7. Free Deal VIP: `-GachaShow` con due Free Deal VIP; la prima estrazione costa 1 Jewel, poi entrambe risultano esaurite fino al giorno dopo.
8. Dieci aperture dello Shop: nessun crash. Notices: righe nuove.
Tornare al server normale (senza `-GachaShow`) e ripristinare biglietti e jewel usati per le prove dal backup se servono.

- [ ] **Step 4: Documentazione**

`docs/notes/shop.md`: sezione «Sotto-progetto 2» (catalogo generato e suo formato, comandi nell'ordine, lista provvisoria, regole di prezzo/valute/limiti/pity/abilita', esiti delle prove con i nomi degli screenshot, decisione palette/full). `docs/ISSUES.md`: ISSUE aperti per quanto emerso (es. righe ancora `INCOMPLETE`, banner scartati da `sanitizeBanners`), «ultimo» aggiornato. `HANDOFF.md`: Shop sotto-progetto 2 fatto, BASE 119, comandi di generazione. `docs/notes/server.md`: BASE 119, `KHUX_GACHA_SHOW`.

- [ ] **Step 5: Commit**

```bash
git -c safe.directory=* add tools/ldplayer/session/run-server.ps1 tools/ldplayer/session/relogin.ps1 tools/ldplayer/session/cycle.ps1 tools/ldplayer/session/update-resources.ps1 docs/notes/shop.md docs/ISSUES.md HANDOFF.md docs/notes/server.md
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_sp2_t9.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```
