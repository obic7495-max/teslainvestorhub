# TeslaInvestorHub: online accounts, live chat and commercial hosting

This update adds a **real authentication and shared-chat integration scaffold**. It is deliberately fail-closed: the page will not pretend to create online accounts or publish shared messages until you connect a Supabase project and install the database schema.

## What is included

- Secure email/password registration, login, sign-out and password-reset flow using Supabase Auth.
- A shared database-backed member chat with live updates.
- Opt-in sync for saved watchlist entries, local community drafts, saved articles, learning progress and selected profile name across devices. Email is excluded from the workspace sync.
- Member display names, per-member message deletion, reporting and a personal block list.
- A simple database-side chat rate limit.
- Row Level Security policies in `supabase-setup.sql` so visitors cannot read/write member data as anonymous users or delete other members' messages.
- Deployment security headers in `_headers` and an updated service-worker cache.

## Part A — Connect the real account and chat backend

1. Create your own project at [Supabase](https://supabase.com/). Keep ownership of the project and its billing details.
2. In the Supabase dashboard, open **SQL Editor**, create a new query, paste all of `supabase-setup.sql`, and run it. Confirm it completes without errors. This creates the profile, message, report, block and private workspace tables and applies row-level policies.
3. In your Supabase project's **Connect** or API settings, copy the **Project URL** and the public **publishable/anon key**. Open `supabase-config.js` and fill these fields:

   ```js
   window.TIH_SUPABASE_CONFIG = {
     url: 'https://YOUR-PROJECT-REF.supabase.co',
     publishableKey: 'YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY'
   };
   ```

   These values are intended for browser code. **Never put a `service_role` key or any secret key in `supabase-config.js`.**
4. In Supabase **Authentication → Providers**, enable Email/password sign-in. Choose whether email confirmation is required. For a public launch, keep confirmation enabled unless you have deliberately chosen and secured another onboarding flow.
5. In **Authentication → URL Configuration**, set the deployed site's HTTPS URL as the Site URL and add the exact site URL (including the `index.html` path if applicable) to the Redirect URLs list. This is needed for email confirmation and password reset.
6. Publish the site over HTTPS, then test in a private/incognito browser: create a new account, confirm email if prompted, sign in, send a chat message, delete your own message, report another message from a test account, block a test account, sign out, and confirm another visitor cannot send messages while signed out.
7. In a signed-in browser, use **Sync workspace across devices** in Profile & settings to opt in to uploading the current local watchlist, local draft posts, saved articles, lesson progress and profile display name. The locally stored email field is not uploaded. Once you have a saved online workspace, it can merge with the local workspace on later sign-ins.
8. If the dashboard says the tables are not exposed to the Data API, expose only the specific tables used by the app after confirming their RLS policies are active. Do not disable RLS to “fix” an error.

## Part B — Move the site to hosting suitable for a business

GitHub can remain the code repository, but GitHub Pages' published terms say Pages is not intended or permitted as free hosting for an online business, e-commerce site or site primarily facilitating commercial transactions/SaaS. Use a host whose current terms fit your business before launching subscriptions or advertising.

A simple static-site path is Cloudflare Pages (or another suitable commercial host):

1. Create an account at [Cloudflare](https://dash.cloudflare.com/) and open **Workers & Pages / Pages**.
2. Connect the GitHub repository `obic7495-max/teslainvestorhub` and select the `main` branch, or upload the project files using the host's direct-upload workflow.
3. For this static starter, leave the build command blank and use the repository root as the output directory. The necessary files (`index.html`, `manifest.json`, `icon.svg`, `sw.js`, `supabase-config.js`, `supabase-app.js` and `_headers`) should be at the site root.
4. Deploy. Confirm the generated HTTPS URL loads and that `supabase-config.js` is reachable. Then return to Supabase URL Configuration and add that exact deployed URL.
5. Test all pages on Android and desktop. Only after the hosted test succeeds should you connect a custom domain. Keep the old version until the new deployment works.

Review your chosen host's current plan, limits, terms and support options before using it for a business-critical site. This guide prepares the code but does not create a hosting account, change DNS, purchase a domain or publish a deployment on your behalf.

## Before opening to the public

- Publish appropriate Privacy Policy, Terms of Service, Contact/Support, Community Rules and refund/cancellation pages.
- Appoint a human moderator. Reports submitted in the starter interface need to be reviewed by an owner/moderator in the Supabase dashboard; this update does not yet provide a separate moderator console.
- Set up backups, account recovery testing, spam controls and monitoring. The included rate limit is only a basic safeguard, not a complete anti-abuse system.
- Don't collect payment card data yourself. Use a reputable payment provider and verify payments server-side before enabling paid access.
- The notification button requests browser notifications while the site is open in a supported browser. It is not push notification delivery after the app/browser has been closed.

## Troubleshooting

- **“Online accounts are not connected yet”** — `supabase-config.js` still has blank values or the Supabase CDN was blocked. Check the browser console and project URL/key.
- **Sign-up email never arrives** — check spam, Supabase Auth email settings and allowed redirect URLs.
- **Chat database is not ready** — run `supabase-setup.sql` fully, confirm `community_messages`, `profiles`, `blocked_users`, `message_reports` and `member_workspace` exist, keep RLS enabled, and confirm the required tables are exposed to the Supabase Data API.
- **Chat updates but doesn't say Live** — confirm `community_messages` is in the `supabase_realtime` publication and that the deployment uses HTTPS.
- **Old interface remains on your device** — close/reopen the browser or clear the site's cached data; the service-worker cache version has been bumped for this update.
