/**
 * JW Images Search - Client-side Search Module
 * Calls /api/search (the local serverless proxy), never Google directly.
 */

const CONFIG = {
  PAGE_SIZE: 10,
  MAX_PAGES: 10,  // CSE hard limit: 100 results (10 x 10)
};

/**
 * Fetch images from the search API
 * @param {string} query - Search query
 * @param {number} startIndex - Starting index for pagination
 * @returns {Promise<{items: Array, totalResults: string, nextStart: number|null}>}
 */
async function fetchImages(query, startIndex = 1) {
  const params = new URLSearchParams({ q: query, start: String(startIndex) });
  const res = await fetch(`/api/search?${params}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Search failed.');
  }

  return data;
}

/**
 * Validate search query
 * @param {string} query - User input
 * @returns {{valid: boolean, error: string|null}}
 */
function validateQuery(query) {
  const trimmed = (query || '').trim();

  if (trimmed.length < 2) {
    return {
      valid: false,
      error: 'Please enter at least 2 characters.'
    };
  }

  return {
    valid: true,
    error: null
  };
}

export { CONFIG, fetchImages, validateQuery };
