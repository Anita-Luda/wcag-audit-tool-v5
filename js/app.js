/* =========================================================
   app.js – CORE ORCHESTRATOR (V3 CONSOLIDATED)
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
    }
  },
  context: {
    auditId: 'default',
    mode: 'edit',
    version: 'draft',
    unlockedRows: new Set()
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
  }
});

async function bootstrapApp() {
  const app = window.WCAG_AUDIT_APP;

  // 1. Load definitions
  app.definitions = await window.loadWCAGDefinitions?.();

  // 2. Initialize Project Selectors (Lifecycle)
  if (window.lifecycle) {
    await window.lifecycle.init();
  }

  // 3. Initial Render
  window.refreshUI?.();

  // 4. Bind global interactions
  bindGlobalUI();
  syncMetadataUI();
  initTheme();
}

function initTheme() {
  const saved = localStorage.getItem('kawaii-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButton(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('kawaii-theme', next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
}

/* =========================================================
   GLOBAL REFRESH PIPELINE
   ========================================================= */

window.refreshUI = function () {
  const app = window.WCAG_AUDIT_APP;
  if (!app.definitions || !app.state) return;

  window.renderAuditTables(app.definitions, app.state, app.context);
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
  if (!state.criteria[id]) state.criteria[id] = {};
  state.criteria[id][key] = value;
  state.meta.auditLastModifiedAt = new Date().toISOString();
  window.updateProgressBar?.();
};

/* =========================================================
   UI BINDINGS
   ========================================================= */

function syncMetadataUI() {
  const state = window.WCAG_AUDIT_APP.state;
  const appNameInput = document.getElementById('app-name');
  const startDateOutput = document.getElementById('audit-start-date');
  const lastModifiedOutput = document.getElementById('audit-last-modified');

  const nameValue = state.meta.appName || '';
  if (appNameInput && appNameInput.value !== nameValue) {
    appNameInput.value = nameValue;
  }

  if (startDateOutput) startDateOutput.textContent = state.meta.auditStartedAt ? new Date(state.meta.auditStartedAt).toLocaleDateString() : '—';
  if (lastModifiedOutput) lastModifiedOutput.textContent = state.meta.auditLastModifiedAt ? new Date(state.meta.auditLastModifiedAt).toLocaleDateString() : '—';
}

function bindGlobalUI() {
  const appNameInput = document.getElementById('app-name');
  appNameInput?.addEventListener('input', () => {
    window.updateMetaState('appName', appNameInput.value);
  });

  document.getElementById('theme-toggle-btn')?.addEventListener('click', () => toggleTheme());
  document.getElementById('export-html-btn')?.addEventListener('click', () => window.exportAuditHTML?.());
  document.getElementById('export-csv-btn')?.addEventListener('click', () => window.exportAuditCSV?.());
  document.getElementById('export-pdf-btn')?.addEventListener('click', () => window.exportAuditPDF?.());

  document.getElementById('clear-filters-btn-inline')?.addEventListener('click', () => {
    window.WCAG_AUDIT_APP.state.filters = { level: {}, status: {}, failure: {}, area: {}, priority: {} };
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

    const success = await window.saveState(app.context.auditId, app.state);

    if (success) {
      if (indicator) {
        indicator.textContent = '✨ Zapisano!';
        setTimeout(() => {
          indicator.classList.remove('visible');
          setTimeout(() => indicator.textContent = '✨ Zapisywanie...', 300);
        }, 1500);
      }
    } else {
      if (indicator) {
        indicator.textContent = '❌ Błąd zapisu';
        setTimeout(() => indicator.classList.remove('visible'), 3000);
      }
    }
  }, 1200);
};
