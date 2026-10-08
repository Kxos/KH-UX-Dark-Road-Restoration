"""Schemi delle risposte in blocco, per molte azioni alla volta.

Ogni giro sul banco scopre una sola API; qui si preparano in anticipo gli schemi
delle azioni che il client chiedera'. Due passi:

  plan:  per ogni azione, il ramo del dispatcher (come action_case.py) e le
         funzioni chiamate (parser candidati). Scrive il piano JSON e stampa gli
         indirizzi Ghidra da decompilare (recon/ghidra/decomp.ps1).
  merge: dai decompilati (uno o piu' file .c) gli schemi dei parser
         (response_schema.analyze), con i sotto-parser innestati sotto il loro
         percorso; stampa gli indirizzi dei sotto-parser ancora da decompilare e
         scrive le voci candidate per api_responses_ww431.json.

    python -I recon/tools/batch_schema.py plan <so> <linear.txt> <server_api.json> <plan.json> (<id> ... | --missing <api_responses.json> [--method 0])
    python -I recon/tools/batch_schema.py merge <so> <plan.json> <out.json> <file.c> [...]

Le voci restano candidate: rami con condizioni sulla richiesta (es. azione 86 con
getDetail) vanno letti a mano con action_case.py.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from action_case import case_address, GETTER, SKIP   # noqa: E402
from codeindex import cstring                         # noqa: E402
from master_types import normalize                    # noqa: E402
from response_schema import analyze                   # noqa: E402
from vtables import Elf                               # noqa: E402


def branch(elf, lines, index, action, n=200):
    start = case_address(elf, action)
    idx = index[start]
    calls, keys, page = [], [], {}
    for l in lines[idx:idx + n]:
        ins = l[10:]
        m = re.match(r'adrp (x\d+),0x([0-9a-f]+)', ins)
        if m:
            page[m.group(1)] = int(m.group(2), 16)
        m = re.match(r'add (x\d+),(x\d+),#0x([0-9a-f]+)$', ins)
        if m and m.group(2) in page:
            s = cstring(elf, page[m.group(2)] + int(m.group(3), 16) - 0x100000)
            if s:
                keys.append(s)
        m = re.match(r'bl 0x([0-9a-f]+)', ins)
        if m:
            t = int(m.group(1), 16)
            if t != GETTER and t not in SKIP:
                calls.append('%08x' % t)
        if re.match(r'b 0x', ins):
            break
    return start, calls, keys


def plan(argv):
    so, linear, api, out = argv[:4]
    elf = Elf(so)
    lines = open(linear).read().splitlines()
    index = {int(l[:8], 16): i for i, l in enumerate(lines)}
    actions = json.load(open(api, encoding='utf-8'))['actions']
    rest = argv[4:]
    if rest and rest[0] == '--missing':
        have = json.load(open(rest[1], encoding='utf-8'))
        method = int(rest[3]) if len(rest) > 3 and rest[2] == '--method' else None
        done = {v['action'] for v in have.values() if isinstance(v, dict) and 'action' in v}
        ids = [i for i, a in enumerate(actions)
               if i and i not in done and a['path'] not in have and (method is None or a['method'] == method)]
    else:
        ids = [int(x) for x in rest]
    result, addrs = {}, set()
    for i in ids:
        try:
            start, calls, keys = branch(elf, lines, index, i)
        except (KeyError, StopIteration, ValueError):
            continue
        result[str(i)] = {'path': actions[i]['path'], 'method': actions[i]['method'],
                          'case': '%x' % start, 'calls': calls, 'keys': keys}
        addrs.update(calls)
    json.dump(result, open(out, 'w', encoding='utf-8'), indent=1)
    print(' '.join(sorted(addrs)))


def merge(argv):
    so, plan_path, out = argv[:3]
    elf = Elf(so)
    funcs = {}
    for path in argv[3:]:
        src = normalize(open(path, encoding='utf-8', errors='replace').read(), elf)
        for chunk in re.split(r'// ===== ', src)[1:]:
            funcs[chunk.split(' ', 1)[0]] = analyze(chunk)

    def fields(fn, prefix, seen):
        res, missing = {}, set()
        if fn not in funcs:
            return res, {fn[4:]}
        for k, t in funcs[fn].items():
            if k.startswith('@'):
                if k[1:] in seen:
                    continue
                sub, miss = fields(k[1:], (prefix + '.' if prefix else '') + t, seen | {k[1:]})
                res.update(sub)
                missing |= miss
            else:
                res[(prefix + '.' if prefix else '') + k] = t or 'object'
        return res, missing

    entries, todo = {}, set()
    for action, p in json.load(open(plan_path, encoding='utf-8')).items():
        all_fields, parsers = {}, []
        for c in p['calls']:
            fn = 'FUN_' + c
            f, miss = fields(fn, '', {fn})
            if f:
                parsers.append(fn)
                all_fields.update(f)
            todo |= miss
        entries[p['path']] = {'action': int(action), 'parsers': parsers,
                              'note': 'automatico (batch_schema.py), da verificare sul banco',
                              'fields': all_fields}
    json.dump(entries, open(out, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(' '.join(sorted(todo)))


if __name__ == '__main__':
    {'plan': plan, 'merge': merge}[sys.argv[1]](sys.argv[2:])
