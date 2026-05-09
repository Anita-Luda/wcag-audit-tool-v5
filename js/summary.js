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
    design: 'design'
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
        design: createCounter()
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

    return AREA_MAP[area];
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
      <div class="summary-card">
        <div class="summary-stats">
          <div class="stat-item stat-pass">
            <span class="stat-icon">✅</span>
            <span class="stat-value">${safe(data.pass)}</span>
            <span class="stat-label">Pass</span>
          </div>
          <div class="stat-item stat-fail">
            <span class="stat-icon">❌</span>
            <span class="stat-value">${safe(data.fail)}</span>
            <span class="stat-label">Fail</span>
          </div>
          <div class="stat-item stat-na">
            <span class="stat-icon">➖</span>
            <span class="stat-value">${safe(data['not-applicable'])}</span>
            <span class="stat-label">N/A</span>
          </div>
          <div class="stat-item stat-nt">
            <span class="stat-icon">⏳</span>
            <span class="stat-value">${safe(data['not-tested'])}</span>
            <span class="stat-label">N/T</span>
          </div>
        </div>

        ${showCompliance ? `
          <div class="summary-compliance">
            <div class="compliance-item">
              <span class="compliance-label">ZBADANE</span>
              <span class="compliance-value">${safe(complianceChecked)}</span>
            </div>
            <div class="compliance-item">
              <span class="compliance-label">CAŁOŚĆ</span>
              <span class="compliance-value">${safe(complianceTotal)}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /* =========================================================
     RENDER AREAS
     ========================================================= */

  function renderAreas(containerId, areas) {

    const el =
      document.getElementById(containerId);

    if (!el) return;

    el.innerHTML = `
      <div class="areas-grid">
        ${Object.entries(areas).map(([key, data]) => `
          <div class="area-card area-${key}">
            <h4>${safe(capitalize(key))}</h4>
            <div class="area-stats-mini">
              <div class="mini-stat" title="Pass">✅ <span>${safe(data.pass)}</span></div>
              <div class="mini-stat" title="Fail">❌ <span>${safe(data.fail)}</span></div>
              <div class="mini-stat" title="N/A">➖ <span>${safe(data['not-applicable'])}</span></div>
              <div class="mini-stat" title="N/T">⏳ <span>${safe(data['not-tested'])}</span></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
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