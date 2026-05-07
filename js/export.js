/* =========================================================
   export-audit.js – STRICT EXPORT ENGINE (V3 STABLE)
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     PUBLIC EXPORT
     ========================================================= */

  window.exportAuditHTML = function () {
    const app = window.WCAG_AUDIT_APP;

    if (!app?.definitions?.criteria || !app?.state) {
      console.error('❌ Export failed: missing state');
      return;
    }

    const html = buildHTML(
      app.definitions,
      app.state
    );

    download(
      html,
      'audit-report.html',
      'text/html'
    );
  };

  /* =========================================================
     MAIN HTML
     ========================================================= */

  function buildHTML(definitions, state) {
    return `
<!DOCTYPE html>
<html lang="pl">
<head>

<meta charset="UTF-8" />

<title>Raport audytu WCAG 2.2 / EN</title>

<style>

body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background: #f7f7fb;
  color: #222;
}

h1 {
  margin-bottom: 32px;
}

h2 {
  margin-top: 40px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 48px;
  background: #fff;
}

th,
td {
  border: 1px solid #ddd;
  padding: 8px;
  font-size: 13px;
  vertical-align: top;
}

th {
  background: #f0f0f6;
  font-weight: 600;
}

.ok {
  color: #2e7d32;
  font-weight: 700;
}

.fail {
  color: #c62828;
  font-weight: 700;
}

.na {
  color: #777;
}

.nt {
  color: #999;
}

code {
  display: block;
  white-space: pre-wrap;
  background: #f5f5ff;
  border-radius: 6px;
  padding: 6px;
  margin-top: 4px;
}

.multi {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.badge {
  background: #ececff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
}

</style>

</head>

<body>

<h1>Raport audytu WCAG 2.2 / EN 301 549</h1>

${definitions.groups
  .map(group =>
    renderGroup(group, definitions.criteria, state)
  )
  .join('')}

</body>
</html>
    `;
  }

  /* =========================================================
     GROUP
     ========================================================= */

  function renderGroup(group, criteria, state) {
    const rows = criteria
      .filter(c => c.group === group.id)
      .map(c =>
        renderRow(
          c,
          state.criteria?.[c.id] || {}
        )
      )
      .join('');

    return `
<h2>${escape(group.number)}. ${escape(group.name)}</h2>

<table>

<thead>
<tr>

<th>Nr</th>
<th>Kryterium</th>
<th>Poziom</th>
<th>Status</th>
<th>Problem</th>
<th>Oczekiwane</th>

<th>HTML aktualny</th>
<th>HTML poprawny</th>

<th>Obszar</th>
<th>Priorytet</th>

</tr>
</thead>

<tbody>
${rows}
</tbody>

</table>
    `;
  }

  /* =========================================================
     ROW
     ========================================================= */

  function renderRow(def, row) {
    const status = normalizeStatus(row.status);

    const statusMap = {
      pass: ['ok', 'OK'],
      fail: ['fail', 'NOK'],
      'not-applicable': ['na', 'N/A'],
      'not-tested': ['nt', 'NS']
    };

    const [cls, label] =
      statusMap[status] ||
      statusMap['not-tested'];

    const areas = resolveAreas(def, row);

    const priorities = resolvePriorities(def, row);

    return `
<tr>

<td>
  ${escape(def.number)}
</td>

<td>
  <strong>${escape(def.name)}</strong>
  <br/>
  ${escape(def.description || '')}
</td>

<td>
  ${escape(def.group === '5'
    ? 'EN'
    : def.level)}
</td>

<td class="${cls}">
  ${label}
</td>

<td>
  ${escape(row.issueDescription || '')}
</td>

<td>
  ${escape(row.expectedBehavior || '')}
</td>

<td>
  <code>${escape(row.htmlCurrent || '')}</code>
</td>

<td>
  <code>${escape(row.htmlExpected || '')}</code>
</td>

<td>
  ${renderBadges(areas)}
</td>

<td>
  ${renderBadges(priorities)}
</td>

</tr>
    `;
  }

  /* =========================================================
     BADGES
     ========================================================= */

  function renderBadges(values) {
    return `
<div class="multi">
  ${values.map(v => `
    <span class="badge">
      ${escape(v)}
    </span>
  `).join('')}
</div>
    `;
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

  function resolveAreas(def, row) {
    if (Array.isArray(row.areas) && row.areas.length) {
      return row.areas;
    }

    if (def.area) {
      return [def.area];
    }

    if (def.team) {
      return [def.team];
    }

    return ['mixed'];
  }

  function resolvePriorities(def, row) {
    if (
      Array.isArray(row.priorities) &&
      row.priorities.length
    ) {
      return row.priorities;
    }

    if (row.priority) {
      return [row.priority];
    }

    if (def.priority) {
      return [def.priority];
    }

    return ['medium'];
  }

  /* =========================================================
     ESCAPE
     ========================================================= */

  function escape(str) {
    if (str === null || str === undefined) {
      return '';
    }

    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* =========================================================
     DOWNLOAD
     ========================================================= */

  function download(content, filename, type) {
    const blob = new Blob([content], { type });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);
  }

})();