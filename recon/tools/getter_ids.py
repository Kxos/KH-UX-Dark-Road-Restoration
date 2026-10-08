"""Id costanti passati a un getter di tabella master, con i chiamanti.

Il getter di una riga per id (per `misc`: FUN_00efe8b4 in Ghidra, 0xdfe8b4 nel
file) riceve l'id in un registro e restituisce la riga tramite x8. Se la riga non
c'e' restituisce null, e quasi tutti i chiamanti la usano senza controllarla: il
primo crash dopo il filmato era proprio `misc` 804 mancante. Questo script trova,
per ogni BL al getter, il valore costante del registro dell'id (MOVZ/MOVK/MOV
tracciati in avanti dentro la funzione). Gli id calcolati a runtime sono solo
contati.

    python -I recon/tools/getter_ids.py <libcocos2dcpp.so> <getter, indirizzo nel file> [registro]

Uscita: una riga per id, `id  n_chiamanti  chiamanti (indirizzi Ghidra)`.
"""
import collections
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vtables import Elf                  # noqa: E402
from codeindex import function_ranges    # noqa: E402

STORES = (0xb9000000, 0xf9000000, 0x39000000, 0x29000000, 0xa9000000)


def getter_ids(elf, target, reg=0):
    d = elf.data
    text = elf.section('.text')
    ids = collections.defaultdict(set)
    unknown = []
    for f, n in function_ranges(elf).items():
        if not (text['addr'] <= f < text['addr'] + text['size']):
            continue
        o = text['off'] + (f - text['addr'])
        last = {}
        for i in range(0, n, 4):
            (w,) = struct.unpack_from('<I', d, o + i)
            rd = w & 0x1f
            if (w & 0x7f800000) == 0x52800000:                       # MOVZ
                last[rd] = ((w >> 5) & 0xffff) << (16 * ((w >> 21) & 3))
            elif (w & 0x7f800000) == 0x72800000 and rd in last:      # MOVK
                hw = (w >> 21) & 3
                last[rd] = (last[rd] & ~(0xffff << 16 * hw)) | (((w >> 5) & 0xffff) << 16 * hw)
            elif (w & 0x7fe0ffe0) == 0x2a0003e0:                     # MOV wd, ws
                rs = (w >> 16) & 0x1f
                if rs in last:
                    last[rd] = last[rs]
                elif rd in last:
                    del last[rd]
            elif (w & 0xfc000000) == 0x94000000:                     # BL
                im = w & 0x3ffffff
                if im & (1 << 25):
                    im -= 1 << 26
                if f + i + (im << 2) == target:
                    if reg in last:
                        ids[last[reg]].add(f + 0x100000)
                    else:
                        unknown.append(f + i + 0x100000)
                last = {}                                            # x0-x18 non sopravvivono
            elif (w & 0xff000000) in STORES:
                pass
            elif rd in last:
                del last[rd]
    return ids, unknown


def main():
    elf = Elf(sys.argv[1])
    target = int(sys.argv[2], 16)
    reg = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    ids, unknown = getter_ids(elf, target, reg)
    for k in sorted(ids):
        print('%d\t%d\t%s' % (k, len(ids[k]), ' '.join('%x' % x for x in sorted(ids[k]))))
    print('# chiamate con id non costante: %d' % len(unknown))


if __name__ == '__main__':
    main()
