/**
 * JW Images Search - Vercel Serverless Search Proxy
 *
 * Setup Instructions:
 *
 * Google Custom Search:
 * 1. Create a CSE at https://programmablesearchengine.google.com
 *    - Restrict to jw.org and *.jw.org only
 *    - Enable Image Search
 * 2. Enable the "Custom Search API" in Google Cloud Console
 * 3. Create an API key - restrict it to the CSE API only
 * 4. Set SEARCH_API=google, GOOGLE_CSE_ID, and GOOGLE_API_KEY in Vercel
 *
 * Serper.dev:
 * 1. Get API key at https://serper.dev
 * 2. Set SEARCH_API=serper and SERPER_API_KEY in Vercel
 *
 * Never commit real credential values to git.
 */

export const config = { runtime: 'edge' };

const ALLOWED_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : '*';

const SEARCH_API = process.env.SEARCH_API || 'google';

const GOOGLE_CSE_BASE = 'https://www.googleapis.com/customsearch/v1';
const SERPER_BASE = 'https://google.serper.dev/images';
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

  if (SEARCH_API === 'serper') {
    return handleSerper(q, start, headers);
  }

  return handleGoogle(q, start, headers);
}

async function handleGoogle(q, start, headers) {
  const CSE_ID  = process.env.GOOGLE_CSE_ID;
  const API_KEY = process.env.GOOGLE_API_KEY;

  if (!CSE_ID || !API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: missing Google credentials.' }),
      { status: 500, headers }
    );
  }

  const url = new URL(GOOGLE_CSE_BASE);
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
      JSON.stringify({ error: 'Network error reaching Google search service.' }),
      { status: 502, headers }
    );
  }
}

async function handleSerper(q, start, headers) {
  const API_KEY = process.env.SERPER_API_KEY;

  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: missing Serper API key.' }),
      { status: 500, headers }
    );
  }

  const page = Math.ceil(start / PAGE_SIZE);

  try {
    const response = await fetch(SERPER_BASE, {
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${q} site:jw.org`,
        gl: 'us',
        hl: 'en',
        safe: true,
        page,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const status = response.status;
      let message = data.message || 'Search error. Please try again.';
      if (status === 429) message = 'Too many requests. Please try again shortly.';
      if (status === 401) message = 'Invalid Serper API key.';
      return new Response(JSON.stringify({ error: message }), { status, headers });
    }

    const items = (data.images || []).map(item => ({
      title: item.title,
      imageUrl: item.imageUrl,
      thumbnailUrl: item.thumbnailUrl,
      width: item.width,
      height: item.height,
      sourceUrl: item.link,
      displayDomain: new URL(item.link).hostname.replace('www.', ''),
    }));

    return new Response(
      JSON.stringify({
        items,
        totalResults: data.totalImages ?? '0',
        nextStart: items.length === PAGE_SIZE ? start + PAGE_SIZE : null,
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Network error reaching Serper search service.' }),
      { status: 502, headers }
    );
  }
}
