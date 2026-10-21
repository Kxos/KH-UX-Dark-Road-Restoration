// Prova delle righe master delle missioni di storia 526-979 (make-story-oltre.js, I-009):
//   node server/test-story-oltre.js
// Fonti finte minime costruite qui (nessun dato vero): 1.1.3 per 526-555, wiki e oltre525.json per le altre.
'use strict';
const fs = require('fs'), path = require('path');
const { buildRows, patch, wikiLv, ROOM_WORLD, defaultSources } = require('./make-story-oltre');
// cartelle temporanee sul disco D (regola del progetto), tolte alla fine
const TMP = process.env.KHUX_TMP || 'D:\\Progetto_Restauro_KH_UX\\tmp';
fs.mkdirSync(TMP, { recursive: true });
const tmpDirs = [];
const mkTmp = () => { const d = fs.mkdtempSync(path.join(TMP, 'oltre-')); tmpDirs.push(d); return d; };
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

// --- fonti finte ---------------------------------------------------------------------------------------------
const PREFIX = { 526: 'DW', 537: 'DB', 556: 'AG', 600: 'CD', 700: 'ED', 871: 'CS', 880: 'NL', 890: 'HD', 931: 'SR' };
const prefixOf = (n) => PREFIX[Object.keys(PREFIX).map(Number).filter((k) => k <= n).pop()];
const stageIdOf = (n) => (n === 555 ? 18302 : n === 978 ? 39158 : n === 979 ? 39159 : 18000 + (n - 525) * 10);
const wiki = {}, wikiRaw = {}, missions = [], stage113 = [];
// obiettivi «Defeat the X»: nome nel master (senza articolo), bersaglio dello stage, nome solo JP, nome sconosciuto
const SECOND = { 601: 'Defeat the Phantom Thing within 1 turn', 603: 'Defeat the Shadow within 2 turns',
  605: 'Defeat the Nessuno within 1 turn', 607: 'Defeat Solo JP x 3', 609: 'Complete within 45 seconds' };
for (let n = 526; n <= 979; n++) {
  if (n === 978) continue;
  const title = `Quest ${n}: Finta ${n}`;
  const room = n === 600 ? 'The Chateau: Stairs' : `Stanza ${n}`;
  const objectives = [
    { text: 'Defeat all enemies within 1 turn', reward: 'Avatar Coin', qty: '6' },
    n === 600 ? { text: 'Defeat Phantom Thing x 2', reward: 'Title', qty: '1' }
      : SECOND[n] ? { text: SECOND[n], reward: 'Avatar Coin', qty: '4' }
        : { text: 'Defeat the target enemy within 2 turns', reward: 'Avatar Coin', qty: '4' },
    { text: 'Complete without having to continue', reward: 'Mythril Shard', qty: '1' },
  ];
  wiki[title] = { title, number: String(n), name: `Finta ${n}`, world: n === 650 ? 'Castle of Dreams' : 'X', rooms: [room], ap: n % 2 ? 'zero' : '25',
    lvl: String(100 + n), target: 'Shadow', objectives, jewel: n === 600 ? '250' : null,
    rewards: n === 600 ? { namunny: 20000, jpmunny: 20000 } : {}, treasures: [], enemies: [] };
  wikiRaw[title] = n === 600 ? '{{InfoQuestKHUX\n|naotitle=Presently\n|nakeyblade=Stroke of Midnight\n}}' : '{{InfoQuestKHUX\n}}';
  const sid = stageIdOf(n);
  missions.push({ q: n, title, rooms: [room], stage: { stageId: sid, rooms: [n === 650 ? 'DG_0200_27_00' : `${prefixOf(n)}_0001_00_00`],
    target_id: n === 700 ? 77777 : 10001 } });
}
wikiRaw['Quest 978: What Comes After'] = '{{InfoQuestKHUX/Cutscene\n|number=978\n|nadesc=What Comes After\n|world=Daybreak Town\n'
  + '|najewel=1000\n|naqtitle=Fates Entwined\n|namedal=Chip 6★\n|namedalq=5\n|proudap=zero\n}}';
