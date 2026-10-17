// Estrazioni dello Shop: funzioni pure (docs/notes/shop.md, spec 2026-10-16-shop-banner-design.md 9.2/9.3).
// Il catalogo dei banner (server/game_data/gacha_catalog.json) lo scrive recon/tools/make_banner_catalog.py:
// per ogni banner una ricetta del pool (sotto-set, nomi, vetrina, garanzie) che qui si espande alla data
// di riferimento (inizio del banner; per i permanenti il punto della storia del giocatore).
'use strict';
const fs = require('fs');

const CATALOG_ID = 9001;
// Probabilita' RICOSTRUITE (spec 9.2): lo slot r★ sale di una stella con UPGRADE[r] se quella
// stella ha medaglie nel pool (cioe' era estraibile alla data del banner); i banner «Epic» del 2016
// mandano 3★/4★ a 5★ con EPIC_UPGRADE. Negli slot a lista la medaglia in vetrina pesa FEATURED_WEIGHT.
const UPGRADE = { 3: 0.10, 4: 0.06, 5: 0.04, 6: 0.03 };
const EPIC_UPGRADE = 0.15;
const FEATURED_WEIGHT = 2;
const EMPTY = () => ({ banners: [], subsets: {}, medals: {}, firstRarity: {}, story: [] });

// «4★:1 3★:2 Other:1» -> [[4,1],[3,2]]: le voci senza ★ (Other) sono ignorate; ordine decrescente.
function parseRarityMix(s) {
  const out = [];
  for (const m of String(s || '').matchAll(/(\d)★:(\d+)/g)) out.push([Number(m[1]), Number(m[2])]);
  return out.sort((a, b) => b[0] - a[0]);
}

// Una rarita' per slot, nell'ordine del mix. Slot mancanti: rarita' piu' bassa del mix; in eccesso: tagliati.
function slotRarities(banner) {
  const slots = [];
  for (const [rare, n] of banner.rarityMix) for (let k = 0; k < n; k++) slots.push(rare);
  const low = slots.length ? slots[slots.length - 1] : 3;
  while (slots.length < banner.lotCount) slots.push(low);
  return slots.slice(0, banner.lotCount);
}

// Legge il catalogo; vuoto ma valido se il file manca, non e' JSON o non ha «banners».
// I campi in piu' del catalogo vero (version, statistiche) restano.
function loadCatalog(file) {
  try {
    const c = JSON.parse(fs.readFileSync(file, 'utf8'));
    return c && Array.isArray(c.banners) ? { ...EMPTY(), ...c } : EMPTY();
  } catch {
    return EMPTY();
  }
}

// Data della tranche della storia che contiene la quest (la prima se quest < 1, l'ultima oltre la fine).
function storyDay(catalog, quest) {
  const s = catalog.story || [];
  if (!s.length) return '2016-04-07';
  const row = s.find(([a, b]) => quest >= a && quest <= b);
  return row ? row[2] : (quest < s[0][0] ? s[0][2] : s[s.length - 1][2]);
}

// Data di riferimento del pool: inizio del banner; i PERMANENT seguono il giocatore, limitati a [inizio, fine].
function asOf(banner, day) {
  if (!(banner.flags || []).includes('PERMANENT')) return banner.start;
  const end = banner.end || '2099-12-31';
  return day < banner.start ? banner.start : day > end ? end : day;
}

