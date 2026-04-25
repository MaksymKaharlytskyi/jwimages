# Prompt: Build "JW Images Search" — a static PWA image search app

## Overview

Build a complete, single-page web application called **JW Images Search**. The app lets users search for images by keyword, restricted exclusively to the domain `jw.org` (covering both `https://wol.jw.org` and `https://jw.org`). The app is deployed to **Vercel** with no admin panel and no database.

The Google CSE credentials (`CSE_ID` and `API_KEY`) are stored as **Vercel environment variables** and are **never exposed to the browser**. A lightweight Vercel serverless function (`/api/search.js`) acts as a secure proxy: the browser calls `/api/search?q=...`, the function reads the secrets from `process.env`, calls the Google CSE API server-side, and returns only the normalised result payload to the client. All static assets (HTML, CSS, JS, icons) are still served as plain static files.

---

## File structure

Produce every file listed below. Do not omit any of them.

```
/
├── api/
│   └── search.js          ← Vercel serverless function (Node.js, secret proxy)
├── index.html
├── manifest.json
├── service-worker.js
├── robots.txt
├── sitemap.xml
├── vercel.json
├── .env.example           ← documents required env vars; never commit .env
├── terms-of-use.html
├── cookie-policy.html
├── privacy-policy.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── search.js          ← client-side: calls /api/search, not Google directly
│   ├── masonry.js
│   ├── lightbox.js
│   └── cookies.js
└── icons/
    ├── icon-192.png   ← placeholder SVG exported as PNG or an SVG reference
    └── icon-512.png   ← same
```

---

## Design system — Lavender Dusk palette

Use CSS custom properties declared in `:root`. All colours must pass WCAG 2.1 AA contrast requirements (minimum 4.5:1 for body text, 3:1 for large text and UI components).

```css
:root {
  /* Base surfaces */
  --colour-bg:           #F4F2F9;   /* page background — soft lavender tint */
  --colour-surface:      #FFFFFF;   /* card / lightbox background */
  --colour-surface-2:    #EDE9F6;   /* secondary surface, cookie banner */

  /* Brand */
  --colour-primary:      #7B5EA7;   /* main purple — buttons, links, focus rings */
  --colour-primary-dark: #5C4280;   /* hover / active states */
  --colour-accent:       #B39DDB;   /* soft mauve — decorative, tags */
  --colour-accent-light: #D8CFEF;   /* pill backgrounds, chip fills */

  /* Text */
  --colour-text:         #2D2040;   /* primary text — deep purple-black */
  --colour-text-muted:   #6B5F80;   /* secondary text */
  --colour-text-on-primary: #FFFFFF;

  /* Borders */
  --colour-border:       #C5B8E0;   /* standard */
  --colour-border-focus: #7B5EA7;   /* focus ring */

  /* Feedback */
  --colour-error:        #B00020;
  --colour-error-bg:     #FDECEA;
  --colour-success:      #1B6B3A;

  /* Spacing & shape */
  --radius-sm:    6px;
  --radius-md:    12px;
  --radius-lg:    20px;
  --shadow-card:  0 2px 8px rgba(75, 50, 120, 0.10);
  --shadow-modal: 0 8px 32px rgba(75, 50, 120, 0.22);

  /* Typography scale */
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body:    'Nunito', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
  --text-xs:   0.75rem;
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.5rem;
  --text-2xl:  2rem;
  --text-3xl:  2.75rem;
}
```

Load these Google Fonts in `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;500;600&display=swap">
```

---

## index.html — page structure

### `<head>` requirements
- `lang="en"`, `charset="UTF-8"`, responsive viewport meta.
- Full Open Graph and Twitter Card meta tags.
- `<meta name="theme-color" content="#7B5EA7">`.
- Link to `manifest.json`.
- Register `service-worker.js` via inline script.
- `<link rel="canonical">`.
- Structured data: `WebSite` schema with `SearchAction` pointing to the search input.
- Link CSS. Defer all JS scripts.
- **Security headers** are set in `vercel.json` (see below), not via meta tags, except `<meta http-equiv="X-UA-Compatible" content="IE=edge">` if needed.

