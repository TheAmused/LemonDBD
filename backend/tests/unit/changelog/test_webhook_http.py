# backend/tests/unit/changelog/test_webhook_http.py
"""The Discord webhook client (urllib3, replacing curl_cffi) sends JSON, query params and the
method it is asked for, never follows a redirect, and hands back status and body."""
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from app.utils import webhook_http


class _Recorder(BaseHTTPRequestHandler):
    seen: list[dict] = []

    def _handle(self) -> None:
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else b""
        _Recorder.seen.append({"method": self.command, "path": self.path, "body": body, "type": self.headers.get("Content-Type")})
        if self.path.startswith("/redirect"):
            self.send_response(302)
            self.send_header("Location", "/elsewhere")
            self.end_headers()
            return
        payload = json.dumps({"id": "555"}).encode()
        self.send_response(200 if self.command != "DELETE" else 204)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload) if self.command != "DELETE" else 0))
        self.end_headers()
        if self.command != "DELETE":
            self.wfile.write(payload)

    do_POST = do_PATCH = do_DELETE = _handle

    def log_message(self, *_args) -> None:
        pass


@pytest.fixture
def server():
    _Recorder.seen = []
    httpd = HTTPServer(("127.0.0.1", 0), _Recorder)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()


@pytest.mark.unit
def test_post_sends_json_and_params(server) -> None:
    resp = webhook_http.post(f"{server}/hook", json={"content": "hi"}, params={"wait": "true"}, timeout=5)
    assert resp.status_code == 200
    assert resp.json() == {"id": "555"}
    seen = _Recorder.seen[0]
    assert seen["method"] == "POST"
    assert seen["path"] == "/hook?wait=true"
    assert json.loads(seen["body"]) == {"content": "hi"}
    assert seen["type"] == "application/json"


@pytest.mark.unit
def test_patch_and_delete(server) -> None:
    assert webhook_http.patch(f"{server}/hook/messages/1", json={"embeds": []}, timeout=5).status_code == 200
    assert webhook_http.delete(f"{server}/hook/messages/1", timeout=5).status_code == 204
    assert [s["method"] for s in _Recorder.seen] == ["PATCH", "DELETE"]


@pytest.mark.unit
def test_redirects_are_not_followed(server) -> None:
    assert webhook_http.post(f"{server}/redirect", json={}, timeout=5).status_code == 302
    assert len(_Recorder.seen) == 1
