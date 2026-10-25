"""
Project Finance Portfolio Engine v3.5 — SQLite-backed server.
Finance Engine – Version 3.5
GET  /           → serves index.html
GET  /css/*, /js/*, /data/* → serves the page's static .css/.js files
GET  /api/config → returns stored config JSON
GET  /api/test   → test endpoint
GET  /api/history → earlier versions of the working config (newest first)
POST /api/history/<id>/restore → make that version the working config
POST /api/export/xlsx → Excel workbook (with native charts) from a spec built by the page
POST /api/config → saves config JSON to SQLite
POST /api/chat   → proxies to local Ollama LLM
"""

import json
import sqlite3
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError
from urllib.parse import urlparse

print("✅ RUNNING V3.5 SERVER FILE")
print("✅ FILE PATH:", __file__)

PORT = int(os.environ.get('PORT', 3005))
# Local app: only this machine can connect. Docker sets HOST=0.0.0.0 inside the container
# (the port is published to localhost only, see README).
HOST = os.environ.get('HOST', '127.0.0.1')
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3.2')

BASE_DIR = Path(__file__).parent
HTML_FILE = BASE_DIR / "index.html"
DB_FILE = Path(os.environ.get('DB_FILE', BASE_DIR / "finance_engine.db"))
STATIC_DIRS = ('/css/', '/js/', '/data/')
STATIC_TYPES = {'.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8'}

# Earlier versions of the working config kept for Settings → Save history
HISTORY_LIMIT = int(os.environ.get('HISTORY_LIMIT', 50))

DEFAULT_CONFIG = {
    "summary": {"total_budget": 0, "used": 0, "remaining": 0},
    "po_details": [],
    "resources": [],
    "actuals": [],
    "forecast": []
}


def get_db():
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_FILE))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS config (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS config_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_id TEXT NOT NULL,
            data TEXT NOT NULL,
            saved_at TEXT NOT NULL
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
    # Keep the version being replaced (unless unchanged), then trim to the last HISTORY_LIMIT
    row = conn.execute("SELECT data, updated_at FROM config WHERE id=?", (config_id,)).fetchone()
    if row and row[0] != data:
        conn.execute(
            "INSERT INTO config_history (config_id, data, saved_at) VALUES (?, ?, ?)",
            (config_id, row[0], row[1])
        )
        conn.execute(
            "DELETE FROM config_history WHERE config_id=? AND id NOT IN "
            "(SELECT id FROM config_history WHERE config_id=? ORDER BY id DESC LIMIT ?)",
            (config_id, config_id, HISTORY_LIMIT)
        )
    conn.execute(
        "INSERT OR REPLACE INTO config (id, data, updated_at) VALUES (?, ?, datetime('now'))",
        (config_id, data)
    )
    conn.commit()
    conn.close()


def list_history(config_id='working'):
    """Newest first: id, when that version was saved (UTC) and what it held."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, data, saved_at FROM config_history WHERE config_id=? ORDER BY id DESC", (config_id,)
    ).fetchall()
    conn.close()
    sections = ["po_details", "resources", "invoices", "expenses", "raw_actuals", "resource_versions"]
    out = []
    for hid, data, saved_at in rows:
        try:
            cfg = json.loads(data)
        except json.JSONDecodeError:
            cfg = {}
        counts = {k: len(cfg.get(k) or []) for k in sections}
        out.append({"id": hid, "saved_at": saved_at, "counts": counts})
    return out


def restore_history(hid, config_id='working'):
    """Make an earlier version current again (the current one goes into history first)."""
    conn = get_db()
    row = conn.execute(
        "SELECT data FROM config_history WHERE id=? AND config_id=?", (hid, config_id)
    ).fetchone()
    conn.close()
    if not row:
        return None
    save_config(row[0], config_id)
    return row[0]


class Handler(BaseHTTPRequestHandler):

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        if isinstance(data, (dict, list)):
            data = json.dumps(data)
        self.wfile.write(data.encode())

    def send_static(self, url_path):
        file = (BASE_DIR / url_path.lstrip('/')).resolve()
        # Only serve known file types from inside BASE_DIR (no ../ escapes)
        if BASE_DIR.resolve() not in file.parents or file.suffix not in STATIC_TYPES or not file.is_file():
            self.send_json({"error": "Not found"}, 404)
            return
        self.send_response(200)
        self.send_header("Content-Type", STATIC_TYPES[file.suffix])
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(file.read_bytes())

    def do_GET(self):
        if self.path == '/api/config':
            data = load_config('working')
            self.send_json(data if data else "null")
        elif self.path == '/api/config/master':
            data = load_config('master')
            self.send_json(data if data else "null")
        elif self.path == '/api/test':
            self.send_json({"source": "finance-engine-v3 working ✅"})
        elif self.path == '/api/history':
            self.send_json(list_history())
        elif self.path == '/api/health':
            self.send_json({"status": "ok", "version": "3.0"})
        elif self.path.split('?')[0].startswith(STATIC_DIRS):
            self.send_static(self.path.split('?')[0])
        else:
            if HTML_FILE.exists():
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.end_headers()
                self.wfile.write(HTML_FILE.read_bytes())
            else:
                self.send_json({"error": "index.html not found"}, 500)

    def write_allowed(self):
        """Only this app's page may write. Another website open in the browser could otherwise
        POST to localhost and overwrite the config: browsers send its Origin, and a JSON
        content type from another origin needs a CORS pre-check this server never grants."""
        origin = self.headers.get('Origin')
        if origin and urlparse(origin).netloc != self.headers.get('Host'):
            return False
        return self.headers.get('Content-Type', '').startswith('application/json')

    def do_POST(self):
        if not self.write_allowed():
            self.send_json({"error": "Forbidden: JSON requests from this app only"}, 403)
            return
        if self.path == '/api/chat':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode()
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
                self.send_json({"error": "Ollama not running"}, 503)
            except Exception as e:
                self.send_json({"error": str(e)}, 500)

        elif self.path == '/api/export/xlsx':
            length = int(self.headers.get('Content-Length', 0))
            try:
                spec = json.loads(self.rfile.read(length).decode())
            except json.JSONDecodeError as e:
                self.send_json({"error": str(e)}, 400)
                return
            try:
                from excel_export import build_workbook  # needs openpyxl (requirements.txt)
            except ImportError:
                self.send_json({"error": "Excel export with charts needs openpyxl: pip install -r requirements.txt"}, 501)
                return
            data = build_workbook(spec)
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        elif self.path.startswith('/api/history/') and self.path.endswith('/restore'):
            try:
                hid = int(self.path.split('/')[3])
            except ValueError:
                self.send_json({"error": "Bad history id"}, 400)
                return
            data = restore_history(hid)
            if data is None:
                self.send_json({"error": "No such saved version"}, 404)
            else:
                self.send_json(data)

        elif self.path in ('/api/config', '/api/config/master'):
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode()
            try:
                parsed = json.loads(body)
            except json.JSONDecodeError as e:
                self.send_json({"error": str(e)}, 400)
                return
            config_id = 'master' if 'master' in self.path else 'working'
            save_config(json.dumps(parsed), config_id)
            self.send_json({"ok": True, "id": config_id})
        else:
            self.send_json({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    get_db()
    print(f"✅ Project Finance Dashboard v3.5 → http://localhost:{PORT}")
    print(f"✅ SQLite DB: {DB_FILE}")
    HTTPServer((HOST, PORT), Handler).serve_forever()