### Landmark layout (semantic HTML5)
```
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <header role="banner">
    <!-- Logo + site name + tagline -->
  </header>

  <main id="main-content" role="main">
    <section aria-label="Image search">
      <!-- Search form -->
    </section>

    <section aria-label="Search results" aria-live="polite" aria-atomic="false">
      <!-- Masonry grid -->
      <!-- Infinite scroll sentinel -->
    </section>
  </main>

  <footer role="contentinfo">
    <!-- Links: Terms of Use · Cookie Policy · Privacy Policy -->
    <!-- Disclaimer: "This is an independent tool. Not affiliated with jw.org." -->
  </footer>

  <!-- Cookie consent banner (injected by cookies.js) -->
  <!-- Lightbox overlay (injected by lightbox.js) -->
</body>
```

### Header design
- Site name: `<h1>` using `--font-display`, colour `--colour-primary`.
- Tagline: "Search images on JW.org" in `--colour-text-muted`.
- No navigation links in the header except the logo (which links to `#`).
- Header background: `--colour-surface` with a subtle bottom border in `--colour-border`.

### Search form
- Single `<input type="search">` with `aria-label="Search images on JW.org"`, `placeholder="Search images…"`, `autocomplete="off"`, `spellcheck="false"`.
- Submit `<button type="submit">` with a visible search icon (inline SVG) and the text "Search" (visible to screen readers via `aria-label` if icon-only on small screens).
- On submit: trim value, reject if fewer than 2 characters (show inline error with `role="alert"`), otherwise call `search.js`.
- Keyboard: `Enter` triggers search. `Escape` clears the field.
- The form has `role="search"`.

---

## api/search.js — Vercel serverless proxy (secrets live here)

This is a Vercel Edge-compatible **Node.js serverless function**. It is the only place the Google credentials exist at runtime. The browser never receives them.

### Environment variables (set in Vercel dashboard → Project → Settings → Environment Variables)

| Variable name      | Description                                      |
|--------------------|--------------------------------------------------|
| `GOOGLE_CSE_ID`    | Your Google Custom Search Engine ID              |
| `GOOGLE_API_KEY`   | Your Google API key (restricted to CSE API only) |

Also create a `.env.example` file at the project root (committed to git, no real values):
```
# Copy this file to .env.local for local development with `vercel dev`
GOOGLE_CSE_ID=your_cse_id_here
GOOGLE_API_KEY=your_api_key_here
```

### Function implementation (`api/search.js`)

