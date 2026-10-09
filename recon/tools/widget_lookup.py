"""Nomi di widget cercati da una funzione, ricostruiti dal C decompilato (khux_decomp.py).

Il compilatore costruisce i nomi come stringhe corte di libc++ sullo stack: primo byte =
lunghezza*2, poi i caratteri, scritti byte per byte (local_X[i] = 0x54), a pezzi di
stringhe del binario (s_Nome_<ind>[k], (undefined7)s_Nome._a_b_, SUB81(s_Nome._a_8_,k),
*(undefined8 *)(local_X + n) = s_Nome._a_8_) o con costanti (uStack_X = 0x6f6c). Qui si
simulano queste scritture: le variabili local_X/uStack_X/acStack_X/auStack_X/cStack_X
stanno all'indirizzo -X. A ogni chiamata con argomento &V o V si decodifica la stringa
corta all'indirizzo di V; si stampano chiamata e nome.

    python -I recon/tools/widget_lookup.py <libcocos2dcpp.so> <file.c> [funzione ...]

Le funzioni che contano: FUN_006e0e2c (figlio per nome, ricorsivo), FUN_006e6e6c (testo
di un figlio), thunk_FUN_006e0e2c. Senza elenco stampa tutte le chiamate.
"""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
lib = open(sys.argv[1], 'rb').read()
text = open(sys.argv[2], encoding='utf-8', errors='replace').read()
only = set(sys.argv[3:])

VAR = r'(?:local|uStack|acStack|auStack|cStack|bStack|sStack|lStack|iStack|pcStack|puStack)_([0-9a-f]+)'


def sdata(addr_hex):
    fo = int(addr_hex, 16) - 0x100000
    return lib[fo:fo + 256]


def string_bytes(expr):
    """s_Name_ADDR._a_b_ -> bytes a..a+b ; s_Name_ADDR[k] -> 1 byte ; s_Name_ADDR -> whole."""
    m = re.fullmatch(r's_\w+?_([0-9a-f]{8})\._(\d+)_(\d+)_', expr)
    if m:
        d = sdata(m.group(1)); a, b = int(m.group(2)), int(m.group(3))
        return d[a:a + b]
    m = re.fullmatch(r's_\w+?_([0-9a-f]{8})\[(0x[0-9a-f]+|\d+)\]', expr)
    if m:
        return sdata(m.group(1))[int(m.group(2), 0):][:1]
    return None


def value_bytes(rhs):
    rhs = rhs.strip()
    rhs = re.sub(r'^\((?:undefined\d?|char|byte|uint|int|ulong|long|void \*|undefined \*)\)\s*', '', rhs)
    m = re.fullmatch(r'\((undefined(\d))\)(.+)', rhs)
    if m:
        b = value_bytes(m.group(3))
        return b[:int(m.group(2))] if b is not None else None
    m = re.fullmatch(r'SUB(\d)(\d)\((.+),(\d+)\)', rhs)
    if m:
        b = value_bytes(m.group(3))
        k, n = int(m.group(4)), int(m.group(2))
        return b[k:k + n] if b is not None else None
    b = string_bytes(rhs)
    if b is not None:
        return b
    m = re.fullmatch(r'(0x[0-9a-f]+|\d+)', rhs)
    if m:
        v = int(m.group(1), 0)
        n = max(1, (v.bit_length() + 7) // 8)
        return v.to_bytes(n, 'little')
    m = re.fullmatch(r"'(.)'", rhs)
    if m:
        return m.group(1).encode()
    return None


def decode(mem, addr):
    b0 = mem.get(addr)
    if b0 is None or b0 & 1 or b0 >> 1 == 0 or b0 >> 1 > 22:
        return None
    n = b0 >> 1
    out = bytes(mem.get(addr + 1 + i, 0) for i in range(n))
    if all(32 < c < 127 for c in out):
        return out.decode()
    return None


for block in re.split(r'^// ===== ', text, flags=re.M)[1:]:
    head = block.split('\n', 1)[0]
    mem = {}
    found = []
    for line in block.split('\n'):
        s = line.strip()
        # writes
        m = re.match(r'\*\((?:undefined\d?|ulong|long) \*\)\(' + VAR + r' \+ (0x[0-9a-f]+|\d+)\) = (.+);$', s)
        if m:
            b = value_bytes(m.group(3))
            if b:
                base = -int(m.group(1), 16) + int(m.group(2), 0)
                for i, c in enumerate(b):
                    mem[base + i] = c
            continue
        m = re.match(VAR + r'(?:\[(0x[0-9a-f]+|\d+)\])?(?:\._(\d+)_(\d+)_)? = (.+);$', s)
        if m:
            b = value_bytes(m.group(5))
            if b:
                base = -int(m.group(1), 16) + int(m.group(2) or '0', 0) + int(m.group(3) or '0')
                for i, c in enumerate(b):
                    mem[base + i] = c
            continue
        # calls
        for cm in re.finditer(r'((?:thunk_)?FUN_[0-9a-f]+)\(([^;]*)\)', s):
            fn = cm.group(1)
            if only and fn not in only:
                continue
            for am in re.finditer(r'&?' + VAR + r'\b', cm.group(2)):
                name = decode(mem, -int(am.group(1), 16))
                if name and (fn, name) not in found:
                    found.append((fn, name))
    print('==', head)
    for fn, name in found:
        print('   %-22s %s' % (fn, name))
