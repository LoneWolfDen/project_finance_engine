FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py excel_export.py index.html ./
COPY css ./css
COPY js ./js
COPY data ./data
COPY test_*.json test_*.csv ./
# Data lives on a volume so it survives the container (see README)
ENV HOST=0.0.0.0 DB_FILE=/data/finance_engine.db
VOLUME /data
EXPOSE 3005
CMD ["python3", "server.py"]
