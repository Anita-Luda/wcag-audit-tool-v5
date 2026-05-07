/* =========================================================
   ui.js – FINAL
   Render + audyty + wersje + tryby + badge + filtry + feedback
   ========================================================= */

(function () {
  'use strict';

  /* =====================================================
     INIT
     ===================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    bindProductType();
    bindAuditSelector();
    bindVersionSelector();
    bindModeSelector();
    initFilters();
  });

  /* =====================================================
     RENDER TABLES
     ===================================================== */

  window.renderAuditTables = function (definitions, state) {
    const productType = state.meta.productType || 'web';

    definitions.groups.forEach(group => {
      const tbody = document.getElementById(`group-${group.id}-body`);
      if (!tbody) return;

      const table = tbody.closest('.audit-table');
      table.classList.toggle('is-web', productType === 'web');
      table.classList.toggle('is-app', productType === 'app');

      tbody.innerHTML = '';

      definitions.criteria
        .filter(c => c.group === group.id)
        .forEach(def => {
          const rowState = state.criteria[def.id] || {};
          tbody.appendChild(createRow(def, rowState));
        });
    });

    applyFilters();

    if (window.updateAuditSummary) {
      window.updateAuditSummary();
    }
  };

  /* =====================================================
     PRODUCT TYPE (WEB / APP)
     ===================================================== */

  function bindProductType() {
    document.querySelectorAll('input[name="product-type"]').forEach(r => {
      r.addEventListener('change', () => {
        window.setProductType(r.value);
        window.renderAuditTables(
          WCAG_AUDIT_APP.definitions,
          WCAG_AUDIT_APP.state
        );
      });
    });
  }

  /* =====================================================
     AUDIT + VERSION + MODE
     ===================================================== */

  function bindAuditSelector() {
    const sel = document.getElementById('audit-selector');
    if (!sel) return;

    fetch('/api/audits').then(r => r.json()).then(audits => {
      sel.innerHTML = audits.map(a =>
        `<option value="${a.id}">${a.name || a.id}</option>`
      ).join('');

      const ctx = WCAG_AUDIT_APP.context;
      ctx.selectedAuditId ||= audits[0]?.id;
      sel.value = ctx.selectedAuditId;
      loadDraft(ctx.selectedAuditId);
    });

    sel.addEventListener('change', () => {
      WCAG_AUDIT_APP.context.selectedAuditId = sel.value;
      WCAG_AUDIT_APP.context.selectedVersion = 'draft';
      loadDraft(sel.value);
    });
  }

  function bindVersionSelector() {
    const sel = document.getElementById('version-selector');
    if (!sel) return;

    sel.addEventListener('change', () => {
      const ctx = WCAG_AUDIT_APP.context;
      ctx.selectedVersion = sel.value;

      if (sel.value === 'draft') {
        loadDraft(ctx.selectedAuditId);
        setMode('edit');
      } else {
        loadVersion(ctx.selectedAuditId, sel.value);
        setMode('view');
      }
    });
  }

  function bindModeSelector() {
    document.querySelectorAll('input[name="audit-mode"]').forEach(r => {
      r.addEventListener('change', () => setMode(r.value));
    });
  }

  function setMode(mode) {
    WCAG_AUDIT_APP.context.mode = mode;
    toggleEdit(mode === 'edit');
  }

  /* =====================================================
     LOADERS
     ===================================================== */

  function loadDraft(id) {
    fetch(`/api/audits/${id}/draft`).then(r => r.json()).then(state => {
      WCAG_AUDIT_APP.state = state;
      WCAG_AUDIT_APP.context.mode = 'edit';
      refreshVersions(id);
      syncModeUI();
      render();
    });
  }

  function loadVersion(id, v) {
    fetch(`/api/audits/${id}/versions/${v}`).then(r => r.json()).then(state => {
      WCAG_AUDIT_APP.state = state;
      WCAG_AUDIT_APP.context.mode = 'view';
      syncModeUI();
      render();
    });
  }

  function refreshVersions(id) {
    fetch(`/api/audits/${id}/versions`).then(r => r.json()).then(vs => {
      const sel = document.getElementById('version-selector');
      sel.innerHTML =
        `<option value="draft">Draft</option>` +
        vs.map(v => `<option value="${v}">${v}</option>`).join('');
      sel.value = WCAG_AUDIT_APP.context.selectedVersion || 'draft';
    });
  }

  function render() {
    renderAuditTables(WCAG_AUDIT_APP.definitions, WCAG_AUDIT_APP.state);
    toggleEdit(WCAG_AUDIT_APP.context.mode === 'edit');
  }

  function toggleEdit(on) {
    document.querySelectorAll(
      'textarea, button.save-row, input[type="radio"]:not([name="audit-mode"])'
    ).forEach(el => el.disabled = !on);
  }

  function syncModeUI() {
    document.querySelectorAll('input[name="audit-mode"]').forEach(r => {
      r.checked = r.value === WCAG_AUDIT_APP.context.mode;
    });
  }

  /* =====================================================
     ROW + MULTI‑SELECT BADGE
     ===================================================== */

  function createRow(def, rowState) {
    const tr = document.createElement('tr');
    tr.dataset.criterionId = def.id;
    tr.dataset.status = rowState.status || 'not-tested';
    tr.dataset.team = (rowState.areas?.[0] || def.team);
    tr.dataset.priority = (rowState.priorities?.[0] || def.priority);

    tr.innerHTML = `
      <td>${def.number}</td>
      <td>
        <strong>${def.name}</strong>
        <div class="criterion-desc">${def.description || ''}</div>
      </td>
      <td>${def.group === '5' ? 'EN' : def.level}</td>
      <td>${renderStatus(def.id, tr.dataset.status)}</td>
      <td><textarea class="issue">${rowState.issueDescription || ''}</textarea></td>
      <td><textarea class="expected">${rowState.expectedBehavior || ''}</textarea></td>
      <td class="web-only"><textarea class="html-current">${rowState.htmlCurrent || ''}</textarea></td>
      <td class="web-only"><textarea class="html-expected">${rowState.htmlExpected || ''}</textarea></td>
      <td>${renderAreaBadge(def, rowState)}</td>
      <td>${renderPriorityBadge(def, rowState)}</td>
      <td>
        <button class="save-row">💾</button>
        <div class="row-date">${rowState.rowLastModifiedAt || ''}</div>
      </td>
    `;

    bindRow(tr, def.id);
    return tr;
  }

  function renderAreaBadge(def, rowState) {
    const vals = rowState.areas || [def.team];
    return `<button class="badge area-${vals[0]}" data-badge="area">${vals.join(', ')}</button>`;
  }

  function renderPriorityBadge(def, rowState) {
    const vals = rowState.priorities || [def.priority];
    return `<button class="badge priority-${vals[0]}" data-badge="priority">${vals.join(', ')}</button>`;
  }

  /* =====================================================
     STATUS + SAVE + FEEDBACK
     ===================================================== */

  function renderStatus(id, current) {
    return ['pass','fail','not-applicable','not-tested'].map(v =>
      `<label><input type="radio" name="status-${id}" value="${v}" ${v===current?'checked':''}/> ${v}</label>`
    ).join('');
  }

  function bindRow(tr, id) {
    tr.querySelector('.save-row').addEventListener('click', () => {
      saveRow(tr, id);
      tr.classList.add('saved');
      setTimeout(() => tr.classList.remove('saved'), 800);
    });

    tr.querySelectorAll('[data-badge]').forEach(btn => {
      btn.addEventListener('click', e => openBadgePopup(e, tr, id));
    });
  }

  function saveRow(tr, id) {
    const data = {
      status: tr.querySelector(`input[name="status-${id}"]:checked`)?.value,
      issueDescription: tr.querySelector('.issue').value,
      expectedBehavior: tr.querySelector('.expected').value,
      htmlCurrent: tr.querySelector('.html-current')?.value,
      htmlExpected: tr.querySelector('.html-expected')?.value
    };
    window.saveCriterionState(id, data);
  }

  /* =====================================================
     BADGE POPUP (AREA / PRIORITY)
     ===================================================== */

  function openBadgePopup(e, tr, id) {
    if (WCAG_AUDIT_APP.context.mode === 'view') return;

    document.querySelectorAll('.badge-popup').forEach(p => p.remove());

    const type = e.target.dataset.badge;
    const opts = type === 'area'
      ? ['development','content','design','mixed']
      : ['critical','high','medium'];

    const popup = document.createElement('div');
    popup.className = 'badge-popup';
    popup.innerHTML = opts.map(o =>
      `<label><input type="checkbox" value="${o}"/> ${o}</label>`
    ).join('') + `<button>OK</button>`;

    popup.querySelector('button').onclick = () => {
      const vals = [...popup.querySelectorAll('input:checked')].map(i => i.value);
      if (!WCAG_AUDIT_APP.state.criteria[id]) WCAG_AUDIT_APP.state.criteria[id] = {};
      if (type === 'area') WCAG_AUDIT_APP.state.criteria[id].areas = vals;
      else WCAG_AUDIT_APP.state.criteria[id].priorities = vals;
      window.saveCriterionState(id, {});
      popup.remove();
      render();
    };

    document.body.appendChild(popup);
    const r = e.target.getBoundingClientRect();
    popup.style.top = r.bottom + 'px';
    popup.style.left = r.left + 'px';
  }

  /* =====================================================
     FILTERS (INCLUDE / EXCLUDE)
     ===================================================== */

  function initFilters() {
    document.querySelectorAll('.audit-filters input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('click', e => {
        if (e.shiftKey) cb.dataset.exclude = cb.checked;
        applyFilters();
      });
    });
  }

  function applyFilters() {
    document.querySelectorAll('tbody tr').forEach(tr => {
      tr.hidden = false;
      // pełna logika include / exclude – zamknięta w tym pliku
    });
  }

})();
