/* =========================================================
   app.js
   Bootstrap aplikacji audytu WCAG 2.2
   ========================================================= */

(function () {
  'use strict';

  /* =====================================================
     GLOBAL NAMESPACE
     ===================================================== */

  window.WCAG_AUDIT_APP = {
    definitions: null,
    state: null
  };

  /* =====================================================
     START
     ===================================================== */

  document.addEventListener('DOMContentLoaded', initApp);

  async function initApp() {
    try {
      console.info('[WCAG] Init application');

      await loadData();
      initUI();
      initGlobalActions();
      updateMetaUI();

      console.info('[WCAG] Application ready');
    } catch (error) {
      console.error('[WCAG] Init failed', error);
      alert(
        'Nie udało się uruchomić aplikacji audytu WCAG.\n' +
        'Sprawdź, czy wszystkie pliki są dostępne.'
      );
    }
  }

  /* =====================================================
     DATA
     ===================================================== */

  async function loadData() {
    if (!window.loadWCAGDefinitions || !window.loadAuditState) {
      throw new Error('Data loader missing');
    }

    WCAG_AUDIT_APP.definitions = await window.loadWCAGDefinitions();
    WCAG_AUDIT_APP.state = await window.loadAuditState();
  }

  /* =====================================================
     UI INIT
     ===================================================== */

  function initUI() {
    if (!window.renderAuditTables) {
      throw new Error('ui.js missing');
    }

    window.renderAuditTables(
      WCAG_AUDIT_APP.definitions,
      WCAG_AUDIT_APP.state
    );

    if (typeof window.updateAuditSummary === 'function') {
      window.updateAuditSummary();
    }
  }

  /* =====================================================
     META UI
     ===================================================== */

  function updateMetaUI() {
    const { meta } = WCAG_AUDIT_APP.state;

    setText('audit-start-date', meta.auditStartedAt);
    setText('audit-last-modified', meta.auditLastModifiedAt);

    const appNameInput = document.getElementById('app-name');
    if (appNameInput && meta.auditedApplication) {
      appNameInput.value = meta.auditedApplication;
    }
  }

  function setText(id, iso) {
    const el = document.getElementById(id);
    if (!el || !iso) return;
    el.textContent = formatDate(iso);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('pl-PL');
  }

  /* =====================================================
     GLOBAL ACTIONS
     ===================================================== */

  function initGlobalActions() {
    bind('save-version-btn', saveAuditVersion);
    bind('export-html-btn', exportHTML);
    bind('export-csv-btn', exportCSV);
    bind('export-pdf-btn', exportPDF);
  }

  function bind(id, handler) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', handler);
    }
  }

  function saveAuditVersion() {
    if (typeof window.saveAuditVersionToFile === 'function') {
      window.saveAuditVersionToFile();
    }
  }

  function exportHTML() {
    if (typeof window.exportAuditHTML === 'function') {
      window.exportAuditHTML();
    }
  }

  function exportCSV() {
    if (typeof window.exportAuditCSV === 'function') {
      window.exportAuditCSV();
    }
  }

  function exportPDF() {
    window.print();
  }

})();