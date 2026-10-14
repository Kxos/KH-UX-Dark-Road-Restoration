"""Stage originali delle missioni di storia (I-116) al posto di quelli generati.

    python -I recon/tools/import_orig_stages.py [--out D:\\Progetto_Restauro_KH_UX\\stage_gen\\orig_stages] [--check]

Fonti (sola lettura): stage JP 4.3.1 di thethiny (`stage/`, nomi `<nome>.<entry id 8 cifre>.bin`:
vale la revisione piu' alta) e pacchetto 2016 (`tmp\\thethiny_x\\bundle2016\\files\\stage`). Per ogni
missione della master con stageKind 1 (le 525 di storia):
  * fonte 2016 per 2060, 3310, 5300, 7170, 11220 (stanze JP diverse da mapName/miniatura della master,
    reference\\world_schema\\jp431.md §3.2) e 2320 (JP dichiara 2 parti, la `_01` e' stata scartata);
  * altrimenti JP; se manca una parte dichiarata dall'STG o una stanza non e' disponibile, 2016;
  * 1010-1040 restano quelle delle risorse WW (originali, identiche salvo il campo [7]).
Stanze disponibili = servite (names_v4.tsv, names_addnl.tsv) + rooms_gen\\files\\map + stage_gen\\files\\map.
Lettura con il parser esatto `mapfile.py` (formato del client; si scartano i file < 13 e quelli con
squadre/uscite incoerenti). Controlli, tutti in <out>\\report.json:
  * nemici: enemyId (record dei nemici, bersaglio STG [6], scheda [10], obiettivi «Defeat X» della
    master) contro il master enemy e contro la tabella vera (external\\thethiny\\enemy_dec.json, che
    make-game-tables.js aggiunge al master);
  * premi: rewardId di nemici e forzieri contro il master reward e contro reward_dec.json. NB: le
    righe del master reward le crea make-game-tables.js da server/game_data/stage_poi.json: un id
    «assente dal master» si genera da solo quando il POI degli stage importati entra in quel file;
  * bersaglio [6] = primo nemico di una squadra capo (bit 0 di [4]); obiettivi della master
    (3 «Defeat N enemies» <= nemici contabili, 4/12 «Defeat X» con X nello stage, 17/18
    forzieri/materiali contro i totali STG).
Se la fonte preferita ha enemyId assenti da entrambe le tabelle o obiettivi della master non
soddisfatti e l'altra fonte ne ha meno, si usa l'altra (JP ha ridisegnato alcune missioni con capi
solo JP, es. 1210 con 10240 invece di 10011: il 2016 corrisponde alla master WW).
I file vanno in <out>\\stage\\ (da copiare in stage_gen\\files\\stage).
Il campo [7] dell'STG (WW 1, JP 40/41/43...: significato ignoto) resta quello della fonte.
"""
import argparse
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mapfile  # noqa: E402

D = r'D:\Progetto_Restauro_KH_UX'
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
JP_STAGE = os.path.join(D, 'thethiny_data', ' KHUx data shared', 'khux_dev_data', 'data',
                        'khux_dev_jp_final_4.3.1', 'data', 'jp_final_4.3.1', 'stage')
B16_STAGE = os.path.join(D, 'tmp', 'thethiny_x', 'bundle2016', 'files', 'stage')
REAL = os.path.join(D, 'external', 'thethiny')
FORCE_2016 = {2060, 3310, 5300, 7170, 11220, 2320}
KEEP_WW = {1010, 1013, 1016, 1019, 1020, 1030, 1040}

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=os.path.join(D, 'stage_gen', 'orig_stages'))
ap.add_argument('--check', action='store_true', help='solo rapporto, nessun file di stage scritto')
args = ap.parse_args()


def served_rooms():
    rooms = set()
    for tsv in (os.path.join(D, 'resource_data', 'names_v4.tsv'), os.path.join(D, 'ipa431', 'names_addnl.tsv')):
        for line in open(tsv, encoding='utf-8'):
            m = re.match(r'map/([A-Z]{2}_\d{4}_\d\d_\d\d)/\1_info\.bin\t', line)
            if m:
                rooms.add(m.group(1))
    for base in (os.path.join(D, 'rooms_gen', 'files', 'map'), os.path.join(D, 'stage_gen', 'files', 'map')):
        if os.path.isdir(base):
            rooms |= {r for r in os.listdir(base) if os.path.exists(os.path.join(base, r, r + '_info.bin'))}
    return rooms


def jload(p):
    try:
        return json.load(open(p, encoding='utf-8'))
    except FileNotFoundError:
        return []


