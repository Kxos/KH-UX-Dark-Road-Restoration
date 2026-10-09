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


def obtain_panels(x, y):
    """Ricompense nei popup di vendita (FUN_006f33f0): Panel_1..Panel_4 con 1..4 targhette
    Obtain_Plate_a..d (FUN_00703550: Txt titolo, Txt_Label quantita', Icon ImageView di cui
    carica la texture). Il codice mostra solo il pannello con il numero giusto di righe."""
    panels = []
    for n in range(1, 5):
        plates = [P('Obtain_Plate_' + 'abcd'[k], 0, 120 - 40 * k, 400, 36, [
            I('Icon', 40, 18, 30, 30, 'Result_LU_Win_Star.png', scale=0.4),
            L('Txt', 130, 18, 180, 30, '', 20),
            L('Txt_Label', 320, 18, 140, 30, '0', 20)]) for k in range(n)]
        panels.append(P('Panel_%d' % n, x, y, 400, 160, plates, visible=False))
    return panels


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
    # LeftUI non puo' essere vuoto: FUN_00df2be8 ne prende il primo figlio (crash su vettore
    # vuoto). MedalSell_Back.json (pulsante Indietro) e' originale e gia' nelle risorse.
    'MedalListScene_ver130.json': ('scene', [('CenterUI', 'publish/MedalList_Gen.json'),
                                             ('LeftUI', 'publish/MedalSell_Back.json')]),
    # Medal_Sell_Panel e' la barra in alto: FUN_00df1c00 la rende visibile e vi cerca
    # Button_Sort (con la Label Txt_Sort, scritta dalla callback di FUN_00760c64).
    'MedalList_Gen.json': ('build', P('medal_list_root', 0, 0, 960, 640, [
        P('Scroll_Area', 3, 10, 954, 440),
        P('Medal_Sell_Panel', 0, 450, 960, 70, [
            I('Img_Bar', 480, 35, 960, 70, 'Plate13.png'),
            B('Button_Sell1', 110, 35, 160, 58, 'But17', 'Sell\nMedals', 20, label='Txt_Sell1'),
            I('Img_Slots', 330, 35, 240, 34, 'Plate12.png'),
            # contatore (FUN_00df284c): Txt_MedalGet = testo 101200050 «Slots», poi medaglie
            # possedute (Num) / capienza (All), scritte con FUN_00df34a4 (Label con ombra)
            L('Txt_MedalGet', 265, 35, 100, 30, 'Slots', 20),
            L('Txt_MedalGet_All_Label', 430, 35, 60, 30, '0', 20),
            L('Txt_MedalGet_Slash', 400, 35, 20, 30, '/', 20),
            L('Txt_MedalGet_Num_Label', 370, 35, 60, 30, '0', 20),
            I('Img_SortType', 640, 35, 220, 34, 'Plate12.png'),
            # FUN_00760c64 (barra di ordinamento generica) cerca qui anche Txt_Sort_Label
            # (criterio) e Txt_Filter_On (testo 100100012 «Filter ON»).
            L('Txt_Sort_Label', 640, 35, 200, 30, 'Strength', 20),
            L('Txt_Filter_On', 640, 62, 200, 20, 'Filter ON', 16),
            B('Button_Sort', 850, 35, 200, 58, 'But17', 'Sort', 24),
        ]),
        P('Win_Bottom', 0, 0, 960, 90, [
            I('Img_Win_Bottom', 480, 45, 960, 90, 'Plate13.png'),
            I('Img_Sell_Button', 150, 45, 200, 58, 'But16_Off.png'),
            L('Txt_Button', 150, 45, 190, 50, 'Sell', 26),
            L('Txt', 560, 45, 500, 40, '', 22),
        ], visible=False),
    ])),
    # Sell Medals (FUN_00bf0a10 carica MedalSellScene_ver350, assente). Nomi e genitori dal
    # decompilato: dalla radice Scroll_Area, Txt_Money (100300003 «Munny»), Txt_A_Coin
    # (101500006 «Avatar Coins»), Txt_A_Coin_Label, DeckBase2, Txt_Money_Total_Lavel (sic),
    # Button_Back (da MedalSell_Back in LeftUI), BoxNow, BoxMaxLabel; in Medal_Sell_Panel
    # Txt_Money_Total, Button (con Txt_Sell) e la barra di FUN_00760c64 (Button_Sort...);
    # Plate_A_Jewel e Plate_A_Ticket con Txt_A_* e Txt_A_*_Label. Disposizione da
    # reference\medal_list\medal_sell_yt_02.jpg: in alto Slots, Munny, criterio, Sort; in
    # basso Sell e i ricavi (Munny, Avatar Coins).
    # FUN_00bf302c usa il primo figlio di CenterUI, LeftUI e RightUI (vuoto: pannello).
    'MedalSellScene_ver350.json': ('scene', [('CenterUI', 'publish/MedalSell_Gen.json'),
                                             ('LeftUI', 'publish/MedalSell_Back.json'),
                                             ('RightUI', 'publish/MedalSell_Right.json')]),
    'MedalSell_Right.json': ('build', P('Panel_Right', 0, 0, 10, 10)),
    'MedalSell_Gen.json': ('build', P('medal_sell_root', 0, 0, 960, 640, [
        P('Scroll_Area', 9, 95, 942, 355),
        # Medal_Sell_Panel = barra in alto (il codice la rende toccabile: a schermo intero
        # coprirebbe la griglia e la selezione non arriverebbe); i figli della barra in basso
        # stanno fuori dai suoi bordi (y negativa: cocos2d non ritaglia).
        P('Medal_Sell_Panel', 0, 450, 960, 70, [
            I('Img_Bar', 480, 35, 960, 70, 'Plate13.png'),
            L('Txt_Sort_Label', 680, 35, 180, 30, 'Strength', 20),
            L('Txt_Filter_On', 680, 62, 180, 20, 'Filter ON', 16),
            B('Button_Sort', 860, 35, 180, 58, 'But17', 'Sort', 24),
            I('Img_Bottom', 480, -405, 960, 90, 'Plate13.png'),
            B('Button', 120, -405, 180, 64, 'But17', 'Sell', 26, label='Txt_Sell'),
            # riga alta della barra in basso: titolo «Munny» (il valore e' Txt_Money_Total_Lavel)
            L('Txt_Money_Total', 380, -385, 160, 28, 'Munny', 20),
        ]),
        # in alto: contatore come in Medal List (FUN_00bf2264 / FUN_00bf5b18), poi i Munny
        # posseduti: Txt_Money (100300003 «Munny») e Txt_Money_Label (FUN_00bf25fc)
        L('Txt_MedalGet', 75, 485, 80, 30, 'Slots', 20),
        L('Txt_MedalGet_Num_Label', 160, 485, 60, 30, '0', 20),
        L('Txt_MedalGet_Slash', 190, 485, 20, 30, '/', 20),
        L('Txt_MedalGet_All_Label', 220, 485, 60, 30, '0', 20),
        L('BoxNow', 165, 455, 60, 30, '0', 20, visible=False),
        L('BoxMaxLabel', 225, 455, 70, 30, '0', 20, visible=False),
        I('DeckBase2', 420, 485, 250, 34, 'Plate12.png'),
        L('Txt_Money', 340, 485, 90, 30, 'Munny', 20),
        L('Txt_Money_Label', 470, 485, 150, 30, '0', 20),
        # in basso: Munny e Avatar Coins ricavati
        L('Txt_Money_Total_Lavel', 600, 65, 160, 28, '0', 20),
        L('Txt_A_Coin', 380, 28, 160, 28, 'Avatar Coins', 20),
        L('Txt_A_Coin_Label', 600, 28, 160, 28, '0', 20),
        P('Plate_A_Jewel', 700, 51, 200, 28, [
            L('Txt_A_Jewel', 40, 14, 70, 28, '', 18),
            L('Txt_A_Jewel_Label', 140, 14, 100, 28, '0', 20),
        ], visible=False),
        P('Plate_A_Ticket', 700, 14, 200, 28, [
            L('Txt_A_Ticket', 40, 14, 70, 28, '', 18),
            L('Txt_A_Ticket_Label', 140, 14, 100, 28, '0', 20),
        ], visible=False),
    ])),
    # Conferma della vendita (FUN_00bf3804): dal popup generico OK/Annulla originale.
    # Button_Sell/Txt_Sell (100100029), Button_Close/Txt_Cancel, Alert_Area (vi aggiunge un
    # PopupNormal_MedalMix_RareCaution_Panel per ogni avviso: Txt_Wording1, Star1, ...).
    'PopupNormal_MedalSell_Check_ver350.json': ('copy', 'PopupNormal_Text_34_4Line_OkCancel.json',
                                                {'Button_OK': 'Button_Sell', 'Txt_OK': 'Txt_Sell'}, False, [
        ('text', '4Line_Label', ''),    # la domanda la scrive il codice in Txt_Sell
        P('Alert_Area', 330, 255, 300, 40)] + obtain_panels(280, 280)),
    # Avviso «materiali rari» del Level Up (FUN_00cc7864, anche FUN_00c83540): senza il file
    # GUIReader restituisce un widget nullo e il client va in crash al tocco di Level Up.
    # Cerca NormalText_Window03, Button_OK/Txt_OK, Button_Close/Txt_Cancel, Txt_Wording3
    # (messaggio, testo 101399491) e Alert_Area (un _Panel per ogni avviso).
    'PopupNormal_MedalMix_RareCaution.json': ('copy', 'PopupNormal_Text_34_4Line_OkCancel.json',
                                              {'NormalText_Window01': 'NormalText_Window03',
                                               '4Line_Label': 'Txt_Wording3'}, False, [
        ('text', 'Txt_Wording3', ''),
        P('Alert_Area', 330, 255, 300, 40)]),
    'PopupNormal_MedalMix_RareCaution_Panel.json': ('build', P('Panel_Caution', 0, 0, 600, 40, [
        L('Txt_Wording1', 120, 20, 200, 36, 'Includes', 22),
        I('Star1', 240, 20, 30, 30, 'Result_LU_Win_Star.png'),
        L('Txt_Wording2', 400, 20, 260, 36, 'Medals or higher.', 22),
        L('Txt_Wording3', 300, 20, 560, 36, '', 22, visible=False)])),
    # Esito (FUN_006f4918): popup OK originale, il messaggio e' Txt_Sell_Ok1.
    'PopupNormal_MedalSell_Ok_ver350.json': ('copy', 'PopupNormal_Text_34_4Line_Ok.json',
                                             {'4Line_Label': 'Txt_Sell_Ok1'}, False,
                                             [('text', 'Txt_Sell_Ok1', '')] + obtain_panels(280, 260)),
    # Dettaglio medaglia da Medal List: FUN_00aba238 carica SlideMedalInfoScene_ver341 sopra
    # MedalInfoScene e aggiunge un pulsante al primo figlio di LeftUI e di RightUI (medaglia
    # precedente / successiva). Frecce come MedalInfo_Arrow01.json (Medal_Syn_Arrow01 punta a sinistra).
    # Il pulsante (FUN_008d6230) accetta i tocchi in un rettangolo grande quanto il pannello
    # ma centrato sulla sua origine (angolo in basso a sinistra): l'origine sta quindi al
    # centro della freccia, e la freccia in (0,0).
    # Layout originali con i testi in giapponese: copie tradotte che sostituiscono
    # l'originale (resource_merge.py --last-wins). Conferma di Unequip nel dettaglio di
    # una medaglia equipaggiata (il pulsante prende il testo da text/ui/106180101).
    'MedalInfo_ReleaseWindow.json': ('copy', 'MedalInfo_ReleaseWindow.json', {}, False,
                                     [('text', 'Txt_Title_Label', 'Unequip this Medal from where it is set.'),
                                      ('text', 'Txt_Cancel', 'Cancel')]),
    # Evolve (FUN_00cbdd84): senza MedalEvoScene_ver320 FUN_006e0eb8 restituisce null e il
    # client va in crash all'addChild. Nodi come nella ver260 (UnderUI, CenterUI_Left,
    # CenterUI_Right a x=480, LeftUI a y=576), ma Under e Left non esistono in nessuna
    # risorsa: generati con i widget che il codice cerca. UnderUI: Base_Money1/2 (con
    # Txt_Money, testi 0x5fa74e2/0x5fa74e3, e Txt_Money_Label), Button_LimitCut/
    # Txt_LimitCut (0x60b3dc1), Button_Sell1/Txt_Sell1 (0x606a9e4), Txt_Wording
    # (0x60b3dc7). CenterUI_Left: Dummy_Medal1/Star_Area1 (prima) e Dummy_Medal2/
    # Star_Area2 (dopo).
    'MedalEvoScene_ver320.json': ('scene', [('UnderUI', 'publish/MedalInfo_Evo_Under_Gen.json'),
                                            ('CenterUI_Left', 'publish/MedalInfo_Evo_Left_Gen.json'),
                                            ('CenterUI_Right', 'publish/MedalInfo_Evo_Right_Gen.json', 480, 0),
                                            ('LeftUI', 'publish/MedalSell_Back.json', 0, 576)]),
    # Statistiche prima/dopo: la ver260 originale, ma tre texture non esistono in nessuna
    # risorsa (ImageViewReader va in crash): Medal_Evo_Win e Medal_Evo_Attribute sostituite
    # con le texture dei riquadri del dettaglio medaglia, in 9-slice con gli stessi bordi di
    # MedalInfo_InfoWindow (Medal_Detail_Field 200/90, Plate02 50/0); MD_Guilt4_On nascosta.
    # Stile di riferimento: reference\medal_evolve\web_tumblr_evolve1.png (client 2015).
    # Etichette giapponesi tradotte.
    'MedalInfo_Evo_Right_Gen.json': ('copy', 'MedalInfo_Evo_Right_ver260.json', {}, False, [
        ('tex', 'Base_MedalInfo2', 'Medal_Detail_Field.png',
         dict(scale9Enable=True, capInsetsX=200, capInsetsY=90, capInsetsWidth=1, capInsetsHeight=1,
              scale9Width=373, scale9Height=153)),
        ('tex', 'Plate4', 'Plate02.png',
         dict(scale9Enable=True, capInsetsX=50, capInsetsY=0, capInsetsWidth=1, capInsetsHeight=1,
              scale9Width=352, scale9Height=30, height=30)),
        ('tex', 'Guilt_Icon', None),
        ('text', 'ATk', 'STR'), ('text', 'DEF', 'DEF'),
        ('text', 'Burst', 'Special Attack'), ('text', 'BurstName_Label', ''),
        ('text', 'Ability', 'Ability'), ('text', 'BurstCost', 'Required Gauges'),
        # aggiunti dopo la ver260 (FUN_00cbfbd0, FUN_00cc458c): riquadri del Kakusei (skill
        # di risveglio) e del Super Attack, cloni nascosti del riquadro dello speciale
        ('clone_r', 'Base_MedalInfo2', 'Base_KakuseiSkill', 'Panel_1',
         {'BurstName_Label': 'KakuseiSkillName_Label'}),
        ('clone_r', 'Base_MedalInfo2', 'Base_SuperBurst', 'Panel_1',
         {'BurstName_Label': 'SuperBurstName_Label', 'Burst': 'Txt_SuperBurstTitle'}),
        ('add', 'Base_SuperBurst', L('Txt_Ticker_SuperBurst', -150, -60, 300, 24, '', 16))]),
    # Disposizione dal riferimento reference\medal_evolve\evolve.png: medaglie grandi prima e
    # dopo con la doppia freccia in mezzo, stelle sotto ciascuna, materiali grandi in fila
    # con «Held N», barra in basso come quella del Level Up (MedalInfo_Mix_ver340).
    'MedalInfo_Evo_Left_Gen.json': ('build', P('Panel_Evo_Left', 0, 0, 480, 640, [
        # Dummy_Medal1/2 sono ImageView: il codice vi carica l'immagine della medaglia
        # (FUN_0125194c, loadTexture); da Panel il client va in crash. Immagini Medal_L
        # 640x640 con la medaglia al centro, scala 0,7; a schermo il centro della medaglia
        # cade (-428, -410)·scala px dalla posizione data (misurato sul banco a 0,3 e 0,42).
        I('Dummy_Medal1', 238, 220, 140, 170, 'Plate01.png', scale=0.7),
        I('Dummy_Medal2', 584, 220, 140, 170, 'Plate01.png', scale=0.7),
        I('Arrow_Evo', 233, 379, 100, 150, 'Medal_Evo_Arrow01.png'),
        # stelle (FUN_00736d94, scala 0,75): centrate nell'area, che sta sotto la medaglia
        P('Star_Area1', -88, 256, 300, 30),
        P('Star_Area2', 259, 256, 300, 30)])),
    # Area (FUN_00cc174c): i materiali richiesti, un pannello MedalInfo_Evo_Medal ogni 110 px.
    # Barra in basso con le misure del Level Up: Button_LimitCut e Button_Sell1 sono
    # immagini (il codice vi aggiunge il pulsante But01 / But06 e i testi «Evolve» e
    # «Sell Medals»), Base_Money1/2 = Required / Munny con l'icona Icon_Prize.
    'MedalInfo_Evo_Under_Gen.json': ('build', P('Panel_Evo_Under', 0, 0, 960, 640, [
        P('Area', -40, 80, 600, 150),
        I('Button_LimitCut', 80, 47, 158, 68, 'But01_Off.png', children=[
            L('Txt_LimitCut', 0, 2, 150, 58, 'Evolve', 30)]),
        # i figli di un ImageView si posizionano rispetto al suo centro
        I('Base_Money1', 295, 64, 270, 25, 'Plate03.png', children=[
            L('Txt_Money', -82, 0, 85, 24, 'Required', 16),
            I('Icon_Money', -25, 0, 30, 30, 'Icon_Prize.png', scale=0.5),
            L('Txt_Money_Label', 66, 0, 138, 24, '0', 18)]),
        I('Base_Money2', 295, 34, 270, 25, 'Plate03.png', children=[
            L('Txt_Money', -82, 0, 85, 24, 'Munny', 16),
            I('Icon_Money', -25, 0, 30, 30, 'Icon_Prize.png', scale=0.5),
            L('Txt_Money_Label', 66, 0, 138, 24, '0', 18)]),
        I('Button_Sell1', 491, 49, 119, 58, 'But06_Off.png', children=[
            L('Txt_Sell1', 0, 2, 110, 54, 'Sell Medals', 20)]),
        L('Txt_Wording', 770, 48, 380, 30, '', 18)])),
    # Materiale richiesto da Evolve (FUN_00cc57e0, riempito da FUN_00cc5a80): in Medal_S il
    # codice aggiunge l'icona (medalView) e lo ridimensiona; Possession e' un contenitore con
    # Label_9 (testo 101399490) e Num_Label (quantita' posseduta), entrambe con ombra
    # (FUN_006e418c: crash se mancano). Sfondo: lo slot «MEDAL» del Level Up
    # (Medal_Syn_Select_Panel 104x119: cerchio sopra, targhetta sotto per «Held N»), come
    # negli slot dei materiali della schermata originale.
    'MedalInfo_Evo_Medal.json': ('build', P('Panel_Evo_Medal', 0, 0, 104, 119, [
        I('Slot_Base', 52, 60, 104, 119, 'Medal_Syn_Select_Panel.png'),
        P('Medal_S', 2, 22, 100, 96),
        P('Possession', 0, 0, 104, 20, [
            L('Label_9', 30, 10, 60, 20, 'Held', 15),
            L('Num_Label', 84, 10, 30, 20, '0', 15)])])),
    'SlideMedalInfoScene_ver341.json': ('scene', [('LeftUI', 'publish/SlideMedalInfo_Left.json'),
                                                  ('RightUI', 'publish/SlideMedalInfo_Right.json')]),
    'SlideMedalInfo_Left.json': ('build', P('Panel_Left', 30, 320, 120, 220, [
        I('Arrow01', 0, 0, 56, 134, 'Medal_Syn_Arrow01.png')])),
    'SlideMedalInfo_Right.json': ('build', P('Panel_Right', 930, 320, 120, 220, [
        I('Arrow01', 0, 0, 56, 134, 'Medal_Syn_Arrow01.png', flipX=True)])),
    # Popup Sort di Medal List (FUN_00a458c4, FUN_00a45fa0): la ver350 e' la ver320 originale
    # piu' la sezione Dummy_Sb (filtro Super Burst; il codice la nasconde spostando le altre
    # della sua altezza: qui alta 0) e i filtri aggiunti dopo, cloni nascosti di quelli
    # vicini (nomi letti dallo stack al crash, dump mls2).
    'PopupNormal_SortButton_ver350.json': ('copy', 'PopupNormal_SortButton_ver320.json', {}, False, [
        P('Dummy_Sb', 0, 0, 0, 0),
        ('clone', 'Panel_TitleSkill', 'Panel_TitleSb', 'Dummy_Sb'),
        ('clone', 'Txt_TitleSkill', 'Txt_TitleSb', 'Dummy_Sb'),
        ('clone', 'Filter_Exp', 'Filter_SbPlus', 'Dummy_Sb'),
        ('clone', 'Filter_Exp', 'Filter_SbPlusPlus', 'Dummy_Sb'),
        ('clone', 'Filter_Single', 'Filter_Sb_Single', 'Dummy_Sb'),
        ('clone', 'Filter_All', 'Filter_Sb_All', 'Dummy_Sb'),
        ('clone', 'Filter_Random', 'Filter_Sb_Random', 'Dummy_Sb'),
    ] + [('clone', 'Filter_Ability%s' % n, 'Filter_Sb%s' % n, 'Dummy_Sb')
         for n in ('01', '02', '03', '04', '05', '06', '07', '08', '09', '12')]
      + [('clone', 'Filter_Ability_Recovery', 'Filter_Sb_' + n, 'Dummy_Sb')
         for n in ('Guard', 'BaseAttack', 'BaseDefence', 'NotSet', 'Recovery', 'Special', 'Recovery2',
                   'AttackOnly')]
      + [('clone', 'Filter_Ability_AtTime1', 'Filter_Sb_Timing%d' % n, 'Dummy_Sb') for n in range(1, 8)]
      + [('clone', 'Txt_SubTitle01', 'Txt_SubTitleSb01', 'Dummy_Sb'),
         ('clone', 'Txt_SubTitle02', 'Txt_SubTitleSb02', 'Dummy_Sb'),
         ('clone', 'Filter_Ability_Recovery', 'Filter_Ability_BaseAttack', 'Dummy_Ability'),
         ('clone', 'Filter_Ability_Recovery', 'Filter_Ability_BaseDefence', 'Dummy_Ability'),
         ('clone', 'Filter_Ability_Recovery', 'Filter_Ability_Guard', 'Dummy_Ability'),
         ('clone', 'Filter_Ability_Use6', 'Filter_Ability_Use7', 'Dummy_Ability'),
         ('clone', 'Filter_Ability_AtTime4', 'Filter_Ability_AtTime5', 'Dummy_Ability'),
         ('clone', 'Filter_Guilt9', 'Filter_Guilt10', 'Dummy_Guilt'),
         ('clone', 'Filter_RareStarSet7', 'Filter_RareStarSet8', 'Dummy_Filter')]
      + [('clone', 'Filter_Evo', 'Filter_Sb', 'Dummy_Sb')]   # cercato dentro Dummy_Sb (00a482ac)
      + [('clone', 'Filter_Evo', n, 'Dummy_Filter') for n in ('Filter_Subslot', 'Filter_Trait', 'Filter_Evo_Set')]),
    # Animazioni Armature (.ExportJson) mancanti: senza file la creazione dell'armatura
    # va in crash (FUN_011843c4). Copia di ArrowAnim con armatura e movimento rinominati.
    # Cursor_Anim_MedalSell: segno di selezione delle medaglie nella vendita (FUN_00882e10,
    # movimento Animation1; FUN_00883118 lo mostra sulle celle scelte). Copia del cursore
    # della fusione (Cursor_Anim_MdalMix_ver103, dall'addnl: bagliore Medal_Syn_Select_Eff02
    # 144x172 che pulsa, stesso movimento Animation1; plist e texture restano i suoi).
    'Cursor_Anim_MedalSell.ExportJson': ('armature', 'Cursor_Anim_MdalMix_ver103.ExportJson',
                                         'Cursor_Anim_MedalSell', {}),
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
    # Sell Medals (FUN_00bf0a10): titolo di Txt_A_Ticket (accanto a 106130301 «Jewels»)
    106240301: 'Tickets',
    # esito della vendita (FUN_006f4918, Txt_Sell_Ok1; l'alternativa 100300009 e' «Complete!»)
    106240302: 'Sale complete!',
}
# Popup Sort (FUN_00a45e24 nella costruzione dei filtri): testi del filtro Super Burst.
# Nell'IPA 4.4.0 i vicini (106240205-215) sono ancora segnaposto «[id]»: stesso formato
# (la sezione Dummy_Sb e' nascosta).
TEXTS.update({i: '[%d]' % i for i in [106240220] + list(range(106240216, 106240220))
              + list(range(106240221, 106240228))})


