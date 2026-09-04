# ============================================================
# RWA Real Estate Token — Smart Contracts & Security Container
# Compiles Solidity, executes Hardhat test suites, and runs Slither static analysis
# ============================================================

FROM node:22-bookworm-slim

# Install Python 3, pip, and system dependencies for Slither static analyzer
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up virtual environment for Slither
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Slither static analysis tool
RUN pip install --no-cache-dir slither-analyzer

# Setup non-root user
RUN groupadd -r rwa && useradd -r -g rwa -m -d /home/rwa rwa

WORKDIR /app/contracts

# Install contract dependencies
COPY contracts/package.json contracts/package-lock.json ./
RUN npm ci

# Copy contract code and configuration
COPY contracts/hardhat.config.ts contracts/tsconfig.json ./
COPY contracts/src ./src
COPY contracts/scripts ./scripts
COPY contracts/test ./test

# Ensure proper permissions
RUN chown -R rwa:rwa /app/contracts $VIRTUAL_ENV

USER rwa

# Expose Hardhat local testnet RPC port
EXPOSE 8545

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
