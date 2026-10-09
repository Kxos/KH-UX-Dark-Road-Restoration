"""Find ARM register blocks (x0..x30, sp, pc) in houdini dumps: pc and x30 inside libcocos2dcpp."""
import os, struct, sys
LO, HI = 0x31c0000, 0x4f63000
g = lambda v: v - LO + 0x100000
for f in sorted(os.listdir(sys.argv[1])):
    if not f.endswith('.bin'): continue
    b = open(os.path.join(sys.argv[1], f), 'rb').read()
    for o in range(0, len(b) - 0x108, 8):
        pc = struct.unpack_from('<Q', b, o + 0x100)[0]
        lr = struct.unpack_from('<Q', b, o + 0xf0)[0]
        sp = struct.unpack_from('<Q', b, o + 0xf8)[0]
        if LO <= pc < HI and LO <= lr < HI and 0x10000 < sp < 0x800000000000 and not (LO <= sp < HI):
            regs = struct.unpack_from('<31Q', b, o)
            print(f, hex(o), 'pc %x lr %x sp %x' % (g(pc), g(lr), sp))
            print('   ', ' '.join('x%d=%x%s' % (i, r, '(G%x)' % g(r) if LO <= r < HI else '') for i, r in enumerate(regs)))
