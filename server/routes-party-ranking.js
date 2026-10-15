// Party (giocatore senza party, Union Cross/Photon offline: I-056) e classifiche della home
// (Rankings). Azioni di json/server_api.json, rami di [fn] (docs/notes/server.md#party-ranking).
//
// Classifiche (parser con la chiave di radice indicata, rankingStatus 2 = elenco, 1/3 = messaggio;
// [fn] sceglie il dato per scheda: tipo 4 Lux, 0x360 = 1 propria posizione / 2 prime /
// altro confine):
// - Lux, [fn]: 129 /ranking/weekly/user (luxRankingWeekly), 130 /ranking/monthly/user
//   (luxRankingMonthly), 131/132 .../own (luxRankingWeeklyOwn/MonthlyOwn), 133 /ranking/lux e
//   134 /ranking/lux/own (luxRanking), 178 /ranking/lux/border (luxRankingBorder):
//   {rankingDatas[], rankingStatus int, rankingTermStart, rankingTermEnd "YYYY-MM-DD HH:MM:SS",
//   lastRank int}; elemento [fn] = {userData: {user ([fn] modo 0, senza
//   nativeTagName), userDetail ([fn])}, userAvatar ([fn] -> [fn]), lux uint64,
//   rank int}.
//   Senza la 133: «200 ERROR :133» toccando Rankings (banco 14-10).
// - High score, [fn]: 135/136/179 (highscoreRanking, ...Own, ...Border), stessi campi.
// - Party, [fn]: 137/138/184 (partyRanking, ...Own, ...Border): rankingDatas, rankingStatus,
//   lastRank, updateTime, nextUpdateTime.
// - Colosseo, [fn]: 139/140/180 (colosseumRanking, ...Own, ...Border), come Lux.
// Un solo giocatore sul server: le classifiche Lux hanno lui al 1° posto, le altre sono vuote.
//
// Party: 83 /party, 86 /party/member/list, 81 PUT /party/notice e 24 /payment/info hanno gia' uno
// schema verificato (api_responses_ww431.json). Qui:
// - 82 POST /party/login: userParty ([fn]); party/partyLeader ([fn]) si leggono solo
//   se userParty.partyId != 0 (0x7c4ab0), isAbsenceLeader int.
// - 87 GET /party/search/active: partyList[] ([fn]); vuoto = nessun party da proporre.
// Il crash di Party/Party Search (SIGSEGV a 0x170 dopo /party/login) non e' nelle risposte: la
// scena [fn] carica PartyTopScene_ver131.json, assente da ogni risorsa WW (GUIReader -> null):
// layout originali JP in recon/tools/jp_coco_layouts.txt.
//
// Party di un solo giocatore (15-10, schemi in docs/notes/server.md#party-ranking): Create Party salva
// player.party; il giocatore e' leader e unico membro (userId, leaderUserId e supportUserId 1: il pannello
// destro [fn] cerca il leader in partyUserList, senza di lui legge fuori dall'array). Catena:
// 83 /party, 86 /party/member/list, 81 /party/notice, 84 /party/detail (solo con partyId), 82 /party/login.
// - 79 POST /party/create {name, message, playStyle, agreeType}: userParty, party, firstReward int.
// - party ([fn]): chatId 0 e chatEndpointUrl vuoto (chat HTTP non servita).
// - 86 con getDetail: ogni elemento = elemento giocatore ([fn]) + [fn] (userKeyblade,
//   userRanking, lastStageId, comment, linkPlatformId, userColosseumRanking/userPvpRanking int, raidHelpNumber).
// - 84 GET /party/detail: {rank uint}.
// - 80 POST /party/update e 85 POST /party/leave (ramo 0x7c3f88): solo userParty.

