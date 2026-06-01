# Task: Multi-Language Search Support

**Project:** JW Images Search  
**Priority:** Medium  
**Relates to:** `DEVELOPMENT_HISTORY.md` → Future Enhancement Ideas → "Multi-language support"

---

## Overview

Add a language selector to the search UI that filters image results by language. The feature must work with **both search backends** — Google Custom Search Engine (current) and Serper API (future/alternative). Language preference must persist across sessions and the selector UI must integrate seamlessly with the existing Lavender Dusk design system, respecting the app's colour tokens and any future dark mode.

---

## Languages to Support

| Code | Language    | Native name  | Google `lr`  | Google `hl` | Serper `hl` | Serper `gl` |
|------|-------------|--------------|--------------|-------------|-------------|-------------|
| `en` | English     | English      | `lang_en`    | `en`        | `en`        | `us`        |
| `pt` | Portuguese  | Português    | `lang_pt`    | `pt`        | `pt`        | `pt`        |
| `es` | Spanish     | Español      | `lang_es`    | `es`        | `es`        | `es`        |
| `fr` | French      | Français     | `lang_fr`    | `fr`        | `fr`        | `fr`        |
| `de` | German      | Deutsch      | `lang_de`    | `de`        | `de`        | `de`        |
| `ru` | Russian     | Русский      | `lang_ru`    | `ru`        | `ru`        | `ru`        |
| `uk` | Ukrainian   | Українська   | `lang_uk`    | `uk`        | `uk`        | `ua`        |

Default: `en` (English). Ukrainian may return sparser results — that is a Google/Serper data limitation, not a bug.

---

## Files to Change

### `api/search.js` — serverless proxy

This is the only file where the two-backend split matters.

**1. Add a language map near the top of the file:**

```js
const SUPPORTED_LANGUAGES = {
  en: { lr: 'lang_en', hl: 'en', gl: 'us' },
  pt: { lr: 'lang_pt', hl: 'pt', gl: 'pt' },
  es: { lr: 'lang_es', hl: 'es', gl: 'es' },
  fr: { lr: 'lang_fr', hl: 'fr', gl: 'fr' },
  de: { lr: 'lang_de', hl: 'de', gl: 'de' },
  ru: { lr: 'lang_ru', hl: 'ru', gl: 'ru' },
  uk: { lr: 'lang_uk', hl: 'uk', gl: 'ua' },
};
```

**2. Read and validate the `lang` query parameter** (alongside existing `q` and `start` reads):

```js
const langKey = (searchParams.get('lang') || 'en').toLowerCase();
const lang = SUPPORTED_LANGUAGES[langKey] ?? SUPPORTED_LANGUAGES['en'];
```

Validation against the allowlist (`SUPPORTED_LANGUAGES`) is sufficient — unknown codes silently fall back to English. Do not return a 400 error for an unrecognised language; degrade gracefully.

**3. Google CSE branch** — add two params to the Google URL builder:

```js
url.searchParams.set('lr', lang.lr);   // restricts results to language
url.searchParams.set('hl', lang.hl);   // sets response UI language
```

**4. Serper branch** — add two params to the Serper request body or URL:

```js
// Serper uses hl and gl, not lr
body.hl = lang.hl;
body.gl = lang.gl;
// Also append site restriction to the query string:
body.q = `${q} site:jw.org`;
```

Note: `lr` is a Google-only concept. Serper uses `hl` (UI/result language) and `gl` (geolocation hint for language bias). These two params together approximate the same behaviour.

**5. Backend selection** — the function should detect which backend to use via an environment variable:

```
SEARCH_BACKEND=google   # or: serper
```

If `SEARCH_BACKEND` is absent or unrecognised, default to `google`. This keeps the current deployment working with zero config changes; switching to Serper only requires adding the env var.

Add `SERPER_API_KEY` to the env var list alongside `GOOGLE_CSE_ID` / `GOOGLE_API_KEY`. Only the credentials for the active backend need to be set.

