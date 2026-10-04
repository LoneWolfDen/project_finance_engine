"""Tests for static file serving from vendor/ and app/ (backlog item BLD-004).

Run from finance-engine-v3.5/:
    python3 -m unittest discover -s tests/server -v
"""

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


if __name__ == '__main__':
    unittest.main()
