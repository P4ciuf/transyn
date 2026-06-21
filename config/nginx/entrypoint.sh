#!/bin/sh
# -----------------------------------------------------------------------------
# nginx entrypoint
# -----------------------------------------------------------------------------
# Description: Docker entrypoint that substitutes the DOMAIN environment
#              variable into the nginx default.conf template and then starts
#              nginx in the foreground.
# Usage:       Used as the CMD/ENTRYPOINT of the nginx Docker container.
# Dependencies: envsubst (gettext), nginx
# Exit codes:
#   0   Success
#   1   Configuration error or envsubst failure (set -e)
# -----------------------------------------------------------------------------
set -e

export DOMAIN="${DOMAIN:-localhost}"

# Substitute ${DOMAIN} placeholder in the template and write the rendered config
envsubst '${DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
