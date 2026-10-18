// Prova della pagina /web/notices (aggiornamenti dati e differenze): node server/test-notices.js
'use strict';
const n = require('./routes-info-album');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const U = (y, m, d, h = 0) => Date.UTC(y, m - 1, d, h);

let p = n.noticesPage(U(2026, 10, 16, 15));
check(p.includes('About game data updates'), 'titolo base');
check(!p.includes('Game data updated today'), 'non e il giorno dell aggiornamento');
check(p.includes('Next update: in 2 days 17 hours'), 'venerdi 15:00 -> 2 giorni 17 ore');
const pos = (s) => p.indexOf(`<span class="x">${s}</span>`);
check(pos('About game data updates') >= 0 && pos('About game data updates') < pos('Differences from the original game')
  && pos('Differences from the original game') < pos('Missions'), 'ordine: dati aggiornati, differenze, poi il resto');
check(pos('Missions') < pos('Shop'), 'notizia Shop dopo Missions');
check(n.NOTICES.some((x) => x.title === 'Differences from the original game' && /draw rates are reconstructed/.test(x.body.join(' '))), 'probabilita nelle differenze');
check(!p.includes('restored'), 'niente elenchi di modifiche');
check(p.includes('Differences from the original game') && p.includes('Limited Missions rotate'), 'notizia differenze');
check(p.includes('<a class="row" href="#n0"') && p.includes('id="d0"'), 'struttura elenco');

p = n.noticesPage(U(2026, 10, 19, 9));
check(p.includes('Game data updated today'), 'lunedi 09:00 -> aggiornato oggi');
check(p.includes('Next update: in 6 days 23 hours'), 'lunedi 09:00 -> prossimo fra 6 giorni 23 ore');

p = n.noticesPage(U(2026, 10, 31, 20));
check(p.includes('Next update: in 12 hours'), 'fine mese -> 12 ore');
p = n.noticesPage(U(2026, 11, 1, 9));
check(p.includes('Game data updated today'), 'giorno 1 -> aggiornato oggi');
p = n.noticesPage(U(2026, 10, 18, 8) + 30 * 60000);
check(p.includes('Next update: in 23 hours'), 'ore al singolare/plurale');
p = n.noticesPage(U(2026, 10, 19, 7) + 30 * 60000);
check(p.includes('Next update: in less than an hour'), 'meno di un ora');

{
  const ms = n.NOTICES.find((x) => x.tag === 'IMPORTANT' && x.title === 'Medal skills');
  const t = ms ? ms.body.join(' ') : '';
  check(ms && /reconstructed/.test(t) && /163/.test(t) && /Skill EXP/.test(t) && /every Medal in your deck/.test(t), 'notizia Medal skills');
}
check(n.NOTICES.some((x) => x.title === 'Differences from the original game' && /no purchases/.test(x.body.join(' '))), 'acquisti nelle differenze');
{
  const diff = n.NOTICES.find((x) => x.title === 'Differences from the original game').body;
  const shop = n.NOTICES.find((x) => x.title === 'Shop').body;
  for (const s of ['Shop draw rates are reconstructed where the original game did not publish them (Medal rarities, guarantees and Skill rates are original): Draw Odds and each banner\'s Details say so.',
    'Bonus items of a draw (Magic Mirror, Gems...) arrive in your Presents.',
    'Free draws cost 1 Jewel. VIP Free Deals are open to everyone, with one free VIP draw per day in total.',
    'Seasonal draw currencies (Spooky Cookies, Moogle Points, Holiday Draw Tickets) are kept separately; the Shop shows one of them at a time.',
    'Some 2016-17 banners only drew Epic Medals; the game data no longer says which Medals were Epic, so these banners draw from their full sets.',
    'Blue Fairy Deal banners are in the Banner Catalog but cannot be drawn yet: Blue Fairies will come with a future update.',
    'Trait Medals no longer exist: where a deal guaranteed a Trait Medal you get a random Medal of the same rarity instead.',
    'Boosted Medals: the chance of a boosted version on deals that offered one is reconstructed (5% per eligible Medal). Guaranteed max-level Skills are given only for Skills that exist in this restoration.',
    'Boosted stats on deals that did not state them are reconstructed (+1000 STR, +1000 DEF), and bonus support Medals earned through a guarantee arrive in your Presents.',
    'Free deals that could be drawn only once (or once per day) keep that limit.',
    'The "Medal STR +N" and "Medal DEF +N" effects of Special Attacks and Supernovas are rebuilt from their descriptions, because the original values are lost.']) {
    check(diff.includes(s), `differenze: «${s.slice(0, 40)}...»`);
  }
  check(!diff.some((s) => /not enforced yet|^Trait Medals, boosted Medals/.test(s)), 'differenze: righe vecchie dei Tier e delle Trait tolte');
  check(shop.includes('Guarantees work as on the original banners: the yellow line under a banner counts down the draws left to its guaranteed Medal.'), 'Shop: riga delle garanzie');
  check(!diff.some((s) => s.startsWith('Shop draw rates are reconstructed where the original game did not publish them: ')), 'differenze: vecchia riga delle probabilita tolta');
  // I-153: la striscia di categoria e' un testo nostro
  check(shop.includes('When a guarantee covers too many Medals to name them all, the yellow line names the kind of Medal from the banner\'s original notice instead (for example "A SN or higher Medal is guaranteed! Draws left: 3"). This wording is written by this restoration.')
    && shop.findIndex((s) => s.startsWith('Guarantees work as on')) + 1 === shop.findIndex((s) => s.startsWith('When a guarantee covers')),
  'Shop: riga della striscia di categoria, dopo quella delle garanzie');
  check(shop.includes('Every original banner is in the Banner Catalog. Until the next update the Shop lists the banners that were running at your point in the Story. Banners unlock as you progress through the Story; in the original game they followed the calendar.'), 'Shop: banner originali e storia');
}

n.NOTICES.push({ date: '1', tag: 'X', title: 'a<b>"&', body: ['<script>'] });
p = n.noticesPage(U(2026, 10, 16, 15));
n.NOTICES.pop();
check(p.includes('a&lt;b&gt;&quot;&amp;') && !p.includes('<script>alert') && p.includes('&lt;script&gt;'), 'escape HTML');

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: notices');