```js
export const config = { runtime: 'edge' }; // use Vercel Edge Runtime for low latency

const ALLOWED_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : '*'; // fallback for local dev

const CSE_BASE = 'https://www.googleapis.com/customsearch/v1';
const PAGE_SIZE = 10;
const MAX_START = 91; // CSE hard limit: 100 results total

export default async function handler(req) {
  // CORS — only allow same origin in production
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const start = Math.min(
    parseInt(searchParams.get('start') || '1', 10),
    MAX_START
  );

  if (!q || q.length < 2) {
    return new Response(
      JSON.stringify({ error: 'Query must be at least 2 characters.' }),
      { status: 400, headers }
    );
  }

  const CSE_ID  = process.env.GOOGLE_CSE_ID;
  const API_KEY = process.env.GOOGLE_API_KEY;

  if (!CSE_ID || !API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: missing credentials.' }),
      { status: 500, headers }
    );
  }

  const url = new URL(CSE_BASE);
  url.searchParams.set('key',            API_KEY);
  url.searchParams.set('cx',             CSE_ID);
  url.searchParams.set('q',              q);
  url.searchParams.set('searchType',     'image');
  url.searchParams.set('siteSearch',     'jw.org');
  url.searchParams.set('siteSearchFilter', 'i');
  url.searchParams.set('num',            String(PAGE_SIZE));
  url.searchParams.set('start',          String(start));
  url.searchParams.set('safe',           'active');
  url.searchParams.set('fields',
    'items(title,link,image,displayLink),queries,searchInformation'
  );

  try {
    const googleRes = await fetch(url.toString());
    const data = await googleRes.json();

    if (!googleRes.ok) {
      const status = googleRes.status;
      let message = 'Search error. Please try again.';
      if (status === 429) message = 'Too many requests. Please try again shortly.';
      if (status === 403) message = 'Search quota exceeded for today. Please try again tomorrow.';
      return new Response(JSON.stringify({ error: message }), { status, headers });
    }

    // Normalise — strip the raw API key fields before forwarding
    const items = (data.items || []).map(item => ({
      title:        item.title,
      imageUrl:     item.link,
      thumbnailUrl: item.image?.thumbnailLink,
      width:        item.image?.width,
      height:       item.image?.height,
      sourceUrl:    `https://${item.displayLink}`,
      displayDomain: item.displayLink,
    }));

    return new Response(
      JSON.stringify({
        items,
        totalResults: data.searchInformation?.totalResults ?? '0',
        nextStart: items.length === PAGE_SIZE ? start + PAGE_SIZE : null,
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Network error reaching search service.' }),
      { status: 502, headers }
    );
  }
}
```

### CSE setup note (include as a comment block at the top of the file)
> The developer must: (1) create a CSE at https://programmablesearchengine.google.com — restrict to `jw.org` and `*.jw.org` only, enable Image Search; (2) enable the "Custom Search JSON API" in Google Cloud Console; (3) create an API key — restrict it to the CSE API only (no HTTP referrer restriction needed since calls are server-side); (4) add `GOOGLE_CSE_ID` and `GOOGLE_API_KEY` as environment variables in the Vercel project dashboard. Never commit real values to git.

---

## js/search.js — client-side search module

The browser calls `/api/search` (the local serverless proxy), never Google directly. No credentials appear anywhere in client-side code.

### Configuration (top of file)
```js
const CONFIG = {
  PAGE_SIZE: 10,
  MAX_PAGES: 10,  // CSE hard limit: 100 results (10 × 10)
};
```

### Fetch call
```js
async function fetchImages(query, startIndex = 1) {
  const params = new URLSearchParams({ q: query, start: startIndex });
  const res = await fetch(`/api/search?${params}`);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Search failed.');
  return data; // { items, totalResults, nextStart }
}
```

---

## masonry.js — layout engine

Use a **pure CSS column-based masonry layout** as the primary approach (no JavaScript layout library required):

```css
.results-grid {
  column-count: 2;
  column-gap: 12px;
}
@media (min-width: 600px)  { .results-grid { column-count: 3; } }
@media (min-width: 900px)  { .results-grid { column-count: 4; } }
@media (min-width: 1200px) { .results-grid { column-count: 5; } }

.result-card {
  break-inside: avoid;
  margin-bottom: 12px;
}
```

If the browser supports `grid` with `masonry` (currently behind a flag), progressively enhance with:
```css
@supports (grid-template-rows: masonry) {
  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    grid-template-rows: masonry;
    gap: 12px;
    column-count: unset;
  }
}
```

### Result card anatomy
```html
<article class="result-card" aria-label="{title}">
  <button class="card-trigger"
          aria-label="View image: {title}"
          data-image-url="{imageUrl}"
          data-source-url="{sourceUrl}"
          data-title="{title}">
    <img
      src="{thumbnailUrl}"
      alt="{title}"
      loading="lazy"
      decoding="async"
      width="{thumb_width}"
      height="{thumb_height}"
      onerror="this.closest('.result-card').remove()"
    >
    <div class="card-overlay" aria-hidden="true">
      <span class="card-domain">{displayDomain}</span>
    </div>
  </button>
