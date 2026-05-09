/* =========================================================
   ui-modals.js – KAWAII CUSTOM DIALOGS
   ========================================================= */

(function () {
  'use strict';

  window.kawaii = {
    alert(message) {
      return new Promise((resolve) => {
        const overlay = createOverlay();
        const modal = document.createElement('div');
        modal.className = 'kawaii-modal';
        modal.innerHTML = `
          <div class="kawaii-modal-body">
            <p>${escapeHTML(message)}</p>
          </div>
          <div class="kawaii-modal-actions">
            <button class="btn-primary-kawaii">OK ✨</button>
          </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('button').onclick = () => {
          overlay.remove();
          resolve();
        };
      });
    },

    confirm(message, options = {}) {
      const cancelLabel = options.cancelLabel || 'Anuluj';
      const confirmLabel = options.confirmLabel || 'Tak ✨';

      return new Promise((resolve) => {
        const overlay = createOverlay();
        const modal = document.createElement('div');
        modal.className = 'kawaii-modal';
        modal.innerHTML = `
          <div class="kawaii-modal-body">
            <p>${escapeHTML(message)}</p>
          </div>
          <div class="kawaii-modal-actions">
            <button class="btn-secondary" id="kawaii-cancel">${escapeHTML(cancelLabel)}</button>
            <button class="btn-primary-kawaii" id="kawaii-confirm">${escapeHTML(confirmLabel)}</button>
          </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.querySelector('#kawaii-cancel').onclick = () => {
          overlay.remove();
          resolve(false);
        };
        overlay.querySelector('#kawaii-confirm').onclick = () => {
          overlay.remove();
          resolve(true);
        };
      });
    },

    prompt(message, defaultValue = '') {
      return new Promise((resolve) => {
        const overlay = createOverlay();
        const modal = document.createElement('div');
        modal.className = 'kawaii-modal';
        modal.innerHTML = `
          <div class="kawaii-modal-body">
            <p>${escapeHTML(message)}</p>
            <input type="text" id="kawaii-prompt-input" value="${escapeHTML(defaultValue)}" />
          </div>
          <div class="kawaii-modal-actions">
            <button class="btn-secondary" id="kawaii-cancel">Anuluj</button>
            <button class="btn-primary-kawaii" id="kawaii-confirm">Potwierdź ✨</button>
          </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const input = overlay.querySelector('#kawaii-prompt-input');
        input.focus();
        input.select();

        overlay.querySelector('#kawaii-cancel').onclick = () => {
          overlay.remove();
          resolve(null);
        };
        overlay.querySelector('#kawaii-confirm').onclick = () => {
          const val = input.value;
          overlay.remove();
          resolve(val);
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') overlay.querySelector('#kawaii-confirm').click();
            if (e.key === 'Escape') overlay.querySelector('#kawaii-cancel').click();
        };
      });
    }
  };

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    return overlay;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
