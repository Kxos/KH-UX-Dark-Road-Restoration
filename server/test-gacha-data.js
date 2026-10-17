// Prova delle funzioni pure delle estrazioni: node server/test-gacha-data.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const g = require('./gacha-data');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const J = JSON.stringify;

check(J(g.parseRarityMix('4★:1 3★:2')) === '[[4,1],[3,2]]', 'mix semplice');
check(J(g.parseRarityMix('6★:2 5★:3 3★:5 Other:1')) === '[[6,2],[5,3],[3,5]]', 'Other ignorato');
check(J(g.parseRarityMix('3★:5 5★:1 4★:4')) === '[[5,1],[4,4],[3,5]]', 'ordine decrescente');
check(J(g.parseRarityMix('')) === '[]', 'vuoto');

const b = { lotCount: 3, rarityMix: [[4, 1], [3, 2]] };
check(J(g.slotRarities(b)) === '[4,3,3]', 'slot dal mix');
check(J(g.slotRarities({ ...b, lotCount: 5 })) === '[4,3,3,3,3]', 'slot mancanti = rarita piu bassa');
check(J(g.slotRarities({ ...b, lotCount: 2 })) === '[4,3]', 'slot in eccesso tagliati');

// Catalogo sintetico (contratto di gacha_catalog.json + contract-ext: std, origin, att, pool.filter)
const CAT = {
  firstRarity: { 3: '2016-04-07', 4: '2016-04-07', 5: '2016-04-07', 6: '2016-07-15', 7: '2018-05-25' },
  story: [[1, 200, '2016-04-07'], [201, 250, '2016-04-21'], [251, 525, '2016-12-08']],
  subsets: {
    '1.1': { date: '2016-04-07', names: ['sora'] }, '2.2': { date: '2016-05-27', names: ['hades'] },
    '9.9': { date: '2016-04-07', names: ['mickey', 'cloud'] },
  },
  medals: {
    sora: { date: '2016-04-07', cls: '', class2: 'Attack', std: true, ids: [[31, 3, '2016-04-07'], [41, 4, '2016-04-07'], [51, 5, '2016-04-07'], [61, 6, '2016-04-07'], [71, 7, '2018-05-14']] },
    hades: { date: '2016-05-27', cls: '', class2: 'Attack', std: true, ids: [[32, 3, '2016-05-27'], [42, 4, '2016-05-27']] },
    vip: { date: '2016-04-07', cls: 'V', class2: 'Attack', std: false, ids: [[33, 3, '2016-04-07']] },
    mickey: { date: '2016-04-07', cls: '', class2: 'Attack', std: false, origin: 'disney', att: 'power', ids: [[34, 3, '2016-04-07']] },
    cloud: { date: '2016-04-07', cls: '', class2: 'Attack', std: false, origin: 'ffkh', att: 'speed', ids: [[35, 3, '2016-04-07']] },
    riku: { date: '2016-04-07', cls: '', class2: 'Attack', std: false, ids: [[45, 4, '2016-04-07'], [55, 5, '2016-04-07']] },
  },
};
const B = (o) => ({ rowId: 'B9', drawMedalTypeId: 10009, lotCount: 3, rarityMix: [[4, 1], [3, 2]], flags: [], start: '2016-05-01', end: '2016-05-31',
  epicBoost: false, pool: { mode: 'sets', sets: ['1.1'], names: [], featured: [], inheritAfter: null, evolve: null },
  guarantee: { list: [], count: 0, pity: null, every: null }, skill: null, ...o });
const P = (o) => ({ mode: 'sets', sets: ['1.1'], names: [], featured: [], inheritAfter: null, evolve: null, ...o });
const G = (o) => ({ list: [], count: 0, pity: null, every: null, ...o });
const allIds = (pool) => Object.values(pool).flat().sort((x, y) => x - y);

