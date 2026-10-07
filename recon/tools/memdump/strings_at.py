"""Stampa le stringhe ASCII (>= min caratteri) di un file di dump in una
finestra di byte intorno a un indirizzo virtuale.

uso: strings_at.py <file.bin> <va_esadecimale> <raggio_byte> [min]
"""
import re
import sys


def main(path, va, radius, minlen="5"):
    base = int(path.replace("\\", "/").rsplit("/", 1)[-1].split("-")[0], 16)
    va, radius, minlen = int(va, 16), int(radius), int(minlen)
    data = open(path, "rb").read()
    lo = max(0, va - base - radius)
    hi = min(len(data), va - base + radius)
    for m in re.finditer(rb"[\x20-\x7e]{%d,}" % minlen, data[lo:hi]):
        print(f"{base + lo + m.start():#x}  {m.group().decode()}")


if __name__ == "__main__":
    main(*sys.argv[1:])
