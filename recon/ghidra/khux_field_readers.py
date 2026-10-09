# Chi legge un campo di un singleton: chiamate a <getter> seguite, entro N istruzioni,
# da un accesso [xN,#<offset>].
# @runtime Jython
# Argomenti: <file di uscita> <getter esadecimale> <offset esadecimale> [N=8]
args = list(getScriptArgs())
out = open(args[0], 'w')
getter = toAddr(int(args[1], 16))
needle = '#0x%x]' % int(args[2], 16)
depth = int(args[3]) if len(args) > 3 else 8
listing = currentProgram.getListing()
fm = currentProgram.getFunctionManager()
for ref in getReferencesTo(getter):
    if not ref.getReferenceType().isCall():
        continue
    ins = listing.getInstructionAt(ref.getFromAddress())
    for i in range(depth):
        ins = ins.getNext() if ins else None
        if ins is None:
            break
        if needle in str(ins):
            f = fm.getFunctionContaining(ins.getAddress())
            out.write('%s %s  %s\n' % (ins.getAddress(), f.getName() if f else '?', ins))
            break
out.close()
