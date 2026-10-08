"""Costruisce vmread (ELF statico Linux x86_64) da vmread.c con il gcc MinGW del PC.

MinGW produce file Windows: qui si compila senza libc, si collega in un PE solo per
risolvere le chiamate interne (tutte relative), si estrae la sezione .text con objcopy
e la si avvolge in un ELF minimo (un segmento PT_LOAD RX). Si controlla che nel file
oggetto non ci siano rilocazioni assolute.

    python build_vmread.py [cartella gcc bin]
"""
import os
import re
import struct
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BIN = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(
    subprocess.check_output(['where', 'gcc'], text=True).splitlines()[0])
tool = lambda n: os.path.join(BIN, n + '.exe')  # noqa: E731
src = os.path.join(HERE, 'vmread.c')
obj = os.path.join(HERE, 'vmread.o')
exe = os.path.join(HERE, 'vmread.exe')
raw = os.path.join(HERE, 'vmread.text')
out = os.path.join(HERE, 'vmread')

flags = ['-O2', '-ffreestanding', '-fno-asynchronous-unwind-tables', '-fno-stack-protector',
         '-mno-stack-arg-probe', '-fno-builtin', '-mgeneral-regs-only']
subprocess.check_call([tool('gcc'), '-c', *flags, src, '-o', obj])
rel = subprocess.check_output([tool('objdump'), '-r', obj], text=True)
bad = [l for l in rel.splitlines() if re.search(r'IMAGE_REL_AMD64_(ADDR|SECREL)', l)]
if bad:
    sys.exit('rilocazioni assolute:\n' + '\n'.join(bad))
subprocess.check_call([tool('gcc'), '-nostdlib', '-e', '_start', '-Wl,--no-insert-timestamp',
                       obj, '-o', exe])
subprocess.check_call([tool('objcopy'), '-O', 'binary', '-j', '.text', exe, raw])
syms = subprocess.check_output([tool('nm'), exe], text=True)
text_va = int(re.search(r'^([0-9a-f]+) T _start$', syms, re.M).group(1), 16)
hdr = subprocess.check_output([tool('objdump'), '-h', exe], text=True)
text_start = int(re.search(r'\.text\s+[0-9a-f]+\s+([0-9a-f]+)', hdr).group(1), 16)
code = open(raw, 'rb').read()
entry_off = text_va - text_start

BASE = 0x400000
HDR = 0x40 + 0x38
ehdr = struct.pack('<4sBBBBB7sHHIQQQIHHHHHH', b'\x7fELF', 2, 1, 1, 0, 0, b'\0' * 7,
                   2, 0x3e, 1, BASE + HDR + entry_off, 0x40, 0, 0, 0x40, 0x38, 1, 0, 0, 0)
size = HDR + len(code)
phdr = struct.pack('<IIQQQQQQ', 1, 5, 0, BASE, BASE, size, size, 0x1000)
with open(out, 'wb') as f:
    f.write(ehdr + phdr + code)
for p in (obj, exe, raw):
    os.remove(p)
print('vmread: %d byte di codice, ingresso +%#x' % (len(code), entry_off))
