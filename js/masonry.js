/**
 * JW Images Search - Masonry Layout & Infinite Scroll Module
 * Uses CSS column-based masonry with IntersectionObserver for infinite scroll.
 */

import { CONFIG, fetchImages } from './search.js';

let currentQuery = '';
let currentPage = 1;
let isLoading = false;
let hasMoreResults = true;
let observer = null;

/**
 * Create a result card element
 * @param {Object} item - Image item from API
 * @returns {HTMLElement}
 */
function createCard(item) {
  const article = document.createElement('article');
  article.className = 'result-card';
  article.setAttribute('aria-label', item.title);

  const button = document.createElement('button');
  button.className = 'card-trigger';
  button.setAttribute('aria-label', `View image: ${item.title}`);
  button.setAttribute('data-image-url', item.imageUrl);
  button.setAttribute('data-source-url', item.sourceUrl);
  button.setAttribute('data-title', item.title);

  const img = document.createElement('img');
  img.src = item.thumbnailUrl || item.imageUrl;
  img.alt = item.title;
  img.loading = 'lazy';
  img.decoding = 'async';
  if (item.width && item.height) {
    img.width = item.width;
    img.height = item.height;
  }
  img.onerror = function() {
    const card = this.closest('.result-card');
    if (card && card.parentNode) {
      card.parentNode.removeChild(card);
    }
  };

  const overlay = document.createElement('div');
  overlay.className = 'card-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const domain = document.createElement('span');
  domain.className = 'card-domain';
  domain.textContent = item.displayDomain;

  overlay.appendChild(domain);
  button.appendChild(img);
  button.appendChild(overlay);
  article.appendChild(button);

  return article;
}

/**
 * Render items to the results grid
 * @param {Array} items - Array of image items
 */
function renderItems(items) {
  const grid = document.querySelector('.results-grid');
  if (!grid) return;

  items.forEach(item => {
    const card = createCard(item);
    grid.appendChild(card);
  });
}

/**
 * Show loading spinner
 */
function showLoading() {
  const spinner = document.querySelector('.spinner-container');
  if (spinner) {
    spinner.style.display = 'flex';
  }
}

/**
 * Hide loading spinner
 */
function hideLoading() {
  const spinner = document.querySelector('.spinner-container');
  if (spinner) {
    spinner.style.display = 'none';
  }
}

/**
 * Update results info text
 * @param {string} totalResults - Total results count
 */
function updateResultsInfo(totalResults) {
  const info = document.querySelector('.results-info');
  if (info) {
    const count = parseInt(totalResults, 10) || 0;
    info.textContent = `${count.toLocaleString()} results found`;
    info.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const grid = document.querySelector('.results-grid');
  if (!grid) return;

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-state';
  errorDiv.setAttribute('role', 'alert');
  errorDiv.textContent = message;

  grid.innerHTML = '';
  grid.parentNode.insertBefore(errorDiv, grid.nextSibling);
}

/**
 * Show empty state
 */
function showEmptyState() {
  const grid = document.querySelector('.results-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="empty-state">
      <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <p>No images found. Try a different search term.</p>
    </div>
  `;
}

/**
 * Load more results for infinite scroll
 */
async function loadMore() {
  if (isLoading || !hasMoreResults) return;

  isLoading = true;
  showLoading();

  try {
    const data = await fetchImages(currentQuery, currentPage);

    if (data.items.length === 0) {
      hasMoreResults = false;
      hideLoading();
      return;
    }

    renderItems(data.items);

    if (data.nextStart && currentPage < CONFIG.MAX_PAGES) {
      currentPage = data.nextStart;
    } else {
      hasMoreResults = false;
    }

    // Announce new results to screen readers
    const resultsSection = document.querySelector('[aria-live="polite"]');
    if (resultsSection) {
      resultsSection.setAttribute('aria-busy', 'false');
    }
  } catch (error) {
    showError(error.message);
    hasMoreResults = false;
  } finally {
    isLoading = false;
    hideLoading();
  }
}

/**
 * Setup infinite scroll observer
 */
function setupInfiniteScroll() {
  const sentinel = document.querySelector('.scroll-sentinel');
  if (!sentinel) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMore();
        }
      });
    },
    {
      root: null,
      rootMargin: '200px',
      threshold: 0
    }
  );

  observer.observe(sentinel);
}

/**
 * Destroy infinite scroll observer
 */
function destroyInfiniteScroll() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

/**
 * Initialize search with query
 * @param {string} query - Search query
 */
async function initializeSearch(query) {
  currentQuery = query;
  currentPage = 1;
  hasMoreResults = true;
  isLoading = false;

  const grid = document.querySelector('.results-grid');
  if (grid) {
    grid.innerHTML = '';
  }

  const resultsSection = document.querySelector('[aria-live="polite"]');
  if (resultsSection) {
    resultsSection.setAttribute('aria-busy', 'true');
  }

  const info = document.querySelector('.results-info');
  if (info) {
    info.setAttribute('aria-hidden', 'true');
  }

  await loadMore();
  setupInfiniteScroll();
}

/**
 * Reset masonry state
 */
function reset() {
  destroyInfiniteScroll();
  currentQuery = '';
  currentPage = 1;
  isLoading = false;
  hasMoreResults = true;

  const grid = document.querySelector('.results-grid');
  if (grid) {
    grid.innerHTML = '';
  }

  const info = document.querySelector('.results-info');
  if (info) {
    info.setAttribute('aria-hidden', 'true');
  }
}

export {
  initializeSearch,
  reset,
  renderItems,
  updateResultsInfo,
  showError,
  showEmptyState,
  setupInfiniteScroll,
  destroyInfiniteScroll
};
