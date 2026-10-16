"""LWF del risultato delle estrazioni (Shop > Draw) dai dati JP 4.3.1 per le cartelle non servite.

    python recon/tools/import_jp_raisedraw.py --ww <catalog\\raisedraw_ww> --out <stage_gen\\files>
                                              --report <stage_gen\\raisedraw_report.json> [--check]
                                              (Pillow: senza -I)

SceneDrawRaise (init FUN_00c6c110, tmp\\gacha_re\\findings.md par. 4) apre
lwf/raisedraw/demo/raidgacha_result_display_%02d/ (%02d = medaglie estratte, 1-10; file mancante =
crash) e per ogni medaglia lwf/raisedraw/Medal/Medal_D_Up|Rev|None<rare> secondo darklight.
Le risorse WW servono solo raidgacha_result_display_01 e Medal_D_Up3 (catalog\\raisedraw_ww,
estratte una volta da build-resources.ps1 con res_bulk.py).

LWF: la revisione JP piu' alta (`<nome>.<8 cifre>.lwf`, come latest() di import_jp_coco.py; la
00152892 di raidgacha_result_display_01 e' identica byte per byte alla LWF WW servita).
Texture richieste = tabella delle texture della LWF (header: Data[8] texture {stringId, formato,
larghezza, altezza, scala}, Data[35] stringhe), non le stringhe .png: i segnaposto
`Medal_D_*.png` che le LWF demo nominano non sono texture (li sostituisce il codice con le LWF
Medal_D_*) e infatti mancano dal .res JP e dalle risorse WW. Il .res JP e' vecchio (elenca
ビットマップ 80 che la LWF corrente non usa piu'): non si usa.

Fonti di ogni texture, in ordine (16 ott 2026, mai una texture assente):
 (1) stesso file nella cartella JP (PNG vero, alpha diritta -> BTF con btf.encode, che premoltiplica);
 (2) solo per demo/raidgacha_result_display_NN: la texture corrispondente della
     raidgacha_result_display_01 servita (BTF, copiata cosi' com'e'). NON per nome: le esportazioni
     02-10 rinumerano le «ビットマップ N» (la 73 di _10 e' la 75 di _01, entrambe 109x109), quindi la
     ricerca per <esadecimale del nome> come make_jp_enemies.py darebbe immagini sbagliate (verificato:
     le omonime di gacha_result_display_01 JP hanno altre dimensioni). Si allineano invece le tabelle
     delle texture (stesso ordine di esportazione; difflib sulle dimensioni dichiarate): una texture
     in un blocco uguale prende quella di _01 nella stessa posizione. Controllo: dove le dimensioni
     individuano un solo contenuto in _01, l'allineamento deve dare quello (02-10: 50-56 su 50-56,
     nessun disaccordo); se no e' un conflitto. Fuori dai blocchi allineati: un solo contenuto con
     quelle dimensioni in _01, oppure stesso nome non «ビットマップ» (yellow.png) con stesse dimensioni.
Le Medal_D_* non hanno riferimento WW della stessa immagine (Medal_D_Up3 e' un'altra medaglia):
solo (1). Le dimensioni del file trovato devono essere quelle dichiarate nella LWF.
Una cartella entra solo se TUTTE le texture sono trovate; rapporto JSON per cartella (lo legge il
server: lotCount solo fra le raidgacha_result_display_NN servite od ok).
"""
import argparse
import difflib
import hashlib
import io
import json
import os
import re
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import btf  # noqa: E402

sys.stdout.reconfigure(encoding='utf-8')
D = r'D:\Progetto_Restauro_KH_UX'
JP = os.path.join(D, 'thethiny_data', ' KHUx data shared', 'khux_dev_data', 'data',
                  'khux_dev_jp_final_4.3.1', 'data', 'jp_final_4.3.1', 'lwf', 'raisedraw')
REV = re.compile(r'^(.*)\.(\d{8})(\.[^.]+)$')
BITMAP = 'ビットマップ '

