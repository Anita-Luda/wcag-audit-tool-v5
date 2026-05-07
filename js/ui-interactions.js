/* =========================================================
   ui-interactions.js
   SANITY‑FIX: spójny cykl życia UI
   ========================================================= */

(function () {
  'use strict';

  /* =====================================================
     INIT
     ===================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    bindAuditSelector();
    bindVersionSelector();
    bindModeSelector();
    bindProductType();
    bindGlobalEvents();
  });

  /* =====================================================
     CENTRALNY CYKL ŻYCIA UI
     ===================================================== */

  function refreshUI() {
    const app = window.WCAG_AUDIT_APP;

    // 1. render
    window.renderAuditTables(
      app.definitions,
      app.state,
      app.context
    );

    // 2. filtry (po KAŻDYM renderze)
    if (window.applyGlobalFilters) {
      window.applyGlobalFilters();
    }

    // 3. podsumowanie
    if (window.updateAuditSummary) {
      window.updateAuditSummary();
    }
  }

  /* =====================================================
     AUDYT / WERSJE
     ===================================================== */

  function bindAuditSelector() {
    const select = document.getElementById('audit-selector');
    if (!select) return;

    fetch('/api/audits')
      .then(r => r.json())
      .then(audits => {
        select.innerHTML = audits
          .map(a => `<option value="${a.id}">${a.name || a.id}</option>`)
          .join('');

        const ctx = WCAG_AUDIT_APP.context;
        ctx.selectedAuditId ||= audits[0]?.id;
        select.value = ctx.selectedAuditId;

        loadDraft(ctx.selectedAuditId);
      });

    select.addEventListener('change', () => {
      WCAG_AUDIT_APP.context.selectedAuditId = select.value;
      WCAG_AUDIT_APP.context.selectedVersion = 'draft';
      loadDraft(select.value);
    });
  }

  function bindVersionSelector() {
    const select = document.getElementById('version-selector');
    if (!select) return;

    select.addEventListener('change', () => {
      const ctx = WCAG_AUDIT_APP.context;
      ctx.selectedVersion = select.value;

      if (select.value === 'draft') {
        loadDraft(ctx.selectedAuditId);
      } else {
        loadVersion(ctx.selectedAuditId, select.value);
      }
    });
  }

  function loadDraft(id) {
    fetch(`/api/audits/${id}/draft`)
      .then(r => r.json())
      .then(state => {
        WCAG_AUDIT_APP.state = state;
        WCAG_AUDIT_APP.context.mode = 'edit';
        refreshVersions(id);
        syncModeRadios();
        refreshUI();
      });
  }

  function loadVersion(id, version) {
    fetch(`/api/audits/${id}/versions/${version}`)
      .then(r => r.json())
      .then(state => {
        WCAG_AUDIT_APP.state = state;
        WCAG_AUDIT_APP.context.mode = 'view';
        syncModeRadios();
        refreshUI();
      });
  }

  function refreshVersions(id) {
    fetch(`/api/audits/${id}/versions`)
      .then(r => r.json())
      .then(versions => {
        const select = document.getElementById('version-selector');
        if (!select) return;

        select.innerHTML =
          `<option value="draft">Draft</option>` +
          versions.map(v => `<option value="${v}">${v}</option>`).join('');

        select.value = WCAG_AUDIT_APP.context.selectedVersion || 'draft';
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
          WCAG_AUDIT_APP.context.mode = radio.value;
          refreshUI();
        });
      });
  }

  function syncModeRadios() {
    document
      .querySelectorAll('input[name="audit-mode"]')
      .forEach(radio => {
        radio.checked =
          radio.value === WCAG_AUDIT_APP.context.mode;
      });
  }

  /* =====================================================
     WEB / APP
     ===================================================== */

  function bindProductType() {
    document
      .querySelectorAll('input[name="product-type"]')
      .forEach(radio => {
        radio.addEventListener('change', () => {
          window.setProductType(radio.value);
          refreshUI();
        });
      });
  }

  /* =====================================================
     GLOBALNE EVENTY (STATUS, SAVE, BADGE)
     ===================================================== */

  function bindGlobalEvents() {
    document.body.addEventListener('change', handleStatusChange);
    document.body.addEventListener('click', handleClicks);
  }

  function handleStatusChange(e) {
    const radio = e.target;
    if (!radio.name?.startsWith('status-')) return;

    const tr = radio.closest('tr');
    const id = tr.dataset.criterionId;

    const row = WCAG_AUDIT_APP.state.criteria[id] || {};
    row.status = radio.value;

    if (radio.value !== 'fail') {
      delete row.failureDetail;
    }

    WCAG_AUDIT_APP.state.criteria[id] = row;
    refreshUI();
  }

  function handleClicks(e) {
    const saveBtn = e.target.closest('.save-row');
    if (saveBtn) {
      const tr = saveBtn.closest('tr');
      const id = tr.dataset.criterionId;

      saveRow(tr, id);
      return;
    }

    const badge = e.target.closest('[data-badge]');
    if (badge) {
      openBadgePopup(badge);
    }
  }

  /* =====================================================
     SAVE
     ===================================================== */

function saveRow(tr, id) {
  const data = {
    issueDescription: tr.querySelector('.issue')?.value || '',
    expectedBehavior: tr.querySelector('.expected')?.value || '',
    htmlCurrent: tr.querySelector('.html-current')?.value || '',
    htmlExpected: tr.querySelector('.html-expected')?.value || ''
  };

  // aktualizacja stanu w pamięci
  WCAG_AUDIT_APP.state.criteria[id] = {
    ...(WCAG_AUDIT_APP.state.criteria[id] || {}),
    ...data
  };

  // zapis TYLKO patcha
  window.saveCriterionState(id, data);

  refreshUI();
}

  /* =====================================================
     BADGE POPUP (MINIMALNY SANITY‑FIX)
     ===================================================== */

  function openBadgePopup(badge) {
    if (WCAG_AUDIT_APP.context.mode === 'view') return;

    const tr = badge.closest('tr');
    const id = tr.dataset.criterionId;
    const type = badge.dataset.badge;

    const options =
      type === 'area'
        ? ['development', 'content', 'design', 'mixed']
        : ['critical', 'high', 'medium'];

    const current =
      type === 'area'
        ? WCAG_AUDIT_APP.state.criteria[id]?.areas || []
        : WCAG_AUDIT_APP.state.criteria[id]?.priorities || [];

    const value = prompt(
      `Wpisz wartości (${options.join(', ')})`,
      current.join(', ')
    );

    if (!value) return;

    const values = value
      .split(',')
      .map(v => v.trim())
      .filter(v => options.includes(v));

    if (!WCAG_AUDIT_APP.state.criteria[id]) {
      WCAG_AUDIT_APP.state.criteria[id] = {};
    }

    if (type === 'area') {
      WCAG_AUDIT_APP.state.criteria[id].areas = values;
    } else {
      WCAG_AUDIT_APP.state.criteria[id].priorities = values;
    }

    window.saveCriterionState(id, WCAG_AUDIT_APP.state.criteria[id]);
    refreshUI();
  }

})();
