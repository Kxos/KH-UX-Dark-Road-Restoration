# Disassemblato di un intervallo di indirizzi, per quando il decompilatore si arrende
# (per esempio sugli switch con tabella di salto non ricostruita).
# @runtime Jython
# Argomenti: <file di uscita> <inizio esadecimale> <numero di istruzioni>
args = getScriptArgs()
out = open(args[0], 'w')
addr = currentProgram.getAddressFactory().getAddress(args[1])
listing = currentProgram.getListing()
ins = listing.getInstructionAt(addr)
if ins is None:
    # rami raggiunti solo da una tabella di salto non ricostruita: li si
    # disassembla adesso (in memoria; con -readOnly il progetto non cambia)
    disassemble(addr)
    ins = listing.getInstructionAt(addr)
n = int(args[2])
while ins is not None and n > 0:
    out.write('%s  %s\n' % (ins.getAddress(), ins))
    ins = ins.getNext()
    n -= 1
out.close()