**6. Response normalisation** — both backends must produce the same output shape. The existing Google normalisation is correct. Serper normalisation should map:

```js
// Serper response shape → normalised shape
{
  title:        item.title,
  imageUrl:     item.imageUrl,
  thumbnailUrl: item.thumbnailUrl,
  width:        item.imageWidth,
  height:       item.imageHeight,
  sourceUrl:    item.link,
  displayDomain: (() => { try { return new URL(item.link).hostname; } catch { return item.link; } })(),
}
```

---

### `js/search.js` — client-side search module

Update `fetchImages` to accept and forward `lang`:

```js
// Before
async function fetchImages(query, startIndex = 1)

// After
async function fetchImages(query, startIndex = 1, lang = 'en')
```

Include `lang` in the params sent to `/api/search`:

```js
const params = new URLSearchParams({ q: query, start: startIndex, lang });
```

Export `fetchImages` with the updated signature. No other changes needed in this file.

---

### `js/app.js` — application entry point

**1. Initialise language state** from `localStorage`, falling back to `'en'`:

```js
let currentLang = localStorage.getItem('last_lang') || 'en';
```

**2. On page load**, set the selector's initial value to match the stored preference:

```js
const langSelect = document.getElementById('lang-select');
langSelect.value = currentLang;
```

**3. On search submit**, read the selector before calling `fetchImages`:

```js
currentLang = langSelect.value;
localStorage.setItem('last_lang', currentLang);
// then call: fetchImages(query, 1, currentLang)
```

**4. On infinite scroll** (next page), pass `currentLang` to subsequent fetches:

```js
fetchImages(currentQuery, nextStart, currentLang)
```

**5. On language change** — add a `change` listener on `#lang-select`. If there is an active query (i.e. results are already displayed), immediately re-run the search in the new language: clear the results grid, reset pagination to page 1, and call `fetchImages(currentQuery, 1, currentLang)`. If no query is active yet, do nothing — the picker simply sets state for the next search.

```js
langSelect.addEventListener('change', () => {
  currentLang = langSelect.value;
  localStorage.setItem('last_lang', currentLang);
  if (currentQuery) {
    // clear grid, reset pagination, re-run search
  }
});
```

---

### `index.html` — markup

Add the language selector **inside `.search-form`**, between the search input wrapper and the submit button:

```html
<label for="lang-select" class="visually-hidden">Search language</label>
<select
  id="lang-select"
  class="lang-select"
  aria-label="Search language"
>
  <option value="en">English</option>
  <option value="pt">Português</option>
  <option value="es">Español</option>
  <option value="fr">Français</option>
  <option value="de">Deutsch</option>
  <option value="ru">Русский</option>
  <option value="uk">Українська</option>
</select>
```

The `<label>` uses `class="visually-hidden"` (already defined in `css/style.css`) so it is available to screen readers but not visible.

---

### `css/style.css` — styling

Add styles for `.lang-select`. The selector **must use only existing CSS custom properties** from the Lavender Dusk palette so it automatically adapts to any future dark mode toggle without requiring separate overrides.

```css
.lang-select {
  height: 48px;                              /* matches search button height */
  padding: 0 2rem 0 0.85rem;                 /* right padding for arrow */
  border: 2px solid var(--colour-border);
  border-radius: var(--radius-md);
  background-color: var(--colour-surface);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237B5EA7' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;
  appearance: none;
  -webkit-appearance: none;
  color: var(--colour-text);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s;
  flex-shrink: 0;
}

.lang-select:hover {
  border-color: var(--colour-primary);
}

.lang-select:focus {
  outline: 3px solid var(--colour-border-focus);
  outline-offset: 3px;
  border-color: var(--colour-primary);
}

/* Ensure the option list inherits legible colours in both light and dark OS themes */
.lang-select option {
  background-color: var(--colour-surface);
  color: var(--colour-text);
}
```