// Espande la ricetta del pool alla data `at` (spec 9.3). Vetrina, garanzie e pool.names entrano sempre;
// le medaglie dei sotto-set passano da pool.filter (origin o att, contract-ext 4); i modi released/inherit
// aggiungono le medaglie std uscite entro `at` (inherit: solo dopo inheritAfter). Rarita': quelle del mix
// (se gia' uscite: firstRarity) piu' la stella sopra se gia' uscita; ogni variante solo se uscita entro `at`.
// listNames/featuredNames: [[nome, peso, {rare: [ids]}]] per gli slot a lista e della pity (solo i nomi con
// almeno una variante nel pool; in lista la vetrina pesa FEATURED_WEIGHT, nella pity tutte 1).
function expandPool(banner, catalog, at) {
  const p = banner.pool || {};
  if (p.mode === 'evolve') {
    const ev = p.evolve || [];
    const top = Math.max(...ev.map(([, lv]) => lv));
    const rest = ev.length > 1 ? 0.9 / (ev.length - 1) : 1;
    const weighted = ev.map(([id, lv]) => [id, ev.length > 1 ? (lv === top ? 0.1 : rest) : 1]);
    return { pool: {}, featuredIds: [], listIds: [], listNames: [], featuredNames: [], weighted };
  }
  const medals = catalog.medals || {};
  const names = new Set([...(p.names || []), ...(p.featured || []), ...(banner.guarantee?.list || [])]);
  const filter = p.filter || [];
  const passes = (m) => !filter.length || filter.includes(m.origin) || filter.includes(m.att);
  for (const s of p.sets || []) {
    const sub = (catalog.subsets || {})[s];
    if (!sub || sub.date > at) continue;
    for (const n of sub.names) if (medals[n] && passes(medals[n])) names.add(n);
  }
  if (p.mode === 'released' || p.mode === 'inherit') {
    const after = p.mode === 'inherit' ? p.inheritAfter || '' : '';
    for (const [n, m] of Object.entries(medals)) if (m.std && m.date > after && m.date <= at) names.add(n);
  }
  const first = catalog.firstRarity || {};
  const out = (r) => first[r] && first[r] > at;
  const rarities = new Set(banner.rarityMix.map(([r]) => r).filter((r) => !out(r)));
  for (const [r] of banner.rarityMix) if (first[r + 1] && first[r + 1] <= at) rarities.add(r + 1);
  const feat = new Set(p.featured || []), list = new Set(banner.guarantee?.list || []);
  const pool = {}, featuredIds = new Set(), listIds = new Set(), byName = new Map();
  for (const n of names) {
    for (const [id, rare, rd] of medals[n]?.ids || []) {
      if (!rarities.has(rare) || rd > at) continue;
      (pool[rare] ||= new Set()).add(id);
      if (!byName.has(n)) byName.set(n, {});
      (byName.get(n)[rare] ||= new Set()).add(id);
      if (feat.has(n)) featuredIds.add(id);
      if (list.has(n)) listIds.add(id);
    }
  }
  const sorted = (s) => [...s].sort((a, b) => a - b);
  const bySets = (o) => Object.fromEntries(Object.entries(o).map(([r, s]) => [r, sorted(s)]));
  const named = (ns, w) => [...new Set(ns)].filter((n) => byName.has(n)).map((n) => [n, w(n), bySets(byName.get(n))]);
  return {
    pool: bySets(pool), featuredIds: sorted(featuredIds), listIds: sorted(listIds),
    listNames: named(banner.guarantee?.list || [], (n) => (feat.has(n) ? FEATURED_WEIGHT : 1)),
    featuredNames: named(p.featured || [], () => 1), weighted: [],
  };
}

