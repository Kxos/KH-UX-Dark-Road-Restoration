# Legge i puntatori a 8 byte agli indirizzi indicati e scrive la funzione puntata.
# @runtime Jython
# Argomenti: <file di uscita> <indirizzo esadecimale> ...
args = list(getScriptArgs())
out = open(args[0], 'w')
af = currentProgram.getAddressFactory()
fm = currentProgram.getFunctionManager()
mem = currentProgram.getMemory()
for a in args[1:]:
    addr = af.getAddress(a)
    for i in range(4):
        p = mem.getLong(addr.add(i * 8)) & 0xffffffffffffffff
        try:
            f = fm.getFunctionContaining(af.getAddress('%x' % p))
        except Exception:
            f = None
        out.write('%s+%d -> %x %s\n' % (a, i * 8, p, f.getName() if f else '-'))
out.close()
