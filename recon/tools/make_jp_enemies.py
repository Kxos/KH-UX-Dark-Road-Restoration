"""Pacchetto statico delle grafiche originali dei nemici (JP 4.3.1 + 2016) per il client: enemy_gen\\files.

    python recon/tools/make_jp_enemies.py [--out D:\\Progetto_Restauro_KH_UX\\enemy_gen] [--story-only]
        [--ids 2,3] [--dry] [--jobs N]             (Pillow: senza -I)

Le risorse WW servono lwf/character/enemy/<displayId>/ solo per 6 nemici KHUX (1, 6, 8, 17, 37, 1020)
e per le serie di Dark Road: make-game-tables.js da' a tutti gli altri un sostituto (Shadow, Armored
Knight...). Qui si ricostruiscono le cartelle dei displayId originali (master_data\\enemy_display_orig.json)
che il master usa e che nessun indice serve (names_v4.tsv + ipa431\\names_addnl.tsv), dalle fonti in
sola lettura: dati JP 4.3.1 di thethiny (`lwf/character/enemy/`, PNG veri, nomi con revisione
`<nome>.<8 cifre>.<ext>`: vale la piu' alta, come latest() di import_jp_coco.py) e pacchetto 2016
(tmp\\thethiny_x\\bundle2016\\files\\lwf\\character\\enemy, gia' BTF).

Animazioni (docs/notes/battaglia.md#nemici-jp): [fn] apre per stato la LWF della tabella
0x1f1cc88 {wait, bwait, move, atk%d_o, atkSp, knockback, dead}; [fn] rende NULL se il file
manca e il chiamante lo dereferenzia: crash. bwait e atkSp sono facoltative ([fn] ne prova
l'esistenza: assenti -> wait); atk%d_o usa attackMotion di enemyAttack (oggi sempre 1).
  * obbligatorie: wait, atk1_o, knockback, dead e move;
  * move assente o incompleta nelle fonti (142 dei 360 nemici JP non l'hanno: piante, boss fermi)
    -> copia di wait come fa make_enemy_moves.py per Dark Road (il nemico scivola senza animarsi);
  * facoltative (bwait, atkSp, atk2_o..): solo se complete; le altre cartelle JP (atk1_n, open,
    wait_dead...) il client non le apre.
Per ogni animazione si sceglie, in ordine: (1) LWF JP con tutte le texture JP (le mancanti prese dal
2016 solo se il LWF 2016 e' identico byte per byte); (2) LWF 2016 con tutte le texture 2016;
(3) LWF JP con le texture scartate dall'estrazione JP (file identici tolti) riprese da un'altra
animazione dello stesso nemico con lo stesso nome originale (<anim>_<esadecimale>.png), se tutte le
copie candidate sono identiche (come LWF_FILL di import_jp_coco.py). Altrimenti l'animazione e'
incompleta; un nemico entra solo se tutte le obbligatorie sono complete (mai una texture assente).
In (3), se nessuna copia dello stesso nemico va bene, la texture si prende dalla tabella dei doppioni
(recon/tools/jp_dedup_donors.tsv, jp_dedup_donors.py: file identico rimasto in un'altra cartella JP, spesso
lwf/drama/<id>/; regole misurate sul pacchetto 2016, precisione >= 99%); `--donors ''` la esclude.

Effetti di comparsa: lwf/character/enemy/show_effect_fla/show_effect<N>/ per gli showSwf originali
(external\\thethiny\\enemy_dec.json) non serviti, stesse regole (completi o niente).

Texture: PNG JP (alpha diritta) -> BTF tipo 8 con btf.encode (premoltiplica); BTF 2016 copiati.
Uscita: <out>\\files\\lwf\\character\\enemy\\... (i file non piu' previsti si tolgono), <out>\\report.json
e report.md. make-game-tables.js legge <out>\\files per tenere il displayId originale.
"""
import argparse
import hashlib
import json
import os
import re
import sys
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
D = r'D:\Progetto_Restauro_KH_UX'
REPO = os.path.dirname(os.path.dirname(HERE))
JP_ROOT = os.path.join(D, '[local reference data]', '', '[local reference data]', 'data',
                       '[local reference data]', 'data', 'jp_final_4.3.1')