// storia e data di riferimento
check(g.storyDay(CAT, 525) === '2016-12-08', 'storyDay 525');
check(g.storyDay(CAT, 210) === '2016-04-21', 'storyDay 210');
check(g.storyDay(CAT, 0) === '2016-04-07', 'storyDay 0 = prima tranche');
check(g.asOf(B({}), '2016-12-08') === '2016-05-01', 'asOf banner normale = inizio');
check(g.asOf(B({ flags: ['PERMANENT'] }), '2016-12-08') === '2016-05-31', 'asOf permanente limitato alla fine');
check(g.asOf(B({ flags: ['PERMANENT'] }), '2016-04-07') === '2016-05-01', 'asOf permanente limitato all inizio');

// pool per set ed epoca
check(J(g.expandPool(B({}), CAT, '2016-05-01').pool) === '{"3":[31],"4":[41],"5":[51]}', 'pool per set (niente 6, niente Hades)');
const seven = (at) => g.expandPool(B({ rarityMix: [[6, 1]], lotCount: 1 }), CAT, at).pool;
check(J(seven('2018-06-01')[7]) === '[71]', 'epoca 7: 7 estraibile dal 25/05/2018');
check(!seven('2018-05-20')[7], 'epoca 7: niente 7 prima del 25/05/2018 (id gia uscito il 14/05)');
check(J(g.expandPool(B({ rarityMix: [[6, 1]], lotCount: 1 }), CAT, '2016-06-01').pool) === '{}', 'stella del mix non ancora uscita: esclusa');
const rel = (at) => allIds(g.expandPool(B({ pool: P({ mode: 'released', sets: [] }) }), CAT, at).pool);
check(J(rel('2016-04-30')) === '[31,41,51]', 'released: solo Sora prima di Hades');
check(J(rel('2016-06-01')) === '[31,32,41,42,51]', 'released: Sora e Hades, mai vip ne non std');
const inh = allIds(g.expandPool(B({ pool: P({ mode: 'inherit', inheritAfter: '2016-04-07' }) }), CAT, '2016-06-01').pool);
check(J(inh) === '[31,32,41,42,51]', 'inherit: set ereditati + uscite dopo');
check(J(g.expandPool(B({ pool: P({ sets: ['2.2'] }) }), CAT, '2016-05-01').pool) === '{}', 'sotto-set futuro ignorato');
// pool.filter: solo le medaglie dei sotto-set; vetrina e garanzie entrano comunque
const filt = (o) => allIds(g.expandPool(B({ rarityMix: [[3, 1]], lotCount: 1, pool: P({ sets: ['9.9'], filter: ['disney'], ...o }) }), CAT, '2016-05-01').pool);
check(J(filt({})) === '[34]', 'filtro disney: entra solo Mickey');
check(J(filt({ filter: [] })) === '[34,35]', 'filtro vuoto: entrano tutte');
check(J(filt({ filter: ['speed'] })) === '[35]', 'filtro per attributo');
check(J(filt({ featured: ['cloud'] })) === '[34,35]', 'filtro: la vetrina entra comunque');
const filtG = allIds(g.expandPool(B({ rarityMix: [[3, 1]], lotCount: 1, pool: P({ sets: ['9.9'], filter: ['disney'] }), guarantee: G({ list: ['cloud'], count: 1 }) }), CAT, '2016-05-01').pool);
check(J(filtG) === '[34,35]', 'filtro: la lista di garanzia entra comunque');
const ev = g.expandPool(B({ lotCount: 5, pool: P({ mode: 'evolve', sets: [], evolve: [[301682, 7], [301683, 8], [301684, 9]] }) }), CAT, '2016-05-01');
check(J(ev.weighted) === '[[301682,0.45],[301683,0.45],[301684,0.1]]', 'evolve: livello piu alto 10%');

