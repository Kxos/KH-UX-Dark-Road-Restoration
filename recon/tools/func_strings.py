"""Stringhe citate (ADRP+ADD) dentro una o piu' funzioni, direttamente dal binario.

Complemento di widget_lookup.py: trova anche i nomi di widget composti a pezzi che il
decompilatore mostra come s_<nome>_01xxxxxx (es. Txt_data4 + U+3000 in EquipSell).
Indirizzi Ghidra (file + 0x100000); la funzione finisce al primo RET dopo l'inizio
oppure all'indirizzo di fine dato.

    python -I recon/tools/func_strings.py <libcocos2dcpp.so> <inizio>[-<fine>] ...
"""
import struct
import sys

d = open(sys.argv[1], 'rb').read()
G = 0x100000


def strings(lo, hi):
    regs, out = {}, []
    for off in range(lo - G, hi - G, 4):
        w = struct.unpack_from('<I', d, off)[0]
        pc = off + G
        if (w & 0x9f000000) == 0x90000000:                      # ADRP
            imm = ((((w >> 5) & 0x7ffff) << 2) | ((w >> 29) & 3)) << 12
            if imm & (1 << 32):
                imm -= 1 << 33
            regs[w & 31] = (pc & ~0xfff) + imm
        elif (w & 0xffc00000) == 0x91000000 and ((w >> 5) & 31) in regs:   # ADD imm
            a = regs[(w >> 5) & 31] + ((w >> 10) & 0xfff) - G
            if 0 < a < len(d):
                e = d.find(b'\0', a, a + 200)
                s = d[a:e] if e > 0 else b''
                if len(s) >= 3:
                    try:
                        t = s.decode('utf-8')
                    except UnicodeDecodeError:
                        t = None
                    if t and t.isprintable():
                        out.append((pc, t))
    return out


for arg in sys.argv[2:]:
    lo, _, hi = arg.partition('-')
    lo = int(lo, 16)
    if hi:
        hi = int(hi, 16)
    else:                                  # fino al primo RET (d65f03c0)
        hi = lo
        while struct.unpack_from('<I', d, hi - G)[0] != 0xd65f03c0:
            hi += 4
        hi += 4
    print('== %x-%x' % (lo, hi))
    seen = set()
    for pc, t in strings(lo, hi):
        if t not in seen:
            seen.add(t)
            print('  %x  %r' % (pc, t))
