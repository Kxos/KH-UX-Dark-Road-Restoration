# Stringhe referenziate dalle funzioni di un intervallo (es. tutti i metodi di una scena).
# @runtime Jython
# Argomenti: <file di uscita> <da esadecimale> <a esadecimale>
args = list(getScriptArgs())
out = open(args[0], 'w')
lo, hi = toAddr(int(args[1], 16)), toAddr(int(args[2], 16))
fm = currentProgram.getFunctionManager()
listing = currentProgram.getListing()
rm = currentProgram.getReferenceManager()
for f in fm.getFunctions(lo, True):
    if f.getEntryPoint().compareTo(hi) > 0:
        break
    seen = []
    for ins in listing.getInstructions(f.getBody(), True):
        for r in ins.getReferencesFrom():
            d = listing.getDataAt(r.getToAddress())
            if d is not None and d.hasStringValue():
                s = d.getValue()
                if s not in seen:
                    seen.append(s)
    if seen:
        out.write('%s %s: %s\n' % (f.getEntryPoint(), f.getName(), ' | '.join([x.encode('utf-8') for x in seen])))
out.close()
