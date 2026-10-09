"""Texture dell'interfaccia che non esistono in nessuna risorsa servita (le avevano i client
2015-2017, Dark Road le ha tolte): ricostruite con Pillow e scritte in formato BTF.

    python recon/tools/make_textures.py <cartella catalogo estratto> <uscita>

<cartella catalogo estratto> = res_bulk.py (catalog\\files), per le texture di partenza;
<uscita> = stage_gen\\files: i file finiscono in cocostudio/publish/<nome>. Pillow: senza -I.

Riferimento: reference\\medal_list\\sort_filter\\ (guida khux-guides 2017).
"""
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import btf  # noqa: E402

src, out = sys.argv[1:3]
pub = os.path.join(out, 'cocostudio', 'publish')
os.makedirs(pub, exist_ok=True)
S = 4                                        # disegno a 4x e riduzione (bordi morbidi)


def save(name, im):
    with open(os.path.join(pub, name), 'wb') as fh:
        fh.write(btf.encode(im))
    print(name, im.size)


def load(rel):
    return btf.decode(open(os.path.join(src, *rel.split('/')), 'rb').read())


def switch(active_left):
    """Sf_Switch1/2 (373x59, PopupNormal_SortMedal_ver260: Switch_Sort / Switch_Filter):
    pillola blu scuro con bordo azzurro, la meta' attiva magenta (colori dallo screenshot:
    fondo 6,40,75; bordo 9,144,210; magenta 204,2,210 -> 185,0,194)."""
    w, h = 373, 59
    im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = h * S // 2
    d.rounded_rectangle((0, 0, w * S - 1, h * S - 1), r, fill=(9, 144, 210, 255))
    b = 3 * S
    d.rounded_rectangle((b, b, w * S - 1 - b, h * S - 1 - b), r - b, fill=(6, 40, 75, 255))
    half = Image.new('RGBA', im.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(half)
    for y in range(b, h * S - b):           # sfumatura verticale del magenta
        t = (y - b) / (h * S - 2 * b)
        hd.line((0, y, w * S, y), fill=(int(214 - 30 * t), int(10 - 10 * t), int(220 - 26 * t), 255))
    mask = Image.new('L', im.size, 0)
    md = ImageDraw.Draw(mask)
    x0, x1 = (b, w * S // 2) if active_left else (w * S // 2, w * S - 1 - b)
    md.rounded_rectangle((x0, b, x1, h * S - 1 - b), r - b, fill=255)
    if active_left:                         # lato verso il centro dritto
        md.rectangle((x1 - r, b, x1, h * S - 1 - b), fill=255)
    else:
        md.rectangle((x0, b, x0 + r, h * S - 1 - b), fill=255)
    im.paste(half, (0, 0), mask)
    return im.resize((w, h), Image.LANCZOS)


def sort_arrow(up):
    """Sf_But_21/22 (149x54, Logo_Up / Logo_Down di Sort_Up / Sort_Down): triangolo bianco a
    sinistra del testo (nello screenshot «▲昇順» / «▼降順»), fondo trasparente."""
    w, h = 149, 54
    im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy, a = 38 * S, h * S // 2, 8 * S
    pts = [(cx - a, cy + a * 0.7), (cx + a, cy + a * 0.7), (cx, cy - a * 0.9)] if up else \
        [(cx - a, cy - a * 0.7), (cx + a, cy - a * 0.7), (cx, cy + a * 0.9)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    return im.resize((w, h), Image.LANCZOS)


save('Sf_Switch1.png', switch(True))
save('Sf_Switch2.png', switch(False))
save('Sf_But_21.png', sort_arrow(True))
save('Sf_But_22.png', sort_arrow(False))
# rare_star (26x26, i filtri della rarita'): la stella della rarita' delle medaglie
save('rare_star.png', load('img/ui/Rare_Medal_Star01.png').resize((26, 26), Image.LANCZOS))


def fit(im, size, box=None):
    """im (ritagliata al contenuto) ridotta/ingrandita dentro box (default: tutta la tela)
    e centrata su una tela trasparente size."""
    im = im.crop(im.getbbox())
    bw, bh = box or size
    k = min(bw / im.width, bh / im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    out.alpha_composite(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    return out


# icone dei tipi di abilita' nel filtro (Filter_Ability01..12, scala 0,7): spada (Buff01),
# scudo (Buff05) con freccia su (Buff_UP, rossa) o giu' (Buff_Down, blu capovolta), e il
# simbolo degli attributi (Sf_Icon_Zokusei) per le abilita' «di attributo»
save('Buff01.png', fit(load('cocostudio/publish/Ico_Param_Offense.png'), (77, 54), (60, 50)))
save('Buff05.png', fit(load('cocostudio/publish/Ico_Param_Defense.png'), (77, 54), (60, 50)))
save('Buff_UP.png', fit(load('cocostudio/publish/Minfo_Def04A.png'), (24, 34)))
save('Buff_Down.png', fit(load('img/ui/Minfo_Def04C.png').transpose(Image.FLIP_TOP_BOTTOM), (24, 34)))
save('Sf_Icon_Zokusei.png', fit(load('cocostudio/publish/AttributeCompatibility.png'), (46, 44)))
def hslice(im, w, h, cap):
    """Ridimensiona un pulsante a w x h tenendo gli angoli: fasce laterali di cap px fisse,
    centro stirato (dopo aver portato l'altezza a h)."""
    k = h / im.height
    im = im.resize((round(im.width * k), h), Image.LANCZOS)
    c = round(cap * k)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(im.crop((0, 0, c, h)), (0, 0))
    out.paste(im.crop((im.width - c, 0, im.width, h)), (w - c, 0))
    out.paste(im.crop((c, 0, im.width - c, h)).resize((w - 2 * c, h), Image.LANCZOS), (c, 0))
    return out


# But23 (CheckBox 95x72 dei filtri Guilt e Skill: la CheckBox usa la texture a dimensione
# naturale): But16 dello stesso popup ridotto a 95x58 con gli angoli intatti, su tela 95x72
for suf in ('Off', 'On'):
    b = Image.new('RGBA', (95, 72), (0, 0, 0, 0))
    b.alpha_composite(hslice(load('cocostudio/publish/But16_%s.png' % suf), 95, 58, 30), (0, 7))
    save('But23_%s.png' % suf, b)
# filtro Guilt 9 (100x100, scala 0,7): l'icona della Guilt 8, l'ultima esistente
save('MedalInfo_Guilt9.png', fit(load('img/ui/guilt/MedalInfo_Guilt8.png'), (100, 100)))
