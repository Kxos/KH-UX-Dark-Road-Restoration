"""Schema JSON di una risposta di gioco, dai parser decompilati.

I parser delle risposte usano lo stesso getter dei master, FUN_0071f8ec(valore,
"chiave"), e gli stessi controlli dei flag rapidjson (valore da 0x14 byte, flag a
+0x10). Questo script segue le variabili da un getter all'altro e ricostruisce i
percorsi annidati, con il tipo di ogni foglia:

    +0x11 bit 2 int | bit 3 uint | bit 4 int64 | bit 5 uint64 | +0x12 bit 4 string
    +0x10 == 3 object | == 4 array | (flag >> 8 & 1) bool (kTrue = 0x102)
    stringa passata a FUN_007197ec -> datetime "YYYY-MM-DD HH:MM:SS"

Gli elementi di un array si riconoscono da `*arr + i * 0x14` (passo di un valore)
e compaiono come `percorso[]`. Ogni campo letto e' obbligatorio, come per i master.

Ingresso: decompilato di khux_decomp.py (resta locale). Le chiavi passate come
parametro si sostituiscono con --param, es. --param FUN_0078ade0:param_4=userData

    python -I recon/tools/response_schema.py <file.c> <libcocos2dcpp.so> [--param F:p=k ...]
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from master_types import normalize   # noqa: E402
from vtables import Elf              # noqa: E402

GET = re.compile(r'(\w+) = (?:\([^()]*\)\s*)?FUN_0071f8ec\((\w+),\s*"(\w+)"\s*\)')
ELEM = re.compile(r'(\w+) = (?:\([^()]*\)\s*)?\*(\w+) \+ [^;]*')
CHECKS = [
    (r'\((?:\(long\))?%s \+ 0x11\) >> 2 & 1', 'int'),
    (r'\((?:\(long\))?%s \+ 0x11\) >> 3 & 1', 'uint'),
    (r'\((?:\(long\))?%s \+ 0x11\) >> 4 & 1', 'int64'),
    (r'\((?:\(long\))?%s \+ 0x11\) >> 5 & 1', 'uint64'),
    (r'\((?:\(long\))?%s \+ 0x12\) >> 4 & 1', 'string'),
    (r'\*\(u?int \*\)\((?:\(long\))?%s \+ 0x10\) >> 8 & 1', 'bool'),
    (r'\*\(int \*\)\((?:\(long\))?%s \+ 0x10\) == 3', 'object'),
    (r'\(int\)%s\[2\] == 3', 'object'),
    (r'\*\(int \*\)\((?:\(long\))?%s \+ 0x10\) == 4', 'array'),
    (r'\(int\)%s\[2\] == 4', 'array'),
]


def analyze(body):
    paths = {'param_2': ''}
    out = {}
    events = sorted([(m.start(), 'get', m) for m in GET.finditer(body)]
                    + [(m.start(), 'elem', m) for m in ELEM.finditer(body)], key=lambda e: e[0])
    for idx, (pos, kind, m) in enumerate(events):
        if kind == 'elem':
            var, arr = m.group(1), m.group(2)
            if arr in paths and out.get(paths[arr]) == 'array':
                paths[var] = paths[arr] + '[]'
            continue
        var, parent, key = m.groups()
        if parent not in paths:
            continue
        path = (paths[parent] + '.' if paths[parent] else '') + key
        paths[var] = path
        # fino alla prossima riassegnazione della stessa variabile
        end = len(body)
        for p2, k2, m2 in events[idx + 1:]:
            if m2.group(1) == var:
                end = p2
                break
        seg = body[m.end():end]
        ty = None
        for pat, t in CHECKS:
            hit = re.search(pat % re.escape(var), seg)
            if hit and (ty is None or hit.start() < ty[1]):
                ty = (t, hit.start())
        t = ty[0] if ty else None
        if t == 'string' and re.search(r'FUN_007197ec\([^;]*\*\w*%s' % re.escape(var), seg[:600]):
            t = 'datetime'
        if t or path not in out:
            out[path] = t or out.get(path)
    # sotto-parser: funzioni chiamate passando un valore JSON di cui si conosce il
    # percorso. Vanno decompilate a parte e i loro campi aggiunti sotto quel percorso.
    for m in re.finditer(r'(FUN_[0-9a-f]{8})\(&?\w+,\s*(\w+)\)', body):
        fn, var = m.groups()
        if var in paths and var != 'param_2' and fn != 'FUN_0071f8ec':
            out['@' + fn] = paths[var]
    return out


def main():
    src_path, so = sys.argv[1:3]
    params = {}
    args = sys.argv[3:]
    while args:
        if args[0] == '--param':
            fn, rest = args[1].split(':', 1)
            p, k = rest.split('=', 1)
            params.setdefault(fn, []).append((p, k))
            args = args[2:]
        else:
            args = args[1:]
    src = normalize(open(src_path, encoding='utf-8', errors='replace').read(), Elf(so))
    result = {}
    for chunk in re.split(r'// ===== ', src)[1:]:
        name = chunk.split(' ', 1)[0]
        for p, k in params.get(name, []):
            chunk = re.sub(r'FUN_0071f8ec\(param_2,\s*%s\)' % p, 'FUN_0071f8ec(param_2,"%s")' % k, chunk)
        result[name] = analyze(chunk)
    json.dump(result, sys.stdout, indent=1)
    print()


if __name__ == '__main__':
    main()
