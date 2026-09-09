# Deploying to the VPS

Domain: `jg-ai-cal.jejaku.my` (already pre-filled in `docker/nginx/default.conf`).

## First-time setup

1. Install Docker + Docker Compose on the VPS.
2. Clone the repo, `cd` into it.
3. Copy `.env.example` to `.env` and fill in `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `MIMO_API_KEY`, and `POSTGRES_PASSWORD`.
4. Point `jg-ai-cal.jejaku.my`'s DNS A record at the VPS's public IP.

## Bootstrapping the HTTPS certificate

No certificate exists yet on first deploy, so the `443` server block in `docker/nginx/default.conf` is already commented out — nginx starts with only the `:80` block active.

1. Start everything except the still-commented HTTPS block:
   ```
   docker compose up -d --build
   ```
2. Issue the certificate:
   ```
   docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d jg-ai-cal.jejaku.my
   ```
3. Uncomment the `server { listen 443 ssl; ... }` block in `docker/nginx/default.conf`.
4. Restart nginx with HTTPS active:
   ```
   docker compose up -d --build
   ```

## Every subsequent deploy

```
git pull
docker compose up -d --build
```

Certbot's `certbot` service auto-renews the certificate every 12 hours (no-op unless near expiry).
