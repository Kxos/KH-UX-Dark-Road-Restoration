"""Elenco (ed estrazione) di file da uno zip remoto (APK, IPA) con richieste Range,
senza scaricarlo tutto.

    python -I recon/tools/remote_zip.py <url> [filtro regex]          elenco
    python -I recon/tools/remote_zip.py <url> <nome esatto> <uscita>   estrae un file
"""
import re
import struct
import subprocess
import sys
import zlib

# curl e non urllib: con l'OpenSSL di Python i nodi di archive.org danno
# "certificate has expired", con curl (schannel su Windows) no.


def get(url, start, end):
    r = subprocess.run(['curl', '-sSfL', '-r', '%d-%d' % (start, end), url],
                       stdout=subprocess.PIPE, check=True)
    return r.stdout, None, url


def central(url):
    r = subprocess.run(['curl', '-sSfIL', '-r', '0-0', url], stdout=subprocess.PIPE, check=True)
    hdr = r.stdout.decode('latin-1')
    size = int(re.findall(r'(?im)^content-range:\s*bytes 0-0/(\d+)', hdr)[-1])
    locs = re.findall(r'(?im)^location:\s*(\S+)', hdr)
    if locs:
        url = locs[-1]
    tail, _, _ = get(url, max(0, size - 70000), size - 1)
    base = max(0, size - 70000)
    i = tail.rfind(b'PK\x05\x06')
    n, cd_size, cd_off = struct.unpack_from('<HII', tail, i + 10)
    j = tail.rfind(b'PK\x06\x06')                       # zip64
    if j >= 0 or cd_off == 0xffffffff:
        n, cd_size, cd_off = struct.unpack_from('<QQQ', tail, j + 32)
    cd, _, _ = get(url, cd_off, cd_off + cd_size - 1)
    out, p = [], 0
    while p < len(cd) and cd[p:p + 4] == b'PK\x01\x02':
        meth, = struct.unpack_from('<H', cd, p + 10)
        csize, usize = struct.unpack_from('<II', cd, p + 20)
        nl, el, cl = struct.unpack_from('<HHH', cd, p + 28)
        loff, = struct.unpack_from('<I', cd, p + 42)
        name = cd[p + 46:p + 46 + nl].decode('utf-8', 'replace')
        extra = cd[p + 46 + nl:p + 46 + nl + el]
        q = 0
        while q + 4 <= len(extra):
            tag, ln = struct.unpack_from('<HH', extra, q)
            if tag == 1:                                # zip64: campi a 0xffffffff in ordine
                vals = list(struct.unpack_from('<%dQ' % (ln // 8), extra, q + 4))
                if usize == 0xffffffff: usize = vals.pop(0)
                if csize == 0xffffffff: csize = vals.pop(0)
                if loff == 0xffffffff: loff = vals.pop(0)
            q += 4 + ln
        out.append((name, meth, csize, usize, loff))
        p += 46 + nl + el + cl
    return url, size, out


url, size, entries = central(sys.argv[1])
if len(sys.argv) == 4:
    e = next(e for e in entries if e[0] == sys.argv[2])
    head, _, _ = get(url, e[4], e[4] + 29)
    nl, el = struct.unpack_from('<HH', head, 26)
    start = e[4] + 30 + nl + el
    with open(sys.argv[3], 'wb') as fh:
        if e[1] == 0:
            pos = start
            while pos < start + e[2]:
                chunk, _, _ = get(url, pos, min(start + e[2], pos + (64 << 20)) - 1)
                fh.write(chunk)
                pos += len(chunk)
        else:
            raw, _, _ = get(url, start, start + e[2] - 1)
            fh.write(zlib.decompress(raw, -15))
    print('estratto', e[0], '->', sys.argv[3])
else:
    pat = re.compile(sys.argv[2]) if len(sys.argv) > 2 else None
    print('zip', size, 'byte,', len(entries), 'voci')
    for name, meth, cs, us, off in entries:
        if pat is None or pat.search(name):
            print('%12d %12d %s' % (us, cs, name))