for (let n = 526; n <= 555; n++) {
  const sid = n === 555 ? 18300 : stageIdOf(n);
  stage113.push({ stageId: sid, id: n, name: `Finta ${n}`, mapName: `Mappa 1.1.3 ${n}`, useAp: 99, chapterId: 0, worldId: 9,
    thumbId: 5000 + n, stageKind: 1, showIcon: 0, validBeforeDrama: 2, beforeDramaId: [1180101, 2999950, 980710245, 1, 2],
    beforeDramaType: [0, 0, 980710245, 1, 2], validAfterDrama: 0, afterDramaId: [0, 0, 980710245, 1, 2],
    afterDramaType: [0, 0, 980710245, 1, 2], validClearGetTitle: 0, clearGetTitle: 0, validClearGetSphere: 0,
    clearGetSphere: 0, resetClearGet: 0, validClearGetItem: 1, clearGetItemType: [2, 2037214581, 0],
    clearGetItemId: [0, 2037214581, 0], clearGetAssignSkillType: [1, 2037214581, 0], clearGetAssignSkillId: [0, 1, 0],
    clearGetAssignSkillLv: [1, 1, 0], clearGetItemNum: [150, 7, 0], resetSubMission: 0, validSubmission: 3,
    submissionRequire: [28, 12, 4], submissionName: ['Defeat all enemies within 1 turn', 'Defeat the target enemy within\n1 turn',
      'Defeat %s x %d'], submissionDataType: [1, 4, 4], submissionIdType: [0, 1, 1], submissionId: [0, 10001, 99],
    submissionNum: [0, 1, 2], submissionRewardType: [14, 14, 5], submissionItemId: [0, 0, 1], submissionSkillType: [0, 0, 0],
    submissionSkillId: [0, 0, 0], submissionSkillLv: [0, 0, 0], submissionItemNum: [6, 4, 1], raidBoss: 5015,
    bgmField: 501000110, bgmBattle: 501000120, bgmBoss: 501000130 });
}
// master 1-525: due righe di storia (mondi 1 e 4) + la 1050 (non di storia) come riferimento
const base525 = { stageId: 17250, stageBinId: 0, id: 525, name: 'A Frosty Monstrosity', mapName: 'Frozen Forest', useAp: 25,
  chapterId: 17, worldId: 4, thumbId: 120200, onlyDrama: 0, stageKind: 1, raidBoss: 50000000, bgmField: 501000610,
  bgmBattle: 501000620, bgmBoss: 501000630 };
const stageRows = [{ ...base525, stageId: 17240, id: 524, worldId: 1, thumbId: 1001600, bgmField: 501005001 }, base525,
  { ...base525, stageId: 991001, id: 9101, name: 'Tour Daybreak Town', worldId: 1 }];
const enemies = [{ enemyId: 1, name: 'Shadow' }, { enemyId: 10001, name: 'Shadow' }, { enemyId: 99, name: 'Phantom Thing' }];
const titles = [{ titleId: 13067, title: 'Presently' }, { titleId: 13120, title: 'Fates Entwined' }];
const medals = [{ medalId: 90056, name: 'Chip', rare: 6 }, { medalId: 90026, name: 'Huey', rare: 6 }];
const keyblades = [{ keybladeId: 10000, name: 'Stroke of Midnight', lv: 0 }, { keybladeId: 2000, name: 'Treasure Trove', lv: 0 }];
const theater = [
  { stageId: 18060, validTheater: 1, dramaId: [2300101], dramaType: [0] },
  { stageId: 39158, validTheater: 1, dramaId: [2560701, 2560801, 2560901, 2561001], dramaType: [0, 0, 0, 0] },
  { stageId: 39158, validTheater: 1, dramaId: [2561101], dramaType: [0] },
  { stageId: 39158, validTheater: 1, dramaId: [2561201], dramaType: [0] },
  { stageId: 39159, validTheater: 1, dramaId: [140350, 2561301], dramaType: [10, 0] },
];
const dramas = new Set([1180101, 2300101, 2560701, 2560801, 2560901, 2561001, 2561101, 2561201, 2561301]);
const oltre = { missions, learned_enemy_names: { 1637: 'Solo JP' } };
const sources = { stage113, wiki, wikiRaw, oltre, theater, dramas, enemies, titles, medals, keyblades, skills: [] };

