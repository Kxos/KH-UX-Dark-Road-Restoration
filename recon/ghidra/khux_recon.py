# KHUX / Dark Road - estrazione del livello API da libcocos2dcpp.so
#
# Script di post-analisi per Ghidra headless (analyzeHeadless).
# Scritto in Jython (Python 2.7) per compatibilita' con tutte le versioni di Ghidra.
#
# Uso:  analyzeHeadless <proj> <nome> -import <lib.so> \
#           -scriptPath recon/ghidra -postScript khux_recon.py <outdir>
#
# Produce in <outdir>:
#   functions.txt          elenco completo delle funzioni (nome demangolato + indirizzo)
#   api_strings.txt        stringhe raggiunte dalle funzioni del livello di rete
#   decomp/<nome>.c        decompilato C delle funzioni bersaglio
#   master_fields.json     campi JSON per ogni classe master:: (schema del master data)
#   summary.json           riepilogo macchina-leggibile
#
# @category KHUX
# @runtime Jython

import json
import os
import re

from ghidra.app.decompiler import DecompInterface
from ghidra.util.task import ConsoleTaskMonitor


# ---------------------------------------------------------------------------
# Configurazione
# ---------------------------------------------------------------------------

# Funzioni del livello di rete / API: il bersaglio della fase A.
API_PATTERNS = [
    r'APIManager',
    r'\bHttp[A-Z]',
    r'\bNetwork',
    r'\bRequest\b',
    r'\bResponse\b',
    r'Session',
    r'Connect',
    r'[Ss]ecurityKey',
    r'[Aa]ccessToken',
    r'Encrypt',
    r'Decrypt',
    r'Base64',
    r'[Gg]zip',
]

# Deserializzatori del master data: il bersaglio della fase C.
# Nel binario ogni tabella e' una classe master::X con la sua funzione di parsing.
MASTER_PATTERN = r'master::'

# Rumore da scartare: librerie di terze parti linkate staticamente.
NOISE_PATTERN = re.compile(
    r'^(_?)(SSL|ssl|EVP|BN_|RSA_|EC_|ASN1|X509|PEM_|CMS_|OCSP|BIO_|ERR_|CRYPTO_'
    r'|curl_|Curl_|ares_|png_|jpeg_|FT_|ft_|af_|tt_|cff_|ps_|z_|inflate|deflate'
    r'|lua[A-Z_]|cocos2d::|spine|b2[A-Z]|opus_|ogg_|vorbis)'
)

DECOMP_TIMEOUT = 90  # secondi per funzione


# ---------------------------------------------------------------------------
# Utilita'
# ---------------------------------------------------------------------------

def out_path(outdir, *parts):
    p = os.path.join(outdir, *parts)
    d = os.path.dirname(p)
    if d and not os.path.isdir(d):
        os.makedirs(d)
    return p


def safe_filename(name):
    """Rende un nome C++ utilizzabile come nome di file."""
    s = re.sub(r'[^A-Za-z0-9_.-]', '_', name)
    return s[:150]


def all_functions():
    fm = currentProgram.getFunctionManager()
    return list(fm.getFunctions(True))


def display_name(func):
    """Nome demangolato se Ghidra l'ha prodotto, altrimenti quello grezzo."""
    sym = func.getSymbol()
    if sym is not None:
        parent = sym.getParentNamespace()
        if parent is not None and not parent.isGlobal():
            return parent.getName(True) + '::' + func.getName()
    return func.getName()


def is_noise(name):
    return bool(NOISE_PATTERN.match(name))


# ---------------------------------------------------------------------------
# Estrazione stringhe referenziate
# ---------------------------------------------------------------------------

def strings_referenced_by(func):
    """Stringhe raggiunte dal corpo della funzione, seguendo i riferimenti a dati."""
    found = set()
    listing = currentProgram.getListing()
    body = func.getBody()
    for instr in listing.getInstructions(body, True):
        for ref in instr.getReferencesFrom():
            data = listing.getDataAt(ref.getToAddress())
            if data is None:
                continue
            try:
                if data.hasStringValue():
                    val = data.getValue()
                    if val is not None:
                        s = str(val).strip()
                        if 1 <= len(s) <= 200:
                            found.add(s)
            except Exception:
                continue
    return sorted(found)


# ---------------------------------------------------------------------------
# Decompilazione
# ---------------------------------------------------------------------------

def make_decompiler():
    di = DecompInterface()
    di.openProgram(currentProgram)
    return di


def decompile(di, func, monitor):
    try:
        res = di.decompileFunction(func, DECOMP_TIMEOUT, monitor)
        if res is not None and res.decompileCompleted():
            return res.getDecompiledFunction().getC()
        return None
    except Exception as exc:
        return '// decompilazione fallita: %s\n' % exc


