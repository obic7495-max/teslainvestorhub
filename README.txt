TESLAINVESTORHUB STARTER APP

Files:
- index.html: responsive website/app interface, light mode default, optional dark mode
- manifest.json: installable web app metadata
- sw.js: basic offline caching service worker
- icon.svg: app icon

PUBLISH TO GITHUB PAGES:
1. Open https://github.com/obic7495-max/teslainvestorhub
2. Open the repository and choose Add file > Upload files.
3. Upload index.html, manifest.json, sw.js, and icon.svg into the repository root (not inside a subfolder).
4. Commit the changes to the main branch.
5. In Settings > Pages, set source to Deploy from a branch, branch main, folder /(root), then Save.
6. Wait for deployment, then open https://obic7495-max.github.io/teslainvestorhub/

APP INSTALL:
After the site is published over HTTPS, open it in a supported browser and choose Install app / Add to Home screen. On iPhone, use Safari > Share > Add to Home Screen. If building a Play Store or App Store app, further packaging, testing, privacy disclosures, and store accounts are needed.

IMPORTANT LIMITATIONS:
This is a front-end starter, not a finished financial-services platform. User profile, watchlist, saved items, posts, learning progress and partner drafts are stored locally in the current browser only. They are not shared across users/devices. Sign-in is a preview only. Payments, recurring billing, real-time stock quotes, public chat, email, and secure premium content are NOT connected. Never put secret API keys in front-end code. Add a secure backend, authentication, payment verification/webhooks, privacy policy, terms, refund process, and test thoroughly before accepting payments.
Chart/market figures are illustrative, not live data. Educational content only; not investment advice. TeslaInvestorHub is not affiliated with or endorsed by Tesla, Inc.
