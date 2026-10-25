FROM python:3.11-slim
WORKDIR /app
COPY server.py index.html ./
COPY css ./css
COPY js ./js
COPY data ./data
COPY test_*.json test_*.csv ./
EXPOSE 8889
CMD ["python3", "server.py"]