// --- righe ---------------------------------------------------------------------------------------------------
const rows = buildRows(stageRows, sources);
const byId = new Map(rows.map((r) => [r.id, r]));
check(rows.length === 454 && [...Array(454).keys()].every((i) => byId.has(526 + i)), `righe 526..979: ${rows.length}`);
check(rows.every((r) => r.stageKind === 1 && r.stageBinId === 0), 'stageKind 1 e stageBinId 0 come le 1-525');
check(rows.every((r) => r.branchType === (r.id === 555 ? 1 : 0)), 'branchType 0 salvo la 555');
const q555 = byId.get(555);
check(q555 && q555.stageId === 18300 && q555.branchType === 1, `555: stageId 18300 branchType 1 (${q555 && q555.stageId})`);
check(byId.get(600).stageId === 18750 && byId.get(979).stageId === 39159, 'stageId da oltre525.json');
// useAp dalla wiki, "zero" -> 0 (anche 526-555, non dal 1.1.3)
check(byId.get(527).useAp === 0 && byId.get(526).useAp === 25 && byId.get(601).useAp === 0 && byId.get(600).useAp === 25,
  'useAp dalla wiki');
// mapName: 1.1.3 per 526-555, rooms[0] della wiki dopo
check(byId.get(530).mapName === 'Mappa 1.1.3 530' && byId.get(600).mapName === 'The Chateau: Stairs', 'mapName');
// worldId dal prefisso della stanza (mondi di Ralph 11-14, D-C), chapterId = stageId div 1000
check(byId.get(526).worldId === 2 && byId.get(540).worldId === 1 && byId.get(560).worldId === 4 && byId.get(600).worldId === 7
  && byId.get(700).worldId === 8 && byId.get(872).worldId === 13 && byId.get(880).worldId === 11
  && byId.get(890).worldId === 12 && byId.get(931).worldId === 14, 'worldId dal prefisso');
check(ROOM_WORLD.NL === 11 && ROOM_WORLD.HD === 12 && ROOM_WORLD.CS === 13 && ROOM_WORLD.SR === 14, 'mondi di Ralph 11-14');
check(rows.every((r) => r.chapterId === Math.floor(r.stageId / 1000)), 'chapterId = stageId div 1000');
// Lv della scheda (STG [11], Task 3) dalla wiki
check(wikiLv(wiki['Quest 600: Finta 600']) === 700 && wikiLv({ lvl: null }) === 0, 'Lv dalla wiki');
// array tagliati alle lunghezze valide; drammi solo se presenti nelle risorse
const r530 = byId.get(530);
check(r530.clearGetItemType.length === 1 && r530.clearGetItemNum[0] === 150, 'clearGet tagliato a validClearGetItem');
check(r530.validBeforeDrama === 1 && JSON.stringify(r530.beforeDramaId) === '[1180101]', `drammi 1.1.3 filtrati: ${r530.beforeDramaId}`);
check(r530.validAfterDrama === 0 && r530.afterDramaId.length === 0, 'drammi dopo tagliati');
// drammi delle 556+: dal theater (stessa stageId), non della riga di riferimento
check(byId.get(600).validBeforeDrama === 0 && byId.get(600).beforeDramaId.length === 0, 'nessun dramma senza theater');
const r979 = byId.get(979);
check(r979.validBeforeDrama === 1 && r979.beforeDramaId[0] === 2561301, 'theater: id assenti dalle risorse tolti');
// campi senza fonte dall'ultima riga 1-525 dello stesso worldId (non dai tour)
check(byId.get(560).bgmField === 501000610 && byId.get(560).thumbId === 120200, 'bgm/thumb dalla 525 (mondo 4)');
check(byId.get(560).raidBoss === 50000000, 'raidBoss dalla riga di riferimento');
check(byId.get(540).thumbId === 5000 + 540, 'thumb della 1.1.3 per 526-555');
// obiettivi dalla wiki
const r600 = byId.get(600);
check(r600.validSubmission === 3 && r600.submissionRequire[0] === 28 && r600.submissionRewardType[0] === 14
  && r600.submissionItemNum[0] === 6, 'obiettivo 1 «Defeat all enemies within 1 turn» -> 28, 6 Avatar Coin');
