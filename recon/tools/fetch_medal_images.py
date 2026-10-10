"""Grafica vera delle medaglie da Roboloid/khux (immagini estratte dal gioco: stessa tela e
posizione dei file originali, verificato su Goofy A 1★ = Medal_L_11021 e Cutin_11021).

    python recon/tools/fetch_medal_images.py <medal_db.json> <medal.json del master> <cache> <uscita> <mappa.json>

medal_db.json: medalDatabase di Roboloid (src/search.js, estratto con il solo letterale).
Per ogni riga del master trova la medaglia di Roboloid con lo stesso nome e le stesse stelle
(nomi normalizzati: «Ver. A» = «A», nome senza variante = variante A), scarica in <cache>
MedalImage (images/medals/en, 640x640) e RenderImage (images/renders/en, 480x480) e scrive in
<uscita> (BTF): img/medal/Medal_L_<id>.png (la 640), img/medal/Medal_S_<id>.png (la stessa
ridotta a 190x190, come le originali: 295x358 -> 89x106), img/Cutin/Cutin_<id>.png (render).
<mappa.json>: medalId -> id Roboloid, letto da make-game-tables.js per imageId e dati.
Pillow: senza -I.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import btf  # noqa: E402

db_path, master_path, cache, out, map_path = sys.argv[1:6]
db = json.load(open(db_path, encoding='utf-8'))
master = json.load(open(master_path, encoding='utf-8'))
RAW = 'https://raw.githubusercontent.com/Roboloid/khux/master/images/'


def norm(s):
    s = re.sub(r'\bver\.?\s*', '', str(s), flags=re.I)
    return re.sub(r'[^a-z0-9]', '', s.lower())


by = {}
for d in db:
    by.setdefault((norm(d['Name']), d['Rarity']), d)


def match(row):
    for name in (row['name'], row['name'] + ' A'):
        d = by.get((norm(name), row['rare']))
        if d:
            return d
    return None


def fetch(sub, name):
    p = os.path.join(cache, sub, name)
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        url = RAW + sub + '/en/' + urllib.parse.quote(name)
        with urllib.request.urlopen(url, timeout=60) as r:
            data = r.read()
        open(p, 'wb').write(data)
    return p


def save(rel, im):
    p = os.path.join(out, *rel.split('/'))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'wb').write(btf.encode(im))


mapping, missing, failed = {}, [], []
for row in master:
    d = match(row)
    if not d:
        missing.append('%s %s %s★' % (row['medalId'], row['name'], row['rare']))
        continue
    mid = row['medalId']
    try:
        big = Image.open(fetch('medals', d['MedalImage'])).convert('RGBA')
        if big.size != (640, 640):
            canvas = Image.new('RGBA', (640, 640), (0, 0, 0, 0))
            big.thumbnail((640, 640), Image.LANCZOS)
            canvas.paste(big, ((640 - big.width) // 2, (640 - big.height) // 2), big)
            big = canvas
        save('img/medal/Medal_L_%d.png' % mid, big)
        save('img/medal/Medal_S_%d.png' % mid, big.resize((190, 190), Image.LANCZOS))
        if d.get('RenderImage'):
            ren = Image.open(fetch('renders', d['RenderImage'])).convert('RGBA')
            if ren.size != (480, 480):
                ren = ren.resize((480, 480), Image.LANCZOS)
            save('img/Cutin/Cutin_%d.png' % mid, ren)
        mapping[mid] = d['ID']
    except Exception as e:  # immagine assente sul sito: resta il segnaposto
        failed.append('%s %s: %s' % (mid, d['MedalImage'], e))
json.dump(mapping, open(map_path, 'w', encoding='utf-8'))
print('medaglie con grafica vera: %d su %d; senza corrispondenza: %d; download falliti: %d'
      % (len(mapping), len(master), len(missing), len(failed)))
for m in missing[:30]:
    print('  senza corrispondenza:', m)
for f in failed[:10]:
    print('  fallito:', f)
