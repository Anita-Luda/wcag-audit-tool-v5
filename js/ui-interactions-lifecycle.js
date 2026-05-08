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

      const selectedAuditId =
        ctx.auditId ||
        audits[0].id;

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

  async function refreshVersionSelector(auditId) {

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