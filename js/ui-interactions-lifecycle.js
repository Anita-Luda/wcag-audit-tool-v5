/* =========================================================
   ui-interactions-lifecycle.js – APP LIFECYCLE CORE (V3)
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     BOOT
     ========================================================= */

  document.addEventListener(
    'DOMContentLoaded',
    bootstrapApplication
  );

  async function bootstrapApplication() {

    try {

      ensureGlobalApp();

      bindAuditSelector();
      bindVersionSelector();
      bindModeSelector();
      bindProductTypeSelector();
      bindCreateAuditButton();

      await initializeAuditSelector();

      syncAllUI();
    } catch (e) {

      console.error(
        '❌ bootstrapApplication failed:',
        e
      );
    }
  }

  /* =========================================================
     GLOBAL APP
     ========================================================= */

  function ensureGlobalApp() {

    if (!window.WCAG_AUDIT_APP) {

      window.WCAG_AUDIT_APP = {
        definitions: null,
        state: {
          criteria: {},
          meta: {}
        },
        context: {
          auditId: 'default',
          version: 'draft',
          mode: 'edit'
        },
        filters: {}
      };
    }

    if (!window.WCAG_AUDIT_APP.context) {
      window.WCAG_AUDIT_APP.context = {};
    }

    if (!window.WCAG_AUDIT_APP.state) {
      window.WCAG_AUDIT_APP.state = {
        criteria: {},
        meta: {}
      };
    }
  }

  /* =========================================================
     REFRESH
     ========================================================= */

  function refreshApplicationUI() {

    window.refreshUI?.();

    window.renderAuditTables?.(
      window.WCAG_AUDIT_APP.definitions,
      window.WCAG_AUDIT_APP.state,
      window.WCAG_AUDIT_APP.context
    );

    window.updateAuditSummary?.();

    window.applyGlobalFilters?.();

    syncAllUI();
  }

  /* =========================================================
     AUDIT SELECTOR
     ========================================================= */

  async function initializeAuditSelector() {

    const select =
      document.getElementById('audit-selector');

    if (!select) return;

    try {

      const res =
        await fetch('/api/audits');

      if (!res.ok) {
        throw new Error('Cannot load audits');
      }

      const audits =
        await res.json();

      /* =========================
         DEFAULT FALLBACK
         ========================= */

      if (!audits.length) {

        select.innerHTML = `
          <option value="default">
            default
          </option>
        `;

        await loadDraft('default');

        return;
      }

      /* =========================
         OPTIONS
         ========================= */

      select.innerHTML =
        audits.map(audit => `
          <option value="${escapeHTML(audit.id)}">
            ${escapeHTML(audit.name || audit.id)}
          </option>
        `).join('');

      const ctx =
        window.WCAG_AUDIT_APP.context;

      // Always open on default draft as requested
      const selectedAuditId = 'default';

      select.value =
        selectedAuditId;

      await loadDraft(selectedAuditId);

    } catch (e) {

      console.error(
        '❌ initializeAuditSelector:',
        e
      );
    }
  }

  function bindCreateAuditButton() {
    const btn = document.getElementById('create-audit-btn');
    const input = document.getElementById('app-name');

    if (!btn || !input) return;

    btn.addEventListener('click', async () => {
      const name = input.value.trim();
      if (!name) {
        alert('Podaj nazwę aplikacji, aby stworzyć nowy audyt.');
        return;
      }

      // Dialog flow for sophisticated creation
      showCreateAuditDialog(name);
    });
  }

  async function showCreateAuditDialog(name) {
    const auditsRes = await fetch('/api/audits');
    const audits = auditsRes.ok ? await auditsRes.json() : [];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>✨ Co chcesz zrobić z obecną pracą?</h3>

        <div class="modal-options">
          <label class="modal-option">
            <input type="radio" name="create-action" value="empty" checked>
            <span>🆕 Utwórz nowy, pusty audyt dla "${escapeHTML(name)}"</span>
          </label>

          <label class="modal-option">
            <input type="radio" name="create-action" value="save-new">
            <span>💾 Zapisz obecną pracę jako NOWY audyt "${escapeHTML(name)}"</span>
          </label>

          <label class="modal-option">
            <input type="radio" name="create-action" value="save-version">
            <span>📦 Zapisz jako nową wersję istniejącego audytu:</span>
          </label>

          <select id="modal-audit-target" class="modal-select">
            ${audits.map(a => `<option value="${a.id}">${escapeHTML(a.name || a.id)}</option>`).join('')}
          </select>
        </div>

        <div class="modal-actions">
          <button id="modal-cancel" class="btn-secondary">Anuluj</button>
          <button id="modal-confirm">Potwierdź ✨</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#modal-cancel').onclick = close;

    overlay.querySelector('#modal-confirm').onclick = async () => {
      const action = overlay.querySelector('input[name="create-action"]:checked').value;
      const targetAuditId = overlay.querySelector('#modal-audit-target').value;

      close();

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const newAuditId = `${slug}-${dateStr}`;

      if (action === 'empty') {
        await createAudit(newAuditId, name, null);
      } else if (action === 'save-new') {
        await createAudit(newAuditId, name, window.WCAG_AUDIT_APP.state);
      } else if (action === 'save-version') {
        await saveAsVersion(targetAuditId);
      }
    };
  }

  async function createAudit(id, name, state) {
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, state })
      });

      if (res.status === 409) {
        alert('Audyt o tym ID już istnieje.');
        return;
      }

      if (!res.ok) throw new Error('Failed to create audit');

      await initializeAuditSelector();
      const select = document.getElementById('audit-selector');
      if (select) {
        select.value = id;
        window.WCAG_AUDIT_APP.context.auditId = id;
        await loadDraft(id);
      }
    } catch (e) {
      alert('Błąd: ' + e.message);
    }
  }

  async function saveAsVersion(auditId) {
    try {
      // 1. Sync current state to draft of target audit first
      await fetch(`/api/audits/${auditId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(window.WCAG_AUDIT_APP.state)
      });

      // 2. Trigger version creation
      const res = await fetch(`/api/audits/${auditId}/versions`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create version');

      const data = await res.json();
      alert(`Dodano wersję ${data.version} do audytu ${auditId}`);

      await initializeAuditSelector();
      const select = document.getElementById('audit-selector');
      if (select) {
        select.value = auditId;
        window.WCAG_AUDIT_APP.context.auditId = auditId;
        await loadDraft(auditId);
      }
    } catch (e) {
      alert('Błąd wersji: ' + e.message);
    }
  }

  function bindAuditSelector() {

    const select =
      document.getElementById('audit-selector');

    if (!select) return;

    select.addEventListener(
      'change',
      async () => {

        const auditId =
          select.value;

        const ctx =
          window.WCAG_AUDIT_APP.context;

        ctx.auditId =
          auditId;

        ctx.version =
          'draft';

        ctx.mode =
          'edit';

        await loadDraft(auditId);
      }
    );
  }

  /* =========================================================
     VERSION SELECTOR
     ========================================================= */

  function bindVersionSelector() {

    const select =
      document.getElementById('version-selector');

    if (!select) return;

    select.addEventListener(
      'change',
      async () => {

        const ctx =
          window.WCAG_AUDIT_APP.context;

        const version =
          select.value;

        ctx.version =
          version;

        if (version === 'draft') {

          await loadDraft(ctx.auditId);

        } else {

          await loadVersion(
            ctx.auditId,
            version
          );
        }
      }
    );
  }

  window.refreshVersionSelector = async function (auditId) {

    const select =
      document.getElementById('version-selector');

    if (!select) return;

    try {

      const res =
        await fetch(
          `/api/audits/${auditId}/versions`
        );

      const versions =
        res.ok
          ? await res.json()
          : [];

      select.innerHTML = `
        <option value="draft">
          Draft
        </option>

        ${versions.map(version => `
          <option value="${escapeHTML(version)}">
            ${escapeHTML(version)}
          </option>
        `).join('')}
      `;

      select.value =
        window.WCAG_AUDIT_APP.context.version ||
        'draft';

    } catch (e) {

      console.error(
        '❌ refreshVersionSelector:',
        e
      );
    }
  }

  /* =========================================================
     LOAD DRAFT
     ========================================================= */

  async function loadDraft(auditId) {

    try {

      const res =
        await fetch(
          `/api/audits/${auditId}/draft`,
          {
            cache: 'no-store'
          }
        );

      if (!res.ok) {
        throw new Error('Draft load failed');
      }

      const state =
        await res.json();

      const app =
        window.WCAG_AUDIT_APP;

      app.state =
        normalizeState(state);

      app.context.auditId =
        auditId;

      app.context.version =
        'draft';

      app.context.mode =
        'edit';

      await refreshVersionSelector(auditId);

      syncAllUI();

      refreshApplicationUI();
    } catch (e) {

      console.error(
        '❌ loadDraft:',
        e
      );
    }
  }

  /* =========================================================
     LOAD VERSION
     ========================================================= */

  async function loadVersion(
    auditId,
    version
  ) {

    try {

      const res =
        await fetch(
          `/api/audits/${auditId}/versions/${version}`,
          {
            cache: 'no-store'
          }
        );

      if (!res.ok) {
        throw new Error('Version load failed');
      }

      const state =
        await res.json();

      const app =
        window.WCAG_AUDIT_APP;

      app.state =
        normalizeState(state);

      app.context.auditId =
        auditId;

      app.context.version =
        version;

      app.context.mode =
        'view';

      syncAllUI();

      refreshApplicationUI();
    } catch (e) {

      console.error(
        '❌ loadVersion:',
        e
      );
    }
  }

  /* =========================================================
     MODE
     ========================================================= */

  function bindModeSelector() {

    document
      .querySelectorAll(
        'input[name="audit-mode"]'
      )
      .forEach(radio => {

        radio.addEventListener(
          'change',
          () => {

            const mode =
              radio.value;

            window.WCAG_AUDIT_APP.context.mode =
              mode;

            refreshApplicationUI();
          }
        );
      });
  }

  function syncModeRadios() {

    const mode =
      window.WCAG_AUDIT_APP.context.mode;

    document
      .querySelectorAll(
        'input[name="audit-mode"]'
      )
      .forEach(radio => {

        radio.checked =
          radio.value === mode;
      });
  }

  /* =========================================================
     PRODUCT TYPE
     ========================================================= */

  function bindProductTypeSelector() {

    document
      .querySelectorAll(
        'input[name="product-type"]'
      )
      .forEach(radio => {

        radio.addEventListener(
          'change',
          () => {

            const value =
              radio.value;

            setProductType(value);

            refreshApplicationUI();
          }
        );
      });
  }

  function setProductType(type) {

    const state =
      window.WCAG_AUDIT_APP.state;

    if (!state.meta) {
      state.meta = {};
    }

    state.meta.productType =
      type;

    syncProductTypeUI();

    window.triggerAutosave?.();
  }

  function syncProductTypeUI() {

    const type =
      window.WCAG_AUDIT_APP.state?.meta?.productType ||
      'web';

    document
      .querySelectorAll(
        'input[name="product-type"]'
      )
      .forEach(radio => {

        radio.checked =
          radio.value === type;
      });
  }

  /* =========================================================
     UI SYNC
     ========================================================= */

  function syncAllUI() {

    syncModeRadios();

    syncProductTypeUI();
  }

  /* =========================================================
     STATE NORMALIZATION
     ========================================================= */

  function normalizeState(state) {

    if (!state || typeof state !== 'object') {
      state = {};
    }

    if (!state.criteria) {
      state.criteria = {};
    }

    if (!state.meta) {
      state.meta = {};
    }

    state.meta.productType =
      state.meta.productType || 'web';

    return state;
  }

  /* =========================================================
     ESCAPE
     ========================================================= */

  function escapeHTML(value) {

    if (value === null || value === undefined) {
      return '';
    }

    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();