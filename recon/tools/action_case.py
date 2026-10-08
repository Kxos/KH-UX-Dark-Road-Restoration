"""Il ramo di un'azione nel dispatcher delle risposte (FUN_007c3204): indirizzo, e
nelle sue prime istruzioni le chiamate (parser candidati) e le chiavi lette
direttamente sulla radice.

La tabella di salto sta a 0x177e414 (indirizzi Ghidra), indice = id - 1, voci
int32 relative alla tabella. Il disassemblato lineare viene da
recon/ghidra/khux_linear.py sull'intervallo 0x7c3204-0x7d1080.

    python -I recon/tools/action_case.py <libcocos2dcpp.so> <disassemblato lineare> <id> [n istruzioni]
"""
import os
import re
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vtables import Elf           # noqa: E402
from codeindex import cstring     # noqa: E402

TABLE = 0x177e414
GETTER = 0x0071f8ec
SKIP = {0x006d2660, 0x006cb560, 0x0084f290, 0x007c1dfc}   # rilasci shared_ptr, singleton


def case_address(elf, action):
    o = elf.vaddr_to_off(TABLE - 0x100000 + (action - 1) * 4)
    return TABLE + struct.unpack_from('<i', elf.data, o)[0]


def main():
    elf = Elf(sys.argv[1])
    lines = open(sys.argv[2]).read().splitlines()
    action = int(sys.argv[3])
    n = int(sys.argv[4]) if len(sys.argv) > 4 else 120
    start = case_address(elf, action)
    print('azione %d: ramo a %x' % (action, start))
    idx = next(i for i, l in enumerate(lines) if int(l[:8], 16) == start)
    page = {}
    for l in lines[idx:idx + n]:
        addr, ins = l[:8], l[10:]
        m = re.match(r'adrp (x\d+),0x([0-9a-f]+)', ins)
        if m:
            page[m.group(1)] = int(m.group(2), 16)
        m = re.match(r'add (x\d+),(x\d+),#0x([0-9a-f]+)$', ins)
        if m and m.group(2) in page:
            s = cstring(elf, page[m.group(2)] + int(m.group(3), 16) - 0x100000)
            if s:
                print('  %s  "%s"' % (addr, s))
        m = re.match(r'bl 0x([0-9a-f]+)', ins)
        if m:
            t = int(m.group(1), 16)
            if t == GETTER:
                print('  %s  getter' % addr)
            elif t not in SKIP:
                print('  %s  bl %x' % (addr, t))
        if re.match(r'b 0x', ins):          # i rami sono contigui: il primo salto chiude
            print('  %s  %s' % (addr, ins))
            break


if __name__ == '__main__':
    main()
