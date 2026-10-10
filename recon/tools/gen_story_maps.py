"""Mappe di tutte le missioni di storia (stage/mappoi_stg<stageId>.bin + _00.bin), in automatico.

    python -I recon/tools/gen_story_maps.py <config.json>

config: {"stages": stage_dec.json di thethiny, "quests": wiki\\quests.json,
         "enemies": server\\master_data\\enemy.json, "cls_dir": cartella con map/<stanza>/<stanza>_cls.bin,
         "template": una parte MAP vera (es. mappoi_stg01040_00.bin), "rooms": story_rooms.json,
         "out": cartella di uscita (stage/), "skip": [stageId...], "report": report.json}

Per ogni missione (stageBinId 1..N di thethiny = numero della missione):
- stanza: rooms[nome] se noto, altrimenti una stanza dello stesso mondo (prefisso del
  mondo, preferendo le _00_00) scelta in modo stabile dal nome: le stanze vere della
  storia arrivavano dal CDN, nelle risorse ce ne sono 86;
- nemici e tesori dalla wiki (quests.json: «enemies», «treasures», «target»), nomi ->
  enemyId della tabella enemy (bersaglio: famiglia 1xxxx come nelle mappe vere, altri
  8xxxx);
- posizioni: punti percorribili della bitmap delle collisioni (CLS: 1 bit per pixel, 0 =
  libero) collegati alla partenza (visita sulla griglia di 40 px); partenza = punto libero
  piu' a sinistra, aree distribuite lungo la distanza dalla partenza, l'arena del
  bersaglio (area 0 della parte modello, con il poligono) nel punto piu' lontano;
- intestazione STG (formato delle 1010-1040 vere): [1] 16, [2] parti, [3,4] partenza,
  [5] 2, [6] bersaglio, [7] 1, [8] aree, [9] nemici, [11] 1, [14] forzieri, [15] oggetti.
Una sola parte per missione, salvo "multiroom": true nella config: allora le missioni con
piu' stanze nella wiki (quests.json «rooms») hanno una parte MAP per stanza (_00, _01, ...),
collegate da uscite (blocco a 0x34 di ogni parte, vedi stage_gen/exits/NOTE.md):
- stanza k: uscita «avanti» nel punto piu' lontano dalla partenza -> arrivo nella stanza k+1
  ~240 unita' dentro dalla sua uscita «indietro» (messa nel punto di partenza della stanza);
- gruppi di nemici nella stanza indicata dalla wiki, bersaglio sempre nell'ultima stanza;
  niente nemici/forzieri entro 240 unita' da un'uscita;
- uid globali in ordine di file (area u, nemici u+1..u+n, poi i forzieri della parte);
- STG [2] = parti (partenza parte 0), [12] = parte del bersaglio, totali sommati.
Le missioni a una stanza escono identiche byte per byte alla versione senza multiroom.
"""
import collections
import hashlib
import json
import os
import re
import struct
import sys

cfg = json.load(open(sys.argv[1], encoding='utf-8-sig'))
stages = json.load(open(cfg['stages'], encoding='utf-8'))
quests = json.load(open(cfg['quests'], encoding='utf-8'))
quests = quests if isinstance(quests, list) else list(quests.values())
enemies = json.load(open(cfg['enemies'], encoding='utf-8'))
rooms = json.load(open(cfg['rooms'], encoding='utf-8-sig'))
tmpl = open(cfg['template'], 'rb').read()
out = cfg['out']
skip = set(cfg.get('skip', []))
os.makedirs(out, exist_ok=True)

WORLD = {1: 'DB', 2: 'DW', 3: 'WL', 4: 'AG', 5: 'OC', 6: 'BC', 7: 'CD', 8: 'ED'}
folders = sorted(d for d in os.listdir(os.path.join(cfg['cls_dir'], 'map')))
quest_by_num = {}
for q in quests:
    if q.get('number') and str(q['number']).isdigit():
        quest_by_num.setdefault(int(q['number']), q)

# nomi dei nemici -> id (bersaglio 1xxxx, gli altri 8xxxx, altrimenti il primo)
by_name = collections.defaultdict(list)
for e in enemies:
    by_name[e['name'].lower()].append(e['enemyId'])


