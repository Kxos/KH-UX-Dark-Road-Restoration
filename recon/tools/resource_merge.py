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

    python -I recon/tools/resource_merge.py [--filler N | --index-size N] recon/tools <lib 4.3.1> \\
        <chiave hex> <uscita.png> <indice1.png> <dati1a>[,<dati1b>...] [<indice2.png> <dati2>[,...] ...]

Riempitivo (per il ciclo rapido di build-resources.ps1 -Quick, che riscrive l'indice nel
guest senza cambiarne la dimensione: il client confronta le dimensioni con quelle del
download e, se differiscono, butta le risorse e le riscarica tutte): un nome in piu'
«zz_pad/xxx...» (record 0, mai cercato). --filler N lo fa lungo N byte; --index-size N
ne sceglie la lunghezza perche' l'indice sia lungo esattamente N byte.
"""
import hashlib
import os
import pickle
import struct
import sys
import tempfile

filler, index_size, fast = None, None, False
while sys.argv[1].startswith('--'):
    flag = sys.argv.pop(1)
    if flag == '--fast-md5':
        # ciclo rapido: il record md5 (32 cifre, stessa lunghezza) copre solo l'ultimo
        # pacchetto; il client non lo verifica all'avvio, risparmia la lettura di 2,3 GB
        fast = True
        continue
    value = int(sys.argv.pop(1))
    if flag == '--filler':
        filler = value
    else:
        index_size = value
sys.path.insert(0, sys.argv[1])
import bgad                                             # noqa: E402
from resource_index import obfuscate_name, record      # noqa: E402

lib = bgad.lib_key(sys.argv[2])
skey = bytes.fromhex(sys.argv[3])
out = sys.argv[4]
packs = [(sys.argv[i], sys.argv[i + 1].split(',')) for i in range(5, len(sys.argv), 2)]


def read_bgi(path):
    # cache su disco (gli indici di OBB e addnl non cambiano e decifrarli in Python
    # richiede decine di secondi): chiave = percorso, dimensione, data
    st = os.stat(path)
    tag = hashlib.sha1(('%s|%d|%d' % (os.path.abspath(path), st.st_size, st.st_mtime_ns)).encode()).hexdigest()
    cache = os.path.join(tempfile.gettempdir(), 'khux_bgi_cache', tag + '.pkl')
    if os.path.exists(cache):
        with open(cache, 'rb') as fh:
            return pickle.load(fh)
    result = _read_bgi(path)
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    with open(cache, 'wb') as fh:
        pickle.dump(result, fh)
    return result


def _read_bgi(path):
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
        if fast and (index, datas) != packs[-1]:
            base += os.path.getsize(d)
            continue
        with open(d, 'rb') as fh:
            for chunk in iter(lambda: fh.read(1 << 24), b''):
                total_md5.update(chunk)
        base += os.path.getsize(d)
    print('%s: record %d, nomi %d (nuovi %d)' % (index, len(offs), len(names), kept))

def _keystream(tag, n, gen):
    """Keystream di almeno n byte, in cache su disco (gen(da, a) produce i byte mancanti)."""
    path = os.path.join(tempfile.gettempdir(), 'khux_bgi_cache', 'ks_' + tag + '.bin')
    ks = open(path, 'rb').read() if os.path.exists(path) else b''
    if len(ks) < n:
        ks += gen(len(ks), n + (1 << 20))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as fh:
            fh.write(ks)
    return ks[:n]


def _xor(data, ks):
    return (int.from_bytes(data, 'little') ^ int.from_bytes(ks, 'little')).to_bytes(len(data), 'little')


# Nonce fisso dello strato interno (era casuale): la keystream ChaCha8 diventa riusabile e
# l'indice si cifra in un attimo invece che in ~30 s di Python puro.
NONCE = b'khuxidx0'


def chacha_ks(n):
    iv = struct.pack('<Q', struct.unpack('<Q', NONCE)[0] ^ bgad.INDEX_IV_XOR)
    def gen(a, b):                                  # a multiplo di 64 (blocchi interi)
        return b''.join(bgad._chacha_block(skey, iv, i // 64, 8) for i in range(a, b, 64))
    return _keystream(hashlib.sha1(skey + iv).hexdigest(), n, gen)


def lcg_ks(n, seed0):
    """Cifratura 2 dei record BGAD (bgad.decode): xor a parole con l'LCG, seme = nlen."""
    def gen(a, b):
        seed = seed0
        out = bytearray()
        for _ in range(b // 4):
            seed = (seed * 0x19660d + 0x3c6ef35f) & 0xffffffff
            out += struct.pack('<I', seed)
        return bytes(out[a:])
    return _keystream('lcg%d' % seed0, n, gen)


def build_index(pad):
    ents = entries + ([(b'zz_pad/' + b'x' * pad, 0)] if pad is not None else [])
    pool, name_offs = bytearray(), []
    for name, _ in ents:
        name_offs.append(len(pool))
        pool += name + b'\0'
    body = (struct.pack('<II', len(offsets), len(ents))
            + struct.pack('<%dQ' % len(offsets), *offsets)
            + struct.pack('<%dI' % len(ents), *(r for _, r in ents))
            + struct.pack('<%dI' % len(ents), *name_offs)
            + bytes(pool))
    bgi = b'\x89BGI' + struct.pack('<II', 3, 1) + _xor(body, chacha_ks(len(body))) + NONCE
    # record "/": cifratura 2 (xor LCG, simmetrica, seme = lunghezza del nome = 1) con
    # compressione 0, come negli originali
    hdr = bgad.HDR.pack(b'BGAD', 2, 0, bgad.HDR.size, 1, 2, 0, len(bgi), len(bgi))
    slash = hdr + obfuscate_name(b'/', len(bgi)) + _xor(bgi, lcg_ks(len(bgi), 1))
    return (slash + record(b'md5', total_md5.hexdigest().encode(), skey)
            + record(b'size', str(base).encode(), skey))


if index_size is not None:
    # la lunghezza dell'indice cresce di un byte per byte del nome di riempimento
    probe = len(build_index(16))
    filler = 16 + index_size - probe
    if filler < 1:
        raise SystemExit('indice troppo grande per la dimensione installata (%d > %d): serve una '
                         'versione completa' % (probe - 15, index_size))
data = build_index(filler)
if index_size is not None and len(data) != index_size:
    raise SystemExit('indice di %d byte invece di %d' % (len(data), index_size))
with open(out, 'wb') as fh:
    fh.write(data)
print('%s: record %d, nomi %d, dati %d byte, md5 %s' % (out, len(offsets), len(entries), base,
                                                       total_md5.hexdigest()))
