# KHUX - individuazione del livello API per xref sulle stringhe
#
# Il binario WW 4.3.1 e' in gran parte strippato: 4.882 funzioni con nome su 97.879,
# e sono quasi tutte librerie. APIManager e master:: non compaiono tra le funzioni:
# affioravano solo come tipi di parametro dentro firme template.
#
# Quindi non si cerca per nome. Si parte dalle stringhe di protocollo, che nel binario
# ci sono, si risale ai riferimenti, e si decompilano le funzioni che le usano.
#
# Rilancio rapido su un progetto gia' analizzato (minuti, niente ri-analisi):
#   analyzeHeadless <proj> khux-ww431 -process libcocos2dcpp.so -noanalysis \
#       -scriptPath recon/ghidra -postScript khux_apixref.py <outdir>
#
# @category KHUX
# @runtime Jython

import json
import os
import re

from ghidra.app.decompiler import DecompInterface
from ghidra.util.task import ConsoleTaskMonitor


# Ancore: stringhe del protocollo confermate presenti nel binario.
ANCHORS = [
    'sharedSecurityKey',
    'X-HTTP-USER-TOKEN',
    'accessToken',
    'session_id',
    'Authorization',
    'Content-Type',
    'X-Sqex-Hole-Nsid',
    'application/json',
    'https://',
    'http://',
    'sqex-bridge',
    'kingdomhearts',
    'gzip',
]

DECOMP_TIMEOUT = 120
MAX_STR = 300


def out_path(outdir, *parts):
    p = os.path.join(outdir, *parts)
    d = os.path.dirname(p)
    if d and not os.path.isdir(d):
        os.makedirs(d)
    return p


def safe(name):
    return re.sub(r'[^A-Za-z0-9_.-]', '_', name)[:120]


# ---------------------------------------------------------------------------
# Lettura stringhe direttamente dalla memoria
#
# Ghidra non ha definito queste aree come dati stringa, quindi getDataAt() non
# restituisce nulla: la versione precedente dello script falliva proprio qui.
# Leggiamo i byte e decodifichiamo a mano fino al terminatore.
# ---------------------------------------------------------------------------

def read_cstring(mem, addr, limit=MAX_STR):
    # I riferimenti possono puntare a registri o allo stack (Stack[-0x40]), non solo
    # alla memoria: quelli vanno scartati prima di toccarli.
    try:
        if addr is None or not addr.isMemoryAddress():
            return None
    except:
        return None
    out = []
    # except nudo di proposito: in Jython le eccezioni Java non derivano da
    # Exception di Python, quindi "except Exception" non le intercetta.
    try:
        for i in range(limit):
            b = mem.getByte(addr.add(i)) & 0xFF
            if b == 0:
                break
            if b < 0x20 or b > 0x7E:
                return None          # non e' testo stampabile
            out.append(chr(b))
    except:
        return None
    s = ''.join(out)
    return s if len(s) >= 2 else None


def find_all(mem, needle, monitor, cap=400):
    """Tutti gli indirizzi in cui compare `needle`."""
    hits = []
    pattern = [ord(c) for c in needle]
    # Jython: serve un array di byte con segno
    arr = [(p - 256 if p > 127 else p) for p in pattern]
    import jarray
    barr = jarray.array(arr, 'b')
    addr = mem.getMinAddress()
    end = mem.getMaxAddress()
    while addr is not None and len(hits) < cap:
        found = mem.findBytes(addr, end, barr, None, True, monitor)
        if found is None:
            break
        hits.append(found)
        try:
            addr = found.add(1)
        except Exception:
            break
    return hits


# ---------------------------------------------------------------------------

def strings_in_function(func, mem):
    """Stringhe raggiunte dalla funzione, leggendo la memoria agli indirizzi puntati."""
    found = set()
    listing = currentProgram.getListing()
    try:
        for instr in listing.getInstructions(func.getBody(), True):
            for ref in instr.getReferencesFrom():
                try:
                    s = read_cstring(mem, ref.getToAddress())
                except:
                    continue
                if s:
                    found.add(s)
    except:
        pass
    return sorted(found)


def main():
    args = getScriptArgs()
    outdir = args[0] if args else 'ghidra-out'
    if not os.path.isdir(outdir):
        os.makedirs(outdir)

    monitor = ConsoleTaskMonitor()
    mem = currentProgram.getMemory()
    refmgr = currentProgram.getReferenceManager()
    fm = currentProgram.getFunctionManager()

    print('[khux] programma: %s' % currentProgram.getName())

    # 1. Ancore -> indirizzi -> funzioni che le referenziano
    hits_per_anchor = {}
    targets = {}          # funzione -> set(ancore che la raggiungono)
    for anchor in ANCHORS:
        addrs = find_all(mem, anchor, monitor)
        hits_per_anchor[anchor] = len(addrs)
        nfun = 0
        for a in addrs:
            for ref in refmgr.getReferencesTo(a):
                f = fm.getFunctionContaining(ref.getFromAddress())
                if f is not None:
                    targets.setdefault(f.getEntryPoint().toString(), set()).add(anchor)
                    nfun += 1
        print('[khux] %-20s %4d occorrenze, %3d riferimenti da funzioni'
              % (anchor, len(addrs), nfun))

    print('[khux] funzioni candidate del livello API: %d' % len(targets))

    # 2. Decompila le candidate e raccogli le loro stringhe
    di = DecompInterface()
    di.openProgram(currentProgram)
    report = {}
    try:
        for entry, anchors in sorted(targets.items()):
            addr = currentProgram.getAddressFactory().getAddress(entry)
            func = fm.getFunctionAt(addr)
            if func is None:
                continue
            name = func.getName()
            strs = strings_in_function(func, mem)
            report[entry] = {
                'name': name,
                'anchors': sorted(anchors),
                'strings': strs[:120],
            }
            res = di.decompileFunction(func, DECOMP_TIMEOUT, monitor)
            if res is not None and res.decompileCompleted():
                p = out_path(outdir, 'decomp', '%s_%s.c' % (entry, safe(name)))
                fh = open(p, 'w')
                try:
                    fh.write(res.getDecompiledFunction().getC())
                finally:
                    fh.close()
    finally:
        di.dispose()

    # 3. Output
    fh = open(out_path(outdir, 'api_xref.json'), 'w')
    try:
        json.dump(report, fh, indent=2, sort_keys=True)
    finally:
        fh.close()

    # Le stringhe che contano: host, percorsi, chiavi
    probe = re.compile(r'(https?://|[a-z0-9-]+\.(com|jp|net)\b|^/[a-z]|key|token'
                       r'|session|api|auth|encrypt)', re.I)
    hot = set()
    for v in report.values():
        for s in v['strings']:
            if probe.search(s):
                hot.add(s)
    fh = open(out_path(outdir, 'api_candidates.txt'), 'w')
    try:
        for s in sorted(hot):
            fh.write('%s\n' % s)
    finally:
        fh.close()

    summary = {
        'program': currentProgram.getName(),
        'anchor_hits': hits_per_anchor,
        'candidate_functions': len(report),
        'candidate_strings': len(hot),
    }
    fh = open(out_path(outdir, 'summary.json'), 'w')
    try:
        json.dump(summary, fh, indent=2, sort_keys=True)
    finally:
        fh.close()
    print('[khux] fatto: %s' % json.dumps(summary, sort_keys=True))


main()
