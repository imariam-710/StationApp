FROM node:20-alpine

WORKDIR /app

# Install dependencies first so this layer is cached unless package.json changes.
COPY package*.json ./
RUN npm install --omit=dev

# Now copy the rest of the server source.
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]