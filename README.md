# Portfolio: Astro + React + Supabase

## Local
1. `npm install`
2. `.env` already holds your Supabase URL and publishable key.
3. Run the SQL files in `supabase/` in this order: schema.sql, seed.sql, make_admin.sql, deploy_hook.sql.
4. `npm run dev` then open http://localhost:4321/admin

## GitHub Pages
1. Push this folder to a GitHub repo (branch `main`).
2. Settings > Pages > Source: GitHub Actions.
3. Settings > Secrets and variables > Actions:
   - Secrets: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY
   - Variables: SITE_URL (e.g. https://USERNAME.github.io) and BASE_PATH (e.g. /REPO, or / with a custom domain)
4. Run deploy_hook.sql with your repo and token, so publishing in /admin rebuilds the site.

## Custom domain and ads later
Set SITE_URL to the domain and BASE_PATH to `/`. For AdSense, set PUBLIC_ADSENSE_ID (ca-pub-...) and pass slot ids to `<AdSlot slot="...">`.
# shahjalal-portfolio
