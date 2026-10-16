# Shop, sotto-progetto 1: estrazioni funzionanti — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nello Shop compaiono la piastra «Banner Catalog» e tre banner originali del primo anno (Daily Deal, Small Deal, Epic Medal Carnival); x1, x3 e x10 estraggono davvero medaglie pagate in jewel, e un banner di prova a Platinum Ticket (solo con `KHUX_GACHA_TEST=1`) prova i biglietti.

**Architecture:** un generatore offline (`server/make-banners.js`) legge i dati raccolti fuori dal repo (banners_ww.tsv, wiki, medal.json) e scrive le righe del master `drawMedalType` e il catalogo `server/game_data/gacha_banners.json` con i pool di medaglie. Il server carica il catalogo (`server/gacha-data.js`, funzioni pure: estrazione e probabilita'), costruisce lista, estrazione e pagine WebView (`server/gacha.js`) e collega le rotte in `server/server.js`. Le risorse 40 aggiungono le animazioni del risultato (LWF JP) e i testi/icona della piastra Catalog.

**Tech Stack:** Node (server, nessuna dipendenza esterna), Python 3 + Pillow (strumenti in `recon/tools`), PowerShell (build delle risorse e banco LDPlayer).

**Spec:** `docs/superpowers/specs/2026-10-16-shop-banner-design.md` (sezioni 3, 4.1, 4.8, 4.10, 5, 6 punto 1, 8). Fatti del client: `D:\Progetto_Restauro_KH_UX\tmp\gacha_re\findings.md` (protocollo /gacha/draw), `D:\Progetto_Restauro_KH_UX\tmp\gacha_re\server_facts.md` (server, master, risorse), `D:\Progetto_Restauro_KH_UX\tmp\spike_catalog\notes.md` (piastra).

## Global Constraints

- APK originale non modificato: si cambiano solo risposte del server, tabelle master, risorse scaricabili e pagine WebView.
- Repo: solo codice e documentazione originali. Mai APK, asset, master data, immagini o decompilato Square Enix nel repo: `server/master_data/`, `server/game_data/`, `server/save/` sono ignorati da git; le bitmap e i LWF generati stanno fuori (stage_gen, game_data); nel repo solo gli script.
- Git: sempre `git -c safe.directory=*`; messaggio in un file UTF-8 senza BOM in `D:\Progetto_Restauro_KH_UX\tmp\msg_*.txt` scritto col tool Write, poi `git commit -F <file>`; `git pull --rebase` prima di `git push`; messaggi in italiano che finiscono con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; mai `git add -A` (aggiungere i file per nome; `.claude/` non e' tracciata). Commit e push a ogni task verificato.
- Codice e commenti in italiano, nello stile dei file vicini (commenti densi con indirizzi Ghidra e date del banco). Testi mostrati al giocatore in inglese.
- Test: script autonomi `node server/test-<nome>.js` che stampano `OK: ...` o `ERRORI (n)` ed escono con 1; mai il salvataggio vero (`KHUX_SAVE` in una cartella temporanea).
- Piastre: mai `price` 0 (estrazione senza conferma), mai `benefitId` != 0 (lucchetto: tocco = crash), mai payType 3 (conta solo payStone, che e' sempre 0) ne' payType 9 (crash dello Shop). Jewel = payType 1.
- Risposta di `/gacha/draw`: `effectNumbers` solo 0; `gachaBonus` sempre `{addType: 1, number: 0, userMedalIds: []}`; ogni id di `userMedalIds` deve comparire in `userMedals` della stessa risposta o essere gia' noto al client; al massimo 10 medaglie per estrazione.
- Ogni differenza dall'originale va spiegata nelle Notices in gioco, in inglese (probabilita' ricostruite, piastra Catalog).
- Banco: un solo processo Ghidra alla volta; tocchi solo a gioco vivo (`AppAlive`); premere SKIP nei dialoghi; copia del salvataggio prima delle prove; file pesanti in `D:\Progetto_Restauro_KH_UX\tmp`.

## Review Focus

1. Estrazione chiesta senza fondi sufficienti (client non allineato o richiesta ripetuta): il server rifiuta senza scalare nulla e senza dare medaglie.
2. Daily Deal estratto due volte lo stesso giorno: la seconda e' rifiutata e `userLimitedCount` della lista vale 0; dopo le 08:00 UTC del giorno dopo torna 1.
3. Box delle medaglie senza posti per tutta l'estrazione: rifiutata (il client controlla solo 1 posto).
4. La stessa medaglia due volte nella stessa x10: un solo id in `firstGetUserMedalIds`, tutti gli `userMedalIds` diversi e presenti in `userMedals`.
5. Catalogo dei banner assente (generatore non lanciato) o banner di prova senza `KHUX_GACHA_TEST`: la lista contiene solo la piastra Catalog (o i banner normali), nessun crash, l'estrazione e' rifiutata.

I test di questi casi sono nei Task 4 (1-4, logica) e 5 (5 e i casi 1-4 attraverso `server.js`).

---

## File

| File | Stato | Responsabilita' |
|---|---|---|
| `recon/tools/import_jp_raisedraw.py` | nuovo | copia le LWF del risultato delle estrazioni (JP 4.3.1) complete di texture in stage_gen |
| `recon/tools/make_shop_art.py` | nuovo | testi del pulsante della piastra Catalog, icona al posto del Gold Ticket «仮», banner 640x140 della piastra Catalog |
| `tools/ldplayer/session/build-resources.ps1` | modifica | lancia i due script nuovi |
| `server/gacha-data.js` | nuovo | funzioni pure: riga master, rarita' degli slot, probabilita', estrazione, caricamento del catalogo |
| `server/make-banners.js` | nuovo | generatore: drawMedalType.json, game_data/gacha_banners.json, game_data/gacha_img/ |
| `server/gacha.js` | nuovo | lista dello Shop, controlli e pagamento dell'estrazione, campi del risultato, pagine WebView |
| `server/server.js` | modifica | rotte, URL del master, link `odds`, risposte /gacha/list e /gacha/draw, immagini |
| `server/routes-info-album.js` | modifica | righe nelle Notices |
| `server/test-gacha-data.js`, `server/test-make-banners.js`, `server/test-gacha.js`, `server/test-gacha-server.js` | nuovi | prove offline |
| `tools/ldplayer/session/run-server.ps1`, `relogin.ps1`, `update-resources.ps1` | modifica | BASE 117 -> 118 |
| `docs/notes/shop.md` | nuovo | protocollo Shop/estrazioni |
| `docs/ISSUES.md`, `HANDOFF.md`, `docs/notes/server.md` | modifica | stato |

---

### Task 1: LWF del risultato delle estrazioni (risorse)

Modello consigliato: Opus (giudizio sulle texture mancanti).

**Files:**
- Create: `recon/tools/import_jp_raisedraw.py`
- Modify: `tools/ldplayer/session/build-resources.ps1` (dopo `import_jp_coco.py`, prima di `btf_fix.py`)

**Interfaces:**
- Consumes: dati JP in `D:\Progetto_Restauro_KH_UX\[local reference data]\\[local reference data]\data\[local reference data]\data\jp_final_4.3.1\lwf\raisedraw\` (sola lettura); indice servito `D:\Progetto_Restauro_KH_UX\resource_data\names_v4.tsv`; `recon/tools/btf.py` (`btf.encode(Image) -> bytes`).
- Produces: `<stage_gen>\files\lwf\raisedraw\demo\raidgacha_result_display_NN\...` (NN 02-10), `...\Medal\Medal_D_{Up,Rev,None}N\...` mancanti, `<stage_gen>\raisedraw_report.json`. Il server (Task 5) ammette `lotCount` solo fra le cartelle `raidgacha_result_display_NN` servite o complete nel rapporto.

Fatti (findings.md §4): la scena SceneDrawRaise apre `lwf/raisedraw/demo/raidgacha_result_display_%02d/` con %02d = numero di medaglie (file mancante = crash) e per ogni medaglia `lwf/raisedraw/Medal/Medal_D_Up|Rev|None<rare>` secondo `darklight`. Le risorse WW servono solo `raidgacha_result_display_01` e `Medal_D_Up3`. Nel JP le cartelle 02-10 hanno la LWF ma quasi nessuna texture (l'estrazione JP toglie i file identici): le texture si chiamano `<base>_<esadecimale UTF-8 del nome originale>.png` e sono le stesse «ビットマップ N.png» di `raidgacha_result_display_01` (servita WW). Le cartelle con `.res` lo elencano; le altre vanno lette dalla LWF.

- [ ] **Step 1: Estrarre una volta le raisedraw servite (WW)**

In `build-resources.ps1`, accanto all'estrazione `catalog\keyblade_lwf` (riga ~64, che mostra come e' impostata `BGAD_KEY`), aggiungere:

```powershell
# LWF del risultato delle estrazioni servite (raidgacha_result_display_01, Medal_D_Up3): fonte delle
# texture comuni per le cartelle 02-10 JP (import_jp_raisedraw.py)
$rw = "$D\catalog\raisedraw_ww"
if (-not (Test-Path "$rw\lwf\raisedraw")) { python -I recon\tools\res_bulk.py "$D\resource_data\names_v4.tsv" "$D\resource_data\7\data" $rw lwf/raisedraw/ }
```

Lanciare a mano lo stesso comando (stessa `BGAD_KEY`) e controllare che `D:\Progetto_Restauro_KH_UX\catalog\raisedraw_ww\lwf\raisedraw\demo\raidgacha_result_display_01\` contenga la `.lwf` e le texture.

- [ ] **Step 2: Scrivere lo script**

```python
"""LWF del risultato delle estrazioni (Shop > Draw) dai dati JP 4.3.1 per le cartelle non servite.

    python recon/tools/import_jp_raisedraw.py --ww <catalog\\raisedraw_ww> --out <stage_gen\\files>
                                              --report <stage_gen\\raisedraw_report.json> [--check]
                                              (Pillow: senza -I)

SceneDrawRaise (init [fn], docs/notes/shop.md) apre
lwf/raisedraw/demo/raidgacha_result_display_%02d/ (%02d = medaglie estratte, 1-10; file mancante =
crash) e per ogni medaglia lwf/raisedraw/Medal/Medal_D_Up|Rev|None<rare> secondo darklight.
Le risorse WW servono solo raidgacha_result_display_01 e Medal_D_Up3.
Per ogni cartella non servita: la LWF JP (revisione piu' alta, `<nome>.<8 cifre>.lwf`, come
latest() di import_jp_coco.py) e tutte le sue texture `<base>_<hex UTF-8 del nome>.png`, cercate:
(1) nella stessa cartella JP; (2) in un'altra cartella raisedraw JP con lo stesso <hex> (tutte le
copie identiche, altrimenti conflitto); (3) nelle raisedraw servite estratte (--ww) con lo stesso
<hex> (gia' BTF). Una cartella entra solo se TUTTE le texture sono trovate: mai una texture assente.
PNG JP (alpha diritta) -> BTF con btf.encode (premoltiplica); BTF WW copiati.
"""
import argparse
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import btf  # noqa: E402

sys.stdout.reconfigure(encoding='utf-8')
D = r'D:\Progetto_Restauro_KH_UX'
JP = os.path.join(D, '[local reference data]', '', '[local reference data]', 'data',
                  '[local reference data]', 'data', 'jp_final_4.3.1', 'lwf', 'raisedraw')
REV = re.compile(r'^(.*)\.(\d{8})(\.[^.]+)$')
TEX = re.compile(rb'([\x20-\x7e\x80-\xff]{1,80}?\.(?:png|PNG))')

WANTED = ([f'demo/raidgacha_result_display_{n:02d}' for n in range(1, 11)]
          + [f'Medal/Medal_D_Up{n}' for n in range(1, 13)]
          + [f'Medal/Medal_D_Rev{n}' for n in range(1, 8)]
          + [f'Medal/Medal_D_None{n}' for n in range(1, 8)])


def served_names():
    names = set()
    with open(os.path.join(D, 'resource_data', 'names_v4.tsv'), encoding='utf-8') as f:
        for line in f:
            names.add(line.split('\t', 1)[0])
    return names


def latest(folder, base, ext):
    """File <base><ext> o la revisione piu' alta <base>.<8 cifre><ext> nella cartella JP."""
    best, best_rev = None, -1
    for f in os.listdir(folder):
        m = REV.match(f)
        if m and m.group(1) == base and m.group(3) == ext and int(m.group(2)) > best_rev:
            best, best_rev = f, int(m.group(2))
        elif f == base + ext and best_rev < 0:
            best = f
    return os.path.join(folder, best) if best else None


def texture_names(lwf_path, res_path):
    """Nomi originali delle texture: dal .res se c'e' (righe lwf/.../<base>_<hex>.png), altrimenti
    dalle stringhe .png nella LWF."""
    if res_path and os.path.exists(res_path):
        out = []
        for line in open(res_path, encoding='utf-8'):
            line = line.strip()
            if line:
                hx = os.path.basename(line).rsplit('.', 1)[0].split('_')[-1]
                out.append(bytes.fromhex(hx).decode('utf-8'))
        return out
    data = open(lwf_path, 'rb').read()
    return sorted({m.group(1).decode('utf-8', 'replace') for m in TEX.finditer(data)})


def hexname(name):
    return name.encode('utf-8').hex()


def index_by_hex(root):
    """<hex> -> [percorsi] di tutte le texture <qualcosa>_<hex>.png sotto root."""
    idx = {}
    for dp, _, files in os.walk(root):
        for f in files:
            if f.endswith('.png') and '_' in f and not REV.match(f):
                idx.setdefault(f[:-4].split('_')[-1], []).append(os.path.join(dp, f))
    return idx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ww', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--report', required=True)
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    served = served_names()
    jp_idx = index_by_hex(JP)
    ww_idx = index_by_hex(os.path.join(a.ww, 'lwf', 'raisedraw'))
    report = {}
    for rel in WANTED:
        base = rel.split('/')[-1]
        target = f'lwf/raisedraw/{rel}/{base}.lwf'
        if target in served:
            report[rel] = {'status': 'served'}
            continue
        folder = os.path.join(JP, *rel.split('/'))
        lwf = latest(folder, base, '.lwf') if os.path.isdir(folder) else None
        if not lwf:
            report[rel] = {'status': 'missing-lwf'}
            continue
        files, missing, conflict = {}, [], []
        for name in texture_names(lwf, latest(folder, base, '.res')):
            hx = hexname(name)
            out_name = f'{base}_{hx}.png'
            own = os.path.join(folder, out_name)
            if os.path.exists(own):
                files[out_name] = ('jp', own)
                continue
            cands = jp_idx.get(hx, [])
            digests = {hashlib.md5(open(p, 'rb').read()).hexdigest() for p in cands}
            if len(digests) == 1:
                files[out_name] = ('jp', cands[0])
            elif len(digests) > 1:
                conflict.append(name)
            elif ww_idx.get(hx):
                files[out_name] = ('ww', ww_idx[hx][0])
            else:
                missing.append(name)
        if missing or conflict:
            report[rel] = {'status': 'incomplete', 'missing': missing, 'conflict': conflict}
            continue
        report[rel] = {'status': 'ok', 'textures': len(files)}
        if a.check:
            continue
        dst = os.path.join(a.out, 'lwf', 'raisedraw', *rel.split('/'))
        os.makedirs(dst, exist_ok=True)
        with open(lwf, 'rb') as s, open(os.path.join(dst, base + '.lwf'), 'wb') as d:
            d.write(s.read())
        for out_name, (kind, src) in files.items():
            data = open(src, 'rb').read()
            if kind == 'jp':
                from PIL import Image
                import io
                data = btf.encode(Image.open(io.BytesIO(data)).convert('RGBA'))
            with open(os.path.join(dst, out_name), 'wb') as d:
                d.write(data)
    with open(a.report, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    for rel, r in report.items():
        print(f"{rel}: {r['status']}" + (f" mancanti {r['missing']} conflitti {r['conflict']}" if r['status'] == 'incomplete' else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
```

Se `btf.encode` ha un'altra firma o il PNG JP e' gia' BTF, adeguare guardando `recon/tools/make_jp_enemies.py` (stessa conversione) e annotarlo nel rapporto del task.

- [ ] **Step 3: Provarlo in modalita' --check**

Run: `python recon\tools\import_jp_raisedraw.py --ww D:\Progetto_Restauro_KH_UX\catalog\raisedraw_ww --out D:\Progetto_Restauro_KH_UX\tmp\raisedraw_check --report D:\Progetto_Restauro_KH_UX\tmp\raisedraw_check\report.json --check`

Expected: `demo/raidgacha_result_display_01: served`, `Medal/Medal_D_Up3: served`, e `ok` per `demo/raidgacha_result_display_03` e `_10` (servono per Daily Deal x3 e Epic Medal Carnival x10). Se una di queste due e' `incomplete`, guardare i nomi mancanti: se esistono in `raidgacha_result_display_01` servita con un altro nome, estendere la ricerca e documentarlo; se mancano davvero, riportarlo nel rapporto del task (il Task 5 limita i banner alle dimensioni complete) e proseguire.

- [ ] **Step 4: Scrittura vera e collegamento al build**

Run lo stesso comando senza `--check` con `--out D:\Progetto_Restauro_KH_UX\tmp\raisedraw_check\files` e controllare che le cartelle `ok` contengano `.lwf` + tutte le texture. Poi in `build-resources.ps1`, subito dopo `import_jp_coco.py` e prima di `btf_fix.py`:

```powershell
# LWF del risultato delle estrazioni (Shop > Draw, raidgacha_result_display_02..10 e Medal_D_*):
# dai dati JP, complete di texture (docs/notes/shop.md#risorse); rapporto in $sg\raisedraw_report.json
python recon\tools\import_jp_raisedraw.py --ww "$D\catalog\raisedraw_ww" --out "$sg\files" --report "$sg\raisedraw_report.json"
if ($LASTEXITCODE) { throw 'import_jp_raisedraw fallito' }
```

- [ ] **Step 5: Commit**

```bash
git -c safe.directory=* add recon/tools/import_jp_raisedraw.py tools/ldplayer/session/build-resources.ps1
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_shop_t1.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```
Messaggio: «Shop: LWF del risultato delle estrazioni dai dati JP (raidgacha_result_display_02-10, Medal_D_*)» + elenco delle cartelle ok/incomplete + Co-Authored-By.

---

### Task 2: testi, icona e banner della piastra Catalog (risorse)

Modello consigliato: Sonnet.

**Files:**
- Create: `recon/tools/make_shop_art.py`
- Modify: `tools/ldplayer/session/build-resources.ps1` (dopo il ciclo che copia `layouts\ui_texts`, riga ~95)

**Interfaces:**
- Produces: `<stage_gen>\files\text\ui\106140420.txt` … `106140424.txt` (testi del pulsante grigio della piastra Catalog, payType 6 = Gold Ticket), `<stage_gen>\files\img\incentive\Star7_Ticket_39.png` (BTF, 83x83), `server/game_data/gacha_img/9001.png` (PNG 640x140, servito dal server al client via http). Il Task 4 (`make-banners.js`) NON scrive `9001.png`.

Fatti (server_facts.md §5): il Gold Ticket usa i testi 106140392 (nome), 106140420-424 (frasi del pulsante: 420 «Use 1 Gold Ticket to get 1 Medal», visto sulla piastra al banco p3b) e 106180213; i testi dell'IPA 4.4.0 sovrascrivono quelli di `make_layouts.py`, quindi la riscrittura va DOPO il ciclo di copia. L'icona `img/incentive/Star7_Ticket_39.png` (83x83) porta il segno «仮» (segnaposto). Il Gold Ticket non si assegna mai al giocatore (drawTicket3 sempre 0): riscrivere i suoi testi non cambia altro.

- [ ] **Step 1: Scrivere lo script**

```python
"""Grafica e testi della piastra «Banner Catalog» dello Shop (docs/superpowers/specs/2026-10-16-shop-banner-design.md 4.1).

    python recon/tools/make_shop_art.py <stage_gen\\files> <server\\game_data>     (Pillow: senza -I)

La piastra Catalog e' un'estrazione a Gold Ticket (payType 6) che nessuno possiede: il pulsante resta
grigio ([fn]) e mostra i testi 106140420-424 e l'icona img/incentive/Star7_Ticket_39.png.
Qui i testi diventano l'invito ad aprire Details e l'icona (originale con il segno «仮») diventa un
piccolo elenco di banner. Si scrive anche il banner 640x140 della piastra (servito dal server,
/web/gacha/img/9001.png). Testi dopo la copia dei testi IPA in build-resources.ps1 (altrimenti
vincerebbero quelli). Tutto disegnato qui: nessuna bitmap nel repo.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import btf  # noqa: E402

TEXT = 'Open Details to browse\nthe Banner Catalog'
TEXT_IDS = [106140420, 106140421, 106140422, 106140423, 106140424]
GOLD = (236, 196, 84, 255)
BLUE = (31, 84, 140, 255)
LIGHT = (220, 236, 250, 255)


def font(size):
    for f in (r'C:\Windows\Fonts\arialbd.ttf', r'C:\Windows\Fonts\segoeuib.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def icon():
    """83x83: tre piastre impilate (elenco di banner) con bordo dorato."""
    im = Image.new('RGBA', (83, 83), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i, y in enumerate((10, 32, 54)):
        d.rounded_rectangle((8, y, 75, y + 18), radius=4, fill=BLUE, outline=GOLD, width=3)
        d.rectangle((14, y + 6, 14 + 30 - i * 6, y + 11), fill=LIGHT)
    return im


def banner():
    """640x140: fondo blu sfumato, titolo e sottotitolo."""
    im = Image.new('RGBA', (640, 140), BLUE)
    d = ImageDraw.Draw(im)
    for y in range(140):
        c = int(40 + 60 * y / 139)
        d.line((0, y, 639, y), fill=(18, c, 120 + c // 2, 255))
    d.rounded_rectangle((6, 6, 633, 133), radius=10, outline=GOLD, width=4)
    d.text((320, 52), 'BANNER CATALOG', font=font(46), fill=GOLD, anchor='mm', stroke_width=2, stroke_fill=(40, 30, 10, 255))
    d.text((320, 102), 'Every original banner - open Details', font=font(24), fill=LIGHT, anchor='mm')
    return im


def main():
    sg, game_data = sys.argv[1], sys.argv[2]
    for tid in TEXT_IDS:
        p = os.path.join(sg, 'text', 'ui', f'{tid}.txt')
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            f.write(TEXT)
    p = os.path.join(sg, 'img', 'incentive', 'Star7_Ticket_39.png')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as f:
        f.write(btf.encode(icon()))
    out = os.path.join(game_data, 'gacha_img')
    os.makedirs(out, exist_ok=True)
    banner().convert('RGB').save(os.path.join(out, '9001.png'))
    print('make_shop_art: testi', TEXT_IDS, 'icona Star7_Ticket_39, banner 9001')
    return 0


if __name__ == '__main__':
    sys.exit(main())
```

Se `btf.encode` vuole un altro argomento, adeguare come in `recon/tools/make_shop_lock.py` / `make_textures.py`.

- [ ] **Step 2: Provarlo fuori dal build**

Run: `python recon\tools\make_shop_art.py D:\Progetto_Restauro_KH_UX\tmp\shop_art\files server\game_data`
Expected: stampa la riga finale; `tmp\shop_art\files\text\ui\106140420.txt` contiene le due righe; `server\game_data\gacha_img\9001.png` e' 640x140. Aprire `9001.png` e un PNG decodificato dell'icona (`btf.decode`) e guardarli: il testo deve stare dentro il riquadro e leggersi.

- [ ] **Step 3: Collegarlo al build**

In `build-resources.ps1`, subito dopo il `foreach` che copia `layouts\ui_texts\text\ui` (riga ~95):

```powershell
# piastra «Banner Catalog» dello Shop: testi del pulsante Gold Ticket (106140420-424) e icona
# Star7_Ticket_39 (aveva il segno «仮»), dopo i testi IPA; banner 9001 in server\game_data\gacha_img
python recon\tools\make_shop_art.py "$sg\files" server\game_data
if ($LASTEXITCODE) { throw 'make_shop_art fallito' }
```

- [ ] **Step 4: Commit**

```bash
git -c safe.directory=* add recon/tools/make_shop_art.py tools/ldplayer/session/build-resources.ps1
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_shop_t2.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 3: `server/gacha-data.js` (funzioni pure)

Modello consigliato: Haiku (codice completo qui sotto).

**Files:**
- Create: `server/gacha-data.js`
- Test: `server/test-gacha-data.js`

**Interfaces:**
- Produces (usate dai Task 4 e 5):
  - `CATALOG_ID = 9001`, `UPGRADE_CHANCE = 0.08`
  - `parseRarityMix(s: string) -> Array<[rare: number, n: number]>` (rarita' decrescente; voci senza ★ ignorate)
  - `slotRarities(banner) -> number[]` (lunghezza `banner.lotCount`)
  - `slotOdds(banner) -> Array<{rare: number, pct: number}>[]` (una lista per slot)
  - `rollDraw(banner, rng: () => number) -> number[]` (medalId, lunghezza `lotCount`)
  - `drawMedalTypeRow({drawMedalTypeId, name, payType, price, sortId, bannerUrl, detailUrl, comment}) -> object` (47 campi dello schema)
  - `loadBanners(file: string) -> object[]` (`[]` se il file manca o non e' valido)
  - `bannerById(list, id) -> object | undefined`
- Forma di un banner (scritta dal Task 4): `{ drawMedalTypeId, rowId, name, startDate, endDate, status, payType, price, lotCount, isDayLimited, rarityMix, pool: { '<rare>': number[] }, maxSet, image, guarantees, notes, test, sortId, comment }`.

- [ ] **Step 1: Scrivere il test**

```js
// Prova delle funzioni pure delle estrazioni: node server/test-gacha-data.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const g = require('./gacha-data');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

check(JSON.stringify(g.parseRarityMix('4★:1 3★:2')) === '[[4,1],[3,2]]', 'mix semplice');
check(JSON.stringify(g.parseRarityMix('6★:2 5★:3 3★:5 Other:1')) === '[[6,2],[5,3],[3,5]]', 'Other ignorato');
check(JSON.stringify(g.parseRarityMix('3★:5 5★:1 4★:4')) === '[[5,1],[4,4],[3,5]]', 'ordine decrescente');
check(JSON.stringify(g.parseRarityMix('')) === '[]', 'vuoto');

const b = { lotCount: 3, rarityMix: [[4, 1], [3, 2]], pool: { 3: [31, 32], 4: [41], 5: [51] } };
check(JSON.stringify(g.slotRarities(b)) === '[4,3,3]', 'slot dal mix');
check(JSON.stringify(g.slotRarities({ ...b, lotCount: 5 })) === '[4,3,3,3,3]', 'slot mancanti = rarita piu bassa');
check(JSON.stringify(g.slotRarities({ ...b, lotCount: 2 })) === '[4,3]', 'slot in eccesso tagliati');

// rng: 0.5 -> niente promozione, poi indice; 0.01 -> promozione
check(JSON.stringify(g.rollDraw(b, seq(0.5, 0.0, 0.5, 0.0, 0.5, 0.99))) === '[41,31,32]', 'estrazione senza promozioni');
check(JSON.stringify(g.rollDraw(b, seq(0.01, 0.0, 0.5, 0.0, 0.5, 0.0))) === '[51,31,31]', 'promozione 4 -> 5');
const noUp = { lotCount: 1, rarityMix: [[5, 1]], pool: { 5: [51] } };
check(JSON.stringify(g.rollDraw(noUp, seq(0.01, 0.0))) === '[51]', 'niente 6 nel pool: resta 5');
const holes = { lotCount: 1, rarityMix: [[4, 1]], pool: { 3: [31] } };
check(JSON.stringify(g.rollDraw(holes, seq(0.5, 0.0))) === '[31]', 'pool 4 vuoto: scende a 3');
let threw = false;
try { g.rollDraw({ lotCount: 1, rarityMix: [[4, 1]], pool: {} }, Math.random); } catch { threw = true; }
check(threw, 'pool vuoto: errore');

const odds = g.slotOdds(b);
check(odds.length === 3 && odds[0][0].rare === 4 && odds[0][0].pct === 92 && odds[0][1].rare === 5 && odds[0][1].pct === 8, 'probabilita slot 4');
check(g.slotOdds(noUp)[0].length === 1 && g.slotOdds(noUp)[0][0].pct === 100, 'probabilita senza promozione');

const row = g.drawMedalTypeRow({ drawMedalTypeId: 10001, name: 'X', payType: 1, price: 600, sortId: 10,
  bannerUrl: '/web/gacha/img/10001.png', detailUrl: '/web/gacha/detail/10001', comment: '3 Medals' });
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recon', 'out', 'master_types_ww431.json'), 'utf8')).drawMedalType;
const fields = Object.keys(schema.fields || schema);
check(fields.length === 47 && fields.every((f) => f in row), 'riga master con tutti i 47 campi');
check(row.benefitId === 0 && row.drawType === 1 && row.price === 600 && row.validComment === 1 && row.warrantDisplayOfTime === 1, 'valori della riga');

const tmp = path.join(os.tmpdir(), `khux-test-banners-${process.pid}.json`);
check(g.loadBanners(tmp).length === 0, 'file assente -> []');
fs.writeFileSync(tmp, JSON.stringify({ banners: [{ drawMedalTypeId: 10001 }] }));
check(g.bannerById(g.loadBanners(tmp), 10001)?.drawMedalTypeId === 10001, 'caricamento e ricerca');
fs.writeFileSync(tmp, '{rotto');
check(g.loadBanners(tmp).length === 0, 'file non valido -> []');
fs.unlinkSync(tmp);

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha-data');
```

Prima di scrivere il controllo dello schema, aprire `recon/out/master_types_ww431.json` e guardare la forma della voce `drawMedalType` (oggetto campi->tipo oppure `{fields: ...}`); adeguare la riga `const fields = ...` alla forma reale.

- [ ] **Step 2: Lanciarlo e vederlo fallire**

Run: `node server/test-gacha-data.js`
Expected: errore `Cannot find module './gacha-data'`.

- [ ] **Step 3: Scrivere il modulo**

```js
// Estrazioni dello Shop: funzioni pure (docs/notes/shop.md, spec 2026-10-16-shop-banner-design.md 4.8).
// Il catalogo dei banner (server/game_data/gacha_banners.json) lo scrive server/make-banners.js.
// Probabilita' RICOSTRUITE (l'originale pubblicava solo la composizione): ogni slot ha la rarita'
// del mix originale (banners_ww.tsv, es. «4★:1 3★:2») e UPGRADE_CHANCE di salire di una stella se il
// pool ne ha; le tabelle per tipo di banner arrivano col sotto-progetto 2.
'use strict';
const fs = require('fs');

const CATALOG_ID = 9001;
const UPGRADE_CHANCE = 0.08;

function parseRarityMix(s) {
  const out = [];
  for (const m of String(s || '').matchAll(/(\d)★:(\d+)/g)) out.push([Number(m[1]), Number(m[2])]);
  return out.sort((a, b) => b[0] - a[0]);
}

function slotRarities(banner) {
  const slots = [];
  for (const [rare, n] of banner.rarityMix) for (let k = 0; k < n; k++) slots.push(rare);
  const low = slots.length ? slots[slots.length - 1] : 3;
  while (slots.length < banner.lotCount) slots.push(low);
  return slots.slice(0, banner.lotCount);
}

const poolOf = (banner, rare) => banner.pool[rare] || banner.pool[String(rare)] || [];

function slotOdds(banner) {
  return slotRarities(banner).map((rare) => {
    if (!poolOf(banner, rare + 1).length) return [{ rare, pct: 100 }];
    const up = Math.round(UPGRADE_CHANCE * 100);
    return [{ rare, pct: 100 - up }, { rare: rare + 1, pct: up }];
  });
}

function rollDraw(banner, rng) {
  return slotRarities(banner).map((rare) => {
    let r = rare;
    if (poolOf(banner, rare + 1).length && rng() < UPGRADE_CHANCE) r = rare + 1;
    while (r >= 1 && !poolOf(banner, r).length) r--;
    const list = poolOf(banner, r);
    if (!list.length) throw new Error(`banner ${banner.drawMedalTypeId}: pool vuoto per ${rare}★`);
    return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  });
}

// Riga del master drawMedalType (47 campi, recon/out/master_types_ww431.json; parser [fn]).
// bannerUrl/detailUrl sono percorsi: server.js (servedMasterRows) ci mette davanti l'indirizzo http.
// drawType 1; benefitId 0 (il lucchetto apre l'acquisto in-app: crash, I-134); comment = striscia
// scorrevole sotto il banner, stringa printf (niente % sciolti), visibile con warrantDisplayOfTime 1
// e userWarrantDisplayOfTime 1 nella lista (spike del 16-10, prova 3).
function drawMedalTypeRow({ drawMedalTypeId, name, payType, price, sortId, bannerUrl, detailUrl, comment }) {
  const z = (n) => Array(n).fill(0);
  return {
    drawMedalTypeId, drawType: 1, sortId, name, benefitId: 0, payType, price,
    validFluctuationPrice: 0, fluctuationPrice: z(5), tableId: 0, validLot: 0, lotName: ['', '', ''],
    lotCount: z(3), lotSsr: z(3), lotPsr: z(3), lotSr: z(3), lotPr: z(3), lotR: z(3), lotPn: z(3), lotN: z(3),
    tableIds: z(3), vipcoinNumber: 0, limitedvipcoinNumber: 0, validAdd: 0, addType: 0, addId: 0, addSkillType: 0,
    addSkillId: 0, addSkillLv: 0, addNum: 0, bannerUrl, mypageBanner: 0, detailUrl, dayCount: 0,
    warrantNumberOfTime: 0, warrantDisplayOfTime: 1, validComment: 1, comment: String(comment).replace(/%/g, '%%'),
    warrantCounterId: 0, warrantTableIds: 0, warrantMedalListIds: [0], warrantMedalRepeat: 0,
    warrantResetMedalListIds: z(10), displayTimeLeft: 0, startDate: '2016-04-07 00:00:00',
    endDate: '2099-12-31 23:59:59', isDeleted: 0,
  };
}

function loadBanners(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data.banners) ? data.banners : [];
  } catch {
    return [];
  }
}

const bannerById = (list, id) => list.find((b) => b.drawMedalTypeId === Number(id));

module.exports = { CATALOG_ID, UPGRADE_CHANCE, parseRarityMix, slotRarities, slotOdds, rollDraw, drawMedalTypeRow, loadBanners, bannerById };
```

- [ ] **Step 4: Lanciare il test**

Run: `node server/test-gacha-data.js`
Expected: `OK: gacha-data`. Se fallisce solo un caso di `rollDraw` per l'ordine delle chiamate a `rng`, correggere il modulo (non il test): l'ordine e' «promozione, poi indice» per ogni slot, e la promozione si tira solo se il pool della stella sopra non e' vuoto.

- [ ] **Step 5: Commit**

```bash
git -c safe.directory=* add server/gacha-data.js server/test-gacha-data.js
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_shop_t3.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 4: `server/make-banners.js` (generatore) e `server/gacha.js` (logica e pagine)

Modello consigliato: Sonnet.

**Files:**
- Create: `server/make-banners.js`, `server/gacha.js`
- Test: `server/test-make-banners.js`, `server/test-gacha.js`

**Interfaces:**
- Consumes: `gacha-data.js` (Task 3); `server/game_data/gacha_img/9001.png` (Task 2, non lo tocca).
- Produces:
  - `make-banners.js` esporta `{ parseTsv(text) -> object[], wikiMedals(wikiObj) -> Array<{name, naset, class1, class2}>, maxSetOf(notes) -> number, buildPool(names: string[], medalRows, rarities: number[]) -> {'<rare>': number[]}, bannerFromRow(row, opts) -> banner, PLAN_ROWS, TEST_ROWS, MAX_SET_NOW }`; lanciato da riga di comando scrive `server/master_data/drawMedalType.json`, `server/game_data/gacha_banners.json` e copia le immagini in `server/game_data/gacha_img/<id>.png`.
  - `gacha.js` esporta:
    - `WALLET = {1: 'freeStone', 7: 'limitedDrawTicket1', 8: 'limitedDrawTicket2'}`
    - `catalogPlate() -> elemento di gachaList`; `catalogRow() -> riga master`
    - `visibleBanners(banners, {test}) -> banner[]`
    - `dayLeft(player, banner, realMs) -> number` (estrazioni rimaste oggi: 1 o 0 per isDayLimited, 0 altrimenti)
    - `gachaListData(banners, player, {realMs, webBase, test, sizes}) -> {gachaList, petGachaList: []}`
    - `checkDraw(banner, player, body, {realMs, test, freeSlots, sizes}) -> string | null` (motivo del rifiuto)
    - `payDraw(banner, player, realMs) -> void`
    - `drawResultFields(userMedalIds, firstIds) -> {gachaBonus, firstGetUserMedalIds, userMedalIds, effectNumbers}`
    - `detailPage(banner, medalNames: Map<number,string>) -> string`, `oddsPage(banners) -> string`, `catalogPage(banners, {test}) -> string`
  - `sizes`: `Set<number>` dei numeri di medaglie per cui il client ha l'animazione (`raidgacha_result_display_NN`); default `new Set([1, 3, 10])` in server.js, da aggiornare col rapporto del Task 1.

Fatti: banners_ww.tsv ha le colonne `row_id name start_pt end_pt days status recurring seasonal event_tie_in featured_medals pool_medals currency price draw_size rarity_mix guarantees rates image_file image_size image_url source_url confidence notes source` (TAB). wiki_all.json = `{titolo: wikitesto}`; ogni medaglia ha un blocco `{{InfoMedal ... }}` con righe `|naset=21`, `|name=101 Dalmatians`, `|class1=Common|Rare|Super Rare|Normal|Event|VIP|Bonus`, `|class2=Attack...`. medal.json: `medalId, name, rare, type (1 = attacco), validPack (1 = impilabile)`; id >= 300000 = versioni recenti/7★. naset <= 9 = aprile-dicembre 2016 (la storia restaurata arriva alla quest 525 = 8/12/2016).

- [ ] **Step 1: Scrivere i test**

`server/test-make-banners.js`:

```js
// Prova del generatore dei banner: node server/test-make-banners.js
'use strict';
const m = require('./make-banners');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

const head = 'row_id\tname\tstart_pt\tend_pt\tdays\tstatus\trecurring\tseasonal\tevent_tie_in\tfeatured_medals\tpool_medals\tcurrency\tprice\tdraw_size\trarity_mix\tguarantees\trates\timage_file\timage_size\timage_url\tsource_url\tconfidence\tnotes\tsource';
const line = 'B0011\tEpic Medal Carnival\t2016-05-13\t2016-05-19\t7\ttime-limited\t\t\t\t\t\tJewels\t3000\tx10\t5★:1 4★:4 3★:5\tGuarantees a 5★ Epic Medal\t\tShop_-_Epic.png\t640x140\t\t\tsure\tDraws from sets 1.1, 1.2, 1.3, and 2.1. Guarantees a 5★\tx';
const rows = m.parseTsv(head + '\n' + line + '\n');
check(rows.length === 1 && rows[0].row_id === 'B0011' && rows[0].draw_size === 'x10', 'TSV');

const wiki = {
  A: '{{InfoMedal\n|naset=1\n|name=Wakka\n|class1=Rare\n|class2=Attack\n}}\ntesto',
  B: '{{InfoMedal\n|naset=12\n|name=Late\n|class1=Rare\n|class2=Attack\n}}',
  C: '{{InfoMedal\n|naset=2\n|name=Dewey\n|class1=Event\n|class2=Attack\n}}',
  D: 'pagina senza medaglia',
};
const wm = m.wikiMedals(wiki);
check(wm.length === 3 && wm.find((x) => x.name === 'Wakka').naset === 1, 'medaglie della wiki');

check(m.maxSetOf('Draws from sets 1.1, 1.2, 1.3, and 2.1. Other') === 2, 'set dalle note');
check(m.maxSetOf('Available once per day.') === m.MAX_SET_NOW, 'senza set: fino alla storia attuale');

const medalRows = [
  { medalId: 11013, name: 'Wakka', rare: 3, type: 1, validPack: 0 },
  { medalId: 11014, name: 'Wakka', rare: 4, type: 1, validPack: 0 },
  { medalId: 11015, name: 'Wakka', rare: 5, type: 1, validPack: 0 },
  { medalId: 300007, name: 'Wakka', rare: 7, type: 1, validPack: 0 },
  { medalId: 90041, name: 'Dewey', rare: 3, type: 1, validPack: 1 },
  { medalId: 11099, name: 'Wakka', rare: 3, type: 2, validPack: 0 },
];
const pool = m.buildPool(['Wakka', 'Dewey'], medalRows, [3, 4, 5, 6]);
check(JSON.stringify(pool) === '{"3":[11013],"4":[11014],"5":[11015]}', 'pool: solo attacco, non impilabili, < 300000');

const b = m.bannerFromRow(rows[0], { wikiList: wm, medalRows, test: false, sortId: 30 });
check(b.drawMedalTypeId === 10011 && b.payType === 1 && b.price === 3000 && b.lotCount === 10, 'banner: id, moneta, prezzo, dimensione');
check(b.isDayLimited === 0 && b.maxSet === 2 && JSON.stringify(b.rarityMix) === '[[5,1],[4,4],[3,5]]', 'banner: limite, set, mix');
check(b.image === 'Shop_-_Epic.png' && /10 Medals/.test(b.comment) && !b.comment.includes('%'), 'banner: immagine e didascalia');
const daily = m.bannerFromRow({ ...rows[0], row_id: 'B0001', draw_size: 'x3', price: '600', notes: 'Available once per day.' }, { wikiList: wm, medalRows, test: false, sortId: 10 });
check(daily.isDayLimited === 1 && /once per day/.test(daily.comment), 'once per day');
const plat = m.bannerFromRow({ ...rows[0], row_id: 'B0456', currency: 'Platinum Ticket', price: '1 Platinum Ticket', draw_size: 'x5', rarity_mix: '5★:5' }, { wikiList: wm, medalRows, test: true, sortId: 90 });
check(plat.payType === 7 && plat.price === 1 && plat.test === true, 'Platinum Ticket = payType 7');
let threw = false;
try { m.bannerFromRow({ ...rows[0], currency: 'Moogle Point' }, { wikiList: wm, medalRows, test: false, sortId: 1 }); } catch { threw = true; }
check(threw, 'moneta sconosciuta: errore');

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: make-banners');
```

`server/test-gacha.js`:

```js
// Prova della logica dello Shop: node server/test-gacha.js
'use strict';
const g = require('./gacha');
const clock = require('./clock');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const U = (y, mo, d, h = 0) => Date.UTC(y, mo - 1, d, h);

const daily = { drawMedalTypeId: 10001, rowId: 'B0001', name: 'DAILY DEAL!', payType: 1, price: 600, lotCount: 3, isDayLimited: 1,
  rarityMix: [[4, 1], [3, 2]], pool: { 3: [11013], 4: [11014] }, test: false, sortId: 10, comment: '3 Medals', startDate: '2016-04-07', endDate: '2018-01-31', image: 'a.png' };
const plat = { ...daily, drawMedalTypeId: 10456, name: 'Platinum Ticket Draw', payType: 7, price: 1, lotCount: 5, isDayLimited: 0, test: true, sortId: 90 };
const big = { ...daily, drawMedalTypeId: 10011, name: 'Epic Medal Carnival', price: 3000, lotCount: 10, isDayLimited: 0, sortId: 30 };
const banners = [daily, big, plat];
const sizes = new Set([1, 3, 10]);
const t0 = U(2026, 10, 16, 15);

// lista
let l = g.gachaListData(banners, { freeStone: 0 }, { realMs: t0, webBase: 'http://h', test: false, sizes });
check(l.petGachaList.length === 0 && l.gachaList[0].drawMedalTypeId === 9001, 'Catalog in cima');
check(l.gachaList.length === 3 && !l.gachaList.some((x) => x.drawMedalTypeId === 10456), 'banner di prova nascosto');
const e = l.gachaList.find((x) => x.drawMedalTypeId === 10001);
check(e.isDayLimited === 1 && e.userLimitedCount === 1 && e.lotCount === 3 && e.bannerUrl === 'http://h/web/gacha/img/10001.png', 'elemento Daily');
check(['validAdd', 'drawMedalTypeId', 'drawType', 'sortId', 'payType', 'price', 'lotCount', 'isDayLimited', 'userLimitedCount',
  'userWarrantDisplayOfTime', 'name', 'description', 'bannerUrl', 'warrantMedalIds', 'drawTicketlimitDate'].every((k) => k in e), 'campi obbligatori');
const cat = l.gachaList[0];
check(cat.payType === 6 && cat.price === 1 && cat.drawType === 1, 'Catalog innocuo');
l = g.gachaListData(banners, {}, { realMs: t0, webBase: 'http://h', test: true, sizes });
check(l.gachaList.some((x) => x.drawMedalTypeId === 10456), 'banner di prova con KHUX_GACHA_TEST');
l = g.gachaListData(banners, {}, { realMs: t0, webBase: 'http://h', test: false, sizes: new Set([1, 3]) });
check(!l.gachaList.some((x) => x.drawMedalTypeId === 10011), 'x10 senza animazione: nascosto');

// controlli dell'estrazione
const p = { freeStone: 1000, limitedDrawTicket1: 0 };
const opt = { realMs: t0, test: false, freeSlots: 100, sizes };
check(g.checkDraw(daily, p, { drawMedalTypeId: 10001, count: 3 }, opt) === null, 'Daily ok');
check(g.checkDraw(undefined, p, { drawMedalTypeId: 1 }, opt) !== null, 'banner sconosciuto');
check(g.checkDraw({ drawMedalTypeId: 9001, payType: 6 }, p, {}, opt) !== null, 'Catalog rifiutato');
check(g.checkDraw(big, p, { count: 10 }, opt) !== null, 'jewel insufficienti');
check(g.checkDraw(daily, p, { count: 3 }, { ...opt, freeSlots: 2 }) !== null, 'box senza posti per 3');
check(g.checkDraw(plat, { limitedDrawTicket1: 5 }, { count: 5 }, opt) !== null, 'prova senza KHUX_GACHA_TEST');
check(g.checkDraw(plat, { limitedDrawTicket1: 5 }, { count: 5 }, { ...opt, test: true, sizes: new Set([1, 3, 5, 10]) }) === null, 'Platinum con biglietti');
check(g.checkDraw(plat, { limitedDrawTicket1: 0 }, { count: 5 }, { ...opt, test: true, sizes: new Set([5]) }) !== null, 'Platinum senza biglietti');
check(g.checkDraw(big, { freeStone: 9999 }, { count: 10 }, { ...opt, sizes: new Set([1, 3]) }) !== null, 'dimensione senza animazione');

// pagamento e limite giornaliero
g.payDraw(daily, p, t0);
check(p.freeStone === 400, 'jewel scalati una volta');
check(g.dayLeft(p, daily, t0) === 0 && g.checkDraw(daily, { ...p, freeStone: 5000 }, { count: 3 }, opt) !== null, 'Daily: seconda volta rifiutata');
const next = clock.dayEnd(t0) + 1;
check(g.dayLeft(p, daily, next) === 1, 'Daily: il giorno dopo di nuovo disponibile');
const q = { limitedDrawTicket1: 3 };
g.payDraw(plat, q, t0);
check(q.limitedDrawTicket1 === 2, 'biglietto scalato');

// campi del risultato
const r = g.drawResultFields([501, 502], [501]);
check(JSON.stringify(r) === JSON.stringify({ gachaBonus: { addType: 1, number: 0, userMedalIds: [] }, firstGetUserMedalIds: [501], userMedalIds: [501, 502], effectNumbers: [0, 0] }), 'campi del risultato');

// pagine
const names = new Map([[11013, 'Wakka'], [11014, 'Wakka']]);
const d = g.detailPage(daily, names);
check(d.includes('DAILY DEAL!') && d.includes('Wakka') && d.includes('reconstructed') && d.includes('once per day'), 'pagina dettagli');
const o = g.oddsPage(banners.filter((b) => !b.test));
check(o.includes('DAILY DEAL!') && o.includes('92%') && o.includes('8%'), 'pagina odds');
const c = g.catalogPage(banners, { test: false });
check(c.includes('/web/gacha/detail/10001') && !c.includes('10456'), 'pagina catalogo');
check(!g.detailPage({ ...daily, name: '<b>' }, names).includes('<b>'), 'escape HTML');

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha');
```

- [ ] **Step 2: Lanciarli e vederli fallire**

Run: `node server/test-make-banners.js` e `node server/test-gacha.js`
Expected: `Cannot find module './make-banners'` / `'./gacha'`.

- [ ] **Step 3: Scrivere `server/make-banners.js`**

```js
#!/usr/bin/env node
// Generatore dei banner dello Shop (spec 2026-10-16-shop-banner-design.md, sotto-progetto 1).
//   node server/make-banners.js        poi alzare KHUX_REVISION (master drawMedalType)
// Fonti fuori dal repo (dati raccolti, sola lettura):
//   KHUX_BANNERS_TSV (default <repo>/../../reference/banners/banners_ww.tsv) e la cartella delle
//   immagini accanto (img/); KHUX_WIKI_JSON (default <repo>/../../wiki/wiki_all.json);
//   server/master_data/medal.json.
// Uscite (ignorate da git): server/master_data/drawMedalType.json (piastra Catalog + banner),
//   server/game_data/gacha_banners.json (catalogo con i pool), server/game_data/gacha_img/<id>.png
//   (solo immagini gia' 640x140; 9001.png lo scrive recon/tools/make_shop_art.py).
// Pool (ricostruito): medaglie d'attacco della wiki con naset <= set piu' alto citato nelle note
// («Draws from sets 1.1, 1.2 ...»), altrimenti <= MAX_SET_NOW (storia restaurata fino alla quest 525,
// 8/12/2016 = set 9); esclusi class1 Event/VIP/Bonus, medaglie impilabili e id >= 300000.
'use strict';
const fs = require('fs');
const path = require('path');
const gd = require('./gacha-data');

const ROOT = path.resolve(__dirname, '..');
const TSV = process.env.KHUX_BANNERS_TSV || path.resolve(ROOT, '..', '..', 'reference', 'banners', 'banners_ww.tsv');
const WIKI = process.env.KHUX_WIKI_JSON || path.resolve(ROOT, '..', '..', 'wiki', 'wiki_all.json');
const MASTER = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
const GAME = process.env.KHUX_GAME_DATA || path.join(__dirname, 'game_data');

const PLAN_ROWS = ['B0001', 'B0027', 'B0011']; // Daily Deal, Small Deal, Epic Medal Carnival
const TEST_ROWS = ['B0456'];                   // Platinum Ticket Draw (2019): solo con KHUX_GACHA_TEST=1
const MAX_SET_NOW = 9;
const CURRENCY = { Jewels: 1, 'Platinum Ticket': 7, 'Draw Ticket': 8 };
const NO_DRAW_CLASS = /^(Event|VIP|Bonus)/;

function parseTsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const head = lines.shift().split('\t');
  return lines.map((l) => { const c = l.split('\t'); return Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])); });
}

function wikiMedals(wiki) {
  const out = [];
  for (const text of Object.values(wiki)) {
    for (const block of String(text).matchAll(/\{\{InfoMedal([\s\S]*?)\n\}\}/g)) {
      const f = {};
      for (const m of block[1].matchAll(/^\|(\w+)=(.*)$/gm)) f[m[1]] = m[2].trim();
      const naset = Number(f.naset);
      if (f.name && Number.isInteger(naset) && naset >= 1) out.push({ name: f.name, naset, class1: f.class1 || '', class2: f.class2 || '' });
    }
  }
  return out;
}

function maxSetOf(notes) {
  const m = /sets? ([\d., and]+)/.exec(notes || '');
  if (!m) return MAX_SET_NOW;
  const sets = [...m[1].matchAll(/(\d+)\.\d+/g)].map((x) => Number(x[1]));
  return sets.length ? Math.max(...sets) : MAX_SET_NOW;
}

function buildPool(names, medalRows, rarities) {
  const want = new Set(names);
  const pool = {};
  for (const r of medalRows) {
    if (!want.has(r.name) || r.type !== 1 || r.validPack === 1 || r.medalId >= 300000 || !rarities.includes(r.rare)) continue;
    (pool[r.rare] = pool[r.rare] || []).push(r.medalId);
  }
  for (const k of Object.keys(pool)) pool[k].sort((a, b) => a - b);
  return pool;
}

function bannerFromRow(row, { wikiList, medalRows, test, sortId }) {
  const payType = CURRENCY[row.currency];
  if (!payType) throw new Error(`${row.row_id}: moneta ${row.currency} non gestita`);
  const lotCount = Number(String(row.draw_size).replace(/^x/, ''));
  const rarityMix = gd.parseRarityMix(row.rarity_mix);
  const maxSet = maxSetOf(row.notes);
  const names = wikiList.filter((w) => w.naset <= maxSet && !NO_DRAW_CLASS.test(w.class1) && /Attack/.test(w.class2)).map((w) => w.name);
  const rarities = [...new Set(rarityMix.flatMap(([r]) => [r, r + 1]))];
  const isDayLimited = /once (per|a) day/i.test(row.notes) ? 1 : 0;
  const mix = rarityMix.map(([r, n]) => `${n}x ${r}★+`).join(', ');
  const comment = `${lotCount} Medal${lotCount === 1 ? '' : 's'}: ${mix}${isDayLimited ? ' - once per day' : ''}`;
  const b = {
    drawMedalTypeId: 10000 + Number(row.row_id.slice(1)), rowId: row.row_id, name: row.name,
    startDate: row.start_pt, endDate: row.end_pt, status: row.status, payType, price: parseInt(row.price, 10),
    lotCount, isDayLimited, rarityMix, pool: buildPool(names, medalRows, rarities), maxSet,
    image: row.image_file, guarantees: row.guarantees, notes: row.notes, test, sortId, comment,
  };
  for (const [r] of rarityMix) if (!(b.pool[r] || []).length) throw new Error(`${row.row_id}: nessuna medaglia ${r}★ nel pool`);
  return b;
}

function main() {
  const rows = parseTsv(fs.readFileSync(TSV, 'utf8'));
  const wikiList = wikiMedals(JSON.parse(fs.readFileSync(WIKI, 'utf8')));
  const medalRows = JSON.parse(fs.readFileSync(path.join(MASTER, 'medal.json'), 'utf8'));
  const pick = [...PLAN_ROWS.map((id) => [id, false]), ...TEST_ROWS.map((id) => [id, true])];
  const banners = pick.map(([id, test], i) => {
    const row = rows.find((r) => r.row_id === id);
    if (!row) throw new Error(`${id} assente da ${TSV}`);
    return bannerFromRow(row, { wikiList, medalRows, test, sortId: 10 * (i + 1) });
  });
  const master = [require('./gacha').catalogRow(), ...banners.map((b) => gd.drawMedalTypeRow({
    drawMedalTypeId: b.drawMedalTypeId, name: b.name, payType: b.payType, price: b.price, sortId: b.sortId,
    bannerUrl: `/web/gacha/img/${b.drawMedalTypeId}.png`, detailUrl: `/web/gacha/detail/${b.drawMedalTypeId}`, comment: b.comment,
  }))];
  fs.writeFileSync(path.join(MASTER, 'drawMedalType.json'), JSON.stringify(master));
  fs.mkdirSync(path.join(GAME, 'gacha_img'), { recursive: true });
  fs.writeFileSync(path.join(GAME, 'gacha_banners.json'), JSON.stringify({ banners }));
  const imgDir = path.join(path.dirname(TSV), 'img');
  for (const b of banners) {
    const row = rows.find((r) => r.row_id === b.rowId);
    const src = path.join(imgDir, b.image);
    if (row.image_size !== '640x140' || !fs.existsSync(src)) { console.log(`  ${b.rowId}: immagine ${b.image} (${row.image_size}) non copiata`); continue; }
    fs.copyFileSync(src, path.join(GAME, 'gacha_img', `${b.drawMedalTypeId}.png`));
  }
  for (const b of banners) console.log(`${b.rowId} ${b.name}: id ${b.drawMedalTypeId}, payType ${b.payType} x${b.price}, ${b.lotCount} medaglie, set <= ${b.maxSet}, pool ${Object.entries(b.pool).map(([r, l]) => `${r}★ ${l.length}`).join(' ')}${b.test ? ' (prova)' : ''}`);
  console.log('poi alzare KHUX_REVISION (drawMedalType)');
}

if (require.main === module) main();
module.exports = { parseTsv, wikiMedals, maxSetOf, buildPool, bannerFromRow, PLAN_ROWS, TEST_ROWS, MAX_SET_NOW };
```

- [ ] **Step 4: Scrivere `server/gacha.js`**

```js
// Shop > Draw: lista, estrazione e pagine WebView (docs/notes/shop.md; spec 2026-10-16-shop-banner-design.md).
// GET /gacha/list (azione 75): gachaList[] ([fn], campi tutti obbligatori) e petGachaList[]
// (obbligatorio anche vuoto: senza, «200 ERROR :75»). Il client la richiede a ogni apertura dello Shop
// e dopo ogni estrazione; la chiusura della WebView di Details NON la richiede ([fn]).
// POST /gacha/draw (azione 76): corpo {drawMedalTypeId, count = lotCount}; il client controlla prima
// jewel/biglietti e 1 posto nel box, poi apre la scena e rilegge GET /user/stone: i jewel li scala il
// server qui. Risposta in server.js (respondGachaDraw).
'use strict';
const clock = require('./clock');
const gd = require('./gacha-data');

const WALLET = { 1: 'freeStone', 7: 'limitedDrawTicket1', 8: 'limitedDrawTicket2' };

// Piastra «Banner Catalog» (spec 4.1): Gold Ticket (payType 6, drawTicket3 sempre 0) prezzo 1: pulsante
// grigio, il tocco non manda richieste ([fn]); Details apre il catalogo (detailUrl del master).
function catalogRow() {
  return gd.drawMedalTypeRow({ drawMedalTypeId: gd.CATALOG_ID, name: 'Banner Catalog', payType: 6, price: 1, sortId: 1,
    bannerUrl: `/web/gacha/img/${gd.CATALOG_ID}.png`, detailUrl: '/web/gacha/catalog', comment: 'Open Details to browse all banners' });
}

function plate(b, webBase, userLimitedCount) {
  return {
    validAdd: 0, drawMedalTypeId: b.drawMedalTypeId, drawType: 1, sortId: b.sortId, payType: b.payType, price: b.price,
    lotCount: b.lotCount, isDayLimited: b.isDayLimited || 0, userLimitedCount, userWarrantDisplayOfTime: 1,
    name: b.name, description: b.name, bannerUrl: `${webBase}/web/gacha/img/${b.drawMedalTypeId}.png`,
    warrantMedalIds: [], drawTicketlimitDate: '2030-12-31 23:59:59',
  };
}

function catalogPlate(webBase) {
  return plate({ drawMedalTypeId: gd.CATALOG_ID, sortId: 1, payType: 6, price: 1, lotCount: 1, name: 'Banner Catalog' }, webBase, 0);
}

const visibleBanners = (banners, { test }) => banners.filter((b) => test || !b.test);

function dayLeft(player, banner, realMs) {
  if (!banner.isDayLimited) return 0;
  const g = player.gacha || {};
  const used = g.day === clock.dayIndex(realMs) ? (g.used?.[banner.drawMedalTypeId] || 0) : 0;
  return Math.max(0, 1 - used);
}

function gachaListData(banners, player, { realMs, webBase, test, sizes }) {
  const list = visibleBanners(banners, { test }).filter((b) => sizes.has(b.lotCount));
  return { gachaList: [catalogPlate(webBase), ...list.map((b) => plate(b, webBase, dayLeft(player, b, realMs)))], petGachaList: [] };
}

function checkDraw(banner, player, body, { realMs, test, freeSlots, sizes }) {
  if (!banner) return `banner ${body?.drawMedalTypeId} sconosciuto`;
  const wallet = WALLET[banner.payType];
  if (!wallet) return `payType ${banner.payType} non estraibile`;
  if (banner.test && !test) return 'banner di prova senza KHUX_GACHA_TEST=1';
  if (!sizes.has(banner.lotCount)) return `animazione per ${banner.lotCount} medaglie assente`;
  if (Number(body?.count) !== banner.lotCount) console.log(`  [gacha] count ${body?.count} diverso da lotCount ${banner.lotCount}: vale lotCount`);
  if (banner.isDayLimited && dayLeft(player, banner, realMs) < 1) return 'gia\' estratto oggi';
  if ((player[wallet] || 0) < banner.price) return `${wallet} ${player[wallet] || 0} < ${banner.price}`;
  if (freeSlots < banner.lotCount) return `box: ${freeSlots} posti per ${banner.lotCount} medaglie`;
  return null;
}

function payDraw(banner, player, realMs) {
  const wallet = WALLET[banner.payType];
  player[wallet] = (player[wallet] || 0) - banner.price;
  if (!banner.isDayLimited) return;
  const day = clock.dayIndex(realMs);
  if (player.gacha?.day !== day) player.gacha = { ...(player.gacha || {}), day, used: {} };
  player.gacha.used[banner.drawMedalTypeId] = (player.gacha.used[banner.drawMedalTypeId] || 0) + 1;
}

// gachaBonus addType 1 = nessun bonus (con altri valori la scena apre MedalInfo_DrowBonus, assente);
// effectNumbers 0 = nessun effetto (1/2 aprono Draw_RareMedal/Draw_LimitRareMedal: findings.md §3)
function drawResultFields(userMedalIds, firstIds) {
  return { gachaBonus: { addType: 1, number: 0, userMedalIds: [] }, firstGetUserMedalIds: firstIds, userMedalIds, effectNumbers: userMedalIds.map(() => 0) };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PAY = { 1: 'Jewels', 7: 'Platinum Tickets', 8: 'Draw Tickets' };
const priceText = (b) => `${b.price} ${b.price === 1 ? PAY[b.payType].replace(/s$/, '') : PAY[b.payType]}`;
function page(title, body) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>body{margin:0;background:#174a5c;color:#e8f2f6;font:17px sans-serif;padding:10px 14px 40px}'
    + 'h1{color:#5fe0f0;font-size:21px;margin:8px 0}h2{color:#5fe0f0;font-size:18px;margin:14px 0 6px}'
    + 'a{color:#fff}img{width:100%;max-width:640px;display:block;margin:6px 0}.b{border-bottom:2px dotted #8fb3c0;padding:8px 0}'
    + 'table{border-collapse:collapse}td{padding:2px 10px 2px 0}.n{color:#bcd}</style></head><body>'
    + `<h1>${esc(title)}</h1>${body}</body></html>`;
}

function detailPage(banner, medalNames) {
  const odds = gd.slotOdds(banner).map((s, i) => `<tr><td>Medal ${i + 1}</td><td>${s.map((o) => `${o.rare}★ ${o.pct}%`).join(', ')}</td></tr>`).join('');
  const pool = Object.entries(banner.pool).sort((a, b) => b[0] - a[0]).map(([r, ids]) => {
    const names = [...new Set(ids.map((id) => medalNames.get(id) || `#${id}`))].sort();
    return `<h2>${r}★ (${names.length})</h2><p>${names.map(esc).join(', ')}</p>`;
  }).join('');
  return page(banner.name, `<img src="/web/gacha/img/${banner.drawMedalTypeId}.png" alt="">`
    + `<p>${esc(priceText(banner))} for ${banner.lotCount} Medal${banner.lotCount === 1 ? '' : 's'}${banner.isDayLimited ? ', once per day' : ''}.</p>`
    + `<p class="n">Original banner: ${esc(banner.startDate)} to ${esc(banner.endDate)}.${banner.guarantees ? ' ' + esc(banner.guarantees) : ''}</p>`
    + `<h2>Draw rates (reconstructed)</h2><p class="n">The original game listed only the Medal rarities of each draw: these rates are reconstructed for this restoration.</p><table>${odds}</table>`
    + `<h2>Medals in this draw</h2>${pool}`);
}

function oddsPage(banners) {
  return page('Draw Odds', '<p class="n">The original rates were not published: the rates below are reconstructed for this restoration. Each Medal of a draw has the listed rarity, with a small chance of one star more.</p>'
    + banners.map((b) => `<div class="b"><b>${esc(b.name)}</b><table>${gd.slotOdds(b).map((s, i) => `<tr><td>Medal ${i + 1}</td><td>${s.map((o) => `${o.rare}★ ${o.pct}%`).join(', ')}</td></tr>`).join('')}</table></div>`).join(''));
}

function catalogPage(banners, { test }) {
  return page('Banner Catalog', '<p class="n">Banners available in the Shop. Tap a banner for its Medals and rates.</p>'
    + visibleBanners(banners, { test }).map((b) => `<div class="b"><a href="/web/gacha/detail/${b.drawMedalTypeId}"><img src="/web/gacha/img/${b.drawMedalTypeId}.png" alt="">${esc(b.name)}</a>`
      + `<div class="n">${esc(priceText(b))}, ${b.lotCount} Medal${b.lotCount === 1 ? '' : 's'} - original: ${esc(b.startDate)} to ${esc(b.endDate)}</div></div>`).join(''));
}

module.exports = { WALLET, catalogRow, catalogPlate, visibleBanners, dayLeft, gachaListData, checkDraw, payDraw, drawResultFields, detailPage, oddsPage, catalogPage };
```

- [ ] **Step 5: Lanciare i test**

Run: `node server/test-gacha-data.js && node server/test-make-banners.js && node server/test-gacha.js`
Expected: tre `OK`.

- [ ] **Step 6: Lanciare il generatore sui dati veri**

Run: `node server/make-banners.js`
Expected: quattro righe (B0001, B0027, B0011, B0456 «(prova)»), ognuna con pool non vuoti per le stelle del suo mix (B0001: 3★ e 4★; B0011: 3★, 4★, 5★; B0456: 5★), e nessuna riga «non copiata» per i quattro (immagini gia' 640x140). Poi verificare la validazione del master: `node -e "const t=require('./server/server')._test; console.log(t.masterRows('drawMedalType').length)"` deve stampare 5 e il server non deve loggare `[master] drawMedalType: N errori` (se `masterRows` non valida, lanciare `node server/server.js` per 3 secondi con `KHUX_SAVE` temporaneo e cercare la riga nel log). Se B0456 (6★:5 nell'originale; nel TSV `rarity_mix` puo' essere `6★:5`) non ha pool 6★ con `MAX_SET_NOW`, riportarlo: e' un banner di prova, va bene anche il pool 6★ dei set <= 9 se esiste.

- [ ] **Step 7: Commit**

```bash
git -c safe.directory=* add server/make-banners.js server/gacha.js server/test-make-banners.js server/test-gacha.js
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_shop_t4.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 5: collegamento in `server/server.js` e Notices

Modello consigliato: Sonnet.

**Files:**
- Modify: `server/server.js` (route ~143, respondLogin ~352, servedMasterRows ~434, nuove funzioni vicino a respondMedalMax ~1080, handler ~3101, `_test` ~3431)
- Modify: `server/routes-info-album.js`, `server/test-notices.js`
- Test: `server/test-gacha-server.js`

**Interfaces:**
- Consumes: `gacha-data.js` (Task 3), `gacha.js` (Task 4), funzioni esistenti di server.js: `serverTime()`, `realNow()`, `ret()`, `send(res, code, obj)`, `userPointData(now)`, `inventorySnapshot(now)`, `inventoryBlocks(now, snap)`, `grantItem(type, id, num)` (tipo 3 = medaglia: aggiunge in coda a `player.medals` un nuovo `{userMedalId, medalId, level: 1, getDatetime}`), `maxMedal()`, `savePlayer()`, `masterRows(name)`, `SESSION_BASE`.
- Produces: rotte `GET /gacha/list`, `POST /gacha/draw`, `GET /web/gacha/catalog`, `/web/gacha/detail/<id>`, `/web/gacha/odds`, `/web/gacha/img/<id>.png`; link di login `odds`; `_test` esporta `respondGachaList, respondGachaDraw, respondGachaWeb, grantItem, maxMedal, inventoryBlocks`.

- [ ] **Step 1: Scrivere il test**

```js
// Prova delle rotte dello Shop in server.js: node server/test-gacha-server.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-gacha-${process.pid}.json`);
const BANNERS = path.join(os.tmpdir(), `khux-test-gacha-banners-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* nuovo */ }
process.env.KHUX_SAVE = SAVE;
process.env.KHUX_MASTER_DIR = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
process.env.KHUX_REVISION = '118';
process.env.KHUX_GACHA_BANNERS = BANNERS;
process.env.KHUX_GACHA_SIZES = '1,3,10';
delete process.env.KHUX_GACHA_TEST; delete process.env.KHUX_REAL_NOW; delete process.env.KHUX_SERVER_TIME;
const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };
at('2026-10-16T15:00:00Z');
const banners = [
  { drawMedalTypeId: 10001, rowId: 'B0001', name: 'DAILY DEAL!', payType: 1, price: 600, lotCount: 3, isDayLimited: 1, rarityMix: [[4, 1], [3, 2]],
    pool: { 3: [11013], 4: [11014] }, test: false, sortId: 10, comment: 'x', startDate: '2016-04-07', endDate: '2018-01-31', image: 'a.png' },
  { drawMedalTypeId: 10011, rowId: 'B0011', name: 'Epic Medal Carnival', payType: 1, price: 3000, lotCount: 10, isDayLimited: 0, rarityMix: [[3, 10]],
    pool: { 3: [11013] }, test: false, sortId: 30, comment: 'x', startDate: '2016-05-13', endDate: '2016-05-19', image: 'b.png' },
];
fs.writeFileSync(BANNERS, JSON.stringify({ banners }));
const log = console.log;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
const raw = (fn, ...a) => { let b = null, h = null; quiet(() => fn({ writeHead(c, hd) { h = hd; }, end(x) { b = x; } }, ...a)); return { body: b, headers: h }; };
call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
const p = t.player;

// lista
let l = call(t.respondGachaList);
check(Array.isArray(l.petGachaList) && l.gachaList[0].drawMedalTypeId === 9001 && l.gachaList.length === 3, 'lista: Catalog + 2 banner');

// estrazione x3 pagata in jewel
p.freeStone = 1000;
const before = p.medals.length;
let r = call(t.respondGachaDraw, { drawMedalTypeId: 10001, count: 3 });
check(p.freeStone === 400 && p.medals.length === before + 3, 'x3: -600 jewel, +3 medaglie');
check(r.userMedalIds.length === 3 && new Set(r.userMedalIds).size === 3, 'x3: 3 id distinti');
const sent = new Set(r.userMedals.map((m) => m.userMedalId));
check(r.userMedalIds.every((id) => sent.has(id)), 'x3: ogni id in userMedals');
check(r.effectNumbers.join() === '0,0,0' && r.gachaBonus.addType === 1, 'x3: effetti e bonus neutri');
check(Array.isArray(r.guiltBurstFirstUserMedalIds) && Array.isArray(r.guiltBurstMaxUserMedalIds) && Array.isArray(r.userSkills) && Array.isArray(r.userMaterials), 'x3: liste obbligatorie');
check(r.userData.userPoint && typeof r.userData.userPoint.limitedDrawTicket1 === 'number', 'x3: userPoint');
check(r.firstGetUserMedalIds.length <= 2, 'x3: al massimo una novita per medalId (11013 x2 e 11014)');
check(call(t.respondGachaList).gachaList.find((x) => x.drawMedalTypeId === 10001).userLimitedCount === 0, 'lista: Daily usato oggi');

// rifiuti: niente cambia
const stone = p.freeStone, n = p.medals.length;
r = call(t.respondGachaDraw, { drawMedalTypeId: 10001, count: 3 });
check(!r.userMedalIds && p.freeStone === stone && p.medals.length === n, 'Daily: seconda volta rifiutata');
r = call(t.respondGachaDraw, { drawMedalTypeId: 10011, count: 10 });
check(!r.userMedalIds && p.freeStone === stone, 'x10 senza jewel: rifiutata');
r = call(t.respondGachaDraw, { drawMedalTypeId: 9001, count: 1 });
check(!r.userMedalIds, 'Catalog: rifiutata');

// x10 con la stessa medaglia: una sola novita'
p.freeStone = 3000;
p.medals = p.medals.filter((m) => m.medalId !== 11013);
r = call(t.respondGachaDraw, { drawMedalTypeId: 10011, count: 10 });
check(r.userMedalIds.length === 10 && new Set(r.userMedalIds).size === 10 && r.firstGetUserMedalIds.length === 1, 'x10: 10 id, una novita');
check(p.freeStone === 0, 'x10: -3000');

// box pieno
p.freeStone = 3000;
p.medalMaxExtra = -100000;
r = call(t.respondGachaDraw, { drawMedalTypeId: 10011, count: 10 });
check(!r.userMedalIds && p.freeStone === 3000, 'box pieno: rifiutata');
p.medalMaxExtra = 0;

// pagine e immagini
let w = raw(t.respondGachaWeb, '/web/gacha/detail/10001');
check(String(w.body).includes('DAILY DEAL!') && /text\/html/.test(w.headers['Content-Type']), 'pagina dettagli');
w = raw(t.respondGachaWeb, '/web/gacha/odds');
check(String(w.body).includes('Draw Odds'), 'pagina odds');
w = raw(t.respondGachaWeb, '/web/gacha/catalog');
check(String(w.body).includes('/web/gacha/detail/10011'), 'pagina catalogo');
w = raw(t.respondGachaWeb, '/web/gacha/detail/77');
check(w.headers && String(w.body).includes('not found'), 'banner sconosciuto: pagina di errore');
w = raw(t.respondGachaWeb, '/web/gacha/img/../../save/x.png');
check(!w.headers || w.headers['Content-Type'] !== 'image/png', 'immagine: niente percorsi fuori cartella');

// login: link Draw Odds
const login = call(t.respondLogin, {});
check(/\/web\/gacha\/odds$/.test(login.odds || ''), 'login: odds');

// catalogo assente: solo la piastra Catalog
fs.writeFileSync(BANNERS, 'non json');
t.reloadGachaBanners();
l = call(t.respondGachaList);
check(l.gachaList.length === 1 && l.gachaList[0].drawMedalTypeId === 9001, 'catalogo assente: solo Catalog');

fs.unlinkSync(BANNERS);
try { fs.unlinkSync(SAVE); } catch { /* gia' tolto */ }
if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha server');
```

Se `respondLogin` ha un'altra firma, guardare `server/test-master-clock.js` (la chiama gia') e copiarne l'uso.

- [ ] **Step 2: Lanciarlo e vederlo fallire**

Run: `node server/test-gacha-server.js`
Expected: errore su `t.respondGachaList is not a function`.

- [ ] **Step 3: Rotte**

In `route(url)` dopo `if (p === '/web/passive') return 'passivepage';`:

```js
  if (p === '/gacha/list') return 'gachalist';
  if (p === '/gacha/draw') return 'gachadraw';
  if (p.startsWith('/web/gacha/')) return 'gachaweb'; // catalogo, dettagli, odds, immagini dei banner
```

- [ ] **Step 4: Stato e funzioni**

Vicino agli altri `require` in cima:

```js
const gachaData = require('./gacha-data');
const gacha = require('./gacha');
```

Dopo `respondMedalMax` (dove si trovano le altre funzioni dei jewel):

```js
// Shop > Draw (docs/notes/shop.md). Catalogo dei banner scritto da server/make-banners.js; senza
// catalogo la lista ha solo la piastra Banner Catalog. KHUX_GACHA_TEST=1 mostra i banner di prova
// (Platinum Ticket Draw). KHUX_GACHA_SIZES: numeri di medaglie con l'animazione del risultato nelle
// risorse (lwf/raisedraw/demo/raidgacha_result_display_NN, recon/tools/import_jp_raisedraw.py).
const GACHA_FILE = process.env.KHUX_GACHA_BANNERS || path.join(__dirname, 'game_data', 'gacha_banners.json');
const GACHA_IMG = path.join(__dirname, 'game_data', 'gacha_img');
const GACHA_TEST = process.env.KHUX_GACHA_TEST === '1';
const GACHA_SIZES = new Set((process.env.KHUX_GACHA_SIZES || '1,3,10').split(',').map(Number));
const WEB_BASE = SESSION_BASE.replace(/^https:/, 'http:'); // https: la WebView rifiuta il certificato
let gachaBannerList = null;
const gachaBanners = () => (gachaBannerList ??= gachaData.loadBanners(GACHA_FILE));
function reloadGachaBanners() { gachaBannerList = null; }

function respondGachaList(res) {
  send(res, 200, { ret: ret(), ...gacha.gachaListData(gachaBanners(), player, { realMs: realNow(), webBase: WEB_BASE, test: GACHA_TEST, sizes: GACHA_SIZES }) });
}

// POST /gacha/draw (azione 76): ramo 0x7c46bc di [fn], parser [fn] (userPoint),
// [fn] (userMedals, userSkills, userMaterials, gachaBonus, firstGetUserMedalIds, userMedalIds,
// effectNumbers: tutti obbligatori) e [fn] (guiltBurstFirst/MaxUserMedalIds). Un rifiuto
// risponde solo {ret}: «200 ERROR :76» e il client torna allo Shop ([fn]).
function respondGachaDraw(res, body) {
  const now = serverTime(), realMs = realNow();
  const banner = gachaData.bannerById(gachaBanners(), body?.drawMedalTypeId);
  const why = gacha.checkDraw(banner, player, body, { realMs, test: GACHA_TEST, freeSlots: maxMedal() - player.medals.length, sizes: GACHA_SIZES });
  if (why) {
    console.log(`  [gacha] estrazione rifiutata: ${why} (corpo ${JSON.stringify(body)})`);
    return send(res, 200, { ret: ret() });
  }
  const snap = inventorySnapshot(now);
  const owned = new Set(player.medals.map((m) => m.medalId));
  const medalIds = gachaData.rollDraw(banner, Math.random);
  gacha.payDraw(banner, player, realMs);
  const userMedalIds = [], first = [];
  for (const medalId of medalIds) {
    grantItem(3, medalId, 1);
    const id = player.medals[player.medals.length - 1].userMedalId;
    userMedalIds.push(id);
    if (!owned.has(medalId)) { first.push(id); owned.add(medalId); }
  }
  savePlayer();
  console.log(`  [gacha] ${banner.rowId} ${banner.name}: -${banner.price} ${gacha.WALLET[banner.payType]}, medaglie ${medalIds.join(',')}`);
  send(res, 200, { ret: ret(), userData: { userPoint: userPointData(now) }, ...inventoryBlocks(now, snap), ...gacha.drawResultFields(userMedalIds, first) });
}

// Pagine WebView dello Shop (Details della piastra Catalog e di ogni banner, Draw Odds) e immagini
// 640x140 dei banner (bannerUrl, scaricate dal client via http)
function respondGachaWeb(res, url) {
  const p = url.split('?')[0];
  const html = (s, code = 200) => { const b = Buffer.from(s, 'utf8'); res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': b.length }); res.end(b); };
  const img = /^\/web\/gacha\/img\/(\d+)\.png$/i.exec(p);
  if (img) {
    const file = path.join(GACHA_IMG, `${Number(img[1])}.png`);
    if (!fs.existsSync(file)) return html('not found', 404);
    const b = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': b.length });
    return res.end(b);
  }
  if (/^\/web\/gacha\/catalog$/i.test(p)) return html(gacha.catalogPage(gachaBanners(), { test: GACHA_TEST }));
  if (/^\/web\/gacha\/odds$/i.test(p)) return html(gacha.oddsPage(gacha.visibleBanners(gachaBanners(), { test: GACHA_TEST })));
  const det = /^\/web\/gacha\/detail\/(\d+)$/i.exec(p);
  const banner = det && gacha.visibleBanners(gachaBanners(), { test: GACHA_TEST }).find((b) => b.drawMedalTypeId === Number(det[1]));
  if (!banner) return html('<!doctype html><meta charset="utf-8"><body style="background:#174a5c;color:#fff;font:18px sans-serif">Banner not found.</body>', 404);
  const names = new Map(masterRows('medal').map((m) => [m.medalId, m.name]));
  return html(gacha.detailPage(banner, names));
}
```

Se `SESSION_BASE` e' definito dopo il punto in cui va `WEB_BASE`, spostare `WEB_BASE` subito dopo `SESSION_BASE`. Se `fs`/`path` hanno altri nomi in server.js, usare quelli.

- [ ] **Step 5: Handler, link di login e URL del master**

Nell'handler, accanto a `if (kind === 'noticespage')`:

```js
      // Shop > Draw (azioni 75/76) e pagine/immagini dei banner
      if (kind === 'gachalist') return respondGachaList(res);
      if (kind === 'gachadraw') return respondGachaDraw(res, entry.bodyDecoded);
      if (kind === 'gachaweb') return respondGachaWeb(res, req.url);
```

In `respondLogin`, dopo `body.license = ...`:

```js
  // Draw Odds dello Shop (pulsante su ogni piastra, link globale +0xf0, [fn])
  body.odds = `${WEB_BASE}/web/gacha/odds`;
```

In `servedMasterRows(name, realMs)`, prima di `if (name !== 'mission') return rows;`:

```js
  // drawMedalType: bannerUrl/detailUrl sono percorsi (server/make-banners.js); l'indirizzo http si
  // aggiunge qui (max 128 byte, strncpy del client)
  if (name === 'drawMedalType') {
    return rows.map((r) => ({ ...r, bannerUrl: r.bannerUrl.startsWith('/') ? WEB_BASE + r.bannerUrl : r.bannerUrl,
      detailUrl: r.detailUrl.startsWith('/') ? WEB_BASE + r.detailUrl : r.detailUrl }));
  }
```

In `module.exports._test` aggiungere una riga:

```js
  // server/test-gacha-server.js
  respondGachaList, respondGachaDraw, respondGachaWeb, reloadGachaBanners, grantItem, maxMedal, inventoryBlocks,
```

- [ ] **Step 6: Notices**

In `server/routes-info-album.js`, in `DIFFERENCES_BODY` prima della riga «There are no purchases...»:

```js
  'Shop draw rates are reconstructed where the original game did not publish them: Draw Odds and each banner\'s Details say so.',
```

E in `NOTICES`, dopo la notizia «Missions»:

```js
  { date: '10/16', tag: 'INFORMATION', title: 'Shop',
    body: ['The first banner in the Shop, Banner Catalog, cannot be drawn: tap its Details to see the banners and the Medals they contain.',
      'Draws cost Jewels or Tickets earned in the game. Draw Odds shows the rates used by this restoration.'] },
```

In `server/test-notices.js` aggiungere dopo il controllo dell'ordine:

```js
check(pos('Missions') < pos('Shop'), 'notizia Shop dopo Missions');
check(n.NOTICES.some((x) => x.title === 'Differences from the original game' && /draw rates are reconstructed/.test(x.body.join(' '))), 'probabilita nelle differenze');
```

- [ ] **Step 7: Lanciare tutti i test del server**

Run: `for f in server/test-*.js; do node "$f" || echo "FALLITO $f"; done`
Expected: tutti `OK`, nessun `FALLITO` (in particolare test-master-clock, test-notices, test-gacha-server).

- [ ] **Step 8: Commit**

```bash
git -c safe.directory=* add server/server.js server/routes-info-album.js server/test-notices.js server/test-gacha-server.js
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_shop_t5.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 6: risorse 40, revisione 118 e prove al banco

Modello consigliato: Opus (banco).

**Files:**
- Modify: `tools/ldplayer/session/run-server.ps1` (righe 13), `relogin.ps1` (riga 5), `update-resources.ps1` (riga 6): default 117 -> 118
- Create: `docs/notes/shop.md`
- Modify: `docs/ISSUES.md`, `HANDOFF.md`, `docs/notes/server.md` (riga 13 e dove compare 117 come BASE corrente)

**Interfaces:**
- Consumes: tutto quanto sopra.

- [ ] **Step 1: Copie e generazione**

Copiare `server\save` in `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-gacha`. Lanciare `node server\make-banners.js` e `python recon\tools\make_shop_art.py D:\Progetto_Restauro_KH_UX\tmp\shop_art\files server\game_data` (per avere `9001.png` anche prima del build).

- [ ] **Step 2: Risorse 40**

Run (PowerShell, dalla radice del repo): `.\tools\ldplayer\session\build-resources.ps1 -Version 40 -DryRun`, poi `.\tools\ldplayer\session\build-resources.ps1 -Version 40`.
Controllare `stage_gen\raisedraw_report.json` (deve dire `ok` per `raidgacha_result_display_03` e `_10`) e aggiornare `KHUX_GACHA_SIZES` in `run-server.ps1` se le dimensioni complete sono diverse da `1,3,10` (es. `$env:KHUX_GACHA_SIZES = "1,3,5,10"`).

- [ ] **Step 3: Revisione 118 e installazione**

Cambiare i default 117 -> 118 nei tre script e nelle note; poi `.\tools\ldplayer\session\update-resources.ps1 -Revision 118`. Expected: il client scarica le risorse 40 e il master (log `GET /resource/`, `GET /master/drawMedalType`), home raggiunta (screenshot).

- [ ] **Step 4: Prove al banco (in serie, `AppAlive` prima di ogni tocco, SKIP nei dialoghi)**

Con `. .\tools\ldplayer\bench_lib.ps1`, screenshot con `Shot shop_<nome>`:
1. Shop > Draw: piastra Catalog in cima con banner nostro, pulsante grigio con «Open Details to browse the Banner Catalog» e l'icona nuova; sotto Daily Deal, Small Deal, Epic Medal Carnival con le loro immagini e didascalie. Annotare il testo dei pulsanti di estrazione (payType 1).
2. Tocco sul pulsante grigio del Catalog: nessuna richiesta nel log.
3. Details della Catalog: si apre il catalogo; tocco su un banner: pagina dettagli. Chiudere con la X: **annotare se il log mostra un nuovo `GET /gacha/list`** (prova della ricarica, spec 8; l'analisi statica dice di no). Se non ricarica, la pagina del catalogo resta com'e' (la scelta del gruppo arriva col sotto-progetto 3, che dovra' dire «esci e rientra»).
4. Draw Odds: pagina delle probabilita'.
5. Small Deal x1 (300 jewel): conferma, animazione, risultato con 1 medaglia, «NEW» se nuova; OK -> torna allo Shop; jewel -300 nella barra (log: `GET /user/stone`, `GET /gacha/list`). La medaglia c'e' nell'elenco medaglie.
6. Daily Deal x3: 3 medaglie; tornati nello Shop il Daily Deal non si puo' piu' estrarre oggi (annotare come appare: pulsante spento o tocco senza effetto).
7. Epic Medal Carnival x10 (3000 jewel; se mancano, dare jewel con un present di prova a server fermo): animazione da 10 e due righe di tessere.
8. Ripetere 10 aperture dello Shop (Home <-> Shop): nessun crash.
9. Biglietti: server fermo, `limitedDrawTicket1 = 2` nel salvataggio (node -e su `server\save\player.json`), `relogin.ps1 -Tag gt` con `$env:KHUX_GACHA_TEST="1"` nell'ambiente di run-server (o parametro se esiste); estrarre Platinum Ticket Draw x5 se la dimensione 5 e' completa, altrimenti verificare solo che la piastra mostri 2 biglietti e annotarlo. Poi tornare al server normale e ripristinare i biglietti a 0.
10. Notices: notizia «Shop» e riga nelle differenze.
In caso di crash: fermare subito ogni script, `tools\ldplayer\armtrace\tombstone.ps1`, annotare file mancante (spesso una texture o una LWF della scena) e correggere nel Task giusto prima di continuare.

- [ ] **Step 5: Documentazione**

Creare `docs/notes/shop.md` con: protocollo di /gacha/list e /gacha/draw (da `tmp\gacha_re\findings.md`, con gli indirizzi), regole delle piastre (spike_catalog/notes.md: payType, price, benefitId, comment), risorse raisedraw (ancora `#risorse`), esiti delle prove 1-10 con i nomi degli screenshot. In `docs/ISSUES.md` aggiungere I-135 (APERTO): «Icone dei biglietti `img/incentive/draw_Ticket_40.png`/`41.png` (Platinum/Draw Ticket) e `Star7_Ticket_37/38` hanno il segno «仮» (segnaposto dello sviluppo): da sostituire con le grafiche originali» e aggiornare «ultimo: **I-135**». Aggiornare `HANDOFF.md` (Shop: sotto-progetto 1 fatto, BASE 118, risorse 40) e `docs/notes/server.md` (BASE 118).

- [ ] **Step 6: Commit**

```bash
git -c safe.directory=* add tools/ldplayer/session/run-server.ps1 tools/ldplayer/session/relogin.ps1 tools/ldplayer/session/update-resources.ps1 docs/notes/shop.md docs/ISSUES.md HANDOFF.md docs/notes/server.md
git -c safe.directory=* commit -F D:/Progetto_Restauro_KH_UX/tmp/msg_shop_t6.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```