const LUX_KEYS = {
  '/ranking/weekly/user': 'luxRankingWeekly', '/ranking/monthly/user': 'luxRankingMonthly',
  '/ranking/weekly/user/own': 'luxRankingWeeklyOwn', '/ranking/monthly/user/own': 'luxRankingMonthlyOwn',
  '/ranking/lux': 'luxRanking', '/ranking/lux/own': 'luxRanking', '/ranking/lux/border': 'luxRankingBorder',
};
const EMPTY_KEYS = {
  '/ranking/highscore': 'highscoreRanking', '/ranking/highscore/own': 'highscoreRankingOwn',
  '/ranking/highscore/border': 'highscoreRankingBorder',
  '/ranking/party': 'partyRanking', '/ranking/party/own': 'partyRankingOwn', '/ranking/party/border': 'partyRankingBorder',
  '/ranking/colosseum': 'colosseumRanking', '/ranking/colosseum/own': 'colosseumRankingOwn',
  '/ranking/colosseum/border': 'colosseumRankingBorder',
};

function routePartyRanking(p) {
  if (p === '/party/login') return 'partylogin';
  if (p === '/party/create') return 'partycreate';
  if (PARTY_EMPTY_LISTS[p]) return 'partyemptylist';
  if (p === '/party/update') return 'partyupdate';
  if (p === '/party/leave') return 'partyleave';
  if (p === '/party') return 'party';
  if (p === '/party/member/list') return 'partymembers';
  if (p === '/party/detail') return 'partydetail';
  if (p === '/party/search/active') return 'partysearch';
  if (LUX_KEYS[p] || EMPTY_KEYS[p]) return 'rankinglist';
  return null;
}

// periodo della classifica: settimana o mese in corso (ora del server, "YYYY-MM-DD HH:MM:SS")
function term(now, monthly) {
  const d = new Date(now.replace(' ', 'T') + 'Z');
  const start = monthly
    ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
  const end = monthly
    ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - 1000)
    : new Date(start.getTime() + 7 * 86400000 - 1000);
  const fmt = (x) => x.toISOString().slice(0, 19).replace('T', ' ');
  return { start: fmt(start), end: fmt(end) };
}

const PARTY_ID = 1;
const FIRST_PARTY_JEWELS = 100;
// Elenchi del party sempre vuoti (un solo giocatore sul server; parser dai rami di [fn], 15-10):
// 89 [fn], 91 [fn], 98 [fn] con la chiave partyUserList (stringa 0x1775281), 100 [fn], 102 [fn]
const PARTY_EMPTY_LISTS = {
  '/party/application/list': { partyApplicants: [], partyList: [] },
  '/party/applicant/list': { partyApplicants: [], partyUserList: [] },
  '/party/invite/search': { partyUserList: [] },
  '/party/invite/list': { partyOffers: [], partyUserList: [] },
  '/party/offer/list': { partyOffers: [], partyList: [] },
};

