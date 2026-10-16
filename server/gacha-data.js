// Estrazioni dello Shop: funzioni pure (docs/notes/shop.md, spec 2026-10-16-shop-banner-design.md 4.8).
// Il catalogo dei banner (server/game_data/gacha_banners.json) lo scrive server/make-banners.js.
// Probabilita' RICOSTRUITE (l'originale pubblicava solo la composizione): ogni slot ha la rarita'
// del mix originale (banners_ww.tsv, es. «4★:1 3★:2») e UPGRADE_CHANCE di salire di una stella se il
// pool ne ha; le tabelle per tipo di banner arrivano col sotto-progetto 2.
'use strict';
const fs = require('fs');

const CATALOG_ID = 9001;
const UPGRADE_CHANCE = 0.08;

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

const poolOf = (banner, rare) => banner.pool[rare] || banner.pool[String(rare)] || [];

// Probabilita' per slot (in percento): rarita' base, con UPGRADE_CHANCE di salire di una stella
// se il pool della stella superiore non e' vuoto.
function slotOdds(banner) {
  return slotRarities(banner).map((rare) => {
    if (!poolOf(banner, rare + 1).length) return [{ rare, pct: 100 }];
    const up = Math.round(UPGRADE_CHANCE * 100);
    return [{ rare, pct: 100 - up }, { rare: rare + 1, pct: up }];
  });
}

// Estrazione di un banner: per ogni slot, prima la promozione (rng), poi l'indice nel pool.
// Se il pool della rarita' estratta e' vuoto, scende alla stella inferiore col pool non vuoto.
// Restituisce i medalId (lunghezza lotCount); lancia un errore se nessuna stella ha pool.
function rollDraw(banner, rng) {
  return slotRarities(banner).map((rare) => {
    let r = rare;
    if (poolOf(banner, rare + 1).length && rng() < UPGRADE_CHANCE) r = rare + 1;
    while (r >= 1 && !poolOf(banner, r).length) r--;
    const list = poolOf(banner, r);
    if (!list.length) throw new Error(`banner ${banner.drawMedalTypeId}: pool vuoto per ${rare}★`);
    return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  });
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

// Legge il catalogo dei banner; [] se il file manca o non e' un JSON valido con «banners».
function loadBanners(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data.banners) ? data.banners : [];
  } catch {
    return [];
  }
}

const bannerById = (list, id) => list.find((b) => b.drawMedalTypeId === Number(id));

module.exports = { CATALOG_ID, UPGRADE_CHANCE, parseRarityMix, slotRarities, slotOdds, rollDraw, drawMedalTypeRow, loadBanners, bannerById };
