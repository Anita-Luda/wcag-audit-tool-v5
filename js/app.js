/* =========================================================
   app.js – CORE ORCHESTRATOR (V2 STABLE)
   ========================================================= */

window.WCAG_AUDIT_APP = {
  definitions: null,

  state: {
    meta: {
      appName: '',
      productType: 'web',
      auditStartedAt: new Date().toISOString(),
      auditLastModifiedAt: new Date().toISOString()
    },

    criteria: {},

    filters: {
      level: {},
      status: {},
      area: {},
      priority: {}
    },

    context: {
      auditId: 'default',
      mode: 'edit',
      version: 'draft'
    }
  }
};

/* =========================================================
   INIT BOOTSTRAP
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await bootstrapApp();
  } catch (e) {
    console.error('❌ Fatal init error:', e);
    alert('Aplikacja nie mogła się uruchomić');
  }
});

/* =========================================================
   BOOTSTRAP PIPELINE
   ========================================================= */

async function bootstrapApp() {
  const app = window.WCAG_AUDIT_APP;

  // 1. Load definitions
  app.definitions = await window.loadWCAGDefinitions?.();

  // 2. Load state
  const loaded = await window.loadAuditState?.(app.state.context.auditId);

  if (loaded?.state) {
    app.state = mergeState(app.state, loaded.state);
  }

  if (loaded?.context) {
    app.state.context = {
      ...app.state.context,
      ...loaded.context
    };
  }

  // 3. Normalize safety defaults
  normalizeState(app.state);

  // 4. Render initial UI
  window.refreshUI?.();

  // 5. Bind global interactions
  bindGlobalUI();

  // 6. Sync Metadata
  syncMetadataUI();
}

/* =========================================================
   STATE MERGE (SAFE)
   ========================================================= */

function mergeState(base, incoming) {
  return {
    meta: { ...base.meta, ...(incoming.meta || {}) },
    criteria: { ...base.criteria, ...(incoming.criteria || {}) },
    filters: { ...base.filters, ...(incoming.filters || {}) },
    context: { ...base.context, ...(incoming.context || {}) }
  };
}

/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeState(state) {
  state.meta = state.meta || {};
  state.criteria = state.criteria || {};
  state.filters = state.filters || {};
  state.context = state.context || {};

  if (!state.context.mode) state.context.mode = 'edit';
  if (!state.context.version) state.context.version = 'draft';
  if (!state.context.auditId) state.context.auditId = 'default';
}

/* =========================================================
   GLOBAL REFRESH PIPELINE
   ========================================================= */

window.refreshUI = function () {
  const app = window.WCAG_AUDIT_APP;

  if (!app.definitions || !app.state) return;

  window.renderAuditTables(app.definitions, app.state, app.state.context);
  window.applyGlobalFilters?.();
  window.updateAuditSummary?.();
  window.updateProgressBar?.();
};

