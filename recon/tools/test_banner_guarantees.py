"""Prova offline di banner_guarantees.py (riserve degli slot, pity, Tier) sulle frasi reali dei banner.

    python recon/tools/test_banner_guarantees.py        -> «OK: ...» oppure «ERRORI (n)», uscita 1

Frasi dal catalogo (guaranteesText e note) e dall'audit delle garanzie del 17-10 (tmp/sp2/audit-guarantees.md).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import banner_guarantees as g  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

errori = []


def check(cond, msg):
    if not cond:
        errori.append(msg)


M3 = [[7, 1], [6, 1], [5, 8]]

# --- D1: Tier sul 7★, lista sul 6★, pity sul 7★ (B0306)
B0306 = ("Guarantees one Tier 4 or lower 7★ Medal. Guarantees one of the following Medals: Illustrated Kairi [EX], "
         "Illustrated Xion [EX], HD Zack, Yuna & Rikku & Paine, The World Ends with You Art 2, HD Pete, HD Zexion, HD Larxene. "
         "If bought 5 times, at least one 7★ HD Axel is guaranteed.")
s = g.assign_slots(g.parse_reservations(B0306), M3)
check(s[0] == {'kind': 'tier', 'slot': 0, 'count': 1, 'star': 7, 'names': [], 'tierMin': None, 'tierMax': 4}, f'B0306 tier {s[0]}')
check(s[1]['kind'] == 'list' and s[1]['slot'] == 1 and s[1]['star'] == 6 and len(s[1]['names']) == 8
      and 'yuna & rikku & paine' in s[1]['names'], f'B0306 lista sul 6 {s[1]}')
p = g.pity_of(B0306, ['hd axel'], s, M3)
check(p == {'pity': 5, 'pityNames': ['hd axel'], 'pityStar': 7, 'pitySlot': 0}, f'B0306 pity {p}')
# lo stesso testo col markup della wiki (note complete)
W0306 = ("Guarantees one Tier 4 or lower 7★ Medal. Guarantees one of the following Medals: {{EX|Illustrated Kairi}}, "
         "{{EX|Illustrated Xion}}, [[HD Zack]], [[Yuna & Rikku & Paine]]. Has a small chance of drawing a boosted version of "
         "6★ Illustrated Kairi [EX] with 1000 more base strength and defense. If bought 5 times, at least one 7★ [[HD Axel]] is guaranteed.")
s = g.assign_slots(g.parse_reservations(W0306), M3)
check([x['kind'] for x in s] == ['tier', 'list'] and s[1]['names'][:2] == ['illustrated kairi [ex]', 'illustrated xion [ex]'],
      f'B0306 col markup {s}')

# --- D7: medaglia nominata, pity sulla riserva che la contiene (B0321)
B0321 = "Guarantees one Tier 4 7★ Medal. Guarantees one 6★ Prime - Illustrated Axel. If bought 5 times, at least one 7★ Prime - Illustrated Axel is guaranteed."
s = g.assign_slots(g.parse_reservations(B0321), M3)
check(s[0]['tierMin'] == 4 and s[0]['tierMax'] == 4 and s[1]['names'] == ['prime - illustrated axel'] and s[1]['slot'] == 1, f'B0321 {s}')
check(g.pity_of(B0321, ['prime - illustrated axel'], s, M3)['pitySlot'] == 1, 'B0321 pity sulla riserva')

# --- D7 + Trait + D9: pity 7★ su un mix 6★/5★ (B0397)
B0397 = "Guarantees one 6★ Prime - KH Cloud. Guarantees one Trait Medal #48. If bought 5 times, at least one 7★ Prime - KH Cloud is guaranteed."
s = g.assign_slots(g.parse_reservations(B0397), [[6, 2], [5, 8]])
check([x['kind'] for x in s] == ['list', 'trait'] and [x['slot'] for x in s] == [0, 1], f'B0397 {s}')
check(g.pity_of(B0397, ['supernova - sephiroth', 'prime - kh cloud'], s, [[6, 2], [5, 8]]) ==
      {'pity': 5, 'pityNames': ['prime - kh cloud'], 'pityStar': 7, 'pitySlot': 0}, 'B0397 pity 7 sulla lista')

# --- D3: due liste (B0629)
B0629 = ("Guarantees one of the following Medals: [[SN++ - Rock Troll]], [[SN+ - Marionette]], [[SN+ - Patchwork Animals]], "
         "[[SN+ - Flood]], or [[SN+ - Parasol Beauty]]. Guarantees three of the following Medals: SN++ - Rock Troll, "
         "SN+ - Marionette, [[Supernova - KH III Roxas]], [[KH III Neoshadow]], {{KA|20}}. If bought 10 times, one SN++ - Rock Troll is guaranteed.")
s = g.assign_slots(g.parse_reservations(B0629), [[7, 1], [6, 3], [5, 6]])
check([(x['kind'], x['slot'], x['count'], x['star']) for x in s] == [('list', 0, 1, 7), ('list', 1, 3, 6)], f'B0629 {s}')
check(len(s[0]['names']) == 5 and 'key art #20' in s[1]['names'], f'B0629 nomi {s}')
check(g.pity_of(B0629, ['sn++ - rock troll'], s, [[7, 1], [6, 3], [5, 6]])['pitySlot'] == 0, 'B0629 pity sulla prima lista')

# --- Tier: SAB del 2016 (ricerca §3: «SAB of N» e «Level N SAB» = filtro del Tier)
s = g.assign_slots(g.parse_reservations('Guarantees at least three medals with a SAB of 3 or higher. If bought 10 times, at least one Sora & Donald & Goofy is guaranteed.'),
                   [[5, 3], [4, 7]])
check(len(s) == 1 and {k: s[0][k] for k in ('kind', 'count', 'tierMin', 'tierMax', 'slot')} ==
      {'kind': 'tier', 'count': 3, 'tierMin': 3, 'tierMax': None, 'slot': 0}, f'B0051 SAB of 3 {s}')
# B0046: «(with Level 3 SAB)» letto come Tier >= 3 come B0051; potrebbe voler dire 3 pallini (ricerca §3, incerto)
s = g.parse_reservations('Guarantees five Organization XIII medals (with Level 3 SAB).')
check(len(s) == 1 and s[0]['kind'] == 'tier' and s[0]['count'] == 5 and s[0]['tierMin'] == 3 and s[0]['tierMax'] is None, f'B0046 {s}')
s = g.parse_reservations('Guarantees two 6★ Medals with a Special Attack Bonus Tier of 3 or higher, with their Special Attack strengthened 3 times.')
check(len(s) == 1 and (s[0]['kind'], s[0]['count'], s[0]['star'], s[0]['tierMin']) == ('tier', 2, 6, 3), f'B0079 {s}')

# --- Tier: intervalli, elenchi, nomi alternativi
s = g.parse_reservations('Guarantees one 7★ Tier 3 or 4 Medal. Guarantees one of the following Medals: A, B.')
check((s[0]['tierMin'], s[0]['tierMax'], s[0]['star']) == (3, 4, 7), f'B0355 {s}')
s = g.parse_reservations('Guarantees one Tier 6, Tier 7, or Tier 8 7★ Medal with one of the following skills at max level: Attack Boost VI Max, Triple Threat II.')
check((s[0]['tierMin'], s[0]['tierMax'], s[0]['star'], s[0]['names']) == (6, 8, 7, []), f'B0419 tier {s}')
s = g.parse_reservations('Guarantees one 7★ Tier 7, Supernova - HD Terra, Supernova - HD Ventus, or Supernova - HD Aqua with one of the following skills at max level: X.')
check(s[0]['kind'] == 'tier' and s[0]['tierMin'] == 7 and s[0]['tierMax'] == 7
      and s[0]['names'] == ['supernova - hd terra', 'supernova - hd ventus', 'supernova - hd aqua'], f'B0442 nomi alternativi {s}')
s = g.parse_reservations('Guarantees one 7★ Supernova - HD Terra, Supernova - HD Ventus, Supernova - HD Aqua, or Tier 7 Medal.')
check(s[0]['kind'] == 'tier' and s[0]['tierMin'] == 7 and len(s[0]['names']) == 3, f'B0502 tier in fondo {s}')
s = g.parse_reservations('Guarantees one Tier 4 7★ Medal or 7★ Final Boss Xion with one of the following Skills at max level: X.')
check(s[0]['names'] == ['final boss xion'] and s[0]['tierMax'] == 4, f'B0375 {s}')
s = g.parse_reservations('Guarantees one Tier 4 or higher Medal with its special attack strengthened 1 to 3 times.')
check((s[0]['tierMin'], s[0]['tierMax'], s[0]['star'], s[0]['names']) == (4, None, None, []), f'or higher {s}')
s = g.parse_reservations('Guarantees seven Tier 5 or higher Medals.')
check(s[0]['count'] == 7, f'seven {s}')
s = g.parse_reservations('In addition, each pull from this deal guarantees at least one recent Tier 5 Medal pre-strengthened to 1, 2, or 3 Special Attack dots!')
check(len(s) == 1 and s[0]['tierMin'] == 5 and s[0]['tierMax'] == 5 and s[0]['names'] == [], f'B0153 {s}')
s = g.parse_reservations('Once per day, for 1200 Jewels you can pull from this deal to receive five 7★ Medals, one of which is guaranteed to be a tier 4 Medal!')
check(len(s) == 1 and (s[0]['count'], s[0]['star'], s[0]['tierMin'], s[0]['tierMax']) == (1, 7, 4, 4), f'B0340 {s}')

# --- SN+ o SN++: lista dei nomi del pool risolta in guarantee_v3
s = g.parse_reservations('Guarantees two SN+ or SN++ Medals. Guarantees one of the following Medals: SN++ - Toon Naminé, SN+ - Angelic Amber.')
check(s[0]['kind'] == 'list' and s[0]['count'] == 2 and s[0]['names'] == [] and s[1]['count'] == 1, f'B0750 {s}')

# --- liste: «at least», «oe», «7★ Medals», «at 7★», boosted
s = g.parse_reservations('Guarantees at least one of the following medals, with its Special Attack strengthened 3 times: Black Coat King Mickey, Zack, Mr. Smee.')
check(s[0]['count'] == 1 and s[0]['names'] == ['black coat king mickey', 'zack', 'mr. smee'], f'B0049 {s}')
s = g.parse_reservations('Guarantees oe of the following Medals: {{KA|24}}, [[SN++ - Fiend]].')
check(s[0]['count'] == 1 and s[0]['names'] == ['key art #24', 'sn++ - fiend'], f'B0695 {s}')
s = g.parse_reservations('Guarantees one of the following 7★ Medals: [[Prime - Illustrated Axel]], {{KA|17}}.')
check(s[0]['star'] == 7, f'B0372 {s}')
s = g.parse_reservations('Guarantees two of the following Medals at 7★: Key Art #20, SN - KH III Master Xehanort.')
check(s[0]['star'] == 7 and s[0]['count'] == 2, f'at 7 {s}')
s = g.parse_reservations('Guarantees three boosted versions of the following Medals: [[SN++ - Xemnas]], [[SN++ - KH CoM Ansem]].')
check(s[0]['count'] == 3 and len(s[0]['names']) == 2, f'boosted {s}')
s = g.parse_reservations('Guarantees a KH 0.2 Kairi Medal. Guarantees one of the following Medals: Key Art "Sky", Key Art "Bonds".')
check([x['names'] for x in s] == [['kh 0.2 kairi'], ['key art "sky"', 'key art "bonds"']], f'B0241 KH 0.2 {s}')
s = g.parse_reservations('Guarantees a [[SN++ - Halloween Goofy B]], [[SN++ - Illus. Halloween Sora]], or [[SN++ - Halloween Donald B]] with one of the following skills: [[ATK B X Max & Lux++]].')
check(s[0]['names'] == ['sn++ - halloween goofy b', 'sn++ - illus. halloween sora', 'sn++ - halloween donald b'], f'B0740 nominate {s}')
s = g.parse_reservations('Guarantees one {{KA|16}} Has a small chance of drawing a boosted Key Art #16 with 1000 more base strength.')
check(s and s[0]['names'] == ['key art #16 [ex+]'], f'nome senza punto {s}')
# frasi che non sono riserve
for t in ('Guarantees one 6★ Medal.', 'Guarantees one 5★ Reversed Medal.', 'Guarantees at least one Epic Medal.',
          'Guarantees ten random Attack Medal or Subslot Medal.', 'Guarantees one 7★ .', 'Has a small chance of drawing a boosted Tier 4 Medal.',
          'Guarantees two 6★ Medals with their Special Attack strengthened 3 times.'):
    check(g.parse_reservations(t) == [], f'non riserva: {t} -> {g.parse_reservations(t)}')
s = g.parse_reservations('Guarantees two Trait Medal #302.')
check(s == [{'kind': 'trait', 'count': 2, 'star': None, 'names': [], 'tierMin': None, 'tierMax': None}], f'trait {s}')

# --- assegnazione: riserve con stella prima, poi le altre dall'alto; conflitti
s = g.assign_slots([{'kind': 'list', 'count': 3, 'star': None, 'names': ['a'], 'tierMin': None, 'tierMax': None},
                    {'kind': 'tier', 'count': 1, 'star': 6, 'names': [], 'tierMin': 5, 'tierMax': None}], [[7, 3], [6, 7]])
check([(x['slot'], x['star']) for x in s] == [(0, 7), (3, 6)] and not any('conflict' in x for x in s), f'stella prima {s}')
s = g.assign_slots([{'kind': 'tier', 'count': 1, 'star': 7, 'names': [], 'tierMin': 4, 'tierMax': None},
                    {'kind': 'tier', 'count': 1, 'star': 7, 'names': [], 'tierMin': 6, 'tierMax': None}], [[7, 1], [6, 1], [5, 8]])
check(s[0]['slot'] == 0 and 'conflict' not in s[0] and s[1]['slot'] == 1 and s[1].get('conflict') is True, f'conflitto {s}')
s = g.assign_slots([{'kind': 'list', 'count': 4, 'star': None, 'names': ['a'], 'tierMin': None, 'tierMax': None}], [[6, 1], [5, 2]])
check(s[0]['slot'] == 0 and s[0].get('conflict') is True and s[0]['slotsUsed'] == [0, 1, 2], f'conflitto: piu slot del lotto {s}')
# fix 1, punto 7: liberi non consecutivi -> uno per uno, mai uno slot gia' preso, slotsUsed esplicito
s = g.assign_slots([{'kind': 'tier', 'count': 1, 'star': 6, 'names': [], 'tierMin': 5, 'tierMax': None},
                    {'kind': 'list', 'count': 3, 'star': 7, 'names': ['a'], 'tierMin': None, 'tierMax': None}], [[7, 1], [6, 2], [5, 2]])
check(s[0]['slot'] == 1 and s[1].get('conflict') is True and s[1]['slotsUsed'] == [0, 2, 3] and s[1]['slot'] == 0,
      f'conflitto con liberi non consecutivi {s}')
check('slotsUsed' not in s[0] and g.covered(s[1]) == [0, 2, 3] and g.covered(s[0]) == [1], 'covered')

# --- pity: decisione 5 (B0319: «one 6★ X» con slot 0 a 7★ -> primo 6★, altrimenti primo 5★)
B0319 = ("Guarantees one Tier 4 7★ Medal with one of the following skills: Attack Boost VI Max. "
         "If bought 5 times, at least one 6★ Illustrated Kairi [EX] is guaranteed.")
s = g.assign_slots(g.parse_reservations(B0319), [[7, 1], [5, 9]])
p = g.pity_of(B0319, ['illustrated kairi [ex]'], s, [[7, 1], [5, 9]])
check(p == {'pity': 5, 'pityNames': ['illustrated kairi [ex]'], 'pityStar': 6, 'pitySlot': 1}, f'B0319 primo 5★ {p}')
s = g.assign_slots(g.parse_reservations(B0319), [[7, 1], [6, 2], [5, 7]])
check(g.pity_of(B0319, ['illustrated kairi [ex]'], s, [[7, 1], [6, 2], [5, 7]])['pitySlot'] == 1, 'B0319 primo 6★')
# pity senza stella: stella dello slot 0, primo slot libero (la lista non perde lo slot, D11)
T = 'Guarantees two of the following Medals: A, B. If bought 3 times, one C is guaranteed.'
s = g.assign_slots(g.parse_reservations(T), [[6, 3], [5, 7]])
check(g.pity_of(T, ['c'], s, [[6, 3], [5, 7]]) == {'pity': 3, 'pityNames': ['c'], 'pityStar': 6, 'pitySlot': 2}, 'pity sullo slot libero')
# tutti gli slot della stella riservati (B0528: lista x2 + Trait sui tre 6★): la pity prende lo slot della Trait
T = 'Guarantees two of the following Medals: A, B. Guarantees one Trait Medal #80. If bought 5 times, one C is guaranteed.'
s = g.assign_slots(g.parse_reservations(T), [[6, 3], [5, 7]])
check(g.pity_of(T, ['c'], s, [[6, 3], [5, 7]])['pitySlot'] == 2, 'pity sullo slot della Trait, la lista resta intera')
# bersaglio non scritto («at least one 7★ is guaranteed», B0419): la vetrina
p = g.pity_of('If bought 5 times, at least one 7★ is guaranteed.', ['hd aced [ex+]', 'hd gula [ex+]'], [], M3)
check(p['pityNames'] == ['hd aced [ex+]', 'hd gula [ex+]'] and p['pityStar'] == 7, f'pity senza nome {p}')
p = g.pity_of('[[SN - KH III Dark Riku]] is guaranteed within 10 draws.', [], [], [[7, 1], [5, 9]])
check(p['pity'] == 10 and p['pityNames'] == ['sn - kh iii dark riku'], f'within {p}')
p = g.pity_of('If bought 5 times, at least one KH 0.2 Kair', ['kh 0.2 kairi', 'kh 0.2 kair'], [], [[6, 1], [5, 9]])
check(p['pityNames'] == ['kh 0.2 kairi'], f'B0169 nome troncato dal TSV {p}')
# fix 1, punto 2: un nome intero non si «completa» con un nome della vetrina piu' lungo
p = g.pity_of('If bought 5 times, at least one HD Axel is guaranteed.', ['hd axel [ex]'], [], M3)
check(p['pityNames'] == ['hd axel'], f'nome intero non completato {p}')
p = g.pity_of('If bought 3 times, one SN++ - KH III Terra-Xehanort, SN++ - KH III Terra, or SN++ - Fiend is guaranteed.',
              ['sn++ - kh iii terra-xehanort', 'sn++ - kh iii terra', 'sn++ - fiend'], [], [[6, 3], [5, 7]])
check(p['pityNames'] == ['sn++ - kh iii terra-xehanort', 'sn++ - kh iii terra', 'sn++ - fiend'], f'B0637 terra resta {p}')
p = g.pity_of('If bought 3 times, one SN++ - KH III Terra, or SN++ - Fiend is guaranteed.',
              ['sn++ - kh iii terra-xehanort'], [], [[6, 3], [5, 7]])
check(p['pityNames'] == ['sn++ - kh iii terra', 'sn++ - fiend'], f'nome non nella vetrina, frase intera {p}')
check(g.pity_of('Guarantees one of the following Medals: A.', [], [], M3) ==
      {'pity': None, 'pityNames': [], 'pityStar': None, 'pitySlot': None}, 'senza pity')

# --- guarantee_v3: decisione 1, SN+/SN++, compatibilita', override
COLS = ['row_id', 'name', 'start_pt', 'guarantees', 'featured_medals', 'rarity_mix']
R = lambda **k: {**{c: '' for c in COLS}, **k}  # noqa: E731
MR = [{'medalId': 1, 'name': 'KH III Pooh', 'rare': 6, 'type': 1}, {'medalId': 2, 'name': 'KH III Pooh', 'rare': 7, 'type': 1},
      {'medalId': 3, 'name': 'SN++ - Fiend', 'rare': 7, 'type': 1}, {'medalId': 4, 'name': 'SN+ - Flood', 'rare': 7, 'type': 1},
      {'medalId': 5, 'name': 'Supernova+ - Ira', 'rare': 7, 'type': 1}, {'medalId': 6, 'name': 'SN - Angelic Amber', 'rare': 7, 'type': 1},
      {'medalId': 7, 'name': 'KH III Goofy', 'rare': 6, 'type': 1},
      {'medalId': 1000003, 'name': 'SN++ - Fiend', 'rare': 7, 'type': 1, 'groupId': 3}]  # boosted: mai nelle liste
gv = g.guarantee_v3(R(row_id='BX'), 'Guarantees two of the following Medals: [[KH III Pooh]], [[SN++ - Fiend]], [[Alice]]. If bought 3 times, one KH III Pooh is guaranteed.',
                    [[6, 3], [5, 7]], ['kh iii pooh'], MR)
check(gv['slots'][0]['names'] == ['kh iii pooh', 'alice'], f'decisione 1: solo i nomi con variante 6★ (o sconosciuti) {gv["slots"]}')
check((gv['list'], gv['count'], gv['slot']) == (['kh iii pooh', 'alice'], 2, 0), f'compatibilita list/count/slot {gv}')
check(gv['pitySlot'] == 0 and gv['pityStar'] == 6 and gv['pityGift'] is None and gv['erratum'] is None and gv['source'] is None
      and gv['every'] is None and gv['pity'] == 3, f'campi v3 {gv}')
gv = g.guarantee_v3(R(row_id='BX'), 'Guarantees one of the following Medals: [[SN++ - Fiend]]. Next.', [[6, 1], [5, 9]], [], MR)
check(gv['slots'][0]['names'] == ['sn++ - fiend'], 'decisione 1: lista che resterebbe vuota intatta')
gv = g.guarantee_v3(R(row_id='BX'), 'Guarantees two SN+ or SN++ Medals.', [[7, 3], [6, 7]], [], MR)
check(gv['slots'][0]['names'] == ['sn++ - fiend', 'sn+ - flood', 'supernova+ - ira'] and 'prefix' not in gv['slots'][0],
      f'SN+ o SN++ dal master {gv["slots"]}')
gv = g.guarantee_v3(R(row_id='BX'), 'Draws from sets 1.1.', [[6, 1], [5, 9]], [], MR)
check(gv['slots'] == [] and (gv['list'], gv['count'], gv['slot'], gv['pity']) == ([], 0, 0, None), f'nessuna garanzia {gv}')
gv = g.guarantee_v3(R(row_id='BX', guarantees='Guarantees one 6★ Prime - KH Cloud.'), 'Draws from sets 1.1.', [[6, 1], [5, 9]], [], MR)
check(gv['slots'] and gv['slots'][0]['names'] == ['prime - kh cloud'], f'note senza garanzie: colonna guarantees {gv}')

# fix 1, punto 8: la stella scritta della pity arriva a build_catalog (None se non scritta), mai nel blocco pubblico
T = 'Guarantees two of the following Medals: [[KH III Pooh]]. If bought 3 times, one SN++ - Fiend is guaranteed.'
gv = g.guarantee_v3(R(row_id='BX'), T, [[6, 3], [5, 7]], [], MR, keep_prefix=True)
check(gv['_pityStarWritten'] is None and '_pityStarWritten' not in g.guarantee_v3(R(row_id='BX'), T, [[6, 3], [5, 7]], [], MR),
      f'stella della pity non scritta {gv}')
gv = g.guarantee_v3(R(row_id='BX'), B0306, M3, ['hd axel'], MR, keep_prefix=True)
check(gv['_pityStarWritten'] == 7, 'stella della pity scritta')

# override: ogni voce ha la fonte
O = g.SLOT_OVERRIDES
for rid in ('B0678', 'B0733', 'B0740', 'B0049', 'B0055', 'B0372', 'B0695', 'B0721', 'B0725', 'B0726', 'B0734', 'B0739', 'B0419', 'B0421'):
    check(rid in O and O[rid].get('source'), f'override {rid}')
check(O['B0678']['count'] == 1 and 'image 10678' in O['B0678']['source'], 'B0678 count 1')
check(O['B0419']['pityNames'] == ['hd aced [ex+]'] and O['B0421']['pityNames'] == ['hd gula [ex+]']
      and O['B0419']['erratum'] and O['B0421']['erratum'], 'B0419/B0421 erratum')
gv = g.guarantee_v3(R(row_id='B0678'), 'Guarantees three of the following Medals: [[SN++ - Fiend]], [[KH III Pooh]]. If bought 3 times, one SN++ - Fiend is guaranteed.',
                    [[6, 1], [5, 4]], [], MR)
check(gv['count'] == 1 and gv['slots'][0]['count'] == 1 and gv['source'] == O['B0678']['source'], f'B0678 applicato {gv}')
T33 = 'Guarantees ten of the following Medals: [[SN++ - Fiend]], [[SN+ - Flood]], [[Supernova+ - Ira]]. If bought 10 times, one SN++ - Fiend is guaranteed.'
gv = g.guarantee_v3(R(row_id='B0733'), T33, [[7, 3], [6, 7]], [], MR)
check([(x['kind'], x['slot'], x['count'], x['star']) for x in gv['slots']] == [('list', 0, 3, 7), ('list', 3, 7, 6)]
      and gv['slots'][0]['names'] == ['sn++ - fiend', 'sn+ - flood', 'supernova+ - ira']
      and gv['slots'][1]['names'] == ['kh iii pooh', 'kh iii goofy'], f'B0733 due liste {gv["slots"]}')
T40 = ('Guarantees a [[SN++ - Fiend]] with one of the following skills: [[X]]. Guarantees three of the following Medals: '
       '[[SN++ - Fiend]], [[SN+ - Flood]]. Has a small chance.')
gv = g.guarantee_v3(R(row_id='B0740'), T40, [[7, 4], [6, 6]], [], MR)
check([(x['slot'], x['count'], x['star']) for x in gv['slots']] == [(0, 1, 7), (1, 3, 7), (4, 5, 6)], f'B0740 {gv["slots"]}')
gv = g.guarantee_v3(R(row_id='B0721'), 'You are guaranteed to get one of the following Boosted Ver Medals.', [[7, 1], [5, 9]], [], MR)
check(gv['slots'][0]['slot'] == 0 and gv['slots'][0]['star'] == 7 and len(gv['slots'][0]['names']) == 12
      and 'sn++ - master eraqus' in gv['slots'][0]['names'] and 'notice 69545' in gv['source'], f'B0721 dal notice {gv["slots"]}')
gv = g.guarantee_v3(R(row_id='B0419'), 'Guarantees one Tier 6, Tier 7, or Tier 8 7★ Medal with one of the following skills at max level: X. '
                    'Guarantees one Trait Medal #39. If bought 5 times, at least one 7★ is guaranteed.', M3, ['hd aced [ex+]', 'hd gula [ex+]'], MR)
check(gv['pityNames'] == ['hd aced [ex+]'] and gv['pityStar'] == 7 and gv['pitySlot'] == 0 and gv['erratum']
      and [x['kind'] for x in gv['slots']] == ['tier', 'trait'], f'B0419 {gv}')

if errori:
    print(f'ERRORI ({len(errori)})')
    for e in errori:
        print(' -', e)
    sys.exit(1)
print('OK: riserve (lista, nominata, Tier, Trait, SN+), assegnazione, pity, decisione 1 e 5, override')