// probabilita'
const ex = g.expandPool(B({}), CAT, '2016-05-01');
const odds = g.slotOdds(B({}), ex);
check(J(odds[0]) === '[{"rare":4,"pct":94},{"rare":5,"pct":6}]', 'odds slot 4');
check(J(odds[1]) === '[{"rare":3,"pct":90},{"rare":4,"pct":10}]', 'odds slot 3');
check(J(g.slotOdds(B({ epicBoost: true }), ex)[1]) === '[{"rare":3,"pct":85},{"rare":5,"pct":15}]', 'odds epicBoost');

// estrazione: rng 0.5 -> niente promozione, poi indice
check(J(g.rollDraw(B({}), ex, seq(0.5, 0.0)).medalIds) === '[41,31,31]', 'estrazione senza promozioni');
check(J(g.rollDraw(B({}), ex, seq(0.01, 0.0, 0.5, 0.0, 0.5, 0.0)).medalIds) === '[51,31,31]', 'promozione 4 -> 5');
let threw = false;
try { g.rollDraw(B({}), { pool: {}, featuredIds: [], listIds: [], listNames: [], featuredNames: [], weighted: [] }, Math.random); } catch (e) { threw = /pool vuoto/.test(e.message); }
check(threw, 'pool vuoto: errore');
check(J(g.rollDraw(B({ lotCount: 3, pool: P({ mode: 'evolve' }) }), ev, seq(0.95)).medalIds) === '[301684,301684,301684]', 'estrazione evolve');
threw = false;
try { g.rollDraw(B({ pool: P({ mode: 'evolve', evolve: [] }) }), { pool: {}, featuredIds: [], listIds: [], weighted: [] }, Math.random); } catch { threw = true; }
check(threw, 'evolve vuoto: errore');

// slot a lista: prima la medaglia per nome (vetrina peso 2), poi la variante alla stella dello slot
// (mix [[4,1],[3,2]] a 2016-06-01: sora {3,4,5} peso 1, hades {3,4} peso 2; slot 0 = 4★)
const LB = B({ pool: P({ featured: ['hades'] }), guarantee: G({ list: ['sora', 'hades'], count: 1 }) });
const lex = g.expandPool(LB, CAT, '2016-06-01');
check(J(lex.listIds) === '[31,32,41,42,51]' && J(lex.featuredIds) === '[32,42]', 'liste espanse');
check(J(lex.listNames) === '[["sora",1,{"3":[31],"4":[41],"5":[51]}],["hades",2,{"3":[32],"4":[42]}]]', 'listNames per nome');
check(J(lex.featuredNames) === '[["hades",1,{"3":[32],"4":[42]}]]', 'featuredNames per nome');
check(g.rollDraw(LB, lex, seq(0.0, 0.5, 0.0)).medalIds[0] === 41, 'slot a lista: rng 0 -> Sora alla stella dello slot');
check(g.rollDraw(LB, lex, seq(0.99, 0.0)).medalIds[0] === 42, 'slot a lista: rng 0.99 -> Hades 4★');
check(g.rollDraw(LB, lex, seq(0.4, 0.0)).medalIds[0] === 42, 'slot a lista: vetrina peso 2 (uniforme darebbe Sora)');
check(g.rollDraw(LB, lex, seq(0.0, 0.01, 0.0)).medalIds[0] === 51, 'slot a lista: salita 4 -> 5 della medaglia');
const NB = B({ rarityMix: [[5, 1], [3, 2]], guarantee: G({ list: ['hades'], count: 1 }) });
check(g.rollDraw(NB, g.expandPool(NB, CAT, '2016-06-01'), seq(0.0)).medalIds[0] === 42, 'slot a lista: variante piu vicina sotto lo slot');
const UB = B({ rarityMix: [[3, 1]], lotCount: 1, pool: P({ sets: [] }), guarantee: G({ list: ['riku'], count: 1 }) });
check(g.rollDraw(UB, g.expandPool(UB, CAT, '2016-06-01'), seq(0.0, 0.5, 0.0)).medalIds[0] === 45, 'slot a lista: variante piu bassa sopra lo slot');
check(J(g.slotOdds(LB, lex)[0]) === '[{"list":true,"rare":4,"pct":94},{"list":true,"rare":5,"pct":6}]', 'odds slot a lista');
check(J(g.slotOdds(LB, lex)[1]) === '[{"rare":3,"pct":90},{"rare":4,"pct":10}]', 'odds slot normale dopo la lista');

