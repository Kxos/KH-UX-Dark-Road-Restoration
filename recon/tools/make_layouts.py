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
        I('tab1', 172, 488, 175, 40, 'Plate01.png', s9=False, children=[
            L('Txt_Tab', 0, 0, 170, 36, 'Traits', 22),
            I('Icon_New', 70, 18, 69, 30, 'Deck_Medal_New.png', s9=False, scale=0.6, visible=False)]),
        I('tab2', 352, 488, 175, 40, 'Plate01.png', s9=False, children=[
            L('Txt_Tab', 0, 0, 170, 36, 'Items', 22),
            I('Icon_New', 70, 18, 69, 30, 'Deck_Medal_New.png', s9=False, scale=0.6, visible=False)]),
        B('Button_EquipSell', 626, 492, 178, 53, 'But03', 'Sell Materials', 22, label='Txt_EquipSell',
          opts=BUTS),
        P('Mshop_win', 75, 75, 640, 395, [
            I('win_Traits', 320, 197, 640, 395, 'Panel04.png', opts=GRID),
            I('win_Item', 320, 197, 640, 395, 'Panel04.png', opts=GRID, visible=False),
            P('Area_Traits', 10, 10, 620, 375),
            P('Area_Item', 10, 10, 620, 375, visible=False)]),
        L('Txt_NoItem', 395, 272, 500, 40, 'No items available.', 24, visible=False),
        B('Button_MedalSelect', 255, 42, 177, 64, 'But01', 'Select Medal', 22, label='Txt_MedalSelect',
          opts=BUTS),
        I('LB_Munnies', 560, 42, 300, 26, 'Plate03.png', opts=PLATE3, children=[
            L('Txt_MunniesPossessed_Label', -85, 0, 120, 24, 'Munny', 17),
            I('Icon_Munnies', -10, 0, 44, 46, 'Icon_Prize.png', s9=False, scale=0.5),
            L('Txt_Munnies', 80, 0, 140, 24, '0', 18)]),
        P('Moogle_Fla', 795, 140, 10, 10),
    ])),
    # Righe dell'elenco (FUN_00aaf278 le crea: Traits 721x110, Items 721x184; riempite da
    # FUN_00aaf8e4 e FUN_00ab175c). Nomi dal decompilato; disposizione dalle righe della 4.1.0
    # (riquadro scuro con icona del trait, nome, prezzo a destra; oggetti su targa dorata
    # con «Buy»). Panel_Disable, Caution, LockMask nascosti: li mostra il codice.
    'MoogleShop_Traits_Panel_ver410.json': ('build', P('Panel', 0, 0, 721, 110, [
        P('SkillPanel', 30, 15, 660, 80, [
            I('Skill_Base', 330, 40, 660, 70, 'Plate02.png', opts=PANEL4),
            I('kakusei_Icon', 45, 40, 60, 60, 'Plate01.png', s9=False),
            L('Txt_KakuseiSkill', 250, 40, 330, 36, '', 22)]),
        P('Count', 30, 82, 200, 24, [L('Txt_Count', 100, 12, 190, 22, '', 16)], visible=False),
        P('Count_Rare', 30, 82, 200, 24, [L('Txt_Count_Cus', 100, 12, 190, 22, '', 16)], visible=False),
        P('Jewel', 470, 30, 200, 50, [
            I('Jewel_Icon', 20, 25, 44, 46, 'Icon_Prize.png', s9=False, scale=0.6),
            L('Txt_Jewel', 120, 25, 150, 30, '0', 22)]),
        P('Munnies', 470, 30, 200, 50, visible=False),
        P('Caution', 30, 0, 660, 20, [L('Txt_Caution', 330, 10, 640, 20, '', 16)], visible=False),
        I('Icon_New', 30, 90, 69, 30, 'Deck_Medal_New.png', s9=False, scale=0.6, visible=False),
        L('Txt_Limit', 600, 95, 160, 20, '', 16),
        P('Panel_Disable', 0, 0, 721, 110, visible=False),
        P('LockMask', 0, 0, 721, 110, [
            B('ImageButton_LockMask', 360, 55, 721, 110, 'But16', None),
            I('Icon_Lock', 650, 55, 45, 49, 'Deck_Medal_Lock.png', s9=False)], visible=False)])),
    'MoogleShop_Item_Panel.json': ('build', P('Item', 0, 0, 721, 184, [
        P('Panel', 0, 0, 721, 184, [
            P('Panel_Item', 20, 20, 140, 140),
            L('Txt_Material_Name', 330, 120, 320, 30, '', 22),
            L('Txt_Material_Text', 330, 80, 320, 50, '', 18),
            I('Icon_Skill', 190, 120, 40, 40, 'Plate01.png', s9=False, visible=False),
            P('Jewel', 500, 110, 200, 40, [
                I('Jewel_Icon', 20, 20, 44, 46, 'Icon_Prize.png', s9=False, scale=0.6),
                L('Txt_Jewel', 120, 20, 150, 30, '0', 22)]),
            B('But_Buy', 600, 50, 177, 64, 'But01', 'Buy', 24, label='Txt_buy', opts=BUTS),
            P('Count', 20, 160, 200, 24, [L('Txt_Count', 100, 12, 190, 22, '', 16)], visible=False),
            I('Plate_Count', 600, 160, 200, 24, 'Plate03.png', opts=PLATE3, visible=False),
            L('Txt_Limit', 600, 160, 180, 22, '', 16),
            L('Txt_Caution', 360, 10, 640, 20, '', 16, visible=False),
            I('Icon_New', 30, 170, 69, 30, 'Deck_Medal_New.png', s9=False, scale=0.6, visible=False)]),
        P('Panel_Rare', 0, 0, 721, 184, [
            P('Panel_Item', 20, 20, 140, 140),
            I('Plate_Count_Rare', 600, 160, 200, 24, 'Plate03.png', opts=PLATE3),
            L('Txt_Count_Cus', 600, 160, 180, 22, '', 16)], visible=False),
        P('LockMask', 0, 0, 721, 184, [
            B('ImageButton_LockMask', 360, 92, 721, 184, 'But16', None),
            I('Lock_icon', 650, 92, 45, 49, 'Deck_Medal_Lock.png', s9=False)], visible=False),
        B('ImageButton_Buy1', 600, 50, 177, 64, 'But01', None, opts=BUTS, visible=False)])),
    # IconPanel: dentro Panel_Item; Base riceve img/ui/Mogshop_plate1.png (make_textures.py)
    'MoogleShop_IconPanel.json': ('build', P('IconPanel', 0, 0, 140, 140, [
        I('Base', 70, 70, 140, 140, 'Plate01.png', s9=False)])),
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
    'EquipSell_Block.json': ('build', P('Panel_Block', 0, 0, 300, 110, [
        P('EquipSellBlock', 0, 0, 300, 110, [
            I('Block_Base', 150, 55, 290, 100, 'Plate02.png', opts=PANEL4),
            I('MaterialSellIcon', 55, 55, 80, 80, 'Plate01.png', s9=False),
            L('Txt_Material_Name', 200, 80, 190, 26, '', 18),
            L('Txt_MaterialStock_Fix1', 160, 50, 80, 24, '', 16),
            L('Txt_data1 ', 230, 50, 80, 24, '', 18),
            L('Txt_Money_Fix', 160, 22, 80, 24, '', 16),
            L('Txt_data2', 230, 22, 100, 24, '', 18),
            P('PanelMask', 0, 0, 300, 110, visible=False),
            # Panel_On: evidenza della riga scelta (cercato da FUN_00888xxx, crash se manca)
            I('Panel_On', 150, 55, 290, 100, 'Plate02.png', opts=dict(PANEL4, colorR=120, colorG=220, colorB=255),
              visible=False)])])),
    'EquipSell_Dialog_Step1.json': ('func', 'material_sell_popup'),
    # Conferma (FUN_00c611fc): popup OK/Annulla con il riepilogo
    'EquipSell_Dialog_Step2.json': ('copy', 'PopupNormal_Text_34_4Line_OkCancel.json',
                                    {'Button_OK': 'Button_sell_ok', 'Txt_OK': 'Txt_sell_ok',
                                     'Button_Close': 'Button_cancel', '4Line_Label': 'Txt_Material_Name_Dlog'},
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


def sell_popup(icon='MedalSellIcon', name='Txt_Medal_Name_Dlog', extra=()):
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
        I(icon, -172, 225, 89, 109, 'Medal_S_00000001.png', s9=False, scale=1.5),
        I('Name_Plate', 37, 187, 360, 36, 'Plate03.png', opts=PLATE3),
        L(name, 37, 187, 330, 32, '', 22),
        L('Txt_data2', -239, 62, 200, 34, 'Quantity', 26),
        L('Txt_data3', 13, 62, 200, 40, '0', 32),
        I('Money_Plate', 105, -166, 366, 30, 'Plate03.png', opts=PLATE3),
        # il codice scrive il ricavo in Txt_MoneyTotalStock_Fix e «Munny» in Txt_data5 (banco)
        L('Txt_data5', -15, -166, 120, 28, 'Munny', 20),
        I('Icon_Prize2', 75, -166, 44, 46, 'Icon_Prize.png', s9=False, scale=0.5),
        L('Txt_MoneyTotalStock_Fix', 205, -166, 160, 30, '0', 22, opts=dict(colorB=0)),
        I('Warning_Plate', -16, 115, 576, 32, 'Plate03.png', opts=dict(PLATE3, colorR=255, colorG=70, colorB=70),
          visible=False, children=[L('Txt_Rare1', -150, 0, 260, 28, '', 20), L('Txt_Rare2', 150, 0, 260, 28, '', 20)]),
    ]
    win['children'] = [build(head[0])] + win['children'] + [build(s) for s in head[1:] + list(extra)]
    return d


