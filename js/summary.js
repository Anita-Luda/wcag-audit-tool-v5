/* =========================================================
   summary.js – CANONICAL SUMMARY ENGINE (V3)
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     CONSTANTS
     ========================================================= */

  const VALID_STATUSES = [
    'pass',
    'fail',
    'not-applicable',
    'not-tested'
  ];

  const AREA_MAP = {
    development: 'dev',
    dev: 'dev',
    content: 'content',
    design: 'design',
    mixed: 'mixed'
  };

  const EN_GROUP_ID = '5';

  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.updateAuditSummary = function () {

    const app = window.WCAG_AUDIT_APP;

    if (!app) return;

    const definitions = app.definitions || {};
    const state = app.state || {};

    const criteria = Array.isArray(definitions.criteria)
      ? definitions.criteria
      : [];

    const rows = state.criteria || {};

    const summary = createSummaryModel();

    for (const def of criteria) {

      const row = rows[def.id] || {};

      const status = normalizeStatus(
        row.status
      );

      /* =====================================================
         WCAG / EN SPLIT
         ===================================================== */

      if (String(def.group) === EN_GROUP_ID) {

        increment(
          summary.en,
          status
        );

      } else if (
        normalizeLevel(def.level) === 'aaa'
      ) {

        increment(
          summary.wcagAAA,
          status
        );

      } else {

        increment(
          summary.wcagAA,
          status
        );
      }

      /* =====================================================
         AREAS
         ===================================================== */

      const normalizedAreas =
        normalizeAreas(row, def);

      normalizedAreas.forEach(area => {

        const key = mapArea(area);

        if (!summary.areas[key]) {
          return;
        }

        increment(
          summary.areas[key],
          status
        );
      });
    }

    renderSummary(
      'summary-aa',
      summary.wcagAA,
      true
    );

    renderSummary(
      'summary-aaa',
      summary.wcagAAA,
      true
    );

    renderSummary(
      'summary-en',
      summary.en,
      false
    );

    renderAreas(
      'summary-teams',
      summary.areas
    );
  };

  /* =========================================================
     MODEL
     ========================================================= */

  function createSummaryModel() {
    return {
      wcagAA: createCounter(),
      wcagAAA: createCounter(),
      en: createCounter(),

      areas: {
        dev: createCounter(),
        content: createCounter(),
        design: createCounter(),
        mixed: createCounter()
      }
    };
  }

  function createCounter() {
    return {
      pass: 0,
      fail: 0,
      'not-applicable': 0,
      'not-tested': 0
    };
  }

  /* =========================================================
     REDUCER
     ========================================================= */

  function increment(counter, status) {

    if (
      !counter ||
      counter[status] === undefined
    ) {
      return;
    }

    counter[status]++;
  }

  /* =========================================================
     NORMALIZATION
     ========================================================= */

  function normalizeStatus(status) {

    status = String(status || '')
      .trim()
      .toLowerCase();

    return VALID_STATUSES.includes(status)
      ? status
      : 'not-tested';
  }

  function normalizeLevel(level) {
    return String(level || '')
      .trim()
      .toLowerCase();
  }

  function normalizeAreas(row, def) {

    let values = [];

    if (
      Array.isArray(row.areas) &&
      row.areas.length
    ) {

      values = row.areas;

    } else if (def.area) {

      values = [def.area];

    } else if (def.team) {

      values = [def.team];

    } else {

      values = ['mixed'];
    }

    return [...new Set(
      values
        .map(v => String(v || '')
        .trim()
        .toLowerCase())
        .filter(Boolean)
    )];
  }

  function mapArea(area) {

    area = String(area || '')
      .trim()
      .toLowerCase();

    return AREA_MAP[area] || 'mixed';
  }

  /* =========================================================
     RENDER SUMMARY
     ========================================================= */

  function renderSummary(
    containerId,
    data,
    showCompliance
  ) {

    const el =
      document.getElementById(containerId);

    if (!el) return;

    const checked =
      data.pass +
      data.fail +
      data['not-applicable'];

    const total =
      checked +
      data['not-tested'];

    const complianceChecked =
      calculatePercent(
        data.pass +
        data['not-applicable'],
        checked
      );

    const complianceTotal =
      calculatePercent(
        data.pass +
        data['not-applicable'],
        total
      );

    el.innerHTML = `
      <ul class="summary-list">
        <li>✅ Pass: <strong>${safe(data.pass)}</strong></li>
        <li>❌ Fail: <strong>${safe(data.fail)}</strong></li>
        <li>➖ N/A: <strong>${safe(data['not-applicable'])}</strong></li>
        <li>⏳ Not tested: <strong>${safe(data['not-tested'])}</strong></li>

        ${showCompliance ? `
          <li>
            📊 Compliance (checked):
            <strong>${safe(complianceChecked)}</strong>
          </li>

          <li>
            📊 Compliance (total):
            <strong>${safe(complianceTotal)}</strong>
          </li>
        ` : ''}
      </ul>
    `;
  }

  /* =========================================================
     RENDER AREAS
     ========================================================= */

  function renderAreas(containerId, areas) {

    const el =
      document.getElementById(containerId);

    if (!el) return;

    el.innerHTML = Object.entries(areas)
      .map(([key, data]) => `
        <div class="area-block">

          <h4>${safe(
            capitalize(key)
          )}</h4>

          <ul>
            <li>✅ ${safe(data.pass)}</li>
            <li>❌ ${safe(data.fail)}</li>
            <li>➖ ${safe(data['not-applicable'])}</li>
            <li>⏳ ${safe(data['not-tested'])}</li>
          </ul>

        </div>
      `)
      .join('');
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  function calculatePercent(part, total) {

    if (!total) {
      return '—';
    }

    return Math.round(
      (part / total) * 100
    ) + '%';
  }

  function capitalize(str) {

    str = String(str || '');

    return (
      str.charAt(0).toUpperCase() +
      str.slice(1)
    );
  }

  function safe(v) {

    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

})();