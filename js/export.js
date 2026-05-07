/* =========================================================
    Eksport audytu: HTML / CSV / PDF/======== */  

(function () {
  'use strict';

  /* =====================================================
     EXPORT HTML (RAPORT)
     ===================================================== */

  window.exportAuditHTML = function () {
    const { definitions, state } = window.WCAG_AUDIT_APP;
    const isWeb = state.meta.productType === 'web';

    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8" />
<title>Raport audytu dostępności – WCAG 2.2 / EN</title>

<style>
  body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    background: #f7f6fb;
    color: #1e1e2f;
    padding: 32px;
  }

  h1 {
    color: #3b2b5f;
    margin-bottom: 8px;
  }

  h2 {
    color: #3b2b5f;
    margin-top: 48px;
  }

  .meta {
    background: #ffffff;
    border-radius: 16px;
    padding: 16px 20px;
    box-shadow: 0 6px 18px rgba(91,63,163,0.15);
    margin-bottom: 32px;
  }

  .meta p {
    margin: 4px 0;
    font-size: 14px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: #ffffff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 6px 18px rgba(91,63,163,0.1);
    margin-bottom: 32px;
  }

  th {
    background: #f0ebff;
    color: #3b2b5f;
    text-align: left;
    font-size: 13px;
    padding: 10px;
  }

  td {
    padding: 10px;
    border-top: 1px solid #e6e2f3;
    font-size: 13px;
    vertical-align: top;
  }

  .criterion-name {
    font-weight: 600;
  }

  .criterion-desc {
    margin-top: 4px;
    font-size: 12px;
    color: #666666;
  }

  .badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    text-transform: capitalize;
  }

  .area-dev { background: #e3f2fd; color: #0d47a1; }
  .area-content { background: #e8f5e9; color: #1b5e20; }
  .area-design { background: #f3e5f5; color: #4a148c; }
  .area-mixed { background: #ede7f6; color: #4527a0; }

  .priority-critical { background: #fdecea; color: #b00020; }
  .priority-high { background: #fff4e5; color: #e65100; }
  .priority-medium { background: #fffde7; color: #9e7700; }

  .status-pass { color: #2e7d32; font-weight: 600; }
  .status-fail { color: #c62828; font-weight: 600; }
  .status-na,
  .status-nt { color: #555555; }

  code {
    display: block;
    background: #f6f4ff;
    padding: 8px;
    border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 12px;
    white-space: pre-wrap;
  }
</style>
</head>

<body>

<h1>Raport audytu dostępności – WCAG 2.2 / EN 301 549</h1>

<div class="meta">
  <p><strong>Aplikacja:</strong> ${state.meta.auditedApplication || '—'}</p>
  <p><strong>Typ produktu:</strong> ${state.meta.productType}</p>
  <p><strong>Data rozpoczęcia:</strong> ${formatDate(state.meta.auditStartedAt)}</p>
  <p><strong>Ostatnia modyfikacja:</strong> ${formatDate(state.meta.auditLastModifiedAt)}</p>
</div>

${renderGroups(definitions, state, isWeb)}

</body>
</html>
    `;

    downloadFile(html, 'raport-wcag.html', 'text/html');
  };

  /* =====================================================
     GROUPS
     ===================================================== */

  function renderGroups(definitions, state, isWeb) {
    return definitions.groups.map(group => {
      const rows = definitions.criteria
        .filter(c => c.group === group.id)
        .map(def => renderRow(def, state.criteria[def.id] || {}, isWeb))
        .join('');

      return `
<h2>${group.number}. ${group.name}</h2>

<table>
  <thead>
    <tr>
      <th>Nr</th>
      <th>Kryterium</th>
      <th>Poziom</th>
      <th>Status</th>
      <th>Co jest nie tak</th>
      <th>Jak powinno być</th>
      ${isWeb ? '<th>Kod – teraz</th><th>Kod – poprawnie</th>' : ''}
      <th>Obszar</th>
      <th>Priorytet</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
      `;
    }).join('');
  }

  function renderRow(def, row, isWeb) {
    const statusMap = {
      pass: '✅ OK',
      fail: '❌ Nie OK',
      'not-applicable': '➖ ND',
      'not-tested': '⏳ NS'
    };

    const statusClass = {
      pass: 'status-pass',
      fail: 'status-fail',
      'not-applicable': 'status-na',
      'not-tested': 'status-nt'
    }[row.status] || 'status-nt';

    const level = def.group === '5' ? 'EN' : def.level;

    return `
<tr>
  <td>${def.number}</td>
  <td>
    <div class="criterion-name">${def.name}</div>
    <div class="criterion-desc">${def.description || ''}</div>
  </td>
  <td>${level}</td>
  <td class="${statusClass}">${statusMap[row.status] || '⏳ NS'}</td>
  <td>${row.issueDescription || ''}</td>
  <td>${row.expectedBehavior || ''}</td>
  ${
    isWeb
      ? `
  <td><code>${escapeHTML(row.htmlCurrent || '')}</code></td>
  <td><code>${escapeHTML(row.htmlExpected || '')}</code></td>
  `
      : ''
  }
  <td><span class="badge area-${mapArea(def.team)}">${mapArea(def.team)}</span></td>
  <td><span class="badge priority-${def.priority}">${priorityLabel(def.priority)}</span></td>
</tr>
    `;
  }

  /* =====================================================
     HELPERS
     ===================================================== */

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function formatDate(iso) {
    return iso ? new Date(iso).toLocaleString('pl-PL') : '—';
  }

  function mapArea(team) {
    return {
      development: 'dev',
      content: 'content',
      design: 'design',
      mixed: 'mixed'
    }[team] || team;
  }

  function priorityLabel(priority) {
    return {
      critical: '🔴 Krytyczny',
      high: '🟠 Wysoki',
      medium: '🟡 Średni'
    }[priority] || priority;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

})();