# La banca Linked — banca contenuti LinkedIn

Pannello locale per gestire i contenuti LinkedIn: idee grezze, post scritti, piano editoriale, banca immagini, editor di grafiche statiche e caroselli. Stile e struttura ricalcano la dashboard admin di Misha Travel.

## Regole che l'app fa rispettare

- **Ogni post ha un visual.** Senza immagine o grafica collegata il post porta il tag *Immagine mancante* ovunque: lista, calendario, dashboard, pagina del post.
- **Almeno 3 post a settimana, e la prossima settimana deve essere pronta.** La dashboard apre con le schede dei post della settimana successiva e gli slot ancora liberi. In *Da fare* e in dashboard: quanti post servono (obiettivo e giorni di uscita si impostano in *Ritmo di pubblicazione*), quali slot sono liberi, quali post sono incompleti.
- **Da fare** unisce le cose generate dai contenuti (immagini mancanti, testi vuoti, slot liberi, post scaduti) e una lista manuale con la spunta.

## Tag del post

- **Funnel**: TOFU / MOFU / BOFU.
- **Tipo di immagine** (indipendente dal tipo di post): selfie, screen, foto del PC con schermata, immagine statica, carosello.
- Tipologie di post: da definire.

## Avvio

Doppio clic su `Avvia La banca Linked.command`, oppure:

```bash
npm run dev
```

e apri http://localhost:3210.

## Dove stanno i dati

Tutto in `data/` (esclusa da git):

- `ideas.json`, `posts.json`, `images.json`, `designs.json` — i dati, scritti in modo atomico a ogni modifica
- `images/` — i file immagine
- `backups/AAAA-MM-GG/` — istantanee automatiche (al massimo una ogni 5 minuti per collezione, tenute 60 giorni)
- `cestino.json` — ogni eliminazione finisce qui ed è ripristinabile da *Backup e dati*

Per spostare i dati altrove (es. iCloud Drive) avvia con `BANCA_DATA_DIR=/percorso npm run dev`.

## Caroselli per LinkedIn

Editor → Esporta → *PDF carosello*: LinkedIn li pubblica come documento. Formato consigliato 4:5 (1080×1350).

## Da Claude Code: sessioni

Il connettore MCP `mcp/server.mjs` fa salvare a Claude Code i risultati di una chat direttamente in banca: ogni chat crea una **sessione** (sidebar → *Sessioni*) con i post e le idee che ha prodotto e il materiale di partenza. La pagina si aggiorna da sola in pochi secondi.

Registrazione (una volta sola, già fatta):

```bash
claude mcp add banca-linked -s user -- node "$PWD/mcp/server.mjs"
```

Tool: `banca_crea_sessione`, `banca_aggiorna_sessione`, `banca_salva_post`, `banca_aggiorna_post`, `banca_salva_idea`, `banca_allega_immagine`, `banca_prossima_settimana`, `banca_cerca_post`, `banca_elenca_sessioni`.
Se la banca è spenta, il connettore la avvia da solo. Indirizzo diverso: variabile `BANCA_URL`.

Nel second brain la skill `post-da-trascrizione` usa questi tool: trascrizione → post in bozza + idee → sessione in banca.
