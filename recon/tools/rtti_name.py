# Nome RTTI di una vtable letto direttamente dal .so (senza Ghidra): l'indirizzo Ghidra e' l'inizio
# della vtable (offset-to-top, typeinfo, ...). Per le lambda std::function il puntatore che il
# decompilato mostra (&PTR_FUN_xxx) e' il vptr: passare vptr - 0x10.
#   python -I rtti_name.py <libcocos2dcpp.so> <ghidra_vtable> ...
import struct, sys
path = sys.argv[1]
d = open(path, 'rb').read()
phoff = struct.unpack_from('<Q', d, 0x20)[0]
phnum = struct.unpack_from('<H', d, 0x38)[0]
segs = []
for i in range(phnum):
    o = phoff + i * 56
    typ, flg, off, va, pa, fs, ms, al = struct.unpack_from('<IIQQQQQQ', d, o)
    if typ == 1:
        segs.append((va, off, fs, ms))
# relocations: RELA relative addends (target of R_AARCH64_RELATIVE) keyed by vaddr
dyn = None
for i in range(phnum):
    o = phoff + i * 56
    typ, flg, off, va, pa, fs, ms, al = struct.unpack_from('<IIQQQQQQ', d, o)
    if typ == 2:
        dyn = (off, fs)
tags = {}
for k in range(dyn[0], dyn[0] + dyn[1], 16):
    t, v = struct.unpack_from('<qQ', d, k)
    if t == 0:
        break
    tags.setdefault(t, v)


def v2o(va):
    for s_va, s_off, fs, ms in segs:
        if s_va <= va < s_va + fs:
            return va - s_va + s_off
    return None


rel = {}
if 7 in tags:
    ro = v2o(tags[7]); sz = tags[8]
    for k in range(ro, ro + sz, 24):
        off, info, add = struct.unpack_from('<QQq', d, k)
        rel[off] = add


def q(va):
    if va in rel:
        return rel[va]
    o = v2o(va)
    return struct.unpack_from('<Q', d, o)[0] if o is not None else None


def cs(va):
    o = v2o(va)
    e = d.index(b'\0', o)
    return d[o:e].decode('ascii', 'replace')


for a in sys.argv[2:]:
    va = int(a, 16) - 0x100000
    ti = q(va + 8)
    if not ti:
        print(a, 'no typeinfo'); continue
    nm = q(ti + 8)
    print(a, cs(nm) if nm else '?')
