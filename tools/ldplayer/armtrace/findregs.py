"""Find ARM register blocks (x0..x30, sp, pc) in houdini dumps: x30 inside libcocos2dcpp.

    python findregs.py <houdini dir> [--lib-pc]

Searches subfolders too (stackcap.ps1 may nest them). By default pc may lie outside the
library (crash in libc, e.g. strlen called from the game: x30 is still in the library);
with --lib-pc only blocks with pc in the library are printed (stricter, fewer false hits).
"""
import os, struct, sys
# base di libcocos2dcpp sotto houdini: cambia tra un avvio e l'altro (0x31c0000, 0x31d4000);
# la si legge dal tombstone (tombstone.ps1) o da /proc/<pid>/maps e la si passa in KHUX_BASE
import os
LO = int(os.environ.get('KHUX_BASE', '0x31c0000'), 16)
HI = LO + 0x1da3000
g = lambda v: v - LO + 0x100000
lib_pc = '--lib-pc' in sys.argv
for root, _, files in os.walk(sys.argv[1]):
    for f in sorted(files):
        if not f.endswith('.bin'): continue
        b = open(os.path.join(root, f), 'rb').read()
        for o in range(0, len(b) - 0x108, 8):
            pc = struct.unpack_from('<Q', b, o + 0x100)[0]
            lr = struct.unpack_from('<Q', b, o + 0xf0)[0]
            sp = struct.unpack_from('<Q', b, o + 0xf8)[0]
            pc_ok = LO <= pc < HI if lib_pc else (pc > 0x10000 and pc % 4 == 0)
            if pc_ok and LO <= lr < HI and 0x10000 < sp < 0x800000000000 and sp % 16 == 0 and not (LO <= sp < HI):
                regs = struct.unpack_from('<31Q', b, o)
                pcs = 'G%x' % g(pc) if LO <= pc < HI else '%x' % pc
                print(f, hex(o), 'pc %s lr %x sp %x' % (pcs, g(lr), sp))
                print('   ', ' '.join('x%d=%x%s' % (i, r, '(G%x)' % g(r) if LO <= r < HI else '') for i, r in enumerate(regs)))
