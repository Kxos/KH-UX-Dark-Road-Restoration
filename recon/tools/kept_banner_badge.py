"""Bollino «KEPT IN SHOP» sul banner dello Shop (Shop sp3, richiesta dell'utente 20-10).

Uso: python -I recon/tools/kept_banner_badge.py <banner.png> <uscita.png>
Copia il banner (stessa dimensione) con un nastro in alto a destra: puntina disegnata come forma (nessun font emoji)
e scritta «KEPT IN SHOP». Lo chiama server.js la prima volta che il client chiede /web/gacha/img/<id>-kept.png.
Esce con codice diverso da zero se non riesce: il server serve allora l'immagine normale.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

S = 4  # sovracampionamento per i bordi lisci
FONTS = ['C:/Windows/Fonts/arialbd.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'arialbd.ttf', 'DejaVuSans-Bold.ttf']


def font(px):
    for f in FONTS:
        try:
            return ImageFont.truetype(f, px)
        except OSError:
            pass
    return ImageFont.load_default(px)


def pin(d, cx, cy, h, col, edge):
    """Puntina inclinata di 45 gradi: testa tonda, perno e ago."""
    import math
    a = math.radians(-45)
    ux, uy = math.cos(a), math.sin(a)          # asse verso la testa
    px, py = -uy, ux
    def P(t, w):
        return (cx + ux * t + px * w, cy + uy * t + py * w)
    d.line([P(-h * .55, 0), P(h * .05, 0)], fill=edge, width=max(2, int(h * .08)))               # ago
    d.polygon([P(h * .05, -h * .30), P(h * .05, h * .30), P(h * .30, h * .30), P(h * .30, -h * .30)], fill=col, outline=edge)  # corpo
    d.polygon([P(h * .30, -h * .40), P(h * .30, h * .40), P(h * .42, h * .40), P(h * .42, -h * .40)], fill=col, outline=edge)  # base testa
    hx, hy = P(h * .55, 0)
    r = h * .26
    d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=col, outline=edge)


def main(src, dst):
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    k = w / 640.0
    bw, bh, m = int(214 * k * S), int(40 * k * S), int(6 * k * S)
    big = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    x1, y0 = w * S - m, m
    x0, y1 = x1 - bw, y0 + bh
    d.rounded_rectangle([x0 + 2 * S, y0 + 3 * S, x1 + 2 * S, y1 + 3 * S], radius=bh // 2, fill=(0, 0, 0, 110))  # ombra
    d.rounded_rectangle([x0, y0, x1, y1], radius=bh // 2, fill=(224, 140, 18, 255), outline=(255, 232, 150, 255), width=max(2, int(2.2 * k * S)))
    pin(d, x0 + bh * .52, y0 + bh * .52, bh * .62, (255, 255, 255, 255), (120, 60, 0, 255))
    f = font(int(21 * k * S))
    tx = x0 + bh * 1.02
    ty = (y0 + y1) / 2
    d.text((tx + S, ty + S), 'KEPT IN SHOP', font=f, fill=(110, 55, 0, 200), anchor='lm')
    d.text((tx, ty), 'KEPT IN SHOP', font=f, fill=(255, 255, 255, 255), anchor='lm')
    over = big.resize((w, h), Image.LANCZOS)
    out = Image.alpha_composite(im, over).convert('RGB')
    out.save(dst, 'PNG')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
