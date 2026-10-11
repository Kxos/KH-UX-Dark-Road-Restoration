# Come backtrace.py ma scandisce anche SOTTO lo sp (dati di chiamate gia' tornate) per ritrovare
# frame stantii. Uscita: offset rispetto allo sp e indirizzo Ghidra di ritorno (preceduto da BL/BLR).
#   python -I stalescan.py <lib> <stack.bin> <stack_start_hex> <sp_hex> <base_lib_hex> <sotto_hex> <sopra_hex>
# La base della libreria va presa da stackcap (maps.txt della cartella puo' essere vecchio).
import struct, sys
lib = open(sys.argv[1], 'rb').read()
st = open(sys.argv[2], 'rb').read()
base, sp = int(sys.argv[3], 16), int(sys.argv[4], 16)
LO = int(sys.argv[5], 16); HI = LO + 0x1da3000
lo_off = int(sys.argv[6], 16); hi_off = int(sys.argv[7], 16)
for o in range(max(0, sp - base - lo_off) & ~7, min(len(st) - 8, sp - base + hi_off), 8):
    v = struct.unpack_from('<Q', st, o)[0]
    if not (LO <= v < HI):
        continue
    fo = v - LO - 4
    if fo < 0 or fo + 4 > len(lib):
        continue
    w = struct.unpack_from('<I', lib, fo)[0]
    if (w & 0xfc000000) == 0x94000000 or (w & 0xfffffc1f) == 0xd63f0000:
        print('%+#x G%x' % (o - (sp - base), v - LO + 0x100000))
