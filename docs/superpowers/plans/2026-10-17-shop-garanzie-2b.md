# Shop, sotto-progetto 2b: garanzie e medaglie potenziate — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ogni estrazione da' le medaglie come le dava il banner originale: ogni garanzia sul suo slot, il Tier promesso, la pity sul bersaglio e alla stella scritti, il contatore giallo «X guaranteed in N tries!» nella striscia, le medaglie gia' potenziate (guilt e pallini preimpostati, boosted, abilita' al livello massimo) e il popup «NOVA LEVEL UP!» che ne segue.

**Architecture:** un modulo Python nuovo (`recon/tools/banner_guarantees.py`) legge le frasi delle note e scrive nel catalogo `guarantee.slots[]`, i campi della pity e `enhance` (potenziamenti per banner), con una tabella di override scritta a mano; `make_banner_catalog.py` lo chiama e aggiunge il Tier alle medaglie. Il master riceve righe `medal` boosted (modulo `server/medal-boost.js`, script `server/make-boosted-medals.js`) e i campi della striscia in `drawMedalType` (`server/make-banners.js`). Il server estrae dagli slot (`server/gacha-data.js`), applica i potenziamenti alla consegna (`server/server.js`) e compila la piastra con il contatore (`server/gacha.js`). Le risorse 41 aggiungono i LWF JP del popup del Nova (logo rifatto «NOVA»), `Draw_StatusBonus`, le texture `_SB` e il layout `MedalInfo_Burst_Info.json`.

**Tech Stack:** Node (server, nessuna dipendenza esterna), Python 3 + Pillow (`recon/tools`), PowerShell (banco LDPlayer).

**Spec:** `docs/superpowers/specs/2026-10-17-shop-garanzie-2b-design.md` (la sezione 8 «Esiti della ricerca» sostituisce le ipotesi di 4.4-4.6). Fonti: `D:\Progetto_Restauro_KH_UX\tmp\sp2b\research.md` (indirizzi, campi, file da importare), `D:\Progetto_Restauro_KH_UX\tmp\sp2\audit-guarantees.md` (sezioni 3-4: classi D1-D13, regex, assegnazione degli slot, esiti attesi; sezione 6: non riproducibili), `D:\Progetto_Restauro_KH_UX\tmp\sp2b\decisioni.md`, `D:\Progetto_Restauro_KH_UX\tmp\sp2b\video-LFJ5.md` (fotogrammi in `reference\shop_boosted`, `reference\nova_lvup`). Piano precedente: `docs/superpowers/plans/2026-10-16-shop-banner-originali.md`; note `docs/notes/shop.md`, `guilt.md`, `medaglie.md`, `battaglia.md`, `risorse_layout.md`, `banco.md`, `server.md`.

## Global Constraints

- APK originale non modificato: si cambiano solo risposte del server, tabelle master, risorse scaricabili e pagine WebView.
- Repo: solo codice e documentazione nostri. Dati derivati e asset fuori da git: `server/master_data/`, `server/game_data/`, `server/save/`, LWF e immagini importati (`raisedraw_gen`, `stage_gen`), logo NOVA generato. Nel repo solo script, tabelle di override scritte da noi (con la fonte) e note.
- Git: sempre `git -c safe.directory=*`; messaggio in un file UTF-8 senza BOM in `D:\Progetto_Restauro_KH_UX\tmp\msg_*.txt` scritto col tool Write, poi `git commit -F <file>`; `git pull --rebase` prima di `git push`; messaggi in italiano che finiscono con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; file per nome, mai `git add -A`. Commit e push a ogni task verificato.
- Byte di controllo: dopo ogni scrittura, `python -c "import sys;d=open(sys.argv[1],'rb').read();print([i for i,b in enumerate(d) if b<32 and b not in (9,10,13)][:5])" <file>` deve stampare `[]` (`\t` solo nei TSV).
- Codice e commenti in italiano, nello stile dei file vicini. Testi mostrati al giocatore in inglese.
- Test: script autonomi (`node server/test-<nome>.js`, `python recon/tools/test_<nome>.py`) che stampano `OK: ...` o `ERRORI (n)` ed escono con 1; mai il salvataggio vero (`KHUX_SAVE` in una cartella temporanea).
- Master: ogni cambio = revisione nuova. Oggi BASE 120; questo piano la porta a **121** (Task 4) nei 4 script di sessione (`run-server.ps1`, `relogin.ps1`, `cycle.ps1`, `update-resources.ps1`); un altro cambio di master dopo il Task 4 = 122, e cosi' via.
- Risorse: ogni cambio = versione nuova. Oggi 40; questo piano porta la **41** (Task 10), versione completa solo a banco fermo (`build-resources.ps1 -Version 41`), poi `update-resources.ps1`. Mai `-Quick` se esiste una versione piu' nuova di quella installata.
- Nessuna medaglia prima della sua data (spec 9.3 del sotto-progetto 2: niente 6★ prima del 15/07/2016, niente 7★ prima del 25/05/2018) ne' fuori dal Tier promesso; la pity a stella fissa non scavalca la data.
- Compatibilita': `guarantee.list/count/slot` del sotto-progetto 2 restano scritti e validi (prima riserva a lista); il server usa `slots[]` se c'e', altrimenti il percorso vecchio.
- Ogni differenza dall'originale va spiegata nelle Notices in gioco, in inglese (la «small chance» boosted ricostruita al 5%, le Trait Medal, le abilita' mancanti).
- Banco: tocchi solo a gioco vivo (`AppAlive`); SKIP in ogni dialogo che lo mostra; copia del salvataggio prima delle prove; un solo script alla volta; stop immediato dopo un crash (`tools\ldplayer\armtrace\tombstone.ps1`); screenshot confrontati con `reference\shop_boosted` e `reference\nova_lvup`; file pesanti in `D:\Progetto_Restauro_KH_UX\tmp`.

## Review Focus

1. **Nessuna medaglia prima della data**: una pity con `pityStar` 7 su un banner del 2017, o 6★ su un banner 5★ del 2016 (D8), da' la variante piu' alta gia' uscita, mai la 7★/6★ futura; le liste a 6★ (decisione 1) non promuovono a 7★ medaglie che hanno solo la 7★ (test nel Task 5).
2. **Tier rispettato**: lo slot `tier` di B0306 (`tierMax 4`) non da' mai una 7★ di Tier 5-10, neppure con la salita dello slot; pool vuoto -> senza filtro con log, mai un'eccezione (test nel Task 5).
3. **Pity sullo slot giusto**: B0321 rimpiazza lo slot 1 (la riserva che contiene Prime - Illustrated Axel), non lo slot 0 del Tier; B0319 rimpiazza il primo 6★ e lascia il 7★; uno slot a lista sostituito resta garantito solo se il bersaglio e' nella lista (test nei Task 1 e 5).
4. **Striscia senza crash**: con `validComment 0` il client legge i nomi di `warrantMedalIds`; una lista vuota manda in crash. Ogni piastra di un banner con `validComment 0` ha `warrantMedalIds` non vuota, e se la pity non ha bersagli alla data `userWarrantDisplayOfTime` vale 0 (striscia nascosta) (test nei Task 4 e 6).
5. **Boosted che non rompono celle, Evolve e cataloghi**: le righe boosted (`groupId` != 0) non entrano in `medals[n].ids` del catalogo ne' nelle ricerche per nome (supernova, blue-fairy, bonus), hanno `validPack 0` (cella propria), lo stesso `evolveId` della normale, e un salvataggio con una boosted si ricarica identico (test nei Task 1, 3 e 6).
6. **Nova contato una volta**: una boosted e la sua normale contano come una medaglia sola per il +1/+5 del Nova (chiave `groupId || medalId`), e una medaglia estratta gia' al massimo appare in `guiltBurstFirstUserMedalIds` e `guiltBurstMaxUserMedalIds` della risposta di `/gacha/draw` (test nel Task 6).

