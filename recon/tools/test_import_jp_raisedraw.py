"""Prova offline di import_jp_raisedraw.py (latest() e ref_map() su tabelle sintetiche).

    python recon/tools/test_import_jp_raisedraw.py        -> «OK: ...» oppure «ERRORI (n)», uscita 1
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import import_jp_raisedraw as m  # noqa: E402

errori = []


def check(cond, msg):
    if not cond:
        errori.append(msg)


def fn(base, orig):
    return f'{base}_{orig.encode("utf-8").hex()}.png'


def T(base, orig, wh, sig):
    return (fn(base, orig), wh, (('T',) + sig,) if sig is not None else ())


# --- latest(): revisione piu' alta della stessa estensione, altrimenti il file senza revisione
with tempfile.TemporaryDirectory() as d:
    for f in ('a.lwf', 'a.00000005.lwf', 'a.00000010.lwf', 'a.00000020.res', 'ab.00000099.lwf', 'b.lwf'):
        open(os.path.join(d, f), 'wb').close()
    check(os.path.basename(m.latest(d, 'a', '.lwf')) == 'a.00000010.lwf', 'latest: revisione piu\' alta')
    check(os.path.basename(m.latest(d, 'b', '.lwf')) == 'b.lwf', 'latest: solo senza revisione')
    check(os.path.basename(m.latest(d, 'a', '.res')) == 'a.00000020.res', 'latest: estensione')
    check(m.latest(d, 'c', '.lwf') is None, 'latest: assente')

# --- ref_map(): rinumerazione, blocco inserito, dimensioni ripetute, scarto di indice
R, G = 'ref', 'tgt'
B = 'ビットマップ '
ref_tex = [T(R, B + '10.png', (10, 10), (1, 1)),     # ancora
           T(R, B + '11.png', (20, 20), (2, 2)),     # ancora
           T(R, B + '12.png', (30, 30), (3, 3)),     # firma condivisa (contenuto x)
           T(R, B + '13.png', (30, 30), (3, 3)),     # firma condivisa (contenuto y)
           T(R, B + '14.png', (40, 40), (4, 4)),     # ancora
           T(R, 'yellow.png', (50, 50), (5, 5)),     # stessa firma di white_back
           T(R, 'white_back.png', (50, 50), (5, 5)),
           T(R, B + '15.png', (60, 60), (6, 6))]     # stesse dimensioni di una target, altra firma
md5 = {t[0]: f'c{i}' for i, t in enumerate(ref_tex)}
ref = {'base': R, 'tex': ref_tex, 'md5': md5}
# la target rinumera (12->7, 13->8...) e inserisce un blocco nuovo in testa allo scarto di indice
tgt_tex = [T(G, B + '1.png', (99, 99), (9, 9)),      # blocco inserito: assente in ref
           T(G, B + '5.png', (10, 10), (1, 1)),
           T(G, B + '6.png', (20, 20), (2, 2)),
           T(G, B + '7.png', (30, 30), (3, 3)),
           T(G, B + '8.png', (30, 30), (3, 3)),
           T(G, B + '9.png', (40, 40), (4, 4)),
           T(G, 'yellow.png', (50, 50), (5, 5)),     # fuori blocco (white_back assente): per nome
           T(G, B + '2.png', (60, 60), (7, 7))]      # sole dimensioni uguali: non si accetta
out, conflict, pos_only = m.ref_map({'base': G, 'tex': tgt_tex}, ref)
g = lambda o: fn(G, o)  # noqa: E731
r = lambda o: fn(R, o)  # noqa: E731
check(out.get(g(B + '5.png')) == (r(B + '10.png'), 'unique-anchor'), 'ancora 5->10')
check(out.get(g(B + '9.png')) == (r(B + '14.png'), 'unique-anchor'), 'ancora 9->14')
check(out.get(g(B + '7.png')) == (r(B + '12.png'), 'position-corroborated'), 'ambigua 7->12')
check(out.get(g(B + '8.png')) == (r(B + '13.png'), 'position-corroborated'), 'ambigua 8->13')
check(g(B + '1.png') not in out, 'blocco inserito: mancante')
check(out.get(g('yellow.png')) == (r('yellow.png'), 'name-corroborated'), 'yellow per nome+firma')
check(g(B + '2.png') not in out, 'niente ripiego per sole dimensioni')
check(not conflict and not pos_only, f'nessun conflitto/position-only: {conflict} {pos_only}')

# ambigue senza ancora su un lato -> position-only (mai usate)
tgt2 = [T(G, B + '7.png', (30, 30), (3, 3)), T(G, B + '8.png', (30, 30), (3, 3)),
        T(G, B + '9.png', (40, 40), (4, 4))]
ref2 = {'base': R, 'tex': ref_tex[2:5], 'md5': md5}
out, conflict, pos_only = m.ref_map({'base': G, 'tex': tgt2}, ref2)
check(set(pos_only) == {g(B + '7.png'), g(B + '8.png')}, f'position-only senza ancora prima: {pos_only}')
check(g(B + '7.png') not in out and g(B + '9.png') in out, 'position-only non mappate')

# nome generico «ビットマップ N» fuori blocco con firma condivisa: non per nome
tgt3 = [T(G, B + '12.png', (30, 30), (3, 3))]
ref3 = {'base': R, 'tex': [ref_tex[3], ref_tex[0], ref_tex[2]], 'md5': md5}
out, _, _ = m.ref_map({'base': G, 'tex': tgt3}, ref3)
check(g(B + '12.png') not in out, 'nome generico non vale come prova')

if errori:
    print(f'ERRORI ({len(errori)})')
    for e in errori:
        print(' -', e)
    sys.exit(1)
print('OK: latest() e ref_map() (ancore, posizione corroborata, nome, position-only, sole dimensioni)')
