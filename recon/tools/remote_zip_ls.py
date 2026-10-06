"""List a remote ZIP's central directory using HTTP range requests (no full download)."""
import sys, struct, urllib.request, urllib.parse

def rng(url, start, end=None):
    h = {'Range': f'bytes={start}-' + ('' if end is None else str(end)),
         'User-Agent': 'Mozilla/5.0'}
    return urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=120).read()

def size_of(url):
    r = urllib.request.urlopen(urllib.request.Request(url, method='HEAD',
        headers={'User-Agent':'Mozilla/5.0'}), timeout=60)
    return int(r.headers['Content-Length']), r.geturl()

def main(url, tail=3_000_000):
    total, final = size_of(url)
    print(f"# remote size: {total/1048576:.1f} MB")
    buf = rng(final, max(0, total - tail))
    base = max(0, total - tail)
    i = buf.rfind(b'PK\x05\x06')
    if i < 0:
        print("EOCD not found"); return
    cd_size, cd_off = struct.unpack('<II', buf[i+12:i+20])
    n = struct.unpack('<H', buf[i+10:i+12])[0]
    print(f"# entries: {n}  central dir at {cd_off} ({cd_size} bytes)")
    cd = buf[cd_off-base: cd_off-base+cd_size] if cd_off >= base else rng(final, cd_off, cd_off+cd_size-1)
    p = 0; out = []
    while p + 46 <= len(cd) and cd[p:p+4] == b'PK\x01\x02':
        comp, unc = struct.unpack('<II', cd[p+20:p+28])
        nl, el, cl = struct.unpack('<HHH', cd[p+28:p+34])
        name = cd[p+46:p+46+nl].decode('utf-8', 'replace')
        out.append((unc, comp, name))
        p += 46 + nl + el + cl
    out.sort(reverse=True)
    for unc, comp, name in out[:80]:
        print(f"{unc/1048576:10.2f} MB  {name}")
    print(f"# listed {len(out)} entries, total uncompressed {sum(o[0] for o in out)/1048576:.1f} MB")

if __name__ == '__main__':
    main(sys.argv[1])
