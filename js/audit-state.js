(function () {
  'use strict';

  /* =========================================================
     WCAG DEFINITIONS (OK – zostaje)
     ========================================================= */

  window.loadWCAGDefinitions = async function () {
    try {
      const res = await fetch('data/wcag-2.2-definitions.json');

      if (!res.ok) throw new Error('WCAG not found');

      return await res.json();

    } catch (e) {
      console.error("❌ WCAG load error:", e);
      return { groups: [], criteria: [] };
    }
  };

  /* =========================================================
     LOAD AUDIT STATE (CLEAN - NO NORMALIZATION HERE)
     ========================================================= */

  window.loadAuditState = async function (auditId = 'default') {
    try {
      const res = await fetch(`/api/audits/${auditId}/draft`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Audit not found: ${auditId}`);
      }

      const state = await res.json();

      return {
        state,
        context: {
          auditId,
          mode: 'edit',
          version: 'draft',
          isNew: Object.keys(state?.criteria || {}).length === 0
        }
      };

    } catch (e) {
      console.error("❌ loadAuditState:", e);

      return createEmptyState(auditId);
    }
  };

  /* =========================================================
     SAVE STATE (UNCHANGED BUT CLEANED)
     ========================================================= */

  window.saveState = async function (auditId, state) {
    if (!auditId || !state) return false;

    try {
      const res = await fetch(`/api/audits/${auditId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });

      if (!res.ok) return false;

      const result = await res.json();
      return result?.status === 'saved';

    } catch (e) {
      console.error("❌ saveState:", e);
      return false;
    }
  };

  /* =========================================================
     EMPTY STATE (MATCH BACKEND 1:1)
     ========================================================= */

  function createEmptyState(auditId = 'default') {
    return {
      state: {
        criteria: {},
        meta: {
          appName: '',
          productType: 'web',
          auditStartedAt: new Date().toISOString(),
          auditLastModifiedAt: new Date().toISOString()
        }
      },
      context: {
        auditId,
        mode: 'edit',
        version: 'draft',
        isNew: true
      }
    };
  }

})();