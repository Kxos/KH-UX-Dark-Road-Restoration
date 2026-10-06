"""Comprime l'output di Ghidra in un digest di pochi KB.

Uso:  python recon/tools/digest.py recon/ghidra/out/ww431

Scrive DIGEST.md nella stessa cartella e lo stampa. Serve a leggere il risultato
dell'analisi senza scorrere megabyte di decompilato e di stringhe.
"""
import json
import os
import re
import sys

# Cio' che conta davvero per la fase B: host, percorsi, chiavi di protocollo.
HIGH_VALUE = re.compile(
    r'(https?://|[a-z0-9-]+\.(com|jp|net)\b|^/[a-z]|sharedSecurityKey|accessToken'
    r'|session|X-[A-Za-z-]+|api[_-]?(key|version|host)?\b)', re.I)


def read(path, default=''):
    try:
        with open(path, encoding='utf-8', errors='replace') as fh:
            return fh.read()
    except IOError:
        return default


def main(outdir):
    L = []
    add = L.append

    add('# Digest analisi Ghidra — `%s`\n' % os.path.basename(outdir.rstrip('/\\')))

    # --- riepilogo ---------------------------------------------------------
    summary = read(os.path.join(outdir, 'summary.json'))
    if summary:
        add('## Riepilogo\n')
        add('```json\n%s\n```\n' % summary.strip())
    else:
        add('> `summary.json` assente: l\'analisi non e\' arrivata in fondo.\n')

    # --- stringhe ad alto valore -------------------------------------------
    cands = read(os.path.join(outdir, 'api_candidates.txt')).splitlines()
    hot = [c for c in cands if HIGH_VALUE.search(c)]
    add('## Stringhe del livello API (%d candidate, %d ad alto valore)\n'
        % (len(cands), len(hot)))
    add('```')
    for s in hot[:120]:
        add(s)
    if len(hot) > 120:
        add('... e altre %d' % (len(hot) - 120))
    add('```\n')

    # --- campi delle tabelle master ----------------------------------------
    mf_raw = read(os.path.join(outdir, 'master_fields.json'))
    if mf_raw:
        try:
            mf = json.loads(mf_raw)
        except ValueError:
            mf = {}
        add('## Tabelle `master::` con campi estratti: %d\n' % len(mf))
        add('| tabella | n. campi | primi campi |')
        add('|---|---|---|')
        for cls in sorted(mf):
            fields = mf[cls]
            preview = ', '.join(fields[:6])
            if len(fields) > 6:
                preview += ', …'
            add('| `%s` | %d | %s |' % (cls, len(fields), preview))
        add('')
        total = sum(len(v) for v in mf.values())
        add('Totale campi estratti: **%d**\n' % total)

    # --- funzioni decompilate ----------------------------------------------
    dec = os.path.join(outdir, 'decomp')
    if os.path.isdir(dec):
        files = sorted(os.listdir(dec))
        sizes = {}
        for f in files:
            try:
                sizes[f] = os.path.getsize(os.path.join(dec, f))
            except OSError:
                sizes[f] = 0
        add('## Funzioni decompilate: %d\n' % len(files))
        add('Le piu' + chr(39) + ' corpose (dove sta la logica):\n')
        add('```')
        for f in sorted(files, key=lambda x: -sizes[x])[:25]:
            add('%8d B  %s' % (sizes[f], f))
        add('```\n')
        api = [f for f in files if 'APIManager' in f]
        if api:
            add('Funzioni `APIManager`: %s\n' % ', '.join(api[:20]))

    out = '\n'.join(L)
    with open(os.path.join(outdir, 'DIGEST.md'), 'w', encoding='utf-8') as fh:
        fh.write(out)
    print(out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'recon/ghidra/out/ww431')
