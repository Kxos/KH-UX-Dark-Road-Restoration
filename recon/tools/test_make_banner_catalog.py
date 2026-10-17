"""Prova di make_banner_catalog.py (ricette dei banner originali) su righe sintetiche del TSV.

    python recon/tools/test_make_banner_catalog.py        -> «OK: ...» oppure «ERRORI (n)», uscita 1

L'ultimo controllo (catalogo completo) gira solo se esistono la wiki e il TSV veri.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_banner_catalog as m  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

errori = []


def check(cond, msg):
    if not cond:
        errori.append(msg)


COLS = ['row_id', 'name', 'start_pt', 'end_pt', 'status', 'currency', 'price', 'draw_size', 'rarity_mix',
        'featured_medals', 'guarantees', 'notes', 'image_file', 'image_size', 'seasonal', 'event_tie_in',
        'source_url', 'confidence']
R = lambda **k: {**{c: '' for c in COLS}, **k}  # noqa: E731

# --- classify
check(m.classify(R(name='Spirit Blind Box'), '') == 'X_BLINDBOX', 'blind box')
check(m.classify(R(name='Platinum Ticket Draw', currency='Platinum Ticket'), '') == 'T_EVOLVE', 'evolve')
check(m.classify(R(name='Spooky Cookies Deal', currency='Spooky Cookie'), '') == 'T_TICKET', 'spooky')
check(m.classify(R(name='Free Deal (VIP)', currency='Free, VIP only'), '') == 'FREE', 'free vip')
check(m.classify(R(name='Supernova - Sephiroth'), '') == 'SN', 'sn')
check(m.classify(R(name='DAILY DEAL!'), '') == 'DAILY', 'daily')

# --- prezzi e valute
check(m.parse_price('1st: Free, 2nd+: 3000') == [0, 3000], 'first free')
check(m.parse_price('1900, 3000, 2500, 2200') == [3000, 2500, 2200, 1900], 'scalini')
check(m.parse_price('VIP Only Free') == [0], 'gratis')
check(m.unusable([600], 3, []) and not m.unusable([600], 3, [[4, 1]]) and m.unusable([], 3, [[4, 1]]) and m.unusable([600], None, [[4, 1]]), 'senza composizione degli slot: INCOMPLETE')
check(m.currency_of(R(currency='Spooky Cookie'), 'T_TICKET') == (8, 'spooky'), 'valuta spooky')
check(m.currency_of(R(currency='Holiday Draw Ticket'), 'T_TICKET') == (8, 'holiday'), 'valuta holiday')
check(m.currency_of(R(currency='Free, VIP only'), 'FREE') == (1, 'jewel'), 'gratis in jewel')
check(m.currency_of(R(currency='Gold Ticket'), 'T_EVOLVE') == (6, 'gold'), 'gold')
check(m.currency_of(R(row_id='B0787', currency='Holiday Draw Ticket'), 'T_TICKET') == (8, 'draw'), 'B0787 errore del TSV')

# --- sblocco con la storia
STORY = [[1, 200, '2016-04-07'], [201, 250, '2016-04-21'], [251, 300, '2016-05-12']]
# prima quest della tranche in corso alla data del banner, meno 1 (decisione dell'utente del 17-10)
check(m.unlock_quest('2016-04-20', STORY) == 0, 'sblocco nel lancio')
check(m.unlock_quest('2016-04-21', STORY) == 200, 'sblocco tranche 201-250')
check(m.unlock_quest('2016-05-12', STORY) == 250, 'sblocco tranche 251-300')

# --- limite giornaliero
check(m.day_limit('You may draw ONCE per day', 'FEATURED') == 1 and m.day_limit('Top-Drawer 3 times per day', 'DAILY') == 3,
      'limite giornaliero')
check(m.day_limit('Draw three times per day', 'DAILY') == 3 and m.day_limit('', 'STANDARD') == 0, 'limite tre / nessuno')

# --- garanzie
g = m.guarantee_of(R(guarantees='If bought 10 times, at least one Illustrated Cloud is guaranteed'), '')
check(g == {'list': [], 'count': 0, 'pity': 10, 'every': None, 'featured': ['illustrated cloud']}, f'pity {g}')
g = m.guarantee_of(R(), 'Guarantees three of the following Medals: SN++ - Fiend, Key Art #22. *Draws')
check(g['list'] == ['sn++ - fiend', 'key art #22'] and g['count'] == 3, f'lista {g}')
g = m.guarantee_of(R(), 'You are guaranteed to get one of the following Medals every 3rd draw! [[SN++ - Xemnas B]]')
check(g['every'] == 3, 'every 3rd')
g = m.guarantee_of(R(featured_medals='Sephiroth [EX+]'), 'Get him within 5 draws from this EX Medal Deal!')
check(g['pity'] == 5 and g['featured'] == ['sephiroth [ex+]'], f'within {g}')
g = m.guarantee_of(R(), "Guarantees '''four''' of the following Medals: [[SN++ - Illus. KH III Sora]], {{KA|22}}, or [[Alice]]. Next.")
check(g['list'] == ['sn++ - illus. kh iii sora', 'key art #22', 'alice'] and g['count'] == 4, f'lista con link {g}')
g = m.guarantee_of(R(), 'If bought 3 times, one [[Supernova - Sephiroth]], {{KA|19}}, SN - KH III Xion, or Huey, Dewey & Louie is guaranteed.')
check(g['pity'] == 3 and g['featured'] == ['supernova - sephiroth', 'key art #19', 'sn - kh iii xion', 'huey, dewey & louie'],
      f'pity misto {g}')
g = m.guarantee_of(R(), 'If bought 3 times, one of the following Medals is guaranteed: [[SN+ - KH III Naminé]], or [[Alice]]. Has')
check(g['featured'] == ['sn+ - kh iii naminé', 'alice'], f'pity con lista {g}')
p = m.pool_recipe(R(featured_medals='HD Axel, Illustrated Aqua A, and Illustrated Ventus,; Illustrated Kairi with its special attack strengthened 3 times'),
                  '', 'FEATURED', [], {})
check(p['featured'] == ['hd axel', 'illustrated aqua a', 'illustrated ventus', 'illustrated kairi'], f'vetrina {p["featured"]}')

# --- gemelli VIP
twins = m.vip_twins([R(row_id='B1', name='Supernova Deal', start_pt='2019-03-01', currency='Jewels'),
                     R(row_id='B2', name='Supernova Deal (VIP)', start_pt='2019-03-01', currency='Jewels, VIP only'),
                     R(row_id='B3', name='Free Deal (VIP)', start_pt='2020-05-01', currency='Free, VIP only')])
check(twins == {'B2'}, f'gemelli VIP {twins}')

# --- bonus
MEDALS = [{'medalId': 90156, 'name': 'Magic Mirror', 'rare': 6, 'type': 4},
          {'medalId': 300948, 'name': 'Magic Broom', 'rare': 5, 'type': 6},
          {'medalId': 1001, 'name': 'Sora', 'rare': 3, 'type': 1, 'validPack': 0}]
MATERIALS = [{'materialId': 48, 'name': 'Power Gem'}, {'materialId': 49, 'name': 'Speed Gem'}]
check(m.bonus_of("Includes '''three''' bonus 6★ [[Magic Mirror]] Medals.", MEDALS, MATERIALS) == [[3, 90156, 3]], 'bonus mirror')
check(m.bonus_of('Includes two bonus [[Power Gem]]s.', MEDALS, MATERIALS) == [[5, 48, 2]], 'bonus gemma')
check(m.bonus_of('Includes one bonus Trait Medal #302.', MEDALS, MATERIALS) == [], 'bonus non trovato saltato')
MEDALS2 = MEDALS + [{'medalId': 33015, 'name': 'Donald Ver. B', 'rare': 5, 'type': 1}, {'medalId': 31056, 'name': 'Black Coat King Mickey', 'rare': 6, 'type': 1},
                    {'medalId': 31055, 'name': 'Black Coat King Mickey', 'rare': 5, 'type': 1}, {'medalId': 2006, 'name': 'Chip', 'rare': 6, 'type': 1}]
check(m.bonus_of('Includes one bonus 5★ Donald Ver. B Medal. Next.', MEDALS2, MATERIALS) == [[3, 33015, 1]], 'bonus con abbreviazione')
b = m.bonus_of('Includes one bonus 5★ Black Coat King Mickey and 6★ Chip medal.', MEDALS2, MATERIALS)
check(b == [[3, 31055, 1], [3, 2006, 1]], f'bonus doppio {b}')

# --- date di fine
check(m.end_of(R(name='X', start_pt='2017-01-01', end_pt='2017-01-07'), 'STANDARD', [], {}) == ('2017-01-07', 'original'), 'fine originale')
check(m.end_of(R(name='Draw Points Deal!', start_pt='2021-02-01'), 'T_POINTS', [], {})[0] == '2021-06-29', 'fine draw points')
check(m.end_of(R(name='Supernova Deal', start_pt='2019-03-01'), 'SN', [], {})[0] == '2019-03-01', 'fine 1 giorno di serie')
NOT = {123: {'id': 123, 'title': 'SN+ Falling Price Deal (12/3)',
             'text': 'Period: Dec. 3, 2020 12:00 a.m. to Dec. 5, 2020 11:59 p.m. (PT)'}}
e = m.end_of(R(name='Gold Rush Deal', start_pt='2020-12-03', source_url='https://x/detail/123?lang=en'), 'SN', [], NOT)
check(e == ('2020-12-05', 'notice 123 (weak title match)'), f'fine da notice {e}')
e = m.end_of(R(name="Beginner's Draw (12/6)", start_pt='2019-12-06'), 'BEGINNER', [], {})
check(e[0] == '2020-10-11', f'beginner 2019 {e}')

# --- pool
SUB = {'1.1': ['sora'], '1.2': ['alice'], '24.3a': ['x'], '24.3b': ['y']}
p = m.pool_recipe(R(start_pt='2018-01-01'), 'Draws from sets 1.1, 1.2, and 24.3.', 'STANDARD', [], SUB)
check(p['mode'] == 'sets' and p['sets'] == ['1.1', '1.2', '24.3a', '24.3b'], f'pool sets {p}')
p = m.pool_recipe(R(start_pt='2018-01-01'), 'Draws from the following Medals: Sora, Alice, and Hades.', 'ITEM', [], SUB)
check(p['mode'] == 'list' and p['names'] == ['sora', 'alice', 'hades'], f'pool list {p}')
p = m.pool_recipe(R(start_pt='2016-04-07', status='permanent'), 'Available once per day.', 'DAILY', [('2016-04-01', ['1.1'], [], 'DAILY')], SUB)
check(p['mode'] == 'released', f'pool released {p}')
p = m.pool_recipe(R(start_pt='2016-05-01'), 'Guarantees one of [[Alice]].', 'DAILY',
                  [('2016-04-07', ['1.1'], [], 'DAILY'), ('2016-04-20', ['1.2'], [], 'STANDARD')], SUB)
check(p['mode'] == 'inherit' and p['sets'] == ['1.1'] and p['inheritAfter'] == '2016-04-07' and p['names'] == ['alice'],
      f'pool inherit {p}')
EV = [{'medalId': 301495 + i, 'name': f'Blue Fairy [SA Bonus LV {i + 1}]', 'type': 6} for i in range(8)]
p = m.pool_recipe(R(start_pt='2018-05-25', currency='Bronze Ticket'), '', 'T_EVOLVE', [], SUB, medal_rows=EV)
check(p['mode'] == 'evolve' and p['evolve'] == [[301495, 1], [301496, 2], [301497, 3]], f'pool evolve {p}')
p = m.pool_recipe(R(start_pt='2018-05-25', currency='Silver Ticket'), '', 'T_EVOLVE', [], SUB, medal_rows=EV)
check([lv for _, lv in p['evolve']] == [3, 4, 5, 6, 7, 8], 'silver prima del 14/09/2018')

# --- fix round 1: stella davanti al nome, filtri dei set, alias, completamento senza VIP
p = m.pool_recipe(R(featured_medals='7★ Prime - KH Cloud'), '', 'SEVEN', [], {})
check(p['featured'] == ['prime - kh cloud'], f'vetrina senza stella {p["featured"]}')
p = m.pool_recipe(R(start_pt='2016-04-20'), 'Draws from Disney-based Medals in sets 1.1 and 1.2.', 'STANDARD', [], SUB)
check(p['mode'] == 'sets' and p['sets'] == ['1.1', '1.2'] and p['filter'] == ['disney'], f'filtro disney {p}')
check(m.set_filter('Draws from Final Fantasy - and Kingdom Hearts -based Medals in sets 1.1 and 1.2.') == ['ffkh'], 'filtro ffkh')
check(m.set_filter('Draws from Power Medals in sets 1.1, 1.2.') == ['power'], 'filtro power')
check(m.set_filter('Draws from sets 1.1 and 1.2.') == [], 'nessun filtro')
check(m.pool_recipe(R(), '', 'STANDARD', [], {})['filter'] == [], 'filter sempre presente')
check(m.medal_origin('[[Category:Hercules Characters]]') == 'disney', 'origine disney')
check(m.medal_origin('[[Category:KINGDOM HEARTS II Characters]] [[Category:Final Fantasy Characters]]') == 'ffkh', 'origine ffkh')
check(m.medal_origin('[[Category:Kingdom Hearts Characters]] [[Category:Steamboat Willie Characters]]') == 'disney', 'origine mista')
check(m.medal_origin('') == '', 'origine ignota')
g = m.guarantee_of(R(), 'Guarantees one of the following Medals with its special attack strengthened 1 to 3 times: [[HD Pete]], or [[Hercules B]].')
check(g['list'] == ['hd pete', 'hercules b'] and g['count'] == 1, f'lista con qualifica {g}')
MED = {'supernova - key art #20': {'date': '2018-12-01'}, 'supernova+ - key art #20': {'date': '2019-09-01'},
       'sn++ - key art #20': {'date': '2019-11-08'}, 'sn++ - lingering will': {'date': '2020-01-01'},
       'prime - mrs. incredible': {'date': '2019-01-01'}, 'illustrated xion [ex]': {'date': '2018-01-01'}}
RD = {'sn++ - kh iii lingering will': 'sn++ - lingering will'}
check(m.resolve_name('key art #20', '2019-10-01', MED, RD) == 'supernova+ - key art #20', 'key art SN+')
check(m.resolve_name('key art #20', '2020-02-01', MED, RD) == 'sn++ - key art #20', 'key art SN++')
check(m.resolve_name('key art #20', '2018-12-10', MED, RD) == 'supernova - key art #20', 'key art SN')
check(m.resolve_name('sn++ - kh iii lingering will', '2020-02-01', MED, RD) == 'sn++ - lingering will', 'redirect')
check(m.resolve_name('prime mrs. incredible', '2019-02-01', MED, RD) == 'prime - mrs. incredible', 'prime senza trattino')
check(m.resolve_name('boosted illustrated xion (ex)', '2019-02-01', MED, RD) == 'illustrated xion [ex]', 'boosted e (ex)')
check(m.resolve_name('attack boost vi max', '2019-02-01', MED, RD) is None, 'skill non risolta')
check(m.non_medal('attack boost vi max', set()) and m.non_medal('power gem', {'power gem'}) and m.non_medal('limited vip coin', set())
      and not m.non_medal('sn+ - kh iii foo', set()), 'non medaglie')
c = m.complete_row(R(name='[WJE] Monday Only Free Deal! (9/14)'),
                   R(name='Free Deal', currency='Free, VIP only', price='Free VIP only', draw_size='x10', rarity_mix='7★:1 5★:9'))
check(c['currency'] == '' and c['price'] == 'Free' and c['draw_size'] == 'x10' and not m.is_vip(c), f'completamento senza VIP {c}')

# --- fix round 3: L-SR std, class2 Rare, alias dei sotto-set
MS = {'phantom': {'cls': 'L-SR', 'class2': 'Attack', 'ids': [[1, 6, 'x']], 'date': '2017-01-01'},
      'vanitas': {'cls': 'SR', 'class2': 'Super Rare', 'ids': [[2, 6, 'x']], 'date': '2017-01-01'},
      'chip': {'cls': '', 'class2': 'Boost', 'ids': [[3, 6, 'x']], 'date': '2016-01-01'},
      'xion a': {'cls': '', 'class2': 'Attack', 'ids': [[4, 5, 'x']], 'date': '2016-11-25'},
      'xion b': {'cls': 'E', 'class2': 'Attack', 'ids': [[5, 5, 'x']], 'date': '2017-12-13'},
      'prime - key art #17': {'cls': '', 'class2': 'Attack', 'ids': [[6, 7, 'x']], 'date': '2018-06-15'}}
m.mark_std(MS)
check(MS['phantom']['std'] and MS['vanitas']['std'] and not MS['chip']['std'] and not MS['prime - key art #17']['std'],
      f'std L-SR / Super Rare / Boost / Prime {[(k, v["std"]) for k, v in MS.items()]}')
check(m.resolve_name('xion', '2016-11-25', MS, {}) == 'xion a', 'alias xion -> xion a')
check(m.resolve_name('key art #17', '2018-06-15', MS, {}) == 'prime - key art #17', 'alias key art #17 -> prime')

# elenco «every Nth draw» solo nel testo del notice (B0742/B0765)
NT = {70907: {'text': 'Info\nYou are guaranteed to get one of the following Medals every 3rd draw! \nSN++ - Key Art #24\nSN++ - Illus. KH III Sora\nSN++ - Illus. KH III Sora\n\u25a0 Campaign Period\nSN++ - Dopo'}}
nl_ = m.notice_list(R(source_url='https://x/detail/46740 https://x/detail/70907'), NT)
check(nl_ == ['sn++ - key art #24', 'sn++ - illus. kh iii sora'], f'notice_list {nl_}')
check(m.notice_list(R(source_url='nulla'), NT) == [], 'notice_list senza notice')

# --- correzione finale A: varianti di vetrina/lista datate dopo l'inizio del banner del debutto
FR = {'3': '2016-04-07', '4': '2016-04-07', '5': '2016-04-07', '6': '2016-07-15', '7': '2018-05-25'}
MD = {'sephiroth': {'date': '2016-10-13', 'ids': [[1, 6, '2016-10-20'], [2, 7, '2018-05-14']]},
      'ira': {'date': '2017-11-24', 'ids': [[3, 6, '2017-11-24']]},
      'cloud': {'date': '2016-07-08', 'ids': [[4, 6, '2016-07-20']]},
      'riku': {'date': '2016-10-01', 'ids': [[5, 5, '2016-10-30']]},  # non in vetrina: data intatta
      'kairi': {'date': '2018-06-01', 'ids': [[6, 6, '2018-06-01'], [7, 7, '2018-06-09']]}}
BN = [{'rowId': 'B1', 'start': '2016-10-14', 'rarityMix': [[5, 3], [4, 7]], 'catalogOnly': None,
       'pool': {'featured': ['sephiroth']}, 'guarantee': {'list': []}},
      {'rowId': 'B2', 'start': '2017-11-17', 'rarityMix': [[6, 1], [5, 9]], 'catalogOnly': None,  # debutto: la medaglia e' datata dopo
       'pool': {'featured': ['ira']}, 'guarantee': {'list': []}},
      {'rowId': 'B3', 'start': '2016-07-08', 'rarityMix': [[5, 2], [4, 8]], 'catalogOnly': None,  # 6★ prima del 15/07/2016: mai
       'pool': {'featured': ['cloud']}, 'guarantee': {'list': []}},
      {'rowId': 'B4', 'start': '2018-06-01', 'rarityMix': [[6, 1], [5, 9]], 'catalogOnly': None,
       'pool': {'featured': []}, 'guarantee': {'list': ['kairi']}},
      {'rowId': 'B5', 'start': '2017-12-01', 'rarityMix': [[6, 1], [5, 9]], 'catalogOnly': None,  # ira gia' uscita: niente da fare
       'pool': {'featured': ['ira']}, 'guarantee': {'list': []}}]
n_al = m.align_debut_dates(BN, MD, FR)
check(MD['sephiroth']['ids'] == [[1, 6, '2016-10-14'], [2, 7, '2018-05-14']], f'debutto: 6★ alla data del banner, 7★ intatta {MD["sephiroth"]}')
check(MD['ira']['ids'] == [[3, 6, '2017-11-17']], f'debutto: medaglia datata dopo il primo banner che la nomina {MD["ira"]}')
check(MD['cloud']['ids'] == [[4, 6, '2016-07-20']], 'debutto: nessuna 6★ prima del 15/07/2016')
check(MD['riku']['ids'] == [[5, 5, '2016-10-30']], 'debutto: medaglie fuori da vetrina/lista intatte')
check(MD['kairi']['ids'] == [[6, 6, '2018-06-01'], [7, 7, '2018-06-01']], f'debutto: lista e stella sopra dopo il 25/05/2018 {MD["kairi"]}')
check(n_al == 3, f'varianti spostate {n_al}')

# --- correzione finale B: «Available once.» (formulazione reale delle note: B0510, B0511, B0604, SN 7★ del 2020)
check(m.total_limit('Available once. Guarantees one of the following Medals: [[A]].') == 1, 'Available once -> 1')
check(m.total_limit('This deal can only be drawn once.') == 1, 'can only be drawn once -> 1')
check(m.total_limit('Available once per day.') == 0 and m.total_limit('Available once a day') == 0 and m.total_limit('') == 0,
      'once per day non e un limite totale')
check(m.free_day_limit('FREE', [0], 0, 0, False) == 1, 'FREE senza limiti -> una al giorno')
check(m.free_day_limit('FREE', [0], 0, 1, False) == 0 and m.free_day_limit('FREE', [0], 0, 0, True) == 0
      and m.free_day_limit('FREE', [0], 3, 0, False) == 3, 'FREE con totalLimit, vipFree o dayLimit: invariato')
check(m.free_day_limit('SN', [0], 0, 0, False) == 1 and m.free_day_limit('SN', [0, 3000], 0, 0, False) == 0
      and m.free_day_limit('SN', [3000], 0, 0, False) == 0, 'prezzo 0: una al giorno; FIRST_FREE e a pagamento no')

# --- correzione finale C (sotto-progetto 2b): slot della lista da banner_guarantees (riserve in ordine di testo);
# guarantee.slot = slot della prima riserva a lista (compatibilita' col sotto-progetto 2)
import banner_guarantees as bg  # noqa: E402


def _slot(text, mix):
    return bg.guarantee_v3(R(row_id='BT'), text, mix, [], [])['slot']


GT = 'Guarantees one Tier 4 or lower 7★ Medal. Guarantees one of the following Medals: Illustrated Kairi [EX], HD Axel.'
check(_slot(GT, [[7, 1], [6, 1], [5, 8]]) == 1, 'B0306: lista nello slot 6★')
check(_slot('Guarantees one 7★ Tier 3 or 4 Medal. Guarantees one of the following Medals: A, B.', [[7, 1], [6, 1], [5, 2]]) == 1, 'B0355')
check(_slot('Guarantees two of the following Medals at 7★: A, B.', [[7, 2], [6, 1], [5, 7]]) == 0, 'lista sola: slot 0')
check(_slot('Guarantees one of the following Medals: A. Guarantees one 7★ Tier 4 Medal.', [[7, 1], [6, 1], [5, 8]]) == 1,
      'garanzia di stella dopo la lista: le riserve con stella prima, la lista sul primo slot libero')
check(_slot('Guarantees one Tier 4 7★ Medal.', [[7, 1], [6, 1], [5, 8]]) == 0, 'senza lista: slot 0')
check(_slot(GT, [[5, 8], [7, 1], [6, 1]]) == 9, 'indice nell ordine del mix del catalogo')

# --- sotto-progetto 2b: Tier come 4° campo, righe boosted escluse, data d'inizio dal notice
MB = [{'medalId': 2001, 'name': 'Chip', 'rare': 6, 'type': 1, 'validPack': 0, 'groupId': 0},
      {'medalId': 1002001, 'name': 'Chip', 'rare': 6, 'type': 1, 'validPack': 0, 'groupId': 2001}]
check(m.is_boosted(MB[1]) and not m.is_boosted(MB[0]) and m.is_boosted({'medalId': 1000001, 'name': 'X'}), 'is_boosted')
med_x = {}
m.extend_medals(med_x, [{'medalId': 301899, 'name': 'SN+ - Second Form Sora', 'rare': 7, 'type': 1, 'validPack': 0, 'guiltValue': 9},
                        {'medalId': 1301899, 'name': 'SN+ - Second Form Sora', 'rare': 7, 'type': 1, 'validPack': 0, 'groupId': 301899, 'guiltValue': 9}],
                {}, {'sn+ - second form sora': '2019-09-10'})
check(med_x.get('sn+ - second form sora', {}).get('ids') == [[301899, 7, '2019-09-10', 9]], f'extend_medals: Tier e niente boosted {med_x}')
check(m.bonus_of('Includes one bonus 6★ [[Chip]] Medal.', MB, []) == [[3, 2001, 1]], 'bonus: mai la boosted')

# --- integrazione sui dati veri
WIKI = os.environ.get('KHUX_WIKI_JSON', m.DEFAULTS['wiki'])
TSV = os.environ.get('KHUX_BANNERS_TSV', m.DEFAULTS['banners'])
if os.path.exists(WIKI) and os.path.exists(TSV):
    TIER_BANNERS = 183  # audit delle garanzie, appendice A (178) + 5 frasi SAB del 2016: vedi sotto
    cat = m.build_catalog(m.default_inputs())
    bs = cat['banners']
    check(len(bs) == 808, f'banner {len(bs)}')
    from collections import Counter
    t = Counter(b['type'] for b in bs)
    check(t == Counter({'SN': 213, 'FEATURED': 168, 'FALLING': 129, 'SKILL': 69, 'DAILY': 64, 'SEVEN': 48, 'FREE': 36,
                        'STANDARD': 23, 'T_TICKET': 21, 'ITEM': 20, 'T_POINTS': 7, 'BEGINNER': 5, 'T_EVOLVE': 5}), f'tipi {t}')
    # 85 = 78 della regola vecchia + i 7 banner della tranche 526-540 (12-01-2017 .. 08-02-2017, B0079-B0085),
    # che ora si sbloccano a 525; i 6 del lancio (B0001-B0006) passano da 200 a 0
    ub = sum(1 for b in bs if b['unlockQuest'] <= 525)
    check(ub == 85, f'sbloccati a 525: {ub}')
    check([b['rowId'] for b in bs if b['unlockQuest'] == 0] == ['B0001', 'B0002', 'B0003', 'B0004', 'B0005', 'B0006'], 'banner del lancio a 0')
    # 39 righe VIP con gemello (la ricerca e la spec 9.5 dicono 41: contavano le coppie, e B0552/B0554
    # «KH III Falling Price Deal» VIP hanno ciascuna due gemelli normali, B0551 e B0553)
    vt = sum(1 for b in bs if b['catalogOnly'] == 'VIP_TWIN')
    check(vt == 39, f'gemelli VIP {vt}')
    check(all(b['end'] for b in bs), 'tutte le date di fine')
    inc = sum(1 for b in bs if b['catalogOnly'] == 'INCOMPLETE')  # 31 prima degli override dei notice (Task 4)
    check(inc == 24, f'righe INCOMPLETE {inc}')
    for rid in ('B0742', 'B0765'):
        bg = next(b for b in bs if b['rowId'] == rid)['guarantee']
        check(bg['every'] == 3 and len(bg['list']) >= 15, f'{rid} garanzia every {bg}')
    b11 = next(b for b in bs if b['rowId'] == 'B0011')
    check(b11['pool']['sets'] == ['1.1', '1.2', '1.3', '2.1'] and b11['epicBoost'], 'B0011 senza 2.2 e Epic')
    check(cat['firstRarity'].get('6') == '2016-07-15' and cat['firstRarity'].get('7') == '2018-05-25', 'firstRarity')
    b456 = next(b for b in bs if b['rowId'] == 'B0456')
    check(b456['pool']['mode'] == 'evolve' and [lv for _, lv in b456['pool']['evolve']] == [7, 8, 9], 'B0456 Dual Meow Wow')
    med = cat['medals']
    mats = {m.norm(x['name']) for x in m.default_inputs()['materials']}
    bad = [b['rowId'] for b in bs if b['type'] == 'SN' and not b['catalogOnly']
           and any(not m.non_medal(n, mats) for n in b['pool']['featured'])
           and not any(n in med for n in b['pool']['featured'])]
    check(not bad, f'SN attivi con vetrina irrisolta {bad}')
    check(sum(1 for b in bs if b['vipFree']) == 17, f'vipFree {sum(1 for b in bs if b["vipFree"])}')
    b5 = next(b for b in bs if b['rowId'] == 'B0005')
    check(b5['pool']['filter'] == ['disney'] and med['stitch']['origin'] == 'disney' and med['kh ii cloud']['origin'] == 'ffkh'
          and med['kh ii cloud']['att'] in ('power', 'speed', 'magic'), 'B0005 filtro e campi medaglia')
    from collections import Counter as _C
    dup = [i for i, n in _C(i[0] for v in med.values() if v['std'] for i in v['ids']).items() if n > 1]
    check(not dup, f'medalId in due voci std {dup[:5]}')
    bad = [k for k, v in med.items() if v['std'] and re.match(r'(sn|supernova|prime)\b', k)]
    check(not bad, f'voci std SN/Prime {bad[:5]}')
    check(all(not v['std'] for v in med.values() if 'alias' in v), 'alias non std')
    check(all('std' in v for v in med.values()), 'std sempre presente')
    check(med['world of ff sora']['std'], 'world of ff sora std')
    import json as _json
    dump = _json.dumps(cat, ensure_ascii=False)
    check('�' not in dump and 'saïx' in dump and 'lumière' in dump, 'nomi UTF-8 corretti')
    miss = sorted({n for s in cat['subsets'].values() for n in s['names'] if n not in med and not n.startswith('trait medal')})
    check(not miss, f'nomi dei sotto-set senza voce {miss}')  # «moogle & sora» -> redirect «sora & moogle»

    # A: vetrina e lista non vuote alla data del banner (come expandPool in server/gacha-data.js a asOf(b, start))
    first = cat['firstRarity']

    def rarities(b, at):
        r = {s for s, _ in b['rarityMix'] if not (first.get(str(s)) and first[str(s)] > at)}
        return r | {s + 1 for s, _ in b['rarityMix'] if first.get(str(s + 1)) and first[str(s + 1)] <= at}

    def named(b, names):
        at, rs = b['start'], rarities(b, b['start'])
        assert not ((6 in rs and at < '2016-07-15') or (7 in rs and at < '2018-05-25')), b['rowId']
        return [n for n in names if any(i[1] in rs and i[2] <= at for i in med.get(n, {}).get('ids', []))]
    drawn = [b for b in bs if not b['catalogOnly'] and b['pool']['mode'] != 'evolve']
    # eccezioni: la stella della medaglia non e' nel mix (ne' la stella sopra) alla data del banner:
    # 6★ prima del 15/07/2016 (B0023, B0029), 7★ prima del 25/05/2018 (B0280 Vexen [+], B0303 Lexaeus [+]),
    # SN++ solo 7★ sui banner [[5,10]] dei biglietti (B0663, B0732, B0746, B0759, B0787, B0801);
    # i nomi senza varianti d'attacco (Cid, Chip, Moogle, Blue Fairy, Magic Mirror...) non sono medaglie vere
    STAR_OUT = {'B0023', 'B0029', 'B0280', 'B0303', 'B0663', 'B0732', 'B0746', 'B0759', 'B0787', 'B0801'}
    empty_f = sorted(b['rowId'] for b in drawn if [n for n in b['pool']['featured'] if med.get(n, {}).get('ids')]
                     and not named(b, b['pool']['featured']))
    check(set(empty_f) == STAR_OUT, f'vetrina vuota alla data del banner: {sorted(set(empty_f) ^ STAR_OUT)}')
    empty_l = sorted(b['rowId'] for b in drawn if [n for n in b['guarantee']['list'] if med.get(n, {}).get('ids')]
                     and not named(b, b['guarantee']['list']))
    check(not empty_l, f'lista vuota alla data del banner: {empty_l}')
    FIX15 = ['B0054', 'B0068', 'B0084', 'B0086', 'B0089', 'B0106', 'B0176', 'B0184', 'B0199', 'B0200', 'B0201', 'B0202',
             'B0203', 'B0230', 'B0246']
    byid = {b['rowId']: b for b in bs}
    check(all(named(byid[r], byid[r]['pool']['featured']) for r in FIX15), 'i 15 banner del debutto hanno la vetrina')
    check(all(named(byid[r], byid[r]['guarantee']['list']) for r in ('B0230', 'B0246')), 'B0230/B0246 hanno la lista')

    # B: limite totale e gratuite senza limite (Ruling 28)
    check(byid['B0511']['totalLimit'] == 1 and byid['B0604']['totalLimit'] == 1, 'B0511/B0604 Available once')
    check(all(b.get('totalLimit', None) is not None for b in bs), 'totalLimit sempre presente')
    for r in ('B0417', 'B0437', 'B0521', 'B0721', 'B0725', 'B0726', 'B0734', 'B0739'):
        check(byid[r]['dayLimit'] == 1, f'{r} gratuita: una al giorno')
    nolim = [b['rowId'] for b in bs if (b['type'] == 'FREE' or (b['prices'] and not any(b['prices'])))
             and not (b['dayLimit'] or b['totalLimit'] or b['vipFree'])]
    check(not nolim, f'gratuite senza limite {nolim}')

    # C: guarantee.slot = slot della prima riserva a lista; != 0 solo sotto una riserva di stella esplicita
    # (Tier 7★, medaglia nominata o lista precedente): B0306-B0308, B0355 sul 6★ e le liste dopo una nominata (D2/D7)
    for r in ('B0306', 'B0307', 'B0308', 'B0355'):
        check(byid[r]['guarantee']['slot'] == 1, f'guarantee.slot {r}')
    check(all(b['guarantee']['slot'] == next((s['slot'] for s in b['guarantee']['slots'] if s['kind'] == 'list'), 0) for b in bs),
          'guarantee.slot = prima riserva a lista')

    # sotto-progetto 2b: riserve, pity, Tier (audit delle garanzie del 17-10)
    B = byid
    check(cat['version'] == 3 and all(len(i) == 4 for v in cat['medals'].values() for i in v['ids']), 'Tier nelle medaglie')
    check(not any(i[0] >= 1000000 for v in cat['medals'].values() for i in v['ids']), 'nessuna boosted nel catalogo')
    # Tier sui banner estraibili, come l'audit: i 178 dell'appendice A (tutti presenti) + 5 del 2016 col SAB
    # (B0046/B0047 «Level 3 SAB», B0051/B0052 «SAB of 3 or higher», B0079 «Special Attack Bonus Tier of 3»: ricerca §3)
    # = 183; su tutti gli 808 banner 201 (+12 VIP_TWIN delle serie Tier 7, +6 INCOMPLETE con la frase solo nel notice)
    live = [b for b in cat['banners'] if not b['catalogOnly']]
    n_tier = sum(1 for b in live if any(s['kind'] == 'tier' for s in b['guarantee']['slots']))
    check(n_tier == TIER_BANNERS, f'banner con Tier {n_tier}')
    # conflitti solo fra i banner di solo catalogo: 6 INCOMPLETE senza rarity_mix, B0473 (VIP_TWIN, «two ... at 7★» su un
    # mix con un 7★ solo); fra gli estraibili nessuno
    check(not [b['rowId'] for b in live if any(s.get('conflict') for s in b['guarantee']['slots'])], 'nessun conflitto')
    check(B['B0199']['start'] == '2017-11-24' and B['B0199']['guarantee']['pity'] == 20, 'B0199 data dal notice')
    check(B['B0629']['guarantee']['slots'][1]['count'] == 3 and B['B0678']['guarantee']['slots'][0]['count'] == 1, 'D3/D4')
    check(all(B[r]['guarantee']['pityStar'] == 7 for r in ['B0365', 'B0397', 'B0411', 'B0425', 'B0426', 'B0427', 'B0459']), 'D9 a 7')
    check(B['B0230']['guarantee']['slots'] and B['B0246']['guarantee']['slots'], 'D6 liste piene alla data')
    check(all(B[r]['guarantee']['pitySlot'] == 1 and B[r]['guarantee']['pityStar'] == 6 for r in ('B0319', 'B0402', 'B0403', 'B0412')),
          'decisione 5: pity 6★ sul primo 6★ o 5★')
    check(B['B0321']['guarantee']['pitySlot'] == 1 and B['B0306']['guarantee']['pitySlot'] == 0, 'pity sullo slot giusto')
    check(B['B0419']['guarantee']['pityNames'] == ['hd aced [ex+]'] and B['B0421']['guarantee']['pityNames'] == ['hd gula [ex+]'],
          'decisione 4')
    ks = {'kind', 'slot', 'count', 'star', 'names', 'tierMin', 'tierMax'}
    check(all(ks <= set(s) <= ks | {'conflict'} for b in bs for s in b['guarantee']['slots']), 'campi delle riserve')
    # decisione 1: nessun nome di una lista su uno slot 6★ senza variante 6★ (se la lista ne ha almeno uno)
    bad = [b['rowId'] for b in bs for s in b['guarantee']['slots'] if s['kind'] == 'list' and s['star'] == 6
           and any(n in med for n in s['names']) and any(n in med and 6 not in {i[1] for i in med[n]['ids']} for n in s['names'])
           and any(n in med and 6 in {i[1] for i in med[n]['ids']} for n in s['names'])]
    check(not bad, f'decisione 1 {bad[:5]}')
    check(all('slot' in b['guarantee'] for b in bs), 'guarantee.slot sempre presente')

    # F: nessuna medaglia del catalogo con darklight 3 (la scena del risultato va in crash: docs/notes/shop.md)
    dl3 = {r['medalId'] for r in m.default_inputs()['medals'] if r.get('darklight') == 3}
    cat_ids = {i[0] for v in med.values() for i in v['ids']} | {e[0] for b in bs for e in (b['pool'].get('evolve') or [])}
    check(not (cat_ids & dl3), f'medaglie darklight 3 nel catalogo {sorted(cat_ids & dl3)[:5]}')
    integr = ', integrazione'
else:
    integr = ' (integrazione saltata: dati veri assenti)'

if errori:
    print(f'ERRORI ({len(errori)})')
    for e in errori:
        print(' -', e)
    sys.exit(1)
print('OK: classify, prezzi, valute, sblocco, limite, garanzie, gemelli VIP, bonus, fine, pool' + integr)
