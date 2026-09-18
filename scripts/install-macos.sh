#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.emo.kana-flashcards"
PORT="${PORT:-8877}"
HOST="${HOST:-127.0.0.1}"
PLIST_SRC="$ROOT/ops/macos/com.emo.kana-flashcards.plist"
PLIST_DST="$HOME/Library/LaunchAgents/${LABEL}.plist"
PYTHON3="$(command -v python3)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

die() { print -r -- "error: $*" >&2; exit 1; }

port_in_serve() {
  local json="$1"
  python3 - "$json" "$PORT" <<'PY'
import json, sys
path, port = sys.argv[1], sys.argv[2]
data = json.load(open(path))
needles = {port, f":{port}"}
blob = json.dumps(data)
hit = False
def walk(node):
    global hit
    if isinstance(node, dict):
        for k, v in node.items():
            if str(k).endswith(":" + port) or str(k) == port:
                hit = True
            walk(v)
    elif isinstance(node, list):
        for v in node:
            walk(v)
    elif isinstance(node, (str, int)):
        if str(node) == port or str(node).endswith(":" + port):
            hit = True
walk(data)
print("true" if hit else "false")
PY
}

print "installing kana flashcards from $ROOT"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
sed "s|PYTHON3|$PYTHON3|" "$PLIST_SRC" > "$PLIST_DST"

launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl kickstart -k "gui/$(id -u)/$LABEL"

for i in {1..20}; do
  if curl -fsS --max-time 1 "http://$HOST:$PORT/healthz" | grep -q ok; then
    break
  fi
  sleep 0.2
done
curl -fsS --max-time 2 "http://$HOST:$PORT/healthz" | grep -q ok || die "local server did not become healthy"

command -v tailscale >/dev/null || die "tailscale not found"
tailscale status >/dev/null || die "tailscale is not up"

BEFORE="$TMPDIR/serve-before.json"
AFTER="$TMPDIR/serve-after.json"
tailscale serve status --json > "$BEFORE"
if [[ "$(port_in_serve "$BEFORE")" == "true" ]]; then
  print "tailnet handler for :$PORT already present; leaving serve config unchanged"
else
  tailscale serve --bg --https="$PORT" "http://$HOST:$PORT" || die "tailscale serve failed"
  tailscale serve status --json > "$AFTER"
  python3 - "$BEFORE" "$AFTER" "$PORT" <<'PY' || {
    tailscale serve --https="$PORT" off >/dev/null 2>&1 || true
    die "serve diff was not exactly one new handler; rolled back only :$PORT"
  }
import json, sys
before, after, port = (json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), sys.argv[3])

def without_port(data):
    data = json.loads(json.dumps(data))
    tcp = data.get("TCP") or {}
    tcp.pop(str(port), None)
    tcp.pop(port, None)
    web = data.get("Web") or {}
    for key in list(web):
        if str(key).endswith(":" + str(port)):
            web.pop(key)
    data["TCP"] = tcp
    data["Web"] = web
    data.pop("Foreground", None)
    return data

if without_port(before) != without_port(after):
    sys.stderr.write("unrelated serve handlers changed\n")
    sys.exit(1)
tcp_ok = str(port) in (after.get("TCP") or {})
web_ok = any(str(k).endswith(":" + str(port)) for k in (after.get("Web") or {}))
if not (tcp_ok and web_ok):
    sys.stderr.write("new https handler missing\n")
    sys.exit(1)
PY
fi

DNS="$(tailscale status --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')"
print "local  http://$HOST:$PORT"
print "tailnet https://$DNS:$PORT"
print "never used: tailscale serve reset, tailscale funnel"
