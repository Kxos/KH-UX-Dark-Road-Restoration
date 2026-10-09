"""Layout cocostudio sostitutivi per le schermate i cui layout non sono in nessuna risorsa.

    python -I recon/tools/make_layouts.py <cartella layout estratti> <uscita>

<cartella layout estratti> = dove res_get.py ha estratto i layout esistenti (contiene
cocostudio/publish/...); <uscita> = la cartella del pacchetto generato (es.
D:\\Progetto_Restauro_KH_UX\\stage_gen\\files), dove finiscono cocostudio/publish/<nome>.

Ogni voce di LAYOUTS dice come ottenere un layout mancante:
  ('copy', sorgente, {vecchio nome widget: nuovo})  copia di un layout esistente
  ('scene', [nodi])                                 scena SceneEditor con nodi vuoti
I nomi dei widget che il codice cerca si ricavano con widget_lookup.py sul C delle
funzioni che citano il layout (who_refs.py sulla stringa del percorso). Le immagini
restano quelle della sorgente (texture gia' nelle risorse).
"""
import json
import os
import sys

SRC, OUT = sys.argv[1], sys.argv[2]
PUB = 'cocostudio/publish/'

# Texture Dark Road -> KHUX: si toglie il prefisso dark_ se l'immagine esiste in KHUX,
# altrimenti queste sostituzioni (scelte a occhio tra le cornici KHUX).
DARK_TO_KHUX = {'dark_Plate07.png': 'Panel04.png', 'dark_Win02.png': 'Win01.png', 'dark_Win12.png': 'Win11.png',
                'dark_But_Close_Off.png': 'But_CloseA.png', 'dark_But_Close_On.png': 'But_CloseB.png'}


def B(name, x, y, w, h, tex, text=None, size=24, **kw):
    """Pulsante con testo opzionale (Label figlia, stesso nome con Txt_ al posto di Button_
    se non indicato)."""
    ch = kw.pop('children', [])
    if text is not None:
        ch = [L(kw.pop('label', 'Txt_' + name.split('_', 1)[-1]), 0, 0, w - 10, h - 8, text, size)] + ch
    return dict(cls='Button', name=name, x=x, y=y, w=w, h=h, tex=tex, children=ch, **kw)


def L(name, x, y, w, h, text='', size=22, **kw):
    return dict(cls='Label', name=name, x=x, y=y, w=w, h=h, text=text, size=size, **kw)


def I(name, x, y, w, h, tex, **kw):
    return dict(cls='ImageView', name=name, x=x, y=y, w=w, h=h, tex=tex, **kw)


def P(name, x, y, w, h, children=(), **kw):
    return dict(cls='Panel', name=name, x=x, y=y, w=w, h=h, children=list(children), **kw)


