// Skill delle medaglie (abilita' passive, tabella skill) e Overwrite Skill del Level Up (I-088).
// Usato da server.js (userMedals/userSkills, POST /user/medal/enhance): docs/notes/medaglie.md#skill.
//
// Regole (khuxwiki «Medal» sezione Skills e «Scrooge», kingdomhearts.fandom «Medals», testi del
// client 101300020-032, medalMisc 121/122) e comportamento del client 4.3.1:
// - una medaglia ha al massimo una skill (il client ne accetta 2: userMedal.userSkills = id).
//   L'oggetto della skill {userSkillId, skillId, level, exp, userMedalId, getDatetime}
//   (FUN_0078e7b8) arriva nella lista userSkills della risposta (FUN_0078e934) e il client lo cerca
//   per userSkillId (FUN_00eb76f0, tabella della sessione +0x1c8): un id senza oggetto = riga
//   skill 0 = crash, quindi la lista va mandata intera.
// - richiesta: isOverwriteSkill 0/1 (FUN_007e3bbc), nessuna skill scelta: vale la skill del
//   materiale piu' a sinistra (componentUserMedalIds[0]).
// - probabilita' (FUN_00c8151c, «Success Rate %d%%»): per ogni skill dei materiali con la stessa
//   categoryEvolve della skill del primo materiale si somma
//   min + (max - min) * (lv - 1) / (maxLv - 1)   (medalMisc 121 = 2000, 122 = 10000)
//   per il moltiplicatore della campagna (scena +0x5e0, 10000 senza campagne) / 10000; limite 100%.
//   Skill al livello 1 = 20%, al massimo = 100% (Scrooge, sempre al massimo: 100%).
// - riuscita: la base prende la skill del primo materiale con livello ed EXP (la sostituisce se ne
//   aveva una); fallita o Overwrite spento: la base tiene la sua, le skill dei materiali si perdono
//   (101300031/032). Risposta: overwriteSkills = [skill nuova della base], successOverwrite 1.
'use strict';

// Le Scrooge (type 2, «grants a skill») hanno una skill al livello massimo. Quale skill avesse ogni
// Scrooge non si sa (dipendeva dal premio del Colosseo/evento): ipotesi deterministica per rarita'
// (3★ rango 1, 5★ rango 2, 6★ rango 3) scelta con userMedalId. userSkillId calcolato, non salvato.
const SCROOGE_SKILL_BASE = 1000000000;
const SCROOGE_RANK = { 3: 1, 5: 2, 6: 3 };

function isSkillMedal(row) {
  return !!row && row.type === 2 && /grants a skill/i.test(row.advantage || '');
}

function scroogeSkill(row, userMedalId, skills) {
  if (!isSkillMedal(row) || !skills.length) return null;
  const rank = SCROOGE_RANK[row.rare] || 1;
  let pool = skills.filter((s) => s.rank === rank);
  if (!pool.length) pool = skills;
  pool = [...pool].sort((a, b) => a.skillId - b.skillId);
  const s = pool[userMedalId % pool.length];
  return { userSkillId: SCROOGE_SKILL_BASE + userMedalId, skillId: s.skillId, level: s.maxLv, exp: 0 };
}

// probabilita' (0..1) di una skill, come FUN_00c8151c
function skillChance(skillRow, level, min, max, campaign = 10000) {
  if (!skillRow) return 0;
  const den = (skillRow.maxLv || 1) - 1;
  const t = den > 0 ? (Math.min(level, skillRow.maxLv) - 1) / den : 1;
  const rate = Math.trunc(min + Math.trunc((max - min) * t));
  return Math.trunc(rate * campaign / 10000) / 10000;
}

// comps: [{skill}] nell'ordine delle celle (skill = oggetto o null). Restituisce la skill del
// primo materiale e la probabilita' totale, oppure null se il primo materiale non ne ha.
function overwriteChance(comps, skillRows, min, max) {
  const first = comps[0]?.skill;
  const firstRow = first && skillRows.get(first.skillId);
  if (!firstRow) return null;
  let p = 0;
  for (const c of comps) {
    const r = c.skill && skillRows.get(c.skill.skillId);
    if (r && r.categoryEvolve === firstRow.categoryEvolve) p += skillChance(r, c.skill.level, min, max);
  }
  return { skill: first, chance: Math.min(1, p) };
}

module.exports = { SCROOGE_SKILL_BASE, isSkillMedal, scroogeSkill, skillChance, overwriteChance };
