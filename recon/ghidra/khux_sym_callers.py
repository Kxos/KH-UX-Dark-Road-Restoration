# Simboli il cui nome contiene una delle sottostringhe date e le funzioni che li chiamano
# (utile per le librerie linkate staticamente con i simboli esportati, es. Photon ExitGames).
# @runtime Jython
# Argomenti: <file di uscita> <sottostringa> ...
args = list(getScriptArgs())
out = open(args[0], 'w')
st = currentProgram.getSymbolTable()
fm = currentProgram.getFunctionManager()
rm = currentProgram.getReferenceManager()
for sym in st.getAllSymbols(True):
    n = sym.getName(True)
    if not any(s in n for s in args[1:]):
        continue
    callers = set()
    for r in rm.getReferencesTo(sym.getAddress()):
        f = fm.getFunctionContaining(r.getFromAddress())
        callers.add('%s@%s' % (f.getName(), f.getEntryPoint()) if f else str(r.getFromAddress()))
    out.write('%s %s <- %s\n' % (sym.getAddress(), n, ', '.join(sorted(callers))))
out.close()
