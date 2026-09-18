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
docker run --rm -p 3005:3005 finance-engine-v3.5
```

Then open [http://localhost:3005](http://localhost:3005).

To preserve the SQLite database after the container stops, mount the version
directory and run the container from the version directory instead:

```bash
cd finance-engine-v3.5
docker build -t finance-engine-v3.5 .
docker run --rm -p 3005:3005 -v "$PWD:/app" finance-engine-v3.5
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
