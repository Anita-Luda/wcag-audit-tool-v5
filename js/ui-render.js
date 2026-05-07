/* =========================================================
   ui-render.js
   Czysty render UI (bez logiki, bez backendu)
   ========================================================= */

(function () {
  'use strict';

  /* =====================================================
     PUBLIC API
     ===================================================== */

  window.renderAuditTables = function (definitions, state, context = {}) {
    const productType = state.meta?.productType || 'web';
    const mode = context.mode || 'edit';

    definitions.groups.forEach(group => {
      const tbody = document.getElementById(`group-${group.id}-body`);
      if (!tbody) return;

      const table = tbody.closest('.audit-table');
      if (table) {
        table.classList.toggle('is-web', productType === 'web');
        table.classList.toggle('is-app', productType === 'app');
      }

      tbody.innerHTML = '';

      definitions.criteria
        .filter(c => c.group === group.id)
        .forEach(def => {
          const rowState = state.criteria?.[def.id] || {};
          tbody.appendChild(renderRow(def, rowState, mode));
        });
    });
  };

  /* =====================================================
     ROW RENDER
     ===================================================== */

  function renderRow(def, rowState, mode) {
    const tr = document.createElement('tr');

    tr.dataset.criterionId = def.id;
    tr.dataset.group = def.group;
    tr.dataset.level = def.group === '5' ? 'EN' : def.level;
    tr.dataset.status = rowState.status || 'not-tested';

    const areas = rowState.areas || [def.team];
    const priorities = rowState.priorities || [def.priority];

    tr.dataset.team = areas[0];
    tr.dataset.priority = priorities[0];

    tr.innerHTML = `
      <td class="col-nr">${def.number}</td>

      <td class="col-name">
        <strong>${def.name}</strong>
        <div class="criterion-desc">${def.description || ''}</div>
      </td>

      <td class="col-level">${def.group === '5' ? 'EN' : def.level}</td>

      <td class="col-status">
        ${renderStatus(def.id, rowState.status, mode)}
        ${renderFailureDetail(def.id, rowState, mode)}
      </td>

      <td class="col-issue">
        ${mode === 'edit'
          ? `<textarea class="issue">${rowState.issueDescription || ''}</textarea>`
          : `<div class="readonly">${rowState.issueDescription || ''}</div>`}
      </td>

      <td class="col-expected">
        ${mode === 'edit'
          ? `<textarea class="expected">${rowState.expectedBehavior || ''}</textarea>`
          : `<div class="readonly">${rowState.expectedBehavior || ''}</div>`}
      </td>

      <td class="col-code web-only">
        ${mode === 'edit'
          ? `<textarea class="html-current">${rowState.htmlCurrent || ''}</textarea>`
          : `<pre class="readonly">${escapeHTML(rowState.htmlCurrent || '')}</pre>`}
      </td>

      <td class="col-code web-only">
        ${mode === 'edit'
          ? `<textarea class="html-expected">${rowState.htmlExpected || ''}</textarea>`
          : `<pre class="readonly">${escapeHTML(rowState.htmlExpected || '')}</pre>`}
      </td>

      <td class="col-area">
        ${renderBadges(areas, 'area')}
      </td>

      <td class="col-priority">
        ${renderBadges(priorities, 'priority')}
      </td>

      <td class="col-action">
        ${mode === 'edit'
          ? `<button class="save-row" type="button">💾 Zapisz</button>`
          : ''}
        <div class="row-date">
          ${rowState.rowLastModifiedAt
            ? formatDate(rowState.rowLastModifiedAt)
            : '—'}
        </div>
      </td>
    `;

    return tr;
  }

  /* =====================================================
     STATUS + FAILURE (RENDER ONLY)
     ===================================================== */

  function renderStatus(id, status = 'not-tested', mode) {
    const options = [
      { v: 'pass', l: '✅ OK' },
      { v: 'fail', l: '❌ Nie OK' },
      { v: 'not-applicable', l: '➖ ND' },
      { v: 'not-tested', l: '⏳ NS' }
    ];

    if (mode === 'view') {
      const found = options.find(o => o.v === status);
      return `<div class="status-readonly">${found?.l || '⏳ NS'}</div>`;
    }

    return `
      <div class="status-radios vertical">
        ${options.map(o => `
          <label>
            <input type="radio" name="status-${id}" value="${o.v}"
              ${status === o.v ? 'checked' : ''} />
            <span>${o.l}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  function renderFailureDetail(id, rowState, mode) {
    if (rowState.status !== 'fail') {
      return `<div class="failure-detail hidden"></div>`;
    }

    const options = [
      { v: 'full', l: 'Brak' },
      { v: 'partial', l: 'Częściowo' },
      { v: 'accepted', l: 'Świadomie' }
    ];

    if (mode === 'view') {
      return `
        <div class="failure-detail">
          ${options.find(o => o.v === rowState.failureDetail)?.l || ''}
        </div>
      `;
    }

    return `
      <div class="failure-detail">
        <div class="failure-detail-radios">
          ${options.map(o => `
            <label>
              <input type="radio" name="failure-${id}" value="${o.v}"
                ${rowState.failureDetail === o.v ? 'checked' : ''} />
              ${o.l}
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* =====================================================
     BADGES (MULTI‑VALUE, RENDER ONLY)
     ===================================================== */

  function renderBadges(values = [], type) {
    return values.map(v =>
      `<span class="badge ${type}-${v}" data-badge="${type}">${v}</span>`
    ).join(' ');
  }

  /* =====================================================
     HELPERS
     ===================================================== */

  function formatDate(iso) {
    return new Date(iso).toLocaleString('pl-PL');
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

})();