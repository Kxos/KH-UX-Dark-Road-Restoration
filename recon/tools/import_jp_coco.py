"""Layout CocoStudio originali dai dati JP 4.3.1 (thethiny) al posto dei nostri generati.

    python recon/tools/import_jp_coco.py [--check] [--list <file>] [--out <stage_gen\\files>]
                                         [--report <cartella>] [--jp <cocostudio JP>] ...

Per ogni layout attivo dell'elenco (`recon/tools/jp_coco_layouts.txt`, versionato) prende la
revisione JP corrente (entry id piu' alto: `Nome.<id 8 cifre>.ext`) e la sua chiusura
(sotto-layout delle scene, armature, texture) e la scrive in `<out>/cocostudio/publish/`,
sopra il layout generato da make_layouts.py (che va lanciato prima: il build lo fa).

Regole (docs/notes/risorse_layout.md#jp-originali):
- un nome gia' servito dalle risorse originali (indice `names_v4.tsv`) non si copia mai: vince
  la versione WW, comprese le 11 texture localizzate (Ch_Logo, World_Stage_Clear...);
- se la radice e' essa stessa un layout WW servito che make_layouts sovrascrive (es.
  MedalInfo_ReleaseWindow), si toglie la copia generata e restano il layout WW e le texture
  mancanti prese da JP;
- un sotto-layout che generiamo noi e che non e' nell'elenco resta il nostro;
- texture: servite -> nulla; disegnate da noi (make_textures) -> sostituite dall'originale
  JP solo se non sono l'atlante di un'armatura (plist) e se la tela e' uguale o nessun altro
  layout generato le usa; altrimenti restano le nostre (segnalato);
- PNG JP (alpha diritta) -> BTF premoltiplicato (btf.encode; senza Pillow resta il PNG e lo
  converte btf_fix.py nel build);
- testi: un'etichetta giapponese uguale (spazi esclusi) al testo JP di `text/ui/<id>` diventa
  il testo inglese dello stesso id, se l'id e' certo (tutti gli id candidati hanno lo stesso
  testo inglese); altrimenti resta il segnaposto (il codice lo sovrascrive).
Controlli che fermano la radice (non si scrive nulla della sua chiusura, resta il generato):
9-slice su una texture che non ci sarebbe (crash 0x2c, I-049), plist non servito (i plist
nuovi non si caricano), texture assente ovunque (salvo `+absent-ok`), widget `Txt_*_Cus`
(lo crea [fn]), widget richiesti dal codice (`need=`) assenti nell'originale, layout
assente in JP.

Manifest della provenienza in `<report>/manifest.json`: alla corsa successiva i file scritti
prima e non piu' richiesti si tolgono (solo se nessun altro li ha riscritti nel frattempo),
cosi' togliere una riga dall'elenco ripristina il generato. `--check` non scrive nulla.
Pillow e numpy servono per la conversione BTF: senza -I.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
D = r'D:\Progetto_Restauro_KH_UX'
JP_ROOT = os.path.join(D, '[local reference data]', '', '[local reference data]', 'data',
                       '[local reference data]', 'data', 'jp_final_4.3.1')
PUB = 'cocostudio/publish/'
# texture localizzate o ridisegnate nel WW (jp431_cocostudio.md §1): servite, vince sempre la WW
WW_WINS = {'Ch_Logo.png', 'Deck_Title_MD.png', 'Av_Title3.png', 'World_Stage_Clear.png', 'Raid_ChanceLogo.png',
           'Raid_List_BossWin2.png', 'Raid_List_Gage_Green.png', 'But04_On.png', 'AvtInfo_CrownIcon4.png',
           'Opt_Vol_Gage_Blue.png', 'Skill_Icon1.png'}
# texture JP con testo giapponese disegnato (jp431_cocostudio.md §3.1): non si importano mai,
# contano come assenti (da ridisegnare in inglese)
JP_DRAWN = re.compile(r'^(QuestBut6_Title|QuestBut7_Title|Rank_Title_3|Comeback_Tutorial_1|Comeback_Tutorial_Title1|'
                      r'Camp_Balloon3|TresXTresStartUp_.*_Logo)\.png$')
REV = re.compile(r'^(.*)\.(\d{8})(\.[^.]+)$')
JPCHR = re.compile(r'[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]')
CUS = re.compile(r'^Txt_.*_Cus$')

ap = argparse.ArgumentParser()
ap.add_argument('--list', default=os.path.join(HERE, 'jp_coco_layouts.txt'))
ap.add_argument('--texts', default=os.path.join(HERE, 'jp_coco_texts.tsv'))
ap.add_argument('--out', default=os.path.join(D, 'stage_gen', 'files'))
ap.add_argument('--report', default=None, help='cartella del rapporto (predefinita: <out>/../jp_import)')
ap.add_argument('--jp', default=os.path.join(JP_ROOT, 'cocostudio'))
ap.add_argument('--jp-text', default=os.path.join(JP_ROOT, 'text', 'ui'))
ap.add_argument('--served', default=os.path.join(D, 'resource_data', 'names_v4.tsv'))
ap.add_argument('--served-files', default=os.path.join(D, 'catalog', 'files'))
ap.add_argument('--en-text', action='append',
                default=None, help='cartelle text/ui inglesi (la prima che ha l\'id vince)')
ap.add_argument('--check', action='store_true', help='solo controlli e rapporto, nessuna scrittura')
ap.add_argument('--none', action='store_true',
                help='nessuna radice: toglie soltanto i file importati dalla corsa precedente (build-resources -NoJp)')
args = ap.parse_args()
OUT = args.out
REPORT = args.report or os.path.join(os.path.dirname(os.path.abspath(OUT)), 'jp_import')
EN_DIRS = args.en_text or [os.path.join(OUT, 'text', 'ui'), os.path.join(D, 'layouts', 'ui_texts', 'text', 'ui'),
                           os.path.join(D, 'catalog', 'files', 'text', 'ui')]

try:
    sys.path.insert(0, HERE)
    import btf                       # noqa: E402
    from PIL import Image            # noqa: E402
except ImportError:                  # python -I: niente Pillow, la conversione la fa btf_fix.py
    btf = Image = None


def latest(root):
    """nome logico relativo (con /) -> percorso della revisione corrente."""
    idx = {}
    for dp, _, fs in os.walk(root):
        rel = os.path.relpath(dp, root).replace(os.sep, '/')
        for f in fs:
            m = REV.match(f)
            base, r = (m.group(1) + m.group(3), int(m.group(2))) if m else (f, -1)
            key = base if rel == '.' else rel + '/' + base
            if key not in idx or idx[key][0] < r:
                idx[key] = (r, os.path.join(dp, f))
    return {k: v[1] for k, v in idx.items()}


def read_text(p):
    b = open(p, 'rb').read()
    for enc in ('utf-8-sig', 'utf-16'):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            pass
    return b.decode('utf-8', 'replace')


def load_json(p):
    return json.load(open(p, encoding='utf-8-sig'))


def sha(b):
    return hashlib.sha1(b).hexdigest()


# ---- elenco -------------------------------------------------------------------------------
roots, undecided = [], []
PIN = {}                                              # layout -> revisione scelta nell'elenco (rev=)
for ln, line in enumerate(open(args.list, encoding='utf-8'), 1):
    s = line.split('#', 1)[0].strip()
    if not s:
        continue
    parts = s.split()
    if parts[0] == '?':                       # da decidere: non si importa, solo rapporto
        undecided.append((parts[1], line.split('#', 1)[1].strip() if '#' in line else ''))
        continue
    opts = {'absent_ok': False, 'need': []}
    for p in parts[1:]:
        if p == '+absent-ok':
            opts['absent_ok'] = True
        elif p.startswith('rev='):              # revisione JP fissata: rev=0 = file senza suffisso
            opts['rev'] = int(p[4:])
        elif p.startswith('need='):
            opts['need'] += [x for x in p[5:].split(',') if x]
        elif p.startswith('clone='):            # clone=Origine>Nuovo[@Rif]: widget del WW assente nel JP
            for c in p[6:].split(','):
                m = re.match(r'^([^>@]+)>([^>@]+)(?:@(.+))?$', c)
                if not m:
                    sys.exit('%s:%d: clone= non valido %r' % (args.list, ln, c))
                opts.setdefault('clone', []).append(m.groups())
        elif p.startswith('set='):              # set=Widget.opzione=valore[,...]: ritocco del layout JP
            for c in p[4:].split(','):
                m = re.match(r'^([^.=]+)\.([^.=]+)=(.+)$', c)
                if not m:
                    sys.exit('%s:%d: set= non valido %r' % (args.list, ln, c))
                v = m.group(3)
                v = int(v) if re.fullmatch(r'-?\d+', v) else float(v) if re.fullmatch(r'-?\d+\.\d+', v) else v
                opts.setdefault('set', []).append((m.group(1), m.group(2), v))
        else:
            sys.exit('%s:%d: opzione sconosciuta %r' % (args.list, ln, p))
    if args.none:
        continue
    roots.append((parts[0], opts))
    if 'rev' in opts:
        PIN[parts[0]] = opts['rev']

# testi scritti a mano per le etichette che il codice non tocca e senza id certo
# (layout <tab> widget <tab> testo, \n per andare a capo)
TEXT_FIX = {}
if os.path.exists(args.texts):
    for line in open(args.texts, encoding='utf-8'):
        if line.strip() and not line.startswith('#'):
            a, b, c = line.rstrip('\r\n').split('\t')
            TEXT_FIX[(a, b)] = c.replace('\\n', '\n')

# ---- indici ---------------------------------------------------------------------------------
jp = latest(args.jp)                                   # 'publish/X.json' -> percorso
served = set()
for line in open(args.served, encoding='utf-8'):
    n = line.split('\t')[0].strip()
    if n.startswith(PUB):
        served.add(n[len(PUB):])
pub_out = os.path.join(OUT, *PUB.split('/'))
ours = set()                                           # file nostri in <out>/cocostudio/publish
for dp, _, fs in os.walk(pub_out):
    for f in fs:
        ours.add(os.path.relpath(os.path.join(dp, f), pub_out).replace(os.sep, '/'))
ours -= served
# i file copiati da JP alla corsa precedente (ancora intatti) non sono «nostri»
os.makedirs(REPORT, exist_ok=True)
man_path = os.path.join(REPORT, 'manifest.json')
old = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {}
for _n, _m in old.items():
    _p = os.path.join(pub_out, *_n.split('/'))
    if _n in ours and sha(open(_p, 'rb').read()) == _m['sha1']:
        ours.discard(_n)
# atlanti delle armature nostre: X0.plist -> X0.png e config_png_path degli ExportJson
atlases = {n[:-6] + '.png' for n in ours if n.endswith('.plist')}
gen_tex_users = {}                                     # texture -> layout generati che la citano
for n in ours:
    if n.endswith('.ExportJson'):
        try:
            atlases.update(x.split('/')[-1] for x in load_json(os.path.join(pub_out, n)).get('config_png_path') or [])
        except (ValueError, OSError):
            pass

jp_ui = {}
for k, p in latest(args.jp_text).items():
    if k.endswith('.txt') and '/' not in k:
        jp_ui[k[:-4]] = read_text(p).strip()
by_jp = {}
for i, t in jp_ui.items():
    by_jp.setdefault(re.sub(r'\s+', '', t), set()).add(i)


def en_text(i):
    for d in EN_DIRS:
        p = os.path.join(d, i + '.txt')
        if os.path.exists(p):
            return read_text(p)
    return None


def served_path(name):
    return os.path.join(args.served_files, *(PUB + name).split('/'))


jp_revs = {}                                          # 'X.json' -> [(entry id, percorso)], 0 = senza suffisso
for _f in os.listdir(os.path.join(args.jp, 'publish')):
    _m = REV.match(_f)
    _b, _r = (_m.group(1) + _m.group(3), int(_m.group(2))) if _m else (_f, 0)
    jp_revs.setdefault(_b, []).append((_r, os.path.join(args.jp, 'publish', _f)))


def jp_path(name):
    if name in PIN:
        return dict(jp_revs.get(name, [])).get(PIN[name])
    return jp.get('publish/' + name)


def widget_names(data):
    acc = set()

    def walk(n):
        if isinstance(n, dict):
            o = n.get('options')
            if isinstance(o, dict) and o.get('name'):
                acc.add(o['name'])
            if 'gameobjects' in n and n.get('name'):
                acc.add(n['name'])
            for v in n.values():
                if isinstance(v, (dict, list)):
                    walk(v)
        elif isinstance(n, list):
            for x in n:
                walk(x)
    walk(data)
    return acc


def suspicious_revision(name):
    """L'estrattore di thethiny a volte da' a una revisione il contenuto di un altro layout
    (PresentBOX_Panel_ver131.00265720 e' un pannello di icone): se la revisione scelta ha meno
    di meta' dei nomi di widget della prima, la si segnala."""
    rs = sorted(jp_revs.get(name, []))
    if len(rs) < 2 or name in PIN or not name.endswith('.json'):
        return None
    a, b = widget_names(load_json(rs[0][1])), widget_names(load_json(rs[-1][1]))
    if a and len(a & b) * 2 < len(a):
        return 'revisione %d con %d nomi su %d della prima: contenuto di un altro layout? (rev=0 nell\'elenco)' % (
            rs[-1][0], len(a & b), len(a))
    return None


# Stub: l'estrazione di thethiny ha tolto i file uguali a un altro, quindi una texture di
# publish/ puo' esistere solo con lo stesso nome in un'altra cartella (cocostudio/Panel10.png,
# img/ui/Complete_icon1.png...). Si cerca per nome, prima in cocostudio/, poi in img/.
jp_any = {}
for _k, _p in latest(args.jp).items():
    if not _k.startswith('publish/'):
        jp_any.setdefault(_k.split('/')[-1], _p)
for _k, _p in sorted(latest(os.path.join(os.path.dirname(args.jp), 'img')).items()):
    jp_any.setdefault(_k.split('/')[-1], _p)
ALT = {}                                              # texture -> percorso fuori da publish/


def jp_tex(name):
    if JP_DRAWN.match(name.split('/')[-1]):
        return None
    p = jp_path(name)
    if p is None and '/' not in name and name in jp_any:
        p = ALT[name] = jp_any[name]
    return p


def walk_widgets(w):
    yield w
    for c in w.get('children', []):
        yield from walk_widgets(c)


def clone_widget(data, src, new, ref=None):
    """Opzione clone=: copia il widget src (stesso genitore) col nome new e un tag nuovo; con ref
    lo mette alla posizione del widget ref. Per i widget che il codice WW cerca senza controllo e
    che il layout JP non ha (es. Txt_Medal_Label di Album_Medal_ver140)."""
    import copy
    found, tags = {}, []

    def walk(n, parent):
        o = n.get('options') or {}
        if isinstance(o.get('tag'), int):
            tags.append(o['tag'])
        if o.get('name') in (src, ref):
            found.setdefault(o['name'], (n, parent))
        for c in n.get('children') or []:
            walk(c, n)
    walk(data.get('widgetTree') or {}, None)
    if src not in found or found[src][1] is None:
        return 'widget origine assente'
    if ref and ref not in found:
        return 'widget di riferimento assente'
    node, parent = found[src]
    dup = copy.deepcopy(node)
    o = dup['options']
    o['name'] = new
    o['tag'] = max(tags) + 1
    o['visible'] = True
    if ref:
        ro = found[ref][0]['options']
        o['x'], o['y'] = ro.get('x', o.get('x')), ro.get('y', o.get('y'))
    parent['children'].append(dup)
    return None


# ---- analisi di un layout ---------------------------------------------------------------------
def scan(data):
    """(sotto-layout, texture [(nome, 9-slice)], plist, nomi dei widget, testi [(dict, chiave)])."""
    subs, texs, plists, names, texts = [], [], [], [], []
    if isinstance(data, dict):
        for k in ('textures',):
            for t in data.get(k) or []:
                plists.append(t.split('/')[-1] if '/' not in t else t)
        for t in data.get('config_file_path') or []:      # ExportJson
            plists.append(t)
        for t in data.get('config_png_path') or []:
            texs.append((t, False))

    def walk(n, s9):
        if isinstance(n, dict):
            o = n.get('options') if isinstance(n.get('options'), dict) else None
            if o is not None and 'classname' in n:
                if o.get('name'):
                    names.append(o['name'])
                for k in ('text', 'buttonText', 'placeHolder'):
                    if isinstance(o.get(k), str) and JPCHR.search(o[k]):
                        texts.append((o, k))
                s9 = bool(o.get('scale9Enable') or o.get('backGroundScale9Enable'))
            if 'gameobjects' in n and n.get('name'):        # nodo di una scena
                names.append(n['name'])
            for k, v in n.items():
                if isinstance(v, dict) and 'path' in v and 'resourceType' in v:
                    pth = v.get('path') or ''
                    if not pth:
                        continue
                    if pth.endswith(('.json', '.ExportJson')):
                        subs.append(pth[len('publish/'):] if pth.startswith('publish/') else pth)
                    elif v.get('resourceType') == 1:
                        plists.append(v.get('plistFile') or '?')
                    elif pth.endswith('.plist'):
                        plists.append(pth[len('publish/'):] if pth.startswith('publish/') else pth)
                    else:
                        texs.append((pth[len('publish/'):] if pth.startswith('publish/') else pth,
                                     s9 and k in ('fileNameData', 'normalData', 'pressedData', 'disabledData',
                                                  'backGroundImageData')))
                if isinstance(v, (dict, list)):
                    walk(v, s9 if k != 'children' else False)
        elif isinstance(n, list):
            for x in n:
                walk(x, s9)
    walk(data, False)
    return subs, texs, plists, names, texts


def tex_available(t, planned):
    return t in served or t in ours or t in planned


def canvas(p):
    b = open(p, 'rb').read(64)
    if b[:4] == b'\x89BTF' and btf is not None:
        i = btf.info(open(p, 'rb').read())
        return tuple(i['canvas']) if i and all(i['canvas']) else (tuple(i['size']) if i else None)
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return int.from_bytes(b[16:20], 'big'), int.from_bytes(b[20:24], 'big')
    return None


# riferimenti alle texture dai layout generati che restano (per non cambiare l'aspetto altrove)
root_names = {r for r, _ in roots}
for n in ours:
    if n.endswith('.json') and n not in root_names:
        try:
            for t, _ in scan(load_json(os.path.join(pub_out, n)))[1]:
                gen_tex_users.setdefault(t, set()).add(n)
        except (ValueError, OSError):
            pass

results, writes = [], {}            # writes: nome publish -> ('jp', percorso, dati|None) | ('delete',)
for root, opts in roots:
    r = dict(root=root, status='ok', block=[], warn=[], layouts=[], keep_served=[], keep_ours=[],
             textures_new=[], textures_replaced=[], textures_kept_ours=[], texts=[], kind=None)
    plan, pre = {}, {}
    if root in served:
        # layout WW servito che make_layouts sovrascrive: si torna al WW (copiato solo per
        # tradurne i segnaposto con gli id certi; texture mancanti da JP)
        r['kind'] = 'ww'
        src = served_path(root)
        pre[root] = (src, load_json(src))
        plan[root] = ('jp', src, pre[root][1])
        todo = [(root, 'pre')]
    elif jp_path(root):
        r['kind'] = 'jp'
        todo = [(root, None)]
    else:
        r['block'].append('assente in JP')
        todo = []
    seen, names_all, absent = set(), set(), []
    while todo:
        name, src = todo.pop()
        if name in seen:
            continue
        seen.add(name)
        if name in pre:
            src, data = pre[name]
        elif src is None:
            src = jp_path(name)
            if src is None:
                r['block'].append('sotto-layout assente in JP: ' + name)
                continue
            sus = suspicious_revision(name)
            if sus:
                r['block'].append('%s: %s' % (name, sus))
            data = load_json(src)
            if name == root:
                for c in opts.get('clone', []):
                    err = clone_widget(data, *c)
                    if err:
                        r['block'].append('%s: clone %s>%s: %s' % (name, c[0], c[1], err))
                    else:
                        r['warn'].append('widget %s aggiunto (copia di %s)' % (c[1], c[0]))
                for wname, key, val in opts.get('set', []):
                    found = [w for w in walk_widgets(data.get('widgetTree', {}))
                             if w.get('options', {}).get('name') == wname]
                    if not found:
                        r['block'].append('%s: set %s.%s: widget assente' % (name, wname, key))
                    for w in found:
                        w['options'][key] = val
                    if found:
                        r['warn'].append('ritocco %s.%s = %s' % (wname, key, val))
            plan[name] = ('jp', src, data)
            r['layouts'].append(name)
        else:
            data = load_json(src)
        subs, texs, plists, names, texts = scan(data)
        names_all.update(names)
        for w in names:
            if CUS.match(w):
                r['block'].append('%s: widget %s (lo crea [fn])' % (name, w))
        for s in subs:
            if s in served:
                r['keep_served'].append(s)
                s_path = served_path(s)
                if os.path.exists(s_path):    # si guardano comunque le sue texture e i suoi nomi
                    todo.append((s, s_path))
            elif s in ours and s not in root_names:
                r['keep_ours'].append(s)
                try:
                    names_all.update(scan(load_json(os.path.join(pub_out, s)))[3])
                except (ValueError, OSError):
                    pass
            else:
                todo.append((s, None))
        for p in plists:
            if p not in served:
                r['block'].append('%s: plist non servito %s (i plist nuovi non si caricano)' % (name, p))
        if plan.get(name, ('',))[0] == 'jp':
            for o, k in texts:
                key = re.sub(r'\s+', '', o[k])
                ids = by_jp.get(key, set())
                ens = {i: en_text(i) for i in ids}
                ens = {i: t for i, t in ens.items() if t is not None}
                vals = {t.strip() for t in ens.values()}
                if len(vals) == 1:
                    new = ens[sorted(ens)[0]].strip()
                    r['texts'].append((name, o.get('name'), o[k], ','.join(sorted(ens)), new))
                    o[k] = new
                elif (name, o.get('name')) in TEXT_FIX:
                    new = TEXT_FIX[(name, o.get('name'))]
                    r['texts'].append((name, o.get('name'), o[k], 'jp_coco_texts.tsv', new))
                    o[k] = new
                else:
                    r.setdefault('texts_left', []).append((name, o.get('name'), o[k]))
        for t, s9 in texs:
            if t in served:
                continue
            j = jp_tex(t)
            if t in ALT and not any(w.startswith('stub: %s ' % t) for w in r['warn']):
                r['warn'].append('stub: %s da %s' % (t, os.path.relpath(ALT[t], os.path.dirname(args.jp))))
            if t in ours:
                if j is None:
                    continue
                why = None
                if t in atlases:
                    why = 'atlante di un\'armatura'
                elif t in WW_WINS:
                    why = 'localizzata WW'
                else:
                    c_ours, c_jp = canvas(os.path.join(pub_out, *t.split('/'))), canvas(j)
                    users = gen_tex_users.get(t, set()) - set(plan)
                    if c_ours != c_jp and users:
                        why = 'tela %s contro JP %s, usata anche da %s' % (c_ours, c_jp, ', '.join(sorted(users)[:3]))
                if why:
                    if ('%s (%s)' % (t, why)) not in r['textures_kept_ours']:
                        r['textures_kept_ours'].append('%s (%s)' % (t, why))
                else:
                    plan[t] = ('jp', j, None)
                    if t not in r['textures_replaced']:
                        r['textures_replaced'].append(t)
            elif j is not None:
                plan[t] = ('jp', j, None)
                if t not in r['textures_new']:
                    r['textures_new'].append(t)
            else:
                if s9:
                    r['block'].append('%s: 9-slice su texture assente %s (crash 0x2c, I-049)' % (name, t))
                elif t not in absent:
                    absent.append(t)
    if absent:
        (r['warn'] if opts['absent_ok'] else r['block']).append('texture assenti: ' + ', '.join(sorted(absent)))
    r['widgets'] = sorted(names_all)
    miss = [w for w in opts['need'] if w not in names_all]
    if miss:
        r['block'].append('widget cercati dal codice assenti nell\'originale: ' + ', '.join(miss))
    if r['block']:
        r['status'] = 'bloccato'
    else:
        for k, v in plan.items():
            if k in writes and writes[k][0] != v[0]:
                r['warn'].append('conflitto su ' + k)
            writes.setdefault(k, v)
    results.append(r)

# ---- animazioni LWF originali -----------------------------------------------------------------
# Cartelle lwf/ assenti dalle risorse WW che make_layouts sostituiva con copie rinominate di
# Result_Reward: la copia mostrava «CONGRATULATIONS!» sul nodo della bacheca appena aperto e il
# client aspettava la sua fine (~7 s) prima del popup (banco 14-10). Si prendono .lwf e PNG (->
# BTF) della revisione corrente; il .res non lo serve nessuna risorsa. Chiavi relative a OUT.
JP_LWF = ['lwf/sphere/SpIcon_Open', 'lwf/sphere/SphereMap_Complete']
# Supernova (I-124, docs/notes/battaglia.md#supernova): animazione del lancio, del rinnovo
# (recurringAttribute) e del gauge recuperato (campo recovery), assenti dalle risorse WW
JP_LWF += ['lwf/battle/Sburst', 'lwf/battle/SBurst_Revival', 'lwf/battle/BurstGauge_Recovery']
# NPC degli stage originali importati (import_orig_stages.py) senza grafica nelle risorse WW: 19 stage
# (2010, 2100, 2180, 2400, 11110, 11140, 11250, 13150, 13220, 16160-16250) li usano
NPC_JP = [5500] + list(range(5504, 5517)) + [5518, 5519, 5520, 5528, 5529]
JP_LWF += ['lwf/character/npc/%d/wait' % n for n in NPC_JP]
# Texture citate dal LWF ma assenti dall'estrazione JP: il nome e' <cartella>_<nome originale in
# esadecimale>.png e lo stesso nome originale (effetti KeyBlade_ef*, png_ef0*, star01, 進化_KeyBlade_
# ef*) sta in altre LWF. Senza, il client non disegna quei pezzi: «COMPLET» senza la seconda E
# (banco 14-10). Prima le LWF JP, poi la Result_Reward servita (gia' BTF, estratta in layouts\orig).
LWF_FILL = [os.path.join(JP_ROOT, 'lwf', 'battleresult', 'Result_Reward'),
            os.path.join(JP_ROOT, 'lwf', 'adventure', 'Colosseum_Open'),
            os.path.join(JP_ROOT, 'lwf', 'battle', 'Burst_Medal_Change'),
            os.path.join(D, 'layouts', 'orig', 'lwf', 'battleresult', 'Result_Reward')]
_npc = os.path.join(JP_ROOT, 'lwf', 'character', 'npc')
if os.path.isdir(_npc):
    LWF_FILL += [os.path.join(_npc, n, 'wait') for n in sorted(os.listdir(_npc)) if os.path.isdir(os.path.join(_npc, n, 'wait'))]
# Icone di stato sopra l'avatar in battaglia (I-124, docs/notes/battaglia.md#hud): BattleStateIcon
# [fn] carica lwf/battle/ActMapBuffDeBuffAnim/<BIconNN|DIconNN>/... (tabelle 0x1f1be08 buff,
# 0x1f1be88 debuff) e il tier BuffNum_Up/DownNN (0x1f1bf28, indice tier + 20); [fn] le
# icone del Reflect lwf/battle/ActMapReflectionAnim/RIcon_* (se il file esiste). Nessuna delle due
# cartelle e' servita (names_v4 e addnl): niente icone, niente crash. Le texture condivise stanno
# una sola volta nell'estrazione JP (es. «素材画像_Buff01» in DIcon02): le stesse cartelle fanno
# da riempimento (101 texture citate, 0 assenti).
for _grp in ('ActMapBuffDeBuffAnim', 'ActMapReflectionAnim'):
    _gd = os.path.join(JP_ROOT, 'lwf', 'battle', _grp)
    if os.path.isdir(_gd):
        _subs = sorted(n for n in os.listdir(_gd) if os.path.isdir(os.path.join(_gd, n)))
        JP_LWF += ['lwf/battle/%s/%s' % (_grp, n) for n in _subs]
        LWF_FILL += [os.path.join(_gd, n) for n in _subs]
# nomi solo numerici (lettere della scritta) non si cercano altrove: «8» e' la seconda E di COMPLETE
LWF_ALIAS = {'lwf/sphere/SphereMap_Complete/SphereMap_Complete_382e706e67.png':
             'lwf/sphere/SphereMap_Complete/SphereMap_Complete_362e706e67.png'}
fill_idx = {}
for fd in LWF_FILL:
    if os.path.isdir(fd):
        pre = os.path.basename(fd) + '_'
        for rel, p in latest(fd).items():
            if rel.startswith(pre) and rel.endswith('.png'):
                fill_idx.setdefault(rel[len(pre):], p)
for d in JP_LWF:
    src_dir = os.path.join(JP_ROOT, *d.split('/'))
    if not os.path.isdir(src_dir):
        continue
    have = {}
    for rel, p in latest(src_dir).items():
        if rel.endswith(('.lwf', '.png')):
            have[d + '/' + rel] = p
    base = os.path.basename(d)
    lwf = have.get('%s/%s.lwf' % (d, base))
    if lwf:
        for t in sorted(set(re.findall((re.escape(base) + r'_([0-9a-f]+\.png)').encode(), open(lwf, 'rb').read()))):
            name = '%s/%s_%s' % (d, base, t.decode())
            if name in have:
                continue
            if name in LWF_ALIAS and LWF_ALIAS[name] in have:
                have[name] = have[LWF_ALIAS[name]]
            elif t.decode() in fill_idx:
                have[name] = fill_idx[t.decode()]
            else:
                print('jp_lwf: texture assente ' + name)
    for name, p in have.items():
        writes.setdefault(name, ('jp', p, None))


# ---- immagini originali JP assenti dalle risorse WW -------------------------------------------
# Cartelle img/ di cui il client WW chiede file che nessuna risorsa serve. PlayerStatusIndicator:
# [fn] sceglie la cornice dell'avatar dell'HUD per soglie (Avatar_Circle_03..06, Side_02..04);
# servite solo Circle_03/04/05: oltre la soglia (HP saliti con le Avatar Boards) texture nulla e
# crash a ogni battaglia (pc 0xb17adc, indirizzo 0x24; banco 14-10). Solo i file non serviti.
JP_IMG = ['img/ui/PlayerStatusIndicator']
_served_all = set()
for _tsv in (os.path.join(D, 'resource_data', 'names_v4.tsv'), os.path.join(D, 'ipa431', 'names_addnl.tsv')):
    if os.path.exists(_tsv):
        for _line in open(_tsv, encoding='utf-8'):
            _served_all.add(_line.split('\t')[0])
# poi il pacchetto 2016 (stessi nomi; Circle_01/02 e Side_01 mancano anche nel JP: Circle_01 e' la
# cornice a vita quasi piena, chiesta a inizio battaglia)
B16_ROOT = os.path.join(D, 'tmp', 'thethiny_x', 'bundle2016', 'files')
for d in JP_IMG:
    for root in (JP_ROOT, B16_ROOT):
        src_dir = os.path.join(root, *d.split('/'))
        if not os.path.isdir(src_dir):
            continue
        for rel, p in latest(src_dir).items():
            name = d + '/' + rel
            if rel.endswith('.png') and name not in _served_all:
                writes.setdefault(name, ('jp', p, None))
# icone SN/SN+/SN++ della Supernova ([fn]): img/ui/SBurst_Icon1..3 e ...R (il JP tiene le
# non R in cocostudio/publish) e le texture del pannello assenti dalle risorse WW
_jp_pub = os.path.join(JP_ROOT, 'cocostudio', 'publish')
for _n in (1, 2, 3):
    for _name, _src in (('img/ui/SBurst_Icon%dR.png' % _n, os.path.join(JP_ROOT, 'img', 'ui', 'SBurst_Icon%dR.png' % _n)),
                        ('img/ui/SBurst_Icon%d.png' % _n, os.path.join(_jp_pub, 'SBurst_Icon%d.png' % _n))):
        if os.path.exists(_src) and _name not in _served_all:
            writes.setdefault(_name, ('jp', _src, None))
for _t in ('SBurst_Icon1.png', 'SBurst_Icon2.png', 'SBurst_Icon3.png', 'SBurst_Plate01re.png'):
    if os.path.exists(os.path.join(_jp_pub, _t)) and 'cocostudio/publish/' + _t not in _served_all:
        writes.setdefault(_t, ('jp', os.path.join(_jp_pub, _t), None))


def out_path(name):
    return os.path.join(OUT if name.startswith(('lwf/', 'img/')) else pub_out, *name.split('/'))


# ---- scrittura --------------------------------------------------------------------------------
manifest, n_btf, n_png, removed = {}, 0, 0, []
if not args.check:
    for name, w in sorted(writes.items()):
        dst = out_path(name)
        if w[0] == 'delete':
            if os.path.exists(dst):
                os.remove(dst)
            continue
        src, data = w[1], w[2]
        if data is not None:
            blob = json.dumps(data, ensure_ascii=False).encode('utf-8')
        else:
            blob = open(src, 'rb').read()
            if name.lower().endswith('.png') and blob[:8] == b'\x89PNG\r\n\x1a\n':
                if btf is not None:
                    from io import BytesIO
                    blob = btf.encode(Image.open(BytesIO(blob)).convert('RGBA'))
                    n_btf += 1
                else:
                    n_png += 1
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        # un file nostro sostituito (layout generato, texture disegnata) si mette da parte: se poi
        # nessun generatore lo riscrive, la pulizia lo rimette com'era
        backup = None
        if os.path.exists(dst):
            cur = open(dst, 'rb').read()
            prev = old.get(name)
            if prev and sha(cur) == prev['sha1']:
                backup = prev.get('backup')           # e' ancora la nostra copia: resta la copia di prima
            else:
                backup = os.path.join(REPORT, 'orig', *name.split('/'))
                os.makedirs(os.path.dirname(backup), exist_ok=True)
                with open(backup, 'wb') as fh:
                    fh.write(cur)
        with open(dst, 'wb') as fh:
            fh.write(blob)
        rel = os.path.relpath(src, JP_ROOT) if src.startswith(JP_ROOT) else src
        manifest[name] = dict(src=rel.replace(os.sep, '/'), sha1=sha(blob), backup=backup)
    # file scritti dalla corsa precedente e non piu' richiesti: se nessuno li ha riscritti, si
    # rimette la copia di prima (se c'era) o si tolgono
    for name, m in old.items():
        if name in manifest or name in writes:
            continue
        dst = out_path(name)
        if os.path.exists(dst) and sha(open(dst, 'rb').read()) == m['sha1']:
            if m.get('backup') and os.path.exists(m['backup']):
                shutil.copyfile(m['backup'], dst)
            else:
                os.remove(dst)
            removed.append(name)
    json.dump(manifest, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---- rapporto ---------------------------------------------------------------------------------
rep = dict(roots=results, undecided=[dict(root=a, why=b) for a, b in undecided], removed=removed)
json.dump(rep, open(os.path.join(REPORT, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
ok = [r for r in results if r['status'] == 'ok']
bad = [r for r in results if r['status'] != 'ok']
lines = []
for r in results:
    lines.append('%-46s %-8s %s layout %d, texture nuove %d, sostituite %d, testi %d%s' % (
        r['root'], r['status'], r['kind'] or '-', len(r['layouts']), len(r['textures_new']),
        len(r['textures_replaced']), len(r['texts']),
        ''.join('\n    ! ' + b for b in r['block']) + ''.join('\n    ~ ' + w for w in r['warn'])
        + ''.join('\n    = nostra: ' + t for t in r['textures_kept_ours'])))
for a, b in undecided:
    lines.append('%-46s da decidere: %s' % (a, b))
open(os.path.join(REPORT, 'report.txt'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('\n'.join(l for l in lines if '!' in l or '~' in l or 'nostra' in l))
print('jp_coco: %d radici importate, %d bloccate, %d da decidere; %d file scritti (%d BTF, %d PNG per btf_fix)%s, '
      '%d tolti dalla corsa precedente%s' % (
          len(ok), len(bad), len(undecided), len(manifest), n_btf, n_png, '' if not args.check else ' [--check]',
          len(removed), '' if not bad else '; bloccate: ' + ', '.join(r['root'] for r in bad)))