WANTED = ([f'demo/raidgacha_result_display_{n:02d}' for n in range(1, 11)]
          + [f'Medal/Medal_D_Up{n}' for n in range(1, 13)]
          + [f'Medal/Medal_D_Rev{n}' for n in range(1, 8)]
          + [f'Medal/Medal_D_None{n}' for n in range(1, 8)])
# cartella WW servita della stessa animazione (riferimento per le texture tolte dall'estrazione JP)
REFS = {'demo/raidgacha_result_display_': 'demo/raidgacha_result_display_01'}


def served_names():
    names = set()
    with open(os.path.join(D, 'resource_data', 'names_v4.tsv'), encoding='utf-8') as f:
        for line in f:
            names.add(line.split('\t', 1)[0])
    return names


def latest(folder, base, ext):
    """File <base><ext> o la revisione piu' alta <base>.<8 cifre><ext> nella cartella JP."""
    best, best_rev = None, -2
    for f in os.listdir(folder):
        m = REV.match(f)
        rev = int(m.group(2)) if m and m.group(1) == base and m.group(3) == ext else (
            -1 if f == base + ext else -2)
        if rev > best_rev:
            best, best_rev = f, rev
    return os.path.join(folder, best) if best else None


def lwf_textures(path):
    """[(nome file della texture, (larghezza, altezza))] dalla tabella texture della LWF, in ordine.
    Header: 'LWF\\0', 3 byte di versione, opzione, 6 int, poi Data {offset, numero} (int32):
    [0] byte delle stringhe, [8] texture (20 byte l'una), [35] stringhe {offset, lunghezza}."""
    d = open(path, 'rb').read()
    if d[:4] != b'LWF\0':
        raise ValueError(f'{path}: non LWF')
    data = struct.unpack_from('<72i', d, 32)
    sb = data[0]
    so, sn = data[70], data[71]
    if so + 8 * sn != len(d):
        raise ValueError(f'{path}: tabella stringhe inattesa')
    strs = []
    for i in range(sn):
        o, n = struct.unpack_from('<2i', d, so + 8 * i)
        strs.append(d[sb + o:sb + o + n].decode('utf-8'))
    to, tn = data[16], data[17]
    out = []
    for i in range(tn):
        sid, _fmt, w, h = struct.unpack_from('<4i', d, to + 20 * i)
        out.append((strs[sid], (w, h)))
    return out


def orig_name(base, fname):
    """Nome originale della texture (<base>_<hex UTF-8>.png); se non e' esadecimale, il file."""
    try:
        return bytes.fromhex(fname[len(base) + 1:-4]).decode('utf-8')
    except ValueError:
        return fname


def img_size(data):
    """Dimensioni (tela) di un BTF o di un PNG vero."""
    i = btf.info(data)
    if i:
        return i['canvas']
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>2I', data[16:24])
    return None


