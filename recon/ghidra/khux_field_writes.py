# Istruzioni che accedono a [xN,#<offset>] in un intervallo di indirizzi (scritture: str*).
# @runtime Jython
# Argomenti: <file di uscita> <da esadecimale> <a esadecimale> <offset esadecimale> [tutte]
args = list(getScriptArgs())
out = open(args[0], 'w')
lo, hi = toAddr(int(args[1], 16)), toAddr(int(args[2], 16))
needle = '#0x%x]' % int(args[3], 16)
only_str = len(args) < 5
fm = currentProgram.getFunctionManager()
it = currentProgram.getListing().getInstructions(lo, True)
while it.hasNext():
    ins = it.next()
    if ins.getAddress().compareTo(hi) > 0:
        break
    s = str(ins)
    if needle in s and (not only_str or s.startswith('st')):
        f = fm.getFunctionContaining(ins.getAddress())
        out.write('%s  %-40s %s\n' % (ins.getAddress(), s, f.getName() if f else '-'))
out.close()
