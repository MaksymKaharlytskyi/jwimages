/**
 * JW Images Search - Main Application Module
 * Orchestrates search, masonry, lightbox, and cookie functionality.
 */

import { validateQuery } from './search.js';
import { initializeSearch, reset, updateResultsInfo, showError, showEmptyState } from './masonry.js';
import { init as initLightbox } from './lightbox.js';
import { init as initCookies, getLastQuery, saveLastQuery, clearLastQuery } from './cookies.js';

let searchForm = null;
let searchInput = null;
let searchButton = null;
let errorEl = null;

/**
 * Setup DOM references
 */
function setupDOM() {
  searchForm = document.querySelector('.search-form');
  searchInput = document.querySelector('.search-input');
  searchButton = document.querySelector('.search-button');
  errorEl = document.querySelector('.search-error');
}

/**
 * Show search error
 * @param {string} message
 */
function showSearchError(message) {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.setAttribute('aria-hidden', 'false');
    searchInput.setAttribute('aria-describedby', 'search-error');
  }
}

/**
 * Clear search error
 */
function clearSearchError() {
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.setAttribute('aria-hidden', 'true');
    searchInput.removeAttribute('aria-describedby');
  }
}

/**
 * Handle search form submission
 * @param {Event} e
 */
async function handleSearch(e) {
  e.preventDefault();

  const query = searchInput.value;
  const validation = validateQuery(query);

  if (!validation.valid) {
    showSearchError(validation.error);
    searchInput.focus();
    return;
  }

  clearSearchError();
  saveLastQuery(query.trim());
  await initializeSearch(query.trim());
}

/**
 * Handle input changes
 */
function handleInput() {
  clearSearchError();
}

/**
 * Handle Escape key to clear search
 * @param {KeyboardEvent} e
 */
function handleKeydown(e) {
  if (e.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.value = '';
    clearSearchError();
  }
}

/**
 * Restore last query from localStorage
 */
function restoreLastQuery() {
  const lastQuery = getLastQuery();
  if (lastQuery && searchInput) {
    searchInput.value = lastQuery;
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  if (searchForm) {
    searchForm.addEventListener('submit', handleSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('input', handleInput);
    searchInput.addEventListener('keydown', handleKeydown);
  }
}

/**
 * Register service worker
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

/**
 * Initialize application
 */
async function init() {
  setupDOM();
  setupEventListeners();
  initLightbox();
  initCookies();
  initWithdrawConsent();
  restoreLastQuery();
  await registerServiceWorker();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
