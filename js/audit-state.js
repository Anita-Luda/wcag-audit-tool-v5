/* =========================================================/* ========================================================= */

(function () {
  'use strict';

  /* =====================================================
     PUBLIC API
     ===================================================== */

  window.saveCriterionState = function (criterionId, data) {
    const app = window.WCAG_AUDIT_APP;
    const now = new Date().toISOString();

    ensureStateShape(app);

    if (!app.state.criteria[criterionId]) {
      app.state.criteria[criterionId] = {};
    }

    app.state.criteria[criterionId] = {
      ...app.state.criteria[criterionId],
      ...data,
      rowLastModifiedAt: now
    };

    touchMeta(app, now);
    saveState();
  };

  window.saveAuditMeta = function (metaPatch) {
    const app = window.WCAG_AUDIT_APP;
    const now = new Date().toISOString();

    ensureStateShape(app);

    app.state.meta = {
      ...app.state.meta,
      ...metaPatch
    };

    touchMeta(app, now);
    saveState();
  };

  window.setProductType = function (productType) {
    if (productType !== 'web' && productType !== 'app') return;
    window.saveAuditMeta({ productType });
  };

  window.setAuditMode = function (mode) {
    if (mode !== 'edit' && mode !== 'view') return;
    window.saveAuditMeta({ mode });
  };

  /* =====================================================
     INTERNAL HELPERS
     ===================================================== */

  function ensureStateShape(app) {
    if (!app.state) {
      app.state = {};
    }

    if (!app.state.meta) {
      app.state.meta = createDefaultMeta();
    }

    if (!app.state.criteria) {
      app.state.criteria = {};
    }
  }

  function createDefaultMeta() {
    const now = new Date().toISOString();

    return {
      auditedApplication: '',
      standard: 'WCAG 2.2 + EN 301 549',
      productType: 'web',
      mode: 'edit',
      auditStartedAt: now,
      auditLastModifiedAt: now
    };
  }

  function touchMeta(app, now) {
    if (!app.state.meta.auditStartedAt) {
      app.state.meta.auditStartedAt = now;
    }
    app.state.meta.auditLastModifiedAt = now;

    updateMetaUI(app.state.meta);

    if (typeof window.updateAuditSummary === 'function') {
      window.updateAuditSummary();
    }
  }

  function saveState() {
    fetch('/api/audit-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(window.WCAG_AUDIT_APP.state)
    }).catch(err => {
      console.error('❌ Błąd zapisu stanu audytu:', err);
    });
  }

  /* =====================================================
     META UI UPDATE (read-only)
     ===================================================== */

  function updateMetaUI(meta) {
    setText('audit-start-date', meta.auditStartedAt);
    setText('audit-last-modified', meta.auditLastModifiedAt);

    const appNameInput = document.getElementById('app-name');
    if (appNameInput && document.activeElement !== appNameInput) {
      appNameInput.value = meta.auditedApplication || '';
    }

    // synchronizacja web/app radio
    document
      .querySelectorAll('input[name="product-type"]')
      .forEach(radio => {
        radio.checked = radio.value === meta.productType;
      });
  }

  function setText(id, iso) {
    const el = document.getElementById(id);
    if (!el || !iso) return;
    el.textContent = new Date(iso).toLocaleString('pl-PL');
  }

})();