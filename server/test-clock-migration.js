// Migrazione dei salvataggi all'orologio finto: node server/test-clock-migration.js
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-clockmig-${process.pid}.json`);
fs.writeFileSync(SAVE, JSON.stringify({
  created: true, name: 'Vecchio', medals: [
    { userMedalId: 101, medalId: 1, level: 1, getDatetime: '2021-05-15 12:00:00' },
    { userMedalId: 102, medalId: 1, level: 1, getDatetime: '2021-05-16 12:00:00' }],
  presents: [{ userPresentId: 1, resourceType: 2, resourceId: 0, number: 10, limitDatetime: '2021-06-10 00:00:00', comment: 'x', created: '2021-05-15 12:00:00' }],
  beginnerSince: '2021-05-15 12:00:00', missions: { 2001: { period: 5, count: 1, received: false } },
  pet: { training: { total: 3, monthly: 2, month: '2021-05', readyAt: Date.parse('2021-05-16T08:00:00Z'), medals: [] } },
}));
process.env.KHUX_SAVE = SAVE; process.env.KHUX_PET = '1';
delete process.env.KHUX_SERVER_TIME;
const realNowFn = Date.now; const now = Date.parse('2026-10-16T15:00:00Z'); Date.now = () => now;
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const p = t.player;
check(p.clockVersion === 1, 'migrazione non fatta');
check(p.medals[1].getDatetime === now && p.medals[0].getDatetime === now - 86400000, `getDatetime ${p.medals.map((m) => m.getDatetime)}`);
check(p.presents[0].limitDatetime === now + 29 * 86400000, 'regalo: +29 giorni');
check(p.beginnerSince === now, 'beginnerSince');
check(Object.keys(p.missions || {}).length === 0, 'contatori dei periodi non azzerati');
check(p.pet.training.readyAt === 0 && p.pet.training.month === t.clockMonthIndex(now), 'training');
check(t.outTime(p.medals[1].getDatetime) === t.serverTime(), 'uscita in ora finta');
// seconda volta: nessun cambiamento
const before = JSON.stringify(p); quiet(() => t.migrateClock());
check(JSON.stringify(p) === before, 'migrazione ripetuta');
Date.now = realNowFn;
try { fs.unlinkSync(SAVE); } catch { /* tolto */ }
if (errors.length) { log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
log('OK: migrazione');
