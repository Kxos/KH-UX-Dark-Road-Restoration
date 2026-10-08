"""Costruisce l'indice di un pacchetto di risorse scaricabile (r/misc.png).

L'indice che il client scarica con /system/resource non e' identico a quello
dell'APK. Dopo il download FUN_00ec9b4c lo rilegge record per record
(FUN_01321888) e pretende, in quest'ordine:

    1. un record di nome "/"     l'indice BGI vero e proprio (come misc.png dell'APK)
    2. un record di nome "md5"   32 caratteri, decifrati con la chiave di sessione
    3. un record di nome "size"  facoltativo: dimensione del pacchetto, in decimale

Se "size" c'e' e non coincide con la somma dei file "data" scaricati, o se
manca "md5", compare "Save error". Il contenuto di "md5" non viene confrontato
con nulla; qui ci va comunque l'MD5 esadecimale del pacchetto.

La chiave dei record md5/size (FUN_00ec75f4) sono i 32 byte all'offset 0x48 del
record "data" della risposta a /system/login: cioe' il QUARTO elemento di "data",
decodificato da Base64. La sceglie il server; server.js e questo script la
derivano allo stesso modo (resource_key()).

Formato di un record (vedi bgad.py): header '<4sHHHHHHII' (magic BGAD, versione,
flag, dimensione header, lunghezza nome, cifratura, compressione, dimensione
salvata, dimensione in chiaro), poi il nome, poi i dati. Il nome e' offuscato con
l'LCG seed*0x19660d+0x3c6ef35f, seme = dimensione salvata: byte per byte nella
versione 1, a parole da 32 bit nella 2. Cifratura 3 = ChaCha8 con la chiave, IV =
nonce in coda (flag 4) xor 0x7283159b49d9c062.

    python -I recon/tools/resource_index.py <pacchetto> <indice di partenza> <uscita> [chiave hex]
"""
import hashlib
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bgad import HDR, NONCE_XOR, _chacha_block, stream_xor   # noqa: E402

LCG_MUL, LCG_ADD = 0x19660d, 0x3c6ef35f


def resource_key():
    """La chiave predefinita: la stessa che server.js mette in data[3] del login."""
    return hashlib.sha256(b'khux-resource-index').digest()


def obfuscate_name(name, seed, ver=2):
    out = bytearray(name)
    if ver == 1:
        for i in range(len(out)):
            seed = (seed * LCG_MUL + LCG_ADD) & 0xffffffff
            out[i] ^= seed & 0xff
        return bytes(out)
    out += b'\0' * (-len(out) % 4)
    for i in range(0, len(out), 4):
        seed = (seed * LCG_MUL + LCG_ADD) & 0xffffffff
        struct.pack_into('<I', out, i, struct.unpack_from('<I', out, i)[0] ^ seed)
    return bytes(out[:len(name)])


def record(name, plain, key):
    """Un record BGAD versione 2, cifratura 3 (ChaCha8), nonce in coda."""
    nonce = os.urandom(8)
    iv = struct.pack('<Q', struct.unpack('<Q', nonce)[0] ^ NONCE_XOR)
    data = stream_xor(plain, key, iv, _chacha_block, 8) + nonce
    hdr = HDR.pack(b'BGAD', 2, 4, HDR.size, len(name), 3, 0, len(data), len(plain))
    return hdr + obfuscate_name(name, len(data)) + data


def build(pack, base_index, key):
    body = open(pack, 'rb').read()
    base = open(base_index, 'rb').read()
    return (base
            + record(b'md5', hashlib.md5(body).hexdigest().encode(), key)
            + record(b'size', str(len(body)).encode(), key))


def main():
    pack, base_index, out = sys.argv[1:4]
    key = bytes.fromhex(sys.argv[4]) if len(sys.argv) > 4 else resource_key()
    data = build(pack, base_index, key)
    with open(out, 'wb') as fh:
        fh.write(data)
    print('%s: %d byte (indice di partenza + md5 + size)' % (out, len(data)))


if __name__ == '__main__':
    main()
