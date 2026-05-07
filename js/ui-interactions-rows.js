/* =========================================================
   ui-interactions-rows.js – SINGLE SOURCE ROW STATE (V3)
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     GLOBAL HELPERS
     ========================================================= */

  function getApp() {
    return window.WCAG_AUDIT_APP;
  }

  function getState() {
    return getApp()?.state;
  }

  function ensureCriteria() {

    const state = getState();

    if (!state.criteria) {
      state.criteria = {};
    }

    return state.criteria;
  }

  function getRowState(id) {

    const criteria = ensureCriteria();

    if (!criteria[id]) {
      criteria[id] = {};
    }

    return criteria[id];
  }

  /* =========================================================
     SINGLE SOURCE UPDATE
     ========================================================= */

  window.updateRowState = function (id, key, value) {

    if (!id || !key) return;

    const row = getRowState(id);

    row[key] = value;

    normalizeRowState(row);

    syncRowDatasets(id);

    window.updateAuditSummary?.();
  };

  function safePatch(id, patch = {}) {

    if (!id || typeof patch !== 'object') return;

    const row = getRowState(id);

    Object.assign(row, patch);

    normalizeRowState(row);

    syncRowDatasets(id);

    window.updateAuditSummary?.();
  }

  /* =========================================================
     NORMALIZATION
     ========================================================= */

  function normalizeRowState(row) {

    /* =========================
       STATUS
       ========================= */

    const validStatuses = [
      'pass',
      'fail',
      'not-applicable',
      'not-tested'
    ];

    if (!validStatuses.includes(row.status)) {
      row.status = 'not-tested';
    }

    /* =========================
       FAILURE DETAIL
       ========================= */

    if (row.status !== 'fail') {
      delete row.failureDetail;
    }

    /* =========================
       ARRAYS
       ========================= */

    row.areas =
      normalizeArray(
        row.areas,
        ['mixed']
      );

    row.priorities =
      normalizeArray(
        row.priorities,
        ['medium']
      );

    /* =========================
       TEXT FIELDS
       ========================= */

    row.issueDescription =
      normalizeText(row.issueDescription);

    row.expectedBehavior =
      normalizeText(row.expectedBehavior);

    row.htmlCurrent =
      normalizeText(row.htmlCurrent);

    row.htmlExpected =
      normalizeText(row.htmlExpected);
  }

  function normalizeArray(value, fallback = []) {

    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    if (!value) {
      return fallback;
    }

    return [value];
  }

  function normalizeText(value) {

    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  /* =========================================================
     ROW SAVE
     ========================================================= */

  function saveRow(tr, id) {

    if (!tr || !id) return;

    const patch = {

      status:
        tr.querySelector(
          `input[name="status-${id}"]:checked`
        )?.value || 'not-tested',

      failureDetail:
        tr.querySelector(
          `input[name="failure-${id}"]:checked`
        )?.value || '',

      issueDescription:
        tr.querySelector('.issueDescription')
          ?.value || '',

      expectedBehavior:
        tr.querySelector('.expectedBehavior')
          ?.value || '',

      htmlCurrent:
        tr.querySelector('.htmlCurrent')
          ?.value || '',

      htmlExpected:
        tr.querySelector('.htmlExpected')
          ?.value || '',

      areas:
        getCheckboxValues(tr, 'area'),

      priorities:
        getCheckboxValues(tr, 'priority')
    };

    safePatch(id, patch);

    window.triggerAutosave?.();
  }

  /* =========================================================
     CHECKBOX HELPERS
     ========================================================= */

  function getCheckboxValues(tr, type) {

    return Array.from(
      tr.querySelectorAll(
        `.checkbox-group[data-type="${type}"] input:checked`
      )
    ).map(el => el.value);
  }

  /* =========================================================
     STATUS CHANGES
     ========================================================= */

  function onStatusChange(e) {

    const input = e.target;

    if (!input?.name?.startsWith('status-')) {
      return;
    }

    const tr =
      input.closest('tr');

    const id =
      tr?.dataset?.criterionId;

    if (!id) return;

    safePatch(id, {
      status: input.value
    });

    rerenderFailureSection(tr, id);

    window.triggerAutosave?.();
  }

  /* =========================================================
     FAILURE SECTION RENDER
     ========================================================= */

  function rerenderFailureSection(tr, id) {

    const container =
      tr.querySelector('.failure-container');

    if (!container) return;

    const row =
      getRowState(id);

    if (row.status !== 'fail') {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="failure-group">

        <label class="failure-option">
          <input
            type="radio"
            name="failure-${id}"
            value="full"
            ${row.failureDetail === 'full' ? 'checked' : ''}
          />
          <span>Brak</span>
        </label>

        <label class="failure-option">
          <input
            type="radio"
            name="failure-${id}"
            value="partial"
            ${row.failureDetail === 'partial' ? 'checked' : ''}
          />
          <span>Częściowo</span>
        </label>

        <label class="failure-option">
          <input
            type="radio"
            name="failure-${id}"
            value="accepted"
            ${row.failureDetail === 'accepted' ? 'checked' : ''}
          />
          <span>Akceptowalne</span>
        </label>

      </div>
    `;
  }

  /* =========================================================
     CHECKBOX CHANGE
     ========================================================= */

  function onCheckboxChange(e) {

    const input = e.target;

    if (
      input.type !== 'checkbox' ||
      !input.closest('.checkbox-group')
    ) {
      return;
    }

    const tr =
      input.closest('tr');

    const id =
      tr?.dataset?.criterionId;

    if (!id) return;

    const group =
      input.closest('.checkbox-group');

    const type =
      group.dataset.type;

    const values =
      getCheckboxValues(tr, type);

    safePatch(id, {
      [type === 'area'
        ? 'areas'
        : 'priorities'
      ]: values
    });

    window.triggerAutosave?.();
  }

  /* =========================================================
     TEXTAREA INPUT
     ========================================================= */

  function onTextareaInput(e) {

    const textarea = e.target;

    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }

    const tr =
      textarea.closest('tr');

    const id =
      tr?.dataset?.criterionId;

    if (!id) return;

    window.updateRowState?.(
      id,
      textarea.className,
      textarea.value
    );

    window.triggerAutosave?.();
  }

  /* =========================================================
     DATASET SYNC
     ========================================================= */

  function syncRowDatasets(id) {

    const tr = document.querySelector(
      `tr[data-criterion-id="${id}"]`
    );

    if (!tr) return;

    const row =
      getRowState(id);

    tr.dataset.status =
      row.status || 'not-tested';

    tr.dataset.area =
      row.areas?.[0] || 'mixed';

    tr.dataset.priority =
      row.priorities?.[0] || 'medium';

    window.applyGlobalFilters?.();
  }

  /* =========================================================
     CLICK EVENTS
     ========================================================= */

  function onClick(e) {

    const saveBtn =
      e.target.closest('.save-row');

    if (saveBtn) {

      const tr =
        saveBtn.closest('tr');

      const id =
        tr?.dataset?.criterionId;

      saveRow(tr, id);

      return;
    }
  }

  /* =========================================================
     INIT
     ========================================================= */

  document.body.addEventListener(
    'change',
    onStatusChange
  );

  document.body.addEventListener(
    'change',
    onCheckboxChange
  );

  document.body.addEventListener(
    'input',
    onTextareaInput
  );

  document.body.addEventListener(
    'click',
    onClick
  );

})();