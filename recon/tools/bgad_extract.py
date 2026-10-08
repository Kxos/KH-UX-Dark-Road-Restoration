"""Estrae un file dai pacchetti (OBB concatenati) dato il suo offset nell'indice.

L'offset viene dall'elenco di bgi_check.py (IDX_DUMP: nome<TAB>offset), riferito
alla concatenazione dei file dati nell'ordine dato (es. main + patch).

    python -I recon/tools/bgad_extract.py recon/tools <lib 4.3.1> <offset> <out> <dati1> [dati2 ...]
"""
import os
import sys

sys.path.insert(0, sys.argv[1])
import bgad

key = bgad.lib_key(sys.argv[2])
off = int(sys.argv[3], 0)
for path in sys.argv[5:]:
    size = os.path.getsize(path)
    if off < size:
        break
    off -= size
else:
    sys.exit('offset oltre la fine dei dati')
with open(path, 'rb') as fh:
    fh.seek(off)
    head = fh.read(bgad.HDR.size)
    h = bgad.parse(head)
    fh.seek(off)
    buf = fh.read(h['hsize'] + h['nlen'] + h['size'])
h = bgad.parse(buf)
print(h)                                            # il nome del record qui e' offuscato
data = bgad.decode(buf, h, key)
open(sys.argv[4], 'wb').write(data)
print(len(data), 'byte ->', sys.argv[4])
