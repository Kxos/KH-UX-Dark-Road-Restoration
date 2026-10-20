# Fix estrazione dopo cambio pin a Shop aperto

Causa radice (confermata): server/server.js respondGachaDraw rifiutava ogni banner fuori da gachaShopList(storyCtx()), cioe' la lista
ATTUALE (con il nuovo banner fissato), mentre il client mostra l'ultima /gacha/list ricevuta (non la ricarica alla chiusura del Catalog).
Il test scritto prima del fix riproduceva il log `B0002 non e' nella lista dello Shop`.

Modifica: server.js tiene `gachaLastListed` (Set dei drawMedalTypeId dell'ultima respondGachaList, in memoria); respondGachaDraw accetta
se il banner e' nella lista attuale, in gachaLastListed o in KHUX_GACHA_SHOW. checkDraw (prezzo, limiti, pool) invariato. Copre pin, unpin
e cambio settimana. Esportato gachaShopList per il test.

Test (server/test-gacha-server.js): lista -> pin altro banner -> estrazione del vecchio fissato accettata (addebito); id sconosciuto e
banner in nessuna lista rifiutati; dopo nuova lista il vecchio fissato rifiutato.

Comandi: node server/test-gacha-server.js -> OK: gacha server; node server/test-gacha.js -> OK: gacha; node --check server/server.js -> ok.