def node(name, tag):
    return {'classname': 'CCNode', 'name': name, 'canedit': True, 'objecttag': tag, 'rotation': 0,
            'scalex': 1, 'scaley': 1, 'visible': 1, 'x': 0, 'y': 0, 'zorder': 1,
            'gameobjects': [], 'components': []}


def scene(names):
    """names: 'Nome' (nodo vuoto), ('Nome', 'publish/layout.json') (nodo con GUIComponent)
    o ('Nome', 'publish/layout.json', x, y) (nodo spostato, come nelle scene originali)."""
    root = node(None, 10000)
    root['gameobjects'] = []
    for i, n in enumerate(names):
        name, ui, x, y = (n, None, 0, 0) if isinstance(n, str) else (tuple(n) + (0, 0))[:4]
        g = dict(node(name, 10001 + i), **{'__type': 'ComGameObjectSurrogate:#EditorCommon.JsonModel'})
        g.update(x=x, y=y)
        if ui:
            g['components'] = [{'__type': 'ComGUIAdapterSurrogate:#EditorCommon.JsonModel.Component',
                                'classname': 'GUIComponent', 'name': 'GUIComponent', 'file': None,
                                'fileData': {'path': ui, 'plistFile': '', 'resourceType': 0}}]
        root['gameobjects'].append(g)
    root.update({'CanvasSize': {'_height': 640, '_width': 960}, 'Triggers': None, 'Version': '1.6.0.0',
                 'components': [{'__type': 'ComSceneSurrogate:#EditorCommon.JsonModel.Component',
                                 'classname': 'CCScene', 'name': 'CCScene', 'scenename': 'generated'}]})
    return root


