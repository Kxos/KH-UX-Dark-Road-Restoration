"""Converte le texture BTF di KHUX (immagini .png dei pacchetti) in PNG veri.

Formato, ricavato dai file (es. img/medal/Medal_L_11021.png):

    +0x00  '\\x89BTF'
    +0x04  u16[9]   ... (+0x10: 8)
    +0x16  u16 w0, h0   tela (es. 640 x 640)
    +0x1a  u16 x, y     posizione del ritaglio nella tela
    +0x1e  u16 w, h     dimensioni del ritaglio
    +0x22  u32          dimensione dei dati compressi
    +0x26  zlib         w * h * 4 byte RGBA

Il PNG riproduce la tela intera con il ritaglio al suo posto.

    python -I recon/tools/btf.py <file.btf> [...] [-o cartella]
"""
import os
import struct
import sys
import zlib


def decode(buf):
    assert buf[:4] == b'\x89BTF', buf[:4]
    w0, h0, x, y, w, h, n = struct.unpack_from('<6HI', buf, 0x16)
    px = zlib.decompress(buf[0x26:0x26 + n])
    assert len(px) == w * h * 4, (len(px), w, h)
    return w0, h0, x, y, w, h, px


def png(w, h, rgba):
    rows = b''.join(b'\0' + rgba[i * w * 4:(i + 1) * w * 4] for i in range(h))

    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(rows, 6)) + chunk(b'IEND', b''))


def to_png(buf):
    w0, h0, x, y, w, h, px = decode(buf)
    canvas = bytearray(w0 * h0 * 4)
    for r in range(h):
        canvas[((y + r) * w0 + x) * 4:((y + r) * w0 + x + w) * 4] = px[r * w * 4:(r + 1) * w * 4]
    return png(w0, h0, bytes(canvas))


def main():
    args = sys.argv[1:]
    out = None
    if '-o' in args:
        i = args.index('-o')
        out = args[i + 1]
        del args[i:i + 2]
        os.makedirs(out, exist_ok=True)
    for f in args:
        dst = os.path.join(out or os.path.dirname(f), os.path.splitext(os.path.basename(f))[0] + '.dec.png')
        open(dst, 'wb').write(to_png(open(f, 'rb').read()))
        print(dst)


if __name__ == '__main__':
    main()
