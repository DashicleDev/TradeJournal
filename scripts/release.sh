#!/usr/bin/env bash
# Release a new version: ./scripts/release.sh 1.1.0
# Updates the version in js/core.js and sw.js (a new service worker version makes every
# installed app pick up the update), checks CHANGELOG.md, commits and tags. Push afterwards
# with: git push && git push --tags
set -euo pipefail
v="${1:?usage: scripts/release.sh X.Y.Z}"
[[ "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version must look like 1.2.3"; exit 1; }
cd "$(dirname "$0")/.."
grep -q "^## $v " CHANGELOG.md || { echo "Add a '## $v — <date>' section to CHANGELOG.md first"; exit 1; }
sed -i.bak -E "s/^const APP_VERSION = \"[^\"]+\";/const APP_VERSION = \"$v\";/" js/core.js
sed -i.bak -E "s/^const VERSION = \"[^\"]+\";/const VERSION = \"$v\";/" sw.js
rm -f js/core.js.bak sw.js.bak
git add -A
git commit -m "Release $v"
git tag "v$v"
echo "Tagged v$v. Push with: git push && git push --tags"