</article>
```

- Cards animate in with a subtle `opacity 0→1` + `translateY 12px→0` on insert (CSS, `prefers-reduced-motion` respected).
- Broken image fallback: remove the card from the DOM silently via the `onerror` handler.
- The card trigger is a `<button>` (not an `<a>`) because its primary action is opening the lightbox, not navigating.

### Infinite scroll
Use `IntersectionObserver` on a sentinel `<div aria-hidden="true">` placed after the grid. When it enters the viewport, call `search.js` with the next page index. Show a spinner (CSS animation, not a GIF) while loading. Stop observing when `MAX_PAGES` is reached or the API returns fewer results than `PAGE_SIZE`. Announce new results to screen readers via the `aria-live="polite"` region on the results section.

---

## lightbox.js — image overlay

### Behaviour
1. Clicking a card button opens the lightbox.
2. The lightbox shows the full-resolution image (`imageUrl`) centred on screen.
3. Below the image: the image title and two action buttons:
   - **"View on JW.org"** — opens `sourceUrl` in a new tab (`target="_blank" rel="noopener noreferrer"`).
   - **"Close"** — closes the lightbox.
4. Close also on: `Escape` key, clicking the backdrop.
5. Focus is trapped inside the lightbox while open (focus cycling between Close and View on JW.org buttons + the image itself if focusable).
6. On open: `document.body` gets `overflow: hidden`; focus moves to the lightbox's close button.
7. On close: focus returns to the card trigger that opened it.
8. The lightbox element has `role="dialog"`, `aria-modal="true"`, `aria-label="Image preview"`.
9. The backdrop is `aria-hidden="true"`.

### Markup (injected once into `<body>` on `DOMContentLoaded`)
```html
<div id="lightbox" role="dialog" aria-modal="true" aria-label="Image preview" aria-hidden="true" tabindex="-1">
  <div class="lightbox-backdrop" id="lightbox-backdrop"></div>
  <div class="lightbox-panel">
    <button class="lightbox-close" id="lightbox-close" aria-label="Close image preview">
      <!-- × SVG icon -->
    </button>
    <div class="lightbox-img-wrap">
      <img id="lightbox-img" src="" alt="" decoding="async">
    </div>
    <div class="lightbox-footer">
      <p class="lightbox-title" id="lightbox-title"></p>
      <a id="lightbox-source" href="" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
        View on JW.org
        <!-- external link SVG icon -->
      </a>
    </div>
  </div>
