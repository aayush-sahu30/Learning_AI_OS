# Multi-language runtime Dockerfile for LearnOS Backend
FROM python:3.11-slim

# Install system dependencies: g++ for C++ execution, nodejs for JavaScript execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Set environment
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

# Run uvicorn respecting PORT environment variable from cloud platforms (Render, Koyeb, Railway)
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
