/* =========================================================
   Filtry globalne: neutral / include / exclude   ui-filters.js
   ========================================================= */

(function () {
  'use strict';

  /* =====================================================
     MODEL STANU FILTRÓW
     ===================================================== */

  const filterState = {
    level: {},     // A / AA / AAA / EN
    status: {},    // pass / fail / not-applicable / not-tested
    area: {},      // development / content / design / mixed
    priority: {}   // critical / high / medium
  };

  /* =====================================================
     INIT
     ===================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    initFilterInputs();
  });

  /* =====================================================
     OBSŁUGA INPUTÓW (CLICK / SHIFT+CLICK)
     ===================================================== */

  function initFilterInputs() {
    document
      .querySelectorAll('.audit-filters input[type="checkbox"]')
      .forEach(input => {
        input.addEventListener('click', e => {
          const type = input.name.replace('filter-', '');
          const value = input.value;

          if (e.shiftKey) {
            toggleExclude(type, value);
          } else {
            toggleInclude(type, value);
          }

          syncFilterUI(type, value, input);
          applyFilters();
        });
      });
  }

  /* =====================================================
     ZMIANA STANU FILTRA
     ===================================================== */

  function toggleInclude(type, value) {
    const current = filterState[type][value];

    if (current === 'include') {
      delete filterState[type][value];
    } else {
      filterState[type][value] = 'include';
    }
  }

  function toggleExclude(type, value) {
    const current = filterState[type][value];

    if (current === 'exclude') {
      delete filterState[type][value];
    } else {
      filterState[type][value] = 'exclude';
    }
  }

  /* =====================================================
     APLIKACJA FILTRÓW
     ===================================================== */

  function applyFilters() {
    document
      .querySelectorAll('.audit-table tbody tr')
      .forEach(tr => {
        tr.hidden = !rowMatchesFilters(tr);
      });
  }

  function rowMatchesFilters(tr) {
    return (
      matchSingle('level', tr.dataset.level) &&
      matchSingle('status', tr.dataset.status) &&
      matchSingle('area', tr.dataset.team) &&
      matchSingle('priority', tr.dataset.priority)
    );
  }

  /* =====================================================
     LOGIKA MATCHOWANIA
     ===================================================== */

  function matchSingle(type, value) {
    const rules = filterState[type];
    const includes = [];
    const excludes = [];

    Object.entries(rules).forEach(([k, v]) => {
      if (v === 'include') includes.push(k);
      if (v === 'exclude') excludes.push(k);
    });

    if (excludes.includes(value)) {
      return false;
    }

    if (includes.length > 0 && !includes.includes(value)) {
      return false;
    }

    return true;
  }

  /* =====================================================
     SYNCHRONIZACJA UI (KLASY CSS)
     ===================================================== */

  function syncFilterUI(type, value, input) {
    const state = filterState[type][value];
    const label = input.closest('label');

    if (!label) return;

    label.classList.remove('filter-include', 'filter-exclude');

    if (state === 'include') {
      input.checked = true;
      label.classList.add('filter-include');
    } else if (state === 'exclude') {
      input.checked = false;
      label.classList.add('filter-exclude');
    } else {
      input.checked = false;
    }
  }

  /* =====================================================
     PUBLICZNY HOOK (PO RE-RENDERZE)
     ===================================================== */

  window.applyGlobalFilters = applyFilters;

})();

