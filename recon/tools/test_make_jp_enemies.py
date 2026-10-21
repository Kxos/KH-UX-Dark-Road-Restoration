"""Prova offline delle regole di make_jp_enemies.py su cartelle finte (nessun dato vero, nessuna scrittura in enemy_gen).

    python recon/tools/test_make_jp_enemies.py        -> «OK: ...» oppure «ERRORI (n)», uscita 1

Casi (21-10, I-009 Task 7): texture scartate come doppioni dall'estrazione JP e rimaste con lo STESSO nome in
un'altra animazione dello stesso nemico (es. 1532: wait.lwf cita wait_<x>.png, il file vero sta in atk1_o/), famiglie
dei nemici delle missioni 526-979 (oltre_families: displayId = famiglia se la cartella JP c'e'), tabella dei doppioni
(jp_dedup_donors.tsv: texture rimasta solo in un'altra cartella JP, es. lwf/drama/<id>/).
"""
import os
import shutil
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
             'lwf/character/enemy/20/wait/wait_q.png\tlwf/drama/99/99_x.png\tunique\n')
sys.argv = [sys.argv[0], '--jp', JP, '--jp-root', ROOT, '--donors', DON, '--b2016', B16, '--out', os.path.join(TMP, 'out')]
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
