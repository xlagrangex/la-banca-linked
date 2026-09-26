# La banca Linked — banca contenuti LinkedIn

Pannello locale per gestire i contenuti LinkedIn: idee grezze, post scritti, piano editoriale, banca immagini, editor di grafiche statiche e caroselli. Stile e struttura ricalcano la dashboard admin di Misha Travel.

## Regole che l'app fa rispettare

- **Ogni post ha un visual.** Senza immagine o grafica collegata il post porta il tag *Immagine mancante* ovunque: lista, calendario, dashboard, pagina del post.
- **Almeno 3 post a settimana, e la prossima settimana deve essere pronta.** La dashboard apre con le schede dei post della settimana successiva e gli slot ancora liberi. In *Da fare* e in dashboard: quanti post servono (obiettivo e giorni di uscita si impostano in *Ritmo di pubblicazione*), quali slot sono liberi, quali post sono incompleti.
- **Da fare** unisce le cose generate dai contenuti (immagini mancanti, testi vuoti, slot liberi, post scaduti) e una lista manuale con la spunta.

## Tag del post

- **Funnel** (divisione di Antonio Benedetto): TOFU puro (non parla del lavoro) / TOFU ponte (ci arriva di sponda) / MOFU / BOFU.
- **Tipo di immagine** (indipendente dal tipo di post): selfie, screen, foto del PC con schermata, immagine statica, carosello.
- Tipologie di post: da definire.

## Installazione su un altro computer

La banca gira in locale: ognuno ha la sua, con i suoi contenuti. Chi la scarica parte da una banca vuota.

1. Installa **Node.js** (versione LTS) da https://nodejs.org. Una volta sola.
2. Scarica la banca: su GitHub → *Code* → *Download ZIP*, poi estrai la cartella dove vuoi (es. Documenti).
3. Avviala:
   - **Mac**: doppio clic su `Avvia La banca Linked.command`. La prima volta macOS può bloccarlo: tasto destro → *Apri* → *Apri*.
   - **Windows**: doppio clic su `Avvia La banca Linked.bat`. Se Windows mostra "PC protetto": *Ulteriori informazioni* → *Esegui comunque*.
4. Il primo avvio installa i pacchetti e ci mette qualche minuto; poi il browser si apre da solo su http://localhost:3210.

5. In *Editor grafiche*, in alto, scegli la tua **Firma** (es. *Federico Chianesi*): da lì in poi ogni grafica nuova ha il tuo nome, il tuo ruolo e la tua foto nella card in basso.

Finché la banca è accesa la finestra del terminale resta aperta: chiudendola si spegne la banca (i dati restano salvati).

Per aggiornarla a una versione nuova: scarica di nuovo lo ZIP e copia dentro la cartella `data/` della vecchia installazione, che contiene tutti i contenuti.

## Avvio

Doppio clic su `Avvia La banca Linked.command` (Mac) o `Avvia La banca Linked.bat` (Windows), oppure:

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

Registrazione (una volta sola per computer, dalla cartella della banca, dopo il primo avvio che installa i pacchetti):

```bash
claude mcp add banca-linked -s user -- node "$PWD/mcp/server.mjs"
```

Su Windows, da PowerShell nella cartella della banca:

```powershell
claude mcp add banca-linked -s user -- node "$PWD\mcp\server.mjs"
```

Tool: `banca_crea_sessione`, `banca_aggiorna_sessione`, `banca_salva_post`, `banca_aggiorna_post`, `banca_salva_idea`, `banca_allega_immagine`, `banca_prossima_settimana`, `banca_cerca_post`, `banca_elenca_sessioni`.
Se la banca è spenta, il connettore la avvia da solo. Indirizzo diverso: variabile `BANCA_URL`.

Nel second brain la skill `post-da-trascrizione` usa questi tool: trascrizione → post in bozza + idee → sessione in banca.

## Online e LinkedIn (variabili in `.env.local`, mai in git)

- `BANCA_PASSWORD`: se c'è, la banca chiede la password al browser (serve quando è online). In locale non si imposta.
- `BANCA_TOKEN`: token per i connettori (Claude Code, Hermes): lo passano come `BANCA_TOKEN` al server MCP insieme a `BANCA_URL`. `BANCA_PUBLIC_URL` è l'indirizzo da usare nei link che il connettore restituisce.
- `ROBINREACH_API_KEY`: attiva il pulsante *Programma su LinkedIn* (Contenuti, pagina del post, Piano editoriale). Senza chiave il pulsante avvisa che RobinReach non è configurato.
