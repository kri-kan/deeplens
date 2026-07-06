FROM ollama/ollama:latest

# Install dependencies for OpenClaw (curl, git, Node.js 22)
RUN apt-get update && \
    apt-get install -y curl git ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -f /tmp/node22.tar.gz && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
