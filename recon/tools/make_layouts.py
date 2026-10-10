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
import plistlib
import re
import shutil
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


def C(name, x, y, w, h, tex, children=(), **kw):
    """CheckBox (texture <tex>_Off/_On come i filtri del popup Sort)."""
    return dict(cls='CheckBox', name=name, x=x, y=y, w=w, h=h, tex=tex, children=list(children), **kw)


def L(name, x, y, w, h, text='', size=22, **kw):
    return dict(cls='Label', name=name, x=x, y=y, w=w, h=h, text=text, size=size, **kw)


def I(name, x, y, w, h, tex, **kw):
    return dict(cls='ImageView', name=name, x=x, y=y, w=w, h=h, tex=tex, **kw)


# targhetta Plate03 in 9-slice come in MedalInfo_Mix_ver340 (bordo 70)
PLATE3 = dict(scale9Enable=True, capInsetsX=70, capInsetsY=0, capInsetsWidth=1, capInsetsHeight=1)
# fondo e bordo dei riquadri come in DeckEdit_MedalForm (Win_under, Win)
# pulsanti come DeckEdit_MedalForm (Button_Sort 178x53): 9-slice orizzontale, bordo 30
BUT9 = dict(scale9Enable=True, capInsetsX=30, capInsetsY=0, capInsetsWidth=1, capInsetsHeight=1)
# il 9-slice non abbassa sotto i 68 px della texture (bordo inferiore di 67): per l'altezza
# degli screenshot originali (52) si scala il widget intero
BUTS = dict(BUT9, scaleX=0.765, scaleY=0.765)
PANEL4 = dict(scale9Enable=True, capInsetsX=50, capInsetsY=50, capInsetsWidth=1, capInsetsHeight=1)
# fondo della griglia scurito come negli screenshot originali (quasi nero, bordo blu)
GRID = dict(PANEL4, colorR=70, colorG=85, colorB=120)
# Panel a tinta unita (cocostudio 1.6: colorType 1), rosso della fascia di avviso
RED_BG = dict(colorType=1, bgColorR=233, bgColorG=18, bgColorB=38, bgColorOpacity=255)
PANEL15 = dict(scale9Enable=True, capInsetsX=50, capInsetsY=0, capInsetsWidth=1, capInsetsHeight=1)


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


def obtain_plates(cx, cy):
    """Come obtain_panels, nell'aspetto del popup «Complete!» originale
    (reference\\material_sell\\complete_thumb.png, video WiFh447niJY): una targa scura per
    riga larga quasi quanto la finestra, «Munny» a sinistra, icona al centro, quantita'
    gialla allineata a destra; righe centrate su (cx, cy), 40 l'una dall'altra."""
    panels = []
    for n in range(1, 5):
        plates = [P('Obtain_Plate_' + 'abcd'[k], 0, 40 * (n - 1 - k), 480, 36, [
            I('Base', 240, 18, 480, 30, 'Plate03.png', opts=PLATE3),
            L('Txt', 15, 18, 160, 30, '', 20, opts=dict(anchorPointX=0)),
            I('Icon', 240, 18, 44, 46, 'Icon_Prize.png', s9=False, scale=0.5),
            L('Txt_Label', 465, 18, 200, 30, '0', 22,
              opts=dict(anchorPointX=1, colorR=255, colorG=230, colorB=60))]) for k in range(n)]
        panels.append(P('Panel_%d' % n, cx - 240, cy - 20 * n, 480, 40 * n, plates, visible=False))
    return panels


