# Use the official lightweight Node.js 14 image.
FROM node:fermium-alpine

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN npm ci

# Copy local code to the container image.
COPY . ./

RUN npm run build

ENV PORT 8080

# Run the web service on container startup.

CMD ["npm", "run", "start:production"]

EXPOSE 8080