master = lambda n: jload(os.path.join(REPO, 'server', 'master_data', n + '.json'))
stage_rows = {r['stageId']: r for r in master('stage')}
story = sorted(s for s, r in stage_rows.items() if r['stageKind'] == 1 and s < 990000)
enemy_ids = {r['enemyId'] for r in master('enemy')}
reward_ids = {r['rewardId'] for r in master('reward')}
real_enemy = {r['enemyId'] for r in jload(os.path.join(REAL, 'enemy_dec.json'))}
real_reward = {r['rewardId']: r for r in jload(os.path.join(REAL, 'reward_dec.json'))}
rooms_ok = served_rooms()
files = {'jp': mapfile.iter_stage_files(JP_STAGE), '2016': mapfile.iter_stage_files(B16_STAGE)}


def load(src, sid):
    f = files[src]
    try:
        stg, parts = mapfile.load_stage(f, sid)
    except mapfile.FormatError as e:
        return None, str(e)
    if not stg['client_layout'] or not all(p['client_layout'] for p in parts):
        return None, 'formato vecchio (versione < 13)'
    bad, warn = mapfile.check_stage(stg, parts)
    if bad:
        return None, 'incoerente: ' + '; '.join(bad)
    miss = [p['room'] for p in parts if p['room'] not in rooms_ok]
    if miss:
        return None, 'stanze non disponibili: ' + ', '.join(miss)
    raw = [open(f[(sid, None)], 'rb').read()] + [open(f[(sid, k)], 'rb').read() for k in range(len(parts))]
    return (stg, parts, warn, raw), None


def checks(sid, stg, parts):
    ens = [dict(e, part=k) for k, p in enumerate(parts) for e in p['enemies']]
    chs = [dict(c, part=k) for k, p in enumerate(parts) for c in p['chests']]
    teams = [t for p in parts for t in p['teams']]
    eids = {e['enemyId'] for e in ens}
    bosses = [p['enemies'][t['first']]['enemyId'] for p in parts for t in p['teams']
              if t['boss'] and t['count'] and 0 <= t['first'] < len(p['enemies'])]
    refs = {e['enemyId']: 'nemico' for e in ens}
    if stg['target_enemy']:
        refs.setdefault(stg['target_enemy'], 'bersaglio [6]')
    if stg['card_enemy']:
        refs.setdefault(stg['card_enemy'], 'scheda [10]')
    row, notes = stage_rows[sid], []
    for i in range(row.get('validSubmission', 0)):
        req, idt, sid_ = row['submissionRequire'][i], row['submissionIdType'][i], row['submissionId'][i]
        num = row['submissionNum'][i]
        if idt == 1 and sid_:
            refs.setdefault(sid_, 'obiettivo')
            if sid_ not in eids:
                notes.append('obiettivo %d: enemyId %d non e\' nello stage' % (i, sid_))
        if req == 3 and num > stg['enemies_total'] - stg['enemies_not_counted']:
            notes.append('obiettivo %d «sconfiggi %d nemici»: contabili %d' % (
                i, num, stg['enemies_total'] - stg['enemies_not_counted']))
        if req == 17 and stg['chests_total'] != len(chs):
            notes.append('obiettivo %d «apri tutti i forzieri»: STG %d, forzieri %d' % (i, stg['chests_total'], len(chs)))
        if req == 18 and stg['materials_total'] != sum(p['counts']['materials'] for p in parts):
            notes.append('obiettivo %d «raccogli tutti i materiali»: STG %d, materiali %d' % (
                i, stg['materials_total'], sum(p['counts']['materials'] for p in parts)))
    if stg['target_enemy'] and stg['target_enemy'] not in bosses:
        notes.append('bersaglio [6] %d non e\' il primo nemico di una squadra capo (%s)' % (stg['target_enemy'], bosses))
    uids = [x['uid'] for x in ens + chs] + [t['uid'] for t in teams]
    if len(uids) != len(set(uids)):
        notes.append('uid ripetuti')
    return ens, chs, refs, notes


report, miss_e, miss_e_real, miss_r, miss_r_real = [], {}, {}, {}, {}
reward_use = {}
out_stage = os.path.join(args.out, 'stage')
if not args.check:
    shutil.rmtree(out_stage, ignore_errors=True)
    os.makedirs(out_stage)
