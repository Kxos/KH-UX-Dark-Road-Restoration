"""Prova offline delle regole di make_jp_enemies.py su cartelle finte (nessun dato vero, nessuna scrittura in enemy_gen).

    python recon/tools/test_make_jp_enemies.py        -> «OK: ...» oppure «ERRORI (n)», uscita 1

Casi (21-10, I-009 Task 7): texture scartate come doppioni dall'estrazione JP e rimaste con lo STESSO nome in
un'altra animazione dello stesso nemico (es. 1532: wait.lwf cita wait_<x>.png, il file vero sta in atk1_o/), famiglie
dei nemici delle missioni 526-979 (oltre_families: displayId = famiglia se la cartella JP c'e'), tabella dei doppioni
(jp_dedup_donors.tsv: texture rimasta solo in un'altra cartella JP, es. lwf/drama/<id>/), controllo delle dimensioni
dichiarate nella regola dello stesso nome (1577: fumo di dead 146x148 al posto degli ingranaggi 95x65 di wait), tabella
delle texture ricostruite (jp_reconstructed.tsv, I-194: usata solo dopo le copie e i doppioni).
"""
import os
import shutil
import struct
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TMP = tempfile.mkdtemp(prefix='jpen-', dir=r'D:\Progetto_Restauro_KH_UX\tmp' if os.path.isdir(r'D:\Progetto_Restauro_KH_UX\tmp') else None)
JP, B16 = os.path.join(TMP, 'jp'), os.path.join(TMP, 'b2016')
ROOT = os.path.join(TMP, 'root')                      # finta radice JP delle sorgenti della tabella
JP = os.path.join(ROOT, 'lwf', 'character', 'enemy')
DON = os.path.join(TMP, 'donors.tsv')
with open(DON, 'w', encoding='utf-8') as fh:
    fh.write('# prova\n'
             'lwf/character/enemy/1700/wait/wait_a.png\tlwf/drama/99/99_x.png\tunique\n'
             'lwf/character/enemy/1701/wait/wait_a.png\tlwf/drama/99/99_assente.png\tunique\n'
             'lwf/character/enemy/20/wait/wait_q.png\tlwf/drama/99/99_x.png\tunique\n'
             'lwf/character/enemy/1801/wait/wait_s.png\tlwf/drama/99/99_x.png\tunique\n')
REC = os.path.join(TMP, 'recon.tsv')
with open(REC, 'w', encoding='utf-8') as fh:
    fh.write('# prova\n'
             'lwf/character/enemy/1800/wait/wait_s.png\tlwf/character/enemy/1800/atk1_o/atk1_o_s.png\tshadow-family\tnota\n'
             'lwf/character/enemy/1801/wait/wait_s.png\tlwf/character/enemy/1801/atk1_o/atk1_o_s.png\tshadow-family\tnota\n'
             'lwf/character/enemy/1802/wait/wait_s.png\tlwf/character/enemy/1802/atk1_o/assente.png\tshadow-common\tnota\n')
sys.argv = [sys.argv[0], '--jp', JP, '--jp-root', ROOT, '--donors', DON, '--recon', REC, '--b2016', B16, '--out', os.path.join(TMP, 'out')]
sys.path.insert(0, HERE)
import make_jp_enemies as m  # noqa: E402

errori = []


def check(cond, msg):
    if not cond:
        errori.append(msg)


def put(rel, data):
    p = os.path.join(JP, *rel.split('/'))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as fh:
        fh.write(data)


def lwf(*pngs):
    return b'LWF\x00' + b'\x00'.join(x.encode() for x in pngs) + b'\x00'


def real_lwf(**tex):
    """LWF minima con la sezione texture (nome=(w, h)): stringBytes a 32, texture a 96, stringData a 312."""
    names = list(tex)
    blob = b''.join(n.encode() for n in names)
    b = bytearray(1024)
    struct.pack_into('<ii', b, 32, 400, len(blob))
    b[400:400 + len(blob)] = blob
    o = 0
    for k, n in enumerate(names):
        struct.pack_into('<ii', b, 600 + 8 * k, o, len(n))
        o += len(n)
    struct.pack_into('<ii', b, 312, 600, len(names))
    struct.pack_into('<ii', b, 96, 800, len(names))
    for k, n in enumerate(names):
        struct.pack_into('<iiiif', b, 800 + 20 * k, k, 0, tex[n][0], tex[n][1], 1.0)
    return bytes(b)


def png(w, h):
    """intestazione PNG con IHDR (basta a img_size)."""
    return b'\x89PNG\r\n\x1a\n' + struct.pack('>I', 13) + b'IHDR' + struct.pack('>II', w, h) + b'\x08\x06\x00\x00\x00'