window.updateProgressBar = function () {
  const app = window.WCAG_AUDIT_APP;
  if (!app.definitions?.criteria) return;

  const total = app.definitions.criteria.length;
  const tested = Object.values(app.state.criteria || {}).filter(c => c.status && c.status !== 'not-tested').length;
  const percent = total > 0 ? Math.round((tested / total) * 100) : 0;

  const bar = document.getElementById('progress-bar-fill');
  const text = document.getElementById('progress-percent');

  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}%`;
};

/* =========================================================
   STATE MUTATION API
   ========================================================= */

window.updateMetaState = function (key, value) {
  const state = window.WCAG_AUDIT_APP.state;
  state.meta[key] = value;
  state.meta.auditLastModifiedAt = new Date().toISOString();
  syncMetadataUI();
  window.triggerAutosave?.();
};

window.updateRowState = function (id, key, value) {
  const state = window.WCAG_AUDIT_APP.state;

  if (!state.criteria[id]) {
    state.criteria[id] = {};
  }

  state.criteria[id][key] = value;

  state.meta.auditLastModifiedAt = new Date().toISOString();

  window.triggerAutosave?.();
  // Don't call refreshUI here if it's just a row update to avoid losing focus or closing popups
  // But we need to update some things.
  window.updateProgressBar?.();
};

/* =========================================================
   PRODUCT TYPE HANDLER
   ========================================================= */

window.setProductType = function (type) {
  window.WCAG_AUDIT_APP.state.meta.productType = type;
  window.refreshUI?.();
};

/* =========================================================
   GLOBAL UI BINDINGS
   ========================================================= */

function syncMetadataUI() {
  const state = window.WCAG_AUDIT_APP.state;
  const appNameInput = document.getElementById('app-name');
  const startDateOutput = document.getElementById('audit-start-date');
  const lastModifiedOutput = document.getElementById('audit-last-modified');

  if (appNameInput) appNameInput.value = state.meta.appName || '';
  if (startDateOutput) startDateOutput.textContent = state.meta.auditStartedAt ? new Date(state.meta.auditStartedAt).toLocaleString() : '—';
  if (lastModifiedOutput) lastModifiedOutput.textContent = state.meta.auditLastModifiedAt ? new Date(state.meta.auditLastModifiedAt).toLocaleString() : '—';
}

function bindGlobalUI() {
  const saveBtn = document.getElementById('save-version-btn');
  const appNameInput = document.getElementById('app-name');

  appNameInput?.addEventListener('input', () => {
    window.updateMetaState('appName', appNameInput.value);
  });

  saveBtn?.addEventListener('click', async () => {
    const app = window.WCAG_AUDIT_APP;
    const auditId = app.context.auditId;

    if (!confirm(`Utworzyć wersję dla projektu "${auditId}"?`)) return;

    // 1. Sync draft first
    await window.saveState?.(auditId, app.state);

    // 2. POST version
    const res = await fetch(
      `/api/audits/${auditId}/versions`,
      { method: 'POST' }
    );

    if (!res.ok) {
      alert('Błąd zapisu wersji');
      return;
    }

    const data = await res.json();
    alert(`Utworzono wersję: ${data.version}`);

    if (window.refreshVersionSelector) {
       await window.refreshVersionSelector(auditId);
    }
  });

  document.getElementById('export-html-btn')
    ?.addEventListener('click', () => window.exportAuditHTML?.());

  document.getElementById('export-csv-btn')
    ?.addEventListener('click', () => window.exportAuditCSV?.());

  document.getElementById('export-pdf-btn')
    ?.addEventListener('click', () => window.exportAuditPDF?.());

  document.getElementById('clear-filters-btn')
    ?.addEventListener('click', () => {
      window.WCAG_AUDIT_APP.state.filters = {
        level: {},
        status: {},
        failure: {},
        area: {},
        priority: {}
      };
      window.applyGlobalFilters?.();
    });
}

/* =========================================================
   AUTOSAVE (DEBOUNCED)
   ========================================================= */

let saveTimeout = null;

window.triggerAutosave = function () {
  const app = window.WCAG_AUDIT_APP;

  clearTimeout(saveTimeout);

  const indicator = document.getElementById('saving-indicator');

  saveTimeout = setTimeout(async () => {
    if (!window.saveState) return;

    if (indicator) indicator.classList.add('visible');

    const success = await window.saveState(
      app.state.context.auditId,
      app.state
    );

    if (success) {
      if (indicator) {
        indicator.textContent = '✨ Zapisano!';
        setTimeout(() => {
          indicator.classList.remove('visible');
          setTimeout(() => {
            indicator.textContent = '✨ Zapisywanie...';
          }, 300);
        }, 1500);
      }
    } else {
      console.warn('⚠️ Autosave failed');
      if (indicator) {
        indicator.textContent = '❌ Błąd zapisu';
        setTimeout(() => indicator.classList.remove('visible'), 3000);
      }
    }
  }, 1200);
};