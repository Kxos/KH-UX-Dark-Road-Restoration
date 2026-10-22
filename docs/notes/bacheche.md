# Avatar Boards (boards, «sphere» in the client)

References: `reference\avatar_boards\` (avatar_boards_list_01.jpg, ab_29-33.png from the video
7-R0jhyzlso 556-686 s, ab_ref_*, ab_sheet). The agent's documents in
`D:\Progetto_Restauro_KH_UX\stage_gen\boards\` (`NOTE.md` meaning of the fields, `SERVER.md`
protocol, `ARMATURES.md`, `LAYOUT.md`, `ASSETS.md`, `tools\gen_boards.py`).
Status as of 11 October: **list, board, node unlocking, Unlock All, completed board and
title popup tested on the bench** (resources 32, revision 81).

<a id="dati"></a>
## Data

- Master `sphere`, `sphereArray`, `sphereMasu` in `server/tables/` (118 standard boards, 874 nodes,
  from the khuxwiki; no public dump). `sphereMasu` index 22 = completion reward: title
  2000+N (`rewardSelect` 7); with 0 the client looked up id 0 and crashed.
- Avatar Coin = `userPoint.spherePoint` (reward of type 14).
- Images (agent, `stage_gen\boards\files\`, 442 PNG): 381 `img/sphere_incentive/<id>.png` from
  Roboloid (`images/assets/board/sphere_incentive-<id>.png`), 15 `sphere_board/Board_%04d`, 42
  `sphere_masu_icon`, `Kind_0002` (pink figure) rebuilt. The incentives (37 MB) live in the static
  package `medal_gen` (they need full versions).

<a id="server"></a>
## Server

- `GET /user/sphere`, `POST /user/sphere/update` (nodes, coins, HP/AP/cost/medal/part rewards,
  title on a completed board), `/user/sphere/check` (61, `userSphere` `[fn]` mode 1; with
  `checkTypes` containing 3, `closeEventSphereBoardIds[]`), `/user/sphere/reset` (62). Responses 44/190
  with the inventory (`inventoryBlocks`, `userTitlesData`).
- **Response of `/user/sphere/update` (44), branch `0x7c33bc` of `[fn]`** (shared with
  190 `/user/mission/receive`, which it tells apart with `cmp w8,#0xbe`/`#0x2c`). Each parser returns null
  if the key is missing or is not an array/object (`[fn]` + type check), and a checked
  null leads to `w19 = 0` (error 2). For 44 they are **all mandatory**:
  `userData.userPoint` (`[fn]`, `0x7c33cc`), `userData.userDetail` (`[fn]`,
  `0x7c33ec`; optional only for 190), `userSphere` (`[fn]`, `0x7c3430`, 44 only),
  `userMaterials` (`[fn]`), `userMedals` (`[fn]`, default key if x1 = 0),
  `userSkills` (`[fn]`), `userKeyblades` (`[fn]`), `userDecks` (`[fn]`),
  `userAvatarParts` (`[fn]`), `userTitles` (`[fn]`), `pet.userPetParts`
  (`[fn]`, `0x7c34ec`, 44 only), `emblemIds` (`[fn]`, `0x7c350c`, 44 only),
  `subslotMaxNum`+`userKeybladeSubslots` (`[fn]`), `guiltBurstFirst/MaxUserMedalIds`
  (`[fn]`, 44 and 190). `missions` (`[fn]`) is checked only for 190.
  Action 49 (`/user/present/receive`, branch `0x7cad14`): same lists, all mandatory, plus
  `lastUserPresentIds`; `userData` is optional (if present and an object, `userPoint` is
  mandatory, `0x7cad38`). Actions 60/61/62 have their own branches (`0x7c44e8`, `0x7cbde0`,
  `0x7c4f08`) without inventory.
- **An empty array is valid and the client does not replace the lists**: after the parse (`0x7ce7ac` for
  44/190; `0x7d03d4`/`0x7d0b2c`/`0x7d0c9c` for 49) each entry goes through an upsert by id:
  `[fn]` materials (entry with `number` 0 = removed), `[fn]` medals (new entry ->
  `[fn]`), `[fn]` skills. Each upsert copies the whole list again (0x148 bytes per
  medal) and rebuilds its index (`[fn]`): with ~2076 medals it is O(n^2) and it was the
  cause of the ~6.5 s wait after each node (bench 14 October; same problem as the Level Up, I-083).
  Sub-slots and the Burst lists instead are replaced (`+0x890`, `+0x930` of the state), `emblemIds`
  goes to `[fn]`; keyblades/decks/parts/titles/pet use `[fn]`/`[fn]`/
  `[fn]`/`[fn]`/`[fn]` (not verified: they stay complete).
- Server: `inventorySnapshot(now)` before the rewards and `inventoryBlocks(now, snap)` send for
  `userMaterials`/`userMedals`/`userSkills` only the new or changed entries (empty array if the node
  gives HP/AP/cost); if an entry has disappeared the whole list is sent. This applies to 44, 49 and 190;
  `KHUX_FULL_INVENTORY=1` goes back to the complete lists.