// guarantee.slot (correzione finale C, B0306 7★ Medal Deal: «Guarantees one Tier 4 or lower 7★ Medal. Guarantees
// one of the following Medals: ...», mix [[7,1],[6,1],[5,8]]): la lista va nello slot 1 (6★), lo slot 0 resta un 7★
// qualsiasi del pool; la pity resta sullo slot 0
const SCAT = { ...CAT, medals: { ...CAT.medals,
  kairi: { date: '2018-05-01', std: false, ids: [[66, 6, '2018-05-01'], [76, 7, '2018-05-14']] },
  axel: { date: '2018-05-01', std: false, ids: [[67, 6, '2018-05-01'], [77, 7, '2018-05-14']] } } };
const SB = B({ start: '2018-06-01', end: '2018-06-07', lotCount: 10, rarityMix: [[7, 1], [6, 1], [5, 8]], pool: P({ sets: ['1.1'] }),
  guarantee: G({ list: ['kairi', 'axel'], count: 1, slot: 1 }) });
const sex = g.expandPool(SB, SCAT, SB.start);
const tail = Array(8).fill([0.5, 0.0]).flat(); // slot 2-9: nessuna salita, primo id
const sr = g.rollDraw(SB, sex, seq(0.0, 0.0, 0.5, 0.0, ...tail));
check(sr.medalIds[0] === 71, `slot 0 di B0306: un 7★ qualsiasi del pool (${sr.medalIds[0]})`);
check(sr.medalIds[1] === 66, `slot 1 di B0306: la variante 6★ di una medaglia della lista (${sr.medalIds[1]})`);
check(sr.medalIds.slice(2).every((id) => id === 51), 'slot 2-9 di B0306: generici 5★');
const so = g.slotOdds(SB, sex);
check(!so[0][0].list && so[1].every((o) => o.list) && !so[2][0].list, 'odds: lista sullo slot 1');
check(J(g.slotOdds({ ...SB, guarantee: G({ list: ['kairi'], count: 2, slot: 1 }) }, sex).map((s) => !!s[0].list)) === '[false,true,true,false,false,false,false,false,false,false]', 'odds: count 2 dallo slot 1');
check(g.rollDraw({ ...SB, guarantee: G({ list: ['kairi', 'axel'], count: 1 }) }, sex, seq(0.0, 0.0)).medalIds[0] === 76, 'senza slot: lista sullo slot 0 (come prima)');
const SP = { ...SB, pool: P({ sets: ['1.1'], featured: ['axel'] }), guarantee: G({ list: ['kairi', 'axel'], count: 1, slot: 1, pity: 2 }) };
const spx = g.expandPool(SP, SCAT, SP.start);
const spr = g.rollDraw(SP, spx, seq(0.0, 0.0, 0.0, 0.5, 0.0, ...tail), { draws: 1, sinceFeatured: 1 });
check(spr.medalIds[0] === 77 && spr.medalIds[1] === 66, `pity sullo slot 0, lista sullo slot 1 (${spr.medalIds.slice(0, 2)})`);

// pity
const PB = B({ pool: P({ featured: ['hades'] }), guarantee: G({ pity: 3 }) });
const pex = g.expandPool(PB, CAT, '2016-06-01');
const pr = g.rollDraw(PB, pex, seq(0.0, 0.5, 0.0), { draws: 2, sinceFeatured: 2 });
check(pr.medalIds[0] === 42 && pr.featured === true, 'pity alla terza estrazione: vetrina alla stella dello slot');
const pn = g.rollDraw(PB, pex, seq(0.5, 0.0), { draws: 2, sinceFeatured: 1 });
check(J(pn.medalIds) === '[41,31,31]' && pn.featured === false, 'pity non ancora');

