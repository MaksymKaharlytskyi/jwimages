/**
 * JW Images Search - Lightbox Module
 * Image preview overlay with focus trap and keyboard navigation.
 */

let lightbox = null;
let backdrop = null;
let img = null;
let titleEl = null;
let sourceLink = null;
let closeBtn = null;
let lastFocusedElement = null;

/**
 * Create lightbox DOM structure
 */
function createLightbox() {
  const lightboxHTML = `
    <div id="lightbox" role="dialog" aria-modal="true" aria-label="Image preview" aria-hidden="true" tabindex="-1">
      <div class="lightbox-backdrop" id="lightbox-backdrop"></div>
      <div class="lightbox-panel">
        <button class="lightbox-close" id="lightbox-close" aria-label="Close image preview">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="lightbox-img-wrap">
          <img id="lightbox-img" src="" alt="" decoding="async">
        </div>
        <div class="lightbox-footer">
          <p class="lightbox-title" id="lightbox-title"></p>
          <a id="lightbox-source" href="" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            View on JW.org
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', lightboxHTML);

  lightbox = document.getElementById('lightbox');
  backdrop = document.getElementById('lightbox-backdrop');
  img = document.getElementById('lightbox-img');
  titleEl = document.getElementById('lightbox-title');
  sourceLink = document.getElementById('lightbox-source');
  closeBtn = document.getElementById('lightbox-close');
}

/**
 * Open lightbox with image data
 * @param {Object} data - Image data { imageUrl, sourceUrl, title }
 */
function open(data) {
  if (!lightbox) return;

  lastFocusedElement = document.activeElement;

  img.src = data.imageUrl;
  img.alt = data.title;
  titleEl.textContent = data.title;
  sourceLink.href = data.sourceUrl;

  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  closeBtn.focus();

  setupEventListeners();
}

/**
 * Close lightbox
 */
function close() {
  if (!lightbox) return;

  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  img.src = '';
  img.alt = '';
  titleEl.textContent = '';
  sourceLink.href = '';

  removeEventListeners();

  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  // Close on Escape
  document.addEventListener('keydown', handleKeydown);

  // Focus trap
  lightbox.addEventListener('keydown', trapFocus);
}

/**
 * Remove event listeners
 */
function removeEventListeners() {
  if (closeBtn) {
    closeBtn.removeEventListener('click', close);
  }
  if (backdrop) {
    backdrop.removeEventListener('click', close);
  }
  document.removeEventListener('keydown', handleKeydown);
  if (lightbox) {
    lightbox.removeEventListener('keydown', trapFocus);
  }
}

/**
 * Handle keydown events
 * @param {KeyboardEvent} e
 */
function handleKeydown(e) {
  if (e.key === 'Escape') {
    close();
  }
}

/**
 * Trap focus within lightbox
 * @param {KeyboardEvent} e
 */
function trapFocus(e) {
  if (e.key !== 'Tab') return;

  const focusableElements = lightbox.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
  } else {
    if (document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Initialize lightbox on DOMContentLoaded
 */
function init() {
  createLightbox();

  // Delegate click events for card triggers
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card-trigger');
    if (card) {
      e.preventDefault();
      const data = {
        imageUrl: card.getAttribute('data-image-url'),
        sourceUrl: card.getAttribute('data-source-url'),
        title: card.getAttribute('data-title')
      };
      open(data);
    }
  });
}

export { init, open, close };
