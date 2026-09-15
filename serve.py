"""Local server for the planner.

- Serves the app with caching off, so edits show up on a normal refresh.
- Saves your own post images as base64 in images.json, one per post. A new
  upload replaces the old image for that post; removing the image deletes it.

Usage: python serve.py [port]   (default 8080)
"""
import base64
import functools
import http.server
import json
import os
import re
import sys
import threading
import time
from urllib.parse import unquote

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(ROOT, "images.json")
KEY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}:[A-Za-z0-9_-]{1,40}$")  # "<week start>:<post id>"
TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
MAX_BYTES = 10 * 1024 * 1024  # decoded image size
LOCK = threading.Lock()


def read_images():
    try:
        with open(IMAGES, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def write_images(images):
    tmp = IMAGES + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(images, f, indent=1)
    os.replace(tmp, IMAGES)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def image_key(self):
        prefix = "/api/images/"
        if not self.path.startswith(prefix):
            return None
        key = unquote(self.path[len(prefix):].split("?")[0])
        return key if KEY_RE.match(key) else None

    def do_GET(self):
        if self.path.split("?")[0] == "/api/images":
            with LOCK:
                return self.send_json(200, read_images())
        return super().do_GET()

    def do_PUT(self):
        key = self.image_key()
        if not key:
            return self.send_json(400, {"error": "bad image key"})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BYTES * 4 // 3 + 4096:
            return self.send_json(413, {"error": "image too large (10 MB max)"})
        try:
            body = json.loads(self.rfile.read(length))
            data, kind = body["data"], body["type"]
            raw = base64.b64decode(data, validate=True)
        except (ValueError, KeyError, TypeError):
            return self.send_json(400, {"error": "expected {name, type, data (base64)}"})
        if kind not in TYPES:
            return self.send_json(415, {"error": "use PNG, JPG, GIF, or WebP"})
        if len(raw) > MAX_BYTES:
            return self.send_json(413, {"error": "image too large (10 MB max)"})
        entry = {
            "name": str(body.get("name") or "image")[:200],
            "type": kind,
            "size": len(raw),
            "savedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "data": data,
        }
        with LOCK:
            images = read_images()
            images[key] = entry  # replaces any earlier image for this post
            write_images(images)
        self.send_json(200, {"ok": True, "key": key, "size": len(raw)})

    def do_DELETE(self):
        key = self.image_key()
        if not key:
            return self.send_json(400, {"error": "bad image key"})
        with LOCK:
            images = read_images()
            removed = images.pop(key, None) is not None
            write_images(images)
        self.send_json(200, {"ok": True, "removed": removed})


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
        print(f"Serving on http://127.0.0.1:{PORT}  (your images: {IMAGES})")
        server.serve_forever()
