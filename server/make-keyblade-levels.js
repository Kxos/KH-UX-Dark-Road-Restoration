#!/usr/bin/env node
// Livelli intermedi dei keyblade e sub-slot (tabelle master keyblade e keybladeSubslot).
//
// La tabella keyblade della 5.0.1 ha solo i livelli in cui cambia il design (64 righe, 4 per
// serie: es. Treasure Trove +0/+5/+17/+35): «Strengthen» (POST /keyblade/enhance) va al
// keybladeId di evolveId, quindi senza le righe in mezzo si saltava da +0 a +5. Qui si
// ricostruiscono tutti i livelli interi +0..+35 dalle tabelle della khuxwiki (ricerca in
// D:\Progetto_Restauro_KH_UX\reference\keyblades\keyblade_levels.json, copia ridotta in
// server/tables/keyblade_levels.json):
//   - keybladeId: serie*1000 + livello*10 fino a +20, poi serie*1000 + 200 + (livello-20)
//     (Bad Guy Breaker: livello*10 sempre), come le righe della 5.0.1;
//   - design (displayId), passiva, rotazione/scala: quelli della riga 5.0.1 precedente;
//   - slot (validConsist, drawCount), attribute/darklight, accord/dlaccord, maxBurstGauge,
//     partnerRate, materiali per il livello dopo: dalla khuxwiki (post 2.6.0);
//   - le 64 righe della 5.0.1 restano come sono (si cambia solo evolveId); lo script stampa
//     dove la khuxwiki non torna con loro.
// Le righe aggiunte hanno "generated": true (chiave in piu', ignorata dal client): rilanciando
// lo script si rifanno da capo. Oltre +35 (+35.1 .. +60 dell'ultima versione) non si va: la
// riga ha lv intero e la 5.0.1 chiude a +35 con evolveId 0.
// keybladeSubslot (vuota nella 5.0.1): 120 sub-slot per serie {subslotId = category*1000 + n,
// category, slotNumber, attribute 1/2/3, darklight 1 Upright / 2 Reversed / 3 nessuno}.
//
//   node server\make-keyblade-levels.js [keyblade_levels.json della ricerca]
// Poi alzare KHUX_REVISION (revisione dei master).
'use strict';

const fs = require('fs');
const path = require('path');

const MASTER = path.join(__dirname, 'master_data');
const TABLE = path.join(__dirname, 'tables', 'keyblade_levels.json');
const REF = 'D:\\Progetto_Restauro_KH_UX\\reference\\keyblades\\keyblade_levels.json';
const ATTR = { Power: 1, Speed: 2, Magic: 3 };
const DL = { Upright: 1, Reversed: 2 };
const MAX_LV = 35;