def held_plates(y):
    """Possesso mostrato nelle conferme del Moogle Shop (FUN_00e16a84, FUN_00e13b3c): jewel
    (LB_Jewel con «Held» in Txt_CrownPossessed e il numero in _Label, scritti dal codice) o
    Munny (LB_Munnies, Txt_MunniesPossessed_Label, Txt_Munnies), uno solo visibile secondo
    payType. Targhe centrate in x=480 della radice (finestra del popup OK/Annulla)."""
    return [
        I('LB_Jewel', 480, y, 360, 28, 'Plate03.png', opts=PLATE3, children=[
            I('Icon_Jewel', 15, 0, 90, 90, 'IncentiveIcon_02.png', s9=False, scale=0.3)]),
        L('Txt_CrownPossessed', 400, y, 160, 28, 'Held', 22),
        L('Txt_CrownPossessed_Label', 570, y, 200, 28, '0', 22),
        I('LB_Munnies', 480, y - 32, 360, 28, 'Plate03.png', opts=PLATE3, children=[
            L('Txt_MunniesPossessed_Label', -90, 0, 160, 24, 'Munny', 20),
            L('Txt_Munnies', 90, 0, 160, 24, '0', 20)])]


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
        # dietro la griglia: fondo scuro Panel04 (9-slice 50/50) e bordo Panel15 (bordo 50),
        # come DeckEdit_MedalForm; nell'originale va da sotto la barra fino al fondo
        # (reference\medal_list\medal_list_yt_06.jpg, medal_list_01.jpg)
        I('Grid_Under', 480, 220, 950, 490, 'Panel04.png', opts=GRID),
        # in alto passa sotto la barra (disegnata dopo), come negli originali: la prima riga
        # comincia subito sotto (medal_list_01.jpg: targhetta a 549 px su 1080)
        P('Scroll_Area', 3, 0, 954, 519),
        P('Medal_Sell_Panel', 0, 450, 960, 70, [
            I('Img_Bar', 480, 48, 1136, 111, 'Medal_Syn_DeckBase1.png', s9=False),
            B('Button_Sell1', 75, 33, 162, 68, 'But03', 'Sell\nMedals', 24, label='Txt_Sell1', opts=BUTS),
            I('Img_Slots', 250, 45, 218, 26, 'Plate03.png', opts=PLATE3),
            # contatore (FUN_00df284c): Txt_MedalGet = testo 101200050 «Slots», poi medaglie
            # possedute (Num) / capienza (All), scritte con FUN_00df34a4 (Label con ombra)
            L('Txt_MedalGet', 180, 45, 80, 26, 'Slots', 17),
            L('Txt_MedalGet_Num_Label', 292, 45, 50, 26, '0', 18),
            L('Txt_MedalGet_Slash', 315, 45, 14, 26, '/', 18),
            L('Txt_MedalGet_All_Label', 337, 45, 50, 26, '0', 18),
            I('Img_SortType', 667, 45, 185, 26, 'Plate03.png', opts=PLATE3),
            # FUN_00760c64 (barra di ordinamento generica) cerca qui anche Txt_Sort_Label
            # (criterio) e Txt_Filter_On (testo 100100012 «Filter ON»).
            L('Txt_Sort_Label', 667, 45, 180, 26, 'Strength', 18),
            L('Txt_Filter_On', 667, 22, 180, 20, 'Filter ON', 14),
            B('Button_Sort', 858, 33, 233, 68, 'But03', 'Sort', 30, opts=BUTS),
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
    # Stile dalle schermate originali (reference\medal_list\web_reddit_sell_playingcard.jpg,
    # web_tumblr_sell1.png, medal_sell_yt_02.jpg): barre curve del Level Up
    # (Medal_Syn_DeckBase1 in alto, DeckBase2 in basso, come MedalInfo_Mix_ver340), targhette
    # Plate03 in 9-slice (bordo 70), Sort arancione (But03), Sell rosso (But01), icone delle
    # valute al centro delle targhette e valori a destra. Posizioni misurate sullo
    # screenshot di reddit (1334x750: x = 0,853·x' − 89, y = 0,853·(750 − y')).
    'MedalSell_Gen.json': ('build', P('medal_sell_root', 0, 0, 960, 640, [
        I('Grid_Under', 480, 270, 950, 390, 'Panel04.png', opts=GRID),
        P('Scroll_Area', 9, 95, 942, 428),
        # Medal_Sell_Panel = barra in alto (il codice la rende toccabile: a schermo intero
        # coprirebbe la griglia e la selezione non arriverebbe); i figli della barra in basso
        # stanno fuori dai suoi bordi (y negativa: cocos2d non ritaglia).
        P('Medal_Sell_Panel', 0, 450, 960, 70, [
            I('Img_Bar', 480, 48, 1136, 111, 'Medal_Syn_DeckBase1.png', s9=False),
            I('Plate_Sort', 667, 45, 185, 26, 'Plate03.png', opts=PLATE3),
            L('Txt_Sort_Label', 667, 45, 180, 26, 'Strength', 18),
            L('Txt_Filter_On', 667, 22, 180, 20, 'Filter ON', 14),
            B('Button_Sort', 858, 33, 233, 68, 'But03', 'Sort', 30, opts=BUTS),
            I('Img_Bottom', 480, -402, 1136, 96, 'Medal_Syn_DeckBase2.png', s9=False),
            B('Button', 100, -401, 177, 64, 'But01', 'Sell', 30, label='Txt_Sell', opts=BUT9),
            # riga alta della barra in basso: titolo «Munny» (il valore e' Txt_Money_Total_Lavel)
            L('Txt_Money_Total', 262, -384, 100, 24, 'Munny', 17),
        ]),
        # in alto: contatore come in Medal List (FUN_00bf2264 / FUN_00bf5b18), poi i Munny
        # posseduti: Txt_Money (100300003 «Munny») e Txt_Money_Label (FUN_00bf25fc)
        I('Plate_Slots', 118, 495, 218, 26, 'Plate03.png', opts=PLATE3),
        L('Txt_MedalGet', 45, 495, 80, 26, 'Slots', 17),
        L('Txt_MedalGet_Num_Label', 160, 495, 50, 26, '0', 18),
        L('Txt_MedalGet_Slash', 183, 495, 14, 26, '/', 18),
        L('Txt_MedalGet_All_Label', 205, 495, 50, 26, '0', 18),
        L('BoxNow', 165, 455, 60, 30, '0', 20, visible=False),
        L('BoxMaxLabel', 225, 455, 70, 30, '0', 20, visible=False),
        I('DeckBase2', 375, 495, 266, 26, 'Plate03.png', opts=PLATE3),
        L('Txt_Money', 285, 495, 80, 26, 'Munny', 17),
        I('Icon_Money_Top', 349, 495, 56, 57, 'IncentiveIcon_04.png', scale=0.4, s9=False),
        L('Txt_Money_Label', 445, 495, 120, 26, '0', 18),
        # in basso: Munny e Avatar Coins ricavati
        I('Plate_Money_Total', 373, 66, 311, 24, 'Plate03.png', opts=PLATE3),
        I('Icon_Money_Sell', 369, 66, 56, 57, 'IncentiveIcon_04.png', scale=0.4, s9=False),
        L('Txt_Money_Total_Lavel', 480, 66, 110, 24, '0', 18),
        I('Plate_A_Coin', 373, 30, 311, 24, 'Plate03.png', opts=PLATE3),
        L('Txt_A_Coin', 275, 30, 120, 24, 'Avatar Coins', 17),
        I('Icon_A_Coin', 401, 30, 67, 69, 'IncentiveIcon_14.png', scale=0.38, s9=False),
        L('Txt_A_Coin_Label', 495, 30, 80, 24, '0', 18),
        P('Plate_A_Jewel', 700, 51, 200, 28, [
            L('Txt_A_Jewel', 40, 14, 70, 28, '', 18),
            L('Txt_A_Jewel_Label', 140, 14, 100, 28, '0', 20),
        ], visible=False),
        P('Plate_A_Ticket', 700, 14, 200, 28, [
            L('Txt_A_Ticket', 40, 14, 70, 28, '', 18),
            L('Txt_A_Ticket_Label', 140, 14, 100, 28, '0', 20),
        ], visible=False),
    ])),
    # Moogle Shop (SceneMoogleShop, FUN_00e0d504/FUN_00e0dce8/FUN_00e0ee00, schede
    # FUN_00e0ea2c): nessun layout esiste nelle risorse. Disposizione dalla 4.1.0 giapponese
    # (reference\moogle_shop\jp410_*.png, youtube FX5Chfckqkk): schede «Traits»/«Items»
    # (tab0/tab1: pulsante img/ui/Mogshop_tab_*, Txt_Tab, Icon_New), «Sell Materials»
    # arancione in alto a destra, finestra con l'elenco (CenterUI > Mshop_win > Area_Traits,
    # Area_Item, win_Traits, win_Item), «Select Medal» e i Munny posseduti in basso, il
    # moogle a destra (Moogle_Fla, lwf/mogshop/mog_wait). Nomi dalle stringhe del codice
    # (func_strings.py) e dal decompilato.
    'MoogleShopScene_ver410.json': ('scene', [('CenterUI', 'publish/MoogleShop_Gen.json'),
                                              ('LeftUI', 'publish/MedalSell_Back.json', 0, 576)]),
    'MoogleShop_Gen.json': ('build', P('moogle_shop_root', 0, 0, 960, 640, [
        # tab1/tab2 (FUN_00e0ea2c: «tab%d» da 1; testi 106220402/403) sono ImageView: il pulsante (FUN_008d5c18) vi carica img/ui/Mogshop_tab_*
        # (da Panel: crash in loadTexture); figli rispetto al centro
        # Misure da reference\moogle_shop\moogle_shop_01.png (area di gioco 1764 px = 1136,
        # scala 1,553): finestra x 2-755, y 4-466; schede ~200x48 a y 492; «Sell Materials»
        # centrato a x 655; righe larghe 720 (FUN_00aaf278: 720x184 e 720x110)
        I('tab1', 115, 492, 200, 48, 'Plate01.png', s9=False, children=[
            L('Txt_Tab', 0, 0, 190, 40, 'Traits', 24),
            I('Icon_New', 80, 22, 69, 30, 'Deck_Medal_New.png', s9=False, scale=0.6, visible=False)]),
        I('tab2', 327, 492, 200, 48, 'Plate01.png', s9=False, children=[
            L('Txt_Tab', 0, 0, 190, 40, 'Items', 24),
            I('Icon_New', 80, 22, 69, 30, 'Deck_Medal_New.png', s9=False, scale=0.6, visible=False)]),
        B('Button_EquipSell', 655, 495, 252, 63, 'But03', 'Sell Materials', 26, label='Txt_EquipSell',
          opts=BUTS),
        P('Mshop_win', 2, 4, 754, 462, [
            I('win_Traits', 377, 231, 754, 462, 'Panel04.png', opts=GRID),
            I('win_Item', 377, 231, 754, 462, 'Panel04.png', opts=GRID, visible=False),
            P('Area_Traits', 17, 74, 720, 380),
            P('Area_Item', 17, 10, 720, 444, visible=False)]),
        L('Txt_NoItem', 379, 240, 500, 40, 'No items available.', 24, visible=False),
        B('Button_MedalSelect', 379, 40, 177, 64, 'But01', 'Select Medal', 22, label='Txt_MedalSelect',
          opts=BUTS),
        I('LB_Munnies', 870, 30, 230, 26, 'Plate03.png', opts=PLATE3, children=[
            L('Txt_MunniesPossessed_Label', -70, 0, 100, 24, 'Munny', 17),
            I('Icon_Munnies', -5, 0, 44, 46, 'Icon_Prize.png', s9=False, scale=0.5),
            L('Txt_Munnies', 65, 0, 120, 24, '0', 18)]),
        P('Moogle_Fla', 860, 160, 10, 10),
    ])),
    # Righe dell'elenco (FUN_00aaf278 le crea: Traits 721x110, Items 721x184; riempite da
    # FUN_00aaf8e4 e FUN_00ab175c). Nomi dal decompilato; disposizione dalle righe della 4.1.0
    # (riquadro scuro con icona del trait, nome, prezzo a destra; oggetti su targa dorata
    # con «Buy»). Panel_Disable, Caution, LockMask nascosti: li mostra il codice.
    # Ricerche di changeRowKakusei (FUN_00aaf8e4, lookups.py): dentro Panel_Disable cerca
    # Panel, SkillPanel, SkillPanel_Rare (kakusei_Icon, Txt_KakuseiSkill), Count (Txt_Count,
    # Txt_Count_Cus) e Plate_Count_Rare; dalla riga Jewel/Txt_Jewel, Munnies/Txt_Munnies,
    # Caution, Icon_New, Txt_Limit, LockMask (ImageButton_LockMask, Icon_Lock). Aspetto da
    # reference\moogle_shop\moogle_shop_traits_yt_03.jpg: riga blu (dorata per le offerte a
    # tempo), icona tonda del trait e nome su targa scura, prezzo a destra, «Exchanges left»
    # sotto il prezzo, «N day left» in alto a destra.
    'MoogleShop_Traits_Panel_ver410.json': ('build', P('Traits_Root', 0, 0, 721, 110, [
        P('Panel_Disable', 0, 0, 721, 110, [
            # Panel e Panel_Rare sono lo sfondo della riga: ImageView in cui changeRowKakusei
            # carica img/ui/But29_* (blu) o But31_* (dorata) secondo frameType (con un Panel:
            # crash in loadTexture, stack mg8); texture di make_textures.py, 704x106
            I('Panel', 360, 55, 704, 106, 'Plate01.png', s9=False),
            I('Panel_Rare', 360, 55, 704, 106, 'Plate01.png', s9=False, visible=False),
            P('SkillPanel', 18, 20, 440, 70, [
                I('Skill_Base', 230, 35, 420, 56, 'Plate03.png', opts=PLATE3),
                I('kakusei_Icon', 34, 35, 60, 60, 'Plate01.png', s9=False),
                L('Txt_KakuseiSkill', 210, 35, 300, 36, '', 24)]),
            P('SkillPanel_Rare', 18, 20, 440, 70, [
                I('Skill_Base2', 230, 35, 420, 56, 'Plate03.png', opts=PLATE3),
                I('kakusei_Icon', 34, 35, 60, 60, 'Plate01.png', s9=False),
                L('Txt_KakuseiSkill', 210, 35, 300, 36, '', 24)], visible=False),
            # solo Txt_Count: il codice ne fa un CustomRichText «Txt_Count_Cus» (FUN_006e436c);
            # una Label con quel nome verrebbe presa al suo posto (crash a 0x879d40, stack mg12)
            P('Count', 480, 6, 220, 26, [
                L('Txt_Count', 110, 13, 210, 22, '', 16)], visible=False),
            # frameType 1: SkillPanel + Count; altrimenti SkillPanel_Rare + «Count_Rare»
            # (stringa Plate_Count_Rare + 6; crash a 0xaafe08, stack mg5), con gli stessi testi
            P('Count_Rare', 480, 6, 220, 26, [
                I('Plate_Count_Rare', 110, 13, 220, 26, 'Plate03.png',
                  opts=dict(PLATE3, colorR=255, colorG=220, colorB=90)),
                L('Txt_Count', 110, 13, 210, 22, '', 16)], visible=False)]),
        P('Jewel', 480, 34, 220, 50, [
            I('Jewel_Icon', 30, 25, 90, 90, 'IncentiveIcon_02.png', s9=False, scale=0.45),
            L('Txt_Jewel', 140, 25, 150, 34, '0', 26)]),
        P('Munnies', 480, 34, 220, 50, [
            I('Munnies_Icon', 30, 25, 44, 46, 'Icon_Prize.png', s9=False, scale=0.6),
            L('Txt_Munnies', 140, 25, 150, 34, '0', 24)], visible=False),
        P('Caution', 30, 0, 440, 20, [L('Txt_Caution', 220, 10, 430, 20, '', 16)], visible=False),
        I('Icon_New', 40, 98, 69, 30, 'Deck_Medal_New.png', s9=False, scale=0.6, visible=False),
        L('Txt_Limit', 620, 96, 180, 20, '', 16),
        P('LockMask', 0, 0, 721, 110, [
            B('ImageButton_LockMask', 360, 55, 721, 110, 'But16', None),
            I('Icon_Lock', 650, 55, 45, 49, 'Deck_Medal_Lock.png', s9=False)], visible=False)])),
    # Ricerche di changeRowItem (FUN_00ab175c, lookups.py sul decompilato): dalla riga Item
    # (testi Txt_Material_Name/_Text), Panel e Panel_Rare (uno solo visibile secondo frameType;
    # Panel_Item dentro quello scelto), But_Buy con dentro ImageButton_Buy1, Count con
    # Plate_Count, Plate_Count_Rare, Txt_Count, Txt_Count_Cus; Jewel/Txt_Jewel, Caution,
    # Icon_New, Txt_Limit, LockMask (ImageButton_LockMask, Lock_icon). Testi e pulsanti fuori
    # da Panel/Panel_Rare (la ricerca prende il primo trovato, anche se nascosto). Aspetto da
    # reference\moogle_shop\moogle_shop_01.png: riga blu, icona a sinistra, nome su targa,
    # prezzo in jewel e «Exchange» rosso a destra.
    'MoogleShop_Item_Panel.json': ('build', P('Item_Root', 0, 0, 721, 184, [P('Item', 0, 0, 721, 184, [
        P('Panel', 0, 0, 721, 184, [
            # Win04 e' alta 322 e il 9-slice non scende sotto: altezza 322 scalata a 176 (senza,
            # lo sfondo di ogni riga copre la meta' bassa della precedente)
            I('Row_Base', 360, 92, 704, 322, 'Win04.png', opts=dict(PANEL4, capInsetsY=60, scaleY=0.547)),
            P('Panel_Item', 22, 22, 140, 140)]),
        P('Panel_Rare', 0, 0, 721, 184, [
            I('Row_Base_Rare', 360, 92, 704, 322, 'Win04.png',
              opts=dict(PANEL4, capInsetsY=60, scaleY=0.547, colorR=255, colorG=170, colorB=40)),
            P('Panel_Item', 22, 22, 140, 140)], visible=False),
        I('Name_Plate', 440, 140, 520, 44, 'Plate03.png', opts=PLATE3),
        L('Txt_Material_Name', 330, 140, 300, 36, '', 24),
        L('Txt_Material_Text', 360, 92, 360, 40, '', 18),
        P('Jewel', 520, 118, 190, 44, [
            I('Jewel_Icon', 28, 22, 90, 90, 'IncentiveIcon_02.png', s9=False, scale=0.45),
            L('Txt_Jewel', 130, 22, 150, 34, '0', 26)]),
        B('But_Buy', 612, 62, 177, 64, 'But01', 'Exchange', 24, label='Txt_buy', opts=BUTS, children=[
            B('ImageButton_Buy1', 0, 0, 177, 64, 'But01', None, opts=BUTS, visible=False)]),
        P('Count', 190, 8, 300, 30, [
            I('Plate_Count', 150, 15, 300, 26, 'Plate03.png', opts=PLATE3, visible=False),
            I('Plate_Count_Rare', 150, 15, 300, 26, 'Plate03.png',
              opts=dict(PLATE3, colorR=255, colorG=200, colorB=60), visible=False),
            L('Txt_Count', 150, 15, 280, 22, '', 16)], visible=False),   # _Cus: lo crea il codice
        L('Txt_Limit', 612, 16, 200, 22, '', 16),
        P('Caution', 180, 160, 360, 24, [L('Txt_Caution', 180, 12, 360, 20, '', 16)], visible=False),
        I('Icon_New', 40, 165, 69, 30, 'Deck_Medal_New.png', s9=False, scale=0.6, visible=False),
        P('LockMask', 0, 0, 721, 184, [
            B('ImageButton_LockMask', 360, 92, 721, 184, 'But16', None),
            I('Lock_icon', 650, 92, 45, 49, 'Deck_Medal_Lock.png', s9=False)], visible=False)])])),
    # IconPanel: dentro Panel_Item; Base riceve img/ui/Mogshop_plate1.png (make_textures.py)
    # FUN_0074d540 (icona generica di un premio: tipo, id, nome, quantita') vi cerca e usa
    # senza controlli LuxBoard, AVT, Incentive, Medal, KB, Stamp (Star_Area facoltativo); li
    # nasconde e mostra quello del tipo (3 medaglia, 5 materiale e gli altri -> Incentive).
    # Struttura come i premi di AdventureTop2_SubMission_ver131 (Incentive, Medal, KB, LuxBoard,
    # AVT); senza: crash all'apertura della scheda Items (mg2, pc 0x74d780)
    'MoogleShop_IconPanel.json': ('build', P('IconPanel', 0, 0, 140, 140, [
        # Base: il codice vi carica img/ui/Mogshop_plate1 solo per Panel_Rare; stessa texture
        # anche in cocostudio/publish per la riga normale (make_textures.py)
        I('Base', 70, 70, 140, 140, 'Mogshop_plate1.png', s9=False),
        I('Incentive', 70, 70, 100, 100, 'Plate01.png', s9=False, visible=False),
        I('Medal', 70, 70, 89, 109, 'Medal_S_00000001.png', s9=False, visible=False),
        I('KB', 70, 70, 100, 100, 'Plate01.png', s9=False, visible=False),
        I('Stamp', 70, 70, 100, 100, 'Plate01.png', s9=False, visible=False),
        P('LuxBoard', 20, 20, 100, 100, visible=False),
        P('AVT', 20, 20, 100, 100, visible=False),
        P('Star_Area', 20, 5, 100, 24, visible=False),
        # changeRowItem cerca Icon_Skill dentro Panel_Item (l'icona dell'abilita' delle
        # medaglie con skillType 3) e ne chiama setVisible senza controlli (mg3, pc 0xab1c84)
        I('Icon_Skill', 115, 115, 40, 40, 'Plate01.png', s9=False, visible=False)])),
    # Vendita materiali («Sell Materials» del Moogle Shop, FUN_00c5e584): EquipSellScene e i
    # suoi layout non esistono. Nessuno screenshot originale trovato: stile della vendita
    # medaglie. Scena: Button_Back, Txt_Money_Total(_Lavel), EquipSell_Scroll_Area, Txt_None.
    # Riga EquipSell_Block (FUN_00887854, riempita da 0x887cc0..): EquipSellBlock con
    # MaterialSellIcon, «Txt_data1 » (con lo spazio in coda), Txt_data2, Txt_Material_Name,
    # Txt_MaterialStock_Fix1, Txt_Money_Fix, PanelMask.
    'EquipSellScene.json': ('scene', [('CenterUI', 'publish/EquipSell_Gen.json'),
                                      ('LeftUI', 'publish/MedalSell_Back.json', 0, 576)]),
    # radice «Panel_1»: il codice cerca Panel_1 e dentro EquipSell_Scroll_Area (0xc5ebd4)
    'EquipSell_Gen.json': ('build', P('Panel_1', 0, 0, 960, 640, [
        I('Grid_Under', 480, 280, 950, 380, 'Panel04.png', opts=GRID),
        P('EquipSell_Scroll_Area', 9, 95, 942, 370),
        L('Txt_None', 480, 280, 600, 40, '', 24),
        I('Img_Bottom', 480, 48, 1136, 96, 'Medal_Syn_DeckBase2.png', s9=False),
        I('Plate_Money_Total', 480, 45, 400, 30, 'Plate03.png', opts=PLATE3, children=[
            L('Txt_Money_Total', -110, 0, 140, 26, 'Munny', 20),
            I('Icon_Money_Total', -20, 0, 44, 46, 'Icon_Prize.png', s9=False, scale=0.5),
            L('Txt_Money_Total_Lavel', 100, 0, 160, 26, '0', 22)])])),
    # Le colonne stanno a meta' della larghezza dell'area (~465): riga larga 460, come le
    # targhe della vendita medaglie: nome in alto, «Owned» con la quantita' (Txt_data1 ha il
    # testo 102000002 = " "), «Price» (Txt_data2) con l'icona dei Munny e il prezzo in giallo.
    'EquipSell_Block.json': ('build', P('Panel_Block', 0, 0, 460, 110, [
        P('EquipSellBlock', 0, 0, 460, 110, [
            I('Block_Base', 230, 55, 450, 104, 'Plate02.png', opts=PANEL4),
            I('MaterialSellIcon', 62, 55, 80, 80, 'Plate01.png', s9=False),
            L('Txt_Material_Name', 280, 84, 300, 28, '', 22),
            I('Own_Plate', 285, 50, 300, 26, 'Plate03.png', opts=PLATE3),
            L('Txt_Own', 185, 50, 100, 24, 'Owned', 18),
            L('Txt_data1 ', 300, 50, 20, 24, '', 18),
            L('Txt_MaterialStock_Fix1', 370, 50, 120, 24, '', 20),
            I('Price_Plate', 285, 20, 300, 26, 'Plate03.png', opts=PLATE3),
            L('Txt_data2', 185, 20, 100, 24, '', 18),
            I('Icon_Price', 260, 20, 44, 46, 'Icon_Prize.png', s9=False, scale=0.45),
            L('Txt_Money_Fix', 370, 20, 120, 24, '', 20, opts=dict(colorR=255, colorG=230, colorB=60)),
            P('PanelMask', 0, 0, 460, 110, visible=False),
            # Panel_On: evidenza della riga scelta (cercato da FUN_00888xxx, crash se manca)
            I('Panel_On', 230, 55, 450, 104, 'Plate02.png', opts=dict(PANEL4, colorR=120, colorG=220, colorB=255),
              visible=False)])])),
    'EquipSell_Dialog_Step1.json': ('func', 'material_sell_popup'),
    # Conferma (FUN_00c611fc): popup OK/Annulla con il riepilogo
    'EquipSell_Dialog_Step2.json': ('copy', 'PopupNormal_Text_34_4Line_OkCancel.json',
                                    {'Button_OK': 'Button_sell_ok', 'Txt_OK': 'Txt_sell_ok',
                                     'Button_Close': 'Button_cancel', 'Txt_Cancel': 'Txt_cancel',
                                     '4Line_Label': 'Txt_Material_Name_Dlog'},
                                    False, [
        ('text', 'Txt_Material_Name_Dlog', ''),
        L('Txt_data1', 380, 300, 200, 26, '', 20), L('Txt_data2', 580, 300, 200, 26, '', 20),
        L('Txt_data3', 480, 260, 300, 26, '', 20),
        L('Txt_MoneyTotalStock_Fix2', 380, 260, 150, 26, '', 20)]),
    # Quantita' da vendere di una medaglia impilata (equip_sell_popup, piu' sotto).
    'EquipSell_Medal_Step1_ver131.json': ('func', 'equip_sell_popup'),
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
        I('Star1', 240, 20, 26, 26, 'rare_star.png', s9=False),
        L('Txt_Wording2', 400, 20, 260, 36, 'Medals or higher.', 22),
        L('Txt_Wording3', 300, 20, 560, 36, '', 22, visible=False)])),
    # Conferma dello scambio di un articolo del Moogle Shop (openItemBuyPopup, FUN_00e16a84;
    # trovato con vtable_users.py dalle lambda; senza file crash leggendo widgetTree, stack
    # mg10): Txt_Wording (domanda), Txt_CrownPossessed_Label/Txt_CrownPossessed (jewel
    # posseduti), LB_Munnies con Txt_MunniesPossessed_Label/Txt_Munnies, Button_OK/Txt_OK,
    # Button_Close/Txt_Cancel. Dal popup OK/Annulla originale.
    # Anche conferma del trait (FUN_00e13b3c), che cerca in piu' LB_Jewel (targa dei jewel,
    # visibile con payType 1 come Txt_CrownPossessed/_Label).
    'MoogleShop_Traits_AddCheck.json': ('copy', 'PopupNormal_Text_34_4Line_OkCancel.json',
                                        {'4Line_Label': 'Txt_Wording'}, False,
                                        [('text', 'Txt_Wording', ''), ('opts', 'Txt_Wording', dict(y=75, height=100))]
                                        + held_plates(300)),
    # Conferma del trait su una medaglia senza slot liberi (FUN_00e13b3c con lo slot da
    # sostituire scelto nel popup): come AddCheck, ma l'OK si chiama Button_Draw (etichetta
    # Txt_Draw: con Txt_OK crash al tocco di «Set Trait», banco ts10) e sopra il
    # costo c'e' Txt_Wording2 (testo 106220410 «Replace X with Y?», CustomRichText creato dal
    # codice, come Txt_Wording).
    'MoogleShop_Traits_OverwriteCheck_ver410.json': ('copy', 'PopupNormal_Text_34_4Line_OkCancel.json',
                                                     {'4Line_Label': 'Txt_Wording', 'Button_OK': 'Button_Draw',
                                                      'Txt_OK': 'Txt_Draw'},
                                                     False,
                                                     [('text', 'Txt_Wording', ''),
                                                      ('opts', 'Txt_Wording', dict(y=30, height=50)),
                                                      L('Txt_Wording2', 480, 430, 600, 70, '', 22)]
                                                     + held_plates(290)),
    # Scelta della medaglia a cui dare un trait (FUN_00e103f4, «Exchange» di una riga Traits).
    'MoogleShop_Traits_MedalSelect_Pop_ver410.json': ('func', 'trait_medal_select_popup'),
    # Profilo (AvatarInfoDialog: open FUN_008d785c carica la scena nascosta e chiede
    # GET /user/profile, azione 5; createLayout FUN_008d7e8c). La scena ha UnderUI (Button_A..D
    # con Txt_A..D, Button_Invitation, Txt) e LeftUI. Il contenitore (lambda $_17,
    # FUN_008f3bf0) = AvatarInfo_Oneself_ver131 con sopra AvatarInfo_User_ver260 («User»,
    # zorder 2); FUN_008f3f40 vi aggiunge le pagine TxtLayer1 = AvatarInfo_Txt_ver340
    # (originale: statistiche, LUX, ranking, Share, Close_Button, Button_Change) e TxtLayer2 =
    # AvatarInfo_Txt2. Aspetto da reference\profile\profile_06.png (fotogramma 640x360, area
    # di gioco 540x360 da x=50: x = (x'-50)/0,5625, y = (360-y')/0,5625): barra in basso con
    # Titles / Name/Message / Play Style / Outfits rossi.
    # LeftUI/RightUI: createLayout fa del loro primo figlio il bersaglio di un pulsante (profilo
    # precedente/successivo): le frecce ‹ › ai bordi dello schermo in profile_06 (x' 10 e 628,
    # y' 175 -> x -71 e 1028, y 329), area toccabile centrata sulla freccia come in
    # SlideMedalInfo_Left/Right
    'AvatarInfoScene_A_ver131.json': ('scene', [('UnderUI', 'publish/AvatarInfo_Under_Gen.json'),
                                                ('LeftUI', 'publish/AvatarInfo_Left_Gen.json'),
                                                ('RightUI', 'publish/AvatarInfo_Right_Gen.json')]),
    'AvatarInfo_Left_Gen.json': ('build', P('Panel_Left', -71, 329, 90, 160, [
        I('Arrow01', 0, 0, 56, 134, 'Medal_Syn_Arrow01.png', s9=False, scale=0.55)])),
    'AvatarInfo_Right_Gen.json': ('build', P('Panel_Right', 1028, 329, 90, 160, [
        I('Arrow01', 0, 0, 56, 134, 'Medal_Syn_Arrow01.png', s9=False, scale=0.55, flipX=True)])),
    'AvatarInfo_Under_Gen.json': ('build', P('avatar_under_root', 0, 0, 960, 64, [
        B('Button_A', 107, 30, 230, 64, 'But01', 'Titles', 28, label='Txt_A', opts=BUTS),
        B('Button_B', 391, 30, 230, 64, 'But01', 'Name/Message', 28, label='Txt_B', opts=BUTS),
        B('Button_C', 596, 30, 230, 64, 'But01', 'Play Style', 28, label='Txt_C', opts=BUTS),
        B('Button_D', 853, 30, 230, 64, 'But01', 'Outfits', 28, label='Txt_D', opts=BUTS),
        B('Button_Invitation', 480, 100, 230, 64, 'But01', '', 28, label='Txt', opts=BUTS, visible=False)])),
    'AvatarInfo_Oneself_ver131.json': ('build', P('Oneself', 0, 0, 960, 640, [
        I('Win', 487, 350, 946, 570, 'Win04.png',
          opts=dict(scale9Enable=True, capInsetsX=50, capInsetsY=60, capInsetsWidth=1, capInsetsHeight=200))])),
    # «User» (FUN_008e68d0): Base_User (il codice vi carica Plate10) con Union_Symbol
    # (img/union/Union_%02d), Txt_Party/Party_Name, Txt_LV/Txt_LV_Label, MVP_Crown
    # (CrownIcon_Img img/ui/AvtInfo_CrownIcon%d, Crown_Label, CrownNum_Label) e MVP_Trophy
    # (Trophy_Img, Trophy_Label, TrophyNum_Label); FUN_008f3f40: Party_Button/Txt_PartyButton.
    # Struttura come Offline_Record_Left (versione offline: user_name, union_symbol,
    # mvp_crown, mvp_trophy); posizioni da profile_06 (targa del nome x 27-418, y 547; Party
    # y 500).
    'AvatarInfo_User_ver260.json': ('build', P('User_root', 0, 0, 960, 640, [
        I('Base_User', 222, 547, 390, 52, 'Plate10.png',
          opts=dict(scale9Enable=True, capInsetsX=40, capInsetsY=20, capInsetsWidth=1, capInsetsHeight=1), children=[
              I('Union_Symbol', -150, 0, 128, 128, 'Union_03.png', s9=False, scale=0.5),
              # nome del giocatore (stringa composta sullo stack, banco pf10)
              L('My_Name', 20, 0, 280, 34, '', 26)]),
        # miniatura dell'account collegato (FUN_008e7d58) a destra della targa del nome,
        # come in profile_06 (x' 272, y' 52); la mostra il codice secondo isLinkThumbnail
        I('FaceBook_PhotoPanel', 390, 547, 60, 60, 'FaceBook_PhotoPanel01.png', s9=False, scale=0.85,
          visible=False, children=[I('FaceBook_Photo', 30, 30, 50, 50, 'FaceBook_Photo.png', s9=False)]),
        # titolo (FUN_006e9bbc): targa img/userTitle/title_%04d caricata dal codice, testo
        # «sinistra destra» in RankTitle_Name; come AvatarTitle_PanelButton_Big2 (610x82) ma
        # alto quanto la riga del titolo del riferimento (y 613)
        I('RankTitle_Board', 222, 610, 406, 54, 'title_1000.png', s9=False, children=[
            L('RankTitle_Name', 0, 0, 380, 34, '', 22)]),
        I('Party_Plate', 222, 500, 390, 26, 'Plate03.png', opts=PLATE3),
        L('Txt_Party', 90, 500, 110, 24, 'Party', 18),
        L('Party_Name', 300, 500, 230, 24, '', 20, opts=dict(anchorPointX=0.5)),
        L('Txt_LV', 40, 470, 40, 20, '', 16, visible=False),
        L('Txt_LV_Label', 80, 470, 60, 20, '', 16, visible=False),
        P('MVP_Crown', 30, 230, 171, 42, [
            I('CrownIcon_Img', 33, 18, 56, 40, 'AvtInfo_CrownIcon4.png', s9=False),
            L('Crown_Label', 83, 12, 26, 26, '', 18),
            L('CrownNum_Label', 120, 15, 80, 33, '', 22)], visible=False),
        P('MVP_Trophy', 30, 100, 171, 42, [
            I('Trophy_Img', 27, 12, 56, 40, 'AvtInfo_trophyIcon4.png', s9=False),
            L('Trophy_Label', 71, 5, 23, 23, '', 18),
            L('TrophyNum_Label', 110, 8, 80, 33, '', 22)], visible=False),
        B('Party_Button', 120, 500, 230, 40, 'But01', 'Party', 20, label='Txt_PartyButton', opts=BUTS,
          visible=False)])),
    # Pagina 2 (Button_Change, FUN_008eb9a8): record del giocatore. Copia della pagina 1
    # (stesso avatar e anello) con il riquadro dei record: Scroll_Area (vi crea
    # RecordScrollView), Txt_Money/_Label, Txt_MoguPoint/_Label, Txt_LastLogin/_Label,
    # Txt_Timezone con _1/_2/_3_Label, Txt_Style/_Label.
    # Senza l'anello delle medaglie: con Area_Revolver anche qui FUN_008c19e4 riusa l'anello
    # della pagina 1 prima che abbia caricato DeckEdit_Revolver (crash, banco pf15)
    'AvatarInfo_Txt2.json': ('copy', 'AvatarInfo_Txt_ver340.json',
                             {'Area_Revolver': 'Area_Revolver_None', 'Area_RevolverPet': 'Area_RevolverPet_None'},
                             False, [
        ('add', 'Dummy', P('Record_Area', 20, 70, 300, 420, [
            I('Record_Base', 150, 210, 300, 420, 'Av_Panel1.png',
              opts=dict(scale9Enable=True, capInsetsX=40, capInsetsY=40, capInsetsWidth=1, capInsetsHeight=1)),
            P('Scroll_Area', 10, 10, 280, 200),
            L('Txt_Money', 20, 400, 130, 24, 'Munny', 18, opts=dict(anchorPointX=0)),
            L('Txt_Money_Label', 280, 400, 140, 24, '0', 18, opts=dict(anchorPointX=1)),
            L('Txt_MoguPoint', 20, 372, 130, 24, 'Moogle Points', 18, opts=dict(anchorPointX=0)),
            L('Txt_MoguPoint_Label', 280, 372, 140, 24, '0', 18, opts=dict(anchorPointX=1)),
            L('Txt_LastLogin', 20, 344, 130, 24, 'Last Login', 18, opts=dict(anchorPointX=0)),
            L('Txt_LastLogin_Label', 280, 344, 160, 24, '', 18, opts=dict(anchorPointX=1)),
            L('Txt_Timezone', 20, 316, 130, 24, 'Play Time', 18, opts=dict(anchorPointX=0)),
            L('Txt_Timezone_1_Label', 280, 316, 160, 24, '', 18, opts=dict(anchorPointX=1)),
            L('Txt_Timezone_2_Label', 280, 290, 160, 24, '', 18, opts=dict(anchorPointX=1)),
            L('Txt_Timezone_3_Label', 280, 264, 160, 24, '', 18, opts=dict(anchorPointX=1)),
            L('Txt_Style', 20, 236, 130, 24, 'Play Style', 18, opts=dict(anchorPointX=0)),
            L('Txt_Style_Label', 280, 236, 160, 24, '', 18, opts=dict(anchorPointX=1))]))]),
    # Name/Message (Button_B): stesso layout per la variante U13 (il codice usa
    # Txt_Comment_Label_U13 al posto del TextField)
    'AvatarInfo_Comment_ver132.json': ('func', 'avatar_comment_popup'),
    'AvatarInfo_Comment_U13_ver132.json': ('func', 'avatar_comment_popup'),
    # Play Style (Button_C, FUN_008deb84), assente dalle risorse. Aspetto da
    # reference\profile\profile_16.png (finestra x' 110-530, y' 10-355): «Play Time (Pacific
    # Time)», 6 fasce orarie su due righe, «Select up to 3.» giallo, «Play Style» con
    # Hardcore/Core/Casual, Cancel arancione (Button_Close/Txt_Cancel) e OK rosso. I pulsanti
    # sono But16 (218x52, blu; premuto = azzurro, la scelta): il codice non carica texture.
    'AvatarInfo_PlayStyle.json': ('build', P('PlayStyle_root', 0, 0, 960, 640, [
        I('Win_PlayStyle', 480, 315, 747, 613, 'Win04.png',
          opts=dict(scale9Enable=True, capInsetsX=50, capInsetsY=60, capInsetsWidth=1, capInsetsHeight=200)),
        L('Txt_PlayTime', 146, 592, 400, 30, 'Play Time', 24, opts=dict(anchorPointX=0, hAlignment=0)),
        # CheckBox (FUN_0125068c ne registra l'evento: con Button crash, banco ps2)
        *[C('Button_PlayTime_' + c, 258 + 222 * (k % 3), 519 - 94 * (k // 3), 218, 52, 'But16',
            [L('Txt_PlayTime_' + c, 0, 0, 208, 44, '', 22)]) for k, c in enumerate('ABCDEF')],
        L('Txt_Select', 480, 356, 500, 28, '', 22, opts=dict(colorR=255, colorG=230, colorB=60)),
        L('Txt_Setting', 700, 592, 200, 24, '', 18, visible=False),
        L('Txt_Num_Lavel', 820, 592, 80, 24, '', 18, visible=False),
        L('Txt_Style', 146, 254, 300, 30, 'Play Style', 24, opts=dict(anchorPointX=0, hAlignment=0)),
        *[C('Button_Style_' + c, 258 + 222 * k, 183, 218, 52, 'But16',
            [L('Txt_Style_' + c, 0, 0, 208, 44, '', 22)]) for k, c in enumerate('ABC')],
        B('Button_Close', 325, 66, 205, 62, 'But03', 'Cancel', 28, label='Txt_Cancel', opts=BUT9),
        B('Button_Ok', 633, 66, 205, 62, 'But01', 'OK', 28, label='Txt_OK', opts=BUT9)])),
    # Titles (Button_A, FUN_008db068): stessi nomi della versione offline originale
    # (Pre_Area per l'anteprima, AvTitleWin con Title A/B, Plate1/2, Button_Plate «Nameplate»)
    # Button_Ok e il separatore non li usa il codice (nessuna ricerca): nascosti, finestra
    # accorciata come in reference\profile\profile_11.png (finisce sotto «Nameplate»)
    'AvatarTitle_Base.json': ('copy', 'Offline_AvatarTitle_Base.json', {}, False, [
        ('opts', 'Button_Ok', dict(visible=False)),
        ('opts', 'Img_Separator', dict(visible=False)),
        ('opts', 'PopupNormal_04', dict(height=580, scale9Height=580)),
        ('opts', 'Close_Button', dict(y=279))]),
    # Avatar Boards, elenco (FUN_00cd1bb8): nessun layout Sphere* nelle risorse. Aspetto da
    # reference\avatar_boards\avatar_boards_list_01.jpg (2400x1080: x = (x'-390)/1,6875,
    # y = (1080-y')/1,6875) e ab_29-32.png (video 2017): carosello delle bacheche al centro,
    # in basso «Avatar Coins» (Coin, Txt_Coin_Title, Txt_Coin), nome della bacheca
    # (TitleBar, Txt_SphereBoard_Label), «Nodes 0 / 19» (Txt_Open con Txt_Num_Label e
    # Txt_Total_Label, stile della riga Lux del Profilo), Filter arancione (Button_Filter,
    # Txt_Filter) con il conteggio (Bar_Filter), avviso a destra (Txt_Caution). Il codice
    # cerca anche BG, BoardNone_txt, Img_Win_L/S, BoardDetail/DetailButton/Txt_Detail.
    'SphereBoardScene_ver310.json': ('scene', [('CenterUI', 'publish/SphereBoard_Gen.json'),
                                               ('LeftUI', 'publish/MedalSell_Back.json', 0, 576)]),
    'SphereBoard_Gen.json': ('build', P('sphere_board_root', 0, 0, 960, 640, [
        P('BG', 0, 0, 960, 640),
        L('BoardNone_txt', 480, 341, 600, 40, '', 26, visible=False),
        # carosello (FUN_00cd3868: SelectArea, frecce LeftUI_Arrow/RightUI_Arrow ai bordi come in
        # avatar_boards_list_01, x' 288 e 2106 -> x -60 e 1017)
        # posti delle carte (FUN_00cd78e8 li cerca dentro SelectArea, banco ab9): centrale e
        # laterali come in avatar_boards_list_01 (x' 1200/738/1662 -> 480/206/754)
        P('SelectArea', 0, 180, 960, 330, [
            P('LeftUI', 206, 140, 10, 10),
            P('RightUI', 754, 140, 10, 10),
            P('CenterUI', 480, 161, 10, 10)]),
        # il primo figlio diventa il bersaglio del pulsante (banco ab8): Panel con la freccia,
        # origine al centro come in SlideMedalInfo_Left/Right
        P('LeftUI_Arrow', -60, 341, 90, 160, [
            I('Arrow01', 0, 0, 56, 134, 'Medal_Syn_Arrow01.png', s9=False, scale=0.7)]),
        P('RightUI_Arrow', 1017, 341, 90, 160, [
            I('Arrow01', 0, 0, 56, 134, 'Medal_Syn_Arrow01.png', s9=False, scale=0.7, flipX=True)]),
        # costo della bacheca sotto la carta centrale (grande) e le laterali (piccola): il codice
        # cerca Txt_Coin e Txt_Coin_Title dentro Img_Win_L (banco ab4); riferimento: targa scura
        # con l'icona e «200» sotto la carta (x' 1200, y' 700 -> 480, 225)
        I('Img_Win_S', 480, 225, 200, 36, 'Plate02.png', opts=PLATE3, visible=False),
        I('Img_Win_L', 480, 225, 200, 36, 'Plate02.png', opts=PLATE3, children=[
            I('Win_Coin_Icon', 20, 18, 90, 90, 'IncentiveIcon_14.png', s9=False, scale=0.35),
            L('Txt_Coin_Title', 60, 18, 80, 24, '', 18, visible=False),
            L('Txt_Coin', 180, 18, 120, 30, '0', 26, opts=dict(anchorPointX=1, hAlignment=2))]),
        # riquadro «Avatar Coins» in basso a sinistra (FUN_00cd3868: Txt_Coin_Name_Label,
        # Txt_Coin_Label)
        # riquadro con la linguetta del titolo (Av_Panel1 di make_textures): Win04 in 9-slice non
        # scende sotto ~300 px di altezza (banco ab11)
        I('Coin', 92, 88, 177, 80, 'Av_Panel1.png',
          opts=dict(scale9Enable=True, capInsetsX=40, capInsetsY=30, capInsetsWidth=1, capInsetsHeight=38), children=[
              # icona della valuta: FUN_00cd468c -> FUN_00755ab8 (banco ab10)
              I('SpherePointIcon', -67, 15, 90, 90, 'IncentiveIcon_14.png', s9=False, scale=0.3),
              L('Txt_Coin_Name_Label', 10, 15, 130, 26, 'Avatar Coins', 18),
              I('Coin_Base', 0, -17, 160, 24, 'Plate02.png', opts=PLATE3),
              L('Txt_Coin_Label', 70, -17, 120, 24, '0', 22, opts=dict(anchorPointX=1, hAlignment=2))]),
        I('TitleBar', 480, 92, 583, 50, 'Plate13.png',
          opts=dict(scale9Enable=True, capInsetsX=60, capInsetsY=10, capInsetsWidth=1, capInsetsHeight=1), children=[
              L('Txt_SphereBoard_Label', 0, 0, 540, 36, '', 26)]),
        I('Nodes_Base', 480, 32, 278, 30, 'Plate02.png', opts=PLATE3, children=[
            I('Nodes_Tab', -84, 0, 110, 26, 'Plate01.png', s9=False)]),
        L('Txt_Open', 396, 32, 100, 26, 'Nodes', 20, children=[
            L('Txt_Num_Label', 130, 0, 60, 30, '0', 26, opts=dict(colorR=255, colorG=230, colorB=60)),
            L('Txt_Slash', 165, 0, 20, 30, '/', 24),
            L('Txt_Total_Label', 200, 0, 60, 30, '0', 26)]),
        P('Bar_Filter', 810, 30, 115, 30, [
            # «54/54» (bacheche mostrate / totali): stessi nomi della riga Nodes (banco ab5)
            I('Bar_Filter_Base', 57, 15, 115, 28, 'Plate02.png', opts=PLATE3),
            L('Txt_Num_Label', 40, 15, 50, 28, '0', 24, opts=dict(anchorPointX=1, hAlignment=2, colorR=255,
                                                                     colorG=230, colorB=60)),
            L('Txt_Filter_Slash', 48, 15, 16, 28, '/', 22),
            L('Txt_Total_Label', 56, 15, 50, 28, '0', 22, opts=dict(anchorPointX=0, hAlignment=0))]),
        B('Button_Filter', 864, 96, 233, 68, 'But03', 'Filter', 30, label='Txt_Filter', opts=BUTS),
        L('Txt_Caution', 950, 168, 400, 26, '', 18, opts=dict(anchorPointX=1, hAlignment=2)),
        P('BoardDetail', 0, 0, 10, 10, [
            B('DetailButton', 480, 180, 200, 52, 'But16', 'Details', 22, label='Txt_Detail', opts=BUT9,
              visible=False)])])),
    # Carta del carosello (FUN_0088ab7c la carica, FUN_00cd7f78 la riempie): Select_Base
    # (fondo, Board_0001 306x306: l'unica carta rimasta nelle risorse, grigio-azzurra come nei
    # fotogrammi del 2017), Select_Board (img/sphere_board/Board_%04d) e Select_Kind
    # (img/sphere_kind/Kind_%04d, il segno del genere in alto a destra: Kind_0001)
    'SphereBoard_Select_Icon_ver130.json': ('build', P('Select_Icon', 0, 0, 306, 306, [
        I('Select_Base', 153, 153, 306, 306, 'Board_0001.png', s9=False),
        I('Select_Board', 153, 153, 306, 306, 'Board_0001.png', s9=False),
        I('Select_Kind', 153, 153, 306, 306, 'Kind_0001.png', s9=False),
        L('Count_Label', 153, 30, 200, 30, '', 22, visible=False)])),
    # Bacheca (SceneSphereBoard, FUN_00ce3e64; specifica in stage_gen\boards\LAYOUT.md): il
    # codice cerca G11..G59 (5 righe x 9 colonne, tutte obbligatorie, riga 1 in alto; il nodo
    # va al centro della cella), Grid/Grid_R/Info/LeftUI (animazioni di entrata e uscita, il
    # primo figlio da' la distanza), carta (Select_*), monete, premio, Button e Button_All con
    # il proprio Txt_Release. Misure dagli screenshot del 2017 (reference ab_29-33, bacheca 63)
    'SphereScene_ver310.json': ('scene', [('Grid', 'publish/SphereScene_Grid.json'),
                                          ('Grid_R', 'publish/SphereScene_GridR.json'),
                                          ('Info', 'publish/SphereScene_Info.json'),
                                          ('LeftUI', 'publish/MedalSell_Back.json', 0, 576)]),
    'SphereScene_Grid.json': ('build', P('sphere_grid_root', 0, 0, 960, 640, [
        P('Grid_Area', 0, 0, 960, 640, [
            P('G%d%d' % (r + 1, c + 1), 75 + 101 * c - 50, 454 - 78 * r - 39, 101, 78)
            for r in range(5) for c in range(9)])])),
    'SphereScene_GridR.json': ('build', P('sphere_gridr_root', 0, 0, 960, 640, [
        P('Grid_R_Area', 0, 0, 10, 10)])),
    'SphereScene_Info.json': ('build', P('sphere_info_root', 0, 0, 960, 640, [
        P('Info_Area', 0, 0, 960, 640, [
            I('Txt_SphereBoard_Plate', 113, 505, 220, 36, 'Plate13.png',
              opts=dict(scale9Enable=True, capInsetsX=60, capInsetsY=10, capInsetsWidth=1, capInsetsHeight=1)),
            L('Txt_SphereBoard_Label', 113, 505, 210, 30, '', 22),
            I('Select_Board', 120, 408, 306, 306, 'Board_0001.png', s9=False, scale=0.5),
            I('Select_Base', 120, 408, 306, 306, 'Board_0001.png', s9=False, scale=0.5),
            I('Select_Kind', 120, 408, 306, 306, 'Kind_0001.png', s9=False, scale=0.5),
            I('Coin', 91, 47, 174, 75, 'Av_Panel1.png',
              opts=dict(scale9Enable=True, capInsetsX=40, capInsetsY=30, capInsetsWidth=1, capInsetsHeight=38), children=[
                  *[I(n, -62, 16, 90, 90, 'IncentiveIcon_14.png', s9=False, scale=0.3, visible=(n == 'SpherePointIcon'))
                    for n in ('SpherePointIcon', 'SpherePointIcon_OC', 'SpherePointIcon_EV', 'SpherePointIcon_Raid',
                              'SpherePointIcon_SP')],
                  L('Txt_Coin_Name_Label', 10, 16, 130, 24, 'Avatar Coins', 18),
                  I('Coin_Base', 0, -19, 160, 26, 'Plate02.png', opts=PLATE3),
                  L('Txt_Coin_Label', 70, -19, 120, 26, '0', 22, opts=dict(anchorPointX=1, hAlignment=2))]),
            I('Incentive_Bar', 573, 46, 765, 80, 'Av_Panel1.png',
              opts=dict(scale9Enable=True, capInsetsX=40, capInsetsY=30, capInsetsWidth=1, capInsetsHeight=38)),
            L('Txt_Incentive_Label', 298, 44, 150, 30, '', 20),
            I('Incentive_Name_Base', 613, 44, 435, 42, 'Plate02.png', opts=PLATE3),
            L('Txt_Incentive_Name_Label', 613, 44, 420, 32, '', 20),
            B('Button', 890, 45, 111, 62, 'But03', 'Unlock', 24, label='Txt_Release', opts=BUT9),
            B('Button_All', 890, 120, 111, 52, 'But16', 'Unlock All', 20, label='Txt_Release', opts=BUT9)])])),
    # nodo della bacheca (FUN_00f36f18, posto a (-50,-50) sul nodo): Get (spunta, nascosta
    # all'inizio), Txt_Incentive_Label, Txt_Price_Label (costo in monete)
    'Sphere_Incentive.json': ('build', P('Sphere_Incentive', 0, 0, 100, 100, [
        I('Get', 50, 55, 62, 51, 'Kind_0001.png', s9=False, scale=0.2, visible=False),
        L('Txt_Incentive_Label', 50, 20, 100, 20, '', 14, visible=False),
        L('Txt_Price_Label', 90, 67, 50, 24, '0', 20)])),
    # Missioni (pulsante a pergamena della home, FUN_00a8a8d8 / FUN_00a8ad3c / FUN_00a8c100):
    # nessun layout ne' riferimento visivo trovato (annotato in HANDOFF). Finestra nello stile
    # dei popup KHUX: schede tab1..tab4 in alto (MyMission_Category, GroupIcon, Icon_Crown),
    # elenco Scroll_Area, «Stock» (Txt_Stock con Txt_Stock_Num_Label / Txt_Stock_All_Label),
    # «Receive All» (Button/Txt_ReceiveAll), Mask_Area/Mask/Txt_Warning, Txt_None,
    # Cautio_Panel/Txt, Close_Button
    'MyPageMission_Base_ver320.json': ('build', P('mission_root', 0, 0, 960, 640, [
        I('Win_Mission', 480, 300, 900, 560, 'Win04.png',
          opts=dict(scale9Enable=True, capInsetsX=50, capInsetsY=60, capInsetsWidth=1, capInsetsHeight=200)),
        *[I('tab%d' % k, 150 + 170 * (k - 1), 555, 160, 48, 'Plate01.png', s9=False, children=[
            L('Txt_Tab', 0, 0, 150, 40, '', 20),
            L('MyMission_Category', 0, 0, 150, 40, '', 20, visible=False),
            I('GroupIcon', -60, 0, 40, 40, 'Plate01.png', s9=False, visible=False),
            I('Icon_Crown', 60, 18, 56, 40, 'AvtInfo_CrownIcon4.png', s9=False, scale=0.6, visible=False),
            I('Icon_New', 60, 22, 69, 30, 'Deck_Medal_New.png', s9=False, scale=0.6, visible=False)])
          for k in range(1, 5)],
        I('Grid_Mission', 480, 290, 860, 410, 'Panel04.png', opts=GRID),
        P('Scroll_Area', 55, 90, 850, 400),
        L('Txt_None', 480, 290, 600, 40, '', 24, visible=False),
        P('Stock', 60, 40, 300, 40, [
            L('Txt_Stock', 0, 20, 140, 30, '', 20, opts=dict(anchorPointX=0, hAlignment=0)),
            L('Txt_Stock_Num_Label', 180, 20, 50, 30, '0', 22, opts=dict(anchorPointX=1, hAlignment=2)),
            L('Txt_Stock_Slash', 190, 20, 20, 30, '/', 22),
            L('Txt_Stock_All_Label', 200, 20, 60, 30, '0', 22, opts=dict(anchorPointX=0, hAlignment=0))]),
        B('Button', 760, 60, 233, 68, 'But01', '', 28, label='Txt_ReceiveAll', opts=BUTS),
        P('Mask_Area', 30, 20, 900, 560, [
            P('Mask', 0, 0, 900, 560),
            L('Txt_Warning', 450, 280, 700, 60, '', 22)], visible=False),
        P('Cautio_Panel', 30, 500, 900, 30, [L('Txt', 450, 15, 860, 26, '', 18)], visible=False),
        B('Close_Button', 920, 570, 64, 64, 'But_Close', None)])),
    # «Other» del menu (FUN_009ec518): vedi other_menu
    'MenuDialog_ver300.json': ('func', 'other_menu'),
    'TresCommu_CommunicationUser.json': ('build', P('commu_user', 0, 0, 200, 200)),
    'TresCommu_CommunicationOther.json': ('build', P('commu_other', 0, 0, 200, 200)),
    # Esito (FUN_006f4918): popup OK originale, il messaggio e' Txt_Sell_Ok1. Come nel
    # popup originale (reference\material_sell\complete_thumb.png): «Complete!» in alto,
    # targhe dei guadagni al centro, OK in basso.
    'PopupNormal_MedalSell_Ok_ver350.json': ('copy', 'PopupNormal_Text_34_4Line_Ok.json',
                                             {'4Line_Label': 'Txt_Sell_Ok1'}, False,
                                             [('text', 'Txt_Sell_Ok1', ''),
                                              ('opts', 'Txt_Sell_Ok1', dict(y=112, height=40))]
                                             + obtain_plates(480, 325)),
    # Dettaglio medaglia da Medal List: FUN_00aba238 carica SlideMedalInfoScene_ver341 sopra
    # MedalInfoScene e aggiunge un pulsante al primo figlio di LeftUI e di RightUI (medaglia
    # precedente / successiva). Frecce come MedalInfo_Arrow01.json (Medal_Syn_Arrow01 punta a sinistra).
    # Il pulsante (FUN_008d6230) accetta i tocchi in un rettangolo grande quanto il pannello
    # ma centrato sulla sua origine (angolo in basso a sinistra): l'origine sta quindi al
    # centro della freccia, e la freccia in (0,0).
    # Layout originali con i testi in giapponese: copie tradotte che sostituiscono
    # l'originale (resource_merge.py --last-wins). Conferma di Unequip nel dettaglio di
    # una medaglia equipaggiata (il pulsante prende il testo da text/ui/106180101).
    # Dopo Evolve il client riapre MedalInfoScene_ver320 come risultato (FUN_00cc600c) e cerca
    # Panel_MixResult_Area nel layout R1, che l'ha solo la variante R3: crash. Si aggiungono
    # all'R1 originale i due pannelli vuoti dell'R3 (sostituzione, --last-wins).
    'MedalInfo_Information_R1.json': ('copy', 'MedalInfo_Information_R1.json', {}, False, [
        P('Panel_MixResult_Area', 486, 50, 562, 300),
        P('Tap_Screen_Area', 480, 15, 1, 1)]),
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
        I('Arrow_Evo', 233, 379, 113, 170, 'Medal_Evo_Arrow01.png', s9=False, scale=0.9),
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
        I('Base_Money1', 295, 64, 270, 25, 'Plate03.png', opts=PLATE3, children=[
            L('Txt_Money', -82, 0, 85, 24, 'Required', 16),
            I('Icon_Money', -25, 0, 30, 30, 'Icon_Prize.png', scale=0.5, s9=False),
            L('Txt_Money_Label', 66, 0, 138, 24, '0', 18)]),
        I('Base_Money2', 295, 34, 270, 25, 'Plate03.png', opts=PLATE3, children=[
            L('Txt_Money', -82, 0, 85, 24, 'Munny', 16),
            I('Icon_Money', -25, 0, 30, 30, 'Icon_Prize.png', scale=0.5, s9=False),
            L('Txt_Money_Label', 66, 0, 138, 24, '0', 18)]),
        I('Button_Sell1', 491, 49, 119, 58, 'But06_Off.png', children=[
            L('Txt_Sell1', 0, 2, 110, 54, 'Sell Medals', 20)]),
        L('Txt_Wording', 770, 48, 380, 30, '', 18)])),
    # Materiale richiesto da Evolve (FUN_00cc57e0, riempito da FUN_00cc5a80): in Medal_S il
    # codice aggiunge l'icona (medalView) e lo ridimensiona; Possession e' un contenitore con
    # Label_9 (testo 101399490) e Num_Label (quantita' posseduta), entrambe con ombra
    # (FUN_006e418c: crash se mancano). L'icona (medalView) ha sotto la sua targhetta scura
    # del livello, vuota: come nell'originale «Held N» ci sta sopra (centro dell'icona a
    # (55,95) del pannello, targhetta a y=40, misurati sul banco). Dietro, il cerchio dello
    # slot del Level Up (Medal_Syn_Panel).
    'MedalInfo_Evo_Medal.json': ('build', P('Panel_Evo_Medal', 0, 0, 104, 150, [
        I('Slot_Ring', 55, 95, 146, 147, 'Medal_Syn_Panel.png', scale=0.72),
        P('Medal_S', 2, 22, 100, 96),
        P('Possession', 5, 30, 100, 20, [
            L('Label_9', 26, 10, 60, 20, 'Held', 15),
            L('Num_Label', 78, 10, 30, 20, '0', 15)])])),
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
    # movimento Animation1; FUN_00883118 lo mostra sulle celle scelte). Nell'originale e' un
    # riquadro bianco arrotondato (reference\medal_list\web_reddit_sell_playingcard.jpg):
    # la cornice bianca con alone del Partner (Deck_Partner_Plate_Cursor 346x122) ricomposta
    # in 9-slice con 8 ossa (frame_armature), 140x176 centrata come il vecchio bagliore.
    # Il client legge solo i plist che esistono gia' nelle risorse originali (provato: un plist
    # con un nome nuovo non si carica, anche identico all'originale). Il nostro sostituisce
    # quello di EquipmentBGAction, armatura che il codice non cita mai (resource_merge
    # --last-wins).
    'Cursor_Anim_MedalSell.ExportJson': ('frame', 'Cursor_Anim_MedalSell', 'Cursor_Anim_Partner0.png',
                                         (346, 122), 40, 140, 176, (2, 9), 'EquipmentBGAction0.plist'),
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
    # Moogle Shop, testi aggiunti con i trait a Munny (4.1.0, assenti anche dall'IPA 4.4.0):
    # Txt_Munnies accanto ai Munny posseduti (0xe0e7e4; nel video JP «所持マニー») e la
    # conferma del trait (0xe14394, «マニー5000000を消費して覚醒能力をつけます。»),
    # sul modello del testo a jewel 106220409
    106260102: 'Munny',
    106260101: 'Setting this trait will cost <important>${1:%d}</important> Munny.',
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

