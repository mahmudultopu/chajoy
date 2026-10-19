# Deployment

The app is a standard Next.js server. It needs Node 20.9+ and PostgreSQL 14+ in production.

> PGlite (the default local database) is for development and tests only. It is a single-process database: never point two processes at the same `.data/pglite` folder.

## 1. Database (Supabase or Neon)

1. Create a Postgres database and copy its connection string.
2. Set `DATABASE_URL` (for Supabase, the pooler URL works; `DATABASE_SSL=require` is the default for remote hosts).
3. From your machine or CI, with the same environment:
   ```bash
   npm ci
   npm run db:migrate     # creates the tables
   npm run db:seed        # loads the verified catalogue, branches, settings and policy drafts
   ADMIN_PASSWORD='a-long-passphrase' npm run admin:create -- --email owner@yourdomain --name "Owner"
   ```
   Do **not** run `db:demo-ops` against production — it refuses unless forced.

Schema changes later: edit `src/lib/db/schema.ts`, run `npm run db:generate` to create a migration, commit it, and run `npm run db:migrate` during deploy.

## 2. Image storage

On Vercel and other serverless hosts the local disk isn't persistent, so set:

```
STORAGE_DRIVER=supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...          # server-only
SUPABASE_STORAGE_BUCKET=media          # create it as a public bucket
NEXT_PUBLIC_MEDIA_HOST=<project>.supabase.co
```

On a VPS with a persistent disk, the default `STORAGE_DRIVER=local` with `UPLOAD_DIR=/var/lib/chajoy/uploads` works (back it up).

## 3. Hosting

### Vercel

1. Import the repository, framework preset Next.js.
2. Add the environment variables from `.env.example` (production values).
3. Deploy. The build doesn't need database access; pages that read data render per request.

### VPS (Ubuntu + Nginx)

```bash
npm ci && npm run build
NODE_ENV=production npm start   # port 3000; run under systemd or pm2
```

Put Nginx (or Caddy) in front with HTTPS. Pass `X-Forwarded-For`/`X-Forwarded-Host` (used for rate limiting and origin checks).

## 4. Before going live

- [ ] `NEXT_PUBLIC_SITE_URL` set to the real https domain (canonical URLs, sitemap, payment callbacks)
- [ ] HTTPS — browsers only allow "Use my location" on secure origins
- [ ] Branch details, hours and delivery settings entered and verified (dashboard checklist all green)
- [ ] Policies reviewed and published
- [ ] SSLCommerz tested in sandbox end-to-end (success, failure, cancel), then live credentials + `SSLCOMMERZ_SANDBOX=false`
- [ ] Register the IPN URL `https://<domain>/api/payments/sslcommerz/ipn` in the SSLCommerz merchant panel
- [ ] A map tile provider and geocoder sized for real traffic (`NEXT_PUBLIC_MAP_TILE_URL`, `GEOCODER_URL`, `GEOCODER_USER_AGENT`)
- [ ] If you run more than one server instance, move the in-memory rate limiter (`src/lib/rate-limit.ts`) to Redis/Upstash
- [ ] Database backups enabled
- [ ] Staff accounts created; the bootstrap password changed

## 5. Checks

```bash
npm run typecheck
npm test                         # unit + database integration tests (in-memory Postgres)
BASE_URL=https://staging.example npm run test:e2e   # browser smoke test against a staging site with sample settings
```
