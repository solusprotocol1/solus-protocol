# Dockerfile for S4 Ledger SDK
FROM python:3.14-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["pytest"]
