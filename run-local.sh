#!/bin/sh
# Quickstart run script
set -e
[ -f package.json ] || { echo "package.json missing"; exit 1; }
if [ -f yarn.lock ]; then echo "Using yarn"; yarn install; else npm install; fi
# start the app (prefer scripts.start or scripts.dev)
if npm run | grep -q " start "; then npm run start; elif npm run | grep -q " dev "; then npm run dev; else echo "No start/dev script found; run npm run <script>"; fi
