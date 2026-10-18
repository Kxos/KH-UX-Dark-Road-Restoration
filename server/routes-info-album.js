// Notices (Other > Notices, popup al login) e Album (Other > Album): docs/notes/home_profilo.md#notices-album.
//
// POST /system/information/list/151203 (azione 31, parser [fn]): popUpViewUrl = array di
// stringhe (URL), obbligatorio. Il dispatcher (0x7c3c78) mette il vettore nella sessione +0x3c0.
// - Pulsante Notices ([fn] -> [fn] -> callback [fn]): apre la WebView
//   ([fn], titolo testo 0x5ff08d2 «Notices») sul PRIMO elemento, con i parametri di
//   sessione aggiunti da [fn]. Con la risposta generica il vettore e' nullo e il primo
//   elemento si legge da un puntatore nullo: SIGSEGV a 0x9f9010 (banco 14-10). Serve almeno 1 URL.
// - Login ([fn] -> [fn], callback [fn], poi [fn]): mostra in
//   sequenza le WebView di tutti gli elementi (il primo con i parametri di sessione): e' il popup
//   delle notizie dell'originale all'ingresso nella home.
// La WebView usa cocostudio/publish/Information2_Base.json (o dark_Information2_Base.json se il
// flag +0x1a9 di [fn] e' acceso; [fn]): l'originale JP (uguale al WW 4.4.0) e'
// in recon/tools/jp_coco_layouts.txt.
// GET /system/information/list (azione 30, parser [fn]): viewUrl stringa (non vista sul
// banco; stessa pagina).
//
// GET /user/album/161102 (azione 17, parser [fn]): userAlbum {albumMedals[] {medalId uint,
// guiltStatus uint (letto come byte)}, allMedalCount int}, tutto obbligatorio (altrimenti
// risultato nullo, SIGSEGV a 0x170 nel banco 14-10). La cella ([fn]) mostra la medaglia se
// medalId e' in albumMedals, altrimenti Medal_S_0 e «?» (Txt_Medal_Label); l'icona AlbumGuilt_1/2/3
// = guiltStatus 0/1/2, solo se userDetail.isGuilt e il tier della medaglia (+0x4c0) != 0.
// guiltStatus qui: 0 = nessuna copia con Special Attack Bonus, 1 = almeno una, 2 = una copia al
// bonus massimo del tier (ricostruzione: i valori originali non sono noti).

const clock = require('./clock');
const { isBoosted } = require('./medal-boost');

// Ogni funzione che differisce dall'originale ha una notizia (docs/notes/home_profilo.md#notices-album)
const DIFFERENCES_BODY = [
  'This is a private restoration of KINGDOM HEARTS Union χ[Cross]. Your progress is saved only on this restoration server.',
  'The in-game date is set between 2016 and 2021 so that the original game keeps working. Missions reset at the real times shown in their countdowns.',
  'Completed missions that you did not collect before they end are sent to your Presents.',
  'Limited Missions rotate among the original campaigns: one monthly Lux campaign and one short campaign each week.',
  'A few Spirit parts without original graphics are replaced by a similar part.',
  'The "Medal STR +N" and "Medal DEF +N" effects of Special Attacks and Supernovas are rebuilt from their descriptions, because the original values are lost.',
  'Shop draw rates are reconstructed where the original game did not publish them (Medal rarities, guarantees and Skill rates are original): Draw Odds and each banner\'s Details say so.',
  'Bonus items of a draw (Magic Mirror, Gems...) arrive in your Presents.',
  'Free draws cost 1 Jewel. VIP Free Deals are open to everyone, with one free VIP draw per day in total.',
  'Free deals that could be drawn only once (or once per day) keep that limit.',
  'Seasonal draw currencies (Spooky Cookies, Moogle Points, Holiday Draw Tickets) are kept separately; the Shop shows one of them at a time.',
  'Some 2016-17 banners only drew Epic Medals; the game data no longer says which Medals were Epic, so these banners draw from their full sets.',
  'Blue Fairy Deal banners are in the Banner Catalog but cannot be drawn yet: Blue Fairies will come with a future update.',
  'Trait Medals no longer exist: where a deal guaranteed a Trait Medal you get a random Medal of the same rarity instead.',
  'Boosted Medals: the chance of a boosted version on deals that offered one is reconstructed (5% per eligible Medal). Guaranteed max-level Skills are given only for Skills that exist in this restoration.',
  'Boosted stats on deals that did not state them are reconstructed (+1000 STR, +1000 DEF), and bonus support Medals earned through a guarantee arrive in your Presents.',
  'There are no purchases: Jewels and items come from quests, missions and presents.',
];

