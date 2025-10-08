#!/bin/sh
set -e
if [ ! -d /app/node_modules ] || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ]; then
  mkdir -p /app/node_modules
  cp -R /opt/node_modules/. /app/node_modules/
fi
exec "$@"
