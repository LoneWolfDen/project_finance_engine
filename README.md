# Project Finance Portfolio Engine

Three independent versions. Each runs standalone.

Built by Vamsi Yedlapalli | github.com/LoneWolfDen

## Run finance-engine-v3.5

### Option 1: Run with Python

Requirements: Python 3.11 or later.

1. Open a terminal in the project directory:

	```bash
	cd finance-engine-v3.5
	```

2. Start the server:

	```bash
	python3 server.py
	```

	The server listens on `http://localhost:3005` by default.

3. Open [http://localhost:3005](http://localhost:3005) in a browser.

To use a different port, set `PORT` before starting the server:

```bash
PORT=8080 python3 server.py
```

The SQLite database is created automatically as `finance_engine.db` in the
`finance-engine-v3.5` directory. The server must be running for the dashboard
to load and save configuration data.

### Option 2: Run with Docker

From the repository root, build the image and start a container:

```bash
docker build -t finance-engine-v3.5 ./finance-engine-v3.5
docker run --rm -p 127.0.0.1:3005:3005 finance-engine-v3.5
```

Then open [http://localhost:3005](http://localhost:3005).

To preserve the SQLite database after the container stops, mount the version
directory and run the container from the version directory instead:

```bash
cd finance-engine-v3.5
docker build -t finance-engine-v3.5 .
docker run --rm -p 127.0.0.1:3005:3005 -v "$PWD:/app" finance-engine-v3.5
```

### Local-only access

The server is reachable from this computer only. It listens on `127.0.0.1`,
sends no cross-origin (CORS) headers, answers only requests addressed to
`localhost:<PORT>` or `127.0.0.1:<PORT>`, and rejects request bodies over 25 MB.
The Docker commands above publish the port as `127.0.0.1:3005:3005` for the
same reason.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3005` | Port to listen on |
| `HOST` | `127.0.0.1` | Interface to listen on (the Docker image sets `0.0.0.0` inside the container) |
| `ALLOWED_HOSTS` | `localhost:<PORT>,127.0.0.1:<PORT>` | Comma-separated `host:port` values the server answers |
| `MAX_BODY_BYTES` | `26214400` (25 MB) | Largest accepted request body |
| `FINANCE_DB` | `finance_engine.db` next to `server.py` | SQLite database path |

### GitHub Codespaces: test data only

A Codespaces forwarded port (`*.app.github.dev`) is hosted by GitHub, outside
your organisation. **Use Codespaces with test or synthetic data only, never real
data** (project decision DEC-032). To allow the forwarded address, set it
explicitly, for example:

```bash
ALLOWED_HOSTS="<your-codespace>-3005.app.github.dev,localhost:3005" python3 server.py
```

### Optional: Ollama chat mode

The dashboard's Smart mode works without Ollama. Ollama is only required when
using Ollama AI mode. Install Ollama, then run:

```bash
ollama serve
ollama pull llama3.2
```

Start `server.py` locally as described above, and leave Ollama running on its
default URL, `http://localhost:11434`.

### Verify the server

With the server running, use:

```bash
curl http://localhost:3005/api/health
```

A healthy server returns JSON with status `ok`.
