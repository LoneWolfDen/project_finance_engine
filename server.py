"""Project Finance Portfolio Engine — Client-side computed dashboard.
All config is stored in browser localStorage. No POST needed.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

PORT = 8889
HTML_FILE = Path(__file__).parent / "index.html"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        self.wfile.write(HTML_FILE.read_bytes())

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    print(f"Project Finance Dashboard → http://localhost:{PORT}")
    HTTPServer(("", PORT), Handler).serve_forever()