LAYOUTS = {
    # Presents (FUN_00d0cfbc scena, FUN_00d0b350 base, FUN_00899640 pannello): stessi
    # nomi della versione Dark Road (Txt_Wording, Scroll_Area, Txt_None, Txt_Stock*,
    # Button, Close_Button; Panel_Present). La scena toglie CenterUI e LeftUI.
    'PresentBOXScene.json': ('scene', ['CenterUI', 'LeftUI']),
    'PresentBOX_Base_ver400.json': ('copy', 'dark_PresentBOX_base.json', {}, True),
    'PresentBOX_Panel_ver131.json': ('copy', 'dark_PresentBOX_panel.json', {}, True),
    'PresentBOX_IconPanel_ver131.json': ('copy', 'dark_PresentBOX_icon_panel.json', {}, True),

    # Medal List (FUN_00df1c00 e vicine, FUN_006e0eb8 carica la scena e cerca i widget da
    # li', ricorsivamente). Disposizione dalle schermate di riferimento
    # (reference\medal_list): in alto Sell Medals, Slots, criterio, Sort; sotto la griglia;
    # in basso la barra di vendita (Win_Bottom: Txt e Txt_Button sono Label).
    'MedalListScene_ver130.json': ('scene', [('CenterUI', 'publish/MedalList_Gen.json'), 'LeftUI']),
    'MedalList_Gen.json': ('build', P('medal_list_root', 0, 0, 960, 640, [
        I('Img_Bar', 480, 485, 960, 70, 'Plate13.png'),
        B('Button_Sell1', 110, 485, 160, 58, 'But17', 'Sell\nMedals', 20, label='Txt_Sell1'),
        I('Img_Slots', 330, 485, 240, 34, 'Plate12.png'),
        L('Txt_Slots', 265, 485, 100, 30, 'Slots', 20),
        L('Txt_Slots_Num', 395, 485, 110, 30, '0/0', 20),
        I('Img_SortType', 640, 485, 220, 34, 'Plate12.png'),
        L('Txt_SortType', 640, 485, 200, 30, 'Strength', 20),
        B('Button_Sort', 850, 485, 200, 58, 'But17', 'Sort', 24),
        P('Scroll_Area', 70, 10, 820, 440),
        P('Medal_Sell_Panel', 0, 450, 960, 70, visible=False),
        P('Win_Bottom', 0, 0, 960, 90, [
            I('Img_Win_Bottom', 480, 45, 960, 90, 'Plate13.png'),
            I('Img_Sell_Button', 150, 45, 200, 58, 'But16_Off.png'),
            L('Txt_Button', 150, 45, 190, 50, 'Sell', 26),
            L('Txt', 560, 45, 500, 40, '', 22),
        ], visible=False),
        B('Button_Back', 50, 600, 78, 54, 'BackButton', visible=False),
        L('Txt_MedalGet', 480, 320, 600, 40, '', 22, visible=False),
    ])),
    # Animazioni Armature (.ExportJson) mancanti: senza file la creazione dell'armatura
    # va in crash (FUN_011843c4). Copia di ArrowAnim con armatura e movimento rinominati.
    # Cursor_Anim_MedalSell: cursore della griglia di Medal List (FUN_00882e10, movimento
    # Animation1).
    'Cursor_Anim_MedalSell.ExportJson': ('armature', 'ArrowAnim.ExportJson', 'Cursor_Anim_MedalSell',
                                         {'Left': 'Animation1', 'Right': 'Medal_Select01'}),
    # MedalSelectAnimation: selezione delle medaglie (FUN_009e7108, movimento Medal_Select01).
    'MedalSelectAnimation.ExportJson': ('armature', 'ArrowAnim.ExportJson', 'MedalSelectAnimation',
                                        {'Left': 'Medal_Select01', 'Right': 'Animation1'}),
}


# Testi dell'interfaccia mancanti: text/ui/<id>.txt, letti da FUN_00719f18 (categoria 0 =
# ui); senza file il risultato e' NULL e la schermata va in crash. Quasi tutti arrivano
# originali dal pacchetto misc dell'IPA 4.4.0 (import_ui_texts.py, copiati dopo questi e
# quindi prevalenti); qui solo quelli che li' mancano, dalle immagini di riferimento
# (reference\) o dall'equivalente Dark Road.
TEXTS = {
    # Presents (FUN_00d0b350)
    103500013: 'Presents can be collected here.\nPresents over the limit of 200 will be deleted,\n'
               'oldest first, as will those past their expiry date.',   # Txt_Wording
    103500002: 'Presents',      # Txt_Stock_Title
    103500003: 'Collect All',   # Txt_ReceiveAll (Button)
    106250104: 'Other',         # Txt_Stock (Dark Road: その他)
    106250103: 'Jewels',        # Txt_Stock_2 (Dark Road: ジュエル)
    # Medal List (FUN_00df1c00: barra di aiuto in alto; FUN_00df5d98: modalita' vendita)
    100620045: 'Tap a Medal to see its details.',
}


def node(name, tag):
    return {'classname': 'CCNode', 'name': name, 'canedit': True, 'objecttag': tag, 'rotation': 0,
            'scalex': 1, 'scaley': 1, 'visible': 1, 'x': 0, 'y': 0, 'zorder': 1,
            'gameobjects': [], 'components': []}


def scene(names):
    """names: 'Nome' (nodo vuoto) o ('Nome', 'publish/layout.json') (nodo con GUIComponent)."""
    root = node(None, 10000)
    root['gameobjects'] = []
    for i, n in enumerate(names):
        name, ui = (n, None) if isinstance(n, str) else n
        g = dict(node(name, 10001 + i), **{'__type': 'ComGameObjectSurrogate:#EditorCommon.JsonModel'})
        if ui:
            g['components'] = [{'__type': 'ComGUIAdapterSurrogate:#EditorCommon.JsonModel.Component',
                                'classname': 'GUIComponent', 'name': 'GUIComponent', 'file': None,
                                'fileData': {'path': ui, 'plistFile': '', 'resourceType': 0}}]
        root['gameobjects'].append(g)
    root.update({'CanvasSize': {'_height': 640, '_width': 960}, 'Triggers': None, 'Version': '1.6.0.0',
                 'components': [{'__type': 'ComSceneSurrogate:#EditorCommon.JsonModel.Component',
                                 'classname': 'CCScene', 'name': 'CCScene', 'scenename': 'generated'}]})
    return root


