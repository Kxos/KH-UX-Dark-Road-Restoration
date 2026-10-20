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
"""
import sys

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


def main(argv):
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