## Incertezze rimaste dalla ricerca (ognuna con il suo passo di verifica)

| # | Incertezza | Scelta di partenza | Verifica |
|---|---|---|---|
| U1 | `minCost` della riga boosted | `minCost - 10` (tetto di Cid invariato) | Task 10 passo 5: dettaglio di una boosted con Cid; il `MinusNum_Label` non va oltre il tetto |
| U2 | Effetto di `groupId` sui pallini (il server fonde boosted e normale in `medal-guilt.js groupOf`) e nell'anteprima del Level Up | fusione permessa | Task 10 passo 5: Level Up normale -> boosted, anteprima e risultato coerenti, nessun crash |
| U3 | Nome con «&» in `warrantMedalIds` (parser XML della striscia) | nomi cosi' come sono (`validComment 0`) | Task 10 passo 4 su un banner con pity su un nome con «&»; se il testo si rompe, `WARRANT_XML_SAFE = true` in `make-banners.js` (Task 4) e rigenerare |
| U4 | Riquadro del messaggio per il +1 («Unlocked ...») | nessun cambio: lo decide il client | Task 10 passo 3: screenshot del +1 e del +5 contro `reference\nova_lvup` |
| U5 | `displayId` della boosted per le medaglie con `displayId` diverso da 0/100/200/300/1100/1200/1300 (la maggior parte: es. 31013) | `1` (boosted senza badge) | Task 3 passo 1: lettori di +0x18 nel decompilato prima del codice |
| U6 | medalId boosted >= 1.000.000 (`variante * 1000000 + medalId`) accettato dal client | si' (uint32) | Task 3 passo 1 (parser `FUN_00efce88`) e Task 10 passo 5 |
| U7 | Nova della boosted (prima copia per medalId o per gruppo) | per gruppo (Review Focus 6) | Task 10 passo 5 (nessun +1 per una boosted di una medaglia gia' guiltata) |

---

## File

| File | Stato | Responsabilita' |
|---|---|---|
| `recon/tools/banner_guarantees.py` | nuovo | frasi -> `slots[]`, pity (`pityNames/pityStar/pitySlot/pityGift`), `enhance` (preset, boosted, maxSkill); override a mano con la fonte |
| `recon/tools/test_banner_guarantees.py` | nuovo | frasi reali dell'audit e della ricerca come casi |
| `recon/tools/make_banner_catalog.py` | modifica | chiama `banner_guarantees`; Tier in `medals[n].ids`; esclude le righe boosted; date di B0199-B0203; `align_debut_dates` su pity e slot |
| `recon/tools/banner_overrides.tsv` | modifica | campo `start_pt` per B0199-B0203 (notice) |
| `recon/tools/test_make_banner_catalog.py` | modifica | integrazione sul catalogo vero |
| `server/medal-boost.js` | nuovo | id, riga e indice delle boosted |
| `server/make-boosted-medals.js` | nuovo | aggiunge le righe boosted a `master_data/medal.json` (idempotente) |
| `server/make-game-tables.js` | modifica | chiama `make-boosted-medals` in fondo |
| `server/test-medal-boost.js` | nuovo | prove delle boosted |
| `server/make-banners.js`, `server/gacha-data.js` (`drawMedalTypeRow`) | modifica | campi della striscia (`warrantDisplayOfTime`, `validComment`, `warrantNumberOfTime`) |
| `server/gacha-data.js` | modifica | pool con Tier e stelle della pity, estrazione dagli slot, boosted, potenziamenti per slot, `slotOdds` per riserva |
| `server/gacha.js` | modifica | piastra con `userWarrantDisplayOfTime`/`warrantMedalIds`; pagine (Task 7) |
| `server/server.js` | modifica | consegna dei potenziamenti, regalo della pity, liste del Nova nella risposta |
| `server/guilt-burst.js` | modifica | chiave di gruppo; popup acceso per default (Task 10) |
| `server/routes-info-album.js` | modifica | Notices |
| `recon/tools/import_jp_raisedraw.py`, `test_import_jp_raisedraw.py` | modifica | LWF JP del popup, `Draw_StatusBonus`, texture `_SB` |
| `recon/tools/jp_coco_layouts.txt` | modifica | `MedalInfo_Burst_Info.json` |
| `recon/tools/make_nova_logo.py`, `test_make_nova_logo.py` | nuovi | logo «NOVA» 422x142 e bagliore `_B` dai fotogrammi |
| `tools/ldplayer/session/*.ps1` (4 script + `build-resources.ps1`) | modifica | revisione 121; logo nel build |
| `docs/notes/shop.md`, `guilt.md`, `battaglia.md`, `docs/ISSUES.md`, `HANDOFF.md`, `docs/notes/server.md` | modifica | stato |

## Contratto del catalogo (campi nuovi di `server/game_data/gacha_catalog.json`, `version` 3)

```json
{
  "medals": {"hd axel": {"date": "2016-...", "ids": [[1201, 5, "2016-...", 4], [300721, 7, "2018-05-14", 4]]}},
  "banners": [{
    "rowId": "B0306",
    "guarantee": {
      "list": ["illustrated kairi [ex]", "..."], "count": 1, "slot": 1, "pity": 5, "every": null, "featured": ["hd axel"],
      "slots": [
        {"kind": "tier", "slot": 0, "count": 1, "star": 7, "names": [], "tierMin": null, "tierMax": 4},
        {"kind": "list", "slot": 1, "count": 1, "star": 6, "names": ["illustrated kairi [ex]", "..."], "tierMin": null, "tierMax": null}
      ],
      "pityNames": ["hd axel"], "pityStar": 7, "pitySlot": 0, "pityGift": null,
      "erratum": null, "source": null
    },
    "enhance": {
      "preset": [{"on": {"slots": [0]}, "dots": "max", "guilt": "max"}],
      "boosted": [{"on": {"names": ["dark riku"]}, "str": 1000, "def": 1000, "chance": "small"}],
      "maxSkill": [{"on": {"names": ["zexion [+]"]}, "skills": ["paralysis+ ii max"]}],
      "notReproduced": ["trait"]
    }
  }]
}
```

- `medals[n].ids[i][3]` = Tier = `medal.json.guiltValue` (0 se assente).
- `slots[].kind`: `list` (lista o medaglia nominata), `tier` (`tierMin`/`tierMax`, `names` alternativi facoltativi: lo slot accetta il Tier **oppure** un nome), `trait` (slot generico riservato). `slot` = primo indice in `slotRarities`; gli altri `count-1` seguono. `star` = stella dello slot assegnato.
- `pityStar`: stella fissa della pity; `pitySlot`: indice sostituito; `pityGift`: `[3, medalId, 1]` quando il bersaglio e' una medaglia di supporto del master (va nel Present Box), altrimenti `null`; un bersaglio che non c'e' ne' nel catalogo ne' nel master -> `pity: null` e `"pity"` in `notReproduced`.
- `enhance.*.on`: `{"slots": [i...]}`, `{"names": [...]}` o `{"star": 7}`. `dots`: intero, `[min, max]` o `"max"`; `guilt`: `"max"` o `null`. `chance`: `"small"` (5% per slot idoneo, ricostruita) o `"guaranteed"`. `str`/`def` in punti base (1000, 2000).
- `erratum`: testo inglese per i Details (B0419/B0421); `source`: fonte dell'override (`notice 37207`, `image 10678`).

---

### Task 1: riserve degli slot, pity e Tier nel catalogo

Modello consigliato: Opus (molte regole e override, riscontro con l'audit).

**Files:**
- Create: `recon/tools/banner_guarantees.py`, `recon/tools/test_banner_guarantees.py`
- Modify: `recon/tools/make_banner_catalog.py` (`guarantee_of` ~332, `guarantee_slot` ~377, `align_debut_dates` ~395, `extend_medals`/lettura di `medal.json`, `build_catalog` ~751), `recon/tools/banner_overrides.tsv`, `recon/tools/test_make_banner_catalog.py`

**Interfaces:**
- Consumes: `make_banner_catalog.list_names`, `_cut`, `NUM`, `LISTRE`, `norm` (riusati, non duplicati); `slotRarities` = il mix espanso (`[r for r, n in mix for _ in range(n)]`).
- Produces (Task 2, 5, 7):
  - `parse_reservations(text: str) -> list[dict]` (riserve in ordine di testo, senza `slot`)
  - `assign_slots(reservations: list[dict], mix: list[list[int]]) -> list[dict]` (con `slot` e `star`)
  - `pity_of(text: str, featured: list[str], slots: list[dict], mix) -> dict` (`pity, pityNames, pityStar, pitySlot`)
  - `guarantee_v3(row, notes, mix, featured, medal_rows) -> dict` (il blocco `guarantee` del contratto, con `list/count/slot` compatibili)
  - `SLOT_OVERRIDES: dict[rowId, dict]` (campi che sostituiscono quelli calcolati, sempre con `source`)
  - catalogo `version: 3`, `medals[n].ids` a 4 campi

- [ ] **Step 1: Test che falliscono**

`recon/tools/test_banner_guarantees.py`, stile di `test_banner_sources.py`. Frasi reali (catalogo e audit):

```python
B0306 = ("Guarantees one Tier 4 or lower 7★ Medal. Guarantees one of the following Medals: Illustrated Kairi [EX], "
         "Illustrated Xion [EX], HD Zack, Yuna & Rikku & Paine, The World Ends with You Art 2, HD Pete, HD Zexion, HD Larxene. "
         "If bought 5 times, at least one 7★ HD Axel is guaranteed.")
s = g.assign_slots(g.parse_reservations(B0306), [[7, 1], [6, 1], [5, 8]])
check(s[0] == {'kind': 'tier', 'slot': 0, 'count': 1, 'star': 7, 'names': [], 'tierMin': None, 'tierMax': 4}, 'B0306 tier')
check(s[1]['kind'] == 'list' and s[1]['slot'] == 1 and s[1]['star'] == 6 and len(s[1]['names']) == 8
      and 'yuna & rikku & paine' in s[1]['names'], 'B0306 lista sul 6')
p = g.pity_of(B0306, ['hd axel'], s, [[7, 1], [6, 1], [5, 8]])
check(p == {'pity': 5, 'pityNames': ['hd axel'], 'pityStar': 7, 'pitySlot': 0}, f'B0306 pity {p}')

B0321 = "Guarantees one Tier 4 7★ Medal. Guarantees one 6★ Prime - Illustrated Axel. If bought 5 times, at least one 7★ Prime - Illustrated Axel is guaranteed."
s = g.assign_slots(g.parse_reservations(B0321), [[7, 1], [6, 1], [5, 8]])
check(s[0]['tierMin'] == 4 and s[0]['tierMax'] == 4 and s[1]['names'] == ['prime - illustrated axel'] and s[1]['slot'] == 1, 'B0321')
check(g.pity_of(B0321, ['prime - illustrated axel'], s, [[7, 1], [6, 1], [5, 8]])['pitySlot'] == 1, 'B0321 pity sulla riserva')

B0397 = "Guarantees one 6★ Prime - KH Cloud. Guarantees one Trait Medal #48. If bought 5 times, at least one 7★ Prime - KH Cloud is guaranteed."
s = g.assign_slots(g.parse_reservations(B0397), [[6, 2], [5, 8]])
check([x['kind'] for x in s] == ['list', 'trait'] and [x['slot'] for x in s] == [0, 1], 'B0397')
check(g.pity_of(B0397, ['supernova - sephiroth', 'prime - kh cloud'], s, [[6, 2], [5, 8]]) ==
      {'pity': 5, 'pityNames': ['prime - kh cloud'], 'pityStar': 7, 'pitySlot': 0}, 'B0397 pity 7 sulla lista')
```

Altri casi (stessa forma):
- B0629 (`[[7,1],[6,3],[5,6]]`, testo «Guarantees one of the following Medals: SN++ - Rock Troll, ... or SN+ - Parasol Beauty. Guarantees three of the following Medals: ...»): due riserve `list`, slot 0 count 1 e slot 1 count 3 (stelle 7 e 6);
- B0051 «Guarantees at least three medals with a SAB of 3 or higher» con `[[5,3],[4,7]]`: `{'kind': 'tier', 'count': 3, 'tierMin': 3, 'tierMax': None}` sugli slot 0-2; B0046 «(with Level 3 SAB)» -> `tierMin 3` (ricerca §3, incerto: annotato nel commento);
- B0355 «one 7★ Tier 3 or 4 Medal» -> `tierMin 3, tierMax 4`; «Tier 6, Tier 7, or Tier 8 7★» (B0419) -> `6..8`;
- B0750 «Guarantees two SN+ or SN++ Medals»: `list` count 2 con `names` = nomi del pool che iniziano con `sn+ - `, `sn++ - `, `supernova+ - ` (risolti in `guarantee_v3`);
- decisione 5: B0319 (mix con slot 0 a 7★, pity «one 6★ X» senza riserva che contenga X) -> `pitySlot` = primo slot 6★, e se non ce ne sono il primo 5★;
- nessun conflitto: `assign_slots` con piu' riserve di quanti slot ha la stella -> la riserva in eccesso prende i primi liberi dall'alto e la funzione registra `conflict: True` sulla riserva (contato nel Task 1 Step 4);
- `SLOT_OVERRIDES` contiene B0678 (`count 1`, `source 'image 10678'`), B0733 (due liste: 3 SN+/SN++ sui 7★, 7 KH III sui 6★), B0740 (come l'immagine 10740: 1 delle 3 Halloween + 3 SN+/SN++ sui 7★; la lista KH III x5 sui 6★ se i nomi sono nelle note, altrimenti generici), le D5 (B0049, B0055, B0372, B0695, B0721, B0725, B0726, B0734, B0739), B0419 (`pityNames ['hd aced [ex+]']`) e B0421 (`['hd gula [ex+]']`) con `erratum`, e ogni voce ha `source`.

In `test_make_banner_catalog.py`, integrazione (solo se esistono i file veri):

```python
cat = m.build_catalog(m.default_inputs()); B = {b['rowId']: b for b in cat['banners']}
check(cat['version'] == 3 and all(len(i) == 4 for v in cat['medals'].values() for i in v['ids']), 'Tier nelle medaglie')
check(not any(i[0] >= 1000000 for v in cat['medals'].values() for i in v['ids']), 'nessuna boosted nel catalogo')
check(sum(1 for b in cat['banners'] if any(s['kind'] == 'tier' for s in b['guarantee']['slots'])) == 178, 'banner con Tier')
check(not [b['rowId'] for b in cat['banners'] if any(s.get('conflict') for s in b['guarantee']['slots'])], 'nessun conflitto')
check(B['B0199']['start'] == '2017-11-24' and B['B0199']['guarantee']['pity'] == 20, 'B0199 data dal notice')
check(B['B0629']['guarantee']['slots'][1]['count'] == 3 and B['B0678']['guarantee']['slots'][0]['count'] == 1, 'D3/D4')
check(all(B[r]['guarantee']['pityStar'] == 7 for r in ['B0365', 'B0397', 'B0411', 'B0425', 'B0426', 'B0427', 'B0459']), 'D9 a 7')
check(B['B0230']['guarantee']['slots'] and B['B0246']['guarantee']['slots'], 'D6 liste piene alla data')
```

- [ ] **Step 2: Verificare che falliscano**

Run: `python recon/tools/test_banner_guarantees.py` -> ImportError. Run: `python recon/tools/test_make_banner_catalog.py` -> `ERRORI`.

- [ ] **Step 3: Implementazione**

- `banner_guarantees.py`: regex della tabella dell'audit, sezione 4 (lista, nominata, tier, trait, SN+/SN++, pity «If bought N times ... one [N★] X» e «X is guaranteed within N draws»), dopo la pulizia del markup (`{{EX|X}}` -> «X [EX]», `{{b|X|Y}}` -> «X [Y]», `{{KA|n}}` -> «Key Art #n», `[[X]]` -> «X»; nessuno spezzamento su «Illus.», «Mr.», «Dr.», «KH 0.2»). Le frasi «every Nth draw» restano pity (decisione 3): nessun `pityMode`.
- `assign_slots`: le riserve con stella prendono i primi `count` slot liberi di quella stella, poi le altre i primi liberi dall'alto (audit sezione 4). Decisione 1 in `guarantee_v3`: in una riserva `list` su uno slot di stella S restano solo i nomi con una variante S in `medal_rows` (le Supernova solo 7★ escono dalle liste a 6★).
- `pity_of`: `pityNames` dalla frase (default `featured`), `pityStar` = stella scritta (default stella di `pitySlot`), `pitySlot` = slot della riserva che contiene un nome di `pityNames`, altrimenti primo slot di `pityStar`, altrimenti decisione 5 (primo 6★, poi primo 5★), altrimenti 0.
- `guarantee_v3` scrive anche `list/count/slot` = prima riserva `list` (compatibilita'), `pityGift` (Task 2 lo riempie), `erratum`, `source`, e applica `SLOT_OVERRIDES` per ultimo.
- `make_banner_catalog.py`: Tier come 4° campo; le righe di `medal.json` con `groupId` != 0 o `medalId >= 1000000` non entrano in nessuna tabella per nome (`extend_medals`, `resolve_name`, `bonus_of`, `evolve_of`); `align_debut_dates` considera anche `pityNames` e i `names` di `slots[]`; nuovo campo `start_pt` in `banner_overrides.tsv` (righe B0199-B0203 = `2017-11-24`, `source` = id del notice), che sostituisce la regola allargata per quei cinque.

- [ ] **Step 4: Test e numeri**

Run: `python recon/tools/test_banner_guarantees.py` -> `OK`; `python recon/tools/test_make_banner_catalog.py` -> `OK`; `python recon/tools/make_banner_catalog.py` stampa anche: banner con `slots`, con Tier (178), con pity per stella, conflitti (0), override applicati. Rieseguire lo script dell'audit (`D:\Progetto_Restauro_KH_UX\tmp\gaudit\d.js` sul catalogo nuovo) e annotare quante delle 171 discrepanze restano (atteso 0 fra D1-D11; D12 coperto dal Tier).

- [ ] **Step 5: Commit** (`msg_2b_t1.txt`)

```bash
git -c safe.directory=* add recon/tools/banner_guarantees.py recon/tools/test_banner_guarantees.py recon/tools/make_banner_catalog.py recon/tools/banner_overrides.tsv recon/tools/test_make_banner_catalog.py
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_2b_t1.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 2: potenziamenti per banner (guilt, pallini, boosted, abilita' al massimo, regalo della pity)

Modello consigliato: Opus (frasi eterogenee).

**Files:**
- Modify: `recon/tools/banner_guarantees.py`, `recon/tools/test_banner_guarantees.py`, `recon/tools/make_banner_catalog.py` (`build_catalog`)

**Interfaces:**
- Consumes: `parse_reservations`/`assign_slots` (Task 1).
- Produces (Task 3, 5, 6, 7): `enhance_of(text, slots, featured, medal_rows, skill_rows) -> dict` (il blocco `enhance` del contratto); `pity_gift(text, medal_rows) -> list | None`; nel catalogo `banner.enhance` sempre presente (liste vuote se niente).

- [ ] **Step 1: Test che falliscono** (frasi reali, ricerca §3 e catalogo)

```python
e = g.enhance_of("Even better, the 7★ Medal you receive is guaranteed to come with its Special Attack unlocked and with a maximum Special Attack Bonus!", [], [], M, S)
check(e['preset'] == [{'on': {'star': 7}, 'dots': 'max', 'guilt': 'max'}], 'B0310')
s = g.assign_slots(g.parse_reservations("Guarantees one Tier 4 or higher Medal with its special attack strengthened 1 to 3 times."), [[6, 1], [5, 9]])
check(g.enhance_of("Guarantees one Tier 4 or higher Medal with its special attack strengthened 1 to 3 times.", s, [], M, S)['preset']
      == [{'on': {'slots': [0]}, 'dots': [1, 3], 'guilt': None}], 'B0131')
check(g.enhance_of("When drawing an HD Terra [EX], it comes with its special attack strengthened 5 times", [], [], M, S)['preset']
      == [{'on': {'names': ['hd terra [ex]']}, 'dots': 5, 'guilt': None}], 'B0243')
check(g.enhance_of("she is also guaranteed to come pre-strengthened to 3 Special Attack dots!", [], ['hd naminé'], M, S)['preset']
      == [{'on': {'names': ['hd naminé']}, 'dots': 3, 'guilt': None}], 'B0166 pronome = vetrina')
check(g.enhance_of("When drawing a Trait Medal #6, it comes with its special attack strengthened 0 times", [], [], M, S)['preset'] == [], 'B0280')
check(g.enhance_of("Guarantees at least three medals with a SAB of 3 or higher", [], [], M, S)['preset'] == [], 'B0051 solo Tier')
b = g.enhance_of("Has a small chance of drawing a boosted Iago or Monstro with 1000 more base strength, or a boosted Illustrated KH II Kairi or Illustrated KH II Sora with 1000 more base strength and defense", [], [], M, S)['boosted']
check(b == [{'on': {'names': ['iago', 'monstro']}, 'str': 1000, 'def': 0, 'chance': 'small'},
            {'on': {'names': ['illustrated kh ii kairi', 'illustrated kh ii sora']}, 'str': 1000, 'def': 1000, 'chance': 'small'}], 'B0106')
```

Altri: B0104 (Dark Riku, World of Chaos, 1000/1000, small); B0514 «SN - Blitz Form Sora with 2000 more base strength and defense» -> 2000/2000; B0631 «Guarantees one boosted version of the following Medals: ...» -> `chance 'guaranteed'` con `on.slots` della riserva lista; B0324 «When drawing a Zexion [+] or Trait Medal #18, it comes with the [[Paralysis+ II Max]] skill at max level» -> `maxSkill [{'on': {'names': ['zexion [+]']}, 'skills': ['paralysis+ ii max']}]` (la Trait si ignora e `'trait'` va in `notReproduced`); B0348 «Guarantees one 7★ Tier 4 Medal with one of the following Skills at max level: [[Attack Boost VI Max]], ...» -> `on.slots` = lo slot del Tier, 7 abilita'; `pity_gift("If bought 10 times, one Dual Meow Wow [SAB LV 9] is included", M) == [3, 301684, 1]` (B0472) con una tabella `M` sintetica che contiene la riga 301684.

- [ ] **Step 2: Verificare che falliscano** — `python recon/tools/test_banner_guarantees.py` -> `ERRORI`.

- [ ] **Step 3: Implementazione**

Mappatura della ricerca §3: «maximum Special Attack Bonus»/«Special Attack Bonus maxed» -> `dots 'max', guilt 'max'`; «strengthened N times»/«pre-strengthened to N ... dots»/«N-Dot X» -> `dots N` (`1 to 3` -> `[1, 3]`; 0 -> niente); «SAB of N»/«Level N SAB»/«SAB Tier N» -> nessun preset (Tier del Task 1). Bersaglio: la riserva della stessa frase (`slots`), altrimenti i nomi della frase, «the N★ Medal» -> `star`, pronome -> `featured`. Boosted: «small chance of drawing a boosted ...» e «boosted version of ...» con «1000 more base strength» (def 0), «... and defense» (1000/1000), «2000 more ...» (2000/2000); «Guarantees one boosted version of the following» -> `guaranteed`. `maxSkill`: solo le abilita' i cui nomi normalizzati sono in `skill_rows` (`skill.json`); le altre si contano. `notReproduced`: `trait`, `imitation`, `epic`, `skill` (abilita' assenti), `pity` (bersaglio assente). `make_banner_catalog.main` stampa: banner con preset, con boosted (atteso ~40), con `maxSkill` coperto del tutto / in parte (62 in tutto), con `pityGift`.

- [ ] **Step 4: Test** — `python recon/tools/test_banner_guarantees.py` e `python recon/tools/test_make_banner_catalog.py` -> `OK`; `python recon/tools/make_banner_catalog.py` con i conteggi annotati nel registro.

- [ ] **Step 5: Commit** (`msg_2b_t2.txt`; i file di **Files** per nome, come nel Task 1)

---

### Task 3: righe boosted nel master `medal`

Modello consigliato: Opus (verifica nel decompilato prima del codice).

**Files:**
- Create: `server/medal-boost.js`, `server/make-boosted-medals.js`, `server/test-medal-boost.js`
- Modify: `server/make-game-tables.js` (in fondo, dopo `make-guilt-burst`), `server/supernova.js`/`server/blue-fairy.js` solo se cercano righe per nome senza filtro

**Interfaces:**
- Consumes: `banner.enhance.boosted` (Task 2); `medal.json`.
- Produces (Task 5, 6):
  - `VARIANTS = {'1000:0': 1, '1000:1000': 2, '2000:2000': 3}`; `boostedId(normalId, str, def) -> number` (`VARIANTS[...] * 1000000 + normalId`)
  - `boostedRow(normal, str, def) -> row`
  - `boostedIndex(medalRows) -> Map<'normalId:str:def', boostedId>`
  - `isBoosted(row) -> bool` (`groupId` != 0)
  - `make-boosted-medals.js`: `patch(masterDir, catalogFile) -> {added, kept}`

- [ ] **Step 1: Verifica nel decompilato (U5, U6)**

Nel progetto Ghidra WW 4.3.1 (un solo processo) o nelle prove di `D:\Progetto_Restauro_KH_UX\tmp\sp2b\d*.c`: elencare i lettori del campo +0x18 della riga medal oltre `FUN_0073e818`/`FUN_0073eaf0` e il tipo di medalId in `FUN_00efce88`. Expected: nessun lettore che usi `displayId` come indice di immagine o di tabella; medalId uint32. Se un lettore lo usa per altro, fermarsi e riferire prima di scrivere codice. Annotare l'esito in `docs/notes/medaglie.md` (Task 10 lo rilegge).

- [ ] **Step 2: Test che falliscono**

```js
const N = { medalId: 301993, name: 'SN++ - Master Eraqus', displayId: 300, attack: 44011, maxAttack: 44011, defense: 16591, maxDefense: 16591,
  cost: 46, minCost: 26, groupId: 0, validPack: 0, evolveId: 0, imageId: 301993, sortId: 1861 };
const r = mb.boostedRow(N, 1000, 1000);
check(r.medalId === 2301993 && r.displayId === 301 && r.groupId === 301993, 'id, badge, gruppo');
check(r.attack === 45011 && r.maxAttack === 45011 && r.defense === 17591 && r.maxDefense === 17591 && r.cost === 36 && r.minCost === 16, 'statistiche (video: Cost 36)');
check(r.imageId === N.imageId && r.name === N.name && r.validPack === 0 && r.evolveId === N.evolveId, 'stesse immagini, cella propria, stesso Evolve');
check(mb.boostedRow({ ...N, displayId: 31013 }, 1000, 0).displayId === 1 && mb.boostedRow({ ...N, displayId: 31013 }, 1000, 0).defense === 16591, 'senza badge, solo STR');
check(mb.boostedRow({ ...N, displayId: 1300 }, 1000, 1000).displayId === 1301, 'variante R');
check(mb.boostedIndex([N, r]).get('301993:1000:1000') === 2301993, 'indice');
```

Piu' `patch()` su una cartella temporanea con `medal.json` = `[N]` e un catalogo con `enhance.boosted` su «sn++ - master eraqus»: due chiamate di fila danno `{added: 1}` e poi `{added: 0, kept: 1}` (idempotente); la normale resta `groupId 0`; un nome assente si conta senza lanciare.

- [ ] **Step 3: Verificare che falliscano** — `node server/test-medal-boost.js` -> errore di modulo.

- [ ] **Step 4: Implementazione**

`boostedRow`: copia della normale con `medalId = boostedId`, `attack/maxAttack += str`, `defense/maxDefense += def`, `cost -= 10`, `minCost -= 10` (U1, minimo 0), `displayId` = normale + 1 se la normale e' in {0, 100, 200, 300, 1100, 1200, 1300}, altrimenti 1 (U5), `groupId = normal.medalId`; tutto il resto uguale (immagini, nome, burst, `guiltValue`, `addMaxAttack/addMaxDefense`, Evolve). `patch`: per ogni banner con `enhance.boosted`, ogni nome risolto in `medal.json` (righe `type 1`, `groupId 0`, tutte le stelle) e ogni (`str`, `def`) -> riga se manca; stampa aggiunte, gia' presenti, nomi assenti. `make-game-tables.js` lo chiama in fondo (dopo supernova, blue-fairy, guilt-burst) se il catalogo esiste; controllare che nessuna ricerca per nome in `supernova.js`/`blue-fairy.js` veda righe con `groupId` (filtro `!mb.isBoosted(r)` dove serve).

- [ ] **Step 5: Test** — `node server/test-medal-boost.js` -> `OK`; `node server/make-boosted-medals.js` -> numero di righe aggiunte (annotarlo); `node server/test-medal-guilt.js "$PWD/server"` -> `OK`.

- [ ] **Step 6: Commit** (`msg_2b_t3.txt`)

---

### Task 4: striscia della garanzia nel master `drawMedalType` e revisione 121

Modello consigliato: Sonnet.

**Files:**
- Modify: `server/gacha-data.js` (`drawMedalTypeRow`), `server/make-banners.js`, `server/test-make-banners.js`, `server/test-gacha-data.js` (controlli di `drawMedalTypeRow`)
- Modify: `tools/ldplayer/session/run-server.ps1`, `relogin.ps1`, `cycle.ps1`, `update-resources.ps1` (default 120 -> 121)

**Interfaces:**
- Consumes: `guarantee.pity`, `pityNames` (Task 1).
- Produces (Task 6): `drawMedalTypeRow({..., warrant})` con `warrant = {display, number, validComment}`; `make-banners.warrantOf(banner) -> {display, number, validComment}`; costante `WARRANT_XML_SAFE` (default `false`, U3).

- [ ] **Step 1: Test che falliscono**

In `test-make-banners.js`: banner con `pity 5` -> riga con `warrantDisplayOfTime 5`, `warrantNumberOfTime 5`, `validComment 0`; banner senza pity -> `warrantDisplayOfTime 1`, `validComment 1`, `warrantNumberOfTime 0` e il `comment` di oggi; con `WARRANT_XML_SAFE` acceso e un `pityNames` con «&» -> `validComment 1` e `comment` = `<important>Yuna &amp; Rikku &amp; Paine</important> guaranteed in <important>%d tries</important>!`; mai `%` sciolti fuori da `%d`.

- [ ] **Step 2: Verificare che falliscano** — `node server/test-make-banners.js` -> `ERRORI`.

- [ ] **Step 3: Implementazione** — `drawMedalTypeRow` riceve `warrant` (default `{display: 1, number: 0, validComment: 1}`, quello di oggi) e non raddoppia il `%d` del comment XML; `masterRows` usa `warrantOf`. Ricerca §2: la striscia compare solo con `warrantDisplayOfTime` != 0 e `1 <= userWarrantDisplayOfTime <= warrantDisplayOfTime`; con `validComment 0` il client scrive «`<important>`Nome`</important>` guaranteed in `<important>`N tries`</important>`!» (testi 106180302-308, gia' serviti) dai nomi di `warrantMedalIds`. Default 121 nei quattro script.

- [ ] **Step 4: Test** — `node server/test-make-banners.js`, `node server/test-gacha-data.js` -> `OK`; `node server/make-banners.js` -> 809 righe.

- [ ] **Step 5: Commit** (`msg_2b_t4.txt`; i 4 script per nome)

---

### Task 5: estrazione dagli slot, Tier, pity e boosted (`server/gacha-data.js`)

Modello consigliato: Opus.

**Files:**
- Modify: `server/gacha-data.js` (`expandPool` ~65, `pickNamed` ~139, `isListSlot` ~152, `rollDraw` ~157, `slotOdds` ~177), `server/test-gacha-data.js`

**Interfaces:**
- Consumes: contratto (Task 1-2); `boostedIndex` (Task 3) passato dal server.
- Produces (Task 6, 7):
  - `BOOST_SMALL_CHANCE = 0.05`
  - `expandPool(banner, catalog, at)` restituisce in piu' `slotNames: [[nome, peso, {rare: [ids]}] per riserva]`, `pityNames`, `pityIds`, `tiers: Map<id, tier>`
  - `rollDraw(banner, ex, rng, state, opts = {}) -> {medalIds, featured, extras}`; `opts.boostedOf(normalId, str, def) -> id | undefined`; `extras[i] = {boostedFrom: id | null, preset: {dots, guilt} | null, skills: [nomi] | null}`; `featured` = un id di `pityIds` estratto (azzera la pity)
  - `slotOdds(banner, ex) -> [[{rare, pct, kind?, tier?}]]` (`kind`: `list`, `tier`, `trait`, `pity`)
  - `reservationOf(banner, i) -> slot | null`

- [ ] **Step 1: Test che falliscono**

Catalogo sintetico come nel piano precedente, con il Tier: `hd axel` `[[51, 5, '2016-05-01', 4], [71, 7, '2018-05-14', 4]]`, `zack` `[[72, 7, '2018-05-14', 7]]`, `kairi` `[[61, 6, '2017-01-01', 3], [73, 7, '2018-05-14', 3]]`, `sn only` `[[74, 7, '2018-10-05', 10]]`. Casi:
- B0306 sintetico (`[[7,1],[6,1],[5,8]]`, slot 0 `tier` `tierMax 4`, slot 1 `list` [`kairi`, `sn only`], pity 5 su `hd axel` stella 7) a `2018-11-01`: con ogni `rng` lo slot 0 e' 71 o 73, mai 72 o 74; lo slot 1 e' sempre 61 (decisione 1: `sn only` non ha 6★); alla quinta estrazione senza vetrina (`sinceFeatured 4`) lo slot 0 e' 71 e `featured === true`;
- Tier vuoto alla data -> slot senza filtro e una riga di log, nessuna eccezione;
- pity a stella fissa prima della data: stesso banner a `2018-01-10` (niente 7★) con `pityStar 7` -> lo slot della pity da' 51 (5★), mai 71;
- pity sullo slot di una riserva lista che non contiene il bersaglio: la riserva cede lo slot alla pity solo per quella estrazione; se il bersaglio e' nella lista, la lista resta garantita;
- B0321 sintetico: `pitySlot 1` -> lo slot 0 resta del Tier;
- boosted `small`: `opts.boostedOf` che conosce `71:1000:1000 -> 2000071`, `rng` che vale 0.01 sul tiro della boosted -> `medalIds[0] === 2000071`, `extras[0].boostedFrom === 71`; con 0.5 -> 71; `guaranteed` sulla riserva lista -> sempre la boosted; senza riga boosted -> la normale, senza eccezione;
- preset: `enhance.preset [{on: {slots: [0]}, dots: [1, 3], guilt: null}]` -> `extras[0].preset` con `dots` intero fra 1 e 3; `on: {names: ['hd axel']}` -> preset solo sugli slot che danno Hd Axel; `maxSkill` -> `extras[i].skills`;
- compatibilita': un banner senza `slots` (catalogo del sotto-progetto 2) estrae come oggi (i controlli attuali di `test-gacha-data.js` passano invariati);
- `slotOdds` di B0306: slot 0 `[{rare: 7, pct: 100, kind: 'tier', tier: '<=4'}]`, slot 1 `kind: 'list'`, slot 2-9 come oggi.

- [ ] **Step 2: Verificare che falliscano** — `node server/test-gacha-data.js` -> `ERRORI`.

- [ ] **Step 3: Implementazione**

`expandPool`: le stelle di `pityStar` e di ogni `slots[].star` entrano nel pool dei nomi riservati solo se `firstRarity[star] <= at`; il Tier viene dal 4° campo. `rollDraw`: se `guarantee.slots` c'e', ogni slot riservato pesca dalla sua riserva (`list`: per nome con la vetrina a peso 2, solo varianti alla stella dello slot o sotto, niente salita sopra la stella dello slot per le liste a 6★ della decisione 1; `tier`: dal pool della stella filtrato per Tier, `names` alternativi aggiunti; `trait`: slot generico); poi la pity su `pitySlot` (stella fissa `pityStar`, se non uscita alla data la piu' alta sotto); poi i potenziamenti per slot (boosted con `rng() < BOOST_SMALL_CHANCE` solo per gli slot idonei; i tiri della boosted si fanno dopo la scelta della medaglia, cosi' i test con `seq` restano prevedibili). Senza `slots` resta il percorso di oggi (`list/count/slot`).

- [ ] **Step 4: Test** — `node server/test-gacha-data.js` -> `OK`. Sul catalogo vero: `node -e` che espande ogni banner estraibile alla sua data e fa 200 estrazioni con `Math.random`: 0 eccezioni, 0 medaglie con data > `asOf`, 0 slot `tier` fuori dal Tier quando il pool filtrato non e' vuoto.

- [ ] **Step 5: Commit** (`msg_2b_t5.txt`)

---

### Task 6: consegna al giocatore, piastra con il contatore, Nova (`server.js`, `gacha.js`, `guilt-burst.js`)

Modello consigliato: Opus.

**Files:**
- Modify: `server/server.js` (`respondGachaDraw` ~1172, `respondGachaList` ~1160, `expandFor`), `server/gacha.js` (`plate` ~77, `gachaListData`), `server/guilt-burst.js` (`refresh` ~43), `server/test-gacha-server.js`, `server/test-gacha.js`

**Interfaces:**
- Consumes: `rollDraw` con `extras` (Task 5), `boostedIndex` (Task 3), `warrantOf` (Task 4), `guiltRange` (`medal-guilt.js`), `burstDotFixes`.
- Produces: `gacha.warrantFields(banner, ex, state) -> {userWarrantDisplayOfTime, warrantMedalIds}`; `gachaListData(..., {exFor})`; risposta di `/gacha/draw` con `guiltBurstFirstUserMedalIds`/`guiltBurstMaxUserMedalIds`.

- [ ] **Step 1: Test che falliscono**

In `test-gacha.js`: `warrantFields` di un banner con pity 5 e `sinceFeatured 0, 1, 4` -> `userWarrantDisplayOfTime` 5, 4, 1 e `warrantMedalIds` = id del bersaglio alla `pityStar`; con `ex.pityIds` vuota -> `{userWarrantDisplayOfTime: 0, warrantMedalIds: [<primo id del pool>]}` (mai vuota con `validComment 0`); senza pity -> `{1, []}` (oggi).
In `test-gacha-server.js` (catalogo sintetico + master temporaneo con una riga boosted e le righe `burst`/`guiltProb` necessarie):
- estrazione con `enhance.preset [{on: {slots: [0]}, dots: 'max', guilt: 'max'}]` su una 7★ di Tier 10: la medaglia consegnata ha `burstUpperNumber` = `maxEnhanceCount` (5) e `guiltFactor` 32000 in `userMedals`, e la risposta ha il suo `userMedalId` in `guiltBurstFirstUserMedalIds` e in `guiltBurstMaxUserMedalIds` (con il popup acceso da `KHUX_GUILT_BURST_POPUP=1` nel test);
- boosted: banner sintetico con `enhance.boosted` `chance 'guaranteed'` (nessun tiro): la risposta ha il medalId boosted, presente in `userMedals`, in una cella propria; dopo un ricaricamento del salvataggio la medaglia e' identica;
- Nova per gruppo: una boosted di una medaglia gia' nel registro `first` non aggiunge livelli;
- `maxSkill` con un'abilita' presente in `skill.json`: `player.medalSkills[userMedalId].level === maxLv`; con un'abilita' assente nessuna skill e nessun errore;
- `pityGift [3, 301684, 1]` alla pity-esima estrazione: una voce nel Present Box, nessuna medaglia in piu' nel risultato;
- `/gacha/list`: la piastra del banner con pity ha `userWarrantDisplayOfTime` che scende dopo ogni estrazione senza bersaglio e torna alla pity quando il bersaglio esce.

- [ ] **Step 2: Verificare che falliscano** — `node server/test-gacha-server.js`, `node server/test-gacha.js` -> `ERRORI`.

- [ ] **Step 3: Implementazione**

`respondGachaDraw`: `rollDraw(..., { boostedOf })` con l'indice del master (memorizzato, svuotato da `reloadGachaBanners`); per ogni medaglia consegnata, se `extras[i].preset`: `setMedalState(newId, {burstUpperNumber: min(dots, maxEnhanceCount corretto), guiltFactor: guilt === 'max' ? guiltRange(guiltProb, tier).max : 0})` (con `guilt 'max'` i pallini vanno sempre al massimo, ricerca §3); se `extras[i].skills`: la prima abilita' presente (scelta a caso fra le presenti) a `level = maxLv`, stesso formato dell'abilita' estratta di oggi; `pityGift` -> `addPresent` quando la pity scatta; la risposta aggiunge `...guiltBurst().lists()`. `gacha.plate` riceve `warrantFields`. `guilt-burst.refresh`: chiave `row.groupId || row.medalId` (registro invariato per le normali). Il popup resta dietro `KHUX_GUILT_BURST_POPUP` fino al Task 10.

- [ ] **Step 4: Test** — `node server/test-gacha-server.js`, `test-gacha.js`, `test-gacha-data.js`, `test-make-banners.js`, `test-medal-boost.js`, `test-beginner.js`, `test-medal-guilt.js "$PWD/server"` -> tutti `OK`.

- [ ] **Step 5: Commit** (`msg_2b_t6.txt`)

---

### Task 7: pagine WebView e Notices

Modello consigliato: Sonnet.

**Files:**
- Modify: `server/gacha.js` (`detailPage`, `oddsPage`), `server/routes-info-album.js` (`DIFFERENCES_BODY`, notizia «Shop»), `server/test-gacha.js`, `server/test-notices.js`

**Interfaces:**
- Consumes: `slotOdds` con `kind`/`tier` (Task 5), `guarantee.*`, `enhance.*` (Task 1-2), `BOOST_SMALL_CHANCE`.
- Produces: pagine; nessuna funzione nuova per altri task.

- [ ] **Step 1: Test che falliscono**

`detailPage` di B0306 sintetico contiene «1x 7★ Tier 4 or lower», «1x one of the listed Medals (6★)», «HD Axel (7★) guaranteed within 5 draws (original)»; con `enhance.boosted small` la riga «Small chance of a boosted version (+1000 STR, +1000 DEF): 5% per eligible Medal (reconstructed)»; con preset «comes with its Special Attack Bonus maxed (original)»; con `erratum` la frase in un riquadro; con `notReproduced ['trait']` «Trait Medal: not reproduced, a regular Medal of the same rarity instead». `oddsPage` mostra `kind` per slot. `test-notices.js`: le righe nuove ci sono, la riga dei Tier «not enforced yet» e la riga unica delle Trait/boosted/strengthened non ci sono piu'.

- [ ] **Step 2: Verificare che falliscano** — `node server/test-gacha.js`, `node server/test-notices.js` -> `ERRORI`.

- [ ] **Step 3: Implementazione** — `DIFFERENCES_BODY`: togliere «Some deals limited the guaranteed Medal to a Tier range ... not enforced yet.» e sostituire la riga Trait/boosted con due: «Trait Medals no longer exist: where a deal guaranteed a Trait Medal you get a random Medal of the same rarity instead.» e «Boosted Medals: the chance of a boosted version on deals that offered one is reconstructed (5% per eligible Medal). Guaranteed max-level Skills are given only for Skills that exist in this restoration.» Le righe restano in `DIFFERENCES_BODY` (nessuna notizia nuova). Notizia «Shop»: «Guarantees work as on the original banners: the yellow line under a banner counts down the draws left to its guaranteed Medal.»

- [ ] **Step 4: Test** — i due test -> `OK`.

- [ ] **Step 5: Commit** (`msg_2b_t7.txt`)

---

### Task 8: import JP del popup del Nova e delle risorse delle boosted

Modello consigliato: Sonnet (estensione meccanica di un import esistente).

**Files:**
- Modify: `recon/tools/import_jp_raisedraw.py` (`JP` ~66, `WANTED` ~72, `main` ~206), `recon/tools/test_import_jp_raisedraw.py`, `recon/tools/jp_coco_layouts.txt`

**Interfaces:**
- Consumes: `btf.encode`; JP 4.3.1 in `thethiny_data\ KHUx data shared\khux_dev_data\data\khux_dev_jp_final_4.3.1\data\jp_final_4.3.1\`.
- Produces (Task 9, 10): nel pacchetto `raisedraw_gen\files`: `lwf/medal/guilt_bonus/GuiltBonus_BurstLvup/`, `GuiltBonus_BurstLvup_num/`, `GuiltBonus_Wfix0..9/`, `lwf/raisedraw/demo/Draw_StatusBonus/`, `img/ui/Minfo_Def12_SB.png`, `img/ui/Deck_Panel_SB.png`; opzione `--replace <published path>=<png>` (usata dal logo, Task 9); rapporto JSON con una voce per cartella.

- [ ] **Step 1: Test che falliscono**

In `test_import_jp_raisedraw.py`: `WANTED` contiene le 13 cartelle nuove con il prefisso `lwf/` (radice JP alzata a `jp_final_4.3.1`, le voci vecchie diventano `lwf/raisedraw/...`); su una radice JP sintetica con una LWF di una texture e `--replace`, la texture scritta e' quella del file di sostituzione (BTF, stesse dimensioni dichiarate, altrimenti cartella non ok); `STATIC` (`img/ui/*_SB.png`) copiati in BTF; con la vera radice JP (`--check`): tutte le cartelle nuove `ok`.

- [ ] **Step 2: Verificare che falliscano** — `python recon/tools/test_import_jp_raisedraw.py` -> `ERRORI`.

- [ ] **Step 3: Implementazione** — radice JP una cartella sopra (`jp_final_4.3.1`), `WANTED` con percorsi completi da `lwf/`; per le cartelle nuove si usa solo la fonte (1) (stesso file JP; nessun riferimento WW); `STATIC` copiati come le texture; `--replace` applicato dopo la copia. `jp_coco_layouts.txt`: riga `MedalInfo_Burst_Info.json` (usa solo `Panel03.png`, gia' servita).

- [ ] **Step 4: Test** — `python recon/tools/test_import_jp_raisedraw.py` -> `OK`; `python recon/tools/import_jp_raisedraw.py --ww D:/Progetto_Restauro_KH_UX/catalog/raisedraw_ww --out D:/Progetto_Restauro_KH_UX/tmp/sp2b/rd_check --report D:/Progetto_Restauro_KH_UX/tmp/sp2b/rd_check.json --check` -> tutte `ok` (fuori dal pacchetto vero: il banco non cambia).

- [ ] **Step 5: Commit** (`msg_2b_t8.txt`)

---

### Task 9: logo «NOVA» del popup

Modello consigliato: Opus (lavoro visivo, confronto con i fotogrammi).

**Files:**
- Create: `recon/tools/make_nova_logo.py`, `recon/tools/test_make_nova_logo.py`
- Modify: `tools/ldplayer/session/build-resources.ps1` (logo prima di `import_jp_raisedraw.py`, passato con `--replace`)

**Interfaces:**
- Consumes: `Burst_Logo.png`/`Burst_Logo_B.png` JP (422x142), fotogramma `reference\nova_lvup\02_*.jpg`; `--replace` (Task 8).
- Produces: `make_nova_logo.build(jp_logo, jp_glow, frame) -> (logo: Image RGBA 422x142, glow: Image 422x142)`; file in `D:\Progetto_Restauro_KH_UX\raisedraw_gen\nova\` (fuori da git).

- [ ] **Step 1: Test che falliscono** — `build` su immagini sintetiche: uscite 422x142, `logo.mode == 'RGBA'`; la parte dell'icona (colonne a sinistra della scritta, rilevate dall'alpha JP) identica alla JP pixel per pixel; il bagliore e' una sagoma bianca con l'alpha sfumata della nuova scritta (nessun pixel con alpha > 0 fuori dal contorno allargato di 8 px).

- [ ] **Step 2: Verificare che falliscano** — `python recon/tools/test_make_nova_logo.py` -> ImportError.

- [ ] **Step 3: Implementazione** — l'icona resta quella JP; la scritta «NOVA» si ricava dal fotogramma (ritaglio della scritta, scala e posizione della «BURST» JP, sfondo tolto con il contorno nero come bordo) nello stesso stile arancio-rosso con bordo nero; il bagliore `_B` e' la sagoma bianca sfumata (sfocatura gaussiana dell'alpha) della scritta nuova piu' l'icona JP. `main()` legge i percorsi JP dalla radice del Task 8 e scrive i due PNG.

- [ ] **Step 4: Test e controllo visivo** — `python recon/tools/test_make_nova_logo.py` -> `OK`; generare i due PNG e aprirli col tool Read accanto a `reference\nova_lvup\02_*.jpg`: stessa resa (colori, bordo, proporzioni); in caso di dubbio mostrarli all'utente prima del Task 10.

- [ ] **Step 5: Commit** (`msg_2b_t9.txt`)

---

### Task 10: risorse 41, popup acceso, prove al banco e documentazione

Modello consigliato: Opus (banco).

**Files:**
- Modify: `server/guilt-burst.js` (popup acceso per default, `KHUX_GUILT_BURST_POPUP=0` per spegnerlo), `docs/notes/shop.md`, `docs/notes/guilt.md`, `docs/notes/battaglia.md`, `docs/notes/medaglie.md`, `docs/ISSUES.md` (I-144 chiuso, I-146 resta), `HANDOFF.md`, `docs/notes/server.md`

- [ ] **Step 1: Generazione e risorse (banco fermo)**

Copia di `server\save` in `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-2b`. Poi `python recon/tools/make_banner_catalog.py`, `node server/make-game-tables.js` (righe boosted), `node server/make-banners.js`; `.\tools\ldplayer\session\build-resources.ps1 -Version 41`; `update-resources.ps1 -Revision 121`. Expected: download completato, home raggiunta, `GET /master/drawMedalType` e `/master/medal` nel log.

- [ ] **Step 2: Popup acceso** — `guilt-burst.js`: `lists()` e `gained()` mandano le copie in attesa salvo `KHUX_GUILT_BURST_POPUP === '0'`; aggiornare il commento in testa. `node server/test-gacha-server.js` -> `OK`. Commit insieme alla documentazione (Step 6).

- [ ] **Step 3: Prove al banco** (in serie, `AppAlive` prima di ogni tocco, SKIP nei dialoghi, screenshot `Shot 2b_<nome>`)

1. B0306 (`relogin.ps1 -Tag 2b -GachaShow B0306`): slot 0 7★ di Tier <= 4, slot 1 una delle 8 liste a 6★; la striscia gialla «HD Axel guaranteed in 5 tries!» scende a 4, 3, 2, 1 («1 try»), e alla quinta estrazione HD Axel 7★ esce sullo slot 0; poi la striscia torna a 5.
2. B0629: 1 New Enemy 7★ + 3 KH III 6★ in ogni estrazione (immagine 10629).
3. Banner con guilt al massimo (B0310 o un banner con preset `max` estraibile, scelto da `gacha_catalog.json`): dopo l'OK del risultato il popup «NOVA LEVEL UP!» con LV a » LV b, +1 e poi +5 con «Maxed out X's Special Attack Bonus!» e TAP SCREEN (U4: annotare se il +1 mostra il riquadro); confronto con `reference\nova_lvup`. Se `userDetail.isGuilt` e' 0 e la guilt non si vede, annotarlo (ricerca §3).
4. Banner con pity su un nome con «&» (scelto da `gacha_catalog.json`): striscia leggibile (U3); se rotta, `WARRANT_XML_SAFE = true`, `node server/make-banners.js`, revisione 122, riprova.
5. Boosted (`-GachaShow` con un banner `guaranteed`, es. B0631): fascia «BOOSTED» nel risultato, nel dettaglio STR/DEF/Cost gialli e No. della normale, targhetta LV rossa nella lista (`reference\shop_boosted`); Level Up con la normale come materiale (U2: anteprima e risultato), Cid sulla boosted (U1), nessun +1 del Nova per una boosted di una medaglia gia' guiltata (U7), Medal List ed Evolve aperti senza crash (U6).
6. Banner con abilita' al massimo (B0324 o B0348): abilita' al livello massimo nel dettaglio, se presente nel master.
7. Prova dell'utente con il salvataggio ridotto per il Nova (spec 6.6): l'utente estrae da un banner con guilt al massimo e conferma il popup.
8. Dieci aperture dello Shop e delle Notices: nessun crash, righe nuove presenti.

Dopo un crash: fermare tutto, `tools\ldplayer\armtrace\tombstone.ps1`, ISSUE aperto, il task resta aperto. Alla fine server senza `-GachaShow` e salvataggio ripristinato dal backup se le prove l'hanno alterato.

- [ ] **Step 4: Esiti delle incertezze** — per U1-U7 scrivere in `docs/notes/shop.md` (sezione «Sotto-progetto 2b») l'esito e, se una scelta cambia, il commit che la corregge (con revisione nuova se tocca il master).

- [ ] **Step 5: Documentazione** — `shop.md`: contratto v3, comandi nell'ordine, regole degli slot/pity/striscia/boosted/preset, esiti con i nomi degli screenshot. `guilt.md`/`battaglia.md`: popup acceso, LWF JP e logo NOVA, chiave di gruppo del Nova. `medaglie.md`: righe boosted e displayId. `ISSUES.md`: I-144 chiuso; nuovi ISSUE per quanto emerso. `HANDOFF.md`: risorse 41, BASE 121 (o successiva). `server.md`: `KHUX_GUILT_BURST_POPUP=0`.

- [ ] **Step 6: Commit** (`msg_2b_t10.txt`)

```bash
git -c safe.directory=* add server/guilt-burst.js docs/notes/shop.md docs/notes/guilt.md docs/notes/battaglia.md docs/notes/medaglie.md docs/ISSUES.md HANDOFF.md docs/notes/server.md
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_2b_t10.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

## Ordine e dipendenze

Task 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 (catalogo, master, server, pagine: in serie, ognuno usa le interfacce del precedente). Task 8 -> 9 sono indipendenti dai Task 1-7 e possono andare in parallelo (nessun banco). Il Task 10 parte solo con tutti gli altri chiusi; il banco resta in serie.