// every
const EB = B({ guarantee: G({ list: ['hades'], count: 1, every: 3 }) });
const eex = g.expandPool(EB, CAT, '2016-06-01');
check(g.rollDraw(EB, eex, seq(0.5, 0.0), { draws: 2, sinceFeatured: 0 }).medalIds[0] === 42, 'every 3: terza estrazione, Hades 4★');
check(g.rollDraw(EB, eex, seq(0.5, 0.0), { draws: 0, sinceFeatured: 0 }).medalIds[0] === 41, 'every 3: prima estrazione normale');

// abilita'
const rows = new Map([[1100, { skillId: 1100, name: 'Attack Boost I' }], [1102, { name: 'Attack Boost All I', skillId: 1102 }], [1101, { name: 'Attack Boost II', skillId: 1101 }]]);
check(g.rollSkill({ table: '72415', slots: 'all' }, 1, rows, () => 0.0) === 1100, 'skill 72415 rng 0');
check(g.rollSkill({ table: '72415', slots: 'all' }, 1, rows, () => 0.99) === null, 'skill 72415 rng 0.99 -> nessuna');
check(g.rollSkill({ table: '50106', slots: 'first' }, 1, rows, () => 0) === null, 'skill 50106 solo primo slot');
check(g.rollSkill({ table: '50106', slots: 'first' }, 0, rows, () => 0.99) === 1101, 'skill 50106 slot 0 sempre una skill');
check(g.rollSkill(null, 0, rows, () => 0) === null, 'nessuna tabella');

const row = g.drawMedalTypeRow({ drawMedalTypeId: 10001, name: 'X', payType: 1, price: 600, sortId: 10,
  bannerUrl: '/web/gacha/img/10001.png', detailUrl: '/web/gacha/detail/10001', comment: '3 Medals' });
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recon', 'out', 'master_types_ww431.json'), 'utf8')).drawMedalType;
const fields = schema.map(([f]) => f);
check(fields.length === 47 && fields.every((f) => f in row), 'riga master con tutti i 47 campi');
check(row.benefitId === 0 && row.drawType === 1 && row.price === 600 && row.validComment === 1 && row.warrantDisplayOfTime === 1, 'valori della riga');

const EMPTY = '{"banners":[],"subsets":{},"medals":{},"firstRarity":{},"story":[]}';
check(J(g.loadCatalog('/non/esiste.json')) === EMPTY, 'catalogo assente -> vuoto');
const tmp = path.join(os.tmpdir(), `khux-test-catalog-${process.pid}.json`);
fs.writeFileSync(tmp, JSON.stringify({ version: 1, _stats: { n: 1 }, ...CAT, banners: [B({ drawMedalTypeId: 10001 })] }));
const cat = g.loadCatalog(tmp);
check(g.bannerById(cat.banners, 10001)?.drawMedalTypeId === 10001 && cat.medals.sora && cat.story.length === 3, 'caricamento (campi in piu ammessi) e ricerca');
fs.writeFileSync(tmp, '{rotto');
check(J(g.loadCatalog(tmp)) === EMPTY, 'file non valido -> vuoto');
fs.writeFileSync(tmp, '{"banners": 3}');
check(J(g.loadCatalog(tmp)) === EMPTY, 'senza lista banners -> vuoto');
fs.unlinkSync(tmp);
check(!('UPGRADE_CHANCE' in g) && !('loadBanners' in g), 'vecchie funzioni rimosse');
check(g.CATALOG_ID === 9001 && g.EPIC_UPGRADE === 0.15 && g.FEATURED_WEIGHT === 2 && J(g.UPGRADE) === '{"3":0.1,"4":0.06,"5":0.04,"6":0.03}', 'costanti');

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha-data');
