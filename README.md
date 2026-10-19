# TeslaInvestorHub

Updated starter website with light/dark modes, research sections, installable-web-app metadata, online account integration, private cross-device workspace sync and shared member chat.

## Start here

Read **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** before publishing. Real online accounts and shared chat will remain disabled until you connect your own Supabase project, run `supabase-setup.sql`, and fill in `supabase-config.js`.

## Important security notes

- Keep Row Level Security enabled in Supabase.
- Only put the Project URL and public publishable/anon key in `supabase-config.js`. Never put a service-role or secret key into browser code.
- This package does not create or connect your Supabase account, purchase a domain, or deploy the website. Those steps require the owner to sign in to the provider dashboards.
- The included rate limiter is a basic spam safeguard, not complete moderation. A human moderator still needs to review reports. Workspace sync is opt-in; when pressed, it uploads the local watchlist, draft posts, saved articles, lesson progress and display name (not the local email field).
- This is an educational research website, not an investment adviser. Do not accept subscriptions until payments and paid-access controls have been implemented and tested.
