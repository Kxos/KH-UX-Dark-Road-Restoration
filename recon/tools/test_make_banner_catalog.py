"""Prova di make_banner_catalog.py (ricette dei banner originali) su righe sintetiche del TSV.

    python recon/tools/test_make_banner_catalog.py        -> «OK: ...» oppure «ERRORI (n)», uscita 1

L'ultimo controllo (catalogo completo) gira solo se esistono la wiki e il TSV veri.
"""
import os
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
check(m.currency_of(R(currency='Spooky Cookie'), 'T_TICKET') == (8, 'spooky'), 'valuta spooky')
check(m.currency_of(R(currency='Holiday Draw Ticket'), 'T_TICKET') == (8, 'holiday'), 'valuta holiday')
check(m.currency_of(R(currency='Free, VIP only'), 'FREE') == (1, 'jewel'), 'gratis in jewel')
check(m.currency_of(R(currency='Gold Ticket'), 'T_EVOLVE') == (6, 'gold'), 'gold')
check(m.currency_of(R(row_id='B0787', currency='Holiday Draw Ticket'), 'T_TICKET') == (8, 'draw'), 'B0787 errore del TSV')

# --- sblocco con la storia
STORY = [[1, 200, '2016-04-07'], [201, 250, '2016-04-21'], [251, 300, '2016-05-12']]
check(m.unlock_quest('2016-04-20', STORY) == 200 and m.unlock_quest('2016-05-12', STORY) == 300, 'sblocco')

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

# --- integrazione sui dati veri
WIKI = os.environ.get('KHUX_WIKI_JSON', m.DEFAULTS['wiki'])
TSV = os.environ.get('KHUX_BANNERS_TSV', m.DEFAULTS['banners'])
if os.path.exists(WIKI) and os.path.exists(TSV):
    cat = m.build_catalog(m.default_inputs())
    bs = cat['banners']
    check(len(bs) == 808, f'banner {len(bs)}')
    from collections import Counter
    t = Counter(b['type'] for b in bs)
    check(t == Counter({'SN': 213, 'FEATURED': 168, 'FALLING': 129, 'SKILL': 69, 'DAILY': 64, 'SEVEN': 48, 'FREE': 36,
                        'STANDARD': 23, 'T_TICKET': 21, 'ITEM': 20, 'T_POINTS': 7, 'BEGINNER': 5, 'T_EVOLVE': 5}), f'tipi {t}')
    check(sum(1 for b in bs if b['unlockQuest'] <= 525) == 78, 'sbloccati a 525')
    # 39 righe VIP con gemello (la ricerca e la spec 9.5 dicono 41: contavano le coppie, e B0552/B0554
    # «KH III Falling Price Deal» VIP hanno ciascuna due gemelli normali, B0551 e B0553)
    vt = sum(1 for b in bs if b['catalogOnly'] == 'VIP_TWIN')
    check(vt == 39, f'gemelli VIP {vt}')
    check(all(b['end'] for b in bs), 'tutte le date di fine')
    b11 = next(b for b in bs if b['rowId'] == 'B0011')
    check(b11['pool']['sets'] == ['1.1', '1.2', '1.3', '2.1'] and b11['epicBoost'], 'B0011 senza 2.2 e Epic')
    check(cat['firstRarity'].get('6') == '2016-07-15' and cat['firstRarity'].get('7') == '2018-05-25', 'firstRarity')
    b456 = next(b for b in bs if b['rowId'] == 'B0456')
    check(b456['pool']['mode'] == 'evolve' and [lv for _, lv in b456['pool']['evolve']] == [7, 8, 9], 'B0456 Dual Meow Wow')
    integr = ', integrazione'
else:
    integr = ' (integrazione saltata: dati veri assenti)'

if errori:
    print(f'ERRORI ({len(errori)})')
    for e in errori:
        print(' -', e)
    sys.exit(1)
print('OK: classify, prezzi, valute, sblocco, limite, garanzie, gemelli VIP, bonus, fine, pool' + integr)
