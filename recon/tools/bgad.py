"""Contenitori BGAD dei pacchetti di asset di KHUX (misc.mp4, aliud.png, ...).

Formato ricavato da bg::FileManager (FUN_01321b18 e FUN_01321f70 in Ghidra):

    +0x00  u32  magic 'BGAD'
    +0x04  u16  versione (1 o 2)
    +0x06  u16  flag; bit 2 = in coda ai dati ci sono 8 byte di nonce
    +0x08  u16  dimensione dell'header (0x18)
    +0x0a  u16  lunghezza del nome (e seme delle cifrature 1 e 2)
    +0x0c  u16  cifratura: 0 nessuna, 1 xor byte LCG, 2 xor dword LCG, 3 Salsa20
    +0x0e  u16  compressione: 0 nessuna, 1-2 zlib
    +0x10  u32  dimensione dei dati salvati (nonce compreso)
    +0x14  u32  dimensione decompressa

Cifratura 3: API eSTREAM (ECRYPT_*) con IV da 64 bit; IV = nonce in coda xor
0x7283159b49d9c062. Il cifrario e' **ChaCha a 8 round** (verificato: Salsa20 e
ChaCha a 12/20 round non danno testo leggibile). La chiave la passa il chiamante:
per i pacchetti sono i 32 byte a 0x1926890 di libcocos2dcpp.so (indirizzo Ghidra;
0x1826890 nel file).

Un pacchetto e' una sequenza di record BGAD (i nomi nei record sono cifrati e il
lettore li salta). I nomi veri stanno nell'**indice**, il .png con lo stesso nome
(misc.mp4 -> misc.png): un record BGAD il cui contenuto inizia con '\\x89BGI',
versione 3. Se il flag (u32 a +8) ha il bit 0, il contenuto da +0x0c a fine-8 e'
cifrato una seconda volta con ChaCha8, stessa chiave, IV = ultimi 8 byte xor
0xc4db340f0a3574ea. Poi:

    +0x0c u32 n_record   +0x10 u32 n_nomi
    +0x14 n_record x (u32 offset del record nel pacchetto, u32 0)
          n_nomi x u32 indice del record
          n_nomi x u32 offset del nome nel pool
          pool di stringhe terminate da zero

Solo libreria standard. Uso:
    python bgad.py <libcocos2dcpp.so> <pacchetto.mp4> <indice.png> <cartella di uscita> [prefisso]

Estrae i file (tutti, o solo quelli il cui nome inizia col prefisso). Per i soli
testi e' lento: ChaCha in Python puro, ~ qualche minuto per 30 MB.
"""
import os
import struct
import sys
import zlib

KEY_VADDR = 0x1826890            # indirizzo nel file della chiave dei pacchetti
NONCE_XOR = 0x7283159b49d9c062
HDR = struct.Struct('<4sHHHHHHII')


def _rotl(v, c):
    return ((v << c) & 0xffffffff) | (v >> (32 - c))


