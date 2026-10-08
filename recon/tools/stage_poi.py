"""Forzieri e nemici di ogni stage, dalle mappe stage/mappoi_stg<id>_NN.bin dell'addnl.

    python -I recon/tools/stage_poi.py recon/tools <names_addnl.tsv> <addnl.mp4> <out.json>

Chiave dei record: BGAD_KEY (esadecimale, la chiave 5.0.1 come per bgad_extract.py).
Ogni mappa (formato MAP, parser del client FUN_00e5f6e8) finisce con i nemici, record
da 8 interi (x, y, enemyId, 1, 1, 1, reward, uid), poi un contatore e i forzieri,
record da 5 interi (x, y, reward, tipo, uid; letti da FUN_00e60f28), poi un contatore
e oggetti da 4 interi, poi 0 (o, in 1030, un'altra sezione). uid e' l'id univoco che
il client cerca in userTreasures / userEnemyDropItems di /stage/start e che riporta in
/stage/clear (getTreasures, getEnemyDropItems); reward e' la riga della tabella reward
(per i nemici di solito 1, per il primo di ogni mappa una sua, es. 80002: letta da
FUN_00e7e6e8, se manca il client va in crash dopo /stage/start). Alcuni uid di nemici
non compaiono come record (es. 1 nel Prologue): il server usa tutti gli uid fino al
massimo.
Uscita: {"<stageId>": {"chests": [{uid, reward, kind, map}], "enemies": [{uid, enemyId, reward, map}]}}.
"""
import json
import os
import re
import struct
import sys

sys.path.insert(0, sys.argv[1])
import bgad

key = bytes.fromhex(os.environ['BGAD_KEY'])
names, data, out = sys.argv[2], sys.argv[3], sys.argv[4]


def read_record(fh, off):
    fh.seek(off)
    h = bgad.parse(fh.read(bgad.HDR.size))
    fh.seek(off)
    buf = fh.read(h['hsize'] + h['nlen'] + h['size'])
    return bgad.decode(buf, bgad.parse(buf), key)


def is_enemy(v, i):
    # x, y, enemyId (5 cifre), quattro campi (flag piccoli o un altro enemyId), uid
    return (i + 7 < len(v) and 10000 <= v[i + 2] < 1000000 and 0 < v[i] < 10000 and 0 < v[i + 1] < 10000
            and all(0 <= f <= 9 or 10000 <= f < 1000000 for f in v[i + 3:i + 7]) and 0 < v[i + 7] < 1000)


def parse(d):
    v = struct.unpack_from('<%di' % (len(d) // 4), d)
    if d[:4] != b'MAP\0':
        raise ValueError('non e\' una mappa')
    # ultimo nemico: il primo record dalla fine che rispetta la forma
    last = max((i for i in range(len(v)) if is_enemy(v, i)), default=None)
    if last is None:
        raise ValueError('nessun nemico')
    # tutti i nemici (sono sparsi tra i record delle aree): scansione in avanti
    enemies, i = [], 0
    while i <= last:
        if is_enemy(v, i):
            enemies.append({'uid': v[i + 7], 'enemyId': v[i + 2], 'reward': v[i + 6]})
            i += 8
        else:
            i += 1
    p = last + 8
    n = v[p]
    chests = [{'uid': v[p + 1 + 5 * k + 4], 'reward': v[p + 1 + 5 * k + 2], 'kind': v[p + 1 + 5 * k + 3]}
              for k in range(n)]
    p += 1 + 5 * n
    m = v[p]                                    # oggetti: controllo della forma
    p += 1 + 4 * m
    # dopo gli oggetti c'e' a volte un'altra sezione (1030: un record da 6 interi)
    if p >= len(v) or not 0 <= v[p] <= 16 or not all(0 < c['uid'] < 1000 for c in chests):
        raise ValueError('coda inattesa dopo forzieri/oggetti')
    return sorted(enemies, key=lambda e: e['uid']), chests


stages = {}
errors = []
with open(names, encoding='utf-8') as fn, open(data, 'rb') as fh:
    for line in fn:
        name, off = line.rstrip('\n').split('\t')
        m = re.fullmatch(r'stage/mappoi_stg(\d+)_(\d+)\.bin', name)
        if not m:
            continue
        sid, part = int(m.group(1)), int(m.group(2))
        try:
            enemies, chests = parse(read_record(fh, int(off)))
        except Exception as e:  # noqa: BLE001 - si riportano e si prosegue
            errors.append('%s: %s' % (name, e))
            continue
        s = stages.setdefault(str(sid), {'chests': [], 'enemies': []})
        s['chests'] += [dict(c, map=part) for c in chests]
        s['enemies'] += [dict(e, map=part) for e in enemies]

os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with open(out, 'w', encoding='utf-8') as fo:
    json.dump(dict(sorted(stages.items(), key=lambda kv: int(kv[0]))), fo, separators=(',', ':'))
print('%d stage, %d forzieri, %d nemici -> %s' % (
    len(stages), sum(len(s['chests']) for s in stages.values()),
    sum(len(s['enemies']) for s in stages.values()), out))
for e in errors[:20]:
    print('  !', e)
if len(errors) > 20:
    print('  ... altri %d' % (len(errors) - 20))
