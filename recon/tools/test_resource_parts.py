"""Prova di resource_parts.py (pezzi misc.mp4, .1, .2 ... del client, I-171):
    python -I recon/tools/test_resource_parts.py"""
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import resource_parts as rp  # noqa: E402

G = 1 << 31

# nomi dei pezzi come [fn] («%s.%d» dall'1)
assert rp.part_name('misc.mp4', 0) == 'misc.mp4'
assert rp.part_name('misc.mp4', 1) == 'misc.mp4.1'
assert rp.part_name('misc.mp4', 9) == 'misc.mp4.9'

# tutto dentro misc.mp4.1 (la 47: pacchetto generato a 4.102.444.170)
assert rp.segments(4102444170, 184549376) == [(1, 4102444170 - G, 184549376)]
# a cavallo fra .1 e .2
assert rp.segments(2 * G - 100, 300) == [(1, G - 100, 100), (2, 0, 200)]
# tutto dentro .2
assert rp.segments(2 * G + 5, 10) == [(2, 5, 10)]
# esattamente al confine: comincia .2, niente segmento vuoto in .1
assert rp.segments(2 * G, 10) == [(2, 0, 10)]
# finisce esattamente al confine: niente .2 vuoto
assert rp.segments(2 * G - 10, 10) == [(1, G - 10, 10)]
# lungo piu' di un pezzo: tre segmenti
assert rp.segments(G - 1, G + 2) == [(0, G - 1, 1), (1, 0, G), (2, 0, 1)]
# dimensione del pezzo diversa (per le prove)
assert rp.segments(7, 10, part_size=8) == [(0, 7, 1), (1, 0, 8), (2, 0, 1)]
assert rp.segments(0, 0) == []
# oltre i 10 file che il client legge (misc.mp4.9 al massimo): errore
for bad in ((10 * G - 1, 2), (10 * G, 1)):
    try:
        rp.segments(*bad)
    except ValueError:
        pass
    else:
        raise AssertionError(bad)
assert rp.segments(10 * G - 1, 1) == [(9, G - 1, 1)]

# riga di comando: file spezzato nei segmenti, una riga per segmento
with tempfile.TemporaryDirectory() as td:
    src = os.path.join(td, 'gen.bin')
    data = bytes(range(256)) * 4
    with open(src, 'wb') as fh:
        fh.write(data)
    out = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'resource_parts.py'), '--part-size', '1000',
                          src, '1900', os.path.join(td, 'seg')], capture_output=True, text=True, check=True).stdout
    rows = [line.split('\t') for line in out.splitlines()]
    assert [r[:3] for r in rows] == [['misc.mp4.1', '900', '100'], ['misc.mp4.2', '0', '924']], rows
    assert open(rows[0][3], 'rb').read() == data[:100]
    assert open(rows[1][3], 'rb').read() == data[100:]
print('resource_parts: ok')
