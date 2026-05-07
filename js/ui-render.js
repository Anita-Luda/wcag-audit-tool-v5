/* =========================================================
   ui-render.js – STRICT TABLE CONTRACT RENDERER (V3 STABLE)
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.renderAuditTables = function (definitions, state, context = {}) {

    if (!definitions?.groups || !definitions?.criteria) {
      console.error('❌ Missing WCAG definitions');
      return;
    }

    if (!state) {
      console.error('❌ Missing audit state');
      return;
    }

    const mode = context.mode || 'edit';
    const productType = state.meta?.productType || 'web';

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
        .filter(def => def.group === group.id)
        .forEach(def => {

          const rowState = getRowState(state, def.id);

          const row = renderRow({
            def,
            rowState,
            mode,
            productType
          });

          attachDatasets(row, def, rowState);

          bindRowEvents(row, def.id);

          tbody.appendChild(row);
        });
    });

    window.applyGlobalFilters?.();
    window.updateAuditSummary?.();
  };

  /* =========================================================
     STATE HELPERS
     ========================================================= */

  function getRowState(state, id) {

    if (!state.criteria) {
      state.criteria = {};
    }

    if (!state.criteria[id]) {
      state.criteria[id] = {};
    }

    return state.criteria[id];
  }

  /* =========================================================
     ROW RENDER
     ========================================================= */

  function renderRow({ def, rowState, mode, productType }) {

    const tr = document.createElement('tr');

    const status = normalizeStatus(rowState.status);

    tr.innerHTML = `
      <td class="col-number">
        ${escapeHTML(def.number || '')}
      </td>

      <td class="col-criterion">
        <strong>${escapeHTML(def.name || '')}</strong>
        <div class="criterion-description">
          ${escapeHTML(def.description || '')}
        </div>
      </td>

      <td class="col-level">
        ${escapeHTML(def.group === '5' ? 'EN' : (def.level || ''))}
      </td>

      <td class="col-status">
        ${renderStatusGroup(def.id, status, mode)}

        <div class="failure-container">
          ${renderFailureGroup(def.id, rowState, mode)}
        </div>
      </td>

      <td class="col-issue">
        ${renderTextarea({
          className: 'issueDescription',
          value: rowState.issueDescription,
          mode
        })}
      </td>

      <td class="col-expected">
        ${renderTextarea({
          className: 'expectedBehavior',
          value: rowState.expectedBehavior,
          mode
        })}
      </td>

      <td class="col-html-current web-only">
        ${productType === 'web'
          ? renderTextarea({
              className: 'htmlCurrent',
              value: rowState.htmlCurrent,
              mode
            })
          : '<div class="not-applicable-cell">—</div>'
        }
      </td>

      <td class="col-html-expected web-only">
        ${productType === 'web'
          ? renderTextarea({
              className: 'htmlExpected',
              value: rowState.htmlExpected,
              mode
            })
          : '<div class="not-applicable-cell">—</div>'
        }
      </td>

      <td class="col-area">
        ${renderCheckboxGroup({
          type: 'area',
          values: normalizeArray(
            rowState.areas,
            def.area || def.team || 'mixed'
          ),
          mode
        })}
      </td>

      <td class="col-priority">
        ${renderCheckboxGroup({
          type: 'priority',
          values: normalizeArray(
            rowState.priorities,
            def.priority || 'medium'
          ),
          mode
        })}
      </td>

      <td class="col-actions">
        ${mode === 'edit'
          ? '<button type="button" class="save-row">💾</button>'
          : '<span class="view-mode-label">view</span>'
        }
      </td>
    `;

    tr.dataset.criterionId = def.id;

    return tr;
  }

  /* =========================================================
     DATASETS
     ========================================================= */

  function attachDatasets(tr, def, rowState) {

    tr.dataset.level =
      def.level || '';

    tr.dataset.status =
      normalizeStatus(rowState.status);

    tr.dataset.area =
      normalizeSingle(
        rowState.areas ||
        def.area ||
        def.team ||
        'mixed'
      );

    tr.dataset.priority =
      normalizeSingle(
        rowState.priorities ||
        def.priority ||
        'medium'
      );
  }

  /* =========================================================
     STATUS
     ========================================================= */

  function renderStatusGroup(id, currentStatus, mode) {

    const options = [
      ['pass', '✅ OK'],
      ['fail', '❌ FAIL'],
      ['not-applicable', '➖ N/A'],
      ['not-tested', '⏳ N/T']
    ];

    if (mode === 'view') {

      return `
        <div class="status-view">
          ${options.find(o => o[0] === currentStatus)?.[1] || '⏳ N/T'}
        </div>
      `;
    }

    return `
      <div class="status-group">
        ${options.map(([value, label]) => `
          <label class="status-option">
            <input
              type="radio"
              name="status-${id}"
              value="${value}"
              ${currentStatus === value ? 'checked' : ''}
            />
            <span>${label}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  /* =========================================================
     FAILURE DETAILS
     ========================================================= */

  function renderFailureGroup(id, rowState, mode) {

    if (normalizeStatus(rowState.status) !== 'fail') {
      return '';
    }

    const current = rowState.failureDetail || '';

    const options = [
      ['full', 'Brak'],
      ['partial', 'Częściowo'],
      ['accepted', 'Akceptowalne']
    ];

    if (mode === 'view') {

      return `
        <div class="failure-view">
          ${options.find(o => o[0] === current)?.[1] || ''}
        </div>
      `;
    }

    return `
      <div class="failure-group">
        ${options.map(([value, label]) => `
          <label class="failure-option">
            <input
              type="radio"
              name="failure-${id}"
              value="${value}"
              ${current === value ? 'checked' : ''}
            />
            <span>${label}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  /* =========================================================
     TEXTAREA
     ========================================================= */

  function renderTextarea({
    className,
    value = '',
    mode
  }) {

    if (mode === 'view') {

      return `
        <div class="textarea-view">
          ${escapeHTML(value || '')}
        </div>
      `;
    }

    return `
      <textarea
        class="${className}"
        rows="4"
      >${escapeHTML(value || '')}</textarea>
    `;
  }

  /* =========================================================
     CHECKBOX GROUPS
     ========================================================= */

  function renderCheckboxGroup({
    type,
    values = [],
    mode
  }) {

    const options = {
      area: [
        'development',
        'content',
        'design',
        'mixed'
      ],

      priority: [
        'critical',
        'high',
        'medium'
      ]
    };

    const selected =
      Array.isArray(values)
        ? values
        : [values];

    if (mode === 'view') {

      return `
        <div class="checkbox-view">
          ${selected.map(v => `
            <span class="badge badge-${escapeHTML(v)}">
              ${escapeHTML(v)}
            </span>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="checkbox-group" data-type="${type}">
        ${options[type].map(option => `
          <label class="checkbox-option">
            <input
              type="checkbox"
              value="${option}"
              ${selected.includes(option) ? 'checked' : ''}
            />
            <span>${escapeHTML(option)}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  /* =========================================================
     EVENTS
     ========================================================= */

  function bindRowEvents(row, id) {

    /* =========================
       STATUS
       ========================= */

    row.querySelectorAll(`input[name="status-${id}"]`)
      .forEach(input => {

        input.addEventListener('change', () => {

          window.updateRowState?.(id, 'status', input.value);

          const failureContainer =
            row.querySelector('.failure-container');

          if (failureContainer) {

            const rowState =
              window.WCAG_AUDIT_APP?.state?.criteria?.[id] || {};

            rowState.status = input.value;

            failureContainer.innerHTML =
              renderFailureGroup(id, rowState, 'edit');
          }

          bindFailureEvents(row, id);

          updateRowDatasets(row, id);

          window.triggerAutosave?.();
          window.updateAuditSummary?.();
        });
      });

    bindFailureEvents(row, id);

    /* =========================
       TEXTAREAS
       ========================= */

    row.querySelectorAll('textarea')
      .forEach(textarea => {

        textarea.addEventListener('input', () => {

          window.updateRowState?.(
            id,
            textarea.className,
            textarea.value
          );

          window.triggerAutosave?.();
        });
      });

    /* =========================
       CHECKBOX GROUPS
       ========================= */

    row.querySelectorAll('.checkbox-group')
      .forEach(group => {

        const type = group.dataset.type;

        group.querySelectorAll('input[type="checkbox"]')
          .forEach(input => {

            input.addEventListener('change', () => {

              const values = Array.from(
                group.querySelectorAll('input:checked')
              ).map(el => el.value);

              const key =
                type === 'area'
                  ? 'areas'
                  : 'priorities';

              window.updateRowState?.(
                id,
                key,
                values
              );

              updateRowDatasets(row, id);

              window.triggerAutosave?.();
            });
          });
      });

    /* =========================
       SAVE BUTTON
       ========================= */

    row.querySelector('.save-row')
      ?.addEventListener('click', () => {

        window.triggerAutosave?.();
      });
  }

  function bindFailureEvents(row, id) {

    row.querySelectorAll(`input[name="failure-${id}"]`)
      .forEach(input => {

        input.addEventListener('change', () => {

          window.updateRowState?.(
            id,
            'failureDetail',
            input.value
          );

          window.triggerAutosave?.();
        });
      });
  }

  /* =========================================================
     DATASET SYNC
     ========================================================= */

  function updateRowDatasets(row, id) {

    const rowState =
      window.WCAG_AUDIT_APP?.state?.criteria?.[id];

    if (!rowState) return;

    row.dataset.status =
      normalizeStatus(rowState.status);

    row.dataset.area =
      normalizeSingle(rowState.areas);

    row.dataset.priority =
      normalizeSingle(rowState.priorities);

    window.applyGlobalFilters?.();
  }

  /* =========================================================
     NORMALIZATION
     ========================================================= */

  function normalizeStatus(status) {

    const valid = [
      'pass',
      'fail',
      'not-applicable',
      'not-tested'
    ];

    return valid.includes(status)
      ? status
      : 'not-tested';
  }

  function normalizeArray(value, fallback = []) {

    if (Array.isArray(value)) {
      return value;
    }

    if (!value) {
      return Array.isArray(fallback)
        ? fallback
        : [fallback];
    }

    return [value];
  }

  function normalizeSingle(value) {

    if (Array.isArray(value)) {
      return value[0] || '';
    }

    return value || '';
  }

  /* =========================================================
     ESCAPE
     ========================================================= */

  function escapeHTML(value) {

    if (value === null || value === undefined) {
      return '';
    }

    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();