def rename(w, mapping):
    o = w.get('options', {})
    if o.get('name') in mapping:
        o['name'] = mapping[o['name']]
    for c in w.get('children', []):
        rename(c, mapping)


TEXTURES = set(open(os.path.join(SRC, '..', 'textures.txt'), encoding='utf-8-sig').read().split())


def retex(w):
    """Texture dark_* -> equivalente KHUX."""
    for v in w.get('options', {}).values():
        if isinstance(v, dict) and str(v.get('path', '')).startswith('dark_'):
            p = v['path']
            v['path'] = DARK_TO_KHUX.get(p) or (p[5:] if p[5:] in TEXTURES else p)
    for c in w.get('children', []):
        retex(c)


# Modelli dei widget: uno per classe, da un layout vero (cocostudio 1.6).
_tmpl = json.load(open(os.path.join(SRC, *PUB.split('/'), 'dark_PresentBOX_base.json'), encoding='utf-8-sig'))
TEMPLATES = {}


def _collect(w):
    TEMPLATES.setdefault(w['classname'], w)
    for c in w.get('children', []):
        _collect(c)


_collect(_tmpl['widgetTree'])
_tag = [1000]


def tex(path):
    if path not in TEXTURES:
        raise SystemExit('texture assente dalle risorse: ' + path)
    return {'path': path, 'plistFile': '', 'resourceType': 0}


def build(s):
    w = json.loads(json.dumps(TEMPLATES[s['cls']]))
    w['children'] = [build(c) for c in s.get('children', [])]
    o = w['options']
    _tag[0] += 1
    o.update(name=s['name'], x=s['x'], y=s['y'], width=s['w'], height=s['h'], tag=_tag[0],
             actiontag=_tag[0], visible=s.get('visible', True))
    w['name'] = s['name']
    if s['cls'] == 'ImageView':
        o.update(fileNameData=tex(s['tex']), scale9Width=s['w'], scale9Height=s['h'])
    elif s['cls'] == 'Button':
        base = s['tex']
        for key, suf in (('normalData', '_Off'), ('pressedData', '_On'), ('disabledData', '_Disable')):
            p = base + suf + '.png'
            o[key] = tex(p) if p in TEXTURES else (tex(base + '_Off.png') if key != 'normalData' else tex(p))
        o.update(scale9Width=s['w'], scale9Height=s['h'], text='')
    elif s['cls'] == 'Label':
        o.update(text=s.get('text', ''), fontSize=s.get('size', 22), areaWidth=s['w'], areaHeight=s['h'])
    elif s['cls'] == 'Panel':
        o.update(touchAble=False)
    return w


os.makedirs(os.path.join(OUT, *PUB.split('/')), exist_ok=True)
for target, spec in LAYOUTS.items():
    if spec[0] == 'scene':
        data, how = scene(spec[1]), 'scena'
    elif spec[0] == 'armature':
        data = json.load(open(os.path.join(SRC, *PUB.split('/'), spec[1]), encoding='utf-8-sig'))
        data['armature_data'][0]['name'] = spec[2]
        data['animation_data'][0]['name'] = spec[2]
        for mv in data['animation_data'][0]['mov_data']:
            mv['name'] = spec[3].get(mv['name'], mv['name'])
        how = 'armatura da ' + spec[1]
    elif spec[0] == 'build':
        data = {k: v for k, v in _tmpl.items() if k != 'widgetTree'}
        data['widgetTree'] = build(spec[1])
        how = 'costruito'
    else:
        data = json.load(open(os.path.join(SRC, *PUB.split('/'), spec[1]), encoding='utf-8-sig'))
        rename(data['widgetTree'], spec[2])
        if len(spec) > 3 and spec[3]:
            retex(data['widgetTree'])
        how = 'copia di ' + spec[1]
    path = os.path.join(OUT, *PUB.split('/'), target)
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False)
    print(target, '<-', how)

os.makedirs(os.path.join(OUT, 'text', 'ui'), exist_ok=True)
for tid, s in TEXTS.items():
    with open(os.path.join(OUT, 'text', 'ui', '%d.txt' % tid), 'w', encoding='utf-8', newline='') as fh:
        fh.write(s)
print('testi ui:', len(TEXTS))
