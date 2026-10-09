"""bt.py <lib> <stack.bin> <stack_start_hex> <sp_hex> [n]: plausible return addresses (preceded by BL/BLR)."""
import struct, sys
# base di libcocos2dcpp sotto houdini: cambia tra un avvio e l'altro (0x31c0000, 0x31d4000);
# la si legge dal tombstone (tombstone.ps1) o da /proc/<pid>/maps e la si passa in KHUX_BASE
import os
LO = int(os.environ.get('KHUX_BASE', '0x31c0000'), 16)
HI = LO + 0x1da3000
lib = open(sys.argv[1], 'rb').read()
st = open(sys.argv[2], 'rb').read()
base, sp = int(sys.argv[3], 16), int(sys.argv[4], 16)
n = int(sys.argv[5]) if len(sys.argv) > 5 else 40
out = 0
for o in range(sp - base, len(st) - 7, 8):
    v = struct.unpack_from('<Q', st, o)[0]
    if not (LO <= v < HI): continue
    fo = v - LO - 4  # file offset of previous instruction
    if fo < 0 or fo + 4 > len(lib): continue
    w = struct.unpack_from('<I', lib, fo)[0]
    if (w & 0xfc000000) == 0x94000000 or (w & 0xfffffc1f) == 0xd63f0000:
        print('sp+%#x  ret G%x' % (o - (sp - base), v - LO + 0x100000))
        out += 1
        if out >= n: break