check(r600.submissionRequire[1] === 4 && r600.submissionId[1] === 99 && r600.submissionNum[1] === 2
  && r600.submissionName[1] === 'Defeat %s x %d', 'obiettivo «Defeat X x N» -> 4/4/1 nemico per nome');
check(r600.submissionRewardType[1] === 7 && r600.submissionItemId[1] === 13067, 'premio Title -> 7 + titleId (naotitle)');
check(r600.submissionRequire[2] === 10 && r600.submissionRewardType[2] === 5 && r600.submissionItemId[2] === 1,
  'Complete without having to continue -> 10, Mythril Shard -> 5:1');
const r602 = byId.get(602);
check(r602.submissionRequire[1] === 12 && r602.submissionId[1] === 10001 && r602.submissionNum[1] === 2,
  'Defeat the target enemy within 2 turns -> 12/4/1 bersaglio dello stage');
check(byId.get(601).submissionRequire[1] === 12 && byId.get(601).submissionId[1] === 99, '«Defeat the X»: nome senza articolo');
check(byId.get(603).submissionId[1] === 10001, '«Defeat the <bersaglio>»: id pieno del bersaglio dello stage');
check(byId.get(605).submissionId[1] === 1, 'nome sconosciuto: mai id 0, Shadow');
check(byId.get(607).submissionRequire[1] === 4 && byId.get(607).submissionId[1] === 1, 'nome solo JP (1637, assente dal master) -> 1');
check(byId.get(609).submissionRequire[1] === 10 && byId.get(609).submissionName[1] === 'Complete within 45 seconds'
  && rows.report.stopgapObjectives.some(([n, i]) => n === 609 && i === 2), 'obiettivo senza codice: tappabuchi segnalato');
check(byId.get(650).worldId === 7, 'stanza DG: mondo della wiki');
// premi di fine missione: jewel, munny, keyblade
check(JSON.stringify(r600.clearGetItemType) === '[2,4,13]' && JSON.stringify(r600.clearGetItemNum) === '[250,20000,1]'
  && r600.clearGetItemId[2] === 10000 && r600.validClearGetItem === 3, `clearGet 600: ${r600.clearGetItemType}`);
// «Defeat X» su nemici assenti dal master -> 1 (Shadow), come make-game-tables.js; 1.1.3 compresa
check(byId.get(700).submissionId[1] === 1, 'bersaglio 77777 assente dal master -> 1');
check(byId.get(530).submissionId[1] === 10001 && byId.get(530).submissionId[2] === 99, 'nemici presenti: invariati');
// Q978: solo filmato (D-B): onlyDrama 1 -> StageSkipActionMap, nessuna mappa
const r978 = byId.get(978);
check(r978 && r978.onlyDrama === 1 && r978.stageId === 39158 && r978.worldId === 1 && r978.useAp === 0
  && r978.validSubmission === 0 && r978.mapName === '' && r978.name === 'What Comes After', '978 riga di solo filmato');
check(r978.validBeforeDrama === 5 && r978.beforeDramaId[0] === 2560701 && r978.beforeDramaId[4] === 2561101
  && r978.validAfterDrama === 1 && r978.afterDramaId[0] === 2561201, `978 filmati: ${r978.beforeDramaId} / ${r978.afterDramaId}`);
check(r978.validClearGetTitle === 1 && r978.clearGetTitle === 13120, '978 titolo Fates Entwined');
check(JSON.stringify(r978.clearGetItemType) === '[2,3]' && r978.clearGetItemId[1] === 90056 && r978.clearGetItemNum[1] === 5,
  `978 premi: ${r978.clearGetItemType}`);