REV = re.compile(r'^(.*)\.(\d{8})(\.[^.]+)$')
PNGREF = re.compile(rb'[\w\-.]+\.png')
MANDATORY = ['wait', 'atk1_o', 'knockback', 'dead']          # + move (eventualmente da wait)
OPTIONAL = re.compile(r'^(bwait|atkSp|atk\d+_o)$')
ENEMY = 'lwf/character/enemy'

ap = argparse.ArgumentParser()
ap.add_argument('--jp', default=os.path.join(JP_ROOT, 'lwf', 'character', 'enemy'))
ap.add_argument('--jp-root', default=JP_ROOT, help='radice JP delle sorgenti della tabella dei doppioni')
ap.add_argument('--donors', default=None, help="tabella dei doppioni (default recon/tools/jp_dedup_donors.tsv; '' = nessuna)")
ap.add_argument('--b2016', default=os.path.join(D, 'tmp', 'thethiny_x', 'bundle2016', 'files', 'lwf', 'character', 'enemy'))
ap.add_argument('--index', action='append')
ap.add_argument('--master', default=os.path.join(REPO, 'server', 'master_data'))
ap.add_argument('--real', default=os.path.join(D, 'external', 'thethiny', 'enemy_dec.json'))
ap.add_argument('--poi', action='append', help='stage_poi (enemyId degli stage di storia)')
ap.add_argument('--oltre', default=os.path.join(D, 'reference', 'world_schema', 'oltre525', 'enemies_oltre525.json'),
                help='nemici delle missioni 526-979 assenti dal master ({missing}): anche le cartelle delle loro famiglie')
ap.add_argument('--out', default=os.path.join(D, 'enemy_gen'))
ap.add_argument('--story-only', action='store_true', help='solo i nemici degli stage di storia (--poi)')
ap.add_argument('--ids', help='solo questi displayId (elenco con virgole), per prove')
ap.add_argument('--dry', action='store_true', help='solo rapporto, nessuna scrittura in files')
ap.add_argument('--jobs', type=int, default=0)
a = ap.parse_args()
a.index = a.index or [os.path.join(D, 'resource_data', 'names_v4.tsv'), os.path.join(D, 'ipa431', 'names_addnl.tsv')]
a.poi = a.poi or [os.path.join(D, 'stage_gen', 'orig_stages', 'stage_poi_orig.json'),
                  os.path.join(REPO, 'server', 'game_data', 'stage_poi.json')]
OUT_FILES = os.path.join(a.out, 'files')
import jp_dedup_donors  # noqa: E402
DONORS = jp_dedup_donors.load(jp_dedup_donors.TABLE if a.donors is None else a.donors)


def donor(published):
    """Texture scartata come doppione dall'estrazione JP: il file identico rimasto altrove (tabella)."""
    return jp_dedup_donors.lookup(DONORS, published, a.jp_root)


def listing(p):
    """Cartella -> {nome logico: percorso della revisione piu' alta}."""
    idx = {}
    if os.path.isdir(p):
        for f in os.listdir(p):
            if not os.path.isfile(os.path.join(p, f)):
                continue
            m = REV.match(f)
            base, r = (m.group(1) + m.group(3), int(m.group(2))) if m else (f, -1)
            if base not in idx or idx[base][0] < r:
                idx[base] = (r, os.path.join(p, f))
    return {k: v[1] for k, v in idx.items()}


_sha = {}


def sha(p):
    if p not in _sha:
        _sha[p] = hashlib.sha1(open(p, 'rb').read()).digest()
    return _sha[p]


def refs_of(lwf):
    return sorted({m.decode() for m in PNGREF.findall(open(lwf, 'rb').read())})