// Notizia fissa sugli aggiornamenti dei dati (lunedi' e giorno 1, 08:00 UTC): il conto alla rovescia
// e' calcolato dal server sull'ora reale, perche' l'orologio del dispositivo e' fermo al 2021.
// Per aggiungere una frase (es. download interrotti) basta una riga in updateBody().
function lastUpdateMs(realMs) {
  return Math.max(clock.weekStartOf(clock.weekIndex(realMs)), clock.monthEndOf(clock.monthIndex(realMs) - 1));
}
function countdownText(ms) {
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'in less than an hour';
  const d = Math.floor(h / 24), hh = h % 24;
  const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  return d >= 1 ? 'in ' + pl(d, 'day') + ' ' + pl(hh, 'hour') : 'in ' + pl(hh, 'hour');
}
function updateBody(realMs) {
  const next = Math.min(clock.weekEnd(realMs), clock.monthEnd(realMs));
  return [
    'Every Monday and on the 1st of each month, the game downloads updated game data (missions and events).',
    'The first time you open the game after an update, loading takes longer than usual. Please keep the app open until the home screen appears. Later logins are fast again.',
    'If the app is closed during the download, nothing is lost: the download simply starts again the next time you open the game.',
    'Next update: ' + countdownText(next - realMs),
  ];
}
function updateNotice(realMs) {
  const today = clock.dayIndex(lastUpdateMs(realMs)) === clock.dayIndex(realMs);
  return { date: '10/16', tag: 'IMPORTANT', title: today ? 'Game data updated today' : 'About game data updates',
    body: updateBody(realMs) };
}

// Solo informazioni utili per capire come funziona il gioco (decisione dell'utente del 16-10): niente
// elenchi di modifiche. In lista prima la notizia dinamica dei dati aggiornati (updateNotice), poi queste, dalla piu' recente.
const NOTICES = [
  { date: '10/18', tag: 'IMPORTANT', title: 'Medal skills',
    body: ['Medal skills are reconstructed: 25 of the 163 skills use the original values, the other 138 are rebuilt from the community skill list (power and max trigger rate from the wiki, other values estimated). Some long descriptions are shortened.',
      'After each mission, the Skill EXP of the battle goes to every Medal in your deck that has a skill. The original server could not know which Medals you used, so this is our deduction.',
      'Combo skills marked "& GA 1" and "& GA 2" lower the special attack cost by 1 or 2 gauges; when this happens is our estimate, as no original value was found.',
      'New Scrooge Medals get a skill picked by rarity, because the original skill depended on where the Scrooge came from. Scrooges you already own keep their skill.'] },
  { date: '10/16', tag: 'INFORMATION', title: 'Differences from the original game',
    body: DIFFERENCES_BODY },
  { date: '10/16', tag: 'INFORMATION', title: 'Missions',
    body: ['Open the scroll under your avatar on the home screen to see your Beginner, Daily, Weekly and Limited Missions, then tap Receive to collect the rewards.',
      'Daily Missions reset every day, Weekly Missions every Monday and Limited Missions with their campaign: the time left is shown on each tab.'] },
  { date: '10/16', tag: 'INFORMATION', title: 'Shop',
    body: ['The first banner in the Shop, Banner Catalog, cannot be drawn: tap its Details to see the banners and the Medals they contain.',
      'Draws cost Jewels or Tickets earned in the game. Draw Odds shows the rates used by this restoration.',
      'Guarantees work as on the original banners: the yellow line under a banner counts down the draws left to its guaranteed Medal.',
      'When a guarantee covers too many Medals to name them all, the yellow line names the kind of Medal from the banner\'s original notice instead (for example "A SN or higher Medal is guaranteed! Draws left: 3"). This wording is written by this restoration.',
      'Every original banner is in the Banner Catalog. Until the next update the Shop lists the banners that were running at your point in the Story. Banners unlock as you progress through the Story; in the original game they followed the calendar.'] },
  { date: '10/14', tag: 'INFORMATION', title: 'Supernova and Dual Meow Wow',
    body: ['Equipping a Supernova Medal lets you unleash its powerful Supernova once per quest: tap the button under the Burst gauge during your turn.',
      'Five of the same Dual Meow Wow Medals are needed to grant Supernova or strengthen the Supernova of a specific Medal (Evolve, with the base Medal at max level).'] },
];
const TAG_COLOR = { EVENT: '#36c9d6', CAMPAIGN: '#8a3fc4', UPDATE: '#9fb85a', IMPORTANT: '#e0405a', INFORMATION: '#3f7fd0' };