- **Every entry of `userSphereDatas` from `/user/sphere/check` means «board just
  unlocked» to the client** (list `[fn]()+0x6a8`, read by the home `[fn]`, by the results
  `[fn]` and by the board list): the server sends only the boards not yet announced
  (`player.sphereNotified`; an empty array, not a missing key, which would leave the list as it is).
- Node rewards: HP +20 each (`player.sphereBonus`).

<a id="layout"></a>
## Layout and code

- List: `SphereBoardScene_ver310` (CenterUI = `SphereBoard_Gen`, LeftUI = `MedalSell_Back`) and the
  card `SphereBoard_Select_Icon_ver130` (`Select_Base`/`Select_Board`/`Select_Kind`; widget of
  `[fn]`, costume above the background). Names from `[fn]`, `[fn]`, `[fn]`,
  `[fn]`, `[fn]`: `Img_Win_L/S` (cost plate, `Txt_Coin`/`Txt_Coin_Title`; with
  opacity 0, the code shows them again), `Coin` (`SpherePointIcon`, `Txt_Coin_Name_Label`,
  `Txt_Coin_Label`), `TitleBar`/`Txt_SphereBoard_Label`, `Txt_Open` with `Txt_Num_Label`/
  `Txt_Total_Label`, `Bar_Filter`, `Button_Filter`/`Txt_Filter`, `Txt_Caution`,
  `BoardDetail`/`DetailButton`/`Txt_Detail`, `SelectArea` with `LeftUI`/`RightUI`/`CenterUI`,
  `LeftUI_Arrow`/`RightUI_Arrow`. «No. N» above the card (`No_Panel` y 300, tab `Sphere_No_Tab`).
- Board: `SphereScene_ver310` (Grid G11..G59 = 45 cells, `Grid`/`Grid_R`/`Info`/`LeftUI`
  mandatory, background `img/ui/Equip_DeckBG_01.png`, overlay `Sphere_Incentive.json`). Armatures from
  `recon/tools/gen_sphere_armatures.py`: `Z_SpRoute_*`, `SphereAnimation`, `Z_SpCursor` (movements
  chosen by index 0/1/2 = Lock/Release/Target; rigid frame-by-frame rotation, kX/kY deformed them).
- Popups: `PopupNormal_SphereCoinCheck_ver310`, `Sphere_Popup_Get_ver240`, `Sphere_Popup_Comp_ver310`
  from the original OK/OK-Cancel popups. `Sphere_Incentive_ver240` **is not a popup**: it is the
  reward icon that `[fn]` adds in the `Panel` of `Sphere_Popup_Get` (100x100 build with
  `reward_icons`). `Area_Point` and the icons per type are needed.
- `Sphere_Popup_Comp_ver310` (`[fn]`) also goes through `[fn]`: it needs
  `Txt_Get_Label`, `Panel`, `Button_Ok`/`Txt_Ok` besides `Txt_All` («You completed the board!», only
  with flag +0x7b3). `[fn](.., 0x16, ..)` shows the reward at index 22 of `sphereMasu`.
  Opened with `param_4` 0: the banner does not start, so CONGRATULATIONS is fixed on the arc
  (`Sphere_Congrats` from `make_textures`, letters of the Result_Reward LWF).
- LWF `lwf/sphere/SpIcon_Open` and `SphereMap_Complete`: renamed copies of Result_Reward (an empty LWF
  has no label: crash).
- Style (from the originals): completed card with red bow and «COMPLETE» band
  (`Sphere_Board_Clear` in the `Clear` widget; simpler drawing than the painted original, ISSUES
  I-025), yellow check mark `Sphere_Node_Check` in the `Get` widget (+1/+24 from the node centre), title
  plate `RankTitle_Board` like `AvatarTitle_PanelButton_Big` (610x82, scale 0.8), orange title popup
  like `Result_Reward_Win`, bottom boxes `Win09` 9-slice, pill `Plate18`, Unlock
  `But06` (grey `_Disable`), Unlock All `But16` (does not exist in the 2017 originals).

<a id="popup-lb"></a>
## Popup «Unlocked an Avatar Board!»

After a Level Up and at every login (if the server announces boards) the client opens
`BattleResult_LB_ver120.json` (`[fn]`), derived from `PopupNormal_Text_34_4Line_Ok` (`Txt`,
`Select_Base/Board/Kind`, `Txt_Title_Label`, `Button_Ok`/`Txt_OK`, `Area_Point`). Tested on the bench
(home and Level Up 3 -> 4 in quest 11). Analysis in `stage_gen\lb_popup`. Original not found
online (`reference\lb_popup`: style from «Purchased Avatar Board!») (ISSUES I-026).

<a id="prove"></a>
## Tests on the save

To test the popups again: stop the server, `unlock` of 2100001 to [1..5], `spherePoint` 470,
`sphereBonus.cost` 3, remove 2001 from `titles`, restart (with `relogin.ps1`).
