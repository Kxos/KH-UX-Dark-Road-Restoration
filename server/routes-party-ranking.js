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
//   lastRank int}; elemento [fn] = {userData (campi di GET /user userData.user),
//   userDetail ([fn]), userAvatar ([fn] -> [fn]), lux uint64, rank int}.
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

// deps: send, ret, serverTime, player, userObject, userDetailData, userAvatarData
function respondPartyRanking(deps, res, kind, p) {
  const { send, ret, serverTime, player } = deps;
  const now = serverTime();
  const userParty = { userId: 1, partyId: 0, isJoin: 0, isLeader: 0, isAdmin: 0, flagFirstReward: 0, joinDate: now };
  if (kind === 'partylogin') return send(res, 200, { ret: ret(), userParty, isAbsenceLeader: 0 });
  if (kind === 'partysearch') return send(res, 200, { ret: ret(), partyList: [] });
  const t = term(now, /monthly/.test(p));
  const base = { rankingStatus: 2, rankingTermStart: t.start, rankingTermEnd: t.end, lastRank: 0,
    updateTime: now, nextUpdateTime: t.end };
  if (LUX_KEYS[p]) {
    const me = { userData: deps.userObject(now), userDetail: deps.userDetailData(), userAvatar: deps.userAvatarData(),
      lux: player.lux || 0, rank: 1 };
    return send(res, 200, { ret: ret(), [LUX_KEYS[p]]: { ...base, rankingDatas: [me], lastRank: 1 } });
  }
  return send(res, 200, { ret: ret(), [EMPTY_KEYS[p]]: { ...base, rankingDatas: [] } });
}

module.exports = { routePartyRanking, respondPartyRanking, LUX_KEYS, EMPTY_KEYS };
