/* =========================================================
   state-store.js – SINGLE SOURCE OF TRUTH (V2 FIX CORE)
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     INIT STATE SAFE GUARD
     ========================================================= */

  function getApp() {
    if (!window.WCAG_AUDIT_APP) {
      window.WCAG_AUDIT_APP = {
        state: { criteria: {}, meta: {} },
        filters: {}
      };
    }
    return window.WCAG_AUDIT_APP;
  }

  function getState() {
    return getApp().state;
  }

  /* =========================================================
     NORMALIZER (CRITICAL FIX FOR ARRAYS VS STRINGS)
     ========================================================= */

  function normalizeValue(key, value) {
    if (key === 'areas' || key === 'priorities') {
      if (Array.isArray(value)) return value;
      if (!value) return [];
      return [value];
    }

    return value;
  }

  /* =========================================================
     MAIN UPDATE API (USED BY ALL UI)
     ========================================================= */

  window.updateRowState = function (id, key, value) {
    const app = getApp();
    const state = getState();

    if (!state.criteria[id]) {
      state.criteria[id] = {};
    }

    const normalizedValue = normalizeValue(key, value);

    state.criteria[id][key] = normalizedValue;

    /* keep dataset-compatible mirror (important for filters) */
    syncDerivedFields(id);

    window.triggerAutosave?.();
    window.applyGlobalFilters?.();
    window.updateAuditSummary?.();
  };

  /* =========================================================
     DERIVED DATA SYNC (FIX FILTER BUGS)
     ========================================================= */

  function syncDerivedFields(id) {
    const state = getState();
    const row = state.criteria[id];

    if (!row) return;

    // dataset compatibility
    row._areaFlat = Array.isArray(row.areas)
      ? row.areas[0] || ''
      : row.areas || '';

    row._priorityFlat = Array.isArray(row.priorities)
      ? row.priorities[0] || ''
      : row.priorities || '';
  }

  /* =========================================================
     FILTER SAFE ACCESS LAYER
     ========================================================= */

  window.getFilterDatasetValue = function (tr, key) {
    const state = getState();
    const id = tr?.dataset?.criterionId;

    if (!id || !state.criteria[id]) return '';

    const row = state.criteria[id];

    if (key === 'area') return row._areaFlat || '';
    if (key === 'priority') return row._priorityFlat || '';

    return row[key] || '';
  };

  /* =========================================================
     SAFE STATE GETTERS
     ========================================================= */

  window.getRowState = function (id) {
    return getState().criteria[id] || {};
  };

  window.getAuditState = function () {
    return getState();
  };

  /* =========================================================
     BULK UPDATE (EXPORT / IMPORT READY)
     ========================================================= */

  window.setAuditState = function (newState) {
    const app = getApp();
    app.state = newState;

    Object.keys(newState.criteria || {}).forEach(syncDerivedFields);

    window.refreshUI?.();
  };

})();