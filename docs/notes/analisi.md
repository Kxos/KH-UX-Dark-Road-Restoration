# Analisi statica: Ghidra e strumenti

Indirizzi: **Ghidra = offset nel file + 0x100000** (es. `FUN_007bbe20` = `0x6bbe20` nel file). La
libreria e' strippata al 95%: il livello API si trova per xref sulle stringhe e per vtable/RTTI.

<a id="ghidra"></a>
## Ghidra headless

- Progetto `recon/ghidra/project` (829 MB, non versionato; prima analisi 45-120 min con
  `recon\ghidra\run-ww.bat`). JDK: `D:\Programmi\Android\Android Studio\jbr`. Ghidra in
  `D:\Progetto_Restauro_KH_UX\Android\ghidra_12.1.4_PUBLIC_20260921\ghidra_12.1.4_PUBLIC` (serve
  l'estensione Jython).
- Lancio: `analyzeHeadless.bat <repo>\recon\ghidra\project khux-ww431 -process libcocos2dcpp.so
  -noanalysis -readOnly -scriptPath recon/ghidra -postScript <script>.py <uscita>`.
- `recon/ghidra/decomp.ps1 -Out <file.c> [-Timeout s] <indirizzi>`: decompilazione in una riga.
- Script: `khux_decomp.py` (`t 300` = timeout), `khux_decomp_at.py` (anche dove Ghidra non ha una
  funzione), `khux_listing.py` (segue il flusso, anche nei rami raggiunti da tabelle non ricostruite),
  `khux_linear.py` (disassemblato lineare), `khux_refs.py` (riferimenti a un indirizzo),
  `khux_field_readers.py` (chi legge un campo di un singleton), `khux_apixref.py`, `khux_callers.py`,
  `khux_lambda_names.py`.

<a id="tools"></a>
## Strumenti Python (`recon/tools/`, sempre `python -I`)

- Protocollo: `action_case.py`, `response_schema.py`, `batch_schema.py`, `request_ids.py`,
  `who_refs.py`, `getter_ids.py`, `master_types.py`, `codeindex.py`, `vtables.py`, `digest.py`.
- `vtable_users.py`: chi crea una lambda `std::function` (dalla `target()` della vtable alle coppie
  ADRP+ADD/LDR): cosi' si trovano funzioni come `openItemBuyPopup`.
- Widget e testi: `func_strings.py`, `widget_lookup.py <lib> <file.c>` (nomi dei widget ricostruiti
  dalle stringhe corte libc++ composte sullo stack), `text_ids.py`, `ui_text_ids.py`.
- Pacchetti: `bgad.py`, `bgad_names.py`, `bgad_extract.py`, `bgi_check.py`, `bgi_keyhunt.py`,
  `pack_keyhunt.py`, `resource_index.py`, `resource_pack.py`, `resource_merge.py`,
  `resource_split.py`, `res_get.py`, `res_bulk.py`, `catalog.py`, `asset_coverage.py`, `btf.py`,
  `btf_fix.py`, `remote_zip.py`, `dex_consts.py`.
- Dati: `raw_master.py`, `raw_master_old.py`, `wiki_dump.py`, `wiki_quests.py`,
  `fetch_medal_images.py`, `fetch_material_icons.py`, `import_ui_texts.py`.
- Mappe: `stage_poi.py`, `mappoi_gen.py`, `mappoi_room.py`, `gen_story_maps.py`, `validate_maps.py`,
  `smoke_pick.py`.
- Generatori di risorse: `make_layouts.py`, `make_textures.py`, `gen_sphere_armatures.py`,
  `make_enemy_moves.py`, `layout_tree.py`, `scene_tree.py`, `import_jp_coco.py` (layout originali JP
  al posto dei generati) e `jp_coco_widgets.py` ([risorse_layout](risorse_layout.md#jp-originali)).
- Ghidra: `khux_decomp_ranges.py` decompila piu' intervalli in un solo avvio.

<a id="singleton"></a>
## Oggetti noti

- Sessione: `FUN_007c1dfc()` = oggetto statico a `0x515e290` (tabelle con il numero di record a
  +0x34; +0x88 flag nuovo giocatore; +0xa8 chiave delle risorse; +0x6a8 bacheche appena sbloccate;
  +0x7c0 pet; +0x890 mappa dei subslot).
- Getter master per id (`FUN_00efe8b4` per `misc`, `FUN_00f04580` per tabella interna): restituiscono
  la riga senza controllo del null; i chiamanti la dereferenziano subito.
- Record delle righe master in memoria offuscata (`FUN_006dfe9c` scrive, `FUN_006e02d4` legge).
- `cocostudio::Armature::init` `FUN_011849d4`, ricerca armatura `FUN_01197cc8`, `Label::setString`
  `FUN_012afc74`, GUIReader fra 0x11ad000 e 0x11b2000.
