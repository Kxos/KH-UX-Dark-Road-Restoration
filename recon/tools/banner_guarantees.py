"""Riserve degli slot, pity e Tier dei banner originali (sotto-progetto 2b, spec 2026-10-17-shop-garanzie-2b-design.md 4.1).

Legge le frasi di garanzia delle note («Guarantees one Tier 4 or lower 7★ Medal.», «Guarantees one of the following
Medals: ...», «Guarantees one 6★ Prime - KH Cloud.», «Guarantees one Trait Medal #48.», «If bought 5 times, at least
one 7★ HD Axel is guaranteed.») e scrive il blocco `guarantee` del catalogo v3:

    slots[]   riserve in ordine di testo {kind, slot, count, star, names, tierMin, tierMax} (+ conflict se True)
    pity, pityNames, pityStar, pitySlot, pityGift (Task 2), erratum, source
    list, count, slot   = prima riserva a lista (compatibilita' col sotto-progetto 2), every come prima

Regole dall'audit delle garanzie del 17-10 (tmp/sp2/audit-guarantees.md, sezione 4) e decisioni dell'utente
(tmp/sp2b/decisioni.md): 1 (liste sugli slot 6★ solo coi nomi con variante 6★), 2 (B0733 due liste),
3 («every Nth draw» resta pity: nessun pityMode), 4 (B0419/B0421 corretti, errore nei Details), 5 (pity «one 6★ X»
col 7★ in cima: primo 6★, altrimenti primo 5★). Usato da make_banner_catalog.build_catalog.
"""
import collections
import copy
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import banner_sources as bsrc  # noqa: E402
import make_banner_catalog as mbc  # noqa: E402

NUMS = {**mbc.NUM, 'oe': 1}  # «Guarantees oe of the following» (B0695, refuso della wiki)
NUMW = '|'.join(sorted(NUMS, key=len, reverse=True)) + r'|\d+'


# ---------- testo ----------
def clean_markup(text):
    """markup della wiki -> testo: {{EX|X}} -> «X [EX]», {{b|X|Y}} -> «X [Y]», {{KA|n}} -> «Key Art #n»,
    {{n|Trait Medal|48}} -> «Trait Medal #48», [[X]] / [[X|Y]] -> «X» / «Y»; via le <ref> e il grassetto"""
    t = re.sub(r'<ref[^>/]*>.*?</ref>|<ref[^>]*/>', '', text.replace("'''", ''), flags=re.S)
    return mbc.LINK.sub(lambda m: (bsrc.toks(m.group(0)) or [''])[0], t)


def sentences(text):
    """frasi del testo ripulito: fine al primo [.!|] fuori dalle abbreviazioni («Illus.», «Mr.», «Dr.», «Ver.»)
    e non dentro un numero («KH 0.2 Kairi»), come mbc._cut"""
    out = []
    while text:
        k = mbc._cut(text)
        out.append(text[:k].strip())
        text = text[k + 1:]
    return [s for s in out if s]


def _num(w):
    w = w.lower()
    return int(w) if w.isdigit() else NUMS[w]


# ---------- riserve ----------
PITY_SENT = re.compile(r'[Ii]f bought \d+ times|within \d+ draws')
LIST_RE = re.compile(r'(?:[Gg]uarantee[sd]?|guaranteed to (?:get|receive)) (?:at least )?(' + NUMW + r') '
                     r'(?:boosted versions? )?of (?:the )?following (?:(\d)★ )?(?:[Bb]oosted Ver )?[Mm]edals?\b([^:!]{0,160}?)(?:[:!]|$)\s*')
SNPLUS_RE = re.compile(r'[Gg]uarantees (' + NUMW + r') (?:boosted )?SN\+ or SN\+\+ Medals?')
TRAIT_RE = re.compile(r'^[Gg]uarantee[sd]? (' + NUMW + r') (?:(\d)★ )?Trait Medals?\b')
TIER_RE = re.compile(r'\b[Tt]ier (\d+)((?:,? (?:or )?(?:[Tt]ier )?\d+\b(?!★))*)(?: or (higher|lower|above))?')
SAB_RE = re.compile(r'(?:SAB|Special Attack Bonus Tier) of (\d+) or (higher|above)|Level (\d+) SAB')
TIER_COUNT = re.compile(r'(?:[Gg]uarantee[sd]?|guaranteed to (?:get|receive)) (?:either )?(?:at least )?(' + NUMW + r')\b')
NAMED_RE = re.compile(r'^[Gg]uarantee[sd]? (?:either (?:(?:a|an|one) )?|(?:a|an|one) )(?:(\d)★ )?(.*)$')
NAMED_CUT = re.compile(r'\s+(?:Has|Includes|When|Available|If)\b.*$')
NOT_NAMED = re.compile(r'Tier \d|Trait Medal|of (?:the )?following [Mm]edals|SN\+ or SN\+\+|\brandom\b|\bEpic\b|Imitation|'
                       r'Organization XIII|\bset \d', re.I)