def plan_anim(root_rel, anim, jp_all):
    """Animazione <root_rel>/<anim>/: -> (stato, {nome: fonte} o None, nota).
    jp_all: {anim: listing JP} dello stesso nemico (per le texture scartate come doppioni)."""
    jp = jp_all.get(anim) or {}
    b = listing(os.path.join(a.b2016, *root_rel.split('/'), anim))
    lw = anim + '.lwf'
    jl, bl = jp.get(lw), b.get(lw)
    pre = '%s/%s/%s/' % (ENEMY, root_rel, anim)
    notes = []
    if jl:
        refs = refs_of(jl)
        same_b = bl is not None and sha(bl) == sha(jl)
        todo, miss = {pre + lw: jl}, []
        for t in refs:
            p = jp.get(t) or (b.get(t) if same_b else None)
            if p:
                todo[pre + t] = p
            else:
                miss.append(t)
        if not miss:
            return 'jp', todo, 'texture dal 2016 (LWF identico)' if any(v in b.values() for v in todo.values()) else ''
        notes.append('JP: %d texture assenti su %d' % (len(miss), len(refs)))
    if bl:
        refs = refs_of(bl)
        miss = [t for t in refs if t not in b]
        if not miss:
            return '2016', {pre + lw: bl, **{pre + t: b[t] for t in refs}}, '; '.join(notes)
        notes.append('2016: %d texture assenti su %d' % (len(miss), len(refs)))
    if jl:
        # texture scartate dall'estrazione JP perche' identiche a un altro file: stesso nome originale
        # (dopo il prefisso dell'animazione) in un'altra animazione dello stesso nemico
        todo, filled, dons = {pre + lw: jl}, [], []
        ok = True
        for t in refs_of(jl):
            if t in jp:
                todo[pre + t] = jp[t]
                continue
            # prima le copie dello stesso nemico (regole sotto), poi la tabella dei doppioni (21-10)
            dp = donor(pre + t)
            suf = t[len(anim) + 1:] if t.startswith(anim + '_') else None
            cands = [] if suf is None else [fs[o + '_' + suf] for o, fs in jp_all.items()
                                              if o != anim and (o + '_' + suf) in fs]
            if not (cands and len({sha(c) for c in cands}) == 1):
                # stesso nome esatto in un'altra animazione (21-10, I-009 Task 7): il LWF di wait cita
                # wait_<x>.png e il file vero e' rimasto solo in atk1_o/ (che cita le stesse bitmap di wait),
                # le altre copie erano stub di deduplicazione (es. 1532, 1550, 1561: 0 texture in wait/)
                cands = [fs[t] for o, fs in jp_all.items() if o != anim and t in fs]
            if cands and len({sha(c) for c in cands}) == 1:
                todo[pre + t] = cands[0]
                filled.append(t)
            elif dp:
                todo[pre + t] = dp
                dons.append(t)
            else:
                ok = False
                break
        if ok:
            notes.append('%d texture da altre animazioni dello stesso nemico' % len(filled))
            if dons:
                notes.append('%d dalla tabella dei doppioni' % len(dons))
            return 'jp+riempite', todo, '; '.join(notes)
    if not jl and not bl:
        return 'assente', None, '; '.join(notes) or 'nessuna fonte'
    return 'incompleta', None, '; '.join(notes)


