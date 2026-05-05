# Tracker

Issue tracker built with Next.js, Postgres, Better Auth, Drizzle, and SeaweedFS S3 storage.

## Requirements

- Node.js 20+
- pnpm
- Docker Desktop

## Environment

Create your local env file:

```bash
cp .env.example .env
```

Set a real `BETTER_AUTH_SECRET` before sharing or deploying the app.

For local development against the Postgres container, use:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:7650/tracker
```

For local development with SeaweedFS running in Docker, keep:

```env
SEAWEED_S3_ENDPOINT=http://localhost:7644
SEAWEED_S3_PUBLIC_ENDPOINT=http://localhost:7644
SEAWEED_ACCESS_KEY=tracker
SEAWEED_SECRET_KEY=tracker-secret-123
SEAWEED_BUCKET=tracker-uploads
```

`SEAWEED_S3_PUBLIC_ENDPOINT` is used when opening images/videos in a browser tab. In Docker Compose, the app uploads internally to `seaweed-s3:8333` and signs browser links for `localhost:7644`.

## SeaweedFS Access Config

SeaweedFS S3 needs an access config file mounted into the S3 service.

Create `seaweedfs/s3.json`:

```json
{
  "identities": [
    {
      "name": "tracker-admin",
      "credentials": [
        {
          "accessKey": "tracker",
          "secretKey": "tracker-secret-123"
        }
      ],
      "actions": ["Admin", "Read", "Write", "List", "Tagging"]
    }
  ]
}
```

Keep the keys in this file aligned with `.env`.

## Run With Docker

Use the root compose file as the one-stop startup path. It starts Postgres, syncs the database schema, starts the full SeaweedFS stack, and runs the app:

```bash
docker compose up --build
```

Open:

- App: `http://localhost:3000`
- SeaweedFS master UI: `http://localhost:7641`
- SeaweedFS filer UI: `http://localhost:7643`
- SeaweedFS S3 API: `http://localhost:7644`

## Local Development

Start Postgres and SeaweedFS:

```bash
docker compose up -d db seaweed-master seaweed-volume seaweed-filer seaweed-s3
```

Install dependencies and sync the database:

```bash
pnpm install
pnpm db:push
```

Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Notes

- Issue images and videos are stored in SeaweedFS.
- Postgres stores only media metadata.
- Uploaded media is opened through a signed SeaweedFS URL, so the file does not stream through the Next.js app.
- `seaweedfs/docker-compose.yaml` is only for running SeaweedFS by itself; the root `docker-compose.yml` already includes SeaweedFS for normal app startup.
