"""Resolve media URLs of missing sheets with Edge (Cloudflare), then stream them to disk with curl_cffi
using Edge's cookies and user agent."""
import os, re, sys, time
from playwright.sync_api import sync_playwright
from curl_cffi import requests as cr
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
lst, outdir, prof = sys.argv[1], sys.argv[2], sys.argv[3]
rows = [l.rstrip('\n').split('\t') for l in open(lst, encoding='utf-8') if l.strip()]
safe = lambda s: re.sub(r'[^\w\-. ]+', '_', s).strip()
todo = []
for sec, aid, name in rows:
    d = os.path.join(outdir, safe(re.sub(r'^\[\d+\]\s*', '', sec)))
    dst = os.path.join(d, '%s_%s.png' % (aid, safe(name)))
    if not (os.path.exists(dst) and os.path.getsize(dst) > 0):
        todo.append((sec, aid, name, d, dst))
print('da scaricare:', len(todo))
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(prof, channel='msedge', headless=False,
                                               args=['--disable-blink-features=AutomationControlled'])
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto('https://www.spriters-resource.com/mobile/kingdomheartsunion/', wait_until='domcontentloaded')
    for i in range(150):
        if 'moment' not in page.title() and 'quasi' not in page.title(): break
        time.sleep(1)
    ua = page.evaluate('navigator.userAgent')
    urls = []
    for sec, aid, name, d, dst in todo:
        pg = ctx.request.get('https://www.spriters-resource.com/mobile/kingdomheartsunion/asset/%s/' % aid, timeout=60000)
        m = re.search(r'/media/assets/(\d+)/%s\.(png|zip|gif)' % aid, pg.text()) if pg.ok else None
        if m:
            urls.append(('https://www.spriters-resource.com/media/assets/%s/%s.%s' % (m.group(1), aid, m.group(2)), aid, d, dst, name))
        else:
            print('ERR pagina', pg.status, name)
    cookies = {c['name']: c['value'] for c in ctx.cookies() if 'spriters-resource' in c['domain']}
    ctx.close()
s = cr.Session(impersonate='edge101')
for url, aid, d, dst, name in urls:
    os.makedirs(d, exist_ok=True)
    try:
        r = s.get(url, cookies=cookies, headers={'User-Agent': ua, 'Referer': url.replace('/media/assets', '/mobile')},
                  timeout=900, stream=True)
        if r.status_code != 200:
            print('ERR', r.status_code, name); continue
        n = 0
        with open(dst + '.part', 'wb') as fh:
            for chunk in r.iter_content():
                fh.write(chunk); n += len(chunk)
        os.replace(dst + '.part', dst)
        print('ok ', name, n)
    except Exception as e:
        print('ERR', name, e)
print('fine')
