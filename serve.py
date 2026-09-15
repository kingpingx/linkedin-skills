"""Local server for the planner.

- Serves the app with caching off, so edits show up on a normal refresh.
- Saves your own post images as base64 in images.json, one per post. A new
  upload replaces the old image for that post; removing the image deletes it.
- Schedules or posts to LinkedIn through Publora, using PUBLORA_API_KEY and
  LINKEDIN_PLATFORM_ID from the linkedin-skills folder's .env. Every send or
  cancel pops a Yes/No approval box on your desktop first.

Usage: python serve.py [port]   (default 8080)
Set LINKEDIN_SKILLS_DIR if the linkedin-skills folder isn't ../LinkedIn.
"""
import base64
import datetime
import functools
import http.server
import json
import os
import re
import sys
import threading
import time
from urllib.parse import parse_qs, unquote, urlsplit

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(ROOT, "images.json")
PUBLISHED = os.path.join(ROOT, "published.json")
SKILLS_DIR = os.environ.get("LINKEDIN_SKILLS_DIR") or os.path.join(os.path.dirname(ROOT), "LinkedIn")
PUBLORA = "https://api.publora.com/api/v1"
KEY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}:[A-Za-z0-9_-]{1,40}$")  # "<week start>:<post id>"
GROUP_ID_RE = re.compile(r"^[0-9a-f]{24}$")
TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
MAX_BYTES = 10 * 1024 * 1024  # decoded image size
LIVE = {"draft", "scheduled", "pending", "processing"}
LOCK = threading.Lock()


class PubloraFail(Exception):
    pass


def load_publora():
    """Reuse the linkedin-skills .env and its approval box. Returns (settings, reason)."""
    try:
        import requests
        sys.path.insert(0, SKILLS_DIR)
        from lib._env import load_env
        from lib.approval import ApprovalDenied, require_human_approval
        load_env()
    except Exception as e:  # noqa: BLE001 - any failure just turns publishing off
        return None, f"Publishing is off: couldn't load the linkedin-skills folder at {SKILLS_DIR} ({e})."
    key, pid = os.getenv("PUBLORA_API_KEY"), os.getenv("LINKEDIN_PLATFORM_ID")
    if not key or not pid:
        return None, "Publishing is off: set PUBLORA_API_KEY and LINKEDIN_PLATFORM_ID in the linkedin-skills .env."
    return {"requests": requests, "key": key, "pid": pid,
            "approve": require_human_approval, "Denied": ApprovalDenied}, None


PUB, PUB_REASON = load_publora()


def read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1)
    os.replace(tmp, path)


def save_record(key, rec):
    with LOCK:
        published = read_json(PUBLISHED)
        if rec is None:
            published.pop(key, None)
        else:
            published[key] = rec
        write_json(PUBLISHED, published)


def now_utc():
    return datetime.datetime.now(datetime.timezone.utc)


def iso(dt):
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def local_time(iso_str):
    dt = datetime.datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    return dt.astimezone().strftime("%a %d %b %Y, %H:%M") + " (your time)"


def publora(method, path, body=None):
    r = PUB["requests"].request(method, PUBLORA + path, json=body,
                                headers={"x-publora-key": PUB["key"]}, timeout=30)
    try:
        data = r.json()
    except ValueError:
        data = {"error": r.text[:300]}
    if r.status_code >= 400:
        msg = data.get("error") or data.get("message") or data
        if isinstance(msg, dict):
            msg = msg.get("message") or json.dumps(msg)[:300]
        raise PubloraFail(f"Publora said {r.status_code}: {msg}")
    return data


