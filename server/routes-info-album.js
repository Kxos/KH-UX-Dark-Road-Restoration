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

const NOTICES = [
  { date: '10/14', tag: 'IMPORTANT', title: 'About this restoration server',
    body: ['This is a private, offline restoration of KINGDOM HEARTS Union χ[Cross].',
      'Your data is saved only on this server. There are no purchases: Jewels and items come from quests, missions and presents.'] },
  { date: '10/14', tag: 'INFORMATION', title: 'Supernova and Dual Meow Wow',
    body: ['Equipping a Supernova Medal lets you unleash its powerful Supernova once per quest: tap the button under the Burst gauge during your turn.',
      'Five of the same Dual Meow Wow Medals are needed to grant Supernova or strengthen the Supernova of a specific Medal (Evolve, with the base Medal at max level).'] },
  { date: '10/14', tag: 'UPDATE', title: 'Original enemy graphics restored',
    body: ['Most enemies of the story quests now use their original graphics.'] },
  { date: '10/14', tag: 'UPDATE', title: 'Special Attack effects restored',
    body: ['Special Attacks raise and lower STR and DEF again, with the buff and debuff icons shown in battle.'] },
  { date: '10/13', tag: 'INFORMATION', title: 'Daily and Weekly Missions',
    body: ['Open the scroll under your avatar on the home screen to see your missions, then tap Receive to collect the rewards.'] },
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
function noticesPage() {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = NOTICES.map((n, i) => `<a class="row" href="#n${i}" onclick="show(${i});return false">`
    + `<span class="d">${esc(n.date)}</span><span class="t" style="background:${TAG_COLOR[n.tag] || '#3f7fd0'}">${esc(n.tag)}</span>`
    + `<span class="x">${esc(n.title)}</span><span class="a">&#9654;</span></a>`).join('');
  const details = NOTICES.map((n, i) => `<div class="det" id="d${i}"><h2>&#9632; ${esc(n.title)}</h2>`
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
    + 'for(var k=0;k<' + NOTICES.length + ';k++)document.getElementById("d"+k).style.display=k===i?"block":"none";'
    + 'window.scrollTo(0,0)}</script></head><body>'
    + `<div id="list">${rows}</div>${details}</body></html>`;
}

// owned: medaglie possedute [{medalId, guiltFactor}]; medalRows: tabella master medal;
// maxGuilt(tier) -> fattore massimo del tier (medal-guilt.js GUILT_RANGES)
function albumData(owned, medalRows, maxGuilt) {
  const byId = new Map(medalRows.map((r) => [r.medalId, r]));
  const best = new Map();
  for (const m of owned) {
    const row = byId.get(m.medalId);
    if (!row || m.medalId === 1) continue;
    const f = m.guiltFactor || 0;
    const top = maxGuilt(row.guiltValue || 0);
    const st = f <= 0 ? 0 : top && f >= top ? 2 : 1;
    best.set(m.medalId, Math.max(best.get(m.medalId) ?? 0, st));
  }
  return {
    userAlbum: {
      albumMedals: [...best].sort((a, b) => a[0] - b[0]).map(([medalId, guiltStatus]) => ({ medalId, guiltStatus })),
      allMedalCount: medalRows.filter((r) => r.medalId !== 1).length,
    },
  };
}

module.exports = { NOTICES, noticesUrl, informationList, informationPopup, noticesPage, albumData };
