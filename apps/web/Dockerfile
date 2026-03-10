# =============================================================================
# AdsMaster Web - Next.js Frontend
# =============================================================================
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for node-gyp (if needed)
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=development

# Expose port
EXPOSE 3000

# Run the application in development mode
CMD ["npm", "run", "dev"]