</div>
```

---

## cookies.js — GDPR/EU cookie consent

The app uses **only essential cookies / localStorage** for remembering the user's consent choice. It uses **no analytics, no third-party tracking, no advertising cookies**. The Google CSE API call is a server-side data fetch that does not place cookies on the user's device.

### Consent banner
Inject a banner at the bottom of the page on first visit (when no consent record exists in `localStorage`):

```
┌────────────────────────────────────────────────────────────────────┐
│  We use only essential cookies to remember your preferences.       │
│  No tracking or advertising cookies are used.                      │
│                                                                    │
│  [Learn more]  [Reject non-essential]  [Accept all]               │
└────────────────────────────────────────────────────────────────────┘
```

- "Learn more" links to `cookie-policy.html`.
- "Reject non-essential" and "Accept all" both set `localStorage.setItem('cookie_consent', 'accepted')` and hide the banner (since there are no non-essential cookies, both choices have the same functional effect — be transparent about this in the cookie policy).
- The banner has `role="region"` and `aria-label="Cookie consent"`.
- The banner is not shown again once consent is stored.
- On `cookie-policy.html` include a "Withdraw consent" button that calls `localStorage.removeItem('cookie_consent')` and reloads the page.

### localStorage keys used by the app
| Key | Purpose |
|-----|---------|
| `cookie_consent` | Stores `'accepted'` once user acknowledges the banner |
| `last_query` | Stores the last search query to restore on revisit (non-sensitive) |

---

## service-worker.js — PWA offline support

Use a **cache-first for static assets, network-first for API calls** strategy.

### Cache static assets on install
Cache: `index.html`, `terms-of-use.html`, `cookie-policy.html`, `privacy-policy.html`, `css/style.css`, all JS files, both icons, `manifest.json`, the Google Fonts stylesheet and font files.

### Runtime caching
- Calls to `/api/search` (the serverless proxy): **network-first**, fall back to a cached response if offline. Cache for 5 minutes max (`Cache-Control: s-maxage=300` is already set by the function; the service worker should honour it for offline fallback).
- Image thumbnails (`encrypted-tbn`): **cache-first**, cache up to 100 images, evict oldest.

### Offline fallback
If the user is offline and no cached API result exists, show a friendly offline message in the results area (served from the cached `index.html`).

---

## manifest.json

```json
{
  "name": "JW Images Search",
  "short_name": "JW Images",
  "description": "Search images on JW.org by keyword.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F4F2F9",
  "theme_color": "#7B5EA7",
  "orientation": "portrait-primary",
  "lang": "en",
  "categories": ["utilities", "photo"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## vercel.json — deployment & security headers

```json
{
  "functions": {
    "api/search.js": { "runtime": "edge" }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options",    "value": "nosniff" },
        { "key": "X-Frame-Options",           "value": "DENY" },
        { "key": "X-XSS-Protection",          "value": "1; mode=block" },
        { "key": "Referrer-Policy",           "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",        "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*.googleapis.com https://*.google.com https://*.jw.org https://encrypted-tbn*.gstatic.com; connect-src 'self'; frame-ancestors 'none';"
        }
      ]
    }
  ],
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

Note the tightened `connect-src 'self'`: the browser now only talks to `/api/search` (same origin). The serverless function makes the outbound call to `googleapis.com` server-side, so Google's domain no longer needs to be whitelisted in the CSP.

---

## Accessibility (WCAG 2.1 AA)

Implement every item below. These are mandatory, not optional.

- **Skip link**: Visible on focus, `href="#main-content"`, positioned absolutely at top-left, styled with `--colour-primary` background.
- **Focus styles**: All interactive elements have a visible focus indicator: `outline: 3px solid var(--colour-border-focus); outline-offset: 3px;`. Never use `outline: none` without a custom equivalent.
- **Colour contrast**: All text against its background must meet 4.5:1 (body) or 3:1 (large text, UI components). Verify every combination in the design system.
- **Keyboard navigation**: The entire UI — search, cards, lightbox, cookie banner — must be fully operable by keyboard alone. Tab order must be logical and match visual order.
- **Screen reader support**: All images have meaningful `alt` text derived from `item.title`. Decorative elements have `aria-hidden="true"`. Dynamic updates (new results loading, errors) use `aria-live` regions.
- **Reduced motion**: Wrap all CSS transitions/animations in `@media (prefers-reduced-motion: no-preference) { … }` so they only run when the user hasn't requested reduced motion.
- **Touch targets**: All interactive elements are at least 44×44 CSS pixels.
- **Form labels**: The search input is associated with a visible or screen-reader-accessible label.
- **Error messages**: Search validation errors are associated with the input via `aria-describedby` and announced via `role="alert"`.
- **Language**: `<html lang="en">`.
- **Landmarks**: Use `<header>`, `<main>`, `<footer>`, `<nav>` (if any), `<section>` with `aria-label` as shown in the layout above.
- **Images in lightbox**: The lightbox `<img>` must have its `alt` attribute updated to the image title each time a new image is opened.
- **No content flashes**: Use `prefers-color-scheme` if adding a dark mode in future; do not add a forced dark mode now unless explicitly requested.

---

## Legal pages (HTML files)

Each legal page must:
- Inherit the same CSS as `index.html` (link `css/style.css`).
- Have a `<header>` with the site name linking back to `/`.
- Have a `<main>` with semantic headings.
- Be fully keyboard navigable.

### terms-of-use.html — required sections
1. Acceptance of terms
2. Description of service (independent tool, not affiliated with JW.org or the Watchtower Bible and Tract Society)
3. Use of the Google Custom Search API (subject to Google's Terms of Service)
4. Intellectual property — all images remain the property of their respective owners; the app does not host, copy, or redistribute any images
5. Disclaimer of warranties
6. Limitation of liability
7. Governing law (European Union / general international)
8. Changes to terms
9. Contact (placeholder email)

### cookie-policy.html — required sections
1. What cookies are (brief explanation)
2. Cookies this site uses — table listing only `localStorage` keys, their purpose, and retention period
3. Third-party services — note that Google Custom Search API requests are made server-to-server; no Google tracking cookies are set on the user's device by this app
4. How to manage or withdraw consent (with the "Withdraw consent" button)
5. Changes to this policy
6. Contact

### privacy-policy.html — required sections (GDPR Art. 13 compliant)
1. Identity and contact details of the data controller (placeholder name/email)
2. What personal data is processed — state: no personal data is collected or stored server-side; only `localStorage` is used locally on the user's device
3. Purpose and legal basis for processing — legitimate interest (essential functionality)
4. Data retention — local only, cleared when user clears browser data
5. Data subject rights (access, rectification, erasure, portability, objection, lodge complaint with supervisory authority)
6. Transfers outside the EEA — Google API calls may route through US servers; reference Google's Standard Contractual Clauses
7. No automated decision-making or profiling
8. Contact details for the supervisory authority (link to edpb.europa.eu)

---

## css/style.css — additional rules

Beyond the design tokens, implement:

```css
/* Skip link */
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  background: var(--colour-primary);
  color: var(--colour-text-on-primary);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  z-index: 9999;
  transition: top 0.2s;
}
.skip-link:focus { top: 1rem; }

/* Cookie banner */
.cookie-banner {
  position: sticky;         /* NOT fixed — avoids viewport collapse issues */
  bottom: 0;
  background: var(--colour-surface-2);
  border-top: 1px solid var(--colour-border);
  padding: 1rem 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  z-index: 100;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.2rem;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  border: 2px solid transparent;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}
.btn:active { transform: scale(0.97); }
.btn-primary {
  background: var(--colour-primary);
  color: var(--colour-text-on-primary);
}
.btn-primary:hover { background: var(--colour-primary-dark); }
.btn-ghost {
  background: transparent;
  border-color: var(--colour-border);
  color: var(--colour-text);
}
.btn-ghost:hover { background: var(--colour-accent-light); }

/* Spinner */
.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--colour-accent-light);
  border-top-color: var(--colour-primary);
  border-radius: 50%;
}
@media (prefers-reduced-motion: no-preference) {
  .spinner { animation: spin 0.8s linear infinite; }
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Result card image */
.result-card img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  background: var(--colour-accent-light);
}