GENERIC = re.compile(r'^(?:reversed|upright|copy|epic|random|organization|both)\b|\bmedals?\b|\bset \d|special attack|^\d+$|^(?:higher|lower|above)\b|'
                     r'^\d★|\btier \d', re.I)
SNPLUS = ['sn+ - ', 'sn++ - ', 'supernova+ - ']


def _res(kind, count, star, names=(), tmin=None, tmax=None, **extra):
    return {'kind': kind, 'count': count, 'star': star, 'names': list(names), 'tierMin': tmin, 'tierMax': tmax, **extra}


def _names(seg):
    """nomi di medaglia di un elenco, senza i resti generici («Medal», «Tier 4», «higher», «Copy Medal»)"""
    names = (re.sub(r'\s*\d★\s*', ' ', n).strip() for n in mbc.list_names(seg))  # «Stained Glass #7 [EX+] 7★»
    return [n for n in names if n and not GENERIC.search(n) and not mbc.non_medal(n, ())]


def _tier(s):
    """(tierMin, tierMax) della frase, o None. «Tier 4 or lower» -> (None, 4), «or higher/above» -> (4, None),
    «Tier 3 or 4» / «Tier 6, Tier 7, or Tier 8» -> min..max, «SAB of 3 or higher» / «Level 3 SAB» -> (3, None)
    (ricerca §3: il SAB del 2016 e' il Tier; per «Level 3 SAB» potrebbero essere 3 pallini, incerto)"""
    m = SAB_RE.search(s)
    if m:
        return int(m.group(1) or m.group(3)), None
    m = TIER_RE.search(s)
    if not m:
        return None
    nums = [int(m.group(1))] + [int(x) for x in re.findall(r'\d+', m.group(2) or '')]
    if m.group(3) == 'lower':
        return None, max(nums)
    if m.group(3) in ('higher', 'above'):
        return min(nums), None
    return min(nums), max(nums)


def _parse_one(s):
    """riserva di una frase, o None"""
    if PITY_SENT.search(s):
        return None
    m = LIST_RE.search(s)
    if m:
        star = m.group(2) or (re.search(r'\bat (\d)★', m.group(3) or '') or [None, None])[1]
        return _res('list', _num(m.group(1)), int(star) if star else None, mbc._dedup(mbc.list_names(s[m.end():])))
    m = SNPLUS_RE.search(s)
    if m:
        return _res('list', _num(m.group(1)), None, prefix=SNPLUS)
    m = TRAIT_RE.search(s)
    if m:
        return _res('trait', _num(m.group(1)), int(m.group(2)) if m.group(2) else None)
    c = TIER_COUNT.search(s)
    if (c or 'one of which is guaranteed' in s) and (TIER_RE.search(s) or SAB_RE.search(s)):
        tmin, tmax = _tier(s)
        # «receive five 7★ Medals, one of which is guaranteed to be a tier 4 Medal» (B0340): una
        count = _num(c.group(1)) if c else 1
        star = re.search(r'(\d)★', re.split(r'\s+with\b', s)[0])
        head = re.sub(r'^.*?guarantee[sd]? (?:to (?:get|receive) |to be )?(?:either )?(?:at least )?(?:' + NUMW + r')?\s*', '',
                      re.split(r'\s+with\b|\s+\(', s)[0], flags=re.I)
        return _res('tier', count, int(star.group(1)) if star else None, _names(head), tmin, tmax)
    m = NAMED_RE.match(s)
    if m and not NOT_NAMED.search(s):
        names = mbc._dedup(_names(NAMED_CUT.sub('', m.group(2))))
        if names:
            return _res('list', 1, int(m.group(1)) if m.group(1) else None, names)
    return None


