"""Riassume una traccia di trace.sh: i path toccati dal processo del gioco.

Uso: python trace_files.py <trace.txt> <pid> [fino_a_regex]
Stampa, in ordine, ogni path passato a openat/faccessat/readlinkat/newfstatat/
statx/execve/unlinkat/mkdirat con l'esito, fermandosi alla prima riga che
corrisponde a fino_a_regex (es. il file di verdetto). Dedup per (syscall, path).
"""
import re
import sys

CALLS = ("openat", "faccessat", "faccessat2", "readlinkat", "newfstatat", "statx",
         "execve", "unlinkat", "mkdirat", "getdents64", "connect", "socket", "kill",
         "tgkill", "ptrace", "prctl", "uname")
LINE = re.compile(r"^(\d+)\s+(\S+)\s+(\w+)\((.*)\)\s+=\s+(.*)$")
PATH = re.compile(r'"([^"]*)"')


def main(path, pid, stop=None):
    stop_re = re.compile(stop) if stop else None
    seen = set()
    for raw in open(path, encoding="utf-8", errors="replace"):
        m = LINE.match(raw.rstrip())
        if not m or m.group(1) != pid:
            continue
        ts, call, args, res = m.group(2), m.group(3), m.group(4), m.group(5)
        if call not in CALLS:
            continue
        ps = PATH.findall(args)
        key = (call, ps[0] if ps else args[:60])
        if key in seen:
            continue
        seen.add(key)
        res = res.split(" (")[0] if "=" not in res else res
        print(f"{ts} {call:11} {key[1][:110]:110} = {res[:40]}")
        if stop_re and stop_re.search(raw):
            print("--- fermato qui ---")
            break


if __name__ == "__main__":
    main(*sys.argv[1:4])