def plan_enemy(d):
    rel = str(d)
    jp_all = {}
    jd = os.path.join(a.jp, rel)
    if os.path.isdir(jd):
        for an in os.listdir(jd):
            if os.path.isdir(os.path.join(jd, an)):
                jp_all[an] = listing(os.path.join(jd, an))
    bd = os.path.join(a.b2016, rel)
    anims = set(jp_all) | (set(f for f in os.listdir(bd) if os.path.isdir(os.path.join(bd, f))) if os.path.isdir(bd) else set())
    r = {'displayId': d, 'sources': [s for s, p in (('jp', jd), ('2016', bd)) if os.path.isdir(p)], 'anims': {}}
    todo = {}
    fatal = []
    for an in MANDATORY + ['move'] + sorted(x for x in anims if OPTIONAL.match(x)):
        st, files, note = plan_anim(rel, an, jp_all)
        r['anims'][an] = {'status': st, 'note': note} if note else {'status': st}
        if files:
            todo.update(files)
        elif an in MANDATORY:
            fatal.append(an)
    if 'wait' not in fatal and r['anims']['move']['status'] in ('assente', 'incompleta'):
        # move da wait: stessi file (le texture tengono il nome wait_*, che il LWF cita)
        pre_w, pre_m = '%s/%s/wait/' % (ENEMY, rel), '%s/%s/move/' % (ENEMY, rel)
        for n, p in list(todo.items()):
            if n.startswith(pre_w):
                f = n[len(pre_w):]
                todo[pre_m + ('move.lwf' if f == 'wait.lwf' else f)] = p
        r['anims']['move']['status'] = 'da wait (' + r['anims']['move']['status'] + ')'
    if fatal:
        r.update(status='incompleto', why='animazioni obbligatorie mancanti o incomplete: ' + ', '.join(fatal))
        return r, {}
    r.update(status='completo', files=len(todo))
    return r, todo


def family_of(i):
    """Famiglia grafica di un enemyId: ultime 4 cifre (delle ultime 5 per gli id da 8 cifre in su), come familyOf
    di server/make-enemy-oltre.js."""
    return (i % 100000 if i >= 10 ** 7 else i) % 10000


def oltre_families(ids, served=()):
    """Nemici delle missioni 526-979 assenti dal master (enemies_oltre525.json) -> {famiglia: [enemyId]} per le
    famiglie con la cartella JP (o 2016) non servite dagli indici. displayId originale = famiglia: nel master ogni
    riga di storia da 1000 in su ha displayId = famiglia (1001-1006, 1020-1023, 1501, 2001-2003, 11501, 12001...;
    le eccezioni sono solo eventi 5xxx/6xxx/8xxx/9xxx) e le 139 famiglie nuove hanno tutte la loro cartella JP."""
    out = {}
    for i in ids:
        f = family_of(i)
        if f in served or f >= 5000:
            continue
        if os.path.isdir(os.path.join(a.jp, str(f))) or os.path.isdir(os.path.join(a.b2016, str(f))):
            out.setdefault(f, []).append(i)
    return out


def plan_show(n):
    rel = 'show_effect_fla'
    an = 'show_effect%d' % n
    jp_all = {an: listing(os.path.join(a.jp, rel, an))}
    st, files, note = plan_anim(rel, an, jp_all)
    return {'showSwf': n, 'status': st, 'note': note}, files or {}


def convert(job):
    name, src, dst = job
    try:
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            return name, 'tenuto', os.path.getsize(dst)
        d = open(src, 'rb').read()
        if name.endswith('.png'):
            if d[:4] == b'\x89BTF':
                out = d
            elif d[:8] == b'\x89PNG\r\n\x1a\n':
                import btf
                from PIL import Image
                out = btf.encode(Image.open(src).convert('RGBA'))
            else:
                return name, 'formato sconosciuto', 0
        else:
            out = d
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        tmp = dst + '.tmp'
        with open(tmp, 'wb') as fh:
            fh.write(out)
        os.replace(tmp, dst)
        return name, 'scritto', len(out)
    except Exception as e:                  # noqa: BLE001
        return name, 'errore %r' % e, 0


