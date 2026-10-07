"""Fase C — i campi delle tabelle `master::`, ricavati dal binario.

Il namespace `master::` e' lo schema dei dati di gioco: una classe C++ per
tabella, ciascuna con il proprio deserializzatore rapidjson. I nomi delle classi
si conoscevano gia'; i nomi dei *campi* no, perche' il binario e' strippato e i
metodi non hanno nome.

La catena che li recupera, tutta statica e senza disassemblatore:

1. **RTTI.** Ogni classe con metodi virtuali lascia in `.rodata` il proprio
   typeinfo-name (`N6master5MedalE`): non si puo' strippare, serve a runtime.
   Da li' `vtables.py` risale alla vtable (vedi la catena documentata la').

2. **Chi scrive la vtable e' un metodo della classe.** Un costruttore comincia
   installando il puntatore alla vtable nell'oggetto. Quindi le funzioni che
   *costruiscono* quell'indirizzo sono i costruttori e i distruttori di quella
   classe, e nessun'altra: e' un'attribuzione esatta, non un'euristica.

3. **Il deserializzatore e' il costruttore da JSON.** Confronta ogni chiave con
   una stringa letterale, quindi le stringhe che la funzione tocca *sono* i
   campi della tabella. `codeindex.py` le estrae seguendo le coppie ADRP/ADD.

Nota su un'ipotesi precedente: i campi si immaginavano in `snake_case`. Sono in
`camelCase` (`medalId`, `maxAttack`, `shuffleSkillGroupId`), quindi un filtro
tarato su snake_case li avrebbe persi quasi tutti.

Uso:
    python recon/tools/master_fields.py <elf> --out recon/out/master_fields.json
    python recon/tools/master_fields.py <elf> --only recon/out/master_removed_ww431_to_ww501.txt
"""

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from codeindex import (address_users, build_index, function_ranges,  # noqa
                       strings_of)
from vtables import Elf, build_index as reloc_index, typeinfo_name_strings, vtable_for  # noqa
import vtables  # noqa

# Un campo JSON: identificatore semplice, ne' percorso ne' format string.
FIELD = re.compile(r'^[A-Za-z][A-Za-z0-9_]{0,39}$')

# Rumore ricorrente: non sono campi, sono messaggi del runtime o tipi.
NOISE = set("""
basic_string vector map set pair allocator string char int bool float double
true false null nan inf NaN Infinity
""".split())


def is_field(s):
    return bool(FIELD.match(s)) and s not in NOISE


def main():
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('elf')
    ap.add_argument('--ns', default='master')
    ap.add_argument('--only', help='file con un nome di classe per riga')
    ap.add_argument('--out', help='JSON di uscita')
    ap.add_argument('--text', help='elenco leggibile di uscita')
    ap.add_argument('--min-fields', type=int, default=1,
                    help='sotto questa soglia la funzione non e\' un parser. '
                         'Resta 1 di proposito: le tabelle `*Misc` sono '
                         'coppie chiave/valore e hanno due soli campi')
    args = ap.parse_args()

    elf = Elf(args.elf)

    vtables._RELOCS = elf.relocations()
    sys.stderr.write('[master] rilocazioni RELATIVE: %d\n' % len(vtables._RELOCS))
    ridx = reloc_index(vtables._RELOCS)

    names = typeinfo_name_strings(elf, args.ns)
    sys.stderr.write('[master] classi %s:: con RTTI: %d\n' % (args.ns, len(names)))

    if args.only:
        wanted = set(l.strip() for l in open(args.only) if l.strip())
        missing = wanted - set(names)
        if missing:
            sys.stderr.write('[master] non trovate nel binario: %s\n'
                             % ', '.join(sorted(missing)))
        names = dict((k, v) for k, v in names.items() if k in wanted)

    ranges = function_ranges(elf)
    index = build_index(elf, ranges, verbose=True)

    users = address_users(index)

    out = {}
    for cls in sorted(names):
        vt, methods = vtable_for(elf, ridx, names[cls])
        entry = {
            'vtable': ('%#x' % vt) if vt else None,
            'vmethods': ['%#x' % m for m in methods],
            'parser': None,
            'fields': [],
            'other_strings': [],
            'class_functions': [],
        }
        out[cls] = entry
        if not vt:
            continue

        # Le funzioni della classe: quelle che installano la sua vtable.
        funcs = sorted(set(users.get(vt, []) + users.get(vt + 16, [])))
        entry['class_functions'] = ['%#x' % f for f in funcs]

        # Il parser e' quella con piu' stringhe-campo.
        best, best_fields, best_other = None, [], []
        for f in funcs:
            strs = strings_of(elf, index, f)
            fields = [s for s in strs if is_field(s)]
            if len(fields) > len(best_fields):
                best, best_fields = f, fields
                best_other = [s for s in strs if not is_field(s)]
        if best is not None and len(best_fields) >= args.min_fields:
            entry['parser'] = '%#x' % best
            entry['fields'] = best_fields
            entry['other_strings'] = best_other

    done = [c for c in out if out[c]['fields']]
    sys.stderr.write('[master] tabelle con campi estratti: %d/%d\n'
                     % (len(done), len(out)))
    total = sum(len(out[c]['fields']) for c in out)
    sys.stderr.write('[master] campi totali: %d\n' % total)

    for cls in sorted(out):
        e = out[cls]
        sys.stdout.write('%-24s %-12s campi=%-4d funzioni=%d\n'
                         % (cls, e['parser'] or '-', len(e['fields']),
                            len(e['class_functions'])))

    if args.out:
        fh = open(args.out, 'w')
        try:
            json.dump(out, fh, indent=2, sort_keys=True)
        finally:
            fh.close()
        sys.stderr.write('[master] scritto %s\n' % args.out)

    if args.text:
        fh = open(args.text, 'w')
        try:
            for cls in sorted(out):
                e = out[cls]
                fh.write('== %s (%d campi)\n' % (cls, len(e['fields'])))
                for f in e['fields']:
                    fh.write('   %s\n' % f)
                fh.write('\n')
        finally:
            fh.close()
        sys.stderr.write('[master] scritto %s\n' % args.text)


if __name__ == '__main__':
    main()
