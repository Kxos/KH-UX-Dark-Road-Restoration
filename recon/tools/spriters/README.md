# Spriters Resource — fogli di KHUX

`https://www.spriters-resource.com/mobile/kingdomheartsunion/` sta dietro la verifica
JavaScript di Cloudflare: le richieste dirette (anche `curl_cffi` che imita Chrome) hanno
403. Funziona così (Python per l'utente con `playwright` e `curl_cffi`, Edge installato):

1. `sr_probe.py <index.html> <profilo Edge>`: apre la pagina in Edge pilotato (finestra
   visibile, `--disable-blink-features=AutomationControlled`), attende la fine della
   verifica e salva l'indice;
2. `sr_parse.py <index.html> <elenco.tsv>`: sezioni e fogli (sezione, id, nome);
3. `sr_big.py <elenco.tsv> <uscita> <profilo Edge>`: con Edge legge la pagina di ogni foglio
   (link `/media/assets/<n>/<id>.png`), poi scarica i file con `curl_cffi` usando i cookie
   e lo User-Agent di Edge, scrivendo su disco a blocchi (le mappe sono fino a 200 MB).

Risultato (9 ottobre 2026): 112 fogli in `D:\Progetto_Restauro_KH_UX\reference\spriters\`
(Player Character, Keyblades, Medals, Items, Spirit, Dark Road, Maps, Menus).