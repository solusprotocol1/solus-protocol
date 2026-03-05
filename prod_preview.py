#!/usr/bin/env python3
"""Local preview server for prod-app that mirrors Vercel routing.
Serves prod-app/dist as root, with /s4-assets/ from repo root.
"""
import http.server
import os
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
DIST = ROOT / "prod-app" / "dist"
ASSETS = ROOT / "s4-assets"

class ProdPreviewHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Strip query string
        path = path.split("?", 1)[0].split("#", 1)[0]
        if path.startswith("/s4-assets/"):
            return str(ROOT / path.lstrip("/"))
        # Serve from dist
        rel = path.lstrip("/")
        full = DIST / rel
        if full.exists():
            return str(full)
        # SPA fallback
        return str(DIST / "index.html")

    def log_message(self, format, *args):
        pass  # quiet

if __name__ == "__main__":
    port = 8080
    print(f"Prod-app preview: http://localhost:{port}")
    print(f"  dist → {DIST}")
    print(f"  s4-assets → {ASSETS}")
    s = http.server.HTTPServer(("", port), ProdPreviewHandler)
    s.serve_forever()
