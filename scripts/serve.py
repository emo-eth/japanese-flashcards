#!/usr/bin/env python3
"""Loopback static server with SPA fallback and prefix stripping."""

from __future__ import annotations

import mimetypes
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8877"))

mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("image/svg+xml", ".svg")


PREFIXES = ("/kana", "/japanese-flashcards")


def normalize(path: str) -> str:
    parsed = urlparse(path)
    raw = unquote(parsed.path)
    for prefix in PREFIXES:
        if raw == prefix:
            raw = "/"
            break
        if raw.startswith(prefix + "/"):
            raw = raw[len(prefix) :] or "/"
            break
    raw = os.path.normpath(raw)
    if raw == ".":
        raw = "/"
    if not raw.startswith("/"):
        raw = "/" + raw
    return raw


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys_stdout = __import__("sys").stderr
        sys_stdout.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_GET(self) -> None:
        path = normalize(self.path)
        if path in {"/healthz", "/health"}:
            body = b"ok\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.path = path
        fs_path = ROOT / path.lstrip("/")
        if path != "/" and fs_path.is_file():
            if path in {"/index.html", "/sw.js"} or path.endswith((".js", ".css", ".webmanifest")):
                self.send_file(fs_path, cache="no-cache")
                return
            return SimpleHTTPRequestHandler.do_GET(self)
        if "." in Path(path).name:
            self.send_error(404, "Not found")
            return
        self.send_file(ROOT / "index.html", cache="no-cache")

    def send_file(self, path: Path, cache: str = "public, max-age=300") -> None:
        data = path.read_bytes()
        ctype, _ = mimetypes.guess_type(str(path))
        self.send_response(200)
        self.send_header("Content-Type", ctype or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    class Server(ThreadingHTTPServer):
        allow_reuse_address = True

    httpd = Server((HOST, PORT), Handler)
    print(f"kana serving {ROOT} on http://{HOST}:{PORT}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
