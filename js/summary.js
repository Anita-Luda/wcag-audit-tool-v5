/* =========================================================
   summary.js
   Podsumowanie audytu: WCAG + EN + obszary (multi‑select)
   ========================================================= */

(function () {
  'use strict';

  /* =====================================================
     PUBLIC API
     ===================================================== */

  window.updateAuditSummary = function () {
    const app = window.WCAG_AUDIT_APP;
    if (!app || !app.definitions || !app.state) return;

    const { definitions, state } = app;

    const wcagAA = initCounters();
    const wcagAAA = initCounters();
    const en = initCounters();

    const areas = {
      dev: initCounters(),
      content: initCounters(),
      design: initCounters(),
      mixed: initCounters()
    };

    definitions.criteria.forEach(def => {
      const row = state.criteria?.[def.id] || {};
      const status = row.status || 'not-tested';

      /* ===== WCAG / EN ===== */

      if (def.group === '5') {
        increment(en, status);
      } else if (def.level === 'AAA') {
        increment(wcagAAA, status);
      } else {
        increment(wcagAA, status);
      }

      /* ===== OBSZARY (MULTI‑SELECT) ===== */

      const rowAreas = Array.isArray(row.areas) && row.areas.length
        ? row.areas
        : [def.team];

      rowAreas.forEach(area => {
        const key = mapArea(area);
        if (areas[key]) {
          increment(areas[key], status);
        }
      });
    });

    renderSection('summary-aa', wcagAA, true);
    renderSection('summary-aaa', wcagAAA, true);
    renderSection('summary-en', en, false);
    renderAreas('summary-teams', areas);
  };

  /* =====================================================
     COUNTERS
     ===================================================== */

  function initCounters() {
    return {
      pass: 0,
      fail: 0,
      'not-applicable': 0,
      'not-tested': 0
    };
  }

  function increment(counter, status) {
    if (counter[status] !== undefined) {
      counter[status]++;
    }
  }

  function mapArea(area) {
    const map = {
      development: 'dev',
      content: 'content',
      design: 'design',
      mixed: 'mixed'
    };
    return map[area] || 'mixed';
  }

  /* =====================================================
     RENDER – WCAG / EN
     ===================================================== */

  function renderSection(containerId, data, showCompliance) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const checkedTotal =
      data.pass + data.fail + data['not-applicable'];

    const allTotal =
      data.pass + data.fail + data['not-applicable'] + data['not-tested'];

    const complianceChecked =
      checkedTotal > 0
        ? percent(data.pass + data['not-applicable'], checkedTotal)
        : '—';

    const complianceAll =
      allTotal > 0
        ? percent(data.pass + data['not-applicable'], allTotal)
        : '—';

    el.innerHTML = `
      <ul class="summary-list">
        <li>✅ Spełnione: <strong>${data.pass}</strong></li>
        <li>❌ Niespełnione: <strong>${data.fail}</strong></li>
        <li>➖ Nie dotyczy: <strong>${data['not-applicable']}</strong></li>
        <li>⏳ Niesprawdzone: <strong>${data['not-tested']}</strong></li>
        ${
          showCompliance
            ? `
              <li class="summary-metric">
                📊 Zgodność (do sprawdzonych): <strong>${complianceChecked}</strong>
              </li>
              <li class="summary-metric">
                📊 Zgodność (do całości): <strong>${complianceAll}</strong>
              </li>
            `
            : ''
        }
      </ul>
    `;
  }

  /* =====================================================
     RENDER – OBSZARY
     ===================================================== */

  function renderAreas(containerId, areas) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = Object.entries(areas)
      .map(([area, data]) => `
        <h4>${capitalize(area)}</h4>
        <ul>
          <li>✅ ${data.pass}</li>
          <li>❌ ${data.fail}</li>
          <li>➖ ${data['not-applicable']}</li>
          <li>⏳ ${data['not-tested']}</li>
        </ul>
      `)
      .join('');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function percent(part, total) {
    return `${Math.round((part / total) * 100)}%`;
  }

})();