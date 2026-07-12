#!/usr/bin/env bash
# PreToolUse guard — HARD block on cross-project writes/commands.
#
# This is an Arkitype session (Next.js design-system builder). Hued (React
# Native/Expo app, at /Users/srinidhibhat/Claude/Projects/Hued) is a completely
# separate project that sometimes ends up loaded in the same session. This
# hook hard-blocks any Edit/Write/NotebookEdit/Bash call that touches the
# Hued tree — mirrors Hued/.claude/hooks/project-boundary-guard.sh.
#
# Never blocks on parse errors — fails open (exit 0) rather than jamming work.

input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null)"

forbidden='/Users/srinidhibhat/Claude/Projects/Hued'

target=""
case "$tool" in
  Edit|Write|NotebookEdit)
    target="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""' 2>/dev/null)"
    ;;
  Bash)
    target="$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null)"
    ;;
  *)
    exit 0
    ;;
esac

if [ -n "$target" ] && printf '%s' "$target" | grep -qF "$forbidden"; then
  echo "BLOCKED: this is an Arkitype session. The target ('$target') is inside Hued, a separate, unrelated project. Do not read/write/run anything there from an Arkitype session — tell the user to open a session with cwd=Hued instead, or ask them to confirm before doing anything cross-project." >&2
  exit 2
fi

exit 0
