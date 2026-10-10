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
Una sola parte per missione (le uscite tra stanze non sono ancora ricavate).
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


report = []
for s in sorted(stages, key=lambda r: r['stageBinId']):
    num = s['stageBinId']
    if not (1 <= num <= cfg.get('max_mission', 10 ** 6)) or s['stageId'] >= 100000 or s['stageId'] in skip:
        continue
    q = quest_by_num.get(num, {})
    first_room = (q.get('rooms') or [s['mapName']])[0]
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
json.dump(report, open(cfg['report'], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('missioni generate:', len(report), '| stanza esatta:', sum(r['exact_room'] for r in report),
      '| nemici sconosciuti:', len({n for r in report for n in r['unknown_enemies']}))
