# Node + the system libraries Chromium (Puppeteer) needs at runtime.
FROM node:20-slim

# Chromium shared-library dependencies. Without these, Puppeteer's bundled
# Chromium fails to launch on a slim image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 \
    libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 \
    libpango-1.0-0 libcairo2 libx11-6 libxcb1 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxkbcommon0 libxrandr2 libxshmfence1 wget \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production deps. Puppeteer's postinstall downloads a matching
# Chromium into /root/.cache/puppeteer (used automatically at runtime).
COPY package*.json ./
RUN npm ci --omit=dev

# App source (node_modules and .env are excluded via .dockerignore)
COPY . .

ENV NODE_ENV=production
# The platform (Render/Railway) injects PORT; server.js reads process.env.PORT.
EXPOSE 5000

CMD ["node", "server.js"]