def find(w, name):
    if w.get('options', {}).get('name') == name:
        return w
    for c in w.get('children', []):
        hit = find(c, name)
        if hit:
            return hit
    return None


def clone(tree, src, name, parent, visible=False):
    """Copia del widget src (con i figli) chiamata name, aggiunta a parent: per i widget che
    il codice cerca e un layout piu' vecchio non ha (CheckBox e simili, stessa classe)."""
    w = json.loads(json.dumps(find(tree, src)))
    w['options']['name'] = w['name'] = name
    w['options']['visible'] = visible
    find(tree, parent)['children'].append(w)


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
    if 'scale' in s:                    # es. icone a cui il codice carica la texture
        o.update(scaleX=s['scale'], scaleY=s['scale'])
    if 'ignoreSize' in s:               # False: la texture caricata dal codice si adatta a w x h
        o['ignoreSize'] = s['ignoreSize']
    w['name'] = s['name']
    if s['cls'] == 'ImageView':
        o.update(fileNameData=tex(s['tex']), scale9Width=s['w'], scale9Height=s['h'])
        if s.get('flipX'):
            o['flipX'] = True
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
        for extra in (spec[4] if len(spec) > 4 else ()):
            if isinstance(extra, tuple) and extra[0] == 'text':     # ('text', nome, testo)
                find(data['widgetTree'], extra[1])['options']['text'] = extra[2]
            elif isinstance(extra, tuple) and extra[0] == 'tex':
                # ('tex', nome, texture|None[, {opzioni, es. scale9 come nei layout originali}])
                o = find(data['widgetTree'], extra[1])['options']
                if extra[2]:
                    o['fileNameData'] = tex(extra[2])
                    o.update(extra[3] if len(extra) > 3 else {})
                else:                       # texture assente ovunque: widget nascosto
                    o['fileNameData'] = tex('Plate01.png')
                    o['visible'] = False
            elif isinstance(extra, tuple) and extra[0] == 'clone_r':
                # ('clone_r', sorgente, nome, genitore, {figlio: nuovo nome}): clone nascosto
                # con i figli rinominati (riquadri che una versione successiva aggiunge)
                clone(data['widgetTree'], *extra[1:4])
                rename(find(data['widgetTree'], extra[2]), extra[4])
            elif isinstance(extra, tuple) and extra[0] == 'add':    # ('add', genitore, widget)
                find(data['widgetTree'], extra[1])['children'].append(build(extra[2]))
            elif isinstance(extra, tuple):          # ('clone', sorgente, nome, genitore)
                clone(data['widgetTree'], *extra[1:])
            else:
                data['widgetTree']['children'].append(build(extra))
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
