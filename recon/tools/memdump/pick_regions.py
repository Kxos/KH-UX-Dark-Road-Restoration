"""Sceglie le regioni da dumpare da un /proc/<pid>/maps.

Tiene le regioni leggibili anonime (senza file o [anon:...]) e quelle di
lib__57d5__.so; scarta heap Java, cache JIT e regioni piu' grandi del limite.
Stampa 'start end' in esadecimale, una per riga, e un riepilogo su stderr.
"""
import re
import sys

SKIP_ANON = re.compile(r"dalvik|jit|scudo:secondary|stack_and_tls|thread signal stack")
LIMIT = 80 * 1024 * 1024


def main(path):
    picked, total = [], 0
    for line in open(path, encoding="utf-8", errors="replace"):
        parts = line.split(None, 5)
        rng, perm = parts[0], parts[1]
        name = parts[5].strip() if len(parts) == 6 else ""
        if not perm.startswith("r"):
            continue
        start, end = (int(x, 16) for x in rng.split("-"))
        size = end - start
        anon = name == "" or (name.startswith("[anon:") and not SKIP_ANON.search(name))
        if not (anon or "__57d5__" in name) or size > LIMIT:
            continue
        picked.append((start, end, perm, name))
        total += size
    # La shell di Android (mksh) fa i conti a 32 bit: gli offset in byte li
    # calcoliamo qui e dump.sh li passa a dd cosi' come sono, in decimale.
    for start, end, perm, name in picked:
        print(f"{start:x}-{end:x} {start} {end - start}")
    sys.stderr.write(f"regioni: {len(picked)}, totale {total / 2**20:.1f} MB\n")


if __name__ == "__main__":
    main(sys.argv[1])
