"""Registri ARM e backtrace al momento di un crash, dai dump di freeze_on_crash.sh.

Sotto houdini lo stato della CPU ARM emulata sta in una struttura nelle regioni
[anon:Mem_0x10002002] (nel tombstone la punta r13): x0..x30 a 8 byte ciascuno, poi
sp e pc. La si ritrova cercando un valore noto (es. l'indirizzo della funzione in cui
si e' fermato il thread, o il valore di x0 visto nel tombstone). libcocos2dcpp.so e'
caricata da houdini sempre alla stessa base (0x3308000): indirizzo Ghidra =
indirizzo - base + 0x100000.

    python -I analyze.py regs  <cartella dump> <valore_hex> [...]   # trova la struttura
    python -I analyze.py stack <file stack.bin> <inizio_hex> <sp_hex> [n]   # backtrace

Il backtrace e' euristico: elenca, da sp in su, le parole che cadono nel testo della
libreria e sono precedute da un BL/BLR (indirizzi di ritorno plausibili).
"""
import os
import struct
import sys

BASE = 0x3308000
TEXT_END = BASE + 0x1da3000
GHIDRA = 0x100000


def ghidra(v):
    return v - BASE + GHIDRA


def in_lib(v):
    return BASE <= v < TEXT_END


def regs(folder, values):
    targets = [int(v, 16) for v in values]
    for name in sorted(os.listdir(folder)):
        if not name.endswith('.bin'):
            continue
        start = int(name.split('_')[0], 16)
        data = open(os.path.join(folder, name), 'rb').read()
        for t in targets:
            needle = struct.pack('<Q', t)
            pos = data.find(needle)
            while pos >= 0:
                print('== %s: %#x a %#x (offset %#x)' % (name, t, start + pos, pos))
                # mostra la zona come registri, da 0x200 byte prima
                lo = max(0, (pos - 0x200) & ~7)
                for o in range(lo, min(len(data), pos + 0x100), 8):
                    v = struct.unpack_from('<Q', data, o)[0]
                    tag = ('  <- lib, Ghidra %#x' % ghidra(v)) if in_lib(v) else ''
                    mark = '  ***' if o == pos else ''
                    print('  %#x  +%#06x  %016x%s%s' % (start + o, o - lo, v, tag, mark))
                pos = data.find(needle, pos + 8)


def is_call_before(lib, v):
    """L'istruzione prima di v e' un BL o un BLR?"""
    off = v - BASE - 4
    if off < 0 or off + 4 > len(lib):
        return False
    ins = struct.unpack_from('<I', lib, off)[0]
    return (ins & 0xfc000000) == 0x94000000 or (ins & 0xfffffc1f) == 0xd63f0000


def stack(path, start_hex, sp_hex, n=60):
    data = open(path, 'rb').read()
    start, sp = int(start_hex, 16), int(sp_hex, 16)
    so = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..',
                      'recon', 'ext', 'ww431', 'libcocos2dcpp.so')
    lib = open(so, 'rb').read()
    found = 0
    for o in range(max(0, sp - start), len(data) - 8, 8):
        v = struct.unpack_from('<Q', data, o)[0]
        if in_lib(v) and is_call_before(lib, v):
            print('  sp+%#06x  ritorno a Ghidra %#x' % (start + o - sp, ghidra(v)))
            found += 1
            if found >= n:
                break


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'regs':
        regs(sys.argv[2], sys.argv[3:])
    elif cmd == 'stack':
        stack(*sys.argv[2:5], n=int(sys.argv[5]) if len(sys.argv) > 5 else 60)
