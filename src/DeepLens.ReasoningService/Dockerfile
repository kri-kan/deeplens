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

ENV LITELLM_BASE_URL=http://litellm:4000/v1
ENV LITELLM_MODEL=deeplens-llm
ENV LITELLM_API_KEY=sk-deeplens-master-key

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