function load(f) { return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')); }
function save(f, data) { fs.writeFileSync(f, JSON.stringify(data, null, 1) + '\n', 'utf8'); }

// tabella ridotta: per serie i livelli interi 0..35 e i 120 sub-slot
function extract(ref) {
  const out = {};
  for (const [name, s] of Object.entries(ref)) {
    if (name.startsWith('_')) continue;
    out[name] = {
      source: s.source,
      designLevels: s.designLevels,
      subslots: (s.subslotTree || []).map((t) => [t.n, ATTR[t.attribute] || 0, DL[t.urType] || 3]),
      levels: s.levels.filter((l) => Number.isInteger(l.lv) && l.lv <= MAX_LV).map((l) => ({
        lv: l.lv, slots: l.slots, sa: l.saGauges, friend: l.friendMultiplier,
        m: l.multipliers.map((x) => [ATTR[x.attribute] || 4, x.value, x.matchValue, DL[x.urType] || 3]),
        mat: (l.materialsToNext || []).map((x) => [x.id, x.num, x.name]),
      })),
    };
  }
  return out;
}

function main() {
  const refPath = process.argv[2] || (fs.existsSync(TABLE) ? null : REF);
  let table;
  if (refPath) {
    table = extract(load(refPath));
    fs.mkdirSync(path.dirname(TABLE), { recursive: true });
    save(TABLE, table);
    console.log(`tabella ridotta: ${TABLE}`);
  } else table = load(TABLE);

  const kbFile = path.join(MASTER, 'keyblade.json');
  const anchors = load(kbFile).filter((r) => !r.generated);
  const materials = new Set(load(path.join(MASTER, 'material.json')).map((r) => r.materialId));
  const rows = [];
  const subslots = [];
  let warn = 0;
  const bySeries = new Map();
  for (const r of anchors) {
    if (!bySeries.has(r.category)) bySeries.set(r.category, []);
    bySeries.get(r.category).push(r);
  }
  for (const [category, list] of bySeries) {
    list.sort((a, b) => a.lv - b.lv);
    const base = list[0];
    const data = table[base.name];
    if (!data) { console.log(`! ${base.name}: nessun dato, righe 5.0.1 invariate`); rows.push(...list); continue; }
    const tens = list.some((r) => r.lv > 20 && r.keybladeId === base.keybladeId + r.lv * 10);
    const idOf = (lv) => base.keybladeId + (lv <= 20 || tens ? lv * 10 : 200 + lv - 20);
    const levels = new Map(data.levels.map((l) => [l.lv, l]));
    const top = Math.min(MAX_LV, list[list.length - 1].lv);
    // partnerRate: formula della khuxwiki, tranne dove non torna con la 5.0.1 (Bad Guy Breaker):
    // li' interpolazione lineare fra le righe 5.0.1
    const friendOk = list.every((r) => !levels.get(r.lv) || Math.abs(Math.round(levels.get(r.lv).friend * 10000) - r.partnerRate) <= 1);
    for (let lv = 0; lv <= top; lv++) {
      const anchor = list.find((r) => r.lv === lv);
      const prev = [...list].reverse().find((r) => r.lv <= lv);
      const next = list.find((r) => r.lv > lv);
      const l = levels.get(lv);
      const id = anchor ? anchor.keybladeId : idOf(lv);
      if (!anchor && list.some((r) => r.keybladeId === id)) throw new Error(`id ${id} gia' usato (${base.name} +${lv})`);
      const nextId = lv < top ? (list.find((r) => r.lv === lv + 1)?.keybladeId ?? idOf(lv + 1)) : 0;
      if (!l) { // senza dati: copia della riga precedente
        rows.push(anchor ? { ...anchor, evolveId: nextId } : { ...prev, keybladeId: id, name: `${base.name} +${lv}`, lv, evolveId: nextId, generated: true });
        if (!anchor) { warn++; console.log(`! ${base.name} +${lv}: nessun dato, copia di +${prev.lv}`); }
        continue;
      }
      const slots = l.slots;
      const m = l.m.slice(0, slots);
      const mats = l.mat.filter(([mid]) => mid && materials.has(mid));
      for (const [mid, , nm] of l.mat) if (!mid || !materials.has(mid)) { warn++; console.log(`! ${base.name} +${lv}: materiale ${nm} (${mid}) assente da material.json, tolto`); }
      let partnerRate = Math.round(l.friend * 10000);
      if (!friendOk && prev && next) partnerRate = Math.round(prev.partnerRate + (next.partnerRate - prev.partnerRate) * (lv - prev.lv) / (next.lv - prev.lv));
      const gen = {
        ...prev,
        keybladeId: id, name: lv ? `${base.name} +${lv}` : base.name, lv,
        drawCount: slots, maxBurstGauge: l.sa, validConsist: slots,
        // attributo 4 = qualsiasi (moltiplicatore 1.00 senza Upright/Reversed), come la 5.0.1
        attribute: m.map(([a, v, mv]) => (v === 1 && mv == null ? 4 : a)),
        darklight: m.map(([, , mv, d]) => (mv == null ? 3 : d)),
        accord: m.map(([, v]) => Math.round(v * 10000)),
        dlaccord: [0, 1, 2, 3, 4].map((i) => (m[i] && m[i][2] != null ? Math.round(m[i][2] * 10000) : (i === 0 ? 0 : 10000))),
        partnerRate, evolveId: nextId,
        validNeedMaterial: mats.length, needMaterialId: mats.map(([mid]) => mid), needMaterialNum: mats.map(([, n]) => n),
        generated: true,
      };
      if (anchor) {
        // riga 5.0.1: si tiene com'e', si confrontano i campi
        for (const k of ['validConsist', 'maxBurstGauge', 'attribute', 'darklight', 'accord', 'dlaccord', 'partnerRate', 'needMaterialId', 'needMaterialNum']) {
          if (lv === top && k.startsWith('need')) continue;
          if (JSON.stringify(gen[k]) !== JSON.stringify(anchor[k])) { warn++; console.log(`~ ${anchor.name} ${k}: 5.0.1 ${JSON.stringify(anchor[k])} / wiki ${JSON.stringify(gen[k])}`); }
        }
        rows.push({ ...anchor, evolveId: nextId });
      } else {
        // design della riga 5.0.1 precedente; slot gia' aperti mai tolti
        rows.push(gen);
      }
    }
    // sub-slot della serie
    for (const [n, a, d] of data.subslots) subslots.push({ subslotId: category * 1000 + n, category, slotNumber: n, attribute: a, darklight: d });
    console.log(`${base.name}: +0..+${top}, ${data.subslots.length} sub-slot`);
  }
  rows.sort((a, b) => a.category - b.category || a.lv - b.lv);
  save(kbFile, rows);
  save(path.join(MASTER, 'keybladeSubslot.json'), subslots);
  console.log(`keyblade: ${rows.length} righe (${rows.filter((r) => r.generated).length} generate), keybladeSubslot: ${subslots.length}, avvisi ${warn}`);
}

main();
