"""Prova di import_orig_stages.py --oltre e make_missing_part.py (I-009, missioni 526-979):

    python -I recon/tools/test_import_oltre.py

Lancia l'import su 3 missioni (526, 555, 617) in una cartella temporanea sotto D:\\Progetto_Restauro_KH_UX\\tmp
(dati veri: stage JP 4.3.1 di thethiny, reference\\world_schema\\oltre525\\oltre525.json) e controlla:
  * un file per ogni parte dichiarata dall'STG, tutti riletti da mapfile.parse_stg/parse_map senza problemi;
  * Q555 -> 5 stage 18300-18304 (il client carica 18300 + unionId - 1);
  * Q617 (20320) -> parte 1 ricostruita nella stanza CD_0003_00_00, arrivo dalla parte 0 vicino alla porta
    originale CD_0003_01_00>CD_0003_00_00 e uscita verso la parte 0 sulla porta CD_0003_00_00>CD_0003_01_00;
    STG originale intatto, bersaglio [6] primo nemico di una squadra capo nella parte 1;
  * POI (stage_poi_oltre.json): sotto ognuno degli stageId 18300-18304 le uid (e i premi) di tutte e 5 le varianti
    (Review Focus 3: il server puo' ricevere 18300 o la variante);
  * report.json: nessuna parte mancante, ogni enemyId in una categoria nota (master, enemy_dec, clone, non coperto).
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mapfile  # noqa: E402

D = r'D:\Progetto_Restauro_KH_UX'
OLTRE = os.path.join(D, 'reference', 'world_schema', 'oltre525', 'oltre525.json')
JP_STAGE = os.path.join(D, '[local reference data]', '', '[local reference data]', 'data',
                        '[local reference data]', 'data', 'jp_final_4.3.1', 'stage')
fails = []


def check(cond, msg):
    if not cond:
        fails.append(msg)
        print('FAIL', msg)


os.makedirs(os.path.join(D, 'tmp'), exist_ok=True)
t = tempfile.mkdtemp(prefix='t3_oltre_', dir=os.path.join(D, 'tmp'))
try:
    out = os.path.join(t, 'out')
    r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'import_orig_stages.py'), '--oltre', OLTRE,
                        '--only', '526,555,617', '--out', out], capture_output=True, text=True)
    print(r.stdout[-2000:], r.stderr[-3000:])
    check(r.returncode == 0, 'import_orig_stages.py --oltre esce con %d' % r.returncode)
    st = os.path.join(out, 'stage')
    files = mapfile.iter_stage_files(st) if os.path.isdir(st) else {}
    want = {18010: 2, 18300: 1, 18301: 1, 18302: 1, 18303: 1, 18304: 1, 20320: 2}
    check(sorted({k[0] for k in files}) == sorted(want), 'stage scritti %s, attesi %s' % (
        sorted({k[0] for k in files}), sorted(want)))
    parsed = {}
    for sid, n in want.items():
        try:
            stg, parts = mapfile.load_stage(files, sid)
            bad, _ = mapfile.check_stage(stg, parts)
            check(not bad, '%d: problemi %s' % (sid, bad))
            check(stg['parts'] == n == len(parts), '%d: parti %d, attese %d' % (sid, stg['parts'], n))
            check(all(p['client_layout'] for p in parts) and stg['client_layout'], '%d: formato < 13' % sid)
            parsed[sid] = (stg, parts)
        except (mapfile.FormatError, KeyError) as e:
            check(False, '%d: non si rilegge (%s)' % (sid, e))

    # Q617: parte 1 ricostruita
    oltre = json.load(open(OLTRE, encoding='utf-8'))
    doors = {d['door']: d for d in oltre['doors']}
    if 20320 in parsed:
        stg, (p0, p1) = parsed[20320]
        jp_stg = open(os.path.join(JP_STAGE, 'mappoi_stg20320.bin'), 'rb').read()
        check(open(os.path.join(st, 'mappoi_stg20320.bin'), 'rb').read() == jp_stg, '617: STG diverso dall\'originale')
        check(open(os.path.join(st, 'mappoi_stg20320_00.bin'), 'rb').read()
              == open(os.path.join(JP_STAGE, 'mappoi_stg20320_00.bin'), 'rb').read(), '617: parte 0 diversa dall\'originale')
        check(p0['room'] == 'CD_0003_01_00' and p1['room'] == 'CD_0003_00_00', '617: stanze %s %s' % (p0['room'], p1['room']))
        ex0 = [e for e in p0['exits'] if e['dest_part'] == 1]
        ex1 = [e for e in p1['exits'] if e['dest_part'] == 0]
        check(len(ex0) == 1 and len(ex1) == 1, '617: uscite 0->1 %d, 1->0 %d' % (len(ex0), len(ex1)))
        if ex0 and ex1:
            back = doors['CD_0003_00_00>CD_0003_01_00#1']
            near = lambda a, b, tol: abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol
            check(near((ex1[0]['x'], ex1[0]['y']), (back['x'], back['y']), 60),
                  '617: uscita della parte 1 (%d,%d) lontana dalla porta %s (%d,%d)' % (
                      ex1[0]['x'], ex1[0]['y'], back['door'], back['x'], back['y']))
            check(abs((ex1[0]['arrow_deg'] - back['angle_schema'] + 180) % 360 - 180) <= 20,
                  '617: freccia %d, porta %d' % (ex1[0]['arrow_deg'], back['angle_schema']))
            # arrivo nella parte 1 = partenza della parte ricostruita: vicino alla porta di ritorno
            check(near((ex0[0]['arrive_x'], ex0[0]['arrive_y']), (back['x'], back['y']), 400),
                  '617: arrivo nella parte 1 lontano dalla porta di ritorno')
            # uscita di ritorno: arrivo nella parte 0 vicino alla porta CD_0003_01_00>CD_0003_00_00
            fwd = doors['CD_0003_01_00>CD_0003_00_00#1']
            check(near((ex1[0]['arrive_x'], ex1[0]['arrive_y']), (fwd['x'], fwd['y']), 400),
                  '617: ritorno nella parte 0 lontano dalla porta di andata')
        bosses = [p1['enemies'][tm['first']]['enemyId'] for tm in p1['teams'] if tm['boss']]
        check(stg['target_enemy'] in bosses, '617: bersaglio %d non capo nella parte 1 (%s)' % (stg['target_enemy'], bosses))
        uids = [x['uid'] for p in (p0, p1) for x in p['enemies'] + p['chests']] + [tm['uid'] for p in (p0, p1) for tm in p['teams']]
        check(len(uids) == len(set(uids)), '617: uid ripetuti')
        check(len(p1['chests']) == stg['chests_total'] - len(p0['chests']), '617: forzieri della parte 1')
        check(p1['counts']['materials'] == stg['materials_total'] - p0['counts']['materials'], '617: materiali della parte 1')

    # POI: Review Focus 3
    poi_p = os.path.join(out, 'stage_poi_oltre.json')
    poi = json.load(open(poi_p, encoding='utf-8')) if os.path.exists(poi_p) else {}
    variants = range(18300, 18305)
    union = {}
    for sid in variants:
        if sid in parsed:
            for e in parsed[sid][1][0]['enemies']:
                union[('e', e['uid'])] = e['reward']
            for c in parsed[sid][1][0]['chests']:
                union[('c', c['uid'])] = c['reward']
    check(bool(union), 'Q555: nessuna uid delle varianti')
    for sid in variants:
        s = poi.get(str(sid))
        check(s is not None, 'POI: manca lo stage %d' % sid)
        if s:
            got = {('e', e['uid']): e['reward'] for e in s['enemies']}
            got.update({('c', c['uid']): c['reward'] for c in s['chests']})
            check(got == union, 'POI %d: uid %s, unione delle varianti %s' % (sid, got, union))
    for sid in (18010, 20320):
        check(str(sid) in poi, 'POI: manca lo stage %d' % sid)
    if '20320' in poi:
        check(any(e['map'] == 1 for e in poi['20320']['enemies']), 'POI 20320: nessun nemico della parte 1')

    rep_p = os.path.join(out, 'report.json')
    rep = json.load(open(rep_p, encoding='utf-8')) if os.path.exists(rep_p) else {'summary': {}, 'stages': []}
    sm = rep['summary']
    check(sm.get('missions') == 7, 'report: stage %s, attesi 7' % sm.get('missions'))
    check(all(s.get('source') for s in rep['stages']), 'report: stage senza fonte %s' % [
        s['stageId'] for s in rep['stages'] if not s.get('source')])
    check(sm.get('parts_missing') == 0, 'report: parti mancanti %s' % sm.get('parts_missing'))
    cat = sm.get('enemy_categories', {})
    check(set(cat) >= {'master', 'enemy_dec', 'clone', 'uncovered', 'other'}, 'report: categorie %s' % sorted(cat))
    check(cat.get('other', {}).get('count', -1) == 0, 'report: enemyId fuori da ogni categoria %s' % cat.get('other'))
    rebuilt = [s for s in rep['stages'] if s['stageId'] == 20320]
    check(bool(rebuilt) and rebuilt[0].get('rebuilt_parts') == [1], 'report: 20320 senza rebuilt_parts [1]')
finally:
    shutil.rmtree(t, ignore_errors=True)

if fails:
    sys.exit('%d controlli falliti' % len(fails))
print('OK test_import_oltre')
