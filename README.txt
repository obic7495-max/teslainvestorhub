TESLAINVESTORHUB — PROFESSIONAL NEWS & MOBILE UPDATE

WHAT THIS UPDATE IMPROVES
- 12 separate topic feeds, each capable of showing up to 50 current stories (up to 600 across all categories when enough relevant news is available).
- Headlines are refreshed by a GitHub Actions workflow once per hour. The workflow fetches Google News RSS directly using Python's standard library, so the site no longer relies on a public RSS-to-JSON converter for the 50-item count.
- Articles are loaded from a local news.json file, with up to 10 stories displayed at first and a button to reveal more in batches of 10. The search field filters by headline, source and description.
- News items use text-safe DOM rendering, checked HTTP/HTTPS article links, and publisher attribution.
- A new mobile “More” area makes Tesla Live, Photos & Videos, Investor Academy, Account, community and safety information reachable on phones.
- The primary interactive TradingView chart refreshes when the light/dark theme is changed.
- Added a More Tools & Safety area with source, market-delay, privacy and investment-risk notices.

FILES IN THIS PACKAGE
1. index.html
2. news.json
3. scripts/update_news.py
4. .github/workflows/update-news.yml

HOW TO INSTALL
Do not upload the ZIP itself as the website page. Extract it first and copy the files into your existing GitHub repository, preserving these paths:
- Replace the root index.html.
- Add/replace the root news.json.
- Add scripts/update_news.py (create the scripts folder if needed).
- Add .github/workflows/update-news.yml (create both folders if needed).

KEEP THESE EXISTING FILES UNCHANGED
- supabase-config.js
- supabase-app.js
- supabase-setup.sql
- Any other existing repository files/assets.

START THE FIRST NEWS SYNC
After the files are committed to the main branch:
1. Open the repository on GitHub.
2. Open the Actions tab.
3. Select “Refresh TeslaInvestorHub news”.
4. Press “Run workflow” and confirm.
5. Wait for the workflow to finish successfully; open the site again and refresh the News page.
The scheduled workflow then checks for new headlines hourly. If you do not run it manually, the first scheduled run may take up to about an hour. GitHub can delay scheduled jobs, so the page also offers live Google News searches as a fallback.

NEWS COUNT & LIMITS
The page displays up to 50 stories per category, not 50 guaranteed every time. The number depends on how many suitable stories Google News RSS returns for that query in the last 7 days. Publishers may change/remove articles, and article links open external sites. The workflow avoids committing hourly when the headline list has not changed.

IMPORTANT LIMITATIONS / NEXT CHECKS
- This package is not automatically published to GitHub Pages. You must commit the listed files (or deploy them through a connected GitHub workflow) before the changes appear on the site.
- Keep Supabase configuration and security policies in place. Before opening the site to the public, verify row-level security, grants, authentication redirects, account recovery/sign-out and chat moderation in the Supabase project.
- TradingView widgets may use delayed data or lack a symbol depending on exchange permissions. This site does not execute trades.
- The site is an independent project and is not affiliated with Tesla, Inc. News and education are not investment advice.
