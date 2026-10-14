// Buff e debuff degli attacchi speciali (I-124): le righe burst ricostruite avevano tutti i campi
// buf*/debuf* a 0, quindi nessuno speciale alzava o abbassava STR/DEF e le icone BIcon/DIcon
// non comparivano mai. Fonte: Ability.SelfBuffs/EnemyBuffs di Roboloid (gli stessi effetti del
// testo «1 turn: ↑ STR ..., ↓ target's DEF ...» della khuxwiki), una voce per medaglia.
// Codifica dei campi ricavata dalle righe originali di thethiny (formato vecchio, 294 medaglie
// accoppiate con Roboloid, docs/notes/battaglia.md#buff-degli-speciali):
// - codice <tipo><stat>: tipo G generale, P/S/M Power/Speed/Magic, U/R Upright/Reversed; stat A =
//   STR (bufAttack*), D = DEF (bufDefense*). Es. BuffGA -> bufAttack, BuffMD -> bufDefenseMagic.
// - buff su di se' = +livelli (Judy & Nick: bufAttack 1, bufDefense 1); debuff su di se' = livelli
//   negativi negli stessi campi (KH CoM Black Coat Riku «in exchange for defense»: bufDefense -3);
//   debuff sul bersaglio = -livelli (Megara: debufDefense -1), nei campi *All se l'attacco colpisce
//   tutti (target 2, Halloween Goofy: debufDefensePowerAll -1).
// - durata: DurationType Turn -> addTurn, Attack -> addCount (Pence: 1 livello per 2 attacchi =
//   bufAttack 1, addCount 2). Un solo campo durata per riga: vale la durata piu' lunga.
// - HPRecovery -> heal/healShake (Jiminy Cricket 2500-3000 «slightly», Tinker Bell 3700-4000
//   «moderately»); Esuna -> cure* 1 (Abu); Dispel del bersaglio -> resetDebuf* 1, *All su tutti
//   (Alice, Belle); AttributeAlways Neutral -> attribute 5 (Shadow).
// Dove thethiny ha la riga originale dello stesso burstId con la stessa descrizione, i suoi campi
// d'effetto vincono (valori veri, es. le cure per livello).
// Restano fuori (codifica non ancora verificata nel client): GuiltBuff (SP ATK B +N%),
// GaugeRecovery, Counter (countdown), CriticalChance, HPDrain, Mirror, Copy, Reflect, STRPlus.
const KIND = { G: '', P: 'Power', S: 'Speed', M: 'Magic', U: 'Upright', R: 'Reverse' };
const STAT = { A: 'Attack', D: 'Defense' };
const CURES = ['curePoison', 'cureSleep', 'cureDeepPoison', 'cureParalysis'];
const DISPEL = ['resetDebufAttack', 'resetDebufDefense', 'resetDebufAttackPower', 'resetDebufDefensePower',
  'resetDebufAttackSpeed', 'resetDebufDefenseSpeed', 'resetDebufAttackMagic', 'resetDebufDefenseMagic'];
// cura per aggettivo / «HP recovery LV n» (originali: slightly 2500-3000, moderately 3700-4000;
// i livelli 3-4 e MAX proseguono la scala, da verificare)
const HEAL = [[/HP MAX/i, 10000], [/significantly|LV 4/i, 6000], [/greatly|LV 3/i, 5000],
  [/moderately|LV 2/i, 4000], [/slightly|LV 1/i, 3000]];
// campi d'effetto copiati dalle righe originali
const EFFECT = /^(buf|debuf|addTurn$|addCount$|heal$|healShake$|cure|resetBuf|resetDebuf|copyBuf)/;

function buffFields(ability, target) {
  const out = {};
  const skipped = [];
  let turns = 0;
  let attacks = 0;
  const all = target === 2 ? 'All' : '';
  const dur = (v) => {
    if (v.DurationType === 'Turn') turns = Math.max(turns, v.DurationCount || 1);
    else if (v.DurationType === 'Attack') attacks = Math.max(attacks, v.DurationCount || 1);
  };
  const text = ability.Text || '';
  for (const [code, v] of Object.entries(ability.SelfBuffs || {})) {
    const m = /^(Buff|Debuff)([GPSMUR])([AD])$/.exec(code);
    if (m && v && v.BuffCount) {
      out[`buf${STAT[m[3]]}${KIND[m[2]]}`] = m[1] === 'Buff' ? v.BuffCount : -v.BuffCount;
      dur(v);
    } else if (code === 'HPRecovery') {
      const h = HEAL.find(([re]) => re.test(text));
      Object.assign(out, { heal: h ? h[1] : 3000, healShake: 500 });
    } else if (code === 'Esuna') for (const k of CURES) out[k] = 1;
    else if (code === 'AttributeAlways' && v === 'Neutral') out.attribute = 5;
    else skipped.push(code);
  }
  for (const [code, v] of Object.entries(ability.EnemyBuffs || {})) {
    const m = /^Debuff([GPSMUR])([AD])$/.exec(code);
    if (m && v && v.BuffCount) {
      out[`debuf${STAT[m[2]]}${KIND[m[1]]}${all}`] = -v.BuffCount;
      dur(v);
    } else if (code === 'Dispel') for (const k of DISPEL) out[k + all] = 1;
    else skipped.push('E.' + code);
  }
  // medaglie senza dati strutturati su Roboloid: solo il testo
  if (!ability.SelfBuffs && !ability.EnemyBuffs) {
    if (/Cures own status ailments/i.test(text)) for (const k of CURES) out[k] = 1;
    if (/in exchange for defense/i.test(text)) {
      out.bufDefense = -3;
      turns = 2;
    }
  }
  if (turns) out.addTurn = turns;
  else if (attacks) out.addCount = attacks;
  return { out, skipped };
}

// medals: righe medal; bursts: righe burst (modificate sul posto); roboOf(medal) -> voce Roboloid;
// orig: Map burstId -> riga burst originale (thethiny), facoltativa
function applyBurstBuffs(medals, bursts, roboOf, orig = new Map()) {
  const byId = new Map(bursts.map((b) => [b.burstId, b]));
  const done = new Map();          // burstId -> JSON dei campi (per i conflitti tra medaglie)
  const stats = { rows: 0, fromOrig: 0, conflicts: 0, skipped: {} };
  for (const m of medals) {
    const b = m.validBurst && byId.get(m.burstId);
    const d = b && roboOf(m);
    if (!d || !d.Ability) continue;
    let { out, skipped } = buffFields(d.Ability, b.target);
    const o = orig.get(b.burstId);
    if (o && o.description && o.description === d.Ability.Text) {
      out = Object.fromEntries(Object.entries(o).filter(([k, v]) => EFFECT.test(k) && Number(v)));
      if (o.attribute === 5) out.attribute = 5;
      stats.fromOrig++;
    }
    for (const s of skipped) stats.skipped[s] = (stats.skipped[s] || 0) + 1;
    if (!Object.keys(out).length) continue;
    const key = JSON.stringify(out);
    if (done.has(b.burstId)) {
      if (done.get(b.burstId) !== key) stats.conflicts++;
      continue;
    }
    done.set(b.burstId, key);
    Object.assign(b, out);
    stats.rows++;
  }
  return stats;
}

module.exports = { buffFields, applyBurstBuffs };
