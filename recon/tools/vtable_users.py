"""Chi crea una lambda (std::function) di cui si conosce una funzione della vtable (es. il
target() trovato dalla stringa di typeinfo): cerca nelle rilocazioni R_AARCH64_RELATIVE gli
slot che puntano alla funzione, poi nel codice le coppie ADRP+ADD che calcolano un indirizzo
nella stessa vtable (fino a 0x40 byte prima dello slot). Indirizzi Ghidra (file + 0x100000).

    python -I recon/tools/vtable_users.py <libcocos2dcpp.so> <funzione> ...
"""
import struct
import sys

G = 0x100000
so = sys.argv[1]
targets = {int(a, 16) - G for a in sys.argv[2:]}
d = open(so, 'rb').read()
# ELF64: sezioni
shoff, = struct.unpack_from('<Q', d, 0x28)
shentsize, shnum = struct.unpack_from('<HH', d, 0x3a)
secs = [struct.unpack_from('<IIQQQQIIQQ', d, shoff + i * shentsize) for i in range(shnum)]
slots = {}
text = None
for name, typ, flags, addr, off, size, link, info, align, entsize in secs:
    if typ == 4:                                        # SHT_RELA
        for k in range(0, size, 24):
            r_off, r_info, r_add = struct.unpack_from('<QQq', d, off + k)
            if r_info & 0xffffffff == 1027 and r_add in targets:   # R_AARCH64_RELATIVE
                slots[r_off] = r_add
    if flags & 4 and size > 0x100000:                   # SHF_EXECINSTR: .text
        text = (addr, off, size)
for s, t in sorted(slots.items()):
    print('slot %x -> %x' % (s + G, t + G))
# voci della GOT che contengono un indirizzo della vtable (caricate con ADRP+LDR)
got = {}
for name, typ, flags, a, o, size, link, info, align, entsize in secs:
    if typ == 4:
        for k in range(0, size, 24):
            r_off, r_info, r_add = struct.unpack_from('<QQq', d, o + k)
            if r_info & 0xffffffff == 1027 and any(s - 0x60 <= r_add <= s for s in slots):
                got[r_off] = r_add
addr, off, size = text
for i in range(0, size - 4, 4):
    ins, = struct.unpack_from('<I', d, off + i)
    if ins & 0x9f000000 != 0x90000000:                  # ADRP
        continue
    rd = ins & 31
    imm = ((ins >> 29) & 3) | (((ins >> 5) & 0x7ffff) << 2)
    if imm & (1 << 20):
        imm -= 1 << 21
    pc = addr + i
    page = (pc & ~0xfff) + (imm << 12)
    for j in range(1, 16):
        nxt, = struct.unpack_from('<I', d, off + i + 4 * j)
        if nxt & 0xffc00000 == 0xf9400000 and (nxt >> 5) & 31 == rd:   # LDR x, [xn, #imm]
            val = page + ((nxt >> 10) & 0xfff) * 8
            if val in got:
                print('  %x  ADRP+LDR GOT %x -> vtable %x' % (pc + G, val + G, got[val] + G))
            break
        if nxt & 0xff800000 == 0x91000000 and (nxt >> 5) & 31 == rd:   # ADD imm
            sh = (nxt >> 22) & 1
            val = page + (((nxt >> 10) & 0xfff) << (12 if sh else 0))
            for s in slots:
                if s - 0x60 <= val <= s:
                    print('  %x  ADRP+ADD -> %x (vtable dello slot %x)' % (pc + G, val + G, s + G))
            break