def parse_reservations(text):
    """riserve del testo (note o colonna guarantees) in ordine di frase, senza `slot`:
    [{kind, count, star, names, tierMin, tierMax}] (`prefix` per «SN+ or SN++»: nomi risolti in guarantee_v3)"""
    return [r for r in (_parse_one(s) for s in sentences(clean_markup(text))) if r]


def assign_slots(reservations, mix):
    """slot (indice in slotRarities = mix espanso) di ogni riserva: prima quelle con stella, sui primi `count` slot
    liberi e consecutivi di quella stella; poi le altre, sui primi liberi consecutivi dall'alto (audit sezione 4).
    Una riserva che non trova posto prende i primi liberi dall'alto (o lo slot 0) e porta `conflict: True`.
    `star` = stella dello slot assegnato."""
    rar = [r for r, n in mix for _ in range(n)]
    used = set()
    out = [None] * len(reservations)

    def run(cnt, star=None):
        # dall'alto = dalla stella piu' alta (il mix del catalogo e' gia' decrescente; l'ordine vale anche se non lo e')
        for i in sorted(range(len(rar) - cnt + 1), key=lambda i: (-rar[i], i)):
            idx = range(i, i + cnt)
            if all(j not in used and (star is None or rar[j] == star) for j in idx):
                return i
        return None

    order = [i for i, r in enumerate(reservations) if r.get('star')] + [i for i, r in enumerate(reservations) if not r.get('star')]
    for i in order:
        r = dict(reservations[i])
        r['names'] = list(r.get('names') or [])
        cnt = max(1, r.get('count') or 1)
        at = run(cnt, r.get('star')) if r.get('star') else run(cnt)
        if at is None:
            # nessun blocco consecutivo: i primi `count` slot liberi uno per uno (dall'alto), mai uno gia' preso;
            # conflict True e slotsUsed = gli slot davvero usati (slot..slot+count-1 non vale piu'; vuoto se non ce n'e')
            free = sorted((j for j in range(len(rar)) if j not in used), key=lambda j: (-rar[j], j))[:cnt]
            at = free[0] if free else 0
            r['conflict'] = True
            r['slotsUsed'] = free
            used.update(free)
        else:
            used.update(range(at, at + cnt))
        r['slot'] = at
        r['star'] = rar[at] if rar else r.get('star')
        out[i] = {k: r[k] for k in ('kind', 'slot', 'count', 'star', 'names', 'tierMin', 'tierMax')} | \
            {k: v for k, v in r.items() if k in ('prefix', 'conflict', 'slotsUsed')}
    return out


def covered(s):
    """indici degli slot di una riserva: slotsUsed (conflitto) o slot..slot+count-1"""
    return list(s['slotsUsed']) if 'slotsUsed' in s else list(range(s['slot'], s['slot'] + max(1, s['count'])))


# ---------- pity ----------
def pity_slot(names, star, slots, mix):
    """(pitySlot, pityStar): la riserva che contiene un nome della pity; altrimenti, fra gli slot di `star` (default:
    la stella dello slot 0), il primo libero, poi il primo riservato a una Trait Medal (generico nel server: la lista
    e il Tier restano interi), poi il primo; senza slot di quella stella, la stella piu' alta sotto (decisione 5:
    «one 6★ X» col 7★ in cima -> primo 6★, altrimenti primo 5★); altrimenti 0"""
    rar = [r for r, n in mix for _ in range(n)]
    for s in slots:
        if set(s['names']) & set(names):
            return s['slot'], star or s['star']
    if not rar:
        return 0, star
    reserved = {j for s in slots for j in covered(s)}
    trait = {j for s in slots if s['kind'] == 'trait' for j in covered(s)}
    target = star or rar[0]
    if target not in rar:
        lower = [r for r in rar if r < target]
        if not lower:
            return 0, star or rar[0]
        target = max(lower)
    free = [j for j, r in enumerate(rar) if r == target and j not in reserved]
    tr = [j for j, r in enumerate(rar) if r == target and j in trait]
    return (free or tr or [rar.index(target)])[0], star or target


