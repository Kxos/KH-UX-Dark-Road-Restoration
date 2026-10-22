# Phase C — the fields of the `master::` tables

Target: `libcocos2dcpp.so` arm64 of the **WW 4.3.1-72** build, the same as phase A.

| | |
|---|---|
| `master::` classes with RTTI | **107** |
| Tables with extracted fields | **106** (the 107th is `Base`, the abstract base class) |
| Total fields | **1,739** |
| **Of the 54 tables removed in the switch to offline** | **54 out of 54, 759 fields** |
| Run time | ~3 seconds |

Results: `recon/out/master_fields_ww431.json` (with addresses and order) and
`master_fields_ww431.txt` (readable list).

---

## 1. Ghidra was not needed

The plan was to extract the fields from the decompiled code, with a heuristic: group the
functions that reference many short snake_case strings. Two problems, discovered
by trying.

**The fields are not in snake_case, they are in camelCase** — `medalId`, `maxAttack`,
`shuffleSkillGroupId`. A filter tuned for snake_case would have missed almost all of them.

**And above all the heuristic is not needed**, because an exact attribution exists. The
work is done on the ELF, in pure Python, without a disassembler and without the 829 MB
Ghidra project.

## 2. The chain

Four steps, each of which is a fact of the ABI, not a conjecture.

**1 · RTTI cannot be stripped.** Every class with virtual methods leaves in
`.rodata` its own typeinfo name — `N6master5MedalE` — because it is needed at runtime by
`typeid` and `dynamic_cast`. All 107 `master::` classes have it.

**2 · From the name to the vtable.** According to the Itanium ABI the string is pointed to by the
`name` field of the typeinfo (offset +8), and the typeinfo object is pointed to by slot +8
of the vtable. In a shared library those slots are zero in the file: the
real value is in the addend of an `R_AARCH64_RELATIVE` relocation. So you do not
read the bytes, you read `.rela.dyn` — 194,145 relocations, indexed once.

Result: all 106 concrete vtables, each with **3 virtual methods**. Slot
0 is the same address for all 106 — the destructor of `master::Base` —
while slots 1 and 2 are unique per class. It is the structural confirmation that the
tables all derive from a common base.

**3 · Whoever installs the vtable is a method of that class.** A constructor
starts by writing the vtable pointer into the object. The functions that
build that address are therefore the constructors and destructors of that
class **and no other**: it is not a heuristic with false positives, it is
an attribution. For each of the 106 classes exactly one function results.

**4 · The deserializer compares each key with a literal.** The strings that
function touches *are* the fields of the table.

### Two details that make step 4 practical

**Function boundaries come from `.eh_frame`.** The binary is stripped, but
C++ with exceptions describes every function in an FDE with start address and
length: **87,437 functions with exact boundaries**, for free, without analysis.

**String references are decoded by hand.** On AArch64 an address does not
fit in the instruction: it is built with `ADRP` (4 KB page) plus `ADD` (offset),
or `ADRP` plus `LDR` via the GOT. Following those three forms while tracking register state
is enough to rebuild every addressed constant. It is not an emulation: a
register's state is forgotten as soon as another instruction writes it, and it works because the
ADRP/ADD pair is almost always adjacent.

## 3. The order of the fields is the order of the columns

Addresses are collected **in order of appearance in the code**, not into a
set. That order is the order in which the parser reads the fields, i.e. the order
of the table's columns — and the primary key comes first in **93 tables
out of 106**:

```
Medal        medalId, imageId, thumbId, cutinId, imageCategory, artId, displayId, sortId, …
Shop         shopId, productId, sortId, type, os, price, coin, addCoin, …
LoginBonus   loginBonusId, bonusType, title, description, comment, day, startDate, endDate, …
Stage        stageId, stageBinId, id, name, mapName, useAp, chapterId, worldId, …
```

Throwing away that order would have meant rebuilding it by hand for 106 tables.

## 4. The `*Misc` tables are key/value pairs

Eight tables have **only two fields**: `Misc`, `DarkMisc`, `XtresMisc`,
`MedalMisc`, `BattleMisc`, `DarkBattleMisc` (`{miscId, value}` and similar),
`SkillExp` (`{expId, value}`), `DarkMapList` (`{mapId, mapListId}`).

It is not a failed extraction: they are genuinely two-column tables, where the
configuration is in the rows. A minimum threshold of 3 fields — the first one I had
set — discarded all eight of them, and they looked like a hole in the method.

## 5. Cross-check with phase A

Every field is read by a single call, always to the same function: `0x61f8ec`.
Added to the image base with which Ghidra loads the ELF (`0x100000`) it is
**`[fn]`**, i.e. exactly the JSON field getter already identified in
phase A as the one used by `[fn]` to read `nativeSessionId` and
`sharedSecurityKey`.

Two independent analyses — one in Ghidra, one in Python on the ELF — arrive at the
same function. It is the cross-check that was needed.

## 6. What is still missing: the types

We have the **names** of the fields and their **order**, not the types. The parser calls the
generic getter and then converts *inline*, so the call target does not
say whether a field is an integer, a string or a boolean.

Three routes, in order of cost:

1. **Naming conventions cover a lot**: `*Id`/`sortId`/`num`/`price` integers,
   `valid*`/`display`/`show` booleans, `name`/`flavor`/`explanation`/`comment`
   strings, `startDate`/`endDate` timestamps.
2. **Ghidra's decompiled code** of the 106 parsing functions — now that it is known
   exactly which ones they are, it costs minutes, not hours.
3. **The real data**, when the client talks to our server: the types are read
   from the values.

To define the DB schema point 1 is enough to start, and point 3 corrects it.

## 7. Tools produced

| File | |
|---|---|
| `recon/tools/vtables.py` | vtable and virtual methods of a class, via RTTI and relocations |
| `recon/tools/codeindex.py` | function boundaries from `.eh_frame`, constants addressed by ADRP/ADD |
| `recon/tools/master_fields.py` | the complete phase C pipeline |

No dependencies, like the rest of `recon/tools/`. `vtables.py` and `codeindex.py`
know nothing about `master::`: they work for any C++ class of this binary,
and `codeindex.py` redoes in 3 seconds, for all 87,437 functions, the xref on the
strings that in phase A had cost a Ghidra project.

```bash
python recon/tools/master_fields.py recon/ext/ww431/libcocos2dcpp.so \
    --out recon/out/master_fields_ww431.json \
    --text recon/out/master_fields_ww431.txt
```