def enemy_id(name, target=False):
    ids = by_name.get(name.lower().strip())
    if not ids:
        # boss senza riga nella tabella enemy: un nemico grande al suo posto (Armored Knight)
        return (10017 if target else 80017) if cfg.get('substitute_unknown', True) else None
    pref = [i for i in ids if (10000 <= i < 20000 if target else 80000 <= i < 90000)]
    return (pref or sorted(ids))[0]


def parse_enemies(q):
    """quests.json: {"room": primo nome, "note": "N}} {{e|Nome|n}} ...|Stanza|note"}."""
    groups = []
    for ent in q.get('enemies', []):
        parts = ent.get('note', '').split('|')
        first = re.match(r'\s*(\d+)', parts[0] or '1')
        members = [(ent['room'], int(first.group(1)) if first else 1)]
        for m in re.finditer(r'\{\{e\|([^|}]+)\|(\d+)', ent.get('note', '')):
            members.append((m.group(1), int(m.group(2))))
        is_target = any('target' in p.lower() for p in parts[1:])
        room = ''
        for p in parts:
            if p and not p.strip().endswith('}}') and not re.match(r'^\s*\d', p) and '{{' not in p:
                room = p.strip()
                break
        groups.append({'members': members, 'target': is_target, 'room': room})
    return groups


def room_folder(name, world):
    if name in rooms:
        return rooms[name]
    pre = WORLD.get(world, 'DB')
    cand = [f for f in folders if f.startswith(pre + '_')] or [f for f in folders if f.startswith('DB_')]
    base = [f for f in cand if f.endswith('_00_00')] or cand
    h = int(hashlib.md5(name.encode()).hexdigest(), 16)
    return base[h % len(base)]


GRID, MARGIN = 40, 40
_cls_cache = {}


