"""Cerca in una libreria la chiave dei record di un pacchetto BGAD (cifratura 3).

Un record con cifratura 3 e compressione zlib, una volta decifrato, inizia con
un header zlib valido (CMF 0x78, (CMF*256+FLG) % 31 == 0). Lo script prova ogni
finestra di 32 byte delle sezioni dati come chiave ChaCha8 sul primo record
compresso del pacchetto, e conferma le candidate sui due record successivi.
Serve per i pacchetti della 5.0.1 che non si aprono con la chiave della 4.3.1
(es. extra.mp4).

    python -I recon/tools/pack_keyhunt.py recon/tools <pacchetto.mp4> <lib candidata> [allineamento]
"""
import struct
import sys
import zlib

sys.path.insert(0, sys.argv[1])
import bgad
from vtables import Elf

buf = open(sys.argv[2], 'rb').read()
samples, off = [], 0
while off < len(buf) and len(samples) < 3:
    h = bgad.parse(buf, off)
    if h['enc'] == 3 and h['comp'] and h['flags'] & 4:
        data = buf[h['data_off']:h['data_off'] + h['size']]
        iv = struct.pack('<Q', struct.unpack_from('<Q', data, len(data) - 8)[0] ^ bgad.NONCE_XOR)
        samples.append((h, data[:-8], iv))
    off = h['end']


def zlib_ok(b):
    return b[0] == 0x78 and ((b[0] << 8) | b[1]) % 31 == 0


elf = Elf(sys.argv[3])
align = int(sys.argv[4]) if len(sys.argv) > 4 else 4
d = elf.data
tested = 0
for name in ('.rodata', '.data', '.data.rel.ro'):
    s = elf.section(name)
    if not s:
        continue
    lo, hi = s['off'], s['off'] + s['size']
    for o in range(lo - lo % align, hi - 32, align):
        k = d[o:o + 32]
        if k.count(0) > 8:
            continue
        tested += 1
        h, ct, iv = samples[0]
        ks = bgad._chacha_block(k, iv, 0, 8)
        if not zlib_ok(bytes(x ^ y for x, y in zip(ct[:2], ks))):
            continue
        ok = 0
        for h, ct, iv in samples:
            try:
                zlib.decompress(bgad.stream_xor(ct, k, iv, bgad._chacha_block, 8))
                ok += 1
            except zlib.error:
                pass
        if ok == len(samples):
            print('CHIAVE %s off %#x  %s' % (name, o, k.hex()))
            sys.stdout.flush()
print('provate %d finestre' % tested)
