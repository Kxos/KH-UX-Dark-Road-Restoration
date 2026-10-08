"""Chi usa un indirizzo: BL/B diretti, ADRP+ADD, rilocazioni RELATIVE con quell'addend.

Indirizzi nel FILE (Ghidra - 0x100000). Stampa anche l'equivalente Ghidra.

    python -I recon/tools/who_refs.py recon/tools <libcocos2dcpp.so> <ind_file> [...]
"""
import struct
import sys
sys.path.insert(0, sys.argv[1])
from vtables import Elf
from codeindex import build_index, function_ranges

elf = Elf(sys.argv[2])
targets = [int(a, 16) for a in sys.argv[3:]]
ranges = function_ranges(elf)
index = build_index(elf, ranges)
text = elf.section('.text')
d = elf.data
starts = sorted(ranges)
import bisect


def owner(va):
    i = bisect.bisect_right(starts, va) - 1
    return starts[i] if i >= 0 else None


for t in targets:
    print('== %x (ghidra %x)' % (t, t + 0x100000))
    for f, (addrs, calls) in index.items():
        if t in calls:
            print('  BL da FUN_%x' % f)
        if any(v == t for _pc, v in addrs):
            print('  ADRP/ADD in FUN_%x' % f)
    o = text['off']
    for i in range(0, text['size'], 4):
        (insn,) = struct.unpack_from('<I', d, o + i)
        if (insn & 0xfc000000) == 0x14000000:
            im = insn & 0x3ffffff
            if im & (1 << 25):
                im -= (1 << 26)
            if text['addr'] + i + (im << 2) == t:
                print('  B da %x (FUN_%x)' % (text['addr'] + i, owner(text['addr'] + i)))
    for k, v in elf.relocations().items():
        if v == t:
            print('  RELA a %x' % k)

