#!/bin/sh
set -e

export DOMAIN="${DOMAIN:-localhost}"

envsubst '${DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
