#!/bin/sh
# Regénère public/downloads/i-courtier.zip à partir du dossier extension/.
set -e
cd "$(dirname "$0")/.."
rm -f public/downloads/i-courtier.zip
mkdir -p public/downloads
(cd extension && zip -qr ../public/downloads/i-courtier.zip . -x '.*')
echo "public/downloads/i-courtier.zip"
