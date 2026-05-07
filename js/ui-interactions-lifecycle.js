/* =========================================================
   ui-interactions-lifecycle.js
   Cykl życia UI: audyty, wersje, tryby, refresh
   ========================================================= */

(function () {
  'use strict';

  /* =====================================================
     INIT
     ===================================================== */

  document.addEventListener('DOMContentLoaded', initLifecycle);

  function initLifecycle() {
    bindAuditSelector();
    bindVersionSelector();
    bindModeSelector();
    bindProductTypeSelector();
  }

  /* =====================================================
     PUBLIC REFRESH (JEDYNY PUNKT ODSWIEŻANIA UI)
     ===================================================== */

  window.refreshUI = function () {
    const app = window.WCAG_AUDIT_APP;
    if (!app || !app.definitions || !app.state) return;

    // render tabel
    if (typeof window.renderAuditTables === 'function') {
      window.renderAuditTables(
        app.definitions,
        app.state,
        app.context
      );
    }

    // filtry (po KAŻDYM renderze)
    if (typeof window.applyGlobalFilters === 'function') {
      window.applyGlobalFilters();
    }

    // podsumowanie
    if (typeof window.updateAuditSummary === 'function') {
      window.updateAuditSummary();
    }
  };

  /* =====================================================
     AUDYTY
     ===================================================== */

  function bindAuditSelector() {
    const select = document.getElementById('audit-selector');
    if (!select) return;

    fetch('/api/audits')
      .then(r => r.json())
      .then(audits => {
        if (!audits || !audits.length) return;

        select.innerHTML = audits
          .map(a => `<option value="${a.id}">${a.name || a.id}</option>`)
          .join('');

        const ctx = window.WCAG_AUDIT_APP.context;
        ctx.selectedAuditId ||= audits[0].id;
        ctx.selectedVersion ||= 'draft';

        select.value = ctx.selectedAuditId;
        loadDraft(ctx.selectedAuditId);
      });

    select.addEventListener('change', () => {
      const ctx = window.WCAG_AUDIT_APP.context;
      ctx.selectedAuditId = select.value;
      ctx.selectedVersion = 'draft';
      loadDraft(select.value);
    });
  }

  /* =====================================================
     WERSJE
     ===================================================== */

  function bindVersionSelector() {
    const select = document.getElementById('version-selector');
    if (!select) return;

    select.addEventListener('change', () => {
      const ctx = window.WCAG_AUDIT_APP.context;
      ctx.selectedVersion = select.value;

      if (select.value === 'draft') {
        loadDraft(ctx.selectedAuditId);
      } else {
        loadVersion(ctx.selectedAuditId, select.value);
      }
    });
  }

  function refreshVersionSelector(auditId) {
    fetch(`/api/audits/${auditId}/versions`)
      .then(r => r.json())
      .then(versions => {
        const select = document.getElementById('version-selector');
        if (!select) return;

        select.innerHTML =
          `<option value="draft">Draft</option>` +
          versions.map(v => `<option value="${v}">${v}</option>`).join('');

        select.value =
          window.WCAG_AUDIT_APP.context.selectedVersion || 'draft';
      });
  }

  function loadDraft(auditId) {
    fetch(`/api/audits/${auditId}/draft`)
      .then(r => r.json())
      .then(state => {
        const app = window.WCAG_AUDIT_APP;

        app.state = state;
        app.context.mode = 'edit';
        app.context.selectedVersion = 'draft';

        refreshVersionSelector(auditId);
        syncModeRadios();
        window.refreshUI();
      });
  }

  function loadVersion(auditId, version) {
    fetch(`/api/audits/${auditId}/versions/${version}`)
      .then(r => r.json())
      .then(state => {
        const app = window.WCAG_AUDIT_APP;

        app.state = state;
        app.context.mode = 'view';
        app.context.selectedVersion = version;

        syncModeRadios();
        window.refreshUI();
      });
  }

  /* =====================================================
     TRYB VIEW / EDIT
     ===================================================== */

  function bindModeSelector() {
    document
      .querySelectorAll('input[name="audit-mode"]')
      .forEach(radio => {
        radio.addEventListener('change', () => {
          window.WCAG_AUDIT_APP.context.mode = radio.value;
          window.refreshUI();
        });
      });
  }

  function syncModeRadios() {
    document
      .querySelectorAll('input[name="audit-mode"]')
      .forEach(radio => {
        radio.checked =
          radio.value === window.WCAG_AUDIT_APP.context.mode;
      });
  }

  /* =====================================================
     WEB / APP
     ===================================================== */

  function bindProductTypeSelector() {
    document
      .querySelectorAll('input[name="product-type"]')
      .forEach(radio => {
        radio.addEventListener('change', () => {
          window.setProductType(radio.value);
          window.refreshUI();
        });
      });
  }

})();