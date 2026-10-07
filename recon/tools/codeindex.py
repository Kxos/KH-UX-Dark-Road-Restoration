"""Indice del codice AArch64 di un ELF: confini di funzione e costanti indirizzate.

Due problemi, due soluzioni che non richiedono un disassemblatore completo.

**Dove comincia e finisce una funzione.** Il binario e' strippato, quindi la
tabella dei simboli non lo dice. Ma il C++ con eccezioni genera `.eh_frame`, e
ogni FDE dichiara indirizzo iniziale e lunghezza della funzione a cui si
riferisce: 87.437 funzioni con confini esatti, gratis. `.eh_frame_hdr` contiene
gia' la tabella ordinata (pc, FDE) e si legge in sequenza.

**Quali costanti tocca una funzione.** Su AArch64 un indirizzo non sta
nell'istruzione: si costruisce con `ADRP` (pagina da 4 KB) seguito da `ADD`
(offset dentro la pagina), oppure `ADRP` + `LDR` quando passa dalla GOT. Basta
seguire quelle tre forme tenendo lo stato dei registri per ricostruire ogni
indirizzo di cui la funzione parla — stringhe, vtable, tabelle di dati.

Non e' un'emulazione: lo stato di un registro viene semplicemente dimenticato
appena un'altra istruzione lo scrive. Per il nostro scopo basta, perche' la
coppia ADRP/ADD e' quasi sempre adiacente.
"""

import struct
import time


def function_ranges(elf):
    """{indirizzo iniziale: lunghezza} per ogni funzione descritta da .eh_frame."""
    s = elf.section('.eh_frame_hdr')
    if s is None:
        return {}
    d = elf.data
    base = s['addr']
    p = s['off'] + 4                      # salta version + i 3 byte di encoding
    p += 4                                # eh_frame_ptr, non ci serve
    (fde_count,) = struct.unpack_from('<I', d, p)
    p += 4
    out = {}
    for i in range(fde_count):
        pc_rel, fde_rel = struct.unpack_from('<ii', d, p + i * 8)
        fde = base + fde_rel
        fo = elf.vaddr_to_off(fde)
        if fo is None:
            continue
        # FDE: length(4) CIE_ptr(4) initial_location(sdata4 pcrel) address_range(4)
        (init_loc,) = struct.unpack_from('<i', d, fo + 8)
        (rng,) = struct.unpack_from('<I', d, fo + 12)
        out[fde + 8 + init_loc] = rng
    return out


def cstring(elf, va, limit=200):
    """Stringa C stampabile all'indirizzo dato, o None."""
    o = elf.vaddr_to_off(va)
    if o is None:
        return None
    d = elf.data
    end = min(o + limit, len(d))
    out = []
    i = o
    while i < end:
        b = d[i]
        if b == 0:
            break
        if b < 0x20 or b > 0x7e:
            return None
        out.append(chr(b))
        i += 1
    else:
        return None                       # nessun terminatore entro il limite
    return ''.join(out) if out else None


def build_index(elf, ranges=None, verbose=False):
    """{inizio funzione: ([(pc, indirizzo)] in ordine di codice, set(bersagli BL))}.

    Gli indirizzi restano *in ordine di apparizione*, non in un insieme: per un
    deserializzatore quell'ordine e' l'ordine in cui legge i campi, cioe'
    l'ordine delle colonne della tabella. Buttarlo via costerebbe poi lavoro.
    """
    if ranges is None:
        ranges = function_ranges(elf)
    text = elf.section('.text')
    tlo, thi, toff = text['addr'], text['addr'] + text['size'], text['off']
    d = elf.data
    index = {}
    t0 = time.time()
    for start, length in ranges.items():
        if not (tlo <= start < thi) or start + length > thi:
            continue
        o = toff + (start - tlo)
        regs = {}
        addrs = []
        calls = set()
        for i in range(0, length, 4):
            (insn,) = struct.unpack_from('<I', d, o + i)
            if (insn & 0x9f000000) == 0x90000000:          # ADRP Xd, page
                immlo = (insn >> 29) & 3
                imm = (((insn >> 5) & 0x7ffff) << 2) | immlo
                if imm & (1 << 20):
                    imm -= (1 << 21)
                regs[insn & 0x1f] = ((start + i) & ~0xfff) + (imm << 12)
            elif (insn & 0xff800000) == 0x91000000:        # ADD Xd, Xn, #imm
                rn, rd = (insn >> 5) & 0x1f, insn & 0x1f
                if rn in regs:
                    im = (insn >> 10) & 0xfff
                    if (insn >> 22) & 1:
                        im <<= 12
                    regs[rd] = regs[rn] + im
                    addrs.append((start + i, regs[rd]))
                elif rd in regs:
                    del regs[rd]
            elif (insn & 0xffc00000) == 0xf9400000:        # LDR Xt, [Xn, #imm*8]
                rn, rt = (insn >> 5) & 0x1f, insn & 0x1f
                if rn in regs:
                    slot = regs[rn] + (((insn >> 10) & 0xfff) << 3)
                    addrs.append((start + i, slot))
                    tgt = elf.read_q(slot)
                    if tgt:
                        addrs.append((start + i, tgt))
                if rt in regs:
                    del regs[rt]
            elif (insn & 0xfc000000) == 0x94000000:        # BL
                im = insn & 0x3ffffff
                if im & (1 << 25):
                    im -= (1 << 26)
                calls.add(start + i + (im << 2))
            else:
                rd = insn & 0x1f                           # il registro e' scritto:
                if rd in regs:                             # lo stato non vale piu'
                    del regs[rd]
        index[start] = (addrs, calls)
    if verbose:
        import sys
        sys.stderr.write('[codeindex] %d funzioni in %.1fs\n'
                         % (len(index), time.time() - t0))
    return index


def strings_of(elf, index, func):
    """Stringhe raggiunte dalla funzione, nell'ordine in cui le tocca."""
    addrs, _ = index.get(func, ([], set()))
    out = []
    seen = set()
    for _pc, a in addrs:
        s = cstring(elf, a)
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def referencing(index, addr):
    """Funzioni che costruiscono l'indirizzo dato."""
    return sorted(f for f, (a, _) in index.items()
                  if any(v == addr for _pc, v in a))


def address_users(index):
    """{indirizzo: [funzioni che lo costruiscono]}, in un solo passaggio.

    Cercare un indirizzo alla volta su 87.000 funzioni costa una scansione
    ciascuno; questo indice inverso si paga una volta sola.
    """
    users = {}
    for f, (addrs, _) in index.items():
        last = None
        for _pc, a in addrs:
            if a == last:
                continue
            last = a
            lst = users.setdefault(a, [])
            if not lst or lst[-1] != f:
                lst.append(f)
    return users
