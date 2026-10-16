// Prova delle missioni Limited a rotazione (make-limited-missions.js, server.js limitedActive), senza client:
//
//   node server/test-limited.js [cartella master]   (default server/master_data)
//
// Controlla che:
// - in ogni mese reale sia attiva esattamente una campagna mensile, e in ogni settimana una breve, a turno;
// - /user/mission/list mandi solo le righe Limited della rotazione attiva;
// - i Lux del mese facciano completare la prima missione mensile, la riscossione dia la parte dello Spirit
//   (rewardType 33) e la risposta la riporti in pet.userPetParts;
// - il mese dopo i contatori ripartano da zero;
// - nessuna riga abbia un premio senza tipo, se non quelle dichiarate ancora da mappare.
// Non tocca server/save: KHUX_SAVE punta a un file temporaneo nuovo.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const MASTER = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
const SAVE = path.join(os.tmpdir(), `khux-test-limited-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* nuovo */ }
process.env.KHUX_MASTER_DIR = MASTER;
process.env.KHUX_SAVE = SAVE;
process.env.KHUX_PET = '1';
delete process.env.KHUX_PET_ALL_PARTS;
const log = console.log;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));

const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
function call(fn, ...args) {
  let body = null;
  const res = { writeHead() {}, end(b) { body = JSON.parse(b.toString('utf8')); } };
  quiet(() => fn(res, ...args));
  return body;
}
const realNow = Date.now;
const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };

call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
t.player.medals = t.player.medals || [];
const rows = t.masterRows('mission').filter((r) => r.missionType === 4);
const byId = new Map(rows.map((r) => [r.id, r]));
const { monthly, weekly } = t.LIMITED_ROTATION;
check(monthly.length === 35, `campagne mensili ${monthly.length}, attese 35`);
check(weekly.length >= 4, `campagne brevi ${weekly.length}`);
check(rows.length === monthly.flat().length + weekly.flat().length, 'righe del master e rotazione diverse');

// una campagna mensile e una breve per volta, tutte a turno
const seenM = new Set(), seenW = new Set();
for (let m = 0; m < 35; m++) {
  at(new Date(Date.UTC(2026, m, 10, 12)).toISOString());
  const act = monthly.map((ids, i) => (ids.every((id) => t.limitedActive(id)) ? i : -1)).filter((i) => i >= 0);
  check(act.length === 1, `mese ${m}: ${act.length} campagne mensili attive`);
  act.forEach((i) => seenM.add(i));
}
for (let w = 0; w < weekly.length; w++) {
  at(new Date(Date.UTC(2026, 9, 12, 12) + w * 7 * 86400000).toISOString());
  const act = weekly.map((ids, i) => (ids.every((id) => t.limitedActive(id)) ? i : -1)).filter((i) => i >= 0);
  check(act.length === 1, `settimana ${w}: ${act.length} campagne brevi attive`);
  act.forEach((i) => seenW.add(i));
}
check(seenM.size === 35, `mensili viste ${seenM.size}/35`);
check(seenW.size === weekly.length, `brevi viste ${seenW.size}/${weekly.length}`);

// elenco: solo le righe Limited attive
at('2026-10-16T12:00:00Z');
const list = quiet(() => t.missionsData());
const limitedIds = list.map((m) => m.id).filter((id) => byId.has(id));
const month = monthly.find((ids) => ids.every((id) => t.limitedActive(id)));
const week = weekly.find((ids) => ids.every((id) => t.limitedActive(id)));
check(limitedIds.length === month.length + week.length, `elenco: ${limitedIds.length} Limited, attese ${month.length + week.length}`);

// Lux del mese -> prima missione mensile completata -> parte dello Spirit
const first = byId.get(month[0]);
quiet(() => t.missionCount('lux', first.targetNum[0]));
const st = quiet(() => t.missionsData()).find((m) => m.id === first.id);
check(st && st.status === 1, `missione ${first.id} «${first.missionName}» non completabile (${JSON.stringify(st)})`);
const res = call(t.respondMissionReceive, { receiveMissionIds: [first.id] });
check(first.rewardType === 33, `premio della prima mensile di tipo ${first.rewardType}`);
check(res.pet.userPetParts.some((p) => p.petPartsId === first.itemId), `parte ${first.itemId} assente da pet.userPetParts`);
check(res.missions.find((m) => m.id === first.id)?.status === 2, 'missione non segnata come riscossa');
log(`riscossa «${first.missionName}»: parte ${first.itemId}, ${res.pet.userPetParts.length} parti possedute`);

// il mese dopo (stessa campagna fra 35 mesi): contatori azzerati
at(new Date(Date.UTC(2026, 9 + 35, 16, 12)).toISOString());
const again = quiet(() => t.missionsData()).find((m) => m.id === first.id);
check(again && again.status === 0 && again.numUpper === 0, `al ritorno della campagna stato ${JSON.stringify(again)}`);

const untyped = rows.filter((r) => !r.rewardType).map((r) => `${r.id} ${r.missionName}`);
log(`premi ancora senza tipo: ${untyped.length}${untyped.length ? ' (' + untyped.join('; ') + ')' : ''}`);

Date.now = realNow;
try { fs.unlinkSync(SAVE); } catch { /* gia' tolto */ }
if (errors.length) { log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
log(`OK: ${rows.length} righe Limited, ${monthly.length} mensili e ${weekly.length} brevi a rotazione`);
