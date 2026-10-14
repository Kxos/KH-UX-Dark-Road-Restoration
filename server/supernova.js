// Supernova (I-124): Evolve verso le medaglie SN/Supernova con le medaglie richieste.
// khuxwiki, pagina di ogni medaglia: «X can be evolved into '''SN - X''' by using 5 non-boosted 7★
// X Medals» (5 copie della stessa medaglia) e «SN - X can be evolved into '''SN+ - X''' by using 5
// {{b|Dual Meow Wow|SAB LV n}} Medals». Dual Meow Wow [SAB LV 7/8/9]: medaglie di supporto
// (Roboloid 1682-1684, «Grants Supernova to or strengthens the Supernova of specific Medals with an
// SP attack bonus LV of n»), materiale di Evolve come Magic Broom (medal-guilt.js). Il client legge
// validEvolveNeed (quante) ed evolveNeedId[5] (quali), come per Fantasia Mickey A + 5 Magic Broom.
const MEOW = { 7: 301682, 8: 301683, 9: 301684 };
const MEOW_ALBUM = { 7: 1626, 8: 1627, 9: 1628 };

// righe dei tre Dual Meow Wow, copiate dalla riga di Magic Broom (supporto, impilabile)
function meowRows(medalRows, broomId) {
  const broom = medalRows.find((r) => r.medalId === broomId);
  if (!broom) return [];
  const have = new Set(medalRows.map((r) => r.medalId));
  return Object.entries(MEOW).filter(([, id]) => !have.has(id)).map(([lv, id]) => ({
    ...broom, medalId: id, imageId: id, thumbId: id, cutinId: id, artId: id, displayId: id,
    sortId: MEOW_ALBUM[lv], listSortId: MEOW_ALBUM[lv],
    name: `Dual Meow Wow [SAB LV ${lv}]`,
    flavor: 'KINGDOM HEARTS 3D (2012)\n\nAn adorable Dream Eater that attacks\nwith its cute little horn.',
    advantage: `Grants Supernova to or strengthens the\nSupernova of specific Medals with an\nSP attack bonus LV of ${lv}.`,
    rare: 6, darklight: 1,
  }));
}

// regole dalla wiki: [{from, to, n, kind: 'self' | 'meow7' | 'meow8' | 'meow9'}]
function evolveRules(wiki) {
  const re = /(?:'''|\b)([^.\n']+?)(?:''')? can be evolved into '''([^']+)''' by using (\d+) ([^.\n]+?) Medals?\./g;
  const rules = [];
  for (const text of Object.values(wiki)) {
    for (const [, from, to, n, what] of text.matchAll(re)) {
      if (!/^(SN\+*|Supernova\+*) - /.test(to)) continue;
      const meow = /Dual Meow Wow\|SAB LV (\d+)/.exec(what);
      const kind = meow ? 'meow' + meow[1] : /non-boosted/.test(what) ? 'self' : null;
      if (kind) rules.push({ from: from.replace(/\{\{kh\|([^}]*)\}\}/g, '$1').trim(), to, n: Number(n), kind });
    }
  }
  return rules;
}

// applica le regole alle righe medal (sul posto). La medaglia di partenza e' quella che precede la
// destinazione nella catena Reference di Roboloid (le righe 300000 + id); torna le statistiche
function applyEvolveRules(medalRows, rules, robo) {
  const byId = new Map(medalRows.map((r) => [r.medalId, r]));
  const roboByName = new Map();
  for (const d of robo) if (!roboByName.has(d.Name)) roboByName.set(d.Name, d);
  const stats = { applied: 0, missing: 0 };
  for (const r of rules) {
    const d = roboByName.get(r.to);
    const chain = d && d.Reference || [];
    const prev = chain[chain.indexOf(d && d.ID) - 1];
    const from = prev && byId.get(300000 + prev);
    const to = d && byId.get(300000 + d.ID);
    const need = r.kind === 'self' ? from && from.medalId : MEOW[r.kind.slice(4)];
    if (!from || !to || !need || !byId.has(need)) { stats.missing++; continue; }
    Object.assign(from, { validEvolve: 1, evolveId: to.medalId, validEvolveNeed: r.n,
      evolveNeedId: Array.from({ length: 5 }, (_, i) => (i < r.n ? need : 0)) });
    stats.applied++;
  }
  return stats;
}

