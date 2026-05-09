/* =========================================================
   ui-filters.js – CANONICAL FILTER ENGINE (V3)
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     INIT
     ========================================================= */

  document.addEventListener('DOMContentLoaded', initFilters);

  function initFilters() {
    bindInputs();
    syncEntireFilterUI();
  }

  function bindInputs() {
    document
      .querySelectorAll('.audit-filters input[type="checkbox"]')
      .forEach(input => {
        input.removeEventListener('click', onFilterClick);
        input.addEventListener('click', onFilterClick);
      });

    document.getElementById('criteria-search')
      ?.addEventListener('input', () => {
        window.applyGlobalFilters?.();
      });

    document.getElementById('clear-filters-btn-inline')
      ?.addEventListener('click', () => {
        const filters = getFilters();
        Object.keys(filters).forEach(k => filters[k] = {});

        const searchInput = document.getElementById('criteria-search');
        if (searchInput) searchInput.value = '';

        window.applyGlobalFilters?.();
      });
  }

  /* =========================================================
     STATE ACCESS
     ========================================================= */

  function getApp() {
    return window.WCAG_AUDIT_APP || {};
  }

  function getState() {
    return getApp().state || {};
  }

  function getFilters() {
    const state = getState();

    if (!state.filters) {
      state.filters = {
        level: {},
        status: {},
        failure: {},
        area: {},
        priority: {}
      };
    }

    return state.filters;
  }

  /* =========================================================
     CLICK HANDLER
     ========================================================= */

  function onFilterClick(e) {
    e.preventDefault(); // Control state manually for 3-state logic

    const input = e.target;
    const type = normalizeType(input.name.replace('filter-', ''));
    const value = normalizeValue(input.value);
    const filters = getFilters();

    if (!filters[type]) filters[type] = {};

    const currentMode = filters[type][value]; // undefined | 'include' | 'exclude'
    let nextMode;

    if (!currentMode) {
      nextMode = 'include';
    } else if (currentMode === 'include') {
      nextMode = 'exclude';
    } else {
      nextMode = undefined;
    }

    if (nextMode) {
      filters[type][value] = nextMode;
    } else {
      delete filters[type][value];
    }

    syncSingleInputUI(input, nextMode);
    window.applyGlobalFilters?.();
  }

  /* =========================================================
     APPLY FILTERS
     ========================================================= */

  window.applyGlobalFilters = function () {
    const filters = getFilters();
    const searchVal = document.getElementById('criteria-search')?.value?.toLowerCase() || '';

    document
      .querySelectorAll('.audit-table tbody tr')
      .forEach(tr => {
        const row = extractRowData(tr);
        const name = tr.querySelector('strong')?.textContent?.toLowerCase() || '';
        const number = tr.querySelector('.col-number')?.textContent?.toLowerCase() || '';

        const matchesSearch = !searchVal ||
          name.includes(searchVal) ||
          number.includes(searchVal);

        tr.hidden = !matchesSearch || !matchesAllFilters(
          row,
          filters
        );
      });

    syncEntireFilterUI();
  };

  /* =========================================================
     ROW EXTRACTION
     ========================================================= */

  function extractRowData(tr) {
    return {
      level: normalizeValue(tr.dataset.level),
      status: normalizeValue(tr.dataset.status),
      failure: normalizeValue(tr.dataset.failure),

      areas: normalizeArray(
        tr.dataset.areas ||
        tr.dataset.area ||
        ''
      ),

      priorities: normalizeArray(
        tr.dataset.priorities ||
        tr.dataset.priority ||
        ''
      )
    };
  }

  /* =========================================================
     MATCH ENGINE
     ========================================================= */

  function matchesAllFilters(row, filters) {
    return (
      matchSingle(
        filters.level,
        [row.level]
      ) &&

      matchSingle(
        filters.status,
        [row.status]
      ) &&

      matchSingle(
        filters.failure,
        [row.failure]
      ) &&

      matchSingle(
        filters.area,
        row.areas
      ) &&

      matchSingle(
        filters.priority,
        row.priorities
      )
    );
  }

  function matchSingle(ruleSet = {}, values = []) {

    const includes = [];
    const excludes = [];

    Object.entries(ruleSet)
      .forEach(([k, v]) => {
        if (v === 'include') includes.push(k);
        if (v === 'exclude') excludes.push(k);
      });

    /* =========================
       EXCLUDES WIN
       ========================= */

    if (
      values.some(v => excludes.includes(v))
    ) {
      return false;
    }

    /* =========================
       NO INCLUDES = PASS
       ========================= */

    if (!includes.length) {
      return true;
    }

    /* =========================
       AT LEAST ONE INCLUDE
       ========================= */

    return values.some(v =>
      includes.includes(v)
    );
  }

  /* =========================================================
     UI SYNC
     ========================================================= */

  function syncEntireFilterUI() {
    const filters = getFilters();

    document
      .querySelectorAll('.audit-filters input[type="checkbox"]')
      .forEach(input => {

        const type = normalizeType(
          input.name.replace('filter-', '')
        );

        const value = normalizeValue(input.value);

        syncSingleInputUI(
          input,
          filters[type]?.[value]
        );
      });
  }

  function syncSingleInputUI(input, state) {

    const label = input.closest('label');

    if (!label) return;

    label.classList.remove(
      'filter-include',
      'filter-exclude'
    );

    input.checked = false;

    if (state === 'include') {
      input.checked = true;
      label.classList.add('filter-include');
    }

    if (state === 'exclude') {
      label.classList.add('filter-exclude');
    }
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  function normalizeType(v) {
    return String(v || '')
      .trim()
      .toLowerCase();
  }

  function normalizeValue(v) {
    return String(v || '')
      .trim()
      .toLowerCase();
  }

  function normalizeArray(v) {

    if (!v) return [];

    if (Array.isArray(v)) {
      return v.map(normalizeValue);
    }

    // Handle string with comma-separated values (from data-areas/data-priorities)
    return String(v)
      .split(',')
      .map(v => v.trim())
      .map(normalizeValue)
      .filter(Boolean);
  }

})();