"""Tipi dei campi delle tabelle master, dai lettori di riga decompilati.

Ogni tabella master ha un lettore di riga (il `parser` di master_fields_ww431.json)
che per ogni campo chiama il getter JSON `FUN_0071f8ec(riga, "nome")` e poi
controlla i flag del valore rapidjson. In questa build un valore e' lungo 0x14
byte e i flag stanno a +0x10, quindi:

    byte +0x11 bit 2  (0x400)     kIntFlag     -> int
    byte +0x11 bit 4  (0x1000)    kInt64Flag   -> int64
    byte +0x12 bit 4  (0x100000)  kStringFlag  -> string
    int  +0x10 == 4               kArrayType   -> array, con limite `n < N`

Un campo assente restituisce un valore nullo statico: il controllo fallisce, il
lettore restituisce null e la tabella intera va in errore 3. Quindi ogni campo e'
obbligatorio, e del tipo esatto.

Ingresso: il decompilato dei 106 lettori, prodotto in locale con
recon/ghidra/khux_decomp.py (opera derivata: non si versiona). Uscita: lo schema,
che invece si versiona come master_fields.

    python -I recon/tools/master_types.py <parsers.c> recon/out/master_fields_ww431.json \
        recon/out/master_types_ww431.json recon/ext/ww431/libcocos2dcpp.so
"""
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vtables import Elf          # noqa: E402
from codeindex import cstring    # noqa: E402

GET = re.compile(r'(\w+) = (?:\([^()]*\)\s*)?FUN_0071f8ec\(param_2,\s*"(\w+)"\s*\)')
CALL = re.compile(r'FUN_0071f8ec\(param_2,\s*"(\w+)"\s*\)')
CHECKS = [
    (r'\((?:\(long\))?%s \+ 0x11\) >> 2 & 1', 'int'),
    (r'\((?:\(long\))?%s \+ 0x11\) >> 3 & 1', 'uint'),
    (r'\((?:\(long\))?%s \+ 0x11\) >> 4 & 1', 'int64'),
    (r'\((?:\(long\))?%s \+ 0x11\) >> 5 & 1', 'uint64'),
    (r'\((?:\(long\))?%s \+ 0x11\) >> 1 & 1', 'double'),
    (r'\((?:\(long\))?%s \+ 0x12\) >> 4 & 1', 'string'),
    (r'\*\(int \*\)\((?:\(long\))?%s \+ 0x10\) == 4', 'array'),
    (r'\(int\)%s\[2\] == 4', 'array'),
]
STRNCPY = re.compile(r'strncpy\([^;]*?,\s*(0x[0-9a-f]+|\d+)\)')


def normalize(src, elf):
    """Toglie commenti e a capo, e risolve i nomi corti che Ghidra mostra come DAT_."""
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    src = re.sub(r'\n\s*', ' ', src)
    return re.sub(r'(?:&\s*DAT_|s_\w*?_)([0-9a-f]{8})\b',
                  lambda m: '"%s"' % cstring(elf, int(m.group(1), 16) - 0x100000), src)


def segment(items, i, same):
    """Da items[i] fino al prossimo elemento per cui same() e' falso (o vero)."""
    pos = items[i][0]
    for it in items[i + 1:]:
        if same(it):
            return pos, it[0]
    return pos, None


def table_types(body, order):
    types = {f: None for f in order}
    for m in CALL.finditer(body):
        types.setdefault(m.group(1), None)
    asg = [(m.start(), m.group(1), m.group(2)) for m in GET.finditer(body)]
    for i, (pos, var, fld) in enumerate(asg):
        _, end = segment(asg, i, lambda it: it[1] == var)
        seg = body[pos:end]
        for pat, ty in CHECKS:
            if re.search(pat % re.escape(var), seg):
                if ty == 'string':
                    m = STRNCPY.search(seg)
                    if m:
                        ty = 'string(%d)' % (int(m.group(1), 0) - 1)
                types[fld] = types[fld] or ty
                break
    # array: l'ultima lettura del campo e' quella che copia; li' c'e' il limite
    calls = [(m.start(), m.group(1)) for m in CALL.finditer(body)]
    for i, (pos, fld) in enumerate(calls):
        if types.get(fld) != 'array' or any(f == fld for _, f in calls[i + 1:]):
            continue
        _, end = segment(calls, i, lambda it: it[1] != fld)
        seg = body[pos:end]
        lim = re.search(r' < (0x[0-9a-f]+|\d+)\)', seg)
        if re.search(r'\+ 1\) >> 2 & 1', seg):
            el = 'int'
        elif re.search(r'\+ (?:2|0x12)\) >> 4 & 1', seg):
            m = STRNCPY.search(seg)
            el = 'string(%d)' % (int(m.group(1), 0) - 1) if m else 'string'
        elif re.search(r'\+ 1\) >> 4 & 1', seg):
            el = 'int64'
        else:
            el = '?'
        types[fld] = '%s[%s]' % (el, int(lim.group(1), 0) - 1 if lim else '?')
    return types


def main():
    parsers_c, fields_json, out_json, so = sys.argv[1:5]
    elf = Elf(so)
    fields = json.load(open(fields_json, encoding='utf-8'))
    by_addr = {'%08x' % (int(e['parser'], 16) + 0x100000): n
               for n, e in fields.items() if e.get('parser')}
    src = normalize(open(parsers_c, encoding='utf-8', errors='replace').read(), elf)
    out = {}
    for body in re.split(r'// ===== \S+ @ ', src)[1:]:
        name = by_addr.get(body[:8])
        if not name:
            continue
        types = table_types(body, fields[name]['fields'])
        # la chiave della risposta all'azione 27 e' il nome con l'iniziale minuscola
        out[name[0].lower() + name[1:]] = [[f, t] for f, t in types.items()]
    with open(out_json, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('{\n')
        rows = []
        for t in sorted(out):
            rows.append('  "%s": [\n%s\n  ]' % (t, ',\n'.join(
                '    ["%s", "%s"]' % (f, ty) for f, ty in out[t])))
        fh.write(',\n'.join(rows))
        fh.write('\n}\n')
    c = Counter(re.sub(r'\(\d+\)', '', ty or 'None') for v in out.values() for _, ty in v)
    print('%d tabelle, %d campi' % (len(out), sum(c.values())))
    for k, n in c.most_common():
        print('  %-14s %d' % (k, n))
    bad = [(t, f) for t, v in out.items() for f, ty in v if ty is None or '?' in ty]
    if bad:
        print('non risolti:', bad)


if __name__ == '__main__':
    main()