# File gia' presenti nelle risorse sotto un altro percorso, copiati (estratti con res_get.py in
# <cartella layout estratti>) dove il client li cerca: destinazione -> sorgente.
#  - img/ui/<pulsante>_On/_Off/_Disable: i pulsanti di FUN_008d56f8 caricano
#    «img/ui/%s_On.png» al tocco (FUN_008d6230); 46 varianti esistono solo in
#    cocostudio/publish (es. But06_On: crash toccando «Sell Medals» in Evolve e Level Up);
#  - icone delle valute (img/incentive/IncentiveIcon_NN: 02 jewel, 04 munny, 14 Avatar
#    Coin) accanto ai layout, per gli ImageView della vendita.
COPIES = {'cocostudio/publish/' + n: 'img/incentive/' + n
          for n in ('IncentiveIcon_02.png', 'IncentiveIcon_04.png', 'IncentiveIcon_14.png')}
# icone che il popup Sort/Filter (PopupNormal_SortButton_ver350) cerca accanto ai layout ma
# che esistono solo sotto img/: Guilt 2-8 (img/ui/guilt) e risvegli (img/kakusei)
COPIES.update({PUB + 'MedalInfo_Guilt%d.png' % i: 'img/ui/guilt/MedalInfo_Guilt%d.png' % i for i in range(2, 9)})
# «Exchange» del Moogle Shop: al tocco il pulsante carica img/ui/But30_On/Off (assenti:
# crash, stack mg9); rosso come nell'originale (moogle_shop_01.png) = But01
COPIES.update({'img/ui/But30_%s.png' % s: PUB + 'But01_%s.png' % s for s in ('Off', 'On')})
COPIES.update({PUB + 'Kakusei_Icon%s.png' % n: 'img/kakusei/Kakusei_Icon%s.png' % n
               for n in ('0010', '0030', '0040', '0050', '0060', '0061', '0070', '0080')})
