# Home-screen app and guide pages

Two growth features that cost nothing to run: people can **install RoadReady from the website** like an app, and **guide pages** bring in visitors from search.

## Installable website (PWA)

- `public/manifest.json` gives the app name, the colours and the PNG icons in `public/icons/` (regular and "maskable" for Android, plus `apple-touch-icon.png` for iPhone). `start_url` is `/?utm_source=home_screen`, so launches from the home screen show up as a source in `/admin`.
- `public/sw.js` (the service worker) makes the site installable and usable on a weak connection:
  - **pages:** fetched from the network first; the cached copy is used only when offline, so a new release never leaves people on a broken old version
  - **build files:** cached
  - **map tiles:** cached, up to 1,500
  - **API, sign-in, payments and `/admin`:** never cached
- `src/components/InstallPrompt.jsx` suggests installing after about 25 seconds of use:
  - **Android, Chrome and Edge:** a one-tap **Install** button using the browser's install prompt
  - **iPhone and iPad (Safari):** "Tap Share → Add to Home Screen", because iOS has no install button for websites
  - It never appears over other dialogs or during navigation, or once installed, and **Not now** is remembered for 14 days.
- **Analytics:** the event `install_prompt` records `shown`, `ios_shown`, `accepted`, `declined`, `dismissed` and `installed`.

To change the icon, edit `public/icons/icon.svg` and `icon-maskable.svg`, then regenerate the PNGs (macOS):

```bash
cd public/icons && for s in 192 512; do sips -s format png -z $s $s icon.svg --out icon-$s.png; sips -s format png -z $s $s icon-maskable.svg --out icon-maskable-$s.png; done; sips -s format png -z 180 180 icon-maskable.svg --out apple-touch-icon.png
```

## Guide pages (for search)

`npm run build` runs `scripts/build-guides.mjs` after the app build. It writes plain HTML that search engines can read without running the app:

| Page | URL |
|---|---|
| Guide index | `/guides/` |
| California practice hours | `/guides/california-learner-permit-practice-hours/` |
| Places to practise in San Francisco | `/guides/san-francisco-places-to-practice-driving/` |
| Sitemap / robots | `/sitemap.xml`, `/robots.txt` (`/admin` and `/api/` are kept out of search) |

Each page has a title, description, canonical link, social preview tags and structured data (FAQ / breadcrumbs). "Open RoadReady" links carry `?utm_source=guide&utm_campaign=<page>`, so `/admin` shows which guides bring paying customers.

**Set `SITE_URL`** (e.g. `https://roadready.app`) in the build environment (Vercel → Settings → Environment Variables). It's used for canonical links and the sitemap. After deploying, submit `https://<your-domain>/sitemap.xml` in Google Search Console.

### Adding a state

1. Read the state's **official DMV website** (not third-party sites).
2. Add an entry to `GUIDES` in `src/data/guides.js`: facts, steps, FAQs, `sources` (the official URLs) and `checkedOn` (the date you checked).
3. Run `npm run build`. The build **refuses to publish** a state guide without official sources and a checked date, and the tests confirm the source links are `dmv.<state>.gov` addresses.

Re-check each guide at least every 6 months and whenever a state announces changes. Today only **California** is published. Texas, Florida and Illinois's official sites blocked automated reading, and New York's page didn't include the figures, so those need checking by a person.