def equip_sell_popup():
    return sell_popup(extra=[
        # nome con uno spazio ideografico in coda (U+3000), come lo cerca il codice
        # (0x884688: "Txt_data" + 34 e3 80 80): senza, crash in enableShadow; testo 102000002 = " "
        L('Txt_data4　', 13, 30, 300, 24, '', 18),
        L('Txt_MaterialStock_Fix_2', -232, -100, 80, 24, '', 18),
        L('Txt_MaterialStock_Fix_3', 232, -100, 80, 24, '', 18)])


def material_sell_popup():
    """EquipSell_Dialog_Step1 (FUN_00c5f788): come il popup delle medaglie, con
    MaterialSellIcon (img/material/material_%d.png), Txt_Material_Name_Dlog,
    Txt_Material_Info_Dlog, Txt_MoneyStock_Fix e Txt_data1."""
    return sell_popup('MaterialSellIcon', 'Txt_Material_Name_Dlog', [
        L('Txt_Material_Info_Dlog', 37, 135, 500, 40, '', 18),
        L('Txt_MoneyStock_Fix', -239, 22, 200, 26, '', 18),
        L('Txt_data1', 13, 22, 200, 26, '', 18),
        # cercato anche qui (stack al crash); la variante con U+3000 delle medaglie per sicurezza
        L('Txt_data4', 13, 30, 300, 24, '', 18),
        L('Txt_data4　', 13, 30, 300, 24, '', 18),
        L('Txt_MaterialStock_Fix_2', -232, -100, 80, 24, '', 18),
        L('Txt_MaterialStock_Fix_3', 232, -100, 80, 24, '', 18)])


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
