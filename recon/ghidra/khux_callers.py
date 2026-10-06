# KHUX - risale il grafo delle chiamate da una funzione seme e cerca l'origine
# dell'host dell'API.
#
# L'host non e' una costante in nessun file dell'APK: arriva a runtime. Questo script
# parte dal parser dell'handshake (che legge nativeSessionId / sharedSecurityKey),
# risale ai chiamanti e raccoglie le loro stringhe, per trovare il punto in cui l'URL
# viene composto.
#
#   analyzeHeadless <proj> khux-ww431 -process libcocos2dcpp.so -noanalysis \
#       -scriptPath recon/ghidra -postScript khux_callers.py <outdir> <seed> <depth>
#
# @category KHUX
# @runtime Jython

import json
import os
import re

from ghidra.app.decompiler import DecompInterface
from ghidra.util.task import ConsoleTaskMonitor

MAX_STR = 300

# Stringhe che tradiscono la composizione di un URL o la lettura di un config.
EXTRA_ANCHORS = [
    '/native/', 'native/session', 'psg.', 'sqex-bridge.jp',
    'baseUrl', 'base_url', 'apiUrl', 'api_url', 'serverUrl', 'server_url',
    'endpoint', 'titleId', 'title_id', 'sqexId',
    'environment', 'production', 'staging',
    'config.json', 'setting', 'host',
    '%s://%s', '%s/%s',
]


def out_path(outdir, *parts):
    p = os.path.join(outdir, *parts)
    d = os.path.dirname(p)
    if d and not os.path.isdir(d):
        os.makedirs(d)
    return p


def safe(n):
    return re.sub(r'[^A-Za-z0-9_.-]', '_', n)[:110]


def read_cstring(mem, addr, limit=MAX_STR):
    try:
        if addr is None or not addr.isMemoryAddress():
            return None
    except:
        return None
    out = []
    try:
        for i in range(limit):
            b = mem.getByte(addr.add(i)) & 0xFF
            if b == 0:
                break
            if b < 0x20 or b > 0x7E:
                return None
            out.append(chr(b))
    except:
        return None
    s = ''.join(out)
    return s if len(s) >= 2 else None


def strings_in(func, mem):
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


def callers_of(func, fm, refmgr):
    out = set()
    try:
        for ref in refmgr.getReferencesTo(func.getEntryPoint()):
            c = fm.getFunctionContaining(ref.getFromAddress())
            if c is not None:
                out.add(c)
    except:
        pass
    return out


def find_all(mem, needle, monitor, cap=200):
    import jarray
    arr = [(ord(c) - 256 if ord(c) > 127 else ord(c)) for c in needle]
    barr = jarray.array(arr, 'b')
    hits, addr, end = [], mem.getMinAddress(), mem.getMaxAddress()
    while addr is not None and len(hits) < cap:
        f = mem.findBytes(addr, end, barr, None, True, monitor)
        if f is None:
            break
        hits.append(f)
        try:
            addr = f.add(1)
        except:
            break
    return hits


def main():
    args = getScriptArgs()
    outdir = args[0] if args else 'ghidra-out'
    # analyzeHeadless separa gli argomenti anche sulla virgola, quindi i semi possono
    # arrivare come argomenti distinti. La profondita' e' l'ultimo argomento se e' un
    # numero corto; tutto il resto sono indirizzi.
    rest = [a.strip() for a in args[1:] if a.strip()]
    depth = 3
    if rest and rest[-1].isdigit() and len(rest[-1]) <= 2:
        depth = int(rest[-1])
        rest = rest[:-1]
    seeds = []
    for r in rest:
        seeds.extend([x for x in r.split(',') if x])
    if not seeds:
        seeds = ['007bd5b8']
    if not os.path.isdir(outdir):
        os.makedirs(outdir)

    monitor = ConsoleTaskMonitor()
    mem = currentProgram.getMemory()
    fm = currentProgram.getFunctionManager()
    refmgr = currentProgram.getReferenceManager()
    af = currentProgram.getAddressFactory()
    di = DecompInterface()
    di.openProgram(currentProgram)

    # --- 1. risalita del grafo delle chiamate ------------------------------
    tree = {}
    seen = set()
    level = []
    for s in seeds:
        f = fm.getFunctionAt(af.getAddress(s.strip()))
        if f is not None:
            level.append(f)
            seen.add(f.getEntryPoint().toString())

    print('[khux] semi: %d' % len(level))
    for d in range(depth):
        nxt = []
        for f in level:
            for c in callers_of(f, fm, refmgr):
                ea = c.getEntryPoint().toString()
                strs = strings_in(c, mem)
                tree.setdefault(ea, {
                    'name': c.getName(),
                    'depth': d + 1,
                    'calls': f.getEntryPoint().toString(),
                    'strings': strs[:80],
                })
                if ea not in seen:
                    seen.add(ea)
                    nxt.append(c)
        print('[khux] livello %d: %d nuovi chiamanti' % (d + 1, len(nxt)))
        level = nxt
        if not level:
            break

    # decompila i chiamanti trovati
    for ea, info in tree.items():
        f = fm.getFunctionAt(af.getAddress(ea))
        if f is None:
            continue
        try:
            r = di.decompileFunction(f, 120, monitor)
            if r is not None and r.decompileCompleted():
                p = out_path(outdir, 'callers', '%s_%s.c' % (ea, safe(info['name'])))
                fh = open(p, 'w')
                try:
                    fh.write(r.getDecompiledFunction().getC())
                finally:
                    fh.close()
        except:
            pass

    # --- 2. ancore aggiuntive: dove si compone un URL ----------------------
    anchors = {}
    for a in EXTRA_ANCHORS:
        addrs = find_all(mem, a, monitor)
        if not addrs:
            continue
        funcs = set()
        for ad in addrs:
            for ref in refmgr.getReferencesTo(ad):
                c = fm.getFunctionContaining(ref.getFromAddress())
                if c is not None:
                    funcs.add(c.getEntryPoint().toString())
        anchors[a] = {'hits': len(addrs), 'funcs': sorted(funcs)}
        print('[khux] %-18s %3d occorrenze, %2d funzioni' % (a, len(addrs), len(funcs)))
        for ea in sorted(funcs):
            f = fm.getFunctionAt(af.getAddress(ea))
            if f is None:
                continue
            tree.setdefault(ea, {'name': f.getName(), 'depth': -1,
                                 'calls': None, 'strings': strings_in(f, mem)[:80]})
            try:
                r = di.decompileFunction(f, 120, monitor)
                if r is not None and r.decompileCompleted():
                    p = out_path(outdir, 'urlbuild', '%s_%s.c' % (ea, safe(f.getName())))
                    fh = open(p, 'w')
                    try:
                        fh.write(r.getDecompiledFunction().getC())
                    finally:
                        fh.close()
            except:
                pass

    di.dispose()

    fh = open(out_path(outdir, 'callers.json'), 'w')
    try:
        json.dump({'tree': tree, 'anchors': anchors}, fh, indent=2, sort_keys=True)
    finally:
        fh.close()
    print('[khux] fatto: %d funzioni nel grafo, %d ancore con riscontri'
          % (len(tree), len(anchors)))


main()
