# TeslaInvestorHub Community App Upgrade

A responsive social community web app for EV enthusiasts, with a professional feed UI, Supabase-backed interactions, market charts, a vehicle-photo gallery, news, private messaging, notifications and PWA support.

## Feature inventory

- **Social:** feed, photo posts, stories that expire after 24 hours, likes, comments, follows, saved posts, sharing, post reporting and notifications.
- **Accounts:** sign up, sign in, password reset, public handle, display name, avatar URL and bio.
- **Private messaging:** member lookup by handle/name, conversation list, thread and read receipts.
- **Community:** member chat with delete-own-message handling.
- **EV/markets:** vehicle cards, a Wikimedia Commons photo gallery with licence/source credits, TradingView charts, news categories and educational links.
- **Product polish:** mobile bottom navigation, responsive sidebar, dark/light theme, keyboard-friendly controls and PWA installation assets.

## Dependencies

This is a static GitHub Pages frontend. It loads Supabase JS v2 from jsDelivr, the project's existing `supabase-config.js`, TradingView embeds and Wikimedia Commons media. Supabase provides authentication, PostgreSQL and object storage.

## Required setup

Run `social-hub-setup.sql` in the configured Supabase project's SQL Editor. Then publish the root files described in `INSTALL.txt`. The upload ZIP is not a deployment by itself.

## Important limitations

The app does not create users or audience automatically, verify car listings, or guarantee that third-party feeds and charts will always be available. The owner must promote and moderate the community, maintain the Supabase project, review legal text, and test the live deployment. Never publish a Supabase service-role key.
