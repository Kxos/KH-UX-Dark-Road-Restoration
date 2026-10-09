# Limiti (inizio-fine) delle funzioni che contengono gli indirizzi dati, e le funzioni che
# chiamano direttamente (un livello), per func_strings.py.
# @runtime Jython
# Argomenti: <file di uscita> [chiamate] <indirizzo esadecimale> ...
args = list(getScriptArgs())
out = open(args[0], 'w')
follow = len(args) > 1 and args[1] == 'chiamate'
fm = currentProgram.getFunctionManager()
done = set()
todo = [a for a in args[1:] if a != 'chiamate']
for a in todo:
    f = fm.getFunctionContaining(toAddr(int(a, 16)))
    if f is None:
        continue
    fs = [f]
    if follow:
        fs += list(f.getCalledFunctions(monitor))
    for g in fs:
        b = g.getBody()
        k = '%x-%x' % (b.getMinAddress().getOffset(), b.getMaxAddress().getOffset() + 1)
        if k not in done and g.getName().startswith('FUN_00') and (g == f or 0xa00000 <= b.getMinAddress().getOffset() < 0xe00000):
            done.add(k)
            out.write('%s %s %s\n' % (k, g.getName(), 'radice' if g == f else ''))
out.close()