try:
    # 1532: tutte le texture di wait/knockback/dead stanno solo in atk1_o/ col nome wait_*
    put('1532/wait/wait.lwf', lwf('wait_a.png', 'wait_b.png'))
    put('1532/atk1_o/atk1_o.lwf', lwf('wait_a.png', 'wait_b.png', 'atk1_o_c.png'))
    put('1532/atk1_o/wait_a.png', b'A')
    put('1532/atk1_o/wait_b.png', b'B')
    put('1532/atk1_o/atk1_o_c.png', b'C')
    put('1532/knockback/knockback.lwf', lwf('wait_a.png'))
    put('1532/dead/dead.lwf', lwf('wait_b.png'))
    r, todo = m.plan_enemy(1532)
    check(r['status'] == 'completo', 'stesso nome in altra animazione: completo (%s)' % r.get('why'))
    pre = 'lwf/character/enemy/1532/'
    check(todo.get(pre + 'wait/wait_a.png', '').endswith(os.path.join('atk1_o', 'wait_a.png')), 'wait_a da atk1_o')
    check(pre + 'move/move.lwf' in todo and pre + 'move/wait_b.png' in todo, 'move da wait con le texture riempite')
    check(r['anims']['wait']['status'] == 'jp+riempite', 'stato jp+riempite: %s' % r['anims']['wait'])

    # copie candidate diverse: incompleto (mai una texture a caso)
    put('1600/wait/wait.lwf', lwf('wait_a.png'))
    put('1600/atk1_o/atk1_o.lwf', lwf('atk1_o_x.png'))
    put('1600/atk1_o/atk1_o_x.png', b'X')
    put('1600/atk1_o/wait_a.png', b'A1')
    put('1600/knockback/knockback.lwf', lwf('knockback_y.png'))
    put('1600/knockback/knockback_y.png', b'Y')
    put('1600/knockback/wait_a.png', b'A2')
    put('1600/dead/dead.lwf', lwf('dead_z.png'))
    put('1600/dead/dead_z.png', b'Z')
    r, todo = m.plan_enemy(1600)
    check(r['status'] == 'incompleto' and 'wait' in r['why'] and not todo, 'copie diverse: incompleto (%s)' % r)

    # regola vecchia (<anim>_<suffisso> in un'altra animazione) invariata e preferita
    put('20/wait/wait.lwf', lwf('wait_q.png'))
    put('20/atk1_o/atk1_o.lwf', lwf('atk1_o_q.png'))
    put('20/atk1_o/atk1_o_q.png', b'Q')
    put('20/knockback/knockback.lwf', lwf('knockback_k.png'))
    put('20/knockback/knockback_k.png', b'K')
    put('20/dead/dead.lwf', lwf('dead_d.png'))
    put('20/dead/dead_d.png', b'D')
    r, todo = m.plan_enemy(20)
    check(r['status'] == 'completo' and todo.get('lwf/character/enemy/20/wait/wait_q.png', '').endswith('atk1_o_q.png'),
          'regola del suffisso: %s' % r)

    # tabella dei doppioni: wait_a.png manca in tutta la cartella del nemico, il file identico sta in un filmato
    os.makedirs(os.path.join(ROOT, 'lwf', 'drama', '99'))
    with open(os.path.join(ROOT, 'lwf', 'drama', '99', '99_x.png'), 'wb') as fh:
        fh.write(b'X')
    for fam in ('1700', '1701'):
        put(fam + '/wait/wait.lwf', lwf('wait_a.png'))
        put(fam + '/atk1_o/atk1_o.lwf', lwf('atk1_o_c.png'))
        put(fam + '/atk1_o/atk1_o_c.png', b'C')
        put(fam + '/knockback/knockback.lwf', lwf('atk1_o_c.png'))
        put(fam + '/knockback/atk1_o_c.png', b'C')
        put(fam + '/dead/dead.lwf', lwf('atk1_o_c.png'))
        put(fam + '/dead/atk1_o_c.png', b'C')
    r, todo = m.plan_enemy(1700)
    check(r['status'] == 'completo' and todo.get('lwf/character/enemy/1700/wait/wait_a.png') ==
          os.path.join(ROOT, 'lwf', 'drama', '99', '99_x.png'), 'doppione dalla tabella: %s' % r)
    check('1 dalla tabella dei doppioni' in r['anims']['wait'].get('note', ''), 'nota della tabella: %s' % r['anims']['wait'])
    check(todo.get('lwf/character/enemy/1700/move/wait_a.png', '').endswith('99_x.png'), 'move da wait col doppione')
    r, todo = m.plan_enemy(1701)
    check(r['status'] == 'incompleto' and not todo, 'sorgente della tabella assente: incompleto (%s)' % r)
    # la regola del suffisso dello stesso nemico vince sulla tabella (20 ha una riga per wait_q.png)
    r, todo = m.plan_enemy(20)
    check(todo.get('lwf/character/enemy/20/wait/wait_q.png', '').endswith('atk1_o_q.png'), 'suffisso prima della tabella')

    # dimensioni dichiarate (21-10): stesso nome in dead/ ma 146x148 contro 95x65 dichiarate -> non vale
    put('1577/wait/wait.lwf', real_lwf(**{'wait_1.png': (95, 65)}))
    put('1577/dead/dead.lwf', real_lwf(**{'dead_1.png': (146, 148)}))
    put('1577/dead/dead_1.png', png(146, 148))
    for an in ('atk1_o', 'knockback'):
        put('1577/%s/%s.lwf' % (an, an), real_lwf(**{an + '_k.png': (10, 10)}))
        put('1577/%s/%s_k.png' % (an, an), png(10, 10))
    check(m.tex_dims(os.path.join(JP, '1577', 'wait', 'wait.lwf')) == {'wait_1.png': (95, 65)}, 'tex_dims')
    check(m.tex_dims(os.path.join(JP, '1532', 'wait', 'wait.lwf')) is None, 'tex_dims: LWF illeggibile -> None')
    r, todo = m.plan_enemy(1577)
    check(r['status'] == 'incompleto' and 'wait' in r['why'], 'misure diverse: incompleto (%s)' % r)
    put('1577/dead/dead_1.png', png(96, 64))          # +-2 px dell'esportazione: vale
    m._sha.clear()
    r, todo = m.plan_enemy(1577)
    check(r['status'] == 'completo' and todo.get('lwf/character/enemy/1577/wait/wait_1.png', '').endswith('dead_1.png'),
          'misure uguali (+-2): completo (%s)' % r)

    # tabella delle texture ricostruite (I-194): l'ombra persa da un'altra animazione della stessa famiglia
    for fam in ('1800', '1801', '1802', '1803'):
        put(fam + '/wait/wait.lwf', lwf('wait_s.png'))
        for an in ('atk1_o', 'knockback', 'dead'):
            put('%s/%s/%s.lwf' % (fam, an, an), lwf(an + '_s.png'))
            put('%s/%s/%s_s.png' % (fam, an, an), b'S' + fam.encode() + an.encode())  # copie diverse: suffisso ambiguo
    r, todo = m.plan_enemy(1800)
    check(r['status'] == 'completo' and todo.get('lwf/character/enemy/1800/wait/wait_s.png') ==
          os.path.join(JP, '1800', 'atk1_o', 'atk1_o_s.png'), 'ricostruita dalla tabella: %s' % r)
    check('1 ricostruite' in r['anims']['wait'].get('note', ''), 'nota delle ricostruite: %s' % r['anims']['wait'])
    check(todo.get('lwf/character/enemy/1800/move/wait_s.png', '').endswith('atk1_o_s.png'), 'move da wait con la ricostruita')
    r, todo = m.plan_enemy(1801)
    check(todo.get('lwf/character/enemy/1801/wait/wait_s.png', '').endswith('99_x.png'), 'il doppione vero vince sulla ricostruita')
    r, todo = m.plan_enemy(1802)
    check(r['status'] == 'incompleto' and not todo, 'sorgente ricostruita assente: incompleto (%s)' % r)
    r, todo = m.plan_enemy(1803)
    check(r['status'] == 'incompleto' and not todo, 'senza riga: incompleto (mai una texture assente)')

    # famiglie delle missioni 526-979: id corti e lunghi -> famiglia, solo con la cartella JP (o 2016)
    fams = m.oltre_families([1532, 11532, 1906001532, 1600, 249, 10249, 17112004, 160911501, 99999], served={249})
    check(sorted(fams) == [1532, 1600], 'famiglie: %s' % sorted(fams))
    check(sorted(fams.get(1532, [])) == [1532, 11532, 1906001532], 'nemici della famiglia 1532: %s' % fams.get(1532))
    check(249 not in fams, 'famiglia gia\' servita esclusa')
    check(2004 not in fams and 1501 not in fams and 9999 not in fams, 'senza cartella: esclusa')
finally:
    shutil.rmtree(TMP, ignore_errors=True)

if errori:
    print('ERRORI (%d)' % len(errori))
    for e in errori:
        print(' -', e)
    sys.exit(1)
print('OK: test_make_jp_enemies')
