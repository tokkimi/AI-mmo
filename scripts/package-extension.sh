#!/bin/sh
# Regénère private/i-courtier.zip à partir du dossier extension/.
set -e
cd "$(dirname "$0")/.."
rm -f private/i-courtier.zip
mkdir -p private
(cd extension && zip -qr ../private/i-courtier.zip . -x '.*')
echo "private/i-courtier.zip"
