/* =========================================================
   ui-interactions-lifecycle.js – PROJECT LIFECYCLE (V4)
   ========================================================= */

(function () {
  'use strict';

  window.lifecycle = {
    async init() {
      bindAuditSelector();
      bindVersionSelector();
      bindModeSelector();
      bindProductTypeSelector();
      bindCreateAuditButton();
      bindSaveVersionButton();
      await initializeAuditSelector();
    }
  };

  /* =========================================================
     REFRESH
     ========================================================= */

  function refreshApplicationUI() {
    window.refreshUI?.();
    syncModeRadios();
    syncProductTypeUI();
  }

  /* =========================================================
     AUDIT SELECTOR
     ========================================================= */

  async function initializeAuditSelector(preferId) {
    const select = document.getElementById('audit-selector');
    if (!select) return;

    try {
      const res = await fetch('/api/audits');
      if (!res.ok) throw new Error('Cannot load audits');
      const audits = await res.json();

      if (!audits.length) {
        select.innerHTML = '<option value="default">default</option>';
        await loadDraft('default');
        return;
      }

      select.innerHTML = audits.map(audit => `
        <option value="${escapeHTML(audit.id)}">${escapeHTML(audit.name || audit.id)}</option>
      `).join('');

      const ctx = window.WCAG_AUDIT_APP.context;
      const selectedAuditId = preferId || ctx.auditId || 'default';
      select.value = selectedAuditId;

      if (preferId || !window.WCAG_AUDIT_APP.state.criteria || Object.keys(window.WCAG_AUDIT_APP.state.criteria).length === 0) {
        await loadDraft(selectedAuditId);
      }
    } catch (e) {
      console.error('❌ initializeAuditSelector:', e);
    }
  }

  function bindCreateAuditButton() {
    const btn = document.getElementById('create-audit-btn');
    const input = document.getElementById('app-name');
    if (!btn || !input) return;

    btn.addEventListener('click', async () => {
      const name = input.value.trim();
      if (!name) {
        window.kawaii?.alert('Podaj nazwę aplikacji, aby stworzyć nowy audyt.');
        return;
      }
      showCreateAuditDialog(name);
    });
  }

  function bindSaveVersionButton() {
    const btn = document.getElementById('save-version-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const auditId = window.WCAG_AUDIT_APP.context.auditId;
      if (!auditId || auditId === 'default') {
        window.kawaii?.alert('Najpierw wybierz lub utwórz projekt, aby zapisać wersję.');
        return;
      }
      saveAsVersion(auditId);
    });
  }

  async function showCreateAuditDialog(name) {
    const auditsRes = await fetch('/api/audits');
    const audits = auditsRes.ok ? await auditsRes.json() : [];
    const currentAuditId = window.WCAG_AUDIT_APP.context.auditId;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>✨ Co chcesz zrobić?</h3>

        <div class="modal-options">
          <label class="modal-option">
            <input type="radio" name="create-action" value="empty" checked>
            <span>🆕 Utwórz nowy, pusty audyt dla "${escapeHTML(name)}"</span>
          </label>

          <label class="modal-option">
            <input type="radio" name="create-action" value="save-new">
            <span>💾 Zapisz obecną pracę jako NOWY audyt "${escapeHTML(name)}"</span>
          </label>

          <label class="modal-option">
            <input type="radio" name="create-action" value="save-version">
            <span>📦 Zapisz jako nową wersję istniejącego audytu:</span>
          </label>

          <div class="modal-select-wrapper" id="modal-select-container" style="display: none;">
            <select id="modal-audit-target" class="modal-select">
              ${audits.map(a => `<option value="${a.id}" ${a.id === currentAuditId ? 'selected' : ''}>${escapeHTML(a.name || a.id)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="modal-actions">
          <button id="modal-cancel" class="btn-secondary">Anuluj</button>
          <button id="modal-confirm" class="btn-primary-kawaii">Potwierdź ✨</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const selectContainer = overlay.querySelector('#modal-select-container');
    overlay.querySelectorAll('input[name="create-action"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectContainer.style.display = e.target.value === 'save-version' ? 'block' : 'none';
        });
    });

    const close = () => overlay.remove();
    overlay.querySelector('#modal-cancel').onclick = close;

    overlay.querySelector('#modal-confirm').onclick = async () => {
      const action = overlay.querySelector('input[name="create-action"]:checked').value;
      const targetAuditId = overlay.querySelector('#modal-audit-target').value;
      close();

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const newAuditId = `${slug}-${dateStr}`;
      const fullName = `${name} (${dateStr})`;

      if (action === 'empty') {
        await createAudit(newAuditId, fullName, null);
      } else if (action === 'save-new') {
        await createAudit(newAuditId, fullName, window.WCAG_AUDIT_APP.state);
      } else if (action === 'save-version') {
        await saveAsVersion(targetAuditId);
      }
    };
  }

  async function createAudit(id, name, state) {
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, state })
      });
      if (res.status === 409) {
        window.kawaii?.alert('Audyt o tym ID już istnieje.');
        return;
      }
      if (!res.ok) throw new Error('Failed to create audit');
      await initializeAuditSelector(id);
    } catch (e) {
      window.kawaii?.alert('Błąd: ' + e.message);
    }
  }

  async function saveAsVersion(auditId) {
    try {
      const suggestedName = `v_${new Date().toLocaleDateString().replace(/\./g, '-')}`;
      const versionName = await window.kawaii?.prompt('Podaj nazwę wersji:', suggestedName);
      if (!versionName) return;

      // Check for existing versions
      const resVersions = await fetch(`/api/audits/${auditId}/versions`);
      const existingVersions = resVersions.ok ? await resVersions.json() : [];

      if (existingVersions.includes(versionName)) {
        const confirmOverwrite = await window.kawaii?.confirm(`Wersja "${versionName}" już istnieje. Czy chcesz ją nadpisać?`);
        if (!confirmOverwrite) return;
      }

      await fetch(`/api/audits/${auditId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(window.WCAG_AUDIT_APP.state)
      });

      await fetch(`/api/audits/${auditId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: versionName })
      });

      window.kawaii?.alert(`Dodano wersję ${versionName} do audytu ${auditId}`);
      await initializeAuditSelector(auditId);
    } catch (e) {
      window.kawaii?.alert('Błąd wersji: ' + e.message);
    }
  }

  function bindAuditSelector() {
    const select = document.getElementById('audit-selector');
    if (!select) return;
    select.addEventListener('change', async () => {
      const ctx = window.WCAG_AUDIT_APP.context;
      ctx.auditId = select.value;
      ctx.version = 'draft';
      ctx.mode = 'edit';
      await loadDraft(ctx.auditId);
    });
  }

  function bindVersionSelector() {
    const select = document.getElementById('version-selector');
    if (!select) return;
    select.addEventListener('change', async () => {
      const ctx = window.WCAG_AUDIT_APP.context;
      ctx.version = select.value;
      if (ctx.version === 'draft') {
        await loadDraft(ctx.auditId);
      } else {
        await loadVersion(ctx.auditId, ctx.version);
      }
    });
  }

  window.refreshVersionSelector = async function (auditId) {
    const select = document.getElementById('version-selector');
    if (!select) return;
    try {
      const res = await fetch(`/api/audits/${auditId}/versions`);
      const versions = res.ok ? await res.json() : [];
      select.innerHTML = '<option value="draft">Draft</option>' +
        versions.map(v => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join('');
      select.value = window.WCAG_AUDIT_APP.context.version || 'draft';
    } catch (e) {
      console.error('❌ refreshVersionSelector:', e);
    }
  };

  async function loadDraft(auditId) {
    try {
      const res = await fetch(`/api/audits/${auditId}/draft`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Draft load failed');
      const state = await res.json();
      const app = window.WCAG_AUDIT_APP;
      app.state = normalizeState(state);
      app.context.auditId = auditId;
      app.context.version = 'draft';
      app.context.mode = 'edit';
      await window.refreshVersionSelector(auditId);
      refreshApplicationUI();
    } catch (e) {
      console.error('❌ loadDraft:', e);
    }
  }

  async function loadVersion(auditId, version) {
    try {
      const res = await fetch(`/api/audits/${auditId}/versions/${version}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Version load failed');
      const state = await res.json();
      const app = window.WCAG_AUDIT_APP;
      app.state = normalizeState(state);
      app.context.auditId = auditId;
      app.context.version = version;
      app.context.mode = 'view';
      refreshApplicationUI();
    } catch (e) {
      console.error('❌ loadVersion:', e);
    }
  }

  function bindModeSelector() {
    document.querySelectorAll('input[name="audit-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        window.WCAG_AUDIT_APP.context.mode = radio.value;
        refreshApplicationUI();
      });
    });
  }

  function syncModeRadios() {
    const mode = window.WCAG_AUDIT_APP.context.mode;
    document.querySelectorAll('input[name="audit-mode"]').forEach(radio => {
      radio.checked = radio.value === mode;
    });
  }

  function bindProductTypeSelector() {
    document.querySelectorAll('input[name="product-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        window.WCAG_AUDIT_APP.state.meta.productType = radio.value;
        refreshApplicationUI();
        window.triggerAutosave?.();
      });
    });
  }

  function syncProductTypeUI() {
    const type = window.WCAG_AUDIT_APP.state?.meta?.productType || 'web';
    document.querySelectorAll('input[name="product-type"]').forEach(radio => {
      radio.checked = radio.value === type;
    });
  }

  function normalizeState(state) {
    if (!state || typeof state !== 'object') state = {};
    if (!state.criteria) state.criteria = {};
    if (!state.meta) state.meta = {};
    state.meta.productType = state.meta.productType || 'web';
    return state;
  }

  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
