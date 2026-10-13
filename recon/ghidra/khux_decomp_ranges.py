# Decompila tutte le funzioni di piu' intervalli in un solo avvio di Ghidra (finestre attorno ai
# caricatori dei layout, I-117: docs/notes/risorse_layout.md#jp-originali).
# Argomenti: <uscita> <da>-<a> ... (indirizzi Ghidra esadecimali)
# @runtime Jython
from ghidra.app.decompiler import DecompInterface
from ghidra.util.task import ConsoleTaskMonitor
args = list(getScriptArgs())
out = open(args[0], 'w')
fm = currentProgram.getFunctionManager()
dec = DecompInterface()
dec.openProgram(currentProgram)
seen = set()
for rg in args[1:]:
    a, b = rg.split('-')
    lo, hi = toAddr(int(a, 16)), toAddr(int(b, 16))
    for f in fm.getFunctions(lo, True):
        if f.getEntryPoint().compareTo(hi) > 0:
            break
        k = str(f.getEntryPoint())
        if k in seen:
            continue
        seen.add(k)
        r = dec.decompileFunction(f, 120, ConsoleTaskMonitor())
        out.write('// ===== %s @ %s\n' % (f.getName(), f.getEntryPoint()))
        out.write((r.getDecompiledFunction().getC().encode('utf-8') if r.getDecompiledFunction() else '// fallita') + '\n\n')
        out.flush()
out.close()
