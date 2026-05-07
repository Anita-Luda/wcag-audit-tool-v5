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
  console.log('🚀 Audit App starting...');

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
};

/* =========================================================
   STATE MUTATION API
   ========================================================= */

window.updateRowState = function (id, key, value) {
  const state = window.WCAG_AUDIT_APP.state;

  if (!state.criteria[id]) {
    state.criteria[id] = {};
  }

  state.criteria[id][key] = value;

  state.meta.auditLastModifiedAt = new Date().toISOString();

  window.triggerAutosave?.();
  window.refreshUI?.();
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

function bindGlobalUI() {
  const saveBtn = document.getElementById('save-version-btn');

  saveBtn?.addEventListener('click', async () => {
    const app = window.WCAG_AUDIT_APP;

    if (!confirm('Utworzyć wersję audytu?')) return;

    const res = await fetch(
      `/api/audits/${app.state.context.auditId}/versions`,
      { method: 'POST' }
    );

    if (!res.ok) {
      alert('Błąd zapisu wersji');
      return;
    }

    const data = await res.json();
    alert(`Utworzono wersję: ${data.version}`);
  });

  document.getElementById('export-html-btn')
    ?.addEventListener('click', () => window.exportAuditHTML?.());

  document.getElementById('export-csv-btn')
    ?.addEventListener('click', () => window.exportAuditCSV?.());

  document.getElementById('export-pdf-btn')
    ?.addEventListener('click', () => window.exportAuditPDF?.());
}

/* =========================================================
   AUTOSAVE (DEBOUNCED)
   ========================================================= */

let saveTimeout = null;

window.triggerAutosave = function () {
  const app = window.WCAG_AUDIT_APP;

  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    if (!window.saveState) return;

    const success = await window.saveState(
      app.state.context.auditId,
      app.state
    );

    if (success) {
      console.log('💾 Autosaved');
    } else {
      console.warn('⚠️ Autosave failed');
    }
  }, 1200);
};