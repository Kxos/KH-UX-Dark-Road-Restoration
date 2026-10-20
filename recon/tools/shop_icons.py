"""Icone delle valute per il Banner Catalog (filtro PAID WITH, righe, tag).

Sono asset Square Enix: NON vanno nel repo. Lo script li copia dal dump JP 4.3.1 in
server/game_data/shop_icons/<chiave>.png (cartella ignorata da git), ognuno ridotto a stare
in 48x48 RGBA con proporzioni intatte e margine trasparente.

Uso: python -I recon/tools/shop_icons.py [BASE_JP] [CARTELLA_OUT]
     BASE_JP anche da env KHUX_JP_BASE (cartella jp_final_4.3.1 con cocostudio/ e img/).
"""
import os
import sys
from PIL import Image

DEFAULT_BASE = r'D:\Progetto_Restauro_KH_UX\[local reference data]\\[local reference data]\data\[local reference data]\data\jp_final_4.3.1'
SIZE = 48
# chiave -> percorso relativo nella base JP (stesse chiavi della whitelist in server.js)
ICONS = {
    'jewel': 'cocostudio/publish/IncentiveIcon_01.png',
    'platinum': 'img/incentive/draw_Ticket_40.00333866.png',
    'draw': 'img/incentive/draw_Ticket_41.00333865.png',
    'seasonal': 'img/incentive/draw_Ticket_41.png',
    'vip': 'cocostudio/publish/Hs_Ico_Crown.png',
    'other': 'img/incentive/Star7_Ticket_39.png',
}


def normalize(src, size=SIZE):
    """Adatta l'immagine a size x size: proporzioni intatte, centrata, sfondo trasparente."""
    im = Image.open(src).convert('RGBA')
    im.thumbnail((size, size), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return out


def main(argv):
    base = argv[1] if len(argv) > 1 else os.environ.get('KHUX_JP_BASE', DEFAULT_BASE)
    here = os.path.dirname(os.path.abspath(__file__))
    dest = argv[2] if len(argv) > 2 else os.path.normpath(os.path.join(here, '..', '..', 'server', 'game_data', 'shop_icons'))
    os.makedirs(dest, exist_ok=True)
    missing = 0
    for key, rel in ICONS.items():
        src = os.path.join(base, *rel.split('/'))
        if not os.path.isfile(src):
            print('MANCA', key, src)
            missing += 1
            continue
        normalize(src).save(os.path.join(dest, key + '.png'))
        print('ok', key)
    return 1 if missing else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
