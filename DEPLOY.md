# Deploying to the VPS

## First-time setup

1. Install Docker + Docker Compose on the VPS.
2. Clone the repo, `cd` into it.
3. Copy `.env.example` to `.env` and fill in `DEEPSEEK_API_KEY`, `POSTGRES_PASSWORD`.
4. Point your domain's A record at the VPS IP.
5. In `docker/nginx/default.conf`, replace `YOUR_DOMAIN` with your actual domain.

## Bootstrapping the HTTPS certificate

No certificate exists yet on first deploy, so nginx can't start with the `443` block active.

1. Temporarily comment out the `server { listen 443 ... }` block in `docker/nginx/default.conf`, keeping only the `:80` block.
2. `docker compose up -d nginx app db`
3. Issue the certificate:
   ```
   docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d YOUR_DOMAIN
   ```
4. Uncomment the `443` block back in `docker/nginx/default.conf`.
5. `docker compose up -d --build` (restarts nginx with HTTPS active).

## Every subsequent deploy

```
git pull
docker compose up -d --build
```

Certbot's `certbot` service auto-renews the certificate every 12 hours (no-op unless near expiry).
