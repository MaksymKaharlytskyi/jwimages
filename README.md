# JW Images Search

A fast, privacy-focused Progressive Web App (PWA) for searching images on JW.org using Google Custom Search Engine.

## Features

- **Privacy-first**: No personal data collection, no analytics, no tracking cookies
- **PWA support**: Installable on mobile devices, works offline
- **Accessible**: WCAG 2.1 AA compliant with full keyboard navigation and screen reader support
- **Fast**: Cache-first loading for static assets, optimized for performance
- **Secure**: API credentials stored server-side only, never exposed to the browser

## Prerequisites

Before deploying this application, you need to set up Google Custom Search Engine:

### 1. Create a Custom Search Engine

1. Go to [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click "Add" to create a new search engine
3. Configure the following settings:
   - **Sites to search**: Add `jw.org` and `*.jw.org`
   - **Search the entire web**: Turn OFF
   - **Enable image search**: Turn ON (important!)
4. Save your search engine

### 2. Enable the Custom Search JSON API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Custom Search JSON API":
   - Navigate to "APIs & Services" > "Library"
   - Search for "Custom Search JSON API"
   - Click "Enable"

### 3. Create an API Key

1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. **Important**: Restrict the API key:
   - Click "Edit API Key"
   - Under "API restrictions", select "Restrict key"
   - Choose "Custom Search JSON API" from the dropdown
   - Save
4. Copy your API key (you'll need this for Vercel)

### 4. Get Your CSE ID

1. Go back to your [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Find your search engine in the list
3. Copy the "Search engine ID" (looks like: `xxxxxxxxx:xxxxxxxxxxxxx`)

## Environment Variables

Create a `.env.local` file for local development (this file is git-ignored):

```bash
# .env.local
GOOGLE_CSE_ID=your_cse_id_here
GOOGLE_API_KEY=your_api_key_here
```

**Never commit real credentials to git!** The `.env.example` file is provided as a template.

## Local Development

### Install Vercel CLI

```bash
npm install -g vercel
```

### Login to Vercel

```bash
vercel login
```

### Run Locally

```bash
vercel dev
```

The app will be available at `http://localhost:3000` (or the port shown in your terminal).

## Deployment to Vercel

### 1. Link Your Project

```bash
vercel link
```

### 2. Set Environment Variables in Vercel

```bash
# Production environment
vercel env add GOOGLE_CSE_ID production
vercel env add GOOGLE_API_KEY production

# Preview environment (if needed)
vercel env add GOOGLE_CSE_ID preview
vercel env add GOOGLE_API_KEY preview

# Development environment (if needed)
vercel env add GOOGLE_CSE_ID development
vercel env add GOOGLE_API_KEY development
```

Or set them via the Vercel dashboard:
1. Go to your project in Vercel
2. Navigate to "Settings" > "Environment Variables"
3. Add `GOOGLE_CSE_ID` and `GOOGLE_API_KEY`

### 3. Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 4. Update Domain References

Before going live, update the following files to replace `YOUR_DOMAIN` with your actual domain:

- `robots.txt`
- `sitemap.xml`
- `index.html` (meta tags)
- `terms-of-use.html` (if needed)
- `cookie-policy.html` (if needed)
- `privacy-policy.html` (if needed)

## Project Structure

```
/
├── api/
│   └── search.js          # Vercel serverless function (secure proxy)
├── icons/
│   ├── icon-192.svg       # PWA icon (192x192)
│   └── icon-512.svg       # PWA icon (512x512)
├── css/
│   └── style.css          # All styles with CSS custom properties
├── js/
│   ├── app.js             # Main application entry point
│   ├── search.js          # Search API client
│   ├── masonry.js         # Masonry layout & infinite scroll
│   ├── lightbox.js        # Image preview modal
│   └── cookies.js         # Cookie consent management
├── index.html             # Main page
├── terms-of-use.html      # Legal page
├── cookie-policy.html     # Legal page
├── privacy-policy.html    # Legal page
├── manifest.json          # PWA manifest
├── service-worker.js      # PWA offline support
├── vercel.json            # Vercel configuration & security headers
├── robots.txt             # Search engine instructions
├── sitemap.xml            # SEO sitemap
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Architecture

### Frontend (Static)
- HTML, CSS, and JavaScript files served as static assets
- No server-side rendering
- All client-side functionality via vanilla JavaScript

### Backend (Serverless)
- Single serverless function at `/api/search.js`
- Runs on Vercel Edge Runtime for low latency
- Handles all communication with Google's API
- Credentials exist only in this function's environment

### Data Flow
1. User enters search query in browser
2. Browser calls `/api/search?q=...` (same origin)
3. Serverless function reads credentials from `process.env`
4. Function calls Google CSE API with credentials
5. Function normalizes response and returns to browser
6. Browser displays results

**Key Security Point**: The browser never receives or sees the API credentials.

## API Quotas

The free tier of Google Custom Search Engine allows:
- **100 queries per day**

When the quota is exceeded, the API returns a 403 error. The app displays a friendly message to users.

To increase your quota, you need to set up billing in Google Cloud Console.

## Accessibility

This app is built with accessibility in mind:

- **Skip link**: Jump to main content
- **Focus indicators**: Visible focus rings on all interactive elements
- **Keyboard navigation**: Full keyboard support for all features
- **Screen reader support**: Proper ARIA labels and live regions
- **Color contrast**: All text passes WCAG AA (4.5:1 minimum)
- **Reduced motion**: Respects `prefers-reduced-motion` setting
- **Touch targets**: All buttons are at least 44x44 CSS pixels

## PWA Features

- **Installable**: Can be added to home screen on mobile devices
- **Offline support**: Static assets cached for offline viewing
- **Theme color**: Matches app chrome to brand colors
- **Standalone display**: Opens without browser UI when installed

## Design System

The app uses the "Lavender Dusk" color palette:

| Variable | Value | Usage |
|----------|-------|-------|
| `--colour-bg` | #F4F2F9 | Page background |
| `--colour-surface` | #FFFFFF | Card backgrounds |
| `--colour-primary` | #7B5EA7 | Buttons, links, focus |
| `--colour-primary-dark` | #5C4280 | Hover states |
| `--colour-text` | #2D2040 | Primary text |
| `--colour-border` | #C5B8E0 | Borders |

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is provided as-is for educational and personal use.

## Disclaimer

This is an independent tool. Not affiliated with jw.org, the Watchtower Bible and Tract Society of Pennsylvania, or Google LLC.

All images remain the property of their respective owners. This application does not host, copy, or redistribute any images.

## Contact

For questions or issues, please contact: [contact@example.com](mailto:contact@example.com)