**Layout note:** The `.search-form` is already a flex row. The `<select>` sits between the input wrapper (`flex: 1`) and the submit button. It takes its natural width based on the longest option label. On very small screens (≤360px), if the row wraps, the selector should appear below the input at full width:

```css
@media (max-width: 360px) {
  .lang-select {
    width: 100%;
  }
}
```

**Dark mode readiness:** All colours reference CSS custom properties. When a dark mode is later added (via `prefers-color-scheme` or a data attribute), redefining `--colour-surface`, `--colour-border`, `--colour-text`, etc. in the dark context will automatically update the selector with no additional CSS. The SVG arrow uses a hardcoded hex (`#7B5EA7`) — if dark mode requires a different arrow colour, replace it with a separate `--colour-select-arrow` variable at that point.

---

### `cookie-policy.html` — legal page

Add one row to the localStorage keys table (section 2, "LocalStorage Keys Used"):

```html
<tr style="border-bottom: 1px solid var(--colour-border);">
  <td style="padding: 0.75rem; font-family: var(--font-mono); font-size: var(--text-sm);">last_lang</td>
  <td style="padding: 0.75rem;">Remembers your last selected search language</td>
  <td style="padding: 0.75rem;">Until you clear browser data</td>
</tr>
```

---

### `.env.example`

Add the new variables:

```
# Search backend: "google" (default) or "serper"
SEARCH_BACKEND=google

# Required when SEARCH_BACKEND=google
GOOGLE_CSE_ID=your_cse_id_here
GOOGLE_API_KEY=your_api_key_here

# Required when SEARCH_BACKEND=serper
SERPER_API_KEY=your_serper_api_key_here
```

---

## Acceptance Criteria

- [ ] Language selector appears in the search form, visually consistent with the existing Lavender Dusk UI (border, radius, font, focus ring all match the design system tokens).
- [ ] Selector uses only existing CSS custom properties — no hardcoded colours except the SVG arrow (see note above).
- [ ] Selector is keyboard-accessible: focusable by Tab, operable by arrow keys, labelled for screen readers.
- [ ] Selecting a language while results are visible immediately clears results and re-runs the current query in the new language.
- [ ] Selected language persists across page reloads via `localStorage` key `last_lang`.
- [ ] All 7 languages work correctly with Google CSE backend (`lr` + `hl` params).
- [ ] All 7 languages work correctly with Serper backend (`hl` + `gl` params).
- [ ] Backend is selected via `SEARCH_BACKEND` env var; absent/unknown value defaults to `google`.
- [ ] Unknown `lang` param values in the API fall back to English gracefully (no 400 error).
- [ ] `cookie-policy.html` documents the `last_lang` localStorage key.
- [ ] `.env.example` documents all three new env vars with comments.
- [ ] Service worker cache version incremented to `jw-images-v2` (forces cache invalidation after deploy).

---

## Out of Scope

- Translating the app UI itself (labels, headers, legal pages) into other languages — this task covers search-result language only.
- Adding languages beyond the seven listed above.
- Dark mode implementation — the selector is designed to be dark-mode-ready but dark mode itself is a separate future task.

---

## Notes for the Implementer

- Read `DEVELOPMENT_HISTORY.md` before starting — it contains architecture decisions and the full file map.
- `api/search.js` currently uses the Vercel Edge Runtime (`export const config = { runtime: 'edge' }`). The Serper branch must also be Edge-compatible — no Node.js-only APIs.
- The Serper API endpoint for image search is `https://google.serper.dev/images`. Authentication uses the header `X-API-KEY: <SERPER_API_KEY>` with a JSON POST body. Do not send credentials in the URL.
- Serper's pagination uses `page` (integer, 1-based) rather than Google's `start` (integer, 1-based with step 10). Map accordingly: Serper `page` = `Math.ceil(start / 10)`.
- After this task is complete, add a new session entry to `DEVELOPMENT_HISTORY.md` following the existing format.