def _pity(text, featured, slots, mix):
    """(pity_of, stella scritta o None): la stella scritta serve a build_catalog per ricalcolare pitySlot/pityStar
    dopo la decisione 1 (senza stella scritta, pityStar = stella dello slot finale)"""
    t = clean_markup(text)
    g = mbc.guarantee_of({'guarantees': '', 'featured_medals': ''}, t)
    if not g['pity']:
        return {'pity': None, 'pityNames': [], 'pityStar': None, 'pitySlot': None}, None
    ss = sentences(t)
    sent = next((s for s in ss if re.search(r'[Ii]f bought \d+ times', s)), None) or next((s for s in ss if PITY_SENT.search(s)), '')
    # «As Trait Medal #2 is guaranteed within 5 draws» (B0267): via il «as» davanti
    names = [n for n in (re.sub(r'^as ', '', x) for x in g['featured']) if 'following' not in n]
    # frase «If bought» troncata dal TSV a 500 caratteri, senza «is guaranteed» («... at least one KH 0.2 Kair», B0169):
    # solo l'ultimo nome si completa col nome della vetrina che lo continua (la vetrina puo' contenere anche il troncato)
    if names and re.search(r'[Ii]f bought', sent) and not re.search(r'\b(?:is|are) (?:guaranteed|included)', sent):
        names[-1] = next((f for f in featured if f.startswith(names[-1]) and f != names[-1]), names[-1])
    names = mbc._dedup(names) or list(featured)
    star = re.search(r'(\d)★', re.split(r'\s+(?:is|are) (?:guaranteed|included)', sent)[0])
    star = int(star.group(1)) if star else None
    slot, pstar = pity_slot(names, star, slots, mix)
    return {'pity': g['pity'], 'pityNames': names, 'pityStar': pstar, 'pitySlot': slot}, star


def pity_of(text, featured, slots, mix):
    """{pity, pityNames, pityStar, pitySlot} dalla frase «If bought N times, at least one [S★] X is guaranteed» o
    «X is guaranteed within N draws»: pityNames = X (default `featured`), pityStar = S (default la stella di pitySlot).
    Le frasi «every Nth draw» restano pity (decisione 3)."""
    return _pity(text, featured, slots, mix)[0]


# ---------- override scritti a mano (casi visti solo nelle immagini o nei notice) ----------
# Campi: count/star (prima riserva a lista), slots (riserve al posto di quelle lette), append (riserve in piu'),
# pityNames, erratum, source (sempre). `prefix` = nomi del master che iniziano cosi' (risolti in guarantee_v3).
KH3 = ['kh iii ']
WJE12 = ['sn++ - strike form sora', 'sn++ - master eraqus', 'sn++ - xemnas', 'sn++ - kh com ansem', 'sn++ - key art #23',
         'sn++ - kh iii sf sora', 'sn++ - kh iii vanitas', 'sn++ - xemnas b', 'sn++ - kh iii ansem the wise', 'sn++ - key art #24',
         'sn++ - kh iii gambler', 'sn++ - master xehanort']
WJE16 = WJE12 + ['sn++ - kh iii sora', 'sn++ - kh iii riku', 'sn++ - kh iii kairi', 'sn++ - illustrated zexion']


def _wje(names, notice):
    return {'slots': [_res('list', 1, 7, names)],
            'source': f'notice {notice} («one of the following Boosted Ver Medals», elenco solo nel notice)'}


ERRATUM = ('Due to a settings error in the original deal, {wrong} was guaranteed in this deal instead of {right} '
           '(official notice 47129). This deal guarantees {right} as intended.')
SLOT_OVERRIDES = {
    'B0049': {'count': 1, 'source': 'note «Guarantees at least one of the following medals» (audit D5)'},
    'B0055': {'count': 1, 'source': 'note «Guarantees at least one of the following medals» (audit D5; elenco troncato a 500 caratteri)'},
    'B0372': {'count': 1, 'star': 7, 'source': 'note «Guarantees one of the following 7★ Medals» (audit D5)'},
    'B0695': {'count': 1, 'source': 'note «Guarantees oe of the following Medals» (audit D5, refuso della wiki)'},
    'B0678': {'count': 1, 'source': 'image 10678 («KH III Medal ×1» + «5★+ ×4»; il testo «three» e\' un errore della wiki, audit D4)'},
    'B0733': {'count': 3, 'star': 7, 'append': [_res('list', 7, 6, prefix=KH3)],
              'source': 'image 10733 («SN+ Medal ×3» + «KH III Medal+ ×7», decisione 2): lista KH III = medaglie «KH III» del master'},
    'B0740': {'append': [_res('list', 5, 6, prefix=KH3)],
              'source': 'image 10740 («One of 3 Medals ×1» + «SN+ Medal ×3» + «KH III Medal+ ×5»): nomi KH III non nelle note, '
                        'lista = medaglie «KH III» del master come B0733'},
    'B0721': _wje(WJE12, 69545), 'B0725': _wje(WJE12, 69550), 'B0726': _wje(WJE12, 69551),
    'B0734': _wje(WJE16, 70068), 'B0739': _wje(WJE16, 70578),
    'B0419': {'pityNames': ['hd aced [ex+]'], 'erratum': ERRATUM.format(wrong='HD Gula [EX+]', right='HD Aced [EX+]'),
              'source': 'notice 47129 (scambio Gula/Aced, decisione 4)'},
    'B0421': {'pityNames': ['hd gula [ex+]'], 'erratum': ERRATUM.format(wrong='HD Aced [EX+]', right='HD Gula [EX+]'),
              'source': 'notice 47129 (scambio Gula/Aced, decisione 4)'},
}


