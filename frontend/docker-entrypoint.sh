#!/bin/sh
set -e
# Default BACKEND_URL if not provided (envsubst doesn't support parameter expansion)
: ${BACKEND_URL:=http://backend:5000}
export BACKEND_URL
# Substitute BACKEND_URL into nginx config template at container start
if [ -f /etc/nginx/templates/default.conf.template ]; then
  envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi
# Execute the original command
exec "$@"