def main():
    served = set()
    shows_served = set()
    for tsv in a.index:
        with open(tsv, encoding='utf-8') as fh:
            for line in fh:
                m = re.match(r'lwf/character/enemy/(\d+)/wait/', line)
                if m:
                    served.add(int(m.group(1)))
                m = re.match(r'lwf/character/enemy/show_effect_fla/show_effect(\d+)/', line)
                if m:
                    shows_served.add(int(m.group(1)))
    enemies = json.load(open(os.path.join(a.master, 'enemy.json'), encoding='utf-8'))
    orig = json.load(open(os.path.join(a.master, 'enemy_display_orig.json'), encoding='utf-8'))
    disp = {e['enemyId']: orig.get(str(e['enemyId']), e['displayId']) for e in enemies}
    story_ids = set()
    for p in a.poi:
        if os.path.exists(p):
            for st in json.load(open(p, encoding='utf-8')).values():
                story_ids.update(x['enemyId'] for x in st.get('enemies', []))
    story_disp = {disp[i] for i in story_ids if i in disp}
    want = sorted({d for d in disp.values() if d not in served and d < 5000})
    if a.story_only:
        want = [d for d in want if d in story_disp]
    # famiglie dei nemici delle missioni 526-979 (I-009 Task 7, 21-10): righe aggiunte da make-enemy-oltre.js, che
    # prende il displayId della famiglia quando la sua cartella qui e' completa; sono tutte di storia
    oltre = {}
    if a.oltre and os.path.exists(a.oltre):
        miss = json.load(open(a.oltre, encoding='utf-8')).get('missing', {})
        # solo le famiglie che il master non chiede gia' (le altre, es. 3 o 56, sono il displayId di righe vere)
        oltre = {f: v for f, v in oltre_families(sorted(int(k) for k in miss), served).items()
                 if f not in want and f not in disp.values()}
        story_disp |= set(oltre)
        want = sorted(set(want) | set(oltre))
    if a.ids:
        want = [int(x) for x in a.ids.split(',') if x]
    results, plan = [], {}
    for d in want:
        r, todo = plan_enemy(d)
        r['story'] = d in story_disp
        r['enemies'] = sorted(i for i, x in disp.items() if x == d)
        if d in oltre:
            r['oltre'] = sorted(oltre[d])
        results.append(r)
        plan.update(todo)
    # effetti di comparsa: showSwf originali (righe vere) non serviti
    real = json.load(open(a.real, encoding='utf-8')) if os.path.exists(a.real) else []
    have = set(disp)
    need_shows = sorted({x['showSwf'] for x in real if x['enemyId'] in have} - shows_served)
    show_res = []
    for n in need_shows:
        r, todo = plan_show(n)
        show_res.append(r)
        plan.update(todo)
    jobs = [(n, p, os.path.join(OUT_FILES, *n.split('/'))) for n, p in sorted(plan.items())]
    stats, size, errors = {}, 0, []
    if not a.dry:
        with Pool(a.jobs or None) as pool:
            for n, st, sz in pool.imap_unordered(convert, jobs, chunksize=32):
                k = st.split(' ')[0]
                stats[k] = stats.get(k, 0) + 1
                size += sz
                if st.startswith(('errore', 'formato')):
                    errors.append((n, st))
        keep = {os.path.normcase(j[2]) for j in jobs}
        removed = 0
        for dp, _, fs in os.walk(OUT_FILES, topdown=False):
            for f in fs:
                p = os.path.join(dp, f)
                if os.path.normcase(p) not in keep:
                    os.remove(p)
                    removed += 1
            if dp != OUT_FILES and not os.listdir(dp):
                os.rmdir(dp)
        stats['tolti'] = removed
    else:
        have_sz = [os.path.getsize(j[2]) for j in jobs if os.path.exists(j[2])]
        size = sum(have_sz)
        stats['gia_scritti'] = len(have_sz)
    ok = [r for r in results if r['status'] == 'completo']
    bad = [r for r in results if r['status'] != 'completo']
    n_en_ok = sum(len(r['enemies']) for r in ok)
    story_en_bad = sorted(i for i in story_ids if i in disp and disp[i] in {r['displayId'] for r in bad})
    story_en_served = sorted(i for i in story_ids if i in disp and disp[i] in served)
    rep = {'out': OUT_FILES, 'story_only': a.story_only, 'displayIds': len(results), 'complete': len(ok),
           'incomplete': len(bad), 'enemy_rows_original': n_en_ok, 'files': len(jobs), 'bytes': size,
           'write_stats': stats, 'errors': errors,
           'complete_ids': [r['displayId'] for r in ok], 'incomplete_ids': [r['displayId'] for r in bad],
           'story_displayIds': sorted(story_disp), 'story_enemies': len(story_ids & have),
           'story_enemies_served': len(story_en_served), 'story_enemies_substituted': story_en_bad,
           'oltre_families': len(oltre), 'oltre_complete': [r['displayId'] for r in ok if r.get('oltre')],
           'oltre_incomplete': [r['displayId'] for r in bad if r.get('oltre')],
           'move_from_wait': [r['displayId'] for r in ok if r['anims']['move']['status'].startswith('da wait')],
           'shows': show_res, 'results': results}
    os.makedirs(a.out, exist_ok=True)
    json.dump(rep, open(os.path.join(a.out, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    names = {e['enemyId']: e['name'] for e in enemies}
    prop_p = os.path.join(os.path.dirname(a.oltre or ''), 'enemy_clone_proposal.json')
    prop = json.load(open(prop_p, encoding='utf-8')) if a.oltre and os.path.exists(prop_p) else {}

    def label(r):
        if r['enemies']:
            return ', '.join(names.get(i, '?') for i in r['enemies'][:3])
        return '526-979: ' + ', '.join('%d %s' % (i, (prop.get(str(i)) or {}).get('name') or '?') for i in r.get('oltre', [])[:3])
    L = ['# enemy_gen: grafiche originali dei nemici', '',
         'Generato da `recon/tools/make_jp_enemies.py`%s. displayId non serviti usati dal master: %d; completi: %d '
         '(%d righe enemy); incompleti: %d. File: %d (%.1f MB).' % (
             ' --story-only' if a.story_only else '', len(results), len(ok), n_en_ok, len(bad), len(jobs), size / 1e6),
         '', 'Nemici degli stage di storia: %d (serviti dalle risorse WW: %d); restano col sostituto: %d.' % (
             len(story_ids & have), len(story_en_served), len(story_en_bad)),
         '', 'move ricostruita da wait: %s' % ', '.join(map(str, rep['move_from_wait'])), '',
         '## Incompleti (restano col sostituto)', '']
    for r in bad:
        L.append('- %d%s (%s): %s; %s' % (r['displayId'], ' storia' if r['story'] else '',
                                          label(r), r['why'],
                                          '; '.join('%s %s%s' % (k, v['status'], ' (' + v['note'] + ')' if v.get('note') else '')
                                                    for k, v in r['anims'].items() if k in MANDATORY)))
    L += ['', '## Completi', '', '| displayId | nemici | animazioni |', '|---|---|---|']
    for r in ok:
        L.append('| %d%s | %s | %s |' % (r['displayId'], ' (storia)' if r['story'] else '',
                                         label(r),
                                         ', '.join('%s:%s' % (k, v['status']) for k, v in r['anims'].items()
                                                   if v['status'] not in ('assente', 'incompleta'))))
    L += ['', '## Effetti di comparsa', '']
    for r in show_res:
        L.append('- show_effect%d: %s%s' % (r['showSwf'], r['status'], ' (' + r['note'] + ')' if r.get('note') else ''))
    open(os.path.join(a.out, 'report.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('displayId %d: completi %d (%d righe enemy), incompleti %d | effetti %s | file %d | %.1f MB | %s' % (
        len(results), len(ok), n_en_ok, len(bad),
        {r['showSwf']: r['status'] for r in show_res}, len(jobs), size / 1e6, stats))
    print('storia: nemici %d, serviti %d, col sostituto %d' % (len(story_ids & have), len(story_en_served), len(story_en_bad)))
    for n, st in errors[:20]:
        print('  ERRORE', n, st)
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
