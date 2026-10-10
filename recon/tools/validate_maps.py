"""Controllo delle mappe di missione (STG + parti MAP) in una cartella stage/.

    python -I validate_maps.py <cartella_stage> <cls_dir> [stageId ...] [--json report.json]

cls_dir: cartella con map/<stanza>/<stanza>_cls.bin (es. maps_x). Formato: stage_gen/exits/NOTE.md.
Errori (E) per stage:
- STG: magia, numero di parti [2] basso = file _NN presenti (contigui da 00), parte di partenza
  [2] alto < parti, partenza [3],[4] percorribile nella parte di partenza;
- parte: magia MAP, +0x20 = 0, X (+0x24) = 4 + 36 n uscite, offset A/B/C coerenti con le sezioni;
- uscite: parte di destinazione esistente e diversa, punto d'uscita percorribile nella propria
  stanza, arrivo percorribile nella stanza di destinazione e a piu' di 96 da ogni uscita della
  destinazione (altrimenti si riparte subito), nessun nemico entro 96 dall'uscita;
- tutte le parti raggiungibili dalla parte di partenza seguendo le uscite;
- aree: [0]+[1] dentro l'elenco nemici della parte;
- uid unici fra le parti (aree, nemici, forzieri) - riportati a parte gli uid area duplicati;
- STG [8] aree, [9] nemici, [14] forzieri, [15] oggetti = somme sulle parti; esattamente un'area
  bersaglio ([4] & 1) e il suo primo nemico = STG [6].
Avvisi (W): nemici entro 200 da un'uscita, STG [12] diverso dalla parte del bersaglio.
"""
import collections
import json
import os
import re
import struct
import sys

args = [a for a in sys.argv[1:]]
jout = None
if '--json' in args:
    i = args.index('--json')
    jout = args[i + 1]
    del args[i:i + 2]
d, cls_dir = args[0], args[1]
only = {int(x) for x in args[2:]}
TRIG = 96
_cls = {}


