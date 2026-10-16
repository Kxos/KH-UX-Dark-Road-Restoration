// Prova delle funzioni pure delle estrazioni: node server/test-gacha-data.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const g = require('./gacha-data');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

check(JSON.stringify(g.parseRarityMix('4★:1 3★:2')) === '[[4,1],[3,2]]', 'mix semplice');
check(JSON.stringify(g.parseRarityMix('6★:2 5★:3 3★:5 Other:1')) === '[[6,2],[5,3],[3,5]]', 'Other ignorato');
check(JSON.stringify(g.parseRarityMix('3★:5 5★:1 4★:4')) === '[[5,1],[4,4],[3,5]]', 'ordine decrescente');
check(JSON.stringify(g.parseRarityMix('')) === '[]', 'vuoto');

const b = { lotCount: 3, rarityMix: [[4, 1], [3, 2]], pool: { 3: [31, 32], 4: [41], 5: [51] } };
check(JSON.stringify(g.slotRarities(b)) === '[4,3,3]', 'slot dal mix');
check(JSON.stringify(g.slotRarities({ ...b, lotCount: 5 })) === '[4,3,3,3,3]', 'slot mancanti = rarita piu bassa');
check(JSON.stringify(g.slotRarities({ ...b, lotCount: 2 })) === '[4,3]', 'slot in eccesso tagliati');

// rng: 0.5 -> niente promozione, poi indice; 0.01 -> promozione
check(JSON.stringify(g.rollDraw(b, seq(0.5, 0.0, 0.5, 0.0, 0.5, 0.99))) === '[41,31,32]', 'estrazione senza promozioni');
check(JSON.stringify(g.rollDraw(b, seq(0.01, 0.0, 0.5, 0.0, 0.5, 0.0))) === '[51,31,31]', 'promozione 4 -> 5');
const noUp = { lotCount: 1, rarityMix: [[5, 1]], pool: { 5: [51] } };
check(JSON.stringify(g.rollDraw(noUp, seq(0.01, 0.0))) === '[51]', 'niente 6 nel pool: resta 5');
const holes = { lotCount: 1, rarityMix: [[4, 1]], pool: { 3: [31] } };
check(JSON.stringify(g.rollDraw(holes, seq(0.5, 0.0))) === '[31]', 'pool 4 vuoto: scende a 3');
let threw = false;
try { g.rollDraw({ lotCount: 1, rarityMix: [[4, 1]], pool: {} }, Math.random); } catch { threw = true; }
check(threw, 'pool vuoto: errore');

const odds = g.slotOdds(b);
check(odds.length === 3 && odds[0][0].rare === 4 && odds[0][0].pct === 92 && odds[0][1].rare === 5 && odds[0][1].pct === 8, 'probabilita slot 4');
check(g.slotOdds(noUp)[0].length === 1 && g.slotOdds(noUp)[0][0].pct === 100, 'probabilita senza promozione');

const row = g.drawMedalTypeRow({ drawMedalTypeId: 10001, name: 'X', payType: 1, price: 600, sortId: 10,
  bannerUrl: '/web/gacha/img/10001.png', detailUrl: '/web/gacha/detail/10001', comment: '3 Medals' });
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recon', 'out', 'master_types_ww431.json'), 'utf8')).drawMedalType;
const fields = schema.map(([f]) => f);
check(fields.length === 47 && fields.every((f) => f in row), 'riga master con tutti i 47 campi');
check(row.benefitId === 0 && row.drawType === 1 && row.price === 600 && row.validComment === 1 && row.warrantDisplayOfTime === 1, 'valori della riga');

const tmp = path.join(os.tmpdir(), `khux-test-banners-${process.pid}.json`);
check(g.loadBanners(tmp).length === 0, 'file assente -> []');
fs.writeFileSync(tmp, JSON.stringify({ banners: [{ drawMedalTypeId: 10001 }] }));
check(g.bannerById(g.loadBanners(tmp), 10001)?.drawMedalTypeId === 10001, 'caricamento e ricerca');
fs.writeFileSync(tmp, '{rotto');
check(g.loadBanners(tmp).length === 0, 'file non valido -> []');
fs.unlinkSync(tmp);

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha-data');