# Moogle Shop: l'animazione del moogle (lwf/mogshop/mog_wait) non esiste; LWF vuoto come
# per gli NPC e il pet (FUN_011f9fc4 restituisce NULL se manca: crash)
_EMPTY_LWF = os.path.join(OUT, 'lwf', 'character', 'npc', '2000', 'wait', 'wait.lwf')
if os.path.exists(_EMPTY_LWF):
    os.makedirs(os.path.join(OUT, 'lwf', 'mogshop', 'mog_wait'), exist_ok=True)
    shutil.copyfile(_EMPTY_LWF, os.path.join(OUT, 'lwf', 'mogshop', 'mog_wait', 'mog_wait.lwf'))
# Animazione del risultato di Evolve (FUN_00ccbad8: lwf/medal/compose/evolution/
# card_evolution_result_%02d, %02d = numero dei materiali): assente da ogni risorsa, il
# client va in crash dopo la risposta. Copia di quella del Level Up (card_strength_result_01)
# con LWF e texture rinominati (il nome delle texture comincia col nome del file LWF).
_LU = 'lwf/medal/compose/strength/card_strength_result_01/'
if os.path.isdir(os.path.join(SRC, *_LU.split('/'))):
    for _n in range(1, 6):
        _ev = 'card_evolution_result_%02d' % _n
        for _f in os.listdir(os.path.join(SRC, *_LU.split('/'))):
            COPIES['lwf/medal/compose/evolution/%s/%s' % (_ev, _f.replace('card_strength_result_01', _ev))] = _LU + _f
