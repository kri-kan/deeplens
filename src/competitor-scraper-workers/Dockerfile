FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (needed for compilation or simple tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set python to unbuffered mode
ENV PYTHONUNBUFFERED=1

# Default command (can be overridden to run specific worker)
CMD ["python", "main.py"]