def approval_details(text, when_iso, own, url):
    """Keep the approval box short. With the whole post in it, the box grows
    taller than the screen and hides its Yes/No buttons. You review the full
    text in the planner; the box shows enough to recognise the post."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    body = [line for line in lines if not re.fullmatch(r"(#\w+\s*)+", line)] or lines
    clip = lambda s: s if len(s) <= 90 else s[:87] + "..."  # noqa: E731
    return {
        "Account": PUB["pid"],
        "Goes out": local_time(when_iso),
        "Image": (own["name"] + " (your own image)") if own else (url or "none"),
        "Text": f"{len(text):,} characters, {len(lines)} lines",
        "Starts": "“" + clip(body[0]) + "”" if body else None,
        "Ends": "“" + clip(body[-1]) + "”" if len(body) > 1 else None,
    }


def publish(key, body):
    text = (body.get("text") or "").strip()
    if not text:
        return 400, {"error": "The post is empty."}
    if len(text) > 3000:
        return 400, {"error": "The post is over LinkedIn's 3,000-character limit."}

    now = now_utc()
    if body.get("now"):
        when = now + datetime.timedelta(minutes=1)
    else:
        try:
            when = datetime.datetime.fromisoformat(str(body.get("scheduledTime")).replace("Z", "+00:00"))
        except ValueError:
            return 400, {"error": "Pick a date and time."}
        if when.tzinfo is None:
            return 400, {"error": "The time is missing its time zone."}
        if when < now + datetime.timedelta(minutes=2):
            return 400, {"error": "That time has passed (or is under 2 minutes away). Use Post now instead."}
    when_iso = iso(when)

    image = body.get("image") or {}
    own, url = None, None
    if image.get("kind") == "own":
        with LOCK:
            own = read_json(IMAGES).get(key)
        if not own:
            return 400, {"error": "Your own image isn't in images.json any more. Upload it again."}
    elif image.get("kind") == "url":
        url = str(image.get("url") or "")
        if not url.startswith("https://"):
            return 400, {"error": "The image link must start with https://"}

    with LOCK:
        existing = read_json(PUBLISHED).get(key)
    if existing and existing.get("status") in LIVE:
        return 409, {"error": "This post is already on Publora (" + existing["status"] + "). Cancel it first to send it again."}

    try:
        PUB["approve"](
            action="Post to LinkedIn now" if body.get("now") else "Schedule a LinkedIn post",
            details=approval_details(text, when_iso, own, url),
        )
    except PUB["Denied"]:
        return 403, {"error": "Not approved. Nothing was sent to Publora."}

    group_id = None
    try:
        if own:
            # Publora's upload flow: draft first, upload the file, then schedule.
            group_id = publora("POST", "/create-post", {"content": text, "platforms": [PUB["pid"]]})["postGroupId"]
            save_record(key, {"postGroupId": group_id, "status": "draft", "scheduledTime": None})
            up = publora("POST", "/get-upload-url", {
                "fileName": own["name"], "contentType": own["type"], "type": "image", "postGroupId": group_id,
            })
            put = PUB["requests"].put(up["uploadUrl"], data=base64.b64decode(own["data"]),
                                      headers={"Content-Type": own["type"]}, timeout=120)
            if put.status_code >= 400:
                raise PubloraFail(f"Image upload failed ({put.status_code}).")
            try:
                publora("POST", "/complete-media/" + up["mediaId"])
            except PubloraFail:
                pass  # optional: scheduling finalizes the media too
            res = publora("PUT", "/update-post/" + group_id, {"status": "scheduled", "scheduledTime": when_iso})
        else:
            payload = {"content": text, "platforms": [PUB["pid"]], "scheduledTime": when_iso}
            if url:
                payload["mediaUrls"] = [url]
            res = publora("POST", "/create-post", payload)
            group_id = res["postGroupId"]
    except (PubloraFail, KeyError) as e:
        note = " A draft was left on Publora; use Cancel to remove it." if group_id else " Nothing was scheduled."
        return 502, {"error": str(e) + note}

    rec = {"postGroupId": group_id, "status": "scheduled",
           "scheduledTime": res.get("scheduledTime") or when_iso, "sentAt": iso(now)}
    save_record(key, rec)
    return 200, rec


def status(key, id_hint):
    with LOCK:
        rec = read_json(PUBLISHED).get(key)
    group_id = rec["postGroupId"] if rec else (id_hint if GROUP_ID_RE.match(id_hint or "") else None)
    if not group_id:
        return 200, {"status": "none"}
    try:
        data = publora("GET", "/get-post/" + group_id)
    except PubloraFail as e:
        return 502, {"error": str(e)}
    post = data.get("post") or data.get("postGroup") or data
    new = {"postGroupId": group_id, "status": post.get("status") or "unknown",
           "scheduledTime": post.get("scheduledTime"), "checkedAt": iso(now_utc())}
    errs = [p.get("error") for p in post.get("posts") or [] if isinstance(p, dict) and p.get("error")]
    err = post.get("error") or (errs[0] if errs else None)
    if isinstance(err, dict):
        new["error"] = err.get("message") or err.get("code")
    elif err:
        new["error"] = str(err)
    save_record(key, dict(rec or {}, **new))
    return 200, new


def cancel(key):
    with LOCK:
        rec = read_json(PUBLISHED).get(key)
    if not rec:
        return 404, {"error": "This post isn't on Publora."}
    if rec.get("status") not in LIVE:
        return 409, {"error": "It's already " + str(rec.get("status")) + ", so it can't be cancelled from here."}
    when = rec.get("scheduledTime")
    try:
        PUB["approve"](
            action="Cancel a scheduled LinkedIn post",
            target=rec["postGroupId"],
            details={"Was going out": local_time(when) if when else "not scheduled (draft)"},
        )
    except PUB["Denied"]:
        return 403, {"error": "Not approved. The post is still on Publora."}
    try:
        publora("DELETE", "/delete-post/" + rec["postGroupId"])
    except PubloraFail as e:
        return 502, {"error": str(e)}
    save_record(key, None)
    return 200, {"status": "none"}


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

    def route(self):
        parts = urlsplit(self.path)
        return parts.path, parse_qs(parts.query)

    def key_after(self, prefix):
        path, _ = self.route()
        if not path.startswith(prefix):
            return None
        key = unquote(path[len(prefix):])
        return key if KEY_RE.match(key) else None

    def allowed(self):
        # Only the planner page may change things: other sites can't send this
        # custom header to localhost without a CORS preflight, which we never allow.
        if self.headers.get("X-Planner") != "1":
            return False
        origin = self.headers.get("Origin")
        return not origin or urlsplit(origin).hostname in ("127.0.0.1", "localhost")

    def read_body(self, limit):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > limit:
            return None
        try:
            return json.loads(self.rfile.read(length))
        except ValueError:
            return None

    def do_GET(self):
        path, query = self.route()
        if path == "/api/images":
            with LOCK:
                return self.send_json(200, read_json(IMAGES))
        if path == "/api/publora":
            return self.send_json(200, {"enabled": PUB is not None, "reason": PUB_REASON,
                                        "account": PUB["pid"] if PUB else None})
        if path == "/api/published":
            with LOCK:
                return self.send_json(200, read_json(PUBLISHED))
        if path.startswith("/api/status/"):
            key = self.key_after("/api/status/")
            if not key:
                return self.send_json(400, {"error": "bad post key"})
            if not PUB:
                return self.send_json(503, {"error": PUB_REASON})
            return self.send_json(*status(key, (query.get("id") or [""])[0]))
        return super().do_GET()

    def do_POST(self):
        if not self.allowed():
            return self.send_json(403, {"error": "not allowed"})
        path, _ = self.route()
        if not PUB:
            return self.send_json(503, {"error": PUB_REASON})
        if path.startswith("/api/publish/"):
            key = self.key_after("/api/publish/")
            body = self.read_body(64 * 1024)
            if not key or body is None:
                return self.send_json(400, {"error": "bad request"})
            return self.send_json(*publish(key, body))
        if path.startswith("/api/cancel/"):
            key = self.key_after("/api/cancel/")
            if not key:
                return self.send_json(400, {"error": "bad post key"})
            return self.send_json(*cancel(key))
        return self.send_json(404, {"error": "not found"})

    def do_PUT(self):
        if not self.allowed():
            return self.send_json(403, {"error": "not allowed"})
        key = self.key_after("/api/images/")
        if not key:
            return self.send_json(400, {"error": "bad image key"})
        body = self.read_body(MAX_BYTES * 4 // 3 + 4096)
        if body is None:
            return self.send_json(413, {"error": "image too large (10 MB max) or not JSON"})
        try:
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
            images = read_json(IMAGES)
            images[key] = entry  # replaces any earlier image for this post
            write_json(IMAGES, images)
        self.send_json(200, {"ok": True, "key": key, "size": len(raw)})

    def do_DELETE(self):
        if not self.allowed():
            return self.send_json(403, {"error": "not allowed"})
        key = self.key_after("/api/images/")
        if not key:
            return self.send_json(400, {"error": "bad image key"})
        with LOCK:
            images = read_json(IMAGES)
            removed = images.pop(key, None) is not None
            write_json(IMAGES, images)
        self.send_json(200, {"ok": True, "removed": removed})


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
        print(f"Serving on http://127.0.0.1:{PORT}")
        print(f"Your images: {IMAGES}")
        print("Publishing:", f"on (account {PUB['pid']})" if PUB else PUB_REASON)
        server.serve_forever()
