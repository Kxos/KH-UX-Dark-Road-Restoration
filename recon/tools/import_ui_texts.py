"""Testi text/ui/<id>.txt che mancano nelle risorse servite, presi dal pacchetto misc
dell'IPA 4.4.0 (misc.mp4 + indice misc.png, nomi in names440misc.tsv).

    python -I recon/tools/import_ui_texts.py <nomi serviti.tsv> <names440misc.tsv> <cartella con misc.mp4> <uscita>

Copia in <uscita>/text/ui/ tutti i testi ui dell'IPA 4.4.0 assenti dalle risorse servite
(non solo quelli citati con id costante: il client ne costruisce anche a runtime).
misc.mp4 si estrae dall'IPA con remote_zip.py (21 MB). Usa bgad_extract.py.
"""
import os
import re
import subprocess
import sys

here = os.path.dirname(os.path.abspath(__file__))
served_tsv, ipa_tsv, datadir, out = sys.argv[1:5]
served = set()
for line in open(served_tsv, encoding='utf-8'):
    m = re.match(r'(text/ui/\d+\.txt)\t', line)
    if m:
        served.add(m.group(1))
todo = []
for line in open(ipa_tsv, encoding='utf-8'):
    m = re.match(r'(text/ui/\d+\.txt)\t(\d+)', line)
    if m and m.group(1) not in served:
        todo.append((m.group(1), m.group(2)))
data = [os.path.join(datadir, f) for f in sorted(os.listdir(datadir))]
lib = os.path.join(here, '..', 'ext', 'ww431', 'libcocos2dcpp.so')
n = 0
for name, off in todo:
    dst = os.path.join(out, *name.split('/'))
    if os.path.exists(dst):
        n += 1
        continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    r = subprocess.run([sys.executable, '-I', os.path.join(here, 'bgad_extract.py'), here, lib, off, dst] + data,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if r.returncode == 0:
        n += 1
    else:
        print('errore', name, r.stderr.decode(errors='replace')[-200:])
print('testi ui importati: %d di %d mancanti' % (n, len(todo)))
