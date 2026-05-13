"""
Project Finance Portfolio Engine v3.5 — SQLite-backed server.
Finance Engine – Version 3.5
GET  /           → serves index.html
GET  /api/config → returns stored config JSON
GET  /api/test   → test endpoint
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

print("✅ RUNNING V3.5 SERVER FILE")
print("✅ FILE PATH:", __file__)

PORT = int(os.environ.get('PORT', 3005))
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3.2')

BASE_DIR = Path(__file__).parent
HTML_FILE = BASE_DIR / "index.html"
DB_FILE = BASE_DIR / "finance_engine.db"

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


class Handler(BaseHTTPRequestHandler):

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        if isinstance(data, (dict, list)):
            data = json.dumps(data)
        self.wfile.write(data.encode())

    def do_GET(self):
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
                self.send_json({"error": "index.html not found"}, 500)

    def do_POST(self):
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

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    get_db()
    print(f"✅ Project Finance Dashboard v3.5 → http://localhost:{PORT}")
    print(f"✅ SQLite DB: {DB_FILE}")
    HTTPServer(("", PORT), Handler).serve_forever()