for _f in os.listdir(os.path.join(SRC, *PUB.split('/'))):
    if _f.startswith('But') and _f.endswith(('_On.png', '_Off.png', '_Disable.png')):
        COPIES.setdefault('img/ui/' + _f, PUB + _f)
TEXTURES |= {k.split('/')[-1] for k in COPIES if k.startswith(PUB)}
# texture disegnate da make_textures.py in cocostudio/publish (es. rare_star.png)
TEXTURES |= set(re.findall(r"save\('([^'/]+\.png)'",
                           open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_textures.py'),
                                encoding='utf-8').read()))


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
# CheckBox: dal popup Sort originale (filtri: But16 con la croce But16_On)
_collect(json.load(open(os.path.join(SRC, *PUB.split('/'), 'PopupNormal_SortButton_ver320.json'),
                        encoding='utf-8-sig'))['widgetTree'])
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
    if 's9' in s:                       # False per le icone: il modello ha il 9-slice (bordo 50)
        o['scale9Enable'] = s['s9']
    o.update(s.get('opts', {}))         # opzioni come nei layout originali (es. capInsetsX)
    if 'ignoreSize' in s:               # False: la texture caricata dal codice si adatta a w x h
        o['ignoreSize'] = s['ignoreSize']
    w['name'] = s['name']
    if s['cls'] == 'ImageView':
        o.update(fileNameData=tex(s['tex']), scale9Width=s['w'], scale9Height=s['h'])
        if s.get('flipX'):
            o['flipX'] = True
    elif s['cls'] == 'Button' and s['tex'] == 'But_Close':
        # X tonda di chiusura (But_CloseA/B, senza le varianti _Off/_On)
        o.update(normalData=tex('But_CloseA.png'), pressedData=tex('But_CloseB.png'),
                 disabledData=tex('But_CloseA.png'), scale9Enable=False, text='')
    elif s['cls'] == 'Button':
        base = s['tex']
        for key, suf in (('normalData', '_Off'), ('pressedData', '_On'), ('disabledData', '_Disable')):
            p = base + suf + '.png'
            o[key] = tex(p) if p in TEXTURES else (tex(base + '_Off.png') if key != 'normalData' else tex(p))
        o.update(scale9Width=s['w'], scale9Height=s['h'], text='')
    elif s['cls'] == 'CheckBox':
        # come i filtri del popup Sort: sfondo <base>_Off, scelta <base>_On (sfondo e croce)
        base = s['tex']
        dis = base + '_Disable.png'
        o.update(backGroundBoxData=tex(base + '_Off.png'), backGroundBoxSelectedData=tex(base + '_On.png'),
                 frontCrossData=tex(base + '_On.png'),
                 backGroundBoxDisabledData=tex(dis if dis in TEXTURES else base + '_Off.png'),
                 frontCrossDisabledData={'path': None, 'plistFile': None, 'resourceType': 0},
                 selectedState=False)
    elif s['cls'] == 'Label':
        o.update(text=s.get('text', ''), fontSize=s.get('size', 22), areaWidth=s['w'], areaHeight=s['h'])
    elif s['cls'] == 'Panel':
        o.update(touchAble=False)
    return w


