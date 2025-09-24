# Multi-stage build for production
FROM node:18-alpine AS backend-builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy backend source
COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY config.env ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3104

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3104/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start backend
CMD ["node", "backend/server.js"]
