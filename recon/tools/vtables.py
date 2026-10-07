"""Vtable e metodi virtuali di una classe C++, ricavati dall'RTTI di un ELF.

Perche' serve: `libcocos2dcpp.so` e' strippato al 95%, quindi i metodi non hanno
nome. Ma se una classe ha metodi virtuali ha anche RTTI, e il *typeinfo-name* e'
una stringa in `.rodata`: non si puo' strippare, perche' serve a runtime a
`dynamic_cast` e `typeid`. Da li' si risale a tutto il resto.

La catena, secondo l'ABI Itanium:

    "N6master5MedalE"            stringa del typeinfo-name in .rodata
       ^-- puntata da
    typeinfo.name                campo a offset +8 dell'oggetto typeinfo
       ^-- l'oggetto typeinfo e' puntato da
    vtable[1]                    slot a offset +8 della vtable
                                 (slot 0 = offset-to-top)
    vtable[2...]                 i puntatori ai metodi virtuali

In una libreria condivisa quegli slot sono a zero nel file: il valore vero sta
nell'addend di una rilocazione `R_AARCH64_RELATIVE`. Quindi non si leggono i
byte, si legge `.rela.dyn`.

Uso:
    python recon/tools/vtables.py <elf> [--ns master] [--json out.json]
    python recon/tools/vtables.py <elf> --name Medal --name Shop
"""

import argparse
import json
import re
import struct
import sys

R_AARCH64_RELATIVE = 1027
R_AARCH64_ABS64 = 257


class Elf(object):
    def __init__(self, path):
        self.data = open(path, 'rb').read()
        d = self.data
        if d[:4] != b'\x7fELF':
            raise ValueError('non e\' un ELF: %s' % path)
        if d[4] != 2:
            raise ValueError('serve un ELF64')
        (e_shoff,) = struct.unpack_from('<Q', d, 0x28)
        e_shentsize, e_shnum, e_shstrndx = struct.unpack_from('<HHH', d, 0x3a)
        self.sections = []
        for i in range(e_shnum):
            o = e_shoff + i * e_shentsize
            (name, typ, flags, addr, off, size, link, info, align,
             entsize) = struct.unpack_from('<IIQQQQIIQQ', d, o)
            self.sections.append(dict(name_off=name, typ=typ, addr=addr,
                                      off=off, size=size, entsize=entsize))
        stro = self.sections[e_shstrndx]['off']
        for s in self.sections:
            o = stro + s['name_off']
            s['name'] = d[o:d.index(b'\0', o)].decode('latin1')

    def section(self, name):
        for s in self.sections:
            if s['name'] == name:
                return s
        return None

    def vaddr_to_off(self, va):
        """Indirizzo virtuale -> offset nel file, usando le sezioni allocate."""
        for s in self.sections:
            if s['addr'] and s['addr'] <= va < s['addr'] + s['size']:
                if s['typ'] == 8:          # .bss: non ha byte nel file
                    return None
                return s['off'] + (va - s['addr'])
        return None

    def in_section(self, va, name):
        s = self.section(name)
        return s is not None and s['addr'] <= va < s['addr'] + s['size']

    def relocations(self):
        """{indirizzo scritto: valore} per le rilocazioni che sappiamo risolvere."""
        out = {}
        for sec in ('.rela.dyn', '.rela.plt'):
            s = self.section(sec)
            if s is None:
                continue
            d = self.data
            for o in range(s['off'], s['off'] + s['size'], 24):
                r_offset, r_info, r_addend = struct.unpack_from('<QQq', d, o)
                if (r_info & 0xffffffff) == R_AARCH64_RELATIVE:
                    out[r_offset] = r_addend
        return out

    def read_q(self, va):
        o = self.vaddr_to_off(va)
        if o is None or o + 8 > len(self.data):
            return None
        return struct.unpack_from('<Q', self.data, o)[0]


