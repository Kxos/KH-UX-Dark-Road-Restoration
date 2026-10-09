"""Id dei testi text/ui caricati (FUN_00719f18, categoria 0) in intervalli di codice, e quali
mancano: costanti costruite con MOV+MOVK nello stesso registro poco prima della chiamata.

    python -I recon/tools/text_ids.py <libcocos2dcpp.so> <nomi serviti.tsv> <cartella testi
        generati (stage_gen\\files\\text\\ui)> <inizio-fine> ...      (indirizzi Ghidra)
"""
import os
import struct
import sys

d = open(sys.argv[1], 'rb').read()
served = {l.split('\t')[0] for l in open(sys.argv[2], encoding='utf-8')}
gen = sys.argv[3]
G = 0x100000
CALL = 0x719f18
found = {}
for arg in sys.argv[4:]:
    lo, hi = (int(x, 16) for x in arg.split('-'))
    regs = {}
    for off in range(lo - G, hi - G, 4):
        w = struct.unpack_from('<I', d, off)[0]
        pc = off + G
        if (w & 0x7f800000) == 0x52800000:                  # MOVZ w
            regs[w & 31] = ((w >> 5) & 0xffff) << (16 * ((w >> 21) & 3))
        elif (w & 0x7f800000) == 0x72800000 and (w & 31) in regs:   # MOVK w
            sh = 16 * ((w >> 21) & 3)
            regs[w & 31] = (regs[w & 31] & ~(0xffff << sh)) | (((w >> 5) & 0xffff) << sh)
        elif (w & 0xfc000000) == 0x94000000:                # BL
            imm = w & 0x3ffffff
            if imm & (1 << 25):
                imm -= 1 << 26
            # qualunque chiamata con un id di testo in un registro (FUN_00719f18 in w1,
            # FUN_006e6e6c e simili in w2)
            for r, v in regs.items():
                if 100000000 <= v < 120000000:
                    found.setdefault(v, pc)
            regs = {}
for tid, pc in sorted(found.items()):
    name = 'text/ui/%d.txt' % tid
    ok = name in served or os.path.exists(os.path.join(gen, '%d.txt' % tid))
    print('%d  %x  %s' % (tid, pc, 'ok' if ok else 'MANCA'))