const poolOf = (pool, rare) => pool[rare] || pool[String(rare)] || [];
const pickIndex = (n, rng) => Math.min(n - 1, Math.floor(rng() * n));
function pickWeighted(items, rng) {
  const tot = items.reduce((s, [, w]) => s + w, 0);
  let x = rng() * tot;
  for (const [id, w] of items) { if ((x -= w) < 0) return id; }
  return items[items.length - 1][0];
}
// salita dello slot: { to, p } oppure null
function upgradeOf(banner, pool, rare) {
  if (banner.epicBoost && rare < 5 && poolOf(pool, 5).length) return { to: 5, p: EPIC_UPGRADE };
  if (UPGRADE[rare] && poolOf(pool, rare + 1).length) return { to: rare + 1, p: UPGRADE[rare] };
  return null;
}
// Uno slot: prima la promozione (rng), poi l'indice; se la stella estratta e' vuota scende alla prima piena.
function pickSlot(banner, pool, rare, rng) {
  const up = upgradeOf(banner, pool, rare);
  let r = up && rng() < up.p ? up.to : rare;
  while (r >= 1 && !poolOf(pool, r).length) r--;
  const list = poolOf(pool, r);
  if (!list.length) throw new Error(`banner ${banner.drawMedalTypeId}: pool vuoto per ${rare}★`);
  return list[pickIndex(list.length, rng)];
}
// Slot a lista o della pity: prima la medaglia per nome (pesi di `names`), poi la variante alla stella
// dello slot con la salita dello slot normale se la medaglia ha la stella sopra; se la medaglia non ha
// la stella dello slot prende la variante piu' vicina (prima la piu' alta sotto, poi la piu' bassa sopra).
function pickNamed(banner, names, rare, rng) {
  const [, , v] = names[pickWeighted(names.map((x, i) => [i, x[1]]), rng)];
  const up = upgradeOf(banner, v, rare);
  const want = up && rng() < up.p ? up.to : rare;
  const have = Object.keys(v).map(Number).filter((r) => poolOf(v, r).length);
  const below = have.filter((r) => r <= want), above = have.filter((r) => r > want);
  const r = below.length ? Math.max(...below) : Math.min(...above);
  const list = poolOf(v, r);
  return list[pickIndex(list.length, rng)];
}

// Estrazione di un banner espanso (ex = expandPool). state = estrazioni gia' fatte dal giocatore su
// quel banner: draws (totale) e sinceFeatured (di fila senza vetrina). Pity: alla pity-esima estrazione
// senza vetrina il primo slot da' la vetrina; every: ogni every-esima estrazione gli slot a lista.
function rollDraw(banner, ex, rng, state = { draws: 0, sinceFeatured: 0 }) {
  if (banner.pool?.mode === 'evolve') {
    if (!ex.weighted.length) throw new Error(`banner ${banner.drawMedalTypeId}: evolve senza medaglie`);
    return { medalIds: Array.from({ length: banner.lotCount }, () => pickWeighted(ex.weighted, rng)), featured: false };
  }
  const g = banner.guarantee || {};
  const n = (state.draws || 0) + 1;
  const listOn = (ex.listNames || []).length > 0 && (g.every ? n % g.every === 0 : true);
  const listSlots = listOn ? Math.max(1, g.count || 1) : 0;
  const pityOn = !!g.pity && (ex.featuredNames || []).length > 0 && (state.sinceFeatured || 0) + 1 >= g.pity;
  const medalIds = slotRarities(banner).map((rare, i) => {
    if (i === 0 && pityOn) return pickNamed(banner, ex.featuredNames, rare, rng);
    if (i < listSlots) return pickNamed(banner, ex.listNames, rare, rng);
    return pickSlot(banner, ex.pool, rare, rng);
  });
  return { medalIds, featured: medalIds.some((id) => ex.featuredIds.includes(id)) };
}

// Probabilita' per slot (percento, 2 decimali) per Draw Odds; negli slot a lista le stesse salite dello
// slot normale, con list: true su ogni voce.
function slotOdds(banner, ex) {
  const listSlots = (ex.listNames || []).length ? Math.max(1, banner.guarantee?.count || 1) : 0;
  const r2 = (x) => Math.round(x * 10000) / 100;
  return slotRarities(banner).map((rare, i) => {
    const up = upgradeOf(banner, ex.pool, rare);
    const odds = up ? [{ rare, pct: r2(1 - up.p) }, { rare: up.to, pct: r2(up.p) }] : [{ rare, pct: 100 }];
    return i < listSlots ? odds.map((o) => ({ list: true, ...o })) : odds;
  });
}