// Attacchi Supernova. Il client (FUN_00b11f64) usa la riga burst di superBurstId al posto di
// burstId quando la medaglia lancia la Supernova; il pulsante sotto il Burst compare per ogni
// medaglia del deck con validSuperBurst e superBurstId (FUN_00af14e0), una volta per missione.
// Fonte: blocco Supernova di Roboloid (nome, testo, Multi, Timing, bersaglio, buff), uguale alla
// tabella «List of Supernovas» della khuxwiki. Una riga per medaglia, burstId 4000000 + id
// Roboloid (SN e SN+ hanno moltiplicatori diversi). superburstTiming = slot prima del quale scatta
// in difesa nel PvP. Animazioni: le 51 abl_500N1 servite (con eff_500N1, o la precedente se manca),
// assegnate in ordine di uscita (numero d'album) a ogni Supernova diversa: l'abbinamento originale
// medaglia -> animazione non e' in nessun dato disponibile.
const SN_MOTIONS = [];
for (let n = 1; n <= 52; n++) if (n !== 43) SN_MOTIONS.push(50000 + n * 10 + 1);
const SN_EFFECTS = new Set([50011, 50041, 50051, 50061, 50081, 50111, 50121, 50131, 50141, 50151, 50191,
  50201, 50211, 50221, 50231, 50241, 50251, 50261, 50271, 50301, 50311, 50321, 50331, 50351, 50361,
  50371, 50381, 50391, 50401, 50411, 50421, 50441, 50451, 50461, 50471, 50481, 50491, 50501, 50511, 50521]);
const effectFor = (motion) => {
  let e = motion;
  while (e > 50011 && !SN_EFFECTS.has(e)) e -= 10;
  return 100000 + e;
};

function supernovaBursts(medalRows, burstRows, robo, buffFields) {
  const byBurst = new Map(burstRows.map((b) => [b.burstId, b]));
  const zero = (v) => (Array.isArray(v) ? v.map(zero) : typeof v === 'string' ? '' : 0);
  const blankRow = Object.fromEntries(Object.entries(burstRows[0]).map(([k, v]) => [k, zero(v)]));
  const sn = robo.filter((d) => d.Supernova).sort((a, b) => a.AlbumNum - b.AlbumNum);
  const motionOf = new Map();
  for (const d of sn) if (!motionOf.has(d.Supernova.Name)) motionOf.set(d.Supernova.Name, SN_MOTIONS[motionOf.size % SN_MOTIONS.length]);
  const medalById = new Map(medalRows.map((m) => [m.medalId, m]));
  const rows = [];
  for (const d of sn) {
    const m = medalById.get(300000 + d.ID);
    if (!m) continue;
    const s = d.Supernova;
    const id = 4000000 + d.ID;
    const target = /single/i.test(s.Target || '') ? 1 : 2;
    const power = Math.round((s.Multi || 100) * 10000);
    const motion = motionOf.get(s.Name);
    const row = Object.assign({}, blankRow, {
      burstId: id, motionId: motion, effectId: effectFor(motion), distance: (byBurst.get(m.burstId) || {}).distance || 250,
      name: s.Name, description: s.Text || '', target, hitCount: s.Hits || 1, gauge: 0, criticalPower: 10000,
      displayPower: power, basePower: power, displayPowerPerEnforce: [1, 1, 1, 1, 1], basePowerPerEnforce: [1, 1, 1, 1, 1],
      damageType: 1, specialPowerType: 1, superburstTiming: s.Timing || 0,
    }, buffFields(s, target).out);
    rows.push(row);
    Object.assign(m, { validSuperBurst: 1, superBurstId: id });
    // Badge sulla medaglia (FUN_0073eaf0, displayId): 100/200/300 -> img/ui/SBurst_Icon1/2/3
    // (SN, SN+, SN++), +1000 -> variante ...R (Supernova che rinnova le altre).
    const plus = /^(?:SN|Supernova)(\+*)\s*-/.exec(m.name);
    if (plus) m.displayId = 100 * Math.min(plus[1].length + 1, 3) + (row.recurringAttribute ? 1000 : 0);
  }
  return rows;
}

module.exports = { MEOW, meowRows, evolveRules, applyEvolveRules, supernovaBursts };
