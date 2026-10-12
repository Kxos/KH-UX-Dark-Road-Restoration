"""Animazione dello sblocco/rilancio della guilt (SP Attack Bonus) nel Level Up
(lwf/medal/guilt_bonus/GuiltBonus/GuiltBonus.lwf), assente da ogni risorsa: LWF NOSTRO, scritto
da zero con le texture disegnate qui (I-079, banco gu_23: crash dopo la risposta).

Cosa vuole il client (decompilato 4.3.1): [fn], dopo il risultato del Level Up con
una guilt nuova, carica questo LWF ([fn]: NULL se manca = crash) in uno strato sopra
la schermata, alla meta' del nodo della medaglia (+0x2b8, piu' lo scarto +0x2c0), e registra
con [fn] un solo gestore: Â«enterFrameÂ» sull'istanza Â«_rootÂ» (lambda vtable 0x1f61b58),
lo stesso schema di KeyBlade_Evolution (make_kb_evolution_lwf.py): si va avanti quando il
fotogramma corrente arriva all'ultimo. Quindi: bagliore viola, raggi, lampo, anello e stella
dorati; STOP sull'ultimo fotogramma.

    python -I recon/tools/make_guilt_bonus_lwf.py <uscita>     (es. stage_gen\\files)
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_pet_motions import STOP, Lwf, btf8, draw, lerp, mat  # noqa: E402
from make_kb_evolution_lwf import ramp, tex_ring, tex_star  # noqa: E402

NAME = 'GuiltBonus'
FPS = 30
N = 48                      # 1,6 s


def tex_aura(x, y):
    r = math.hypot(x, y)
    a = max(0.0, 1 - r) ** 2
    return lerp(0.95, 0.55, r), lerp(0.6, 0.15, r), 1.0, a


def tex_rays(x, y):
    r = math.hypot(x, y)
    ang = math.atan2(y, x)
    spoke = (0.5 + 0.5 * math.cos(10 * ang)) ** 8
    a = spoke * max(0.0, 1 - r) ** 1.2 * min(1.0, r * 6)
    return 0.85, 0.55, 1.0, a * 0.9


TEXTURES = [('aura', 256, 256, tex_aura), ('rays', 256, 256, tex_rays),
            ('star', 128, 128, tex_star), ('ring', 192, 192, tex_ring)]
ORDER = ['aura', 'rays', 'ring', 'star']   # dietro -> davanti


def tracks(f):
    """(scala, rotazione, alpha) di ogni strato al fotogramma f."""
    t = f / FPS
    peak = 14                                    # picco del lampo
    out = ramp(f, N - 14, N - 1, 0.0, 1.0)       # dissolvenza finale
    return {
        'aura': (ramp(f, 0, peak, 0.6, 1.6) + 0.05 * math.sin(t * 6), 0.0,
                 ramp(f, 0, 8, 0.0, 0.8) - out * 0.8),
        'rays': (ramp(f, 0, peak + 10, 0.8, 1.9), 40.0 * t,
                 ramp(f, 2, peak, 0.0, 0.7) - out * 0.7),
        'ring': (ramp(f, peak, peak + 16, 0.3, 2.2), 0.0,
                 ramp(f, peak, peak + 2, 0.0, 0.9) - ramp(f, peak + 4, peak + 16, 0.0, 0.9)),
        'star': (ramp(f, peak - 6, peak, 0.3, 2.6) - ramp(f, peak, peak + 12, 0, 1.4), 120.0 * t,
                 ramp(f, peak - 6, peak - 1, 0.0, 1.0) - out),
    }


def build():
    lw = Lwf(NAME, (1136, 640))
    files, objs = {}, {}
    for key, w, h, fn in TEXTURES:
        fname = '%s_%s.png' % (NAME, key)     # comincia col nome del LWF, come gli altri LWF serviti
        files[fname] = btf8(w, h, draw(w, h, fn))
        objs[key] = lw.bitmap(fname, w, h, mat(-w / 2, -h / 2))
    places, frames = {}, []
    for f in range(N):
        tr = tracks(f)
        ctrls = []
        for d, key in enumerate(ORDER):
            s, r, a = tr[key]
            mid, aid = lw.matrix(mat(0, 0, r, s, s)), lw.alpha(max(0.0, min(1.0, a)))   # aid 0 = opaco
            if f == 0:
                places[key] = lw.place(d, objs[key], None, mid)
                ctrls.append(places[key] if not aid else lw.move(places[key], mid, aid))
            else:
                ctrls.append(lw.move(places[key], mid, aid))
        if f == N - 1:
            ctrls.append(lw.anim([(STOP, None)]))
        frames.append(ctrls)
    return lw.build(frames, len(ORDER)), files


def write_all(out):
    d = os.path.join(out, 'lwf', 'medal', 'guilt_bonus', NAME)
    os.makedirs(d, exist_ok=True)
    data, files = build()
    with open(os.path.join(d, NAME + '.lwf'), 'wb') as fh:
        fh.write(data)
    for fname, blob in files.items():
        with open(os.path.join(d, fname), 'wb') as fh:
            fh.write(blob)
    return len(data), len(files)


if __name__ == '__main__':
    n, t = write_all(sys.argv[1])
    print('%s: %d byte, %d texture, %d fotogrammi a %d fps' % (NAME, n, t, N, FPS))
