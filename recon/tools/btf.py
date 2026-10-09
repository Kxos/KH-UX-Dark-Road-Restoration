"""Texture BTF delle risorse (i .png di cocostudio/, img/, lwf/ non sono PNG veri).

Intestazione (little endian):
    +0x00 '\\x89BTF'   +0x10 u8 tipo
    +0x16 u16 larghezza, u16 altezza della tela
    +0x1a u16 x, u16 y dell'immagine ritagliata dentro la tela
    +0x1e u16 larghezza, u16 altezza dell'immagine
tipo 8: RGBA 32 bit, dati zlib da +0x26
tipo 9: palette, +0x22 u16 numero di colori N, dati zlib da +0x28: N colori RGBA poi un
        indice di un byte per pixel
tipo 1: segnaposto (1x1)

    python -I recon/tools/btf.py <file.btf> <uscita.png>     (Pillow: senza -I se serve)
"""
import struct
import zlib


def info(d):
    if d[:4] != b'\x89BTF':
        return None
    cw, ch, ox, oy, w, h = struct.unpack_from('<6H', d, 0x16)
    return dict(type=d[0x10], canvas=(cw, ch), offset=(ox, oy), size=(w, h))


def decode(d):
    """Restituisce un'immagine PIL RGBA grande quanto la tela."""
    from PIL import Image
    i = info(d)
    if i is None:
        raise ValueError('non BTF')
    w, h = i['size']
    canvas = Image.new('RGBA', i['canvas'] if all(i['canvas']) else (max(w, 1), max(h, 1)))
    if i['type'] == 8:
        raw = zlib.decompressobj().decompress(d[0x26:])
        im = Image.frombytes('RGBA', (w, h), raw[:w * h * 4])
    elif i['type'] == 9:
        n = struct.unpack_from('<H', d, 0x22)[0]
        raw = zlib.decompressobj().decompress(d[0x28:])
        pal = [tuple(raw[k * 4:k * 4 + 4]) for k in range(n)]
        im = Image.new('RGBA', (w, h))
        im.putdata([pal[b] if b < n else (0, 0, 0, 0) for b in raw[n * 4:n * 4 + w * h]])
    else:
        return canvas
    canvas.paste(im, i['offset'])
    return canvas


if __name__ == '__main__':
    import sys
    decode(open(sys.argv[1], 'rb').read()).save(sys.argv[2])
