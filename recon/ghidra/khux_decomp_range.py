# Decompila tutte le funzioni in un intervallo.
# @runtime Jython
# Argomenti: <file di uscita> <da> <a>
from ghidra.app.decompiler import DecompInterface
from ghidra.util.task import ConsoleTaskMonitor
args = list(getScriptArgs())
out = open(args[0], 'w')
lo, hi = toAddr(int(args[1], 16)), toAddr(int(args[2], 16))
fm = currentProgram.getFunctionManager()
dec = DecompInterface()
dec.openProgram(currentProgram)
for f in fm.getFunctions(lo, True):
    if f.getEntryPoint().compareTo(hi) > 0:
        break
    r = dec.decompileFunction(f, 300, ConsoleTaskMonitor())
    out.write('// ===== %s @ %s\n' % (f.getName(), f.getEntryPoint()))
    out.write((r.getDecompiledFunction().getC() if r.getDecompiledFunction() else '// fallita') + '\n\n')
out.close()
