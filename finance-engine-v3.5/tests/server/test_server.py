"""Tests for the hardened legacy server (backlog item SEC-001).

Run from finance-engine-v3.5/:
    python3 -m unittest discover -s tests/server -v

Each test starts server.py on a free port with a temporary database, so the
real finance_engine.db is never touched. Standard library only.
"""

import http.client
import importlib
import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[2]
TMP_DIR = tempfile.TemporaryDirectory()

# The database path is read when server.py is imported, so set it first.
os.environ['FINANCE_DB'] = str(Path(TMP_DIR.name) / 'test.db')
sys.path.insert(0, str(APP_DIR))
server = importlib.import_module('server')


def tearDownModule():
    TMP_DIR.cleanup()


class ServerTestCase(unittest.TestCase):
    env = {}  # extra environment for make_server (e.g. ALLOWED_HOSTS)

    def setUp(self):
        self._saved_env = {k: os.environ.get(k) for k in ('ALLOWED_HOSTS', 'HOST')}
        for k in self._saved_env:
            os.environ.pop(k, None)
        os.environ.update(self.env)
        self.httpd = server.make_server(host='127.0.0.1', port=0)
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(5)
        for k, v in self._saved_env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def request(self, method, path, body=None, headers=None, host=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        conn.putrequest(method, path, skip_host=True, skip_accept_encoding=True)
        conn.putheader('Host', host or f'127.0.0.1:{self.port}')
        data = body.encode() if isinstance(body, str) else body
        hdrs = dict(headers or {})
        if data is not None and 'Content-Length' not in hdrs:
            hdrs['Content-Length'] = str(len(data))
        for k, v in hdrs.items():
            conn.putheader(k, v)
        conn.endheaders()
        if data is not None:
            try:
                conn.send(data)
            except (BrokenPipeError, ConnectionResetError):
                pass  # the server may answer and close before reading an oversized body
        resp = conn.getresponse()
        result = (resp.status, {k.lower(): v for k, v in resp.getheaders()}, resp.read())
        conn.close()
        return result

    def post_json(self, path, obj, origin=None, **kw):
        headers = {'Content-Type': 'application/json'}
        if origin:
            headers['Origin'] = origin
        return self.request('POST', path, json.dumps(obj), headers, **kw)


class DefaultServerTests(ServerTestCase):

    def test_get_root_serves_app(self):
        status, headers, body = self.request('GET', '/')
        self.assertEqual(status, 200)
        self.assertIn('text/html', headers.get('content-type', ''))

    def test_get_config_has_no_cors_header(self):
        status, headers, _ = self.request('GET', '/api/config')
        self.assertEqual(status, 200)
        self.assertNotIn('access-control-allow-origin', headers)

    def test_localhost_host_header_allowed(self):
        status, _, _ = self.request('GET', '/api/health', host=f'localhost:{self.port}')
        self.assertEqual(status, 200)

    def test_wrong_host_rejected(self):
        status, _, body = self.request('GET', '/api/config', host='evil.example:80')
        self.assertEqual(status, 421)
        self.assertEqual(json.loads(body), {'error': 'Host not allowed'})

    def test_lan_ip_host_rejected(self):
        status, _, _ = self.request('GET', '/', host=f'192.168.1.20:{self.port}')
        self.assertEqual(status, 421)

    def test_options_refused(self):
        status, headers, _ = self.request('OPTIONS', '/api/config', headers={
            'Origin': 'https://evil.example', 'Access-Control-Request-Method': 'POST'})
        self.assertEqual(status, 405)
        self.assertFalse([h for h in headers if h.startswith('access-control-')])

    def test_post_wrong_origin_rejected(self):
        status, _, _ = self.post_json('/api/config', {'x': 1}, origin='https://evil.example')
        self.assertEqual(status, 403)

    def test_post_wrong_content_type_rejected(self):
        status, _, _ = self.request('POST', '/api/config', '{"x":1}', {'Content-Type': 'text/plain'})
        self.assertEqual(status, 415)

    def test_post_over_limit_rejected(self):
        saved = server.MAX_BODY_BYTES
        server.MAX_BODY_BYTES = 100
        try:
            status, _, _ = self.request('POST', '/api/config', '{"x":"' + 'a' * 200 + '"}',
                                        {'Content-Type': 'application/json'})
        finally:
            server.MAX_BODY_BYTES = saved
        self.assertEqual(status, 413)

    def test_default_limit_is_25_mb(self):
        self.assertEqual(server.MAX_BODY_BYTES, 25 * 1024 * 1024)

    def test_invalid_json_gives_fixed_message(self):
        status, _, body = self.request('POST', '/api/config', '{not json', {'Content-Type': 'application/json'})
        self.assertEqual(status, 400)
        self.assertEqual(json.loads(body), {'error': 'Bad request'})

    def test_round_trip_save_and_load(self):
        cfg = {'po_details': [{'po_number': 'SAMPLE-1', 'value': 1000}], 'note': 'synthetic test data'}
        origin = f'http://localhost:{self.port}'
        for path in ('/api/config', '/api/config/master'):
            status, _, body = self.post_json(path, cfg, origin=origin)
            self.assertEqual(status, 200)
            self.assertTrue(json.loads(body)['ok'])
            status, _, body = self.request('GET', path)
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(body), cfg)

    def test_post_without_origin_allowed(self):
        # Tools such as curl send no Origin header; the Host and Content-Type checks still apply.
        status, _, _ = self.post_json('/api/config', {'ok': True})
        self.assertEqual(status, 200)

    def test_post_charset_content_type_allowed(self):
        status, _, _ = self.request('POST', '/api/config', '{"x":1}',
                                    {'Content-Type': 'application/json; charset=utf-8'})
        self.assertEqual(status, 200)


class AllowedHostsTests(ServerTestCase):
    env = {'ALLOWED_HOSTS': 'example.test:3005'}

    def test_configured_host_allowed(self):
        status, _, _ = self.request('GET', '/api/config', host='example.test:3005')
        self.assertEqual(status, 200)

    def test_configured_origin_allowed(self):
        status, _, _ = self.post_json('/api/config', {'x': 1}, origin='https://example.test:3005',
                                      host='example.test:3005')
        self.assertEqual(status, 200)

    def test_default_hosts_replaced(self):
        status, _, _ = self.request('GET', '/api/config')
        self.assertEqual(status, 421)


class BindAddressTests(unittest.TestCase):

    def test_binds_loopback_when_host_unset(self):
        saved = os.environ.pop('HOST', None)
        try:
            reloaded = importlib.reload(server)
            self.assertEqual(reloaded.HOST, '127.0.0.1')
            httpd = reloaded.make_server(port=0)
            try:
                self.assertEqual(httpd.server_address[0], '127.0.0.1')
            finally:
                httpd.server_close()
        finally:
            if saved is not None:
                os.environ['HOST'] = saved


if __name__ == '__main__':
    unittest.main()
