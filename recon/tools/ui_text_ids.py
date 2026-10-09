"""Id dei testi text/ui/<id>.txt usati dal client, ricavati dal binario, contro quelli presenti.

    python -I recon/tools/ui_text_ids.py <libcocos2dcpp.so> <nomi.tsv> [uscita.tsv]

FUN_00719f18 (file 0x619f18) legge text/<cat>/<id>.txt: w0 = categoria (0 = ui), w1 = id.
Per ogni BL a quella funzione si cerca, nelle 12 istruzioni prima, il valore costante di w1
(movz/movn/movk, orr da wzr) e di w0. Gli id calcolati a runtime sfuggono.
Uscita: id, presente/manca, indirizzo Ghidra della chiamata.
"""
import re
import struct
import sys

lib = open(sys.argv[1], 'rb').read()
TARGET = 0x619f18
have = set()
for line in open(sys.argv[2], encoding='utf-8'):
    m = re.match(r'text/ui/(\d+)\.txt\t', line)
    if m:
        have.add(int(m.group(1)))


def reg_value(fo, reg):
    """Valore costante di w<reg> costruito nelle istruzioni prima di fo (o None)."""
    val, seen = None, False
    for k in range(1, 13):
        w = struct.unpack_from('<I', lib, fo - 4 * k)[0]
        rd = w & 31
        if rd != reg:
            continue
        op = w & 0x7f800000
        hw = (w >> 21) & 3
        imm = (w >> 5) & 0xffff
        if (w & 0x7f800000) == 0x72800000:          # movk
            val = (val or 0) | (imm << (16 * hw)) if val is not None else None
            if val is None:
                # movk prima del movz: raccolto, si completa piu' avanti
                pending = imm << (16 * hw)
                for k2 in range(k + 1, 13):
                    w2 = struct.unpack_from('<I', lib, fo - 4 * k2)[0]
                    if (w2 & 31) == reg and (w2 & 0x7f800000) == 0x52800000:
                        return (((w2 >> 5) & 0xffff) << (16 * ((w2 >> 21) & 3))) | pending
                return None
            continue
        if op == 0x52800000:                         # movz
            base = imm << (16 * hw)
            return base if val is None else base | val
        if op == 0x12800000:                         # movn
            return (~(imm << (16 * hw))) & 0xffffffff
        if (w & 0xffffffe0) == 0x2a1f03e0:          # mov wN, wzr (orr wN, wzr, wzr)
            return 0
        return None                                  # scritto in altro modo
    return None


rows = []
for fo in range(0, len(lib) - 4, 4):
    w = struct.unpack_from('<I', lib, fo)[0]
    if (w & 0xfc000000) != 0x94000000:
        continue
    off = ((w & 0x3ffffff) ^ 0x2000000) - 0x2000000
    if fo + off * 4 != TARGET:
        continue
    cat, tid = reg_value(fo, 0), reg_value(fo, 1)
    if cat == 0 and tid:
        rows.append((tid, fo + 0x100000))
ids = {}
for tid, at in rows:
    ids.setdefault(tid, []).append(at)
missing = sorted(t for t in ids if t not in have)
print('chiamate con id costante: %d, id distinti: %d, presenti: %d, mancanti: %d'
      % (len(rows), len(ids), len(ids) - len(missing), len(missing)))
if len(sys.argv) > 3:
    with open(sys.argv[3], 'w', encoding='utf-8') as fh:
        for t in sorted(ids):
            fh.write('%d\t%s\t%s\n' % (t, 'presente' if t in have else 'MANCA', ' '.join('%x' % a for a in ids[t])))
