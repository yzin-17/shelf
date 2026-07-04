#!/bin/sh
set -eu

INPUT=$(cat)
INPUT_ON_ONE_LINE=$(printf "%s" "$INPUT" | tr '\n' ' ')
TOOL_NAME=$(printf "%s" "$INPUT_ON_ONE_LINE" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

case "$TOOL_NAME" in
  *[Ee]dit*|*[Cc]reate*|*[Ww]rite*|*[Rr]eplace*|*[Dd]elete*|*[Ff]ile*|*[Pp]atch*)
    ;;
  *)
    echo '{"continue":true}'
    exit 0
    ;;
esac

LOG_FILE=$(mktemp "${TMPDIR:-/tmp}/agent-quality-hook.XXXXXX")
FILES_FILE=$(mktemp "${TMPDIR:-/tmp}/agent-quality-files.XXXXXX")
trap 'rm -f "$LOG_FILE" "$FILES_FILE"' EXIT

printf "%s" "$INPUT" | node -e '
const fs = require("node:fs");
const path = require("node:path");

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}

const cwd = process.cwd();
const candidateKeys = /^(file|files|path|paths|filePath|filePaths)$/i;
const codeExtensions = /\.(cjs|css|cts|html|js|jsx|json|jsonc|md|mjs|mts|ts|tsx|vue)$/i;
const files = new Set();

function addFile(value) {
  if (typeof value !== "string" || !codeExtensions.test(value)) return;

  let filePath = value;
  if (path.isAbsolute(filePath)) {
    if (!filePath.startsWith(cwd + path.sep)) return;
    filePath = path.relative(cwd, filePath);
  } else if (filePath.startsWith("playground/")) {
    filePath = filePath.slice("playground/".length);
  }

  if (!filePath.startsWith("..") && fs.existsSync(path.join(cwd, filePath))) {
    files.add(filePath);
  }
}

function walk(value, key = "") {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, key);
    return;
  }

  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) walk(childValue, childKey);
    return;
  }

  if (candidateKeys.test(key)) addFile(value);
}

walk(parsed.tool_input ?? parsed);
for (const file of files) console.log(file);
' >"$FILES_FILE" 2>/dev/null || true

{
  echo "Running auto-fixes..."
  if [ -s "$FILES_FILE" ]; then
    xargs pnpm exec oxfmt --write <"$FILES_FILE"
    xargs pnpm exec oxlint --fix --no-error-on-unmatched-pattern <"$FILES_FILE"
  else
    pnpm run agent:fix
  fi
  echo
  echo "Running typecheck and lint verification..."
  if [ -s "$FILES_FILE" ]; then
    pnpm run typecheck
    xargs pnpm exec oxlint --no-error-on-unmatched-pattern <"$FILES_FILE"
  else
    pnpm run agent:verify
  fi
} >"$LOG_FILE" 2>&1 || {
  cat "$LOG_FILE" >&2
  exit 2
}

echo '{"continue":true}'
