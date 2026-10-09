"""Open the game page in real Edge (headed), wait for Cloudflare, dump page HTML and sheet links."""
import re, sys, time
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
out = sys.argv[1]
URL = 'https://www.spriters-resource.com/mobile/kingdomheartsunion/'
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(sys.argv[2], channel='msedge', headless=False, viewport={'width': 1280, 'height': 900}, args=['--disable-blink-features=AutomationControlled'])
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    for i in range(150):
        if not any(s in page.title() for s in ('Just a moment', 'Ci siamo quasi', 'moment')):
            break
        time.sleep(1)
    time.sleep(3)
    print('titolo:', page.title())
    html = page.content()
    open(out, 'w', encoding='utf-8').write(html)
    links = sorted(set(re.findall(r'href="(/mobile/kingdomheartsunion/(?:asset|sheet)/[^"]+)"', html)))
    print('link fogli:', len(links))
    for l in links[:15]:
        print(' ', l)
    ctx.close()
