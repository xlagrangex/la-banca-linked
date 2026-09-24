#!/bin/zsh
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
(sleep 4 && open "http://localhost:3210") &
npm run dev
