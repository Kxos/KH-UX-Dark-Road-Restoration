# Riferimenti a uno o piu' indirizzi (chiamate, puntatori in vtable) con la funzione che li contiene.
# @runtime Jython
# Argomenti: <file di uscita> <indirizzo esadecimale> ...
args = list(getScriptArgs())
out = open(args[0], 'w')
af = currentProgram.getAddressFactory()
fm = currentProgram.getFunctionManager()
rm = currentProgram.getReferenceManager()
for a in args[1:]:
    addr = af.getAddress(a)
    for r in rm.getReferencesTo(addr):
        src = r.getFromAddress()
        f = fm.getFunctionContaining(src)
        out.write('%s <- %s %s %s\n' % (a, src, r.getReferenceType(), f.getName() if f else '-'))
out.close()
