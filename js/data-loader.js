/* =========================================================
   data-loader.js
   Ładowanie definicji, audytów i wersji (draft + versions)
   ========================================================= */

(function () {
  'use strict';

  const DEFINITIONS_PATH = 'data/wcag-2.2-definitions.json';

  /* =====================================================
     PUBLIC API (ZACHOWANE)
     ===================================================== */

  window.loadWCAGDefinitions = async function () {
    const response = await fetch(DEFINITIONS_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Nie można załadować wcag-2.2-definitions.json');
    }
    return response.json();
  };

  window.loadAuditState = async function () {
    const audits = await fetchAudits();
    if (!audits.length) {
      return createEmptyAuditState();
    }

    const selectedAuditId = audits[0].id;
    const draft = await fetchDraft(selectedAuditId);

    return {
      __context: {
        selectedAuditId,
        selectedVersion: 'draft',
        mode: 'edit'
      },
      ...draft
    };
  };

  /* =====================================================
     INTERNAL – AUDITS
     ===================================================== */

  async function fetchAudits() {
    const res = await fetch('/api/audits', { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  }

  async function fetchDraft(auditId) {
    const res = await fetch(`/api/audits/${auditId}/draft`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      return createEmptyAuditState();
    }

    return res.json();
  }

  async function fetchVersion(auditId, version) {
    const res = await fetch(
      `/api/audits/${auditId}/versions/${version}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      throw new Error('Nie można załadować wersji audytu');
    }

    return res.json();
  }

  /* =====================================================
     STATE FACTORY
     ===================================================== */

  function createEmptyAuditState() {
    const now = new Date().toISOString();

    return {
      meta: {
        auditedApplication: '',
        standard: 'WCAG 2.2 + EN 301 549',
        productType: 'web',
        mode: 'edit',
        auditStartedAt: now,
        auditLastModifiedAt: now
      },
      criteria: {}
    };
  }

})();