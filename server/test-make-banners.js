// Prova del generatore dei banner: node server/test-make-banners.js
'use strict';
const m = require('./make-banners');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

const head = 'row_id\tname\tstart_pt\tend_pt\tdays\tstatus\trecurring\tseasonal\tevent_tie_in\tfeatured_medals\tpool_medals\tcurrency\tprice\tdraw_size\trarity_mix\tguarantees\trates\timage_file\timage_size\timage_url\tsource_url\tconfidence\tnotes\tsource';
const line = 'B0011\tEpic Medal Carnival\t2016-05-13\t2016-05-19\t7\ttime-limited\t\t\t\t\t\tJewels\t3000\tx10\t5★:1 4★:4 3★:5\tGuarantees a 5★ Epic Medal\t\tShop_-_Epic.png\t640x140\t\t\tsure\tDraws from sets 1.1, 1.2, 1.3, and 2.1. Guarantees a 5★\tx';
const rows = m.parseTsv(head + '\n' + line + '\n');
check(rows.length === 1 && rows[0].row_id === 'B0011' && rows[0].draw_size === 'x10', 'TSV');

const wiki = {
  A: '{{InfoMedal\n|naset=1\n|name=Wakka\n|class1=Rare\n|class2=Attack\n}}\ntesto',
  B: '{{InfoMedal\n|naset=12\n|name=Late\n|class1=Rare\n|class2=Attack\n}}',
  C: '{{InfoMedal\n|naset=2\n|name=Dewey\n|class1=Event\n|class2=Attack\n}}',
  D: 'pagina senza medaglia',
};
const wm = m.wikiMedals(wiki);
check(wm.length === 3 && wm.find((x) => x.name === 'Wakka').naset === 1, 'medaglie della wiki');

check(m.maxSetOf('Draws from sets 1.1, 1.2, 1.3, and 2.1. Other') === 2, 'set dalle note');
check(m.maxSetOf('Available once per day.') === m.MAX_SET_NOW, 'senza set: fino alla storia attuale');

const medalRows = [
  { medalId: 11013, name: 'Wakka', rare: 3, type: 1, validPack: 0 },
  { medalId: 11014, name: 'Wakka', rare: 4, type: 1, validPack: 0 },
  { medalId: 11015, name: 'Wakka', rare: 5, type: 1, validPack: 0 },
  { medalId: 300007, name: 'Wakka', rare: 7, type: 1, validPack: 0 },
  { medalId: 90041, name: 'Dewey', rare: 3, type: 1, validPack: 1 },
  { medalId: 11099, name: 'Wakka', rare: 3, type: 2, validPack: 0 },
  { medalId: 11016, name: 'Wakka', rare: 3, type: 1, validPack: 0, darklight: 3 },
];
const pool = m.buildPool(['Wakka', 'Dewey'], medalRows, [3, 4, 5, 6]);
check(JSON.stringify(pool) === '{"3":[11013],"4":[11014],"5":[11015]}', 'pool: solo attacco, non impilabili, < 300000, senza darklight 3');
check(!pool[3].includes(11016), 'darklight 3 escluso');

const b = m.bannerFromRow(rows[0], { wikiList: wm, medalRows, test: false, sortId: 30 });
check(b.drawMedalTypeId === 10011 && b.payType === 1 && b.price === 3000 && b.lotCount === 10, 'banner: id, moneta, prezzo, dimensione');
check(b.isDayLimited === 0 && b.maxSet === 2 && JSON.stringify(b.rarityMix) === '[[5,1],[4,4],[3,5]]', 'banner: limite, set, mix');
check(b.image === 'Shop_-_Epic.png' && /10 Medals/.test(b.comment) && !b.comment.includes('%'), 'banner: immagine e didascalia');
const daily = m.bannerFromRow({ ...rows[0], row_id: 'B0001', draw_size: 'x3', price: '600', notes: 'Available once per day.' }, { wikiList: wm, medalRows, test: false, sortId: 10 });
check(daily.isDayLimited === 1 && /once per day/.test(daily.comment), 'once per day');
const plat = m.bannerFromRow({ ...rows[0], row_id: 'B0456', currency: 'Platinum Ticket', price: '1 Platinum Ticket', draw_size: 'x5', rarity_mix: '5★:5' }, { wikiList: wm, medalRows, test: true, sortId: 90 });
check(plat.payType === 7 && plat.price === 1 && plat.test === true, 'Platinum Ticket = payType 7');
let threw = false;
try { m.bannerFromRow({ ...rows[0], currency: 'Moogle Point' }, { wikiList: wm, medalRows, test: false, sortId: 1 }); } catch { threw = true; }
check(threw, 'moneta sconosciuta: errore');

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: make-banners');