// Abilita' (spec 9.2; notice 50106 VIP Daily Skills to Thrill e 72415 SN+ Falling Price): solo le skill
// che esistono in skill.json, il resto della probabilita' va a «nessuna skill»; per 50106 lo slot ha
// sempre una skill, quindi le probabilita' si riscalano sulle skill presenti. Skill al livello 1.
const SKILL_TABLES = {
  50106: [['Attack Boost II', 5], ['Attack Boost All II', 5], ['Attack Prize Plus', 5], ['Lux Plus', 5], ['Defense Boost II', 5], ['No Cost', 1.70394]],
  72415: [['Attack Boost I', 1.68421], ['Attack Boost All I', 1.26315], ['Poison', 1.26315], ['Paralysis', 1.26315], ['Sleep', 1.26315], ['Defense Boost I', 1.26315]],
};
function rollSkill(spec, slotIndex, skillRows, rng) {
  if (!spec || !SKILL_TABLES[spec.table] || (spec.slots === 'first' && slotIndex !== 0)) return null;
  const byName = new Map([...skillRows.values()].map((r) => [r.name, r.skillId]));
  const items = SKILL_TABLES[spec.table].filter(([n]) => byName.has(n)).map(([n, pct]) => [byName.get(n), pct]);
  if (!items.length) return null;
  if (spec.slots === 'first') return pickWeighted(items, rng);
  let x = rng() * 100;
  for (const [id, pct] of items) { if ((x -= pct) < 0) return id; }
  return null;
}

// Riga del master drawMedalType (47 campi, recon/out/master_types_ww431.json; parser [fn]).
// bannerUrl/detailUrl sono percorsi: server.js (servedMasterRows) ci mette davanti l'indirizzo http.
// drawType 1; benefitId 0 (il lucchetto apre l'acquisto in-app: crash, I-134); comment = striscia
// scorrevole sotto il banner, stringa printf (niente % sciolti), visibile con warrantDisplayOfTime 1
// e userWarrantDisplayOfTime 1 nella lista (spike del 16-10, prova 3).
function drawMedalTypeRow({ drawMedalTypeId, name, payType, price, sortId, bannerUrl, detailUrl, comment }) {
  const z = (n) => Array(n).fill(0);
  return {
    drawMedalTypeId, drawType: 1, sortId, name, benefitId: 0, payType, price,
    validFluctuationPrice: 0, fluctuationPrice: z(5), tableId: 0, validLot: 0, lotName: ['', '', ''],
    lotCount: z(3), lotSsr: z(3), lotPsr: z(3), lotSr: z(3), lotPr: z(3), lotR: z(3), lotPn: z(3), lotN: z(3),
    tableIds: z(3), vipcoinNumber: 0, limitedvipcoinNumber: 0, validAdd: 0, addType: 0, addId: 0, addSkillType: 0,
    addSkillId: 0, addSkillLv: 0, addNum: 0, bannerUrl, mypageBanner: 0, detailUrl, dayCount: 0,
    warrantNumberOfTime: 0, warrantDisplayOfTime: 1, validComment: 1, comment: String(comment).replace(/%/g, '%%'),
    warrantCounterId: 0, warrantTableIds: 0, warrantMedalListIds: [0], warrantMedalRepeat: 0,
    warrantResetMedalListIds: z(10), displayTimeLeft: 0, startDate: '2016-04-07 00:00:00',
    endDate: '2099-12-31 23:59:59', isDeleted: 0,
  };
}

// «once per day» (dayLimit 1 o Free Deal VIP) o «N times per day»; '' senza limite
const limitText = (b) => (b.vipFree || b.dayLimit === 1 ? 'once per day' : b.dayLimit ? `${b.dayLimit} times per day` : '');

const bannerById = (list, id) => list.find((b) => b.drawMedalTypeId === Number(id));

module.exports = {
  CATALOG_ID, UPGRADE, EPIC_UPGRADE, FEATURED_WEIGHT, SKILL_TABLES, parseRarityMix, slotRarities, loadCatalog, storyDay,
  asOf, expandPool, limitText, slotOdds, rollDraw, rollSkill, drawMedalTypeRow, bannerById,
};
