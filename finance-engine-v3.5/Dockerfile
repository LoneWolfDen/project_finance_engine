FROM python:3.11-slim
WORKDIR /app
COPY server.py index.html ./
COPY test_*.json test_*.csv ./
# Inside the container the server must listen on all interfaces; publish the port
# to the host as 127.0.0.1:3005:3005 so it stays reachable from this laptop only.
ENV HOST=0.0.0.0
EXPOSE 3005
CMD ["python3", "server.py"]