def sell_popup(icon='MedalSellIcon', name='Txt_Medal_Name_Dlog', extra=(), icon_pos=(-172, 225, 1.5)):
    """Popup della quantita' da vendere: EquipSell_Medal_Step1_ver131 (medaglie impilate,
    FUN_00883f38) ed EquipSell_Dialog_Step1 (materiali, FUN_00c5f788). Assenti da ogni
    risorsa. Struttura dal discendente di Dark Road dark_Shop_win_check_pop3 (stessi
    panel_MaterialStock, Button_stock_up/down, Slider MaterialStock_bar); aspetto e misure
    dal popup originale (reference\\medal_list\\web_qty_368.png, youtube WiFh447niJY,
    video 1280x608, scala 1,12 in x e 0,95 in y): finestra blu, icona e targa del nome
    in alto, fascia «Includes ★★★ Medals or higher.» (Warning_Plate, Txt_Rare1/2),
    «Quantity» (Txt_data2, testo 102000001) e «1/15» (Txt_data3), slider in un riquadro
    scuro con le frecce, targa Munny (Txt_MoneyTotalStock_Fix, Icon_Prize2, Txt_data5),
    Cancel arancione e Sell rosso. Figli della finestra (ImageView) rispetto al centro."""
    d = json.load(open(os.path.join(SRC, *PUB.split('/'), 'dark_Shop_win_check_pop3.json'), encoding='utf-8-sig'))
    t = d['widgetTree']
    win = find(t, 'win_normaltext')
    # Win04 (100x322) in 9-slice anche in verticale: con capInsetsY 0 la fascia chiara in alto
    # veniva stirata su meta' finestra
    win['options'].update(fileNameData=tex('Win04.png'), scale9Enable=True, capInsetsX=50, capInsetsY=60,
                          capInsetsWidth=1, capInsetsHeight=200, width=640, height=560, scale9Width=640,
                          scale9Height=560)
    keep = []
    for c in win['children']:
        n = c['options']['name']
        if n in ('but_ok', 'but_close'):
            ok = n == 'but_ok'
            o = c['options']
            o.update(name='Button_sell_ok' if ok else 'Button_cancel', x=132 if ok else -133, y=-235,
                     normalData=tex('But01_Off.png' if ok else 'But03_Off.png'),
                     pressedData=tex('But01_On.png' if ok else 'But03_On.png'),
                     disabledData=tex('But01_Disable.png' if ok else 'But03_Off.png'),
                     width=172, height=56, scale9Width=172, scale9Height=56, **BUT9)
            c['name'] = o['name']
            lab = c['children'][0]
            lab['options'].update(name='Txt_sell_ok' if ok else 'Txt_cancel', fontSize=24,
                                  text='Sell' if ok else 'Cancel')
            lab['name'] = lab['options']['name']
        elif n == 'panel_MaterialStock':
            c['options'].update(x=-16, y=-34)
            for b, x in (('Button_stock_up', 232), ('Button_stock_down', -232)):
                find(c, b)['options']['x'] = x
            back = find(c, 'MaterialStock_back')['options']
            back.update(width=353, scale9Width=353)
            bar = find(c, 'MaterialStock_bar')['options']
            # barra semplice (senza MIN/MAX di Opt_Vol_Gage), pallino blu delle opzioni
            bar.update(ballNormalData=tex('Scroll_bar_off.png'), ballPressedData=tex('Scroll_bar_on.png'),
                       width=353)
        else:
            continue                        # txt_wording, But_draw, txt_possessed, assets: non usati
        keep.append(c)
    win['children'] = keep
    head = [
        # riquadro scuro dello slider, dietro panel_MaterialStock
        I('Slider_Base', -16, -34, 576, 154, 'Panel04.png', opts=GRID),
        # nomi composti a pezzi sullo stack, non trovati da widget_lookup.py (func_strings.py)
        I(icon, icon_pos[0], icon_pos[1], 89, 109, 'Medal_S_00000001.png', s9=False, scale=icon_pos[2]),
        I('Name_Plate', 37, 187, 360, 36, 'Plate03.png', opts=PLATE3),
        L(name, 37, 187, 330, 32, '', 22),
        L('Txt_data2', -239, 62, 200, 34, 'Quantity', 26),
        # «1/15» come nell'originale: il codice scrive la quantita' scelta in
        # Txt_MaterialStock_Fix_2 e il massimo in _3 (banco); Txt_data3 non lo tocca: e' la barra
        L('Txt_MaterialStock_Fix_2', -20, 62, 80, 40, '1', 32),
        L('Txt_data3', 13, 62, 30, 40, '/', 32),
        L('Txt_MaterialStock_Fix_3', 48, 62, 80, 40, '1', 32),
        I('Money_Plate', 105, -166, 366, 30, 'Plate03.png', opts=PLATE3),
        # il codice scrive il ricavo in Txt_MoneyTotalStock_Fix e «Munny» in Txt_data5 (banco)
        L('Txt_data5', -15, -166, 120, 28, 'Munny', 20),
        I('Icon_Prize2', 75, -166, 44, 46, 'Icon_Prize.png', s9=False, scale=0.5),
        L('Txt_MoneyTotalStock_Fix', 205, -166, 160, 30, '0', 22, opts=dict(colorB=0)),
        # fascia rossa «Includes ★★★ Medals or higher.» (reference\medal_list\web_qty_368.png:
        # rosso 233,18,38 con i bordi 255,2,0, testo bianco, stelle d'oro fisse nel layout).
        # Il codice cerca Txt_Rare1/2 dentro Warning_Plate e ne chiama solo setVisible (rari > 2):
        # Panel senza tinta, altrimenti il colore passa ai testi
        P('Warning_Plate', -304, 98, 576, 34, [
            P('Warning_Base', 0, 3, 576, 28, opts=RED_BG),
            P('Warning_Top', 0, 31, 576, 3, opts=dict(RED_BG, bgColorG=2, bgColorB=0, bgColorR=255)),
            P('Warning_Bottom', 0, 0, 576, 3, opts=dict(RED_BG, bgColorG=2, bgColorB=0, bgColorR=255)),
            L('Txt_Rare1', 150, 17, 160, 28, 'Includes', 22),
            I('Rare_Star1', 228, 17, 26, 26, 'rare_star.png', s9=False, scale=1.5),
            I('Rare_Star2', 260, 17, 26, 26, 'rare_star.png', s9=False, scale=1.5),
            I('Rare_Star3', 292, 17, 26, 26, 'rare_star.png', s9=False, scale=1.5),
            L('Txt_Rare2', 450, 17, 260, 28, 'Medals or higher.', 22)], visible=False),
    ]
    win['children'] = [build(head[0])] + win['children'] + [build(s) for s in head[1:] + list(extra)]
    return d


