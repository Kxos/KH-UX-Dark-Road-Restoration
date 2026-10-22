"""Widget che i nostri layout generati hanno e gli originali JP no, cercati dal codice.

    python -I recon/tools/jp_coco_widgets.py <libcocos2dcpp.so> <decompilato.c> <report.json di
        import_jp_coco.py> <stage_gen\\files> [<uscita.tsv>]

<decompilato.c> = l'analisi locale (privata) delle funzioni attorno ai caricatori dei layout
(who_refs.py sulle stringhe `cocostudio/publish/<nome>`). I nomi cercati dal codice sono quelli che widget_lookup.py ricostruisce dalle
stringhe corte sullo stack (tutte le chiamate) piu' le stringhe del binario citate dal C
(s_<nome>_<indirizzo>). Per ogni radice: nomi solo nostri (anche nei sotto-layout `*_Gen`
delle scene) e, fra questi, quelli che compaiono nel codice -> da guardare a mano.
"""
import json
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
lib, cfile, report, gen = sys.argv[1:5]
out = sys.argv[5] if len(sys.argv) > 5 else None
here = os.path.dirname(os.path.abspath(__file__))
wl = subprocess.run([sys.executable, '-I', os.path.join(here, 'widget_lookup.py'), lib, cfile],
                    capture_output=True, text=True, encoding='utf-8').stdout
code, where = set(), {}
func = None
for line in wl.split('\n'):
    if line.startswith('== '):
        func = line.split()[1] if len(line.split()) > 1 else line
        continue
    p = line.split()
    if len(p) == 2:
        code.add(p[1])
        where.setdefault(p[1], set()).add(func)
text = open(cfile, encoding='utf-8', errors='replace').read()
for blk in re.split(r'^// ===== ', text, flags=re.M)[1:]:
    head = blk.split('\n', 1)[0].split()[0]
    for m in re.finditer(r'\bs_([A-Za-z0-9_]+?)_([0-9a-f]{8})\b', blk):
        code.add(m.group(1))
        where.setdefault(m.group(1), set()).add(head)
pub = os.path.join(gen, 'cocostudio', 'publish')


def names(p, seen):
    if p in seen or not os.path.exists(os.path.join(pub, p)):
        return set()
    seen.add(p)
    d = json.load(open(os.path.join(pub, p), encoding='utf-8-sig'))
    acc = set()

    def walk(n):
        if isinstance(n, dict):
            o = n.get('options')
            if isinstance(o, dict) and o.get('name'):
                acc.add(o['name'])
            for k, v in n.items():
                if isinstance(v, dict) and str(v.get('path') or '').endswith('.json'):
                    acc.update(names(v['path'].split('/')[-1], seen))
                if isinstance(v, (dict, list)):
                    walk(v)
        elif isinstance(n, list):
            for x in n:
                walk(x)
    walk(d)
    return acc


rows = []
for r in json.load(open(report, encoding='utf-8'))['roots']:
    g = names(r['root'], set())
    j = set(r.get('widgets') or [])
    only = sorted(g - j)
    hit = [w for w in only if w in code]
    rows.append((r['root'], len(g), len(j), only, hit))
    print('%-46s nostri %3d JP %3d solo nostri %3d, nel codice: %s' % (
        r['root'], len(g), len(j), len(only),
        ', '.join('%s [%s]' % (w, ' '.join(sorted(where[w])[:3])) for w in hit) or '-'))
if out:
    with open(out, 'w', encoding='utf-8') as fh:
        for root, ng, nj, only, hit in rows:
            fh.write('%s\t%d\t%d\t%s\t%s\n' % (root, ng, nj, ','.join(hit), ','.join(only)))
