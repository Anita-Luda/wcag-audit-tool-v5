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
      return;
    }

    if (!state) {
      return;
    }

    const mode = context.mode || 'edit';
    const productType = state.meta?.productType || 'web';

    if (!context.unlockedRows) {
      context.unlockedRows = new Set();
    }

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
    tr.dataset.criterionId = def.id;

    const isUnlocked = window.WCAG_AUDIT_APP?.context?.unlockedRows?.has(def.id);
    if (isUnlocked) tr.classList.add('unlocked');

    // Effective mode for this row
    const rowMode = (mode === 'edit' || isUnlocked) ? 'edit' : 'view';

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
        ${renderStatusGroup(def.id, status, rowMode)}

        <div class="failure-container">
          ${renderFailureGroup(def.id, rowState, rowMode)}
        </div>
      </td>

      <td class="col-issue">
        ${renderTextarea({
          className: 'issueDescription',
          value: rowState.issueDescription,
          mode: rowMode
        })}
      </td>

      <td class="col-expected">
        ${renderTextarea({
          className: 'expectedBehavior',
          value: rowState.expectedBehavior,
          mode: rowMode
        })}
      </td>

      <td class="col-html-current web-only">
        ${productType === 'web'
          ? renderTextarea({
              className: 'htmlCurrent',
              value: rowState.htmlCurrent,
              mode: rowMode
            })
          : '<div class="not-applicable-cell">—</div>'
        }
      </td>

      <td class="col-html-expected web-only">
        ${productType === 'web'
          ? renderTextarea({
              className: 'htmlExpected',
              value: rowState.htmlExpected,
              mode: rowMode
            })
          : '<div class="not-applicable-cell">—</div>'
        }
      </td>

      <td class="col-area">
        ${renderBadgeTrigger({
          type: 'area',
          values: normalizeArray(
            rowState.areas,
            def.area || def.team || []
          ),
          mode: rowMode
        })}
      </td>

      <td class="col-priority">
        ${renderBadgeTrigger({
          type: 'priority',
          values: normalizeArray(
            rowState.priorities,
            def.priority || 'medium'
          ),
          mode: rowMode
        })}
      </td>

      <td class="col-actions">
        ${rowMode === 'edit'
          ? '<button type="button" class="save-row btn-action-kawaii" title="Zapisz i zablokuj">Zapisz 💾</button>'
          : '<button type="button" class="unlock-row btn-action-kawaii" title="Odblokuj do edycji">Edytuj 🔓</button>'
        }
      </td>
    `;

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

    tr.dataset.failure =
      rowState.failureDetail || '';

    tr.dataset.areas =
      normalizeArray(
        rowState.areas,
        def.area || def.team || 'mixed'
      ).join(',');

    tr.dataset.priorities =
      normalizeArray(
        rowState.priorities,
        def.priority || 'medium'
      ).join(',');
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
      <div class="status-switcher">
        <div class="status-switcher-bg"></div>
        ${options.map(([value, label]) => `
          <label class="status-option">
            <input
              type="radio"
              name="status-${id}"
              value="${value}"
              ${currentStatus === value ? 'checked' : ''}
            />
            <span class="status-label">${label}</span>
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

  function renderBadgeTrigger({ type, values = [], mode }) {
    const selected = (Array.isArray(values) ? values : [values]).filter(v => v);
    const isPriority = type === 'priority';
    const icons = { critical: '🔴', high: '🟠', medium: '🟡' };

    return `
      <div class="badge-trigger" data-type="${type}">
        <div class="badge-list">
          ${selected.length ? selected.map(v => `
            <span class="badge badge-${escapeHTML(v)}">
              ${isPriority ? (icons[v] || '⚪') + ' ' : ''}${escapeHTML(v)}
            </span>
          `).join('') : `<span class="badge-empty">Wybierz...</span>`}
        </div>
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

            const isUnlocked = window.WCAG_AUDIT_APP.context.unlockedRows?.has(id);
            const mode = (window.WCAG_AUDIT_APP.context.mode === 'edit' || isUnlocked) ? 'edit' : 'view';

            failureContainer.innerHTML =
              renderFailureGroup(id, rowState, mode);
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
       BADGE TRIGGERS (POPUPS)
       ========================= */

    row.querySelectorAll('.badge-trigger')
      .forEach(trigger => {
        trigger.addEventListener('click', () => {
          const mode = window.WCAG_AUDIT_APP.context.mode;
          if (mode === 'view' && !row.classList.contains('unlocked')) return;

          const type = trigger.dataset.type;
          showBadgePopup(trigger, id, type, row);
        });
      });

    /* =========================
       SAVE / UNLOCK BUTTONS
       ========================= */

    row.querySelector('.save-row')
      ?.addEventListener('click', () => {
        window.WCAG_AUDIT_APP.context.unlockedRows?.delete(id);
        window.triggerAutosave?.();
        window.refreshUI?.();
      });

    row.querySelector('.unlock-row')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!window.WCAG_AUDIT_APP.context.unlockedRows) {
           window.WCAG_AUDIT_APP.context.unlockedRows = new Set();
        }
        window.WCAG_AUDIT_APP.context.unlockedRows.add(id);
        window.refreshUI?.();
      });
  }

  function showBadgePopup(trigger, criterionId, type, row) {
    const options = {
      area: ['development', 'content', 'design'],
      priority: ['critical', 'high', 'medium']
    };

    const def = window.WCAG_AUDIT_APP.definitions.criteria.find(c => c.id === criterionId);
    const rowState = window.WCAG_AUDIT_APP?.state?.criteria?.[criterionId] || {};
    const key = type === 'area' ? 'areas' : 'priorities';

    // Crucial: Get current values from state, or fallback to definitions if state is empty
    let currentValues = [];
    if (rowState[key] && Array.isArray(rowState[key]) && rowState[key].length > 0) {
      currentValues = rowState[key];
    } else {
      // Fallback logic matching renderRow
      if (type === 'area') {
        currentValues = normalizeArray(def?.area || def?.team || ['mixed']);
      } else {
        currentValues = normalizeArray(def?.priority || 'medium');
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    const rect = trigger.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'badge-popup';

    // Position adjustments to keep it on screen
    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;

    const inputType = type === 'priority' ? 'radio' : 'checkbox';
    const inputName = `popup-${type}-${criterionId}`;

    popup.innerHTML = `
      <div class="popup-options">
        ${options[type].map(opt => `
          <label class="popup-option">
            <input type="${inputType}" name="${inputName}" value="${opt}" ${currentValues.includes(opt) ? 'checked' : ''}>
            <span>${escapeHTML(opt)}</span>
          </label>
        `).join('')}
      </div>
      <div class="popup-actions">
        <button class="popup-close">Gotowe ✨</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    const close = () => {
      overlay.remove();
      popup.remove();
    };

    overlay.onclick = close;
    popup.querySelector('.popup-close').onclick = close;

    popup.querySelectorAll('input').forEach(input => {
      input.onchange = () => {
        let values;
        if (inputType === 'radio') {
          values = [input.value];
        } else {
          values = Array.from(popup.querySelectorAll('input:checked')).map(i => i.value);
        }

        window.updateRowState?.(criterionId, key, values);
        updateRowDatasets(row, criterionId);
        window.triggerAutosave?.();
      };
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

    const def = window.WCAG_AUDIT_APP.definitions.criteria.find(c => c.id === id);

    row.dataset.areas =
      normalizeArray(rowState.areas, def?.area || def?.team || 'mixed').join(',');

    row.dataset.priorities =
      normalizeArray(rowState.priorities, def?.priority || 'medium').join(',');

    // Update level display if it was missing or corrupted
    const levelCell = row.querySelector('.col-level');
    if (levelCell) {
       const def = window.WCAG_AUDIT_APP.definitions.criteria.find(c => c.id === id);
       if (def) {
          levelCell.textContent = def.group === '5' ? 'EN' : (def.level || '');
       }
    }

    // Refresh badges properly
    const areaCol = row.querySelector('.col-area');
    if (areaCol) {
      const def = window.WCAG_AUDIT_APP.definitions.criteria.find(c => c.id === id);
      const isUnlocked = window.WCAG_AUDIT_APP.context.unlockedRows?.has(id);
      const mode = (window.WCAG_AUDIT_APP.context.mode === 'edit' || isUnlocked) ? 'edit' : 'view';

      areaCol.innerHTML = renderBadgeTrigger({
        type: 'area',
        values: normalizeArray(rowState.areas, def.area || def.team || []),
        mode
      });
    }

    const priorityCol = row.querySelector('.col-priority');
    if (priorityCol) {
      const def = window.WCAG_AUDIT_APP.definitions.criteria.find(c => c.id === id);
      const isUnlocked = window.WCAG_AUDIT_APP.context.unlockedRows?.has(id);
      const mode = (window.WCAG_AUDIT_APP.context.mode === 'edit' || isUnlocked) ? 'edit' : 'view';

      priorityCol.innerHTML = renderBadgeTrigger({
        type: 'priority',
        values: normalizeArray(rowState.priorities, def.priority || 'medium'),
        mode
      });
    }

    // Re-bind events for the new trigger buttons if needed
    row.querySelectorAll('.badge-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
          const isUnlocked = window.WCAG_AUDIT_APP.context.unlockedRows?.has(id);
          const mode = (window.WCAG_AUDIT_APP.context.mode === 'edit' || isUnlocked) ? 'edit' : 'view';
          if (mode === 'view') return;
          showBadgePopup(trigger, id, trigger.dataset.type, row);
        });
    });

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

    if (Array.isArray(value) && value.length > 0) {
      return value;
    }

    if (!value || (Array.isArray(value) && value.length === 0)) {
      return Array.isArray(fallback)
        ? (fallback.length > 0 ? fallback : [])
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