const webBase = (sessionBase) => sessionBase.replace(/^https:/, 'http:');   // https: la WebView rifiuta il certificato
const noticesUrl = (sessionBase) => `${webBase(sessionBase)}/web/notices`;

function informationList(sessionBase) {
  return { viewUrl: noticesUrl(sessionBase) };
}

function informationPopup(sessionBase) {
  return { popUpViewUrl: [noticesUrl(sessionBase)] };
}

// Pagina /web/notices, come l'elenco originale (reference\other_menu\notices_list_yt_02.jpg: data,
// etichetta colorata, titolo, freccia rossa) e il dettaglio (notices_detail_yt_03.jpg: titoletti con
// il quadratino, pulsante BACK)
function noticesPage(realMs = Date.now()) {
  const notices = [updateNotice(realMs), ...NOTICES];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = notices.map((n, i) => `<a class="row" href="#n${i}" onclick="show(${i});return false">`
    + `<span class="d">${esc(n.date)}</span><span class="t" style="background:${TAG_COLOR[n.tag] || '#3f7fd0'}">${esc(n.tag)}</span>`
    + `<span class="x">${esc(n.title)}</span><span class="a">&#9654;</span></a>`).join('');
  const details = notices.map((n, i) => `<div class="det" id="d${i}"><h2>&#9632; ${esc(n.title)}</h2>`
    + n.body.map((p) => `<p>${esc(p)}</p>`).join('') + '<a class="back" href="#" onclick="show(-1);return false">BACK &#8617;</a></div>').join('');
  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>body{margin:0;background:#174a5c;color:#fff;font:18px sans-serif}'
    + '.row{display:flex;align-items:center;padding:10px 8px;border-bottom:2px dotted #8fb3c0;color:#fff;text-decoration:none}'
    + '.d{width:58px}.t{width:120px;text-align:center;font-size:14px;padding:4px 0;margin-right:10px}'
    + '.x{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a{color:#e8242c;margin-left:8px}'
    + '.det{display:none;padding:10px 14px 70px}h2{color:#5fe0f0;font-size:20px;margin:10px 0}p{color:#e8f2f6;line-height:1.4}'
    + '.back{position:fixed;left:16px;bottom:12px;background:#2f7fd6;color:#fff;padding:8px 22px;border-radius:8px;'
    + 'text-decoration:none;font-weight:bold;border:2px solid #cfe8ff}</style>'
    + '<script>function show(i){document.getElementById("list").style.display=i<0?"block":"none";'
    + 'for(var k=0;k<' + notices.length + ';k++)document.getElementById("d"+k).style.display=k===i?"block":"none";'
    + 'window.scrollTo(0,0)}</script></head><body>'
    + `<div id="list">${rows}</div>${details}</body></html>`;
}

// owned: medaglie possedute [{medalId, guiltFactor}]; medalRows: tabella master medal;
// maxGuilt(tier) -> fattore massimo del tier (medal-guilt.js GUILT_RANGES). Le boosted (groupId = normale,
// medal-boost.js) non sono voci dell'album: la riga si trova per id, la copia conta per la normale
function albumData(owned, medalRows, maxGuilt) {
  const byId = new Map(medalRows.map((r) => [r.medalId, r]));
  const best = new Map();
  for (const m of owned) {
    const row = byId.get(m.medalId);
    if (!row || m.medalId === 1) continue;
    const f = m.guiltFactor || 0;
    const top = maxGuilt(row.guiltValue || 0);
    const st = f <= 0 ? 0 : top && f >= top ? 2 : 1;
    const id = isBoosted(row) ? row.groupId : m.medalId;
    best.set(id, Math.max(best.get(id) ?? 0, st));
  }
  return {
    userAlbum: {
      albumMedals: [...best].sort((a, b) => a[0] - b[0]).map(([medalId, guiltStatus]) => ({ medalId, guiltStatus })),
      allMedalCount: medalRows.filter((r) => r.medalId !== 1 && !isBoosted(r)).length,
    },
  };
}

module.exports = { NOTICES, noticesUrl, informationList, informationPopup, noticesPage, albumData };
