/* =========================================================
   ui-interactions-rows.js
   Interakcje wierszy: status, zapis, badge
   ========================================================= */

(function () {
  'use strict';

  // Helper do pobierania stanu wiersza
  const getRowState = (id) => window.WCAG_AUDIT_APP.state.criteria[id] || {};

  /* =====================================================
     STATUS + DOSZCZEGÓŁOWIENIE
     ===================================================== */
  function onStatusChange(e) {
    const radio = e.target;
    if (!radio.name?.startsWith('status-')) return;

    const tr = radio.closest('tr');
    const id = tr?.dataset.criterionId;
    if (!id) return;

    const row = getRowState(id);
    row.status = radio.value;

    // Czyścimy błąd, jeśli status nie jest "fail"
    if (radio.value !== 'fail') {
      delete row.failureDetail;
    }

    window.WCAG_AUDIT_APP.state.criteria[id] = row;
    window.refreshUI?.();
  }

  /* =====================================================
     ZAPIS WIERSZA
     ===================================================== */
  function saveRow(tr, id) {
    const data = {
      status: tr.querySelector(`input[name="status-${id}"]:checked`)?.value,
      failureDetail: tr.querySelector(`.failure-detail input[name="failure-${id}"]:checked`)?.value,
      issueDescription: tr.querySelector('.issue')?.value || '',
      expectedBehavior: tr.querySelector('.expected')?.value || '',
      htmlCurrent: tr.querySelector('.html-current')?.value || '',
      htmlExpected: tr.querySelector('.html-expected')?.value || ''
    };

    // Zabezpieczenie: failureDetail tylko przy błędzie
    if (data.status !== 'fail') delete data.failureDetail;

    window.WCAG_AUDIT_APP.state.criteria[id] = {
      ...getRowState(id),
      ...data
    };

    window.saveCriterionState?.(id, data);
    window.refreshUI?.();
  }

  /* =====================================================
     BADGE – OBSZAR / PRIORYTET
     ===================================================== */
  function openBadgeEditor(badgeEl) {
    if (window.WCAG_AUDIT_APP.context.mode === 'view') return;

    const tr = badgeEl.closest('tr');
    const id = tr?.dataset.criterionId;
    if (!id) return;

    const isArea = badgeEl.classList.contains('area') || badgeEl.className.includes('area-');
    const type = isArea ? 'area' : 'priority';

    const config = {
      area: {
        options: ['development', 'content', 'design', 'mixed'],
        key: 'areas'
      },
      priority: {
        options: ['critical', 'high', 'medium'],
        key: 'priorities'
      }
    }[type];

    const currentValues = getRowState(id)[config.key] || [];
    const input = prompt(`Podaj wartości (${config.options.join(', ')}):`, currentValues.join(', '));

    if (input === null) return; // Anulowano

    const newValues = input
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(v => config.options.includes(v));

    window.WCAG_AUDIT_APP.state.criteria[id] = {
      ...getRowState(id),
      [config.key]: newValues
    };

    window.saveCriterionState?.(id, window.WCAG_AUDIT_APP.state.criteria[id]);
    window.refreshUI?.();
  }

  /* =====================================================
     DELEGACJA ZDARZEŃ
     ===================================================== */
  function onClick(e) {
    const target = e.target;

    // Przycisk zapisu
    const saveBtn = target.closest('.save-row');
    if (saveBtn) {
      const tr = saveBtn.closest('tr');
      if (tr?.dataset.criterionId) saveRow(tr, tr.dataset.criterionId);
      return;
    }

    // Badge
    const badge = target.closest('.badge');
    if (badge) {
      openBadgeEditor(badge);
    }
  }

  // Inicjalizacja nasłuchiwania
  document.body.addEventListener('change', onStatusChange);
  document.body.addEventListener('click', onClick);

})();
