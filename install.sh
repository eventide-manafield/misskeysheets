#!/bin/sh
# SPDX-FileCopyrightText: Noctemblith contributors
# SPDX-License-Identifier: AGPL-3.0-only
set -eu
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 22+ is required. Install Node.js and retry.' >&2
  exit 1
fi
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$SCRIPT_DIR/scripts/install.mjs" "$@"