// deps: send, ret, serverTime, player, userObject, userDetailData, userAvatarData, savePlayer,
// selfElement(now, partyId), keyblade()
function respondPartyRanking(deps, res, kind, p, body) {
  const { send, ret, serverTime, player } = deps;
  if (kind === 'partyemptylist') return send(res, 200, { ret: ret(), ...PARTY_EMPTY_LISTS[p] });
  const now = serverTime();
  let firstReward = 0;
  if (kind === 'partycreate') {
    player.party = {
      name: String(body?.name || `${player.name}'s Party`), message: String(body?.message || ''),
      playStyle: Number(body?.playStyle) || 0, agreeType: Number(body?.agreeType) || 0, createDate: now,
    };
    // «Receive 100 Jewels for joining your first party!» (PartyTop_Initial): una sola volta per giocatore, nei
    // Presents (resourceType 2 = jewel): il client non rilegge i jewel dopo la 79
    firstReward = player.partyFirstRewardDone ? 0 : 1;
    if (firstReward) { player.partyFirstRewardDone = 1; deps.addPresent(2, 0, FIRST_PARTY_JEWELS, 'First Party Bonus'); }
    deps.savePlayer();
    console.log(`  [party] creato «${player.party.name}» (playStyle ${player.party.playStyle}, agreeType ${player.party.agreeType})` +
      (firstReward ? `, primo party: ${FIRST_PARTY_JEWELS} jewel nei Presents` : ''));
  }
  // 80 POST /party/update (stesso corpo di create) e 85 POST /party/leave: ramo 0x7c3f88, solo userParty
  if (kind === 'partyupdate' && player.party) {
    for (const k of ['name', 'message']) if (typeof body?.[k] === 'string') player.party[k] = body[k];
    for (const k of ['playStyle', 'agreeType']) if (body && k in body) player.party[k] = Number(body[k]) || 0;
    deps.savePlayer();
    console.log(`  [party] modificato: ${JSON.stringify(player.party)}`);
  }
  if (kind === 'partyleave' && player.party) {
    console.log(`  [party] sciolto «${player.party.name}»`);
    delete player.party;
    deps.savePlayer();
  }
  const pt = player.party;
  const userParty = pt
    ? { userId: 1, partyId: PARTY_ID, isJoin: 1, isLeader: 1, isAdmin: 0, flagFirstReward: player.partyFirstRewardDone ? 1 : 0, joinDate: pt.createDate }
    : { userId: 1, partyId: 0, isJoin: 0, isLeader: 0, isAdmin: 0, flagFirstReward: player.partyFirstRewardDone ? 1 : 0, joinDate: now };
  const party = pt && {
    partyId: PARTY_ID, unionId: player.unionId || 0, rank: 1, name: pt.name, playStyle: pt.playStyle,
    agreeType: pt.agreeType, message: pt.message, memberCount: 1, leaderUserId: 1, adminUserIds: [],
    leaderAppointDate: pt.createDate, newcomerDate: pt.createDate, chatId: 0, chatEndpointUrl: '',
  };
  const withParty = (o) => (pt ? { ret: ret(), userParty, party, ...o } : { ret: ret(), userParty, ...o });
  if (kind === 'partycreate') return send(res, 200, withParty({ firstReward }));
  if (kind === 'party' || kind === 'partyupdate' || kind === 'partyleave') return send(res, 200, withParty({}));
  if (kind === 'partydetail') return send(res, 200, { ret: ret(), rank: 0 });
  if (kind === 'partymembers') {
    const partyUserList = pt ? [{
      ...deps.selfElement(now, PARTY_ID),
      userKeyblade: deps.keyblade(), userRanking: { lux: player.lux || 0, rank: 1 }, lastStageId: 0,
      comment: player.comment || '', linkPlatformId: '', userColosseumRanking: 0, userPvpRanking: 0, raidHelpNumber: 0,
    }] : [];
    return send(res, 200, withParty({ partyUserList }));
  }
  if (kind === 'partylogin') {
    return send(res, 200, pt
      ? withParty({ isAbsenceLeader: 0, partyLeader: deps.selfElement(now, PARTY_ID) })
      : { ret: ret(), userParty, isAbsenceLeader: 0 });
  }
  if (kind === 'partysearch') return send(res, 200, { ret: ret(), partyList: [] });
  const t = term(now, /monthly/.test(p));
  const base = { rankingStatus: 2, rankingTermStart: t.start, rankingTermEnd: t.end, lastRank: 0,
    updateTime: now, nextUpdateTime: t.end };
  if (LUX_KEYS[p]) {
    // userData.user ([fn] cerca "user" dentro "userData") e userData.userDetail
    // ([fn]), come in GET /user; con user e userDetail piatti: «200 ERROR :133» (banco 14-10)
    const me = { userData: { user: deps.userObject(now), userDetail: deps.userDetailData() },
      userAvatar: deps.userAvatarData(), lux: player.lux || 0, rank: 1 };
    return send(res, 200, { ret: ret(), [LUX_KEYS[p]]: { ...base, rankingDatas: [me], lastRank: 1 } });
  }
  return send(res, 200, { ret: ret(), [EMPTY_KEYS[p]]: { ...base, rankingDatas: [] } });
}

module.exports = { routePartyRanking, respondPartyRanking, LUX_KEYS, EMPTY_KEYS };