/* Lightbox */
#lightbox {
  display: none;
  position: fixed;  /* acceptable here — it's a modal, not a layout element */
  inset: 0;
  z-index: 500;
  align-items: center;
  justify-content: center;
}
#lightbox[aria-hidden="false"] { display: flex; }
.lightbox-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(20, 10, 40, 0.75);
}
.lightbox-panel {
  position: relative;
  background: var(--colour-surface);
  border-radius: var(--radius-lg);
  max-width: min(90vw, 900px);
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.lightbox-img-wrap img {
  max-width: 100%;
  max-height: 65vh;
  object-fit: contain;
  border-radius: var(--radius-md);
}
```

---

## robots.txt

```
User-agent: *
Allow: /
Disallow: /js/
Disallow: /css/
Sitemap: https://YOUR_DOMAIN/sitemap.xml
```

---

## sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/0.5">
  <url><loc>https://YOUR_DOMAIN/</loc><priority>1.0</priority></url>
  <url><loc>https://YOUR_DOMAIN/terms-of-use.html</loc><priority>0.3</priority></url>
  <url><loc>https://YOUR_DOMAIN/cookie-policy.html</loc><priority>0.3</priority></url>
  <url><loc>https://YOUR_DOMAIN/privacy-policy.html</loc><priority>0.3</priority></url>
</urlset>
```

---

## Implementation notes & constraints

1. **Architecture: static frontend + one serverless function.** All HTML/CSS/JS files are served as static assets by Vercel. The single serverless function at `api/search.js` (Vercel Edge Runtime) handles all Google API communication. No other server-side code exists.
2. **Credentials are never in the browser.** `GOOGLE_CSE_ID` and `GOOGLE_API_KEY` exist only in Vercel's environment variable store and in `process.env` inside `api/search.js`. They must never appear in any file committed to git. The `.env.example` file documents the variable names only, with placeholder values.
3. **Local development.** Run `vercel dev` (Vercel CLI) locally to emulate both static serving and the serverless function. Create a `.env.local` file (git-ignored) with real values for local testing.
4. **API key restriction in Google Cloud Console.** Since calls are server-side, restrict the key to the CSE API only — no HTTP referrer restriction is needed (and would in fact break things since the call comes from Vercel's infrastructure, not the user's browser). Document this in `README.md`.
5. **Produce a `README.md`** with step-by-step setup instructions: creating the CSE, obtaining the API key, setting Vercel environment variables, running locally with `vercel dev`, and deploying with `vercel --prod`.
6. **No `alert()`, `confirm()`, or `prompt()`.** All user communication is in-page.
7. **No external JS libraries** beyond Google Fonts (CSS only). Masonry, lightbox, infinite scroll, and cookie logic are all bespoke vanilla JS.
8. **Image proxying.** The app does not proxy images. It links directly to Google's thumbnail CDN and to jw.org source URLs. Make this clear in the Terms of Use.
9. **Quota awareness.** The free CSE tier allows 100 queries per day. The serverless function returns a clear `403` error body; the client must display a friendly message when this occurs.
10. **Replace all placeholder values** (`YOUR_DOMAIN`) in `robots.txt` and `sitemap.xml` before deployment.
11. **Disclaimer.** The app is an independent search tool and is not affiliated with, endorsed by, or connected to JW.org or the Watchtower Bible and Tract Society. This must appear in the footer and in the Terms of Use.

---

*End of prompt.*
