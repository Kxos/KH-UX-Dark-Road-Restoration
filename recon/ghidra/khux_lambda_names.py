# Nome RTTI delle lambda / classi che contengono una funzione: per ogni riferimento DATA alla
# funzione (voce di vtable) prova gli slot tipici di std::__function::__func (operator() a
# vptr+0x30) e di vtable generiche, risale a vptr-8 = typeinfo e stampa il nome mangled.
# @runtime Jython
# Argomenti: <file di uscita> <indirizzo esadecimale> ...
args = list(getScriptArgs())
out = open(args[0], 'w')
af = currentProgram.getAddressFactory()
mem = currentProgram.getMemory()
rm = currentProgram.getReferenceManager()


def cstr(a):
    s = []
    for i in range(400):
        b = mem.getByte(a.add(i)) & 0xff
        if b == 0:
            break
        s.append(chr(b))
    return ''.join(s)


def name_at_vptr(vptr):
    try:
        ti = toAddr(mem.getLong(vptr.subtract(8)) & 0xffffffffffffffff)
        nm = toAddr(mem.getLong(ti.add(8)) & 0xffffffffffffffff)
        s = cstr(nm)
        if len(s) > 3 and all(32 <= ord(c) < 127 for c in s):
            return s
    except:
        pass
    return None


for a in args[1:]:
    addr = af.getAddress(a)
    found = False
    for r in rm.getReferencesTo(addr):
        if not r.getReferenceType().isData():
            continue
        src = r.getFromAddress()
        if not mem.getBlock(src) or mem.getBlock(src).isExecute():
            continue
        # scorri all'indietro fino a 400 slot cercando l'offset-to-top 0 seguito da typeinfo
        for k in range(0, 400):
            vptr = src.subtract(8 * k)
            try:
                top = mem.getLong(vptr.subtract(16))
            except:
                break
            if top != 0:
                continue
            n = name_at_vptr(vptr)
            if n:
                out.write('%s slot=%s+0x%x %s\n' % (a, vptr, 8 * k, n))
                found = True
                break
    if not found:
        out.write('%s ?\n' % a)
out.close()