check(rows.filter((r) => r.onlyDrama).length === 1, 'solo la 978 senza mappa');
// stessa forma delle righe 1-525 (stesse chiavi, stesso ordine)
const KEYS = Object.keys(rows[0]).join();
check(rows.every((r) => Object.keys(r).join() === KEYS), 'tutte le righe con le stesse chiavi');
check(['stageBinId', 'onlyDrama', 'hideIcon', 'noPartner', 'validStopStage', 'branchType', 'hardmodeName',
  'combinedSubmissionFlag'].every((k) => k in rows[0]), 'campi della 5.0.1 presenti');

// --- patch: idempotente, dopo la 525, KHUX_STORY_OLTRE=0 lo spegne -------------------------------------------
const dir = mkTmp();
fs.writeFileSync(path.join(dir, 'stage.json'), JSON.stringify(stageRows));
for (const [f, v] of [['enemy', enemies], ['title', titles], ['medal', medals], ['keyblade', keyblades], ['theater', theater],
  ['skill', []]]) fs.writeFileSync(path.join(dir, f + '.json'), JSON.stringify(v));
const src = { stage113, wiki, wikiRaw, oltre, dramas };
patch(dir, src);
const once = fs.readFileSync(path.join(dir, 'stage.json'), 'utf8');
patch(dir, src);
const twice = fs.readFileSync(path.join(dir, 'stage.json'), 'utf8');
check(once === twice, 'patch due volte = stesso file');
const out = JSON.parse(twice);
check(out.length === stageRows.length + 454, `patch: ${out.length} righe`);
check(out[1].id === 525 && out[2].id === 526 && out[455].id === 979 && out[456].stageId === 991001,
  'righe nuove subito dopo la 525, prima dei tour');
check(JSON.stringify(out.filter((r) => !(r.id >= 526 && r.id <= 979))) === JSON.stringify(stageRows), 'righe esistenti invariate');
process.env.KHUX_STORY_OLTRE = '0';
const dir2 = mkTmp();
fs.writeFileSync(path.join(dir2, 'stage.json'), JSON.stringify(stageRows));
patch(dir2, src);
check(fs.readFileSync(path.join(dir2, 'stage.json'), 'utf8') === JSON.stringify(stageRows), 'KHUX_STORY_OLTRE=0: nessuna modifica');
delete process.env.KHUX_STORY_OLTRE;

// fonti obbligatorie: senza le 30 righe 1.1.3 (526-555) errore, mai righe generate al posto degli originali
const throws = (f, re) => { try { f(); return false; } catch (e) { return re.test(e.message); } };
check(throws(() => buildRows(stageRows, { ...sources, stage113: stage113.slice(1) }), /29 righe 18010-18300 su 30/),
  'buildRows: 1.1.3 incompleta -> errore');
check(throws(() => buildRows(stageRows, { ...sources, stage113: [] }), /0 righe/), 'buildRows: 1.1.3 assente -> errore');
const dir3 = mkTmp();
fs.writeFileSync(path.join(dir3, 'stage.json'), JSON.stringify(stageRows));
check(throws(() => patch(dir3, { ...src, stage113: [] }), /1\.1\.3/)
  && fs.readFileSync(path.join(dir3, 'stage.json'), 'utf8') === JSON.stringify(stageRows), 'patch: 1.1.3 assente -> errore, file intatto');
for (const k of ['KHUX_STAGE_113', 'KHUX_WIKI_QUESTS', 'KHUX_OLTRE525', 'KHUX_WIKI_ALL']) {
  const old = process.env[k];
  process.env[k] = path.join(dir3, 'manca.json');
  check(throws(() => defaultSources(), /fonte obbligatoria .*manca\.json/), `${k} assente -> errore col percorso`);
  if (old === undefined) delete process.env[k]; else process.env[k] = old;
}
for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
check(tmpDirs.every((d) => !fs.existsSync(d)), 'cartelle temporanee tolte');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('test-story-oltre: ok');