for sid in story:
    if sid in KEEP_WW:
        report.append({'stageId': sid, 'source': 'ww', 'note': 'originale delle risorse WW'})
        continue
    order = ['2016', 'jp'] if sid in FORCE_2016 else ['jp', '2016']
    cands, why = [], []
    for src in order:
        got, err = load(src, sid)
        if not got:
            why.append('%s: %s' % (src, err))
            continue
        ens, chs, refs, notes = checks(sid, got[0], got[1])
        unknown = [e for e in refs if e not in enemy_ids and e not in real_enemy]
        cands.append(((len(unknown), len(notes)), src, got, (ens, chs, refs, notes)))
    if not cands:
        report.append({'stageId': sid, 'source': None, 'note': '; '.join(why)})
        continue
    # la fonte preferita, salvo che un'altra abbia meno nemici sconosciuti / obiettivi della master
    # non soddisfatti (JP ha ridisegnato alcune missioni con capi solo JP: es. 1210, 2440, 6400)
    best = min(cands, key=lambda c: c[0])
    if best[0] < cands[0][0]:
        why.append('%s scartata: %s' % (cands[0][1], '; '.join(
            cands[0][3][3] + ['enemyId sconosciuti %s' % [e for e in cands[0][3][2] if e not in enemy_ids
                                                           and e not in real_enemy]])))
    else:
        best = cands[0]
    _, src, (stg, parts, warn, raw), (ens, chs, refs, notes) = best
    bad_e = sorted(e for e in refs if e not in enemy_ids)
    bad_r = sorted({x['reward'] for x in ens + chs if x['reward'] not in reward_ids})
    for e in bad_e:
        miss_e.setdefault(e, {'uses': refs[e], 'stages': []})['stages'].append(sid)
        if e not in real_enemy:
            miss_e_real.setdefault(e, []).append(sid)
    for x in ens + chs:
        u = reward_use.setdefault(x['reward'], {'enemy': 0, 'chest': 0, 'stages': set()})
        u['enemy' if 'enemyId' in x else 'chest'] += 1
        u['stages'].add(sid)
    for r in bad_r:
        miss_r.setdefault(r, []).append(sid)
        if r not in real_reward:
            miss_r_real.setdefault(r, []).append(sid)
    report.append({'stageId': sid, 'source': src, 'version': stg['version'],
                   'part_versions': [p['version'] for p in parts], 'parts': len(parts),
                   'rooms': [p['room'] for p in parts], 'target': stg['target_enemy'], 'card': stg['card_enemy'],
                   'teams': stg['teams_total'], 'enemies': len(ens), 'chests': len(chs),
                   'materials': sum(p['counts']['materials'] for p in parts),
                   'missing_enemies': bad_e, 'missing_rewards': bad_r, 'checks': notes, 'stg_warnings': warn,
                   'note': '; '.join(why)})
    if not args.check:
        open(os.path.join(out_stage, 'mappoi_stg%05d.bin' % sid), 'wb').write(raw[0])
        for k, p in enumerate(raw[1:]):
            open(os.path.join(out_stage, 'mappoi_stg%05d_%02d.bin' % (sid, k)), 'wb').write(p)


def use(r):
    u = reward_use[r]
    return {'enemy': u['enemy'], 'chest': u['chest'], 'stages': sorted(u['stages'])[:12],
            'real_row': r in real_reward}


os.makedirs(args.out, exist_ok=True)
summary = {
    'missions': len(story),
    'by_source': {str(s): sum(1 for r in report if r['source'] == s) for s in ('jp', '2016', 'ww', None)},
    'missing_enemies': {str(k): v for k, v in sorted(miss_e.items())},
    'missing_enemies_also_from_real_table': {str(k): v for k, v in sorted(miss_e_real.items())},
    'missing_rewards': {str(k): use(k) for k in sorted(miss_r)},
    'missing_rewards_also_from_real_table': {str(k): v for k, v in sorted(miss_r_real.items())},
    'checks': {str(r['stageId']): r['checks'] for r in report if r.get('checks')},
}
json.dump({'summary': summary, 'stages': report}, open(os.path.join(args.out, 'report.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
lines = ['# Stage originali importati', '', '```', json.dumps(summary['by_source']), '```', '',
         'Senza fonte: ' + (', '.join('%d (%s)' % (r['stageId'], r['note']) for r in report if not r['source']) or 'nessuna'),
         '', 'Nemici assenti dal master: %d id (%s); anche dalla tabella vera: %s' % (
             len(miss_e), ', '.join(map(str, sorted(miss_e))), ', '.join(map(str, sorted(miss_e_real))) or 'nessuno'),
         'Premi assenti dal master: %d id; anche dalla tabella vera: %d' % (len(miss_r), len(miss_r_real)),
         'Stage con avvisi di controllo: %d' % len(summary['checks'])]
open(os.path.join(args.out, 'report.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(json.dumps(summary['by_source']), '| nemici assenti:', len(miss_e), '(dalla tabella vera: %d)' % len(miss_e_real),
      '| premi assenti:', len(miss_r), '(dalla tabella vera: %d)' % len(miss_r_real),
      '| stage con avvisi:', len(summary['checks']))
for r in report:
    if not r['source']:
        print('  ! %d: %s' % (r['stageId'], r['note']))
