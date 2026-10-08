# Disassemblato LINEARE di un intervallo: un'istruzione ogni 4 byte, senza seguire i
# salti. Serve dentro i rami raggiunti solo da tabelle di salto (il dispatcher delle
# azioni FUN_007c3204), che khux_listing.py, seguendo il flusso, salta.
# @runtime Jython
# Argomenti: <file di uscita> <inizio esadecimale> <fine esadecimale>
args = getScriptArgs()
out = open(args[0], 'w')
af = currentProgram.getAddressFactory()
start = af.getAddress(args[1])
end = af.getAddress(args[2])
listing = currentProgram.getListing()
addr = start
while addr.compareTo(end) < 0:
    ins = listing.getInstructionAt(addr)
    if ins is None:
        disassemble(addr)          # in memoria; con -readOnly il progetto non cambia
        ins = listing.getInstructionAt(addr)
    out.write('%s  %s\n' % (addr, ins if ins is not None else '??'))
    addr = addr.add(4)
out.close()
