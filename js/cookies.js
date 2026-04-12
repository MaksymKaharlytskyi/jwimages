/**
 * JW Images Search - Cookie Consent Module
 * GDPR-compliant cookie consent banner with localStorage persistence.
 */

const CONSENT_KEY = 'cookie_consent';
const LAST_QUERY_KEY = 'last_query';

/**
 * Check if user has given consent
 * @returns {boolean}
 */
function hasConsent() {
  return localStorage.getItem(CONSENT_KEY) === 'accepted';
}

/**
 * Set consent status
 */
function setConsent() {
  localStorage.setItem(CONSENT_KEY, 'accepted');
}

/**
 * Withdraw consent
 */
function withdrawConsent() {
  localStorage.removeItem(CONSENT_KEY);
}

/**
 * Save last search query
 * @param {string} query
 */
function saveLastQuery(query) {
  localStorage.setItem(LAST_QUERY_KEY, query);
}

/**
 * Get last search query
 * @returns {string|null}
 */
function getLastQuery() {
  return localStorage.getItem(LAST_QUERY_KEY);
}

/**
 * Clear last search query
 */
function clearLastQuery() {
  localStorage.removeItem(LAST_QUERY_KEY);
}

/**
 * Create cookie consent banner
 */
function createBanner() {
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');

  banner.innerHTML = `
    <p class="cookie-banner-text">
      We use only essential cookies to remember your preferences.
      No tracking or advertising cookies are used.
      <a href="/cookie-policy.html">Learn more</a>
    </p>
    <button class="btn btn-ghost" id="cookie-reject">Reject non-essential</button>
    <button class="btn btn-primary" id="cookie-accept">Accept all</button>
  `;

  return banner;
}

/**
 * Hide cookie banner
 * @param {HTMLElement} banner
 */
function hideBanner(banner) {
  banner.style.display = 'none';
}

/**
 * Setup cookie banner event listeners
 * @param {HTMLElement} banner
 */
function setupBannerListeners(banner) {
  const acceptBtn = banner.querySelector('#cookie-accept');
  const rejectBtn = banner.querySelector('#cookie-reject');

  acceptBtn.addEventListener('click', () => {
    setConsent();
    hideBanner(banner);
  });

  rejectBtn.addEventListener('click', () => {
    setConsent();
    hideBanner(banner);
  });
}

/**
 * Initialize cookie consent
 */
function init() {
  if (hasConsent()) {
    return;
  }

  const banner = createBanner();
  document.body.appendChild(banner);
  setupBannerListeners(banner);
}

/**
 * Initialize withdraw consent button on policy pages
 */
function initWithdrawConsent() {
  const withdrawBtn = document.querySelector('[data-action="withdraw-consent"]');
  if (!withdrawBtn) return;

  withdrawBtn.addEventListener('click', () => {
    withdrawConsent();
    window.location.reload();
  });
}

export {
  init,
  initWithdrawConsent,
  hasConsent,
  setConsent,
  withdrawConsent,
  saveLastQuery,
  getLastQuery,
  clearLastQuery
};
