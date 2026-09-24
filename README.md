# La banca Linked — banca contenuti LinkedIn

Pannello locale per gestire i contenuti LinkedIn: idee grezze, post scritti, piano editoriale, banca immagini, editor di grafiche statiche e caroselli. Stile e struttura ricalcano la dashboard admin di Misha Travel.

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
