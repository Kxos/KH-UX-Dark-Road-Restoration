"""Cerca stringhe nei file di un dump (<start>-<end>.bin) e ne stampa
l'indirizzo virtuale e il contesto ASCII intorno."""
import os
import re
import sys


def printable(b):
    return "".join(chr(c) if 32 <= c < 127 else "." for c in b)


def main(folder, *needles):
    pats = [n.encode() for n in needles]
    for fn in sorted(os.listdir(folder)):
        if not fn.endswith(".bin"):
            continue
        base = int(fn.split("-")[0], 16)
        data = open(os.path.join(folder, fn), "rb").read()
        for p in pats:
            for m in re.finditer(re.escape(p), data):
                off = m.start()
                ctx = data[max(0, off - 48): off + 96]
                print(f"{fn}  va={base + off:#x}  [{p.decode()}]  {printable(ctx)}")


if __name__ == "__main__":
    main(sys.argv[1], *sys.argv[2:])
