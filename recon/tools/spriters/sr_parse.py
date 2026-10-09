"""Parse saved index.html: sections (title) and assets (id, name) in order -> TSV."""
import html as H, re, sys
sys.stdout.reconfigure(encoding='utf-8')
t = open(sys.argv[1], encoding='utf-8').read()
rows = []
sec = '?'
for m in re.finditer(r'<div class="section[^"]*" id="section-\d+">(.*?)</div>|href="/mobile/kingdomheartsunion/asset/(\d+)/"(.*?)</a>', t, re.S):
    if m.group(1) is not None:
        txt = re.sub(r'<[^>]+>', ' ', m.group(1))
        txt = re.sub(r'arrow_drop_down', '', txt)
        sec = re.sub(r'\s+', ' ', H.unescape(txt)).strip() or sec
    else:
        inner = m.group(3)
        nm = re.search(r'title="([^"]+)"', m.group(0)) or re.search(r'<span[^>]*>([^<]+)</span>', inner)
        name = H.unescape(nm.group(1)).strip() if nm else m.group(2)
        rows.append((sec, m.group(2), name))
seen = set()
with open(sys.argv[2], 'w', encoding='utf-8') as fh:
    for s, i, n in rows:
        if i in seen: continue
        seen.add(i); fh.write('%s\t%s\t%s\n' % (s, i, n))
from collections import Counter
for s, c in Counter(s for s, i, n in rows if True).items():
    print(c, s)
print(len(seen), 'fogli')