def ref_map(target, ref):
    """Texture della LWF target -> file corrispondente della LWF di riferimento WW (vedi docstring).
    Restituisce ({nome target: nome ref}, [conflitti])."""
    rbase = os.path.basename(ref['dir'])
    md5 = {k: hashlib.md5(open(os.path.join(ref['dir'], k), 'rb').read()).hexdigest()
           for k, _ in ref['tex']}
    bydim = {}
    for k, wh in ref['tex']:
        bydim.setdefault(wh, {}).setdefault(md5[k], k)
    sm = difflib.SequenceMatcher(None, [wh for _, wh in ref['tex']], [wh for _, wh in target['tex']],
                                 autojunk=False)
    aligned = {}
    for op, a1, a2, b1, b2 in sm.get_opcodes():
        if op == 'equal':
            for i in range(a2 - a1):
                aligned[b1 + i] = a1 + i
    tbase = target['base']
    by_orig = {orig_name(rbase, k): (k, wh) for k, wh in ref['tex']}
    out, conflict = {}, []
    for j, (k, wh) in enumerate(target['tex']):
        uniq = bydim.get(wh, {})
        if j in aligned:
            rk = ref['tex'][aligned[j]][0]
            if len(uniq) == 1 and md5[rk] not in uniq:
                conflict.append(orig_name(tbase, k))
                continue
            out[k] = rk
        elif len(uniq) == 1:
            out[k] = next(iter(uniq.values()))
        else:
            name = orig_name(tbase, k)
            hit = by_orig.get(name)
            if not name.startswith(BITMAP) and hit and hit[1] == wh:
                out[k] = hit[0]
    return out, conflict


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ww', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--report', required=True)
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    served = served_names()
    refs = {}
    for prefix, rel in REFS.items():
        rdir = os.path.join(a.ww, 'lwf', 'raisedraw', *rel.split('/'))
        rbase = rel.split('/')[-1]
        rl = os.path.join(rdir, rbase + '.lwf')
        if not os.path.exists(rl):
            raise SystemExit(f'manca il riferimento WW {rl} (estrarlo con res_bulk.py)')
        refs[prefix] = {'dir': rdir, 'tex': lwf_textures(rl)}
    report = {}
    for rel in WANTED:
        base = rel.split('/')[-1]
        if f'lwf/raisedraw/{rel}/{base}.lwf' in served:
            report[rel] = {'status': 'served'}
            continue
        folder = os.path.join(JP, *rel.split('/'))
        lwf = latest(folder, base, '.lwf') if os.path.isdir(folder) else None
        if not lwf:
            report[rel] = {'status': 'missing-lwf'}
            continue
        tex = lwf_textures(lwf)
        ref = next((r for p, r in refs.items() if rel.startswith(p)), None)
        mapped, conflict = ref_map({'base': base, 'tex': tex}, ref) if ref else ({}, [])
        files, missing, src_count = {}, [], {'jp': 0, 'ww': 0}
        for k, wh in tex:
            name = orig_name(base, k)
            if name in conflict:
                continue
            own = os.path.join(folder, k)
            if os.path.exists(own):
                cand = ('jp', own)
            elif k in mapped:
                cand = ('ww', os.path.join(ref['dir'], mapped[k]))
            else:
                missing.append(name)
                continue
            if tuple(img_size(open(cand[1], 'rb').read()) or ()) != wh:
                conflict.append(f'{name} (dimensioni diverse da {wh[0]}x{wh[1]})')
                continue
            files[k] = cand
            src_count[cand[0]] += 1
        entry = {'lwf': os.path.basename(lwf), 'textures': len(tex)}
        if missing or conflict:
            report[rel] = {'status': 'incomplete', **entry, 'missing': missing, 'conflict': conflict}
            continue
        report[rel] = {'status': 'ok', **entry, 'from_jp': src_count['jp'], 'from_ww': src_count['ww']}
        if a.check:
            continue
        dst = os.path.join(a.out, 'lwf', 'raisedraw', *rel.split('/'))
        os.makedirs(dst, exist_ok=True)
        with open(lwf, 'rb') as s, open(os.path.join(dst, base + '.lwf'), 'wb') as d:
            d.write(s.read())
        for k, (kind, src) in files.items():
            data = open(src, 'rb').read()
            if kind == 'jp' and not data.startswith(b'\x89BTF'):
                from PIL import Image
                data = btf.encode(Image.open(io.BytesIO(data)).convert('RGBA'))
            with open(os.path.join(dst, k), 'wb') as d:
                d.write(data)
    os.makedirs(os.path.dirname(os.path.abspath(a.report)), exist_ok=True)
    with open(a.report, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    for rel, r in report.items():
        extra = ''
        if r['status'] == 'ok':
            extra = f" ({r['lwf']}, {r['textures']} texture: {r['from_jp']} JP, {r['from_ww']} WW)"
        elif r['status'] == 'incomplete':
            extra = f" mancanti {r['missing']} conflitti {r['conflict']}"
        print(f"{rel}: {r['status']}{extra}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
