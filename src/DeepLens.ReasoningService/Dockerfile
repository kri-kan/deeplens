FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8002

ENV MOCK_MODE=true
ENV MODEL_ID=microsoft/Phi-3-mini-4k-instruct

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
