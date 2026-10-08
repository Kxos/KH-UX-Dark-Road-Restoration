"""Estrae un file dai pacchetti (OBB concatenati) dato il suo offset nell'indice.

L'offset viene dall'elenco di bgi_check.py (IDX_DUMP: nome<TAB>offset), riferito
alla concatenazione dei file dati nell'ordine dato (es. main + patch).

    python -I recon/tools/bgad_extract.py recon/tools <lib 4.3.1> <offset> <out> <dati1> [dati2 ...]

I record con cifratura 3 dei pacchetti montati come risorse (OBB, addnl) si aprono
con la chiave passata al montaggio, cioe' la chiave di sessione (per noi la chiave
5.0.1): la si passa in esadecimale con BGAD_KEY. Senza, si usa quella della libreria.
"""
import os
import sys

sys.path.insert(0, sys.argv[1])
import bgad

key = bytes.fromhex(os.environ['BGAD_KEY']) if os.environ.get('BGAD_KEY') else bgad.lib_key(sys.argv[2])
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
