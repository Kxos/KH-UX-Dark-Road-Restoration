# Decompila la funzione che contiene un indirizzo anche quando Ghidra non ne ha una: la
# crea (solo in memoria, il progetto e' -readOnly) risalendo al prologo piu' vicino.
# @runtime Jython
# Argomenti: <file di uscita> <indirizzo esadecimale> ...
from ghidra.app.decompiler import DecompInterface
from ghidra.app.cmd.function import CreateFunctionCmd
from ghidra.util.task import ConsoleTaskMonitor

args = list(getScriptArgs())
out = open(args[0], 'w')
af = currentProgram.getAddressFactory()
fm = currentProgram.getFunctionManager()
listing = currentProgram.getListing()
dec = DecompInterface()
dec.openProgram(currentProgram)
for a in args[1:]:
    addr = af.getAddress(a)
    f = fm.getFunctionContaining(addr)
    if f is None:
        # prologo arm64 tipico: stp x29, x30, [sp, #-N]! oppure sub sp, sp
        p = addr
        start = None
        for i in range(4000):
            p = p.subtract(4)
            ins = listing.getInstructionAt(p)
            if ins is None:
                disassemble(p)
                ins = listing.getInstructionAt(p)
            if ins is None:
                continue
            s = str(ins)
            if (s.startswith('stp x29,x30,[sp, #-') or s.startswith('sub sp,sp')) and \
                    fm.getFunctionContaining(p) is None:
                prev = listing.getInstructionAt(p.subtract(4))
                ps = str(prev) if prev else ''
                if ps.startswith('ret') or ps.startswith('b ') or prev is None or ps.startswith('br '):
                    start = p
                    break
        if start is not None:
            CreateFunctionCmd(start).applyTo(currentProgram)
            f = fm.getFunctionAt(start)
    if f is None:
        out.write('// nessuna funzione a %s\n\n' % a)
        continue
    r = dec.decompileFunction(f, 300, ConsoleTaskMonitor())
    out.write('// ===== %s @ %s (per %s)\n' % (f.getName(), f.getEntryPoint(), a))
    out.write((r.getDecompiledFunction().getC() if r.getDecompiledFunction() else '// decompilazione fallita') + '\n\n')
out.close()