def equip_sell_popup():
    return sell_popup(extra=[
        # nome con uno spazio ideografico in coda (U+3000), come lo cerca il codice
        # (0x884688: "Txt_data" + 34 e3 80 80): senza, crash in enableShadow; testo 102000002 = " "
        L('Txt_data4　', 13, 30, 300, 24, '', 18)])


def material_sell_popup():
    """EquipSell_Dialog_Step1 (FUN_00c5f788): come il popup delle medaglie, con
    MaterialSellIcon (img/material/material_%d.png), Txt_Material_Name_Dlog,
    Txt_Material_Info_Dlog, Txt_MoneyStock_Fix e Txt_data1."""
    # icona dei materiali (img/material, ~60 px) meno ingrandita di quella delle medaglie;
    # prezzo unitario nel riquadro dello slider: «Price» (Txt_data1), icona, valore in giallo
    # (Txt_MoneyStock_Fix)
    return sell_popup('MaterialSellIcon', 'Txt_Material_Name_Dlog', icon_pos=(-200, 200, 1.1), extra=[
        L('Txt_Material_Info_Dlog', 37, 135, 500, 40, '', 18),
        L('Txt_data1', -90, 20, 120, 26, '', 20),
        I('Icon_Price', -10, 20, 44, 46, 'Icon_Prize.png', s9=False, scale=0.45),
        L('Txt_MoneyStock_Fix', 70, 20, 120, 26, '', 20, opts=dict(colorR=255, colorG=230, colorB=60)),
        # cercato anche qui (stack al crash); la variante con U+3000 delle medaglie per sicurezza
        L('Txt_data4', 13, 30, 300, 24, '', 18),
        L('Txt_data4　', 13, 30, 300, 24, '', 18)])


def trait_medal_select_popup():
    """MoogleShop_Traits_MedalSelect_Pop_ver410 (FUN_00e103f4), assente da ogni risorsa.
    Disposizione dal video della 4.1.0 giapponese (reference\\moogle_shop\\jp410_136.png,
    1280x720: x = x'/1,127 - 88, y = (720 - y')/1,127): a sinistra la targa del trait
    (SkillPanel: kakusei_Icon, Txt_KakuseiSkill), la medaglia scelta (MedalArea: il codice
    vi aggiunge la medaglia grande, FUN_00ab5454), i trait della medaglia
    (KakuseiSkill_Window, riempita da FUN_00e12838) o, senza medaglia, Win_Base con
    Txt_Traits_Text (testo 106220418), in basso il prezzo (Jewel/Txt_Jewel o
    Munnies/Txt_Munnies secondo payType) e Button_OK/Txt_OK (106220407 «Set Trait»); a
    destra Win_under: Scroll_Area (griglia delle medaglie, FUN_0091d10c), Txt_Possession
    (101510001 «Slots»), Txt_Cost_Label/Txt_Slash_Label/Txt_CostMax_Label e la barra di
    ordinamento (FUN_00760c64: Button_Sort, Txt_Sort_Label, Txt_Filter_On); Arrow01 tra le
    due finestre e Close_Button in alto a destra."""
    win = dict(scale9Enable=True, capInsetsX=50, capInsetsY=60, capInsetsWidth=1, capInsetsHeight=200)
    root = build(P('Panel_MedalSelect', 0, 0, 960, 640, [
        I('Win_Left', 283, 314, 556, 614, 'Win04.png', opts=win),
        I('Win_Right', 758, 314, 390, 614, 'Win04.png', opts=win),
        I('SkillPanel', 180, 584, 330, 36, 'Plate25.png',
          opts=dict(scale9Enable=True, capInsetsX=32, capInsetsY=0, capInsetsWidth=1, capInsetsHeight=1), children=[
              I('kakusei_Icon', -140, 0, 48, 48, 'Kakusei_Icon0010.png', s9=False, scale=0.75),
              L('Txt_KakuseiSkill', -110, 0, 260, 24, '', 20, opts=dict(anchorPointX=0))]),
        # FUN_00ab567c cerca Medal1 dentro MedalArea e vi aggiunge la medaglia (FUN_008cead4)
        # senza controlli: senza, crash al tocco di «Select Medal» (stack ts3). La medaglia
        # vuota (nessuna scelta) ha il centro 88 px sopra e a destra di Medal1 (banco): la
        # medaglia e' 176x176 con l'angolo in basso a sinistra sull'origine di Medal1, e
        # Medal1 ha la stessa misura (bersaglio del trascinamento, FUN_00ab60c0)
        P('MedalArea', 115, 272, 160, 180, [P('Medal1', 80, 90, 176, 176)]),
        # stessa cornice e misura di KakuseiSkill_Window a uno slot (bordo superiore a 372),
        # che la copre del tutto quando si sceglie una medaglia (il codice non la nasconde)
        I('Win_Base', 282, 315, 464, 114, 'Medal_Detail_Field2.png',
          opts=dict(scale9Enable=True, capInsetsX=240, capInsetsY=60, capInsetsWidth=1, capInsetsHeight=1),
          children=[L('Txt_Traits_Text', 0, -14, 420, 50, '', 22)]),
        P('Jewel', 25, 24, 230, 36, [
            I('Plate_Jewel', 115, 18, 230, 32, 'Plate03.png', opts=PLATE3),
            I('Icon_Jewel', 28, 18, 90, 90, 'IncentiveIcon_02.png', s9=False, scale=0.4),
            L('Txt_Jewel', 215, 18, 160, 30, '0', 24, opts=dict(anchorPointX=1))]),
        P('Munnies', 25, 24, 230, 36, [
            I('Plate_Munnies', 115, 18, 230, 32, 'Plate03.png', opts=PLATE3),
            I('Icon_Munnies', 28, 18, 56, 57, 'IncentiveIcon_04.png', s9=False, scale=0.6),
            L('Txt_Munnies', 215, 18, 160, 30, '0', 24, opts=dict(anchorPointX=1))], visible=False),
        B('Button_OK', 410, 42, 330, 68, 'But01', 'Set Trait', 30, label='Txt_OK', opts=BUTS),
        P('Win_under', 564, 7, 390, 614, [
            L('Txt_Medal_Title', 55, 588, 110, 30, 'MEDAL', 26, opts=dict(colorR=255, colorG=230, colorB=120)),
            # targa a sinistra di Close_Button (che sta sull'angolo della finestra)
            I('Plate_Possession', 242, 588, 220, 26, 'Plate03.png', opts=PLATE3),
            L('Txt_Possession', 172, 588, 90, 24, 'Slots', 17),
            L('Txt_Cost_Label', 262, 588, 60, 24, '0', 18),
            L('Txt_Slash_Label', 290, 588, 14, 24, '/', 18),
            L('Txt_CostMax_Label', 320, 588, 60, 24, '0', 18),
            I('Grid_Under', 195, 312, 380, 492, 'Panel04.png', opts=GRID),
            P('Scroll_Area', 8, 72, 374, 482),
            I('Img_SortType', 100, 34, 185, 26, 'Plate03.png', opts=PLATE3),
            L('Txt_Sort_Label', 100, 34, 180, 26, 'Strength', 18),
            L('Txt_Filter_On', 100, 12, 180, 20, 'Filter ON', 14),
            B('Button_Sort', 290, 34, 233, 68, 'But03', 'Sort', 30, opts=BUTS)]),
        I('Arrow01', 562, 330, 56, 134, 'Medal_Syn_Arrow01.png', s9=False, scale=0.6),
        B('Close_Button', 944, 614, 64, 64, 'But01', None)]))
    # chiusura: X tonda del dettaglio (But_CloseA/B, senza le varianti _Off/_On)
    o = find(root, 'Close_Button')['options']
    o.update(normalData=tex('But_CloseA.png'), pressedData=tex('But_CloseB.png'),
             disabledData=tex('But_CloseA.png'), scale9Enable=False)
    # KakuseiSkill_Window dalla finestra dei trait del dettaglio medaglia originale (stessi
    # nomi: Txt_SkillTitle, Txt_Skill_Num, Panel; ImageView ancorata in alto, alta per uno
    # slot): FUN_00e12838 l'allunga di 52 per ogni slot oltre il primo e vi aggiunge le righe
    # MedalInfo_KakuseiInfo_ver150 («infoPanel%d») 52 px l'una sotto l'altra.
    src = json.load(open(os.path.join(SRC, *PUB.split('/'), 'MedalInfo_KakuseiInfoWindow_ver150.json'),
                         encoding='utf-8-sig'))
    ksw = find(src['widgetTree'], 'KakuseiSkill_Window')
    ksw['options'].update(x=282, y=372, visible=False)
    root['children'].insert(5, ksw)
    data = {k: v for k, v in _tmpl.items() if k != 'widgetTree'}
    data['widgetTree'] = root
    return data


