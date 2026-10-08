"""Crea un pacchetto BGAD (dati .mp4 + indice .png) dai file di una cartella.

Serve ad aggiungere file nostri alle risorse servite (es. mappe generate con
mappoi_gen.py): il pacchetto si unisce agli altri con resource_merge.py, come
l'addnl. I record sono come quelli degli OBB 5.0.1: versione 2, nonce in coda,
cifratura 3 (ChaCha8) con la chiave di sessione (la chiave 5.0.1). L'indice e' un
BGI versione 3 senza strato interno, in un record "/" non cifrato: resource_merge
lo legge e ne scrive uno nuovo nel formato completo.

    python -I recon/tools/resource_pack.py <cartella> <chiave hex> <uscita.mp4> <uscita.png>

I nomi dei file sono i percorsi relativi alla cartella, con «/» (es. stage/x.bin).
"""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bgad                                             # noqa: E402
from resource_index import obfuscate_name, record      # noqa: E402

root, key, out_data, out_index = sys.argv[1], bytes.fromhex(sys.argv[2]), sys.argv[3], sys.argv[4]
files = sorted(os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/')
               for d, _, fs in os.walk(root) for f in fs)
offsets, data = [], bytearray()
for name in files:
    offsets.append(len(data))
    data += record(name.encode(), open(os.path.join(root, name), 'rb').read(), key)
    # il record si rilegge come quelli originali
    h = bgad.parse(data, offsets[-1])
    assert bgad.decode(data, h, key) == open(os.path.join(root, name), 'rb').read()

pool, name_offs = bytearray(), []
for name in files:
    name_offs.append(len(pool))
    pool += name.encode() + b'\0'
n = len(files)
bgi = (b'\x89BGI' + struct.pack('<III', 3, 0, n) + struct.pack('<I', n)
       + struct.pack('<%dQ' % n, *offsets) + struct.pack('<%dI' % n, *range(n))
       + struct.pack('<%dI' % n, *name_offs) + bytes(pool) + b'\0' * 8)
hdr = bgad.HDR.pack(b'BGAD', 2, 0, bgad.HDR.size, 1, 0, 0, len(bgi), len(bgi))
with open(out_data, 'wb') as fh:
    fh.write(data)
with open(out_index, 'wb') as fh:
    fh.write(hdr + obfuscate_name(b'/', len(bgi)) + bgi)
print('%d file, %d byte -> %s, %s' % (n, len(data), out_data, out_index))
