"""Tests for static file serving from vendor/ and app/ (backlog item BLD-004).

Run from finance-engine-v3.5/:
    python3 -m unittest discover -s tests/server -v
"""

import hashlib
import re
import socket
import unittest

from test_server import ServerTestCase, server


class StaticFileTests(ServerTestCase):

    def setUp(self):
        super().setUp()
        self.temp_file = server.BASE_DIR / 'vendor' / '_t.js'
        self.temp_file.write_text('window.T = 1;\n', encoding='utf-8')

    def tearDown(self):
        self.temp_file.unlink(missing_ok=True)
        super().tearDown()

    def test_vendor_js_served(self):
        status, headers, body = self.request('GET', '/vendor/_t.js')
        self.assertEqual(status, 200)
        self.assertEqual(headers.get('content-type'), 'text/javascript')
        self.assertEqual(headers.get('cache-control'), 'no-cache')
        self.assertEqual(body, b'window.T = 1;\n')

    def test_query_string_ignored(self):
        status, _, _ = self.request('GET', '/vendor/_t.js?v=1')
        self.assertEqual(status, 200)

    def test_dot_dot_rejected(self):
        status, _, _ = self.request('GET', '/vendor/../server.py')
        self.assertEqual(status, 404)

    def test_encoded_dot_dot_rejected(self):
        for path in ('/vendor/%2e%2e/server.py', '/vendor/%2E%2E/index.html', '/app/..%2fserver.js'):
            status, _, _ = self.request('GET', path)
            self.assertEqual(status, 404, path)

    def test_missing_file_404(self):
        status, _, _ = self.request('GET', '/app/missing.js')
        self.assertEqual(status, 404)

    def test_disallowed_extension_404(self):
        for path in ('/vendor/x.py', '/vendor/.keep', '/app/.keep'):
            status, _, _ = self.request('GET', path)
            self.assertEqual(status, 404, path)

    def test_no_directory_listing(self):
        for path in ('/vendor/', '/app/'):
            status, _, _ = self.request('GET', path)
            self.assertEqual(status, 404, path)

    def test_other_paths_still_serve_html(self):
        status, headers, body = self.request('GET', '/anything')
        self.assertEqual(status, 200)
        self.assertIn('text/html', headers.get('content-type', ''))
        self.assertIn(b'<html', body.lower())

    def test_wrong_host_still_rejected(self):
        status, _, _ = self.request('GET', '/vendor/_t.js', host='evil.example:80')
        self.assertEqual(status, 421)

    def test_api_routes_unchanged(self):
        status, headers, _ = self.request('GET', '/api/health')
        self.assertEqual(status, 200)
        self.assertNotIn('access-control-allow-origin', headers)


class VendoredLibraryTests(ServerTestCase):
    """BLD-001: the six libraries are served locally and match vendor/VENDOR.md."""

    def vendor_rows(self):
        rows = []
        text = (server.BASE_DIR / 'vendor' / 'VENDOR.md').read_text(encoding='utf-8')
        for line in text.splitlines():
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if len(cells) == 8 and cells[3].startswith('`') and cells[6].startswith('`'):
                rows.append((cells[3].strip('`'), cells[6].strip('`'), int(cells[7])))
        return rows

    def test_vendor_md_lists_all_files(self):
        listed = {path for path, _, _ in self.vendor_rows()}
        on_disk = {str(p.relative_to(server.BASE_DIR / 'vendor')) for p in (server.BASE_DIR / 'vendor').rglob('*')
                   if p.is_file() and p.name not in ('.keep', 'VENDOR.md')}
        self.assertEqual(len(listed), 12)
        self.assertEqual(listed, on_disk)

    def test_hashes_match_vendor_md(self):
        for path, sha, size in self.vendor_rows():
            data = (server.BASE_DIR / 'vendor' / path).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), sha, path)
            self.assertEqual(len(data), size, path)

    def test_chart_js_served(self):
        status, headers, _ = self.request('GET', '/vendor/chart.js-4.4.0/chart.umd.min.js')
        self.assertEqual(status, 200)
        self.assertEqual(headers.get('content-type'), 'text/javascript')

    def test_index_html_uses_vendored_scripts_only(self):
        html = (server.BASE_DIR / 'index.html').read_text(encoding='utf-8')
        sources = re.findall(r'<script src="([^"]+)"', html)
        self.assertEqual(len([s for s in sources if s.startswith('vendor/')]), 6)
        for src in sources:
            # Only local files: the six vendored libraries and continuum-core/app scripts (SEC-002).
            self.assertTrue(src.startswith(('vendor/', 'app/')), src)
            self.assertTrue((server.BASE_DIR / src).is_file(), src)
            status, _, _ = self.request('GET', '/' + src)
            self.assertEqual(status, 200, src)


if __name__ == '__main__':
    unittest.main()


class ParallelConnectionTests(ServerTestCase):
    """L-03: a page opens many connections at once (one per script); none may be refused."""

    def test_twenty_simultaneous_connections_are_all_served(self):
        socks = [socket.create_connection(('127.0.0.1', self.port), timeout=10) for _ in range(20)]
        try:
            for s in socks:
                s.sendall(f'GET /app/cfe.js HTTP/1.1\r\nHost: localhost:{self.port}\r\nConnection: close\r\n\r\n'.encode())
            statuses = []
            for s in socks:
                data = b''
                while True:
                    chunk = s.recv(65536)
                    if not chunk:
                        break
                    data += chunk
                statuses.append(data.split(b'\r\n', 1)[0])
        finally:
            for s in socks:
                s.close()
        self.assertEqual(statuses, [b'HTTP/1.0 200 OK'] * 20)
