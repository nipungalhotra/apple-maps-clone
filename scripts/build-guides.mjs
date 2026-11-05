#!/usr/bin/env node
/**
 * Builds the static guide pages (/guides/...), sitemap.xml and robots.txt into dist/.
 * Runs after `vite build` (see the "build" script in package.json).
 *
 * Plain HTML so search engines can read it without running the app. Every page links
 * into the app with ?utm_source=guide so the /admin dashboard shows which guides bring
 * paying customers.
 *
 *   SITE_URL   public origin used for canonical links and the sitemap (e.g. https://roadready.app)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ZONE_TYPES = { open_ground: 'Open paved area', quiet_road: 'Quiet road', parking_lot: 'Parking lot', training_circuit: 'Training loop' };

function formatDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

const CSS = `
:root{color-scheme:light;--bg:#f4f4f2;--card:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#6f6e69;--line:#e1e0d9;--accent:#0a66d6;--accent-ink:#fff;--note:#fff7e6;--note-line:#f3d79b}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;--bg:#111110;--card:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--muted:#9a998f;--line:#2c2c2a;--accent:#3987e5;--accent-ink:#fff;--note:#2a2416;--note-line:#5c4a1f}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#111110;--card:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--muted:#9a998f;--line:#2c2c2a;--accent:#3987e5;--accent-ink:#fff;--note:#2a2416;--note-line:#5c4a1f}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
a{color:var(--accent)}
.wrap{max-width:760px;margin:0 auto;padding:16px 16px 64px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 20px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--ink);text-decoration:none}
.brand img{width:32px;height:32px;border-radius:8px}
.crumbs{font-size:13px;color:var(--muted);margin-bottom:8px}
.crumbs a{color:var(--muted)}
h1{font-size:clamp(26px,5vw,36px);line-height:1.15;letter-spacing:-.02em;margin:0 0 12px}
h2{font-size:20px;margin:32px 0 12px;letter-spacing:-.01em}
h3{font-size:17px;margin:0 0 4px}
.lead{font-size:18px;color:var(--ink2);margin:0 0 20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:16px 0}
table{width:100%;border-collapse:collapse;font-size:15px}
th,td{text-align:left;vertical-align:top;padding:10px 8px;border-bottom:1px solid var(--line)}
th{width:38%;color:var(--ink2);font-weight:700}
tr:last-child th,tr:last-child td{border-bottom:0}
.checked{font-size:13px;color:var(--muted);margin-top:8px}
ol,ul{padding-left:22px}
li{margin:6px 0}
.cta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
.cta p{margin:0;color:var(--ink2)}
.btn{display:inline-block;background:var(--accent);color:var(--accent-ink);font-weight:800;text-decoration:none;padding:12px 18px;border-radius:12px;white-space:nowrap}
details{border-bottom:1px solid var(--line);padding:12px 0}
summary{font-weight:700;cursor:pointer}
details p{margin:8px 0 0;color:var(--ink2)}
.note{background:var(--note);border:1px solid var(--note-line);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--ink2)}
.meta{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}
.pill{font-size:12px;font-weight:700;border:1px solid var(--line);border-radius:999px;padding:2px 10px;color:var(--ink2)}
footer{margin-top:40px;font-size:13px;color:var(--muted)}
.list a{font-weight:700}
`;

function page({ siteUrl, urlPath, title, description, body, jsonLd = [] }) {
  const canonical = `${siteUrl}${urlPath}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | RoadReady</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="RoadReady">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(siteUrl)}/icons/icon-512.png">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#007AFF">
<link rel="icon" type="image/svg+xml" href="/icons/icon.svg">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<style>${CSS}</style>
${jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<div class="wrap">
<header>
  <a class="brand" href="/?utm_source=guide&amp;utm_medium=header"><img src="/icons/icon-192.png" alt="" width="32" height="32">RoadReady</a>
  <a href="/guides/">All guides</a>
</header>
<main>
${body}
</main>
<footer>
  <p>RoadReady is not affiliated with any DMV or government agency. Rules change; always confirm the current requirements on your state&rsquo;s official DMV website. This is general information, not legal advice.</p>
  <p><a href="/">Open RoadReady</a> &middot; <a href="/guides/">Guides</a></p>
</footer>
</div>
</body>
</html>
`;
}

function cta(slug, text) {
  return `<div class="card cta">
  <p>${esc(text)}</p>
  <a class="btn" href="/?utm_source=guide&amp;utm_campaign=${esc(slug)}">Open RoadReady</a>
</div>`;
}

function stateGuide(g, siteUrl) {
  const urlPath = `/guides/${g.slug}/`;
  const checked = formatDate(g.checkedOn);
  const sourcesHtml = g.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a></li>`).join('');
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="/guides/">Guides</a> &rsaquo; ${esc(g.state)}</nav>
<h1>${esc(g.title)}</h1>
<p class="lead">${esc(g.intro)}</p>

<div class="card">
  <table>
    <caption class="checked" style="caption-side:bottom;text-align:left">Checked against the official ${esc(g.state)} DMV website on ${esc(checked)}. Sources below.</caption>
    <tbody>
      ${g.facts.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('\n      ')}
    </tbody>
  </table>
</div>

${cta(g.slug, 'Log every practice session, day or night, and print a worksheet to help fill in your official log.')}

${g.sections.map((s) => `<h2>${esc(s.heading)}</h2>
${s.steps ? `<ol>${s.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
${s.bullets ? `<ul>${s.bullets.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`).join('\n')}

<h2>Frequently asked questions</h2>
${g.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}

<h2>Official sources</h2>
<ul>${sourcesHtml}</ul>
<p class="note">Requirements can change. Before your appointment or test, confirm them on the official DMV website linked above.</p>
`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: g.title,
      description: g.metaDescription,
      dateModified: g.checkedOn,
      mainEntityOfPage: `${siteUrl}${urlPath}`,
      publisher: { '@type': 'Organization', name: 'RoadReady' }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: g.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Guides', item: `${siteUrl}/guides/` },
        { '@type': 'ListItem', position: 2, name: g.title, item: `${siteUrl}${urlPath}` }
      ]
    }
  ];
  return { urlPath, html: page({ siteUrl, urlPath, title: g.title, description: g.metaDescription, body, jsonLd }), lastmod: g.checkedOn };
}

function spotsGuide(g, siteUrl, zones) {
  const urlPath = `/guides/${g.slug}/`;
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="/guides/">Guides</a> &rsaquo; ${esc(g.city)}</nav>
<h1>${esc(g.title)}</h1>
<p class="lead">${esc(g.intro)}</p>
<p class="note">Always check signs and access rules before you drive anywhere, practise only where it&rsquo;s allowed, and have a licensed supervising driver with you. Conditions change: these details were compiled by RoadReady and not every spot has been checked in person on every day.</p>

${zones.map((z) => `<div class="card">
  <h2 style="margin:0 0 2px">${esc(z.name)}</h2>
  <div class="checked" style="margin:0">${esc(z.subtitle)}</div>
  <div class="meta">
    <span class="pill">${esc(ZONE_TYPES[z.type] || 'Practice spot')}</span>
    <span class="pill">${esc(z.difficulty)}</span>
    <span class="pill">${esc(z.surface)}</span>
    ${z.widthMeters ? `<span class="pill">About ${esc(z.widthMeters)} m wide</span>` : ''}
  </div>
  ${z.recommendedDrills?.length ? `<h3>Good drills here</h3><ul>${z.recommendedDrills.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
  ${z.bestHours ? `<p class="checked">Often quieter: ${esc(z.bestHours)} (not guaranteed)</p>` : ''}
</div>`).join('\n')}

${cta(g.slug, 'See these spots on a map, drop virtual cones for parking drills, and log your practice hours.')}

<h2>Related</h2>
<ul><li><a href="/guides/california-learner-permit-practice-hours/">California learner&rsquo;s permit: how many practice hours do you need?</a></li></ul>
`;
  const jsonLd = [{
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: g.title,
    itemListElement: zones.map((z, i) => ({ '@type': 'ListItem', position: i + 1, name: z.name }))
  }];
  return { urlPath, html: page({ siteUrl, urlPath, title: g.title, description: g.metaDescription, body, jsonLd }), lastmod: null };
}

function indexPage(guides, siteUrl) {
  const urlPath = '/guides/';
  const body = `
<h1>Learner driver guides</h1>
<p class="lead">Practical, checked guides for new drivers and the parents supervising them.</p>
<div class="card list"><ul>
${guides.map((g) => `<li><a href="/guides/${esc(g.slug)}/">${esc(g.title)}</a><br><span class="checked">${esc(g.metaDescription)}</span></li>`).join('\n')}
</ul></div>
<p class="note">More states are added once their rules have been checked against the official DMV website.</p>
`;
  return { urlPath, html: page({ siteUrl, urlPath, title: 'Learner driver guides', description: 'Practice-hour rules and places to practise driving, checked against official sources.', body }), lastmod: null };
}

export async function buildGuides({ outDir = path.join(ROOT, 'dist'), siteUrl = process.env.SITE_URL } = {}) {
  const site = (siteUrl || 'https://roadready.app').replace(/\/+$/, '');
  if (!siteUrl) console.warn('[guides] SITE_URL is not set; using https://roadready.app for canonical links and the sitemap.');

  const { GUIDES } = await import(pathToFileURL(path.join(ROOT, 'src/data/guides.js')).href);
  const { LEARNER_ZONES } = await import(pathToFileURL(path.join(ROOT, 'src/data/learnerZones.js')).href);

  for (const g of GUIDES) {
    if (g.kind !== 'spots' && (!g.sources?.length || !g.checkedOn)) {
      throw new Error(`Guide "${g.slug}" has no official sources or checkedOn date; refusing to publish it.`);
    }
  }

  const pages = [indexPage(GUIDES, site)];
  for (const g of GUIDES) {
    pages.push(g.kind === 'spots' ? spotsGuide(g, site, LEARNER_ZONES) : stateGuide(g, site));
  }

  for (const p of pages) {
    const dir = path.join(outDir, p.urlPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), p.html);
  }

  const today = new Date().toISOString().slice(0, 10);
  const urls = [{ urlPath: '/', lastmod: today }, ...pages];
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(site + u.urlPath)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
  fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${site}/sitemap.xml
`);

  return pages.map((p) => p.urlPath);
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildGuides()
    .then((paths) => console.log(`[guides] wrote ${paths.length} pages, sitemap.xml and robots.txt`))
    .catch((err) => {
      console.error('[guides] failed:', err.message);
      process.exit(1);
    });
}