def walk_grid(folder):
    if folder in _cls_cache:
        return _cls_cache[folder]
    cls = open(os.path.join(cfg['cls_dir'], 'map', folder, folder + '_cls.bin'), 'rb').read()
    W, H, stride = struct.unpack_from('<3i', cls, 4)

    def free(x, y):
        return 0 <= x < W and 0 <= y < H and not (cls[16 + y * stride + x // 8] >> (7 - x % 8)) & 1

    ok = set()
    for y in range(MARGIN, H - MARGIN, GRID):
        for x in range(MARGIN, W - MARGIN, GRID):
            if all(free(x + dx, y + dy) for dx in (-MARGIN, 0, MARGIN) for dy in (-MARGIN, 0, MARGIN)):
                ok.add((x, y))
    # componente piu' grande, distanze dalla partenza (punto libero piu' a sinistra)
    seen, comps = set(), []
    for p in sorted(ok):
        if p in seen:
            continue
        comp, q = [], collections.deque([p])
        seen.add(p)
        while q:
            c = q.popleft()
            comp.append(c)
            for d in ((GRID, 0), (-GRID, 0), (0, GRID), (0, -GRID)):
                n = (c[0] + d[0], c[1] + d[1])
                if n in ok and n not in seen:
                    seen.add(n)
                    q.append(n)
        comps.append(comp)
    comp = set(max(comps, key=len))
    start = min(comp, key=lambda p: (p[0], p[1]))
    dist, q = {start: 0}, collections.deque([start])
    while q:
        c = q.popleft()
        for d in ((GRID, 0), (-GRID, 0), (0, GRID), (0, -GRID)):
            n = (c[0] + d[0], c[1] + d[1])
            if n in comp and n not in dist:
                dist[n] = dist[c] + 1
                q.append(n)
    _cls_cache[folder] = (start, dist)
    return start, dist


u32 = lambda b, o: struct.unpack_from('<i', b, o)[0]  # noqa: E731
TX = u32(tmpl, 0x24)
TA, TB, TC = (u32(tmpl, 0x28 + 4 * i) + 0x34 for i in range(3))
tna = u32(tmpl, TX + 0x34)
ta0 = TX + 0x3c
T_AREAS = [bytes(tmpl[ta0 + k * 0x44:ta0 + (k + 1) * 0x44]) for k in range(tna)]
ARENA, NORMAL = T_AREAS[0], T_AREAS[1]


def build_part(folder, start, dist, groups, nchests):
    far = max(dist, key=lambda p: (dist[p], -p[1]))
    maxd = dist[far] or 1
    by_d = sorted(dist, key=lambda p: dist[p])
    areas, ens, uid = [], [], 2
    normal = [g for g in groups if not g['target']]
    target = [g for g in groups if g['target']] or [None]
    order = [(g, False) for g in normal] + [(target[0], True)]
    for i, (g, is_t) in enumerate(order):
        if is_t:
            cx, cy = far
        else:
            want = maxd * (i + 1) / (len(order) + 0.5)
            cx, cy = min(by_d, key=lambda p: abs(dist[p] - want))
        near = sorted(dist, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
        members = []
        for name, n in (g['members'] if g else []):
            eid = enemy_id(name, is_t and not members)
            if eid:
                members += [eid] * n
        if not members:
            continue
        rec = bytearray(ARENA if is_t else NORMAL)
        struct.pack_into('<2i', rec, 0, len(ens), len(members))
        # uid dell'area, unico come nelle mappe vere (il modello aveva 7 per tutte, uguale a un nemico)
        struct.pack_into('<i', rec, 0x14, uid)
        uid += 1
        if is_t:
            box = [p for p in near[:40] if abs(p[1] - cy) <= 60 and abs(p[0] - cx) <= 300]
            xs = [p[0] for p in box] or [cx]
            ys = [p[1] for p in box] or [cy]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
            if x1 - x0 < 80:
                x0, x1 = cx - 40, cx + 40
            if y1 - y0 < 40:
                y0, y1 = cy - 20, cy + 20
            struct.pack_into('<8i', rec, 0x24, x1, y0, x1, y1, x0, y1, x0, y0)
        for k, eid in enumerate(members):
            x, y = near[min(k * 3, len(near) - 1)]
            ens.append((x, y, eid, 1, 1, 1, 1, uid))
            uid += 1
        areas.append(bytes(rec))
    used = {(e[0], e[1]) for e in ens}
    spots = [p for p in by_d[len(by_d) // 4:] if p not in used and p != start]
    chests = []
    for k in range(nchests):
        if not spots:
            break
        x, y = spots[(k * 7919) % len(spots)]
        chests.append((x, y, 81, 15, uid))
        uid += 1
    body = bytearray(tmpl[:ta0])
    nm = folder.encode()
    body[0x0c:0x0c + 16] = nm + b'\0' * (16 - len(nm))
    struct.pack_into('<2i', body, TX + 0x34, len(areas), len(ens))
    for a in areas:
        body += a
    for e in ens:
        body += struct.pack('<8i', *e)
    A = len(body)
    body += struct.pack('<i', len(chests))
    for c in chests:
        body += struct.pack('<5i', *c)
    B = len(body)
    body += struct.pack('<i', 0)                 # nessun oggetto
    C = len(body)
    body += b'\0' * 64
    struct.pack_into('<3i', body, 0x28, A - 0x34, B - 0x34, C - 0x34)
    return bytes(body), areas, ens, chests


# ---------------------------------------------------------------- piu' stanze
STEP_IN = 6          # arrivo: ~6 passi di griglia (240 unita') dentro dall'uscita
KEEP_OUT = (240, 160, 110)   # raggio libero da nemici/forzieri intorno alle uscite (a scalare)
dd = lambda a, b: ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5  # noqa: E731


def bfs(src, pts):
    dist, q = {src: 0}, collections.deque([src])
    while q:
        c = q.popleft()
        for d in ((GRID, 0), (-GRID, 0), (0, GRID), (0, -GRID)):
            n = (c[0] + d[0], c[1] + d[1])
            if n in pts and n not in dist:
                dist[n] = dist[c] + 1
                q.append(n)
    return dist


def arrival_near(exit_pt, pts):
    """Punto percorribile ~STEP_IN passi dentro dall'uscita e a piu' di 96 (meglio 200) da essa."""
    d = bfs(exit_pt, pts)
    cand = [p for p in d if dd(p, exit_pt) >= 200] or [p for p in d if dd(p, exit_pt) > 120] or list(d)
    return min(cand, key=lambda p: (abs(d[p] - STEP_IN), -dd(p, exit_pt), p))


def centroid(pts):
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


def build_part_mr(folder, dist, groups, nchests, exits, uid, has_target):
    """Come build_part, ma: posizioni lontane dalle uscite, uid globali da `uid`, blocco uscite.
    exits: [(x, y, angolo, resto, verso1/2, ax, ay, parte, facing)]. Ritorna anche il nuovo uid."""
    ex_pts = [(e[0], e[1]) for e in exits]
    pool = dict(dist)
    for r in KEEP_OUT:
        pool = {p: v for p, v in dist.items() if all(dd(p, e) >= r for e in ex_pts)}
        if len(pool) >= 12:
            break
    if not pool:
        pool = dict(dist)
    far = max(pool, key=lambda p: (pool[p], -p[1]))
    maxd = pool[far] or 1
    mind = min(pool.values())
    by_d = sorted(pool, key=lambda p: pool[p])
    areas, ens = [], []
    normal = [g for g in groups if not g['target']]
    target = [g for g in groups if g['target']]
    order = [(g, False) for g in normal] + ([(target[0], True)] if has_target and target else [])
    for i, (g, is_t) in enumerate(order):
        if is_t:
            cx, cy = far
        else:
            want = mind + (maxd - mind) * (i + 1) / (len(order) + 0.5)
            cx, cy = min(by_d, key=lambda p: abs(pool[p] - want))
        near = sorted(pool, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
        members = []
        for name, n in g['members']:
            eid = enemy_id(name, is_t and not members)
            if eid:
                members += [eid] * n
        if not members:
            continue
        rec = bytearray(ARENA if is_t else NORMAL)
        struct.pack_into('<2i', rec, 0, len(ens), len(members))
        struct.pack_into('<i', rec, 0x14, uid)                      # uid area, globale
        uid += 1
        if is_t:
            box = [p for p in near[:40] if abs(p[1] - cy) <= 60 and abs(p[0] - cx) <= 300]
            xs = [p[0] for p in box] or [cx]
            ys = [p[1] for p in box] or [cy]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
            if x1 - x0 < 80:
                x0, x1 = cx - 40, cx + 40
            if y1 - y0 < 40:
                y0, y1 = cy - 20, cy + 20
            struct.pack_into('<8i', rec, 0x24, x1, y0, x1, y1, x0, y1, x0, y0)
        for k, eid in enumerate(members):
            x, y = near[min(k * 3, len(near) - 1)]
            ens.append((x, y, eid, 1, 1, 1, 1, uid))
            uid += 1
        areas.append(bytes(rec))
    used = {(e[0], e[1]) for e in ens}
    spots = [p for p in by_d[len(by_d) // 4:] if p not in used]
    chests = []
    for k in range(nchests):
        if not spots:
            break
        x, y = spots[(k * 7919) % len(spots)]
        chests.append((x, y, 81, 15, uid))
        uid += 1
    body = bytearray(tmpl[:0x34])
    nm = folder.encode()
    body[0x0c:0x0c + 16] = nm + b'\0' * (16 - len(nm))
    body += struct.pack('<i', len(exits))
    for e in exits:
        body += struct.pack('<9i', *e)
    X = len(body) - 0x34                                            # = 4 + 36 n
    body += struct.pack('<2i', len(areas), len(ens))
    struct.pack_into('<2i', body, 0x20, 0, X)
    for a in areas:
        body += a
    for e in ens:
        body += struct.pack('<8i', *e)
    A = len(body)
    body += struct.pack('<i', len(chests))
    for c in chests:
        body += struct.pack('<5i', *c)
    B = len(body)
    body += struct.pack('<i', 0)
    C = len(body)
    body += b'\0' * 64
    struct.pack_into('<3i', body, 0x28, A - 0x34, B - 0x34, C - 0x34)
    return bytes(body), areas, ens, chests, uid


def norm(s):
    # la wiki lascia a volte un «|» finale (es. «Bazaar|» nei forzieri)
    return re.sub(r'\s+', ' ', (s or '').split('|')[0].strip().lower())


MIN_PTS, MIN_STEPS = 40, 15   # stanza abbastanza grande per due uscite lontane e i nemici in mezzo


def room_folder_mr(name, world, avoid=None):
    """Come room_folder; per le stanze non note salta quelle troppo piccole (es. DB_0027_00_00 ha
    solo 2 punti percorribili sulla griglia) e, se possibile, la stessa cartella della stanza prima."""
    if name in rooms:
        return rooms[name]
    pre = WORLD.get(world, 'DB')
    cand = [f for f in folders if f.startswith(pre + '_')] or [f for f in folders if f.startswith('DB_')]
    base = [f for f in cand if f.endswith('_00_00')] or cand
    h = int(hashlib.md5(name.encode()).hexdigest(), 16)
    first = None
    for i in range(len(base)):
        f = base[(h + i) % len(base)]
        st, d = walk_grid(f)
        if len(d) >= MIN_PTS and max(d.values()) >= MIN_STEPS:
            if f != avoid:
                return f
            first = first or f
    return first or base[h % len(base)]


def build_multi(s, q, room_names, groups):
    """Parti per ogni stanza; ritorna (hdr, [parti], info)."""
    R = len(room_names)
    idx = {}
    for k, r in enumerate(room_names):
        idx.setdefault(norm(r), k)
    doubts = []
    # gruppi -> stanza (wiki); il bersaglio nell'ultima; senza stanza riconosciuta: stanza del gruppo prima
    per_room = [[] for _ in range(R)]
    last_k = 0
    # stanza del gruppo: il primo pezzo della nota (separato da «|») che e' una stanza della
    # missione (parse_enemies prende il primo pezzo non numerico, che nei gruppi misti e' il
    # secondo nemico: va bene per il report, non per scegliere la stanza)
    notes = [ent.get('note', '') for ent in q.get('enemies', [])]
    for gi, g in enumerate(groups):
        hits = [idx[norm(p)] for p in notes[gi].split('|') if norm(p) in idx] if gi < len(notes) else []
        k = hits[0] if hits else idx.get(norm(g['room']))
        if g['target']:
            if k is not None and k != R - 1:
                doubts.append('bersaglio in «%s» (stanza %d) spostato nell\'ultima' % (room_names[k], k))
            k = R - 1
        elif k is None:
            doubts.append('gruppo senza stanza nota («%s») -> stanza %d' % (g['room'], last_k))
            k = last_k
        per_room[k].append(g)
        last_k = k
    if not any(g['target'] for g in per_room[R - 1]):
        per_room[R - 1].append({'members': [('Shadow', 1)], 'target': True, 'room': room_names[-1]})
    chests_per = [0] * R
    for t in q.get('treasures', []):
        k = idx.get(norm(t.get('room')))
        if k is None:
            doubts.append('forziere senza stanza nota («%s») -> stanza 0' % t.get('room'))
            k = 0
        chests_per[k] += 1
    folders_ = []
    for r in room_names:
        folders_.append(room_folder_mr(r, s['worldId'], folders_[-1] if folders_ else None))
        if folders_[-1] != room_folder(r, s['worldId']):
            doubts.append('stanza «%s»: %s troppo piccola o uguale alla precedente -> %s' % (
                r, room_folder(r, s['worldId']), folders_[-1]))
    grids = [walk_grid(f) for f in folders_]
    pts = [set(d) for _, d in grids]
    starts = [st for st, _ in grids]
    fars = [max(d, key=lambda p: (d[p], -p[1])) for _, d in grids]
    cents = [centroid(p) for p in pts]
    # punti: uscita avanti fwd[k] (k < R-1) = fars[k]; uscita indietro back[k] (k > 0) = starts[k]
    arr_in = [None] + [arrival_near(starts[k], pts[k]) for k in range(1, R)]        # entrando da avanti
    arr_back = [arrival_near(fars[k], pts[k]) for k in range(R - 1)] + [None]       # tornando indietro
    face = lambda k, p: 1 if cents[k][0] < p[0] else 2                              # noqa: E731
    angle = lambda k, p: 35 if p[0] >= cents[k][0] else 220                         # noqa: E731
    # le posizioni dei nemici dipendono solo dai punti delle uscite, non dai loro campi: una prima
    # costruzione dell'ultima stanza dice dov'e' il bersaglio, poi si calcolano le distanze residue.
    def exits_of(k, rem):
        ex = []
        if k < R - 1:
            a = arr_in[k + 1]
            ex.append((fars[k][0], fars[k][1], angle(k, fars[k]), rem['fwd'][k], 1, a[0], a[1], k + 1,
                       face(k + 1, a)))
        if k > 0:
            a = arr_back[k - 1]
            ex.append((starts[k][0], starts[k][1], angle(k, starts[k]), rem['back'][k], 2, a[0], a[1], k - 1,
                       face(k - 1, a)))
        return ex
    zero = {'fwd': [0] * R, 'back': [0] * R}
    probe = build_part_mr(folders_[R - 1], grids[R - 1][1], per_room[R - 1], chests_per[R - 1],
                          exits_of(R - 1, zero), 1, True)
    tens = [e for e in probe[2]]
    tpos = None
    if probe[1]:
        # area del bersaglio = ultima area (con [4] = 1); primo nemico
        ta = probe[1][-1]
        first = struct.unpack_from('<i', ta, 0)[0]
        tpos = tens[first][:2] if struct.unpack_from('<i', ta, 0x10)[0] & 1 else None
    tpos = tpos or fars[R - 1]
    fwd, back = [0] * R, [0] * R
    # resto da arrivo in stanza j: j ultima -> fino al bersaglio; altrimenti fino a fwd[j] + fwd[j]
    for k in range(R - 2, -1, -1):
        j = k + 1
        a = arr_in[j]
        fwd[k] = int(round(dd(a, tpos))) if j == R - 1 else int(round(dd(a, fars[j]))) + fwd[j]
    for k in range(1, R):
        a = arr_back[k - 1]
        back[k] = int(round(dd(a, fars[k - 1]))) + fwd[k - 1]
    rem = {'fwd': fwd, 'back': back}
    parts, uid, tot_a, tot_e, tot_c, target_id, tpart = [], 1, 0, 0, 0, None, R - 1
    for k in range(R):
        part, areas, ens, chests, uid = build_part_mr(folders_[k], grids[k][1], per_room[k], chests_per[k],
                                                      exits_of(k, rem), uid, k == R - 1)
        for a in areas:
            if struct.unpack_from('<i', a, 0x10)[0] & 1 and target_id is None:
                target_id = ens[struct.unpack_from('<i', a, 0)[0]][2]
        parts.append(part)
        tot_a += len(areas)
        tot_e += len(ens)
        tot_c += len(chests)
    target_id = target_id or 80001
    hdr = struct.pack('<16i', 4674643, 16, R, starts[0][0], starts[0][1], 2, target_id, 1, tot_a, tot_e,
                      0, 1, tpart, 0, tot_c, 0)
    info = {'parts': R, 'folders': folders_, 'groups_per_room': [len(g) for g in per_room],
            'chests_per_room': chests_per, 'doubts': doubts}
    return hdr, parts, info, tot_e, tot_c


report = []
for s in sorted(stages, key=lambda r: r['stageBinId']):
    num = s['stageBinId']
    if not (1 <= num <= cfg.get('max_mission', 10 ** 6)) or s['stageId'] >= 100000 or s['stageId'] in skip:
        continue
    q = quest_by_num.get(num, {})
    room_names = q.get('rooms') or [s['mapName']]
    if cfg.get('multiroom') and len(room_names) > 1:
        groups = parse_enemies(q)
        tname = (q.get('target') or '').strip()
        if tname and not any(g['target'] for g in groups):
            groups.append({'members': [(tname, 1)], 'target': True, 'room': room_names[-1]})
        hdr, parts, info, ne, nc = build_multi(s, q, room_names, groups)
        sid = s['stageId']
        open(os.path.join(out, 'mappoi_stg%05d.bin' % sid), 'wb').write(hdr)
        for k, p in enumerate(parts):
            open(os.path.join(out, 'mappoi_stg%05d_%02d.bin' % (sid, k)), 'wb').write(p)
        missing = [n for g in groups for n, _ in g['members'] if n.lower().strip() not in by_name]
        report.append(dict({'mission': num, 'stageId': sid, 'name': s['name'], 'room': room_names[0],
                            'folder': info['folders'][0], 'exact_room': room_names[0] in rooms,
                            'enemies': ne, 'chests': nc, 'unknown_enemies': sorted(set(missing)),
                            'rooms': room_names}, **info))
        continue
    first_room = room_names[0]
    folder = room_folder(first_room, s['worldId'])
    groups = parse_enemies(q)
    tname = (q.get('target') or '').strip()
    if tname and not any(g['target'] for g in groups):
        groups.append({'members': [(tname, 1)], 'target': True, 'room': first_room})
    if not groups:
        groups = [{'members': [('Shadow', 1)], 'target': True, 'room': first_room}]
    start, dist = walk_grid(folder)
    part, areas, ens, chests = build_part(folder, start, dist, groups, len(q.get('treasures', [])))
    target_id = next((e[2] for e in ens if 10000 <= e[2] < 20000), ens[-1][2] if ens else 80001)
    hdr = struct.pack('<16i', 4674643, 16, 1, start[0], start[1], 2, target_id, 1, len(areas), len(ens),
                      0, 1, 0, 0, len(chests), 0)
    sid = s['stageId']
    open(os.path.join(out, 'mappoi_stg%05d.bin' % sid), 'wb').write(hdr)
    open(os.path.join(out, 'mappoi_stg%05d_00.bin' % sid), 'wb').write(part)
    missing = [n for g in groups for n, _ in g['members'] if n.lower().strip() not in by_name]
    report.append({'mission': num, 'stageId': sid, 'name': s['name'], 'room': first_room, 'folder': folder,
                   'exact_room': first_room in rooms, 'enemies': len(ens), 'chests': len(chests),
                   'unknown_enemies': sorted(set(missing))})
# Missioni «zoo» per provare i nemici: tutti gli enemyId di zoo_enemies, zoo_per_stage per
# missione, in aree da 5 nella stanza zoo_room; stageId 990001.. (righe nel master con
# KHUX_ZOO=1 in make-game-tables.js). All'avvio il campo carica la grafica di tutti.
if cfg.get('zoo_enemies'):
    zoo = json.load(open(cfg['zoo_enemies'], encoding='utf-8'))
    per = cfg.get('zoo_per_stage', 35)
    room = cfg.get('zoo_room', 'DB_0000_00_00')
    start, dist = walk_grid(room)
    for n in range(0, len(zoo), per):
        chunk = zoo[n:n + per]
        groups = [{'members': [], 'target': False, 'room': ''}]
        ids = {}
        for eid in chunk:
            nm = '#%d' % eid
            ids[nm.lower()] = [eid]
        by_name.update(ids)
        for k in range(0, len(chunk), 5):
            groups.append({'members': [('#%d' % e, 1) for e in chunk[k:k + 5]], 'target': k == 0, 'room': ''})
        groups = [g for g in groups if g['members']]
        part, areas, ens, chests = build_part(room, start, dist, groups, 0)
        sid = 990001 + n // per
        hdr = struct.pack('<16i', 4674643, 16, 1, start[0], start[1], 2, ens[0][2], 1, len(areas), len(ens),
                          0, 1, 0, 0, 0, 0)
        open(os.path.join(out, 'mappoi_stg%05d.bin' % sid), 'wb').write(hdr)
        open(os.path.join(out, 'mappoi_stg%05d_00.bin' % sid), 'wb').write(part)
        print('zoo', sid, len(ens), 'nemici')
json.dump(report, open(cfg['report'], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('missioni generate:', len(report), '| stanza esatta:', sum(r['exact_room'] for r in report),
      '| nemici sconosciuti:', len({n for r in report for n in r['unknown_enemies']}))
