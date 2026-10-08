"""Unisce piu' pacchetti BGAD (indice .png + dati) in un'unica risorsa scaricabile.

I dati dei pacchetti vanno concatenati nell'ordine dato (es. OBB main 76 + patch 87
+ addnl.mp4 dell'IPA 4.3.1). L'indice risultante ha:
  - il record "/": BGI versione 3, flag 1 (strato interno ChaCha8 con la chiave di
    sessione), record esterno con cifratura 2 e la chiave dei pacchetti;
  - i record "md5" e "size" della concatenazione (chiave di sessione).

Formato del BGI (dopo lo strato esterno):
    +0x00 '\\x89BGI'  +0x04 u32 versione (3)  +0x08 u32 flag (bit 0 = strato interno)
    +0x0c u32 n_rec   +0x10 u32 n_nomi
    +0x14 u64 offset[n_rec]   u32 rec[n_nomi]   u32 off_nome[n_nomi]   pool di nomi \\0
    in coda 8 byte: IV dello strato interno xor 0xc4db340f0a3574ea
Lo strato interno copre da +0x0c fino agli 8 byte finali esclusi.

A parita' di nome vince il pacchetto che compare prima negli argomenti.

    python -I recon/tools/resource_merge.py recon/tools <lib 4.3.1> <chiave hex> <uscita.png> \\
        <indice1.png> <dati1a>[,<dati1b>...] [<indice2.png> <dati2>[,...] ...]
"""
import hashlib
import os
import struct
import sys

sys.path.insert(0, sys.argv[1])
import bgad                                             # noqa: E402
from resource_index import obfuscate_name, record      # noqa: E402

lib = bgad.lib_key(sys.argv[2])
skey = bytes.fromhex(sys.argv[3])
out = sys.argv[4]
packs = [(sys.argv[i], sys.argv[i + 1].split(',')) for i in range(5, len(sys.argv), 2)]


def read_bgi(path):
    raw = open(path, 'rb').read()
    b = bytearray(bgad.decode(raw, bgad.parse(raw), lib))
    assert b[:4] == b'\x89BGI', path
    if struct.unpack_from('<I', b, 8)[0] & 1:
        iv = struct.pack('<Q', struct.unpack_from('<Q', b, len(b) - 8)[0] ^ bgad.INDEX_IV_XOR)
        b[0xc:len(b) - 8] = bgad.stream_xor(bytes(b[0xc:len(b) - 8]), skey, iv, bgad._chacha_block, 8)
    n_rec, n_names = struct.unpack_from('<II', b, 0xc)
    offs = struct.unpack_from('<%dQ' % n_rec, b, 0x14)
    p_idx = 0x14 + n_rec * 8
    recs = struct.unpack_from('<%dI' % n_names, b, p_idx)
    nos = struct.unpack_from('<%dI' % n_names, b, p_idx + n_names * 4)
    pool = p_idx + n_names * 8
    names = [bytes(b[pool + no:b.index(0, pool + no)]) for no in nos]
    return offs, list(zip(names, recs))


offsets, seen, entries, base, total_md5 = [], set(), [], 0, hashlib.md5()
for index, datas in packs:
    offs, names = read_bgi(index)
    first = len(offsets)
    offsets.extend(base + o for o in offs)
    kept = 0
    for name, rec in names:
        if name in seen:
            continue
        seen.add(name)
        entries.append((name, first + rec))
        kept += 1
    for d in datas:
        with open(d, 'rb') as fh:
            for chunk in iter(lambda: fh.read(1 << 24), b''):
                total_md5.update(chunk)
        base += os.path.getsize(d)
    print('%s: record %d, nomi %d (nuovi %d)' % (index, len(offs), len(names), kept))

pool, name_offs = bytearray(), []
for name, _ in entries:
    name_offs.append(len(pool))
    pool += name + b'\0'
body = (struct.pack('<II', len(offsets), len(entries))
        + struct.pack('<%dQ' % len(offsets), *offsets)
        + struct.pack('<%dI' % len(entries), *(r for _, r in entries))
        + struct.pack('<%dI' % len(entries), *name_offs)
        + bytes(pool))
nonce = os.urandom(8)
iv = struct.pack('<Q', struct.unpack('<Q', nonce)[0] ^ bgad.INDEX_IV_XOR)
bgi = (b'\x89BGI' + struct.pack('<II', 3, 1)
       + bgad.stream_xor(body, skey, iv, bgad._chacha_block, 8) + nonce)

# record "/": cifratura 2 (xor LCG, simmetrica) con compressione 0, come negli originali
hdr = bgad.HDR.pack(b'BGAD', 2, 0, bgad.HDR.size, 1, 2, 0, len(bgi), len(bgi))
plain = hdr + obfuscate_name(b'/', len(bgi)) + bgi
slash = plain[:bgad.HDR.size + 1] + bgad.decode(plain, bgad.parse(plain), lib)
assert bgad.decode(slash, bgad.parse(slash), lib) == bgi

with open(out, 'wb') as fh:
    fh.write(slash)
    fh.write(record(b'md5', total_md5.hexdigest().encode(), skey))
    fh.write(record(b'size', str(base).encode(), skey))
print('%s: record %d, nomi %d, dati %d byte, md5 %s' % (out, len(offsets), len(entries), base,
                                                       total_md5.hexdigest()))