def walkable(folder, x, y):
    if folder not in _cls:
        p = os.path.join(cls_dir, 'map', folder, folder + '_cls.bin')
        _cls[folder] = open(p, 'rb').read() if os.path.exists(p) else None
    c = _cls[folder]
    if c is None:
        return None
    W, H, stride = struct.unpack_from('<3i', c, 4)
    return 0 <= x < W and 0 <= y < H and not (c[16 + y * stride + x // 8] >> (7 - x % 8)) & 1


def i32(b, o):
    return struct.unpack_from('<i', b, o)[0]


def parse_part(b):
    p = {'err': []}
    if b[:4] != b'MAP\0':
        p['err'].append('magia MAP assente')
        return p
    p['room'] = b[0x0c:0x1c].split(b'\0')[0].decode('ascii', 'replace')
    e0, X, A, B, C = struct.unpack_from('<5i', b, 0x20)
    if e0 != 0:
        p['err'].append('+0x20 = %d (atteso 0)' % e0)
    n = i32(b, 0x34)
    if X != 4 + 36 * n:
        p['err'].append('X = %d ma uscite = %d (atteso %d)' % (X, n, 4 + 36 * n))
    p['exits'] = [struct.unpack_from('<9i', b, 0x38 + 36 * k) for k in range(n)]
    o = 0x34 + X
    na, ne = struct.unpack_from('<2i', b, o)
    o += 8
    p['areas'] = [struct.unpack_from('<17i', b, o + 0x44 * k) for k in range(na)]
    o += 0x44 * na
    p['enemies'] = [struct.unpack_from('<8i', b, o + 0x20 * k) for k in range(ne)]
    o += 0x20 * ne
    if o != 0x34 + A:
        p['err'].append('fine nemici 0x%x != A 0x%x' % (o, 0x34 + A))
    o = 0x34 + A
    nc = i32(b, o)
    p['chests'] = [struct.unpack_from('<5i', b, o + 4 + 20 * k) for k in range(nc)]
    if o + 4 + 20 * nc != 0x34 + B:
        p['err'].append('fine forzieri != B')
    o = 0x34 + B
    p['nobj'] = i32(b, o)
    if o + 4 + 16 * p['nobj'] != 0x34 + C:
        p['err'].append('fine oggetti != C')
    if 0x34 + C > len(b):
        p['err'].append('C oltre la fine del file')
    for k, a in enumerate(p['areas']):
        if a[0] < 0 or a[1] < 1 or a[0] + a[1] > ne:
            p['err'].append('area %d: nemici %d..%d fuori da %d' % (k, a[0], a[0] + a[1], ne))
    return p


def check(sid):
    E, W = [], []
    stg = open(os.path.join(d, 'mappoi_stg%05d.bin' % sid), 'rb').read()
    h = struct.unpack_from('<16i', stg)
    if stg[:4] != b'STG\0':
        E.append('magia STG assente')
    nparts, spart = h[2] & 0xffff, h[2] >> 16
    files = sorted(int(m.group(1)) for f in os.listdir(d)
                   for m in [re.fullmatch(r'mappoi_stg%05d_(\d+)\.bin' % sid, f)] if m)
    if files != list(range(nparts)):
        E.append('parti nell\'STG = %d, file = %s' % (nparts, files))
    parts = []
    for k in range(len(files)):
        p = parse_part(open(os.path.join(d, 'mappoi_stg%05d_%02d.bin' % (sid, k)), 'rb').read())
        E += ['parte %d: %s' % (k, e) for e in p['err']]
        parts.append(p)
    if any('room' not in p for p in parts) or not parts:
        return E, W, h, parts
    if spart >= len(parts):
        E.append('parte di partenza %d >= %d' % (spart, len(parts)))
    elif walkable(parts[spart]['room'], h[3], h[4]) is False:
        E.append('partenza (%d,%d) non percorribile in %s' % (h[3], h[4], parts[spart]['room']))
    # uscite
    for k, p in enumerate(parts):
        for ex in p['exits']:
            x, y, ang, rest, fb, ax, ay, dst, face = ex
            if walkable(p['room'], x, y) is False:
                E.append('parte %d: uscita (%d,%d) non percorribile' % (k, x, y))
            if not 0 <= dst < len(parts) or dst == k:
                E.append('parte %d: uscita verso parte %d inesistente' % (k, dst))
                continue
            q = parts[dst]
            if walkable(q['room'], ax, ay) is False:
                E.append('parte %d: arrivo (%d,%d) non percorribile in %s' % (k, ax, ay, q['room']))
            for bx in q['exits']:
                dd = ((bx[0] - ax) ** 2 + (bx[1] - ay) ** 2) ** 0.5
                if dd <= TRIG:
                    E.append('parte %d: arrivo a %.0f da un\'uscita della parte %d' % (k, dd, dst))
            if face not in (1, 2):
                W.append('parte %d: verso d\'arrivo %d' % (k, face))
            for e in p['enemies']:
                dd = ((e[0] - x) ** 2 + (e[1] - y) ** 2) ** 0.5
                if dd <= TRIG:
                    E.append('parte %d: nemico uid %d a %.0f dall\'uscita' % (k, e[7], dd))
                elif dd < 200:
                    W.append('parte %d: nemico uid %d a %.0f dall\'uscita' % (k, e[7], dd))
    # raggiungibilita'
    if 0 <= spart < len(parts):
        seen, todo = {spart}, [spart]
        while todo:
            c = todo.pop()
            for ex in parts[c]['exits']:
                if 0 <= ex[7] < len(parts) and ex[7] not in seen:
                    seen.add(ex[7])
                    todo.append(ex[7])
        if len(seen) != len(parts):
            E.append('parti non raggiungibili: %s' % sorted(set(range(len(parts))) - seen))
    # uid
    ent_uids = collections.Counter()
    area_uids = collections.Counter()
    for p in parts:
        for a in p['areas']:
            area_uids[a[5]] += 1
        for e in p['enemies']:
            ent_uids[e[7]] += 1
        for c in p['chests']:
            ent_uids[c[4]] += 1
    dup = sorted(u for u, n in ent_uids.items() if n > 1)
    if dup:
        E.append('uid nemici/forzieri duplicati: %s' % dup[:8])
    adup = sorted(u for u, n in area_uids.items() if n > 1 or u in ent_uids)
    if adup:
        E.append('uid area duplicati o uguali a nemici/forzieri: %s' % adup[:8])
    # totali
    tot = (sum(len(p['areas']) for p in parts), sum(len(p['enemies']) for p in parts),
           sum(len(p['chests']) for p in parts), sum(p['nobj'] for p in parts))
    if (h[8], h[9], h[14], h[15]) != tot:
        E.append('totali STG (aree,nemici,forzieri,oggetti) %s != parti %s' % ((h[8], h[9], h[14], h[15]), tot))
    tg = [(k, a) for k, p in enumerate(parts) for a in p['areas'] if a[4] & 1]
    if len(tg) != 1:
        E.append('aree bersaglio: %d (attesa 1)' % len(tg))
    else:
        k, a = tg[0]
        if parts[k]['enemies'][a[0]][2] != h[6]:
            E.append('bersaglio STG %d != primo nemico dell\'area bersaglio %d' % (h[6], parts[k]['enemies'][a[0]][2]))
        if h[12] != k:
            W.append('STG [12] = %d, bersaglio nella parte %d' % (h[12], k))
    return E, W, h, parts


sids = sorted({int(m.group(1)) for f in os.listdir(d) for m in [re.fullmatch(r'mappoi_stg(\d+)\.bin', f)] if m})
if only:
    sids = [s for s in sids if s in only]
res = {}
cat = collections.Counter()
nparts = collections.Counter()
for sid in sids:
    E, W, h, parts = check(sid)
    nparts[len(parts)] += 1
    res[sid] = {'parts': len(parts), 'errors': E, 'warnings': W}
    for e in E:
        cat[re.sub(r'[-\d]+', '#', e.split(': ', 1)[-1] if e.startswith('parte') else e)[:60]] += 1
bad = [s for s in sids if res[s]['errors']]
print('stage: %d | parti: %s | con errori: %d | con avvisi: %d' % (
    len(sids), dict(sorted(nparts.items())), len(bad), sum(1 for s in sids if res[s]['warnings'])))
multi_bad = [s for s in bad if res[s]['parts'] > 1]
print('  a piu\' parti con errori: %d / %d' % (len(multi_bad), sum(1 for s in sids if res[s]['parts'] > 1)))
for k, v in cat.most_common(12):
    print('  E x%d  %s' % (v, k))
for s in (multi_bad or bad)[:8]:
    print('  %d: %s' % (s, res[s]['errors'][:3]))
if jout:
    json.dump(res, open(jout, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
