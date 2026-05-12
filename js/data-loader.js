(function () {
  'use strict';

  const DEFINITIONS_PATH = 'data/wcag-2.2-definitions.json';

  /* =========================================================
     WCAG DEFINITIONS
     ========================================================= */

  window.loadWCAGDefinitions = async function () {
    try {
      const res = await fetch(DEFINITIONS_PATH, { cache: 'no-store' });

      if (!res.ok) throw new Error('WCAG definitions not found');

      return await res.json();

    } catch (e) {
      console.error('❌ WCAG load error:', e);
      return { groups: [], criteria: [] };
    }
  };

  /* =========================================================
     AUDIT LOADER (CLEAN VERSION - NO FALLBACK LOGIC)
     ========================================================= */

  window.loadAuditState = async function (auditId = 'default') {
    try {
      ensureAuditId(auditId);

      const res = await fetch(`/api/audits/${auditId}/draft`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Audit load failed: ${res.status}`);
      }

      const data = await res.json();

      const state = normalizeState(data);
      const context = normalizeContext(auditId, state);

      return { state, context };

    } catch (e) {
      console.error('❌ loadAuditState failed:', e);

      return createEmptyAuditState(auditId);
    }
  };

  /* =========================================================
     NORMALIZATION (SINGLE SOURCE OF TRUTH)
     ========================================================= */

  function normalizeState(data) {
    const state = data || {};

    return {
      criteria: state.criteria || {},
      meta: {
        appName: state.meta?.appName || '',
        productType: state.meta?.productType || 'web',
        auditStartedAt: state.meta?.auditStartedAt || new Date().toISOString(),
        auditLastModifiedAt: new Date().toISOString()
      }
    };
  }

  function normalizeContext(auditId, state) {
    return {
      auditId,
      mode: 'edit',
      version: 'draft',
      isNew: !state.criteria || Object.keys(state.criteria).length === 0
    };
  }

  /* =========================================================
     EMPTY STATE (MATCH BACKEND 1:1)
     ========================================================= */

  function createEmptyAuditState(auditId) {
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

  /* =========================================================
     SAFETY
     ========================================================= */

  function ensureAuditId(id) {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid auditId');
    }
  }

})();