def avatar_comment_popup():
    """AvatarInfo_Comment_ver132 e _U13_ver132 (popup Name/Message del Profilo, FUN_008dcf1c;
    conferma FUN_008de654), assenti dalle risorse. Base: Offline_AvatarInfo_Comment
    (originale: finestra, AV_Name con il TextField Txt_Name_Label, Txt_Limit1, Txt_Caution,
    Button_Ok, Button_Close). Il codice cerca anche Txt_Comment, Txt_Limit2, il TextField
    Txt_Comment_Label (e TextField_Comment nella conferma), Txt_Comment_Label_U13, Txt_OK e
    Txt_Cancel: «Cancel» e' Button_Close. Aspetto da reference\\profile\\profile_13.png
    (finestra x' 105-535, y' 45-310; nome e messaggio in riquadri scuri; Cancel arancione e
    OK rosso in basso)."""
    d = json.load(open(os.path.join(SRC, *PUB.split('/'), 'Offline_AvatarInfo_Comment.json'), encoding='utf-8-sig'))
    t = d['widgetTree']
    win = find(t, 'NormalText_Window03')['options']
    win.update(y=324, width=764, height=471, scale9Width=764, scale9Height=471, scale9Enable=True,
               capInsetsX=50, capInsetsY=60, capInsetsWidth=1, capInsetsHeight=200)
    name_box = find(t, 'AV_Name')['options']
    name_box.update(x=0, y=145, width=405, height=85, scale9Width=405, scale9Height=85, **GRID)
    # area grande quanto il riquadro, testo al centro come nel riferimento
    center = dict(hAlignment=1, vAlignment=1)
    find(t, 'Txt_Name_Label')['options'].update(width=380, height=40, areaWidth=380, areaHeight=40, fontSize=26, **center)
    # Txt_Name e Txt_Comment sono i titoli dei due riquadri (il codice scrive «Message» nel
    # secondo); FUN_006e4c08 crea accanto a Txt_Name_Label e Txt_Comment_Label una Text con
    # le stesse proprieta' in cui la callback dei campi (FUN_008de654) copia il testo
    find(t, 'Txt_Name')['options'].update(x=-196, y=204, text='')
    find(t, 'Txt_Limit1')['options'].update(x=133, y=204)
    find(t, 'Txt_Caution')['options'].update(x=0, y=88, fontSize=18)
    # riquadro del messaggio: copia di AV_Name col TextField Txt_Comment_Label (FUN_006e467c
    # lo sostituisce con il campo vero e nasconde l'originale)
    clone(t, 'AV_Name', 'AV_Comment', 'NormalText_Window03', visible=True)
    box = find(t, 'AV_Comment')
    box['options'].update(y=-40, height=133, scale9Height=133)
    tf = box['children'][0]
    tf['options']['name'] = tf['name'] = 'Txt_Comment_Label'
    tf['options'].update(height=110, areaWidth=380, areaHeight=110, fontSize=24, maxLength=20, **center)
    ok = find(t, 'Button_Ok')['options']
    ok.update(x=153, y=-182, width=205, height=62, scale9Width=205, scale9Height=62,
              normalData=tex('But01_Off.png'), pressedData=tex('But01_On.png'), disabledData=tex('But01_Disable.png'),
              **BUT9)
    cancel = find(t, 'Button_Close')
    cancel['options'].update(x=-155, y=-182, width=205, height=62, scale9Width=205, scale9Height=62,
                             normalData=tex('But03_Off.png'), pressedData=tex('But03_On.png'),
                             disabledData=tex('But03_Off.png'), **BUT9)
    find(t, 'Txt_OK')['options'].update(text='OK', fontSize=28)
    winw = find(t, 'NormalText_Window03')
    cancel['children'] = [build(L('Txt_Cancel', 0, 3, 170, 50, 'Cancel', 28))]
    winw['children'] += [build(s) for s in (
        L('Txt_Comment', -142, 54, 200, 30, 'Message', 22, opts=dict(anchorPointX=0.5)),
        L('Txt_Limit2', 133, 54, 150, 20, 'Max 20 char.', 16),
        L('Txt_Comment_Label_U13', 0, -40, 380, 110, '', 24, visible=False))]
    return d


def other_menu():
    """MenuDialog_ver300 («Other» del menu, FUN_009ec518), assente dalle risorse. Base:
    MenuDialog_ver150 (originale KHUX: finestra Win11, griglia 3 x 5 di pulsanti con icona
    Menu_But_NN e testo). La ver300 cerca in piu' Achievement (con Image_android, l'icona
    Google Play al posto di quella di Game Center) e TitleButton (ritorno al titolo); non
    cerca SerialCodeButton, Movie e i pulsanti Facebook (nascosti). Icone assenti: dalla
    variante dark_Menu_But_NN dove esiste; Album (04) = Menu_But_18."""
    d = json.load(open(os.path.join(SRC, *PUB.split('/'), 'MenuDialog_ver150.json'), encoding='utf-8-sig'))
    t = d['widgetTree']
    swap = {'Menu_But_04.png': 'Menu_But_18.png'}
    swap.update({'Menu_But_%s.png' % n: 'dark_Menu_But_%s.png' % n for n in ('01', '08', '10', '11', '15')})

    def walk(w):
        o = w.get('options', {})
        fd = o.get('fileNameData')
        if isinstance(fd, dict) and fd.get('path') in swap:
            o['fileNameData'] = tex(swap[fd['path']])
        for c in w.get('children', []):
            walk(c)
    walk(t)
    for n in ('SerialCodeButton', 'FaceBookButton', 'FaceBookButton_Logout'):
        find(t, n)['options']['visible'] = False
    win = find(t, 'MainMenu_Dialog')
    # FUN_009ed888 cerca anche TwitterButton con il figlio Image (banco ot3): copia nascosta
    # del pulsante Facebook
    tw = json.loads(json.dumps(find(t, 'FaceBookButton')))
    tw['options'].update(name='TwitterButton', visible=False)
    tw['name'] = 'TwitterButton'
    win['children'].append(tw)
    # Achievement al posto di Serial Code, TitleButton nell'ultima riga (copie di un pulsante
    # della griglia con icona e testo propri)
    for name, x, y, icon, text in (('Achievement', 274, 100, 'Menu_But_16.png', 'Achievements'),
                                   ('TitleButton', -274, -206, 'Menu_But_17.png', 'Title Screen')):
        b = json.loads(json.dumps(find(t, 'HelpButton')))
        b['options'].update(name=name, x=x, y=y)
        b['name'] = name
        img, lab = b['children']
        img['options']['fileNameData'] = tex(icon)
        lab['options']['text'] = text
        if name == 'Achievement':
            andr = json.loads(json.dumps(img))
            andr['options'].update(name='Image_android', fileNameData=tex('Menu_But_16_a.png'), visible=False)
            andr['name'] = 'Image_android'
            b['children'].append(andr)
        win['children'].append(b)
    return d


def frame_armature(name, png, tsize, c, w, h, off, plist_name=None):
    """Armatura (ExportJson + plist) che disegna una cornice w x h da una texture di cornice
    tsize: 4 angoli c x c e 4 lati (fette di 10 px dal centro della texture) scalati solo
    lungo il lato. Movimento Animation1 fermo. Restituisce (ExportJson, testo del plist)."""
    tw, th = tsize
    mx, my = tw // 2 - 5, th // 2 - 5
    pieces = {   # nome: (x, y, larghezza, altezza) nella texture (y verso il basso)
        'TL': (0, 0, c, c), 'TR': (tw - c, 0, c, c), 'BL': (0, th - c, c, c), 'BR': (tw - c, th - c, c, c),
        'T': (mx, 0, 10, c), 'B': (mx, th - c, 10, c), 'L': (0, my, c, 10), 'R': (tw - c, my, c, 10)}
    hx, hy, k = w / 2 - c / 2, h / 2 - c / 2, c / 2
    place = {    # nome: (x, y, scala x, scala y) dell'osso, y verso l'alto
        'TL': (-hx, hy, 1, 1), 'TR': (hx, hy, 1, 1), 'BL': (-hx, -hy, 1, 1), 'BR': (hx, -hy, 1, 1),
        'T': (0, hy, (w - 2 * c) / 10, 1), 'B': (0, -hy, (w - 2 * c) / 10, 1),
        'L': (-hx, 0, 1, (h - 2 * c) / 10), 'R': (hx, 0, 1, (h - 2 * c) / 10)}
    del k
    frame = lambda n: '%s_%s.png' % (name, n)
    bones, movs, texd = [], [], []
    for z, (n, (x, y, sx, sy)) in enumerate(place.items()):
        # numeri decimali come negli ExportJson originali: il lettore controlla il tipo
        bones.append({'name': n, 'parent': '', 'dI': 0, 'x': float(x + off[0]), 'y': float(y + off[1]), 'z': z,
                      'cX': float(sx), 'cY': float(sy), 'kX': 0.0, 'kY': 0.0, 'arrow_x': 0.0, 'arrow_y': 0.0,
                      'effectbyskeleton': False, 'bl': 0,
                      'display_data': [{'name': frame(n), 'displayType': 0, 'skin_data': [
                          {'x': 0.0, 'y': 0.0, 'cX': 1.0, 'cY': 1.0, 'kX': 0.0, 'kY': 0.0}]}]})
        key = {'dI': 0, 'x': 0.0, 'y': 0.0, 'z': z, 'cX': 1.0, 'cY': 1.0, 'kX': 0.0, 'kY': 0.0,
               'twE': 0, 'tweenFrame': True, 'bd_src': 1, 'bd_dst': 771}
        # pulsazione come Cursor_Anim_Partner: opacita' 128 -> 255 -> 128 in 60 fotogrammi
        # (nel video della vendita il riquadro pulsa con un ciclo al secondo)
        col = lambda a: {'a': a, 'r': 255, 'g': 255, 'b': 255}
        movs.append({'name': n, 'dl': 0.0, 'frame_data': [
            dict(key, fi=0, color=col(128)), dict(key, fi=30, color=col(255)), dict(key, fi=60, color=col(128))]})
        texd.append({'name': frame(n)[:-4], 'width': float(pieces[n][2]), 'height': float(pieces[n][3]),
                     'pX': 0.5, 'pY': 0.5, 'plistFile': ''})
    plist_name = plist_name or name + '0.plist'
    ej = {'content_scale': 1.0,
          'armature_data': [{'strVersion': '1.6.0.0', 'version': 1.6, 'name': name, 'bone_data': bones}],
          'animation_data': [{'name': name, 'mov_data': [{'name': 'Animation1', 'dr': 61, 'lp': True, 'to': 0,
                                                          'drTW': 0, 'twE': 0, 'sc': 1.0, 'mov_bone_data': movs}]}],
          'texture_data': texd, 'config_file_path': [plist_name], 'config_png_path': [png]}
    # plist come quelli di CocoStudio (tabulazioni, una chiave per riga): scritto su una
    # riga sola il client non mostrava l'armatura
    frames = {frame(n): {'width': pw, 'height': ph, 'originalWidth': pw, 'originalHeight': ph,
                         'x': px, 'y': py, 'offsetX': 0.0, 'offsetY': 0.0}
              for n, (px, py, pw, ph) in pieces.items()}
    plist = plistlib.dumps({'frames': frames,
                            'metadata': {'format': 0, 'textureFileName': png, 'realTextureFileName': png,
                                         'size': '{%d,%d}' % (tw, th)},
                            'texture': {'width': tw, 'height': th}}, sort_keys=False).decode('utf-8')
    return ej, plist_name, plist


os.makedirs(os.path.join(OUT, *PUB.split('/')), exist_ok=True)
for target, spec in LAYOUTS.items():
    if spec[0] == 'scene':
        data, how = scene(spec[1]), 'scena'
    elif spec[0] == 'func':
        data, how = globals()[spec[1]](), 'funzione ' + spec[1]
    elif spec[0] == 'frame':
        data, plist_name, plist = frame_armature(*spec[1:])
        with open(os.path.join(OUT, *PUB.split('/'), plist_name), 'w', encoding='utf-8', newline='') as fh:
            fh.write(plist)
        # il client usa la texture col nome del plist (.plist -> .png), non quella indicata:
        # la si copia anche con quel nome
        png_name = plist_name[:-len('.plist')] + '.png'
        if png_name != spec[2]:
            shutil.copyfile(os.path.join(SRC, *PUB.split('/'), spec[2]), os.path.join(OUT, *PUB.split('/'), png_name))
            data['config_png_path'] = [png_name]
        how = 'cornice 9-slice da ' + spec[2]
    elif spec[0] == 'armature':
        data = json.load(open(os.path.join(SRC, *PUB.split('/'), spec[1]), encoding='utf-8-sig'))
        data['armature_data'][0]['name'] = spec[2]
        data['animation_data'][0]['name'] = spec[2]
        for mv in data['animation_data'][0]['mov_data']:
            mv['name'] = spec[3].get(mv['name'], mv['name'])
        if len(spec) > 4:               # plist copiato con un nome nuovo
            shutil.copyfile(os.path.join(SRC, *PUB.split('/'), data['config_file_path'][0]),
                            os.path.join(OUT, *PUB.split('/'), spec[4]))
            data['config_file_path'] = [spec[4]]
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
            elif isinstance(extra, tuple) and extra[0] == 'opts':   # ('opts', nome, {opzioni})
                find(data['widgetTree'], extra[1])['options'].update(extra[2])
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

served = {l.split('\t')[0] for l in open(os.path.join(SRC, '..', '..', 'resource_data', 'names_v4.tsv'), encoding='utf-8')}
n_copied = 0
for dst, src in COPIES.items():
    if dst in served or not os.path.exists(os.path.join(SRC, *src.split('/'))):
        continue
    os.makedirs(os.path.dirname(os.path.join(OUT, *dst.split('/'))), exist_ok=True)
    shutil.copyfile(os.path.join(SRC, *src.split('/')), os.path.join(OUT, *dst.split('/')))
    n_copied += 1
print('file copiati:', n_copied)

os.makedirs(os.path.join(OUT, 'text', 'ui'), exist_ok=True)
for tid, s in TEXTS.items():
    with open(os.path.join(OUT, 'text', 'ui', '%d.txt' % tid), 'w', encoding='utf-8', newline='') as fh:
        fh.write(s)
print('testi ui:', len(TEXTS))