# ---------------------------------------------------------------------------
# Passi di analisi
# ---------------------------------------------------------------------------

def dump_function_index(funcs, outdir):
    path = out_path(outdir, 'functions.txt')
    fh = open(path, 'w')
    try:
        for f in funcs:
            fh.write('%s  %s\n' % (f.getEntryPoint(), display_name(f)))
    finally:
        fh.close()
    print('[khux] indice funzioni: %d -> %s' % (len(funcs), path))


def analyze_api_layer(funcs, di, monitor, outdir):
    """Fase A: isola il livello di rete, decompilalo, raccogli le stringhe."""
    rx = re.compile('|'.join(API_PATTERNS))
    targets = []
    for f in funcs:
        name = display_name(f)
        if is_noise(name):
            continue
        if rx.search(name):
            targets.append(f)

    print('[khux] funzioni del livello API individuate: %d' % len(targets))

    all_strings = {}
    decompiled = 0
    for f in targets:
        name = display_name(f)
        strs = strings_referenced_by(f)
        if strs:
            all_strings[name] = strs
        code = decompile(di, f, monitor)
        if code:
            p = out_path(outdir, 'decomp', safe_filename(name) + '.c')
            fh = open(p, 'w')
            try:
                fh.write(code)
            finally:
                fh.close()
            decompiled += 1

    path = out_path(outdir, 'api_strings.txt')
    fh = open(path, 'w')
    try:
        for name in sorted(all_strings):
            fh.write('### %s\n' % name)
            for s in all_strings[name]:
                fh.write('    %s\n' % s)
            fh.write('\n')
    finally:
        fh.close()

    # Le stringhe piu' interessanti: host, percorsi, chiavi di protocollo.
    interesting = set()
    probe = re.compile(
        r'(https?://|\.com|\.jp|\.net|^/[a-z]|api|session|token|key|auth'
        r'|encrypt|gzip|base64|version)', re.I)
    for strs in all_strings.values():
        for s in strs:
            if probe.search(s):
                interesting.add(s)

    path = out_path(outdir, 'api_candidates.txt')
    fh = open(path, 'w')
    try:
        for s in sorted(interesting):
            fh.write('%s\n' % s)
    finally:
        fh.close()

    print('[khux] decompilate %d funzioni, %d stringhe candidate'
          % (decompiled, len(interesting)))
    return {
        'api_functions': len(targets),
        'decompiled': decompiled,
        'candidate_strings': len(interesting),
    }


def analyze_master_tables(funcs, outdir):
    """Fase C in anticipo: per ogni classe master::, i nomi dei campi JSON.

    I deserializzatori rapidjson confrontano ogni chiave con una stringa
    letterale, quindi le stringhe referenziate dalla funzione di parsing di una
    tabella sono i suoi campi.
    """
    per_class = {}
    for f in funcs:
        name = display_name(f)
        if MASTER_PATTERN not in name:
            continue
        m = re.search(r'master::([A-Za-z0-9_]+)', name)
        if not m:
            continue
        cls = m.group(1)
        strs = strings_referenced_by(f)
        # I nomi di campo sono identificatori brevi, tipicamente snake_case.
        fields = [s for s in strs
                  if re.match(r'^[a-z][a-z0-9_]{1,40}$', s)]
        if fields:
            per_class.setdefault(cls, set()).update(fields)

    result = dict((k, sorted(v)) for k, v in per_class.items())
    path = out_path(outdir, 'master_fields.json')
    fh = open(path, 'w')
    try:
        json.dump(result, fh, indent=2, sort_keys=True)
    finally:
        fh.close()

    total = sum(len(v) for v in result.values())
    print('[khux] tabelle master con campi estratti: %d (%d campi in totale)'
          % (len(result), total))
    return {'master_tables': len(result), 'master_fields': total}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    args = getScriptArgs()
    outdir = args[0] if args else 'ghidra-out'
    if not os.path.isdir(outdir):
        os.makedirs(outdir)

    print('[khux] programma: %s' % currentProgram.getName())
    print('[khux] output   : %s' % os.path.abspath(outdir))

    monitor = ConsoleTaskMonitor()
    funcs = all_functions()
    print('[khux] funzioni totali: %d' % len(funcs))

    dump_function_index(funcs, outdir)

    di = make_decompiler()
    try:
        summary = {'program': currentProgram.getName(),
                   'total_functions': len(funcs)}
        summary.update(analyze_api_layer(funcs, di, monitor, outdir))
        summary.update(analyze_master_tables(funcs, outdir))
    finally:
        di.dispose()

    path = out_path(outdir, 'summary.json')
    fh = open(path, 'w')
    try:
        json.dump(summary, fh, indent=2, sort_keys=True)
    finally:
        fh.close()

    print('[khux] fatto. Riepilogo: %s' % json.dumps(summary, sort_keys=True))


main()
