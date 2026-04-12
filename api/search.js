/**
 * JW Images Search - Vercel Serverless Search Proxy
 *
 * CSE Setup Instructions:
 * 1. Create a CSE at https://programmablesearchengine.google.com
 *    - Restrict to jw.org and *.jw.org only
 *    - Enable Image Search
 * 2. Enable the "Custom Search JSON API" in Google Cloud Console
 * 3. Create an API key - restrict it to the CSE API only
 *    (no HTTP referrer restriction needed since calls are server-side)
 * 4. Add GOOGLE_CSE_ID and GOOGLE_API_KEY as environment variables
 *    in the Vercel project dashboard
 *
 * Never commit real credential values to git.
 */

export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : '*';

const CSE_BASE = 'https://www.googleapis.com/customsearch/v1';
const PAGE_SIZE = 10;
const MAX_START = 91;

export default async function handler(req) {
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
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('cx', CSE_ID);
  url.searchParams.set('q', q);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('siteSearch', 'jw.org');
  url.searchParams.set('siteSearchFilter', 'i');
  url.searchParams.set('num', String(PAGE_SIZE));
  url.searchParams.set('start', String(start));
  url.searchParams.set('safe', 'active');
  url.searchParams.set('fields', 'items(title,link,image,displayLink),queries,searchInformation');

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

    const items = (data.items || []).map(item => ({
      title: item.title,
      imageUrl: item.link,
      thumbnailUrl: item.image?.thumbnailLink,
      width: item.image?.width,
      height: item.image?.height,
      sourceUrl: `https://${item.displayLink}`,
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
