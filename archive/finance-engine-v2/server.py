"""Project Finance Portfolio Engine — SQLite-backed server.
GET  /           → serves index.html
GET  /api/config → returns stored config JSON
POST /api/config → saves config JSON to SQLite
POST /api/chat   → proxies to local Ollama LLM
"""
import json, sqlite3, os
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

PORT = int(os.environ.get('PORT', 8889))
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3.2')
HTML_FILE = Path(__file__).parent / "index.html"
DB_FILE = Path(__file__).parent / "finance_engine.db"


def get_db():
    conn = sqlite3.connect(str(DB_FILE))
    conn.execute("""CREATE TABLE IF NOT EXISTS config (
        id TEXT PRIMARY KEY DEFAULT 'working',
        data TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
    )""")
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
    def do_GET(self):
        if self.path == '/api/config':
            data = load_config('working')
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write((data or 'null').encode())
        elif self.path == '/api/config/master':
            data = load_config('master')
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write((data or 'null').encode())
        else:
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(HTML_FILE.read_bytes())

    def do_POST(self):
        if self.path == '/api/chat':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode()
            try:
                payload = json.loads(body)
                # Forward to Ollama
                ollama_req = json.dumps({
                    "model": OLLAMA_MODEL,
                    "messages": payload.get("messages", []),
                    "stream": False
                }).encode()
                req = Request(f"{OLLAMA_URL}/api/chat", data=ollama_req,
                              headers={"Content-Type": "application/json"})
                resp = urlopen(req, timeout=60)
                result = json.loads(resp.read())
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"content": result.get("message", {}).get("content", "")}).encode())
            except URLError:
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Ollama not running. Start it with: ollama serve"}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif self.path in ('/api/config', '/api/config/master'):
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode()
            # Validate JSON
            try:
                json.loads(body)
            except json.JSONDecodeError as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
                return
            config_id = 'master' if 'master' in self.path else 'working'
            save_config(body, config_id)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "id": config_id}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    # Initialize DB
    get_db()
    print(f"Project Finance Dashboard → http://localhost:{PORT}")
    print(f"SQLite DB: {DB_FILE}")
    HTTPServer(("", PORT), Handler).serve_forever()
