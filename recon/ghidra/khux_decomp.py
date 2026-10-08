# Decompila le funzioni indicate e scrive il C in un file.
# @runtime Jython
# Argomenti: <file di uscita> <indirizzo esadecimale> ...
from ghidra.app.decompiler import DecompInterface
from ghidra.util.task import ConsoleTaskMonitor

args = getScriptArgs()
out = open(args[0], 'w')
ifc = DecompInterface()
ifc.openProgram(currentProgram)
af = currentProgram.getAddressFactory()
fm = currentProgram.getFunctionManager()
for a in args[1:]:
    addr = af.getAddress(a)
    f = fm.getFunctionAt(addr) or fm.getFunctionContaining(addr)
    if f is None:
        out.write('// nessuna funzione a %s\n\n' % a)
        continue
    r = ifc.decompileFunction(f, 120, ConsoleTaskMonitor())
    out.write('// ===== %s @ %s\n' % (f.getName(), f.getEntryPoint()))
    if r.decompileCompleted():
        out.write(r.getDecompiledFunction().getC().encode('utf-8'))
    else:
        out.write('// decompilazione fallita: %s\n' % r.getErrorMessage())
    out.write('\n\n')
out.close()
