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
  '## Game and progress',
  'This is a private restoration of KINGDOM HEARTS Union χ[Cross]. Your progress is saved only on this restoration server.',
  'The in-game date is set between 2016 and 2021 so that the original game keeps working. Missions reset at the real times shown in their countdowns.',
  'Completed missions that you did not collect before they end are sent to your Presents.',
  'Limited Missions rotate among the original campaigns: one monthly Lux campaign and one short campaign each week.',
  '## Medals',
  'A few Spirit parts without original graphics are replaced by a similar part.',
  'The "Medal STR +N" and "Medal DEF +N" effects of Special Attacks and Supernovas are rebuilt from their descriptions, because the original values are lost.',
  '## Shop and draws',
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
  '## Purchases',
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
      'Combo skills marked "& GA 0", "& GA 1" and "& GA 2" make the special attack cost 0, 1 or 2 gauges; when the skill is checked is our estimate, as no original value was found.',
      'Scrooge Medals from the **Skills to Thrill** deals come with the skill shown on their banner, at max level. Other new Scrooge Medals get a skill picked by rarity, because the original skill depended on where the Scrooge came from. Scrooges you already own keep their skill.'] },
  { date: '10/16', tag: 'INFORMATION', title: 'Differences from the original game',
    body: DIFFERENCES_BODY },
  { date: '10/16', tag: 'INFORMATION', title: 'Missions',
    body: ['Open the **scroll** under your avatar on the home screen to see your Beginner, Daily, Weekly and Limited Missions, then tap **Receive** to collect the rewards.',
      'Daily Missions reset every day, Weekly Missions every Monday and Limited Missions with their campaign: the time left is shown on each tab.'] },
  { date: '10/19', tag: 'INFORMATION', title: 'Shop',
    body: ['The first banner in the Shop, **Banner Catalog**, cannot be drawn: tap its **Details** to see the banners and the Medals they contain.',
      'Draws cost Jewels or Tickets earned in the game. **Draw Odds** shows the rates used by this restoration.',
      'Guarantees work as on the original banners: the yellow line under a banner counts down the draws left to its guaranteed Medal.',
      'When a guarantee covers too many Medals to name them all, the yellow line names the kind of Medal from the banner\'s original notice instead (for example "A SN or higher Medal is guaranteed! Draws left: 3"). This wording is written by this restoration.',
      'Every original banner is in the Banner Catalog. Banners unlock as you progress through the Story; in the original game they followed the calendar.',
      '## Weekly rotation',
      'Each part of the Story matches a period of the original calendar. The Shop shows **one week** of that period at a time: every banner that ran during that week, up to 20.',
      'Every **Monday** the Shop moves to the next week; after the last week of the period it starts again from the first one, so every banner of your period comes back.',
      'When you clear enough Story Quests to reach the next period, the Shop moves to the first week of the new period. Banners of periods you have passed stay in the Banner Catalog, where you can still see their Medals and rates.',
      'Each banner\'s **Details** say whether it is in the Shop now and, if not, in how many weeks it comes back.'] },
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
// etichetta colorata, titolo, freccia rossa) e il dettaglio (notices_detail_yt_03.jpg e notices_dialog_01.jpg:
// fondo blu notte, testo spaziato, titoletti col quadratino, parole chiave in arancione, BACK blu in basso).
// Testo delle notizie: «## Titolo» = sezione (le righe sotto diventano un elenco puntato), «**parola**» = evidenziata.
function noticesPage(realMs = Date.now()) {
  const notices = [updateNotice(realMs), ...NOTICES];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="k">$1</b>');
  const bodyHtml = (body) => {
    let out = '', list = false;
    for (const line of body) {
      if (line.startsWith('## ')) {
        if (list) out += '</ul>';
        out += `<h3>${esc(line.slice(3))}</h3><ul>`;
        list = true;
      } else out += list ? `<li>${rich(line)}</li>` : `<p>${rich(line)}</p>`;
    }
    return out + (list ? '</ul>' : '');
  };
  const rows = notices.map((n, i) => `<a class="row" href="#n${i}" onclick="show(${i});return false">`
    + `<span class="d">${esc(n.date)}</span><span class="t" style="background:${TAG_COLOR[n.tag] || '#3f7fd0'}">${esc(n.tag)}</span>`
    + `<span class="x">${esc(n.title)}</span><span class="a"></span></a>`).join('');
  const details = notices.map((n, i) => `<div class="det" id="d${i}"><div class="meta"><span class="t" style="background:${TAG_COLOR[n.tag] || '#3f7fd0'}">${esc(n.tag)}</span>`
    + `<span class="d">${esc(n.date)}</span></div><h2>${esc(n.title)}</h2>${bodyHtml(n.body)}`
    + '<div class="bar"><a class="back" href="#" onclick="show(-1);return false">BACK<span></span></a></div></div>').join('');
  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>body{margin:0;background:#174a5c;color:#fff;font:18px sans-serif;letter-spacing:.3px}'
    + '.row{display:flex;align-items:center;padding:12px 10px;border-bottom:2px dotted #8fb3c0;color:#fff;text-decoration:none}'
    + '.row:active{background:#1f5d72}.d{width:62px}'
    + '.t{display:inline-block;width:124px;text-align:center;font-size:14px;padding:5px 0;margin-right:12px;border-radius:3px;'
    + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -2px 0 rgba(0,0,0,.18)}'
    + '.x{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a{margin-left:10px;width:0;height:0;border-style:solid;border-width:8px 0 8px 13px;border-color:transparent transparent transparent #e8242c}'
    + '.det{display:none;min-height:100vh;box-sizing:border-box;background:#0d3350;padding:14px 22px 96px;line-height:1.85}'
    + '.meta{display:flex;align-items:center;color:#9fc3d6;font-size:15px}.meta .t{width:auto;padding:3px 12px}'
    + 'h2{color:#5fe0f0;font-size:21px;margin:10px 0 14px;padding-bottom:8px;border-bottom:2px solid #1e5f80}'
    + 'h2:before,h3:before{content:"";display:inline-block;width:14px;height:14px;background:#2fd0e8;margin-right:10px;vertical-align:1px}'
    + 'h3{color:#5fe0f0;font-size:18px;margin:22px 0 6px}p{color:#eef4f7;margin:0 0 14px}'
    + 'ul{margin:0 0 6px;padding:0 0 0 4px;list-style:none}li{position:relative;padding:6px 0 6px 22px;border-bottom:1px solid #1a4a68;color:#eef4f7}'
    + 'li:before{content:"";position:absolute;left:4px;top:19px;width:7px;height:7px;border-radius:50%;background:#2fd0e8}'
    + '.k{color:#ffae3b;font-weight:bold}'
    + '.bar{position:fixed;left:0;right:0;bottom:0;padding:10px 16px;background:linear-gradient(rgba(6,26,42,0),rgba(6,26,42,.92) 35%)}'
    + '.back{display:inline-block;padding:7px 26px 8px;border-radius:10px;border:2px solid #9fd4ff;color:#fff;text-decoration:none;'
    + 'font:italic bold 20px sans-serif;letter-spacing:1px;background:linear-gradient(#5aa8ff,#2556c8 55%,#1b3f9c);'
    + 'box-shadow:0 2px 0 #0b2a66,inset 0 1px 0 rgba(255,255,255,.5);text-shadow:0 1px 2px #0a2a6a}.back span{display:inline-block;margin-left:12px;width:14px;height:9px;border:3px solid #fff;border-left:0;border-radius:0 8px 8px 0;vertical-align:1px;position:relative}.back span:after{content:"";position:absolute;left:-7px;bottom:-8px;border-style:solid;border-width:6px 9px 6px 0;border-color:transparent #fff transparent transparent}</style>'
    + '<script>function show(i){document.getElementById("list").style.display=i<0?"block":"none";'
    + 'for(var k=0;k<' + notices.length + ';k++)document.getElementById("d"+k).style.display=k===i?"block":"none";'
    + 'window.scrollTo(0,0)}'
    // avvisa il server appena disegnata (tempi del popup al primo avvio, server.js noticesshown)
    // tempi delle fasi misurati dalla WebView (risposta, DOM pronto, primo disegno, load), in ms dall'inizio della navigazione
    + 'window.addEventListener("load",function(){requestAnimationFrame(function(){var t=performance.timing,n=t.navigationStart,'
    + 'p=(performance.getEntriesByType&&performance.getEntriesByType("paint"))||[],fp=p.length?Math.round(p[0].startTime):-1;'
    + 'new Image().src="/web/notices/shown?resp="+(t.responseEnd-n)+"&dom="+(t.domContentLoadedEventEnd-n)+"&paint="+fp+"&load="+(t.loadEventStart-n)+"&now="+Math.round(performance.now())})})'
    + '</script></head><body>'
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