def typeinfo_name_strings(elf, ns):
    """{nome classe: indirizzo della stringa typeinfo-name} per il namespace dato.

    Il nome mangled di `ns::Classe` e' `N<len><ns><len><Classe>E`. Si richiede che
    la stringa *inizi* subito dopo un NUL e finisca con `E\\0`: senza questo si
    pescherebbero anche le istanziazioni di template come
    `St6vectorIN6master5MedalESaIS1_EE`, che contengono lo stesso testo.

    I delimitatori sono lookaround, non testo consumato. Consumarli costa una
    classe ogni volta che due typeinfo-name sono adiacenti in `.rodata`: il NUL
    finale dell'una e' il NUL iniziale dell'altra, e `finditer` non restituisce
    match sovrapposti. Era cosi' che spariva `master::Base`.
    """
    rod = elf.section('.rodata')
    if rod is None:
        return {}
    blob = elf.data[rod['off']:rod['off'] + rod['size']]
    prefix = ('N%d%s' % (len(ns), ns)).encode('latin1')
    pat = re.compile(rb'(?<=\0)' + re.escape(prefix) +
                     rb'(\d+)([A-Za-z0-9_]+)E(?=\0)')
    out = {}
    for m in pat.finditer(blob):
        ln = int(m.group(1))
        # La lunghezza dichiarata deve consumare esattamente il resto.
        if len(m.group(2)) != ln:
            continue
        out[m.group(2).decode('latin1')] = rod['addr'] + m.start()
    return out


def build_index(relocs):
    """valore -> [indirizzi che lo contengono], per risalire la catena."""
    idx = {}
    for addr, val in relocs.items():
        idx.setdefault(val, []).append(addr)
    return idx


def vtable_for(elf, idx, str_addr, max_methods=512):
    """typeinfo-name -> (indirizzo vtable, [metodi virtuali]).

    La stringa e' puntata dal campo `name` del typeinfo (offset +8), e l'oggetto
    typeinfo e' puntato dallo slot +8 della vtable. I metodi iniziano a +16.
    """
    results = []
    for name_field in idx.get(str_addr, []):
        ti = name_field - 8
        for ti_slot in idx.get(ti, []):
            vt = ti_slot - 8          # inizio vtable (slot 0 = offset-to-top)
            methods = []
            a = ti_slot + 8
            while len(methods) < max_methods:
                val = idx_value(elf, a)
                if val is None or not elf.in_section(val, '.text'):
                    break
                methods.append(val)
                a += 8
            if methods:
                results.append((vt, methods))
    if not results:
        return None, []
    # La vtable primaria e' quella con piu' metodi: le secondarie (ereditarieta'
    # multipla) condividono lo stesso typeinfo ma sono troncate.
    results.sort(key=lambda r: -len(r[1]))
    return results[0]


_RELOCS = {}


def idx_value(elf, addr):
    return _RELOCS.get(addr)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('elf')
    ap.add_argument('--ns', default='master', help='namespace (default: master)')
    ap.add_argument('--name', action='append', default=[],
                    help='limita a queste classi (ripetibile)')
    ap.add_argument('--json', help='scrive il risultato in JSON')
    args = ap.parse_args()

    elf = Elf(args.elf)
    global _RELOCS
    _RELOCS = elf.relocations()
    sys.stderr.write('[vtables] rilocazioni RELATIVE: %d\n' % len(_RELOCS))

    names = typeinfo_name_strings(elf, args.ns)
    sys.stderr.write('[vtables] classi %s:: con RTTI: %d\n' % (args.ns, len(names)))
    if args.name:
        wanted = set(args.name)
        names = dict((k, v) for k, v in names.items() if k in wanted)

    idx = build_index(_RELOCS)

    out = {}
    found = 0
    for cls in sorted(names):
        str_addr = names[cls]
        vt, methods = vtable_for(elf, idx, str_addr)
        out[cls] = {
            'typeinfo_name_addr': '%#x' % str_addr,
            'vtable': ('%#x' % vt) if vt else None,
            'methods': ['%#x' % m for m in methods],
        }
        if methods:
            found += 1
        print('%-24s vtable=%-12s metodi=%d'
              % (cls, ('%#x' % vt) if vt else '-', len(methods)))

    sys.stderr.write('[vtables] con vtable risolta: %d/%d\n' % (found, len(names)))
    if args.json:
        fh = open(args.json, 'w')
        try:
            json.dump(out, fh, indent=2, sort_keys=True)
        finally:
            fh.close()
        sys.stderr.write('[vtables] scritto %s\n' % args.json)


if __name__ == '__main__':
    main()
