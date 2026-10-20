"""Dove finiscono i byte delle risorse nei pezzi del client (files/r/misc.mp4, misc.mp4.1, ...).

Il client concatena i "data" scaricati e li spezza in pezzi da 2 GiB ([fn]): misc.mp4,
poi misc.mp4.1, misc.mp4.2 ... fino a misc.mp4.9 (il lettore [fn] apre al massimo 10
file). Un offset globale del flusso concatenato sta nel pezzo offset >> 31, all'offset locale
offset & 0x7fffffff (DividedFilesInputStream::read, [fn]). Vedi
docs/notes/risorse_layout.md#pezzi.

segments(offset, lunghezza) da' i segmenti (pezzo, offset locale, lunghezza) di una scrittura,
che puo' passare da un pezzo al successivo. Lo usa build-resources.ps1 -Quick per riscrivere nel
guest il pacchetto generato (la coda dei dati) dovunque cada.

    python -I recon/tools/resource_parts.py [--part-size N] <file> <offset globale> <prefisso>

scrive i segmenti del file in <prefisso>.<pezzo> e stampa, uno per riga e separati da tab:
nome del pezzo, offset locale, lunghezza, file del segmento.

Prova al banco dei pezzi oltre 4 GiB (build-resources.ps1 -TestStraddle):

    python -I recon/tools/resource_parts.py --straddle <indice.png> <dati.mp4> <nome> <offset del pacchetto>

stampa quanti byte di riempimento mettere prima del pacchetto (che comincia all'offset globale dato)
perche' il record <nome> stia a cavallo dei 4 GiB, fra misc.mp4.1 e misc.mp4.2.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PART = 1 << 31          # 0x80000000 a 0x19265a0 della libreria
MAX_PARTS = 10          # misc.mp4 + .1 .. .9 (0x19265a8)


def part_name(base, part):
    return base if part == 0 else '%s.%d' % (base, part)


def segments(offset, length, part_size=PART, max_parts=MAX_PARTS):
    if offset < 0 or length < 0:
        raise ValueError('offset o lunghezza negativi')
    if offset + length > part_size * max_parts:
        raise ValueError('dati oltre %d pezzi (%d byte): il client non li legge' % (max_parts, part_size * max_parts))
    out = []
    while length:
        part, local = divmod(offset, part_size)
        n = min(length, part_size - local)
        out.append((part, local, n))
        offset += n
        length -= n
    return out


def straddle_pad(start, rec_off, rec_len, boundary=2 * PART):
    """Riempimento prima di un pacchetto che comincia a start perche' il suo record (rec_off, rec_len)
    abbia meta' dei byte prima del confine e meta' dopo."""
    if rec_len < 2:
        raise ValueError('record troppo corto per stare a cavallo')
    pad = boundary - (start + rec_off + rec_len // 2)
    if pad < 0:
        raise ValueError("il record e' gia' oltre il confine di %d byte" % -pad)
    return pad


def record_span(index, data, name):
    """(offset, lunghezza) del record <name> in un pacchetto di resource_pack.py."""
    import bgad
    for n, off in bgad.read_index(index, None):
        if n == name:
            with open(data, 'rb') as fh:
                fh.seek(off)
                return off, bgad.parse(fh.read(bgad.HDR.size))['end']
    raise KeyError(name)


def main(argv):
    if argv[0] == '--straddle':
        index, data, name, start = argv[1], argv[2], argv[3], int(argv[4])
        print(straddle_pad(start, *record_span(index, data, name)))
        return
    part_size = PART
    if argv[0] == '--part-size':
        part_size = int(argv[1])
        argv = argv[2:]
    src, offset, prefix = argv[0], int(argv[1]), argv[2]
    with open(src, 'rb') as fh:
        fh.seek(0, 2)
        length = fh.tell()
        fh.seek(0)
        for part, local, n in segments(offset, length, part_size):
            seg = '%s.%d' % (prefix, part)
            with open(seg, 'wb') as out:
                left = n
                while left:
                    buf = fh.read(min(left, 1 << 24))
                    out.write(buf)
                    left -= len(buf)
            print('%s\t%d\t%d\t%s' % (part_name('misc.mp4', part), local, n, seg))


if __name__ == '__main__':
    main(sys.argv[1:])
