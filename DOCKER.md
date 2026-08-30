# Running with Docker

This spins up three containers: MongoDB, the API server, and the client
(built and served as static files via nginx).

## Quick start

```bash
# 1. From the project root, copy the env template:
cp .env.example .env

# 2. (Optional) Edit .env — set your own JWT_SECRET and admin credentials.
#    The defaults work fine for trying it out locally.

# 3. Build and start everything:
docker compose up --build

# 4. Open the app:
#    http://localhost:5500
```

The admin account from `.env` is created automatically the first time the
server container starts (same as running it without Docker).

## Stopping / restarting

```bash
docker compose down          # stop everything (data is kept)
docker compose down -v       # stop everything AND delete the MongoDB data
docker compose up            # start again (no rebuild needed)
docker compose up --build    # rebuild after changing any source code
```

## What each container does

| Container | What it runs | Port |
|---|---|---|
| `station-mongo` | MongoDB 7, data persisted in a Docker volume | not exposed by default |
| `station-server` | Express API | `3000` |
| `station-client` | The built React app, served by nginx | `5500` (mapped to nginx's `80`) |

## Notes

- **MongoDB data survives restarts** — it's stored in a named Docker volume
  (`mongo-data`), not inside the container itself. Only `docker compose
  down -v` deletes it.
- **The client is a static build**, not a dev server — `VITE_API_URL` is
  baked into the JavaScript at build time. If you change it in `.env`, you
  need to rebuild the client (`docker compose up --build client`) for the
  change to take effect.
- **To view MongoDB with a GUI tool** (e.g. MongoDB Compass), uncomment the
  `ports` section under the `mongo` service in `docker-compose.yml`, then
  connect to `mongodb://localhost:27017`.
- This setup is meant for running the app locally or on your own server.
  Deploying it publicly (a real domain, HTTPS, a managed database, etc.) is
  a separate step this guide doesn't cover.