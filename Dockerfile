# Production-ready Dockerfile for Coolify / container platforms
# Image: small, secure Node runtime
FROM node:20-alpine

# Create and set working directory
WORKDIR /app

# Environment defaults (Coolify dashboard will override)
ENV NODE_ENV=production \
    PORT=3000

# Install only production dependencies using cached layers
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Optional: ensure correct ownership and drop root
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

# Expose the app port (Coolify expects this)
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
