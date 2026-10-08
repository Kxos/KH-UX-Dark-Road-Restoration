"""Cerca in una libreria la chiave dello strato interno di un indice BGI.

Lo strato interno di un indice (record "/" di un .png, flag bit 0) e' cifrato
con ChaCha8 e con la chiave passata al montaggio: nella 4.3.1 e' la chiave di
sessione (data[3] di /system/login), quindi del server. La 5.0.1 offline ce
l'ha nella .rodata. Lo script prova ogni finestra di 32 byte delle sezioni dati
e tiene quelle che danno conteggi plausibili. Trovata cosi' la chiave
dell'aliud.png 5.0.1: .rodata, offset 0xe6ee54 del libcocos2dcpp.so arm64.

    python -I recon/tools/bgi_keyhunt.py recon/tools <lib 4.3.1> <indice.png> <lib candidata> [allineamento]
"""
import struct
import sys

sys.path.insert(0, sys.argv[1])
import bgad
from vtables import Elf

key431 = bgad.lib_key(sys.argv[2])
raw = open(sys.argv[3], 'rb').read()
b = bgad.decode(raw, bgad.parse(raw), key431)
iv = struct.pack('<Q', struct.unpack_from('<Q', b, len(b) - 8)[0] ^ bgad.INDEX_IV_XOR)
ct = b[0xc:0xc + 8]
elf = Elf(sys.argv[4])
align = int(sys.argv[5]) if len(sys.argv) > 5 else 8
d = elf.data
secs = [s for s in ('.rodata', '.data', '.data.rel.ro', '.bss') if elf.section(s)]
tested = 0
for name in secs:
    s = elf.section(name)
    if name == '.bss':
        continue
    lo, hi = s['off'], s['off'] + s['size']
    for o in range(lo - lo % align, hi - 32, align):
        k = d[o:o + 32]
        if k.count(0) > 8:
            continue
        tested += 1
        ks = bgad._chacha_block(k, iv, 0, 8)
        n_rec, n_names = struct.unpack('<II', bytes(x ^ y for x, y in zip(ct, ks)))
        if 0 < n_rec < 2_000_000 and n_rec <= n_names < 4_000_000:
            print('CANDIDATA %s off %#x  record %d nomi %d  chiave %s' % (name, o, n_rec, n_names, k.hex()))
            sys.stdout.flush()
print('provate %d finestre in %s' % (tested, secs))
