# Deploying to the VPS

Domain: `jg-ai-cal.jejaku.my`, served over plain HTTP on port `8080`
(ports 80/443 are already used by another project — `jejaku-project` —
on this VPS, so this app does not touch them).

Site URL: `http://jg-ai-cal.jejaku.my:8080`

## First-time setup

1. Install Docker + Docker Compose on the VPS.
2. Clone the repo, `cd` into it.
3. Copy `.env.example` to `.env` and fill in `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `MIMO_API_KEY`, and `POSTGRES_PASSWORD`.
4. Point `jg-ai-cal.jejaku.my`'s DNS A record at the VPS's public IP.
5. Start everything:
   ```
   docker compose up -d --build
   ```

## Every subsequent deploy

```
git pull
docker compose up -d --build
```