def _salsa20_block(key, nonce, counter, rounds=20):
    c = b'expand 32-byte k' if len(key) == 32 else b'expand 16-byte k'
    k = key if len(key) == 32 else key + key
    s = struct.unpack('<4I', c)
    kw = struct.unpack('<8I', k)
    n = struct.unpack('<2I', nonce)
    x = [s[0], kw[0], kw[1], kw[2], kw[3], s[1], n[0], n[1],
         counter & 0xffffffff, counter >> 32, s[2], kw[4], kw[5], kw[6], kw[7], s[3]]
    w = list(x)

    def qr(a, b, c_, d):
        w[b] ^= _rotl((w[a] + w[d]) & 0xffffffff, 7)
        w[c_] ^= _rotl((w[b] + w[a]) & 0xffffffff, 9)
        w[d] ^= _rotl((w[c_] + w[b]) & 0xffffffff, 13)
        w[a] ^= _rotl((w[d] + w[c_]) & 0xffffffff, 18)
    for _ in range(rounds // 2):
        qr(0, 4, 8, 12); qr(5, 9, 13, 1); qr(10, 14, 2, 6); qr(15, 3, 7, 11)
        qr(0, 1, 2, 3); qr(5, 6, 7, 4); qr(10, 11, 8, 9); qr(15, 12, 13, 14)
    return struct.pack('<16I', *((w[i] + x[i]) & 0xffffffff for i in range(16)))


def _chacha_block(key, nonce, counter, rounds=20):
    c = b'expand 32-byte k' if len(key) == 32 else b'expand 16-byte k'
    k = key if len(key) == 32 else key + key
    x = list(struct.unpack('<4I', c) + struct.unpack('<8I', k)
             + (counter & 0xffffffff, counter >> 32) + struct.unpack('<2I', nonce))
    w = list(x)

    def qr(a, b, c_, d):
        w[a] = (w[a] + w[b]) & 0xffffffff; w[d] = _rotl(w[d] ^ w[a], 16)
        w[c_] = (w[c_] + w[d]) & 0xffffffff; w[b] = _rotl(w[b] ^ w[c_], 12)
        w[a] = (w[a] + w[b]) & 0xffffffff; w[d] = _rotl(w[d] ^ w[a], 8)
        w[c_] = (w[c_] + w[d]) & 0xffffffff; w[b] = _rotl(w[b] ^ w[c_], 7)
    for _ in range(rounds // 2):
        qr(0, 4, 8, 12); qr(1, 5, 9, 13); qr(2, 6, 10, 14); qr(3, 7, 11, 15)
        qr(0, 5, 10, 15); qr(1, 6, 11, 12); qr(2, 7, 8, 13); qr(3, 4, 9, 14)
    return struct.pack('<16I', *((w[i] + x[i]) & 0xffffffff for i in range(16)))


def stream_xor(data, key, nonce, block=_salsa20_block, rounds=20):
    out = bytearray(len(data))
    for i in range(0, len(data), 64):
        ks = block(key, nonce, i // 64, rounds)
        chunk = data[i:i + 64]
        out[i:i + len(chunk)] = bytes(a ^ b for a, b in zip(chunk, ks))
    return bytes(out)


def parse(buf, off=0):
    """Header di un record BGAD all'offset dato, come dizionario."""
    (magic, ver, flags, hsize, nlen, enc, comp, size, raw) = HDR.unpack_from(buf, off)
    if magic != b'BGAD':
        raise ValueError('magic non BGAD a %#x: %r' % (off, magic))
    return dict(off=off, ver=ver, flags=flags, hsize=hsize, nlen=nlen, enc=enc,
                comp=comp, size=size, raw=raw,
                name_off=off + hsize, data_off=off + hsize + nlen,
                end=off + hsize + nlen + size)


def record_name(buf, h):
    """Nome di un record (FUN_01321888): offuscato con l'LCG seed*0x19660d+0x3c6ef35f,
    seme = dimensione salvata; byte per byte nella versione 1, a parole nella 2.
    L'indice di un pacchetto si chiama "/"; quello delle risorse scaricate ha in
    coda anche "md5" e "size" (vedi resource_index.py)."""
    name = bytearray(buf[h['name_off']:h['name_off'] + h['nlen']])
    seed = h['size']
    if h['ver'] == 1:
        for i in range(len(name)):
            seed = (seed * 0x19660d + 0x3c6ef35f) & 0xffffffff
            name[i] ^= seed & 0xff
        return bytes(name)
    name += b'\0' * (-len(name) % 4)
    for i in range(0, len(name), 4):
        seed = (seed * 0x19660d + 0x3c6ef35f) & 0xffffffff
        struct.pack_into('<I', name, i, struct.unpack_from('<I', name, i)[0] ^ seed)
    return bytes(name[:h['nlen']])


def decode(buf, h, key, block=_chacha_block, rounds=8):
    """Dati in chiaro di un record (decifrati e decompressi)."""
    data = bytes(buf[h['data_off']:h['data_off'] + h['size']])
    nonce = None
    if h['flags'] & 4:
        nonce, data = data[-8:], data[:-8]
    if h['enc'] == 1:
        seed, out = h['nlen'], bytearray(data)
        for i in range(len(out)):
            seed = (seed * 0x660d - 0xca1) & 0xffff
            out[i] ^= seed & 0xff
        data = bytes(out)
    elif h['enc'] == 2:
        seed, out = h['nlen'], bytearray(data + b'\0' * (-len(data) % 4))
        for i in range(0, len(out), 4):
            seed = (seed * 0x19660d + 0x3c6ef35f) & 0xffffffff
            struct.pack_into('<I', out, i, struct.unpack_from('<I', out, i)[0] ^ seed)
        data = bytes(out[:len(data)])
    elif h['enc'] == 3:
        iv = struct.pack('<Q', struct.unpack('<Q', nonce)[0] ^ NONCE_XOR)
        data = stream_xor(data, key, iv, block, rounds)
    if h['comp'] in (1, 2):
        data = zlib.decompress(data)
    return data


def lib_key(lib_path):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from vtables import Elf
    elf = Elf(lib_path)
    o = elf.vaddr_to_off(KEY_VADDR)
    return elf.data[o:o + 32]


INDEX_IV_XOR = 0xc4db340f0a3574ea


def read_index(index_path, key):
    """[(nome, offset del record)] dall'indice .png di un pacchetto."""
    raw = open(index_path, 'rb').read()
    b = bytearray(decode(raw, parse(raw), key))
    if b[:4] != b'\x89BGI':
        raise ValueError('indice senza magic \\x89BGI: %r' % bytes(b[:4]))
    if struct.unpack_from('<I', b, 8)[0] & 1:
        iv = struct.pack('<Q', struct.unpack_from('<Q', b, len(b) - 8)[0] ^ INDEX_IV_XOR)
        b[0xc:len(b) - 8] = stream_xor(bytes(b[0xc:len(b) - 8]), key, iv, _chacha_block, 8)
    n_rec, n_names = struct.unpack_from('<II', b, 0xc)
    p_off = 0x14
    p_idx = p_off + n_rec * 8
    p_name = p_idx + n_names * 4
    pool = p_name + n_names * 4
    out = []
    for i in range(n_names):
        rec = struct.unpack_from('<I', b, p_idx + i * 4)[0]
        no = struct.unpack_from('<I', b, p_name + i * 4)[0]
        name = bytes(b[pool + no:b.index(0, pool + no)]).decode('utf-8', 'replace')
        out.append((name, struct.unpack_from('<I', b, p_off + rec * 8)[0]))
    return out


def main():
    lib, pack, index, outdir = sys.argv[1:5]
    prefix = sys.argv[5] if len(sys.argv) > 5 else ''
    key = lib_key(lib)
    buf = open(pack, 'rb').read()
    n = 0
    for name, off in read_index(index, key):
        if not name.startswith(prefix):
            continue
        dst = os.path.join(outdir, *name.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(decode(buf, parse(buf, off), key))
        n += 1
    print('estratti %d file in %s' % (n, outdir))


if __name__ == '__main__':
    main()