def _master_names(medal_rows):
    """{nome normalizzato: {stelle}} delle medaglie d'attacco del master, senza le boosted"""
    out = collections.defaultdict(set)
    for r in sorted(medal_rows, key=lambda r: r['medalId']):
        if r.get('type', 1) == 1 and not mbc.is_boosted(r):
            out[mbc.norm(r['name'])].add(r['rare'])
    return out


def star_filter(names, star, rares_of):
    """decisione 1: in una lista su uno slot di stella S restano i nomi con una variante S (e quelli sconosciuti,
    rares_of -> None); se non ne resta nessuno la lista resta com'e' (lo slot da' la stella che c'e')"""
    keep = [n for n in names if rares_of(n) is None or star in rares_of(n)]
    return keep if keep else list(names)


def guarantee_v3(row, notes, mix, featured, medal_rows, rares_of=None, keep_prefix=False):
    """blocco `guarantee` del catalogo v3 (contratto in global-constraints.md): riserve dalle note (o dalla colonna
    guarantees se le note non ne hanno), slot, pity, decisione 1, override per ultimi. Decisione 1 con
    rares_of(nome) -> {stelle} o None (default: i nomi di medal_rows); build_catalog la rifa' sui nomi risolti
    del catalogo e qui passa `lambda n: None` (i nomi del master non sono quelli della wiki). keep_prefix: le riserve
    coi nomi presi dal master per prefisso tengono `prefix` (build_catalog le esclude dalle date del debutto: quei
    nomi non sono scritti nel banner, e lo toglie prima di scrivere il catalogo)."""
    ov = SLOT_OVERRIDES.get(row.get('row_id'), {})
    master = _master_names(medal_rows)
    res = parse_reservations(notes) or parse_reservations(row.get('guarantees') or '')
    if 'slots' in ov:
        res = copy.deepcopy(ov['slots'])
    first = next((r for r in res if r['kind'] == 'list'), None)
    for k in ('count', 'star'):
        if k in ov and first:
            first[k] = ov[k]
    res += copy.deepcopy(ov.get('append', []))
    for r in res:
        if 'prefix' in r:
            r['names'] = [n for n in master if n.startswith(tuple(r['prefix']))]
    slots = assign_slots(res, mix)
    for s in slots:
        if not keep_prefix:
            s.pop('prefix', None)
        if s['kind'] == 'list':
            s['names'] = star_filter(s['names'], s['star'], rares_of or master.get)
    old = mbc.guarantee_of({'guarantees': row.get('guarantees') or '', 'featured_medals': row.get('featured_medals') or ''}, notes)
    p, written = _pity(notes + ' | ' + (row.get('guarantees') or ''), featured, slots, mix)
    if 'pityNames' in ov and p['pity']:
        p['pityNames'] = list(ov['pityNames'])
        p['pitySlot'], p['pityStar'] = pity_slot(p['pityNames'], written, slots, mix)
    lst = next((s for s in slots if s['kind'] == 'list'), None)
    out = {'list': list(lst['names']) if lst else [], 'count': lst['count'] if lst else 0, 'slot': lst['slot'] if lst else 0,
           'pity': p['pity'], 'every': old['every'], 'slots': slots,
           'pityNames': p['pityNames'], 'pityStar': p['pityStar'], 'pitySlot': p['pitySlot'], 'pityGift': None,
           'erratum': ov.get('erratum'), 'source': ov.get('source')}
    if keep_prefix:  # per build_catalog: stella scritta della pity (tolta prima di scrivere il catalogo)
        out['_pityStarWritten'] = written
    return out
