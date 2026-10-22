"""Id delle azioni delle richieste e stringhe dei loro corpi, letti dal binario del client.
Stampa id e chiavi del corpo (es. [28] ['revision', 'resoMode']). Strumento di ricerca.

    python -I recon/tools/request_ids.py recon/tools <libcocos2dcpp.so> <indirizzo> [id,id,...]"""
import struct
import sys
import collections
sys.path.insert(0, sys.argv[1])
from vtables import Elf
from codeindex import function_ranges, build_index, strings_of

elf = Elf(sys.argv[2])
enqueue = int(sys.argv[3], 16)
want = set(int(x) for x in sys.argv[4].split(',')) if len(sys.argv) > 4 else None
d = elf.data
text = elf.section('.text')
ranges = function_ranges(elf)
index = build_index(elf, ranges)
for f, n in sorted(ranges.items()):
    if f not in index or enqueue not in index[f][1]:
        continue
    o = text['off'] + (f - text['addr'])
    last = {}
    ids = []
    for i in range(0, n, 4):
        (w,) = struct.unpack_from('<I', d, o + i)
        rd = w & 0x1f
        if (w & 0x7f800000) == 0x52800000 and ((w >> 21) & 3) == 0:
            last[rd] = (w >> 5) & 0xffff
        elif (w & 0xffc00000) == 0xb9000000:          # STR Wt, [Xn, #imm*4]
            if ((w >> 10) & 0xfff) * 4 == 0x28 and rd in last:
                ids.append(last[rd])
        elif rd in last and (w & 0xff000000) not in (0xb9000000, 0xf9000000, 0x39000000, 0x29000000):
            del last[rd]
    if ids and (want is None or want & set(ids)):
        print('FUN_%x' % (f + 0x100000), ids, strings_of(elf, index, f)[:6])
