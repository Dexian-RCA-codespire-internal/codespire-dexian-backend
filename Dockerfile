# Backend Dockerfile for Node.js Express Application
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Use --production flag for production builds, or omit for dev dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs

# Expose the application port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8081/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]

