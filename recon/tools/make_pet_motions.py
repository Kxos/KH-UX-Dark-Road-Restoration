"""Animazioni del pet (lwf/pet/motion/<nome>/<nome>.lwf), assenti da ogni risorsa: LWF NOSTRI,
scritti da zero (nessun byte degli originali), invisibili, che a fine animazione mandano
l'evento «end».

Perche' (ISSUES I-005, docs/notes/home_profilo.md#pet): con userDetail.isPet 1 la battaglia crea
il PetActor ([fn] / [fn] -> [fn] -> [fn]) e lo fa muovere con
Pet::playMotion ([fn], tabella dei 30 nomi a 0x1f32138 -> [fn] carica il LWF e
gli aggancia il dispatcher degli eventi [fn]). Il pet cambia stato solo quando il LWF
manda «end» ([fn] -> gestore +0x140 -> evento 4 nella coda del pet +0x818;
[fn] / [fn] -> [fn] sceglie il movimento dopo: battle_normal/all,
jump2, battle_skill... -> bwait; deathblow_normal(2) -> attacco del pet [fn]). La
sequenza d'attacco ([fn], stato 0x14) aspetta [fn] = avatar fermo E pet
pronto ([fn]: movimento bwait/recovery_skill/rolling1-3); gli stati 0x38/0x39
aspettano [fn] -> [fn] (wait/bwait/waitb/rolling). Con i LWF vuoti di prima
(copie di waist_c, nessun evento) il pet restava per sempre in battle_normal/jump2: avatar
fermo in posa d'attacco, nemico immobile (banco 11 ottobre, missione 1010 con -Pet).

Un LWF per nome: radice di FRAMES fotogrammi; sull'ultimo un controllo ANIMATION (tipo 4) con
EVENT(8) «end» (stesso schema degli originali, es. lwf/character/enemy/1/dead: «end_1»; il
dispatcher guarda solo «e»+«nd»). I movimenti che il codice lascia in ciclo (wait, bwait,
walk, run, win, waitb, rolling1/2, training*) restano senza evento: nessuno li aspetta.

    python -I recon/tools/make_pet_motions.py <uscita>     (es. stage_gen\\files)

Lo chiama anche make_layouts.py (dopo i LWF vuoti), quindi build-resources.ps1 lo include.
"""
import os
import struct
import sys

# indice di [fn] -> nome (tabella 0x1f32138)
MOTIONS = ['wait', 'bwait', 'walk', 'run', 'jump', 'win', 'wait_accent', 'battle_normal', 'battle_all',
           'deathblow_normal', 'deathblow_normal_after', 'battle_skill', 'recovery_skill', 'jump2',
           'deathblow_normal2', 'deathblow_normal_after2', 'jump3', 'waitb', 'rolling1', 'rolling2',
           'rolling3', 'pvp_start', 'pvp_turn_win', 'pvp_turn_lose', 'pvp_total_win', 'pvp_total_lose',
           'pvp_total_draw', 'training1', 'training2', 'training3']
# quelli di cui [fn] gestisce la fine (casi 4, 6, 7-0x10, 0x14-0x1a)
WITH_END = {4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25, 26}
FRAMES = 15   # 0,5 s a 30 fps

# sezioni dell'intestazione del formato 0x121010 (ordine verificato sugli originali)
SECTIONS = ['stringBytes', 'animationBytes', 'translate', 'matrix', 'color', 'alphaTransform',
            'colorTransform', 'objectData', 'texture', 'textureFragment', 'bitmap', 'bitmapEx', 'font',
            'textProperty', 'text', 'particleDatabase', 'particle', 'programObject', 'graphicObject',
            'graphic', 'animation', 'buttonCondition', 'button', 'label', 'instanceName', 'eventName',
            'place', 'controlMoveM', 'controlMoveC', 'controlMoveMC', 'control', 'frame',
            'movieClipEvent', 'movie', 'movieLinkage', 'stringData']
HEADER = 0x20 + 8 * len(SECTIONS) + 4


def pad4(b):
    return b + b'\0' * (-len(b) % 4)


def build(name, with_end, frames=FRAMES):
    strings = ['_empty', '_root', name] + (['end'] if with_end else [])
    sbytes, sdata = b'', []
    for s in strings:
        sdata.append((len(sbytes), len(s.encode())))
        sbytes += s.encode() + b'\0'
    root_frames = frames if with_end else 1
    # fotogrammi: radice (movie 0) poi _empty (movie 1); l'ultimo della radice ha il controllo 0
    frame_list = [(0, 0)] * root_frames + [(0, 0)]
    controls, anims, abytes, events = [], [], b'', []
    if with_end:
        frame_list[root_frames - 1] = (0, 1)
        controls = [(4, 0)]                                   # ANIMATION, animazione 0
        abytes = bytes([8]) + struct.pack('<i', 0) + b'\0\0'  # EVENT evento 0, END
        anims = [(0, len(abytes))]
        events = [3]                                          # stringa «end»
    data = {
        # lunghezze con il riempimento a 4, come negli originali
        'stringBytes': (pad4(sbytes), len(pad4(sbytes))),
        'animationBytes': (pad4(abytes), len(pad4(abytes))),
        'translate': (struct.pack('<2f', 0, 0), 1),
        'alphaTransform': (struct.pack('<f', 1.0), 1),
        'objectData': (struct.pack('<4i', 2, 0, 2, 1), 2),   # due MOVIE
        'animation': (b''.join(struct.pack('<2i', *a) for a in anims), len(anims)),
        'instanceName': (struct.pack('<i', 1), 1),
        'eventName': (b''.join(struct.pack('<i', e) for e in events), len(events)),
        'control': (b''.join(struct.pack('<2i', *c) for c in controls), len(controls)),
        'frame': (b''.join(struct.pack('<2i', *f) for f in frame_list), len(frame_list)),
        # depths, labelOffset, labels, frameOffset, frames, clipEventOffset, clipEvents
        'movie': (struct.pack('<7i', 0, 0, 0, 0, root_frames, 0, 0)
                  + struct.pack('<7i', 0, 0, 0, root_frames, 1, 0, 0), 2),
        'movieLinkage': (struct.pack('<4i', 0, 1, 1, 0), 2),  # _empty -> 1, _root -> 0
        'stringData': (b''.join(struct.pack('<2i', *s) for s in sdata), len(sdata)),
    }
    body, secs = b'', []
    for n in SECTIONS:
        blob, count = data.get(n, (b'', 0))
        secs.append((HEADER + len(body), count))
        body += blob
    total = HEADER + len(body)
    head = b'LWF\0' + bytes([0x12, 0x10, 0x10, 0])
    head += struct.pack('<6i', 900, 700, 30, 0, 2, 0xffffff)
    head += b''.join(struct.pack('<2i', *s) for s in secs) + struct.pack('<i', total)
    assert len(head) == HEADER
    return head + body


def write_all(out):
    n = 0
    for i, name in enumerate(MOTIONS):
        d = os.path.join(out, 'lwf', 'pet', 'motion', name)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, name + '.lwf'), 'wb') as fh:
            fh.write(build(name, i in WITH_END))
        n += 1
    return n


if __name__ == '__main__':
    print('pet motion: %d LWF (%d con «end»)' % (write_all(sys.argv[1]), len(WITH_END)))
