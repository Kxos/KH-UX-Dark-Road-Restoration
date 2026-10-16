// Master servito con l'orologio finto: node server/test-master-clock.js
'use strict';
process.env.KHUX_REVISION = '117';
delete process.env.KHUX_SERVER_TIME;
const realNowFn = Date.now; const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };
at('2026-10-16T15:00:00Z');
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };

const rev = t.masterRevisionNow();
check(rev > 117 * 100000, `revisione ${rev}`);
const m = call(t.respondMaster);
check(m.master.revision === rev && m.mission.revision === rev, 'revisione nel master');
const rows = t.servedMasterRows('mission', Date.now());
const end = (id) => rows.find((r) => r.id === id).endDate;
// settimana del 12/10/2026 (indice pari o dispari): una serie Weekly scade lunedi' 19/10, l'altra il 26/10
const a = end(3001), b = end(3011);
check(new Set([a, b]).size === 2 && [a, b].includes('2020-10-19 08:00:00') && [a, b].includes('2020-10-26 08:00:00'), `Weekly ${a} / ${b}`);
// Limited: la mensile attiva scade il 1/11 08:00 finto
const activeMonthly = t.LIMITED_ROTATION.monthly.find((ids) => ids.every((id) => t.limitedActive(id)));
check(end(activeMonthly[0]) === '2020-11-01 08:00:00', `Limited mensile ${end(activeMonthly[0])}`);
// stesso contenuto per la stessa revisione, e servito in meno di 50 ms dalla cache
const b1 = t.masterBody('mission'); const t0 = process.hrtime.bigint();
call(t.respondMaster);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
check(t.masterBody('mission').equals(b1), 'contenuto cambiato senza cambio di revisione');
check(ms < 50, `respondMaster ${ms.toFixed(1)} ms con la cache`);
// risorse: versionRes/darkVersionRes non seguono la revisione del master
// (versionDat e le altre stanno nell'involucro ret() di ogni risposta, non in respondStatus)
const st = call(t.respondMaster).ret;
check(st.darkVersionRes === 117 && st.versionDat === rev, `status ${st.versionDat} ${st.darkVersionRes}`);
// la settimana dopo: nuova revisione, nuove scadenze
at('2026-10-19T09:00:00Z');
check(t.masterRevisionNow() === rev + 1, 'revisione +1 al lunedi');

Date.now = realNowFn;
if (errors.length) { log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
log('OK: master con l\'orologio');
