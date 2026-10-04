"""
Project Finance Portfolio Engine v3.5 — SQLite-backed server.
Finance Engine – Version 3.5
GET  /           → serves index.html
GET  /api/config → returns stored config JSON
GET  /api/test   → test endpoint
POST /api/config → saves config JSON to SQLite
POST /api/chat   → proxies to local Ollama LLM

Local use only (SEC-001): binds 127.0.0.1 by default, sends no CORS headers,
accepts only allowed Host headers, and limits POST bodies.
Environment: PORT, HOST, ALLOWED_HOSTS, MAX_BODY_BYTES, FINANCE_DB.
"""

import json
import sqlite3
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

print("✅ RUNNING V3.5 SERVER FILE")
print("✅ FILE PATH:", __file__)

PORT = int(os.environ.get('PORT', 3005))
HOST = os.environ.get('HOST', '127.0.0.1')
MAX_BODY_BYTES = int(os.environ.get('MAX_BODY_BYTES', 25 * 1024 * 1024))
MAX_DRAIN_BYTES = 1024 * 1024  # body read and discarded before an error reply
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3.2')

BASE_DIR = Path(__file__).parent
HTML_FILE = BASE_DIR / "index.html"
DB_FILE = Path(os.environ.get('FINANCE_DB', BASE_DIR / "finance_engine.db"))

# Fixed error texts, so internal details never reach the browser.
ERRORS = {
    400: "Bad request",
    403: "Origin not allowed",
    404: "Not found",
    405: "Method not allowed",
    413: "Request body too large",
    415: "Content-Type must be application/json",
    421: "Host not allowed",
    500: "Internal server error",
    503: "Ollama not running",
}

DEFAULT_CONFIG = {
    "summary": {"total_budget": 0, "used": 0, "remaining": 0},
    "po_details": [],
    "resources": [],
    "actuals": [],
    "forecast": []
}


def get_db():
    conn = sqlite3.connect(str(DB_FILE))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS config (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    return conn


def load_config(config_id='working'):
    conn = get_db()
    row = conn.execute("SELECT data FROM config WHERE id=?", (config_id,)).fetchone()
    conn.close()
    return row[0] if row else None


def save_config(data, config_id='working'):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO config (id, data, updated_at) VALUES (?, ?, datetime('now'))",
        (config_id, data)
    )
    conn.commit()
    conn.close()


def allowed_hosts(port):
    """Host header values the server answers. ALLOWED_HOSTS is comma-separated host:port
    values (for example a Codespaces forwarding host); the default is this laptop only."""
    raw = os.environ.get('ALLOWED_HOSTS', '')
    hosts = [h.strip().lower() for h in raw.split(',') if h.strip()]
    return hosts or [f"localhost:{port}", f"127.0.0.1:{port}"]


class Handler(BaseHTTPRequestHandler):

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        if isinstance(data, (dict, list)):
            data = json.dumps(data)
        self.wfile.write(data.encode())

    def send_error_json(self, status):
        self.send_json({"error": ERRORS[status]}, status)

    def _check_host(self):
        """Reject requests addressed to any other host name (DNS rebinding, LAN access)."""
        host = (self.headers.get('Host') or '').strip().lower()
        if host not in self.server.allowed_hosts:
            self.send_error_json(421)
            return False
        return True

    def _reject(self, status, length):
        """Send an error after reading (up to 1 MB of) the unread body. Closing a socket
        with unread data makes the OS reset the connection, and the client would see a
        network error instead of this response."""
        remaining = min(length, MAX_DRAIN_BYTES)
        while remaining > 0:
            chunk = self.rfile.read(min(remaining, 65536))
            if not chunk:
                break
            remaining -= len(chunk)
        self.send_error_json(status)
        return None

    def _check_post(self):
        """Return the request body, or None after sending an error response."""
        try:
            length = int(self.headers.get('Content-Length', 0))
        except ValueError:
            self.send_error_json(400)
            return None
        if length < 0:
            self.send_error_json(400)
            return None
        if length > MAX_BODY_BYTES:
            return self._reject(413, length)
        content_type = (self.headers.get('Content-Type') or '').split(';')[0].strip().lower()
        if content_type != 'application/json':
            return self._reject(415, length)
        origin = self.headers.get('Origin')
        if origin is not None:
            allowed = {f"{scheme}://{h}" for h in self.server.allowed_hosts for scheme in ('http', 'https')}
            if origin.strip().lower() not in allowed:
                return self._reject(403, length)
        try:
            return self.rfile.read(length).decode()
        except UnicodeDecodeError:
            self.send_error_json(400)
            return None

    def do_GET(self):
        if not self._check_host():
            return
        if self.path == '/api/config':
            data = load_config('working')
            self.send_json(data if data else "null")
        elif self.path == '/api/config/master':
            data = load_config('master')
            self.send_json(data if data else "null")
        elif self.path == '/api/test':
            self.send_json({"source": "finance-engine-v3 working ✅"})
        elif self.path == '/api/health':
            self.send_json({"status": "ok", "version": "3.0"})
        else:
            if HTML_FILE.exists():
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.end_headers()
                self.wfile.write(HTML_FILE.read_bytes())
            else:
                self.send_error_json(500)

    def do_POST(self):
        if not self._check_host():
            return
        if self.path not in ('/api/chat', '/api/config', '/api/config/master'):
            self.send_error_json(404)
            return
        body = self._check_post()
        if body is None:
            return
        if self.path == '/api/chat':
            try:
                payload = json.loads(body)
                ollama_req = json.dumps({
                    "model": OLLAMA_MODEL,
                    "messages": payload.get("messages", []),
                    "stream": False
                }).encode()
                req = Request(
                    f"{OLLAMA_URL}/api/chat",
                    data=ollama_req,
                    headers={"Content-Type": "application/json"}
                )
                resp = urlopen(req, timeout=60)
                result = json.loads(resp.read())
                self.send_json({"content": result.get("message", {}).get("content", "")})
            except URLError:
                self.send_error_json(503)
            except Exception:
                self.send_error_json(500)

        else:
            try:
                parsed = json.loads(body)
            except json.JSONDecodeError:
                self.send_error_json(400)
                return
            config_id = 'master' if 'master' in self.path else 'working'
            save_config(json.dumps(parsed), config_id)
            self.send_json({"ok": True, "id": config_id})

    def do_OPTIONS(self):
        # No cross-origin access: preflight requests are refused.
        self.send_error_json(405)

    def log_message(self, format, *args):
        return


def make_server(host=None, port=None):
    """Create the server. Tests pass port 0 to get a free port."""
    server = HTTPServer((HOST if host is None else host, PORT if port is None else port), Handler)
    server.allowed_hosts = allowed_hosts(server.server_address[1])
    return server


if __name__ == "__main__":
    get_db()
    server = make_server()
    print(f"✅ Project Finance Dashboard v3.5 → http://localhost:{PORT}")
    print(f"✅ Listening on {HOST}:{PORT}; allowed hosts: {', '.join(server.allowed_hosts)}")
    print(f"✅ SQLite DB: {DB_FILE}")
    server.serve_forever()
