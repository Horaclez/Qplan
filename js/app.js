(function () {
  const STAGES = [
    { num: 1, label: 'FODA' },
    { num: 2, label: 'Abordabilidad' },
    { num: 3, label: 'Matriz Likert' },
    { num: 4, label: 'Delimitación 5W' },
    { num: 5, label: 'Causas Raíz' },
    { num: 6, label: 'Objetivos' },
    { num: 7, label: 'Indicadores' },
    { num: 8, label: 'Plan Operativo' }
  ];

  let currentStage = 1;
  let isReportMode = false;

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(window.QPlanState.THEME_KEY, theme);
    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.setTheme === theme);
    });
  }

  function runQuickAudit(plan) {
    const alerts = [];
    let checksPassed = 0;
    const totalChecks = 8;

    const probs = window.QPlanState.getFodaProblems(plan);
    if (probs.length > 0) checksPassed++;
    else alerts.push('Etapa 1: Registra al menos una Debilidad o Amenaza en el FODA.');

    const missingJust = probs.filter((p) => {
      const ab = plan.abordabilidad[p.id];
      return ab && ab.abordable === false && !ab.justificacion.trim();
    });
    if (probs.length > 0 && missingJust.length === 0) checksPassed++;
    else if (missingJust.length > 0) alerts.push(`Etapa 2: Faltan ${missingJust.length} justificación(es) en problemas marcados como No Abordables.`);

    const { winner } = window.QPlanState.getPrioritizationRanking(plan);
    if (winner) checksPassed++;
    else alerts.push('Etapa 3: Puntúa los problemas abordables en la Matriz Likert (1-6) para definir el Problema Principal.');

    const d = plan.delimitacion;
    if (d.que && d.como && d.donde && d.cuando && d.cuantoValor !== '') checksPassed++;
    else alerts.push('Etapa 4: Completa los 5 campos (Qué, Cómo, Dónde, Cuándo y Cuánto) de delimitación.');

    if ((plan.causas.priorizadasIds || []).length === 3) checksPassed++;
    else alerts.push('Etapa 5: Selecciona exactamente 3 causas raíz principales para intervenir.');

    const oes = plan.objetivos.especificos || [];
    const infinitiveRegex = /^[a-záéíóúñ]+(ar|er|ir)\b/i;
    const validOes = oes.length === 3 && oes.every((oe) => infinitiveRegex.test(oe.texto.trim()) && /\d+/.test(oe.texto) && oe.plazoSemanas > 0);
    if (validOes && infinitiveRegex.test((plan.objetivos.general || '').trim()) && /\d+/.test(plan.objetivos.general || '')) checksPassed++;
    else alerts.push('Etapa 6: Verifica que el OG y los 3 OE inicien con verbo en infinitivo, incluyan cifra y plazo.');

    const everyOeHasInd = oes.length === 3 && oes.every((oe) => (plan.indicadores || []).some((ind) => ind.oeId === oe.id && ind.nombre && ind.formula));
    if (everyOeHasInd) checksPassed++;
    else alerts.push('Etapa 7: Formula al menos 1 indicador completo por cada Objetivo Específico.');

    const acts = plan.operativo.actividades || [];
    const completeActs = acts.length > 0 && acts.every((a) => a.que && a.quien && a.donde && a.recursos && a.verificacion && (a.semanas || []).length > 0);
    const ganttOverflow = acts.some((a) => {
      const parentOe = oes.find((o) => o.id === a.oeId);
      const limit = parentOe ? Number(parentOe.plazoSemanas) : Number(plan.horizonWeeks) || 12;
      return (a.semanas || []).some((w) => w > limit);
    });

    if (ganttOverflow) {
      alerts.push('Etapa 8 (Carta Gantt): Hay actividades programadas fuera del plazo declarado en su Objetivo Específico.');
    } else if (completeActs) {
      checksPassed++;
    } else {
      alerts.push('Etapa 8: Completa los 6 datos obligatorios y semanas Gantt en todas las actividades.');
    }

    const pct = Math.round((checksPassed / totalChecks) * 100);
    document.getElementById('auditScore').textContent = `${pct}%`;
    document.getElementById('auditCurrentMsg').textContent =
      alerts.length === 0
        ? 'Coherencia metodológica completa de principio a fin.'
        : alerts[0];

    const panel = document.getElementById('auditDetailsPanel');
    panel.innerHTML = alerts.length === 0
      ? '<p style="margin:0;color:var(--success);font-weight:600;">✓ Todas las reglas metodológicas están cumplidas.</p>'
      : `<ul>${alerts.map((a) => `<li>${a}</li>`).join('')}</ul>`;
  }

  function renderPlanSelector() {
    const selector = document.getElementById('planSelector');
    const plans = window.QPlanState.getAllPlans();
    const active = window.QPlanState.getActivePlan();
    selector.innerHTML = plans
      .map((p) => `<option value="${p.id}" ${p.id === active.id ? 'selected' : ''}>${p.title} (${p.unit})</option>`)
      .join('');
  }

  function renderStepper() {
    const nav = document.getElementById('stageNav');
    nav.innerHTML = STAGES.map(
      (s) => `
        <li>
          <button type="button" class="step-tab ${!isReportMode && s.num === currentStage ? 'active' : ''}" data-stage="${s.num}">
            <span class="step-num">${s.num}</span>
            <span>${s.label}</span>
          </button>
        </li>
      `
    ).join('');

    nav.querySelectorAll('.step-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        isReportMode = false;
        currentStage = Number(btn.dataset.stage);
        renderApp();
      });
    });

    document.getElementById('stageStepIndicator').textContent = isReportMode
      ? 'Vista de Informe Formal'
      : `Etapa ${currentStage} de 8 — ${STAGES[currentStage - 1].label}`;
    document.getElementById('btnPrevStage').disabled = isReportMode || currentStage === 1;
    document.getElementById('btnNextStage').disabled = isReportMode || currentStage === 8;
  }

  function renderStageContent() {
    const container = document.getElementById('stageContainer');
    const plan = window.QPlanState.getActivePlan();

    if (isReportMode) {
      return window.QPlanReport.renderFormalReport(container, plan, () => {
        isReportMode = false;
        renderApp();
      });
    }

    const onUpdate = (shouldRerender) => {
      window.QPlanState.save();
      renderPlanSelector();
      runQuickAudit(plan);
      if (shouldRerender) renderStageContent();
    };

    if (currentStage === 1) return window.QPlanStages1to4.renderStage1(container, plan, onUpdate);
    if (currentStage === 2) return window.QPlanStages1to4.renderStage2(container, plan, onUpdate);
    if (currentStage === 3) return window.QPlanStages1to4.renderStage3(container, plan, onUpdate);
    if (currentStage === 4) return window.QPlanStages1to4.renderStage4(container, plan, onUpdate);
    if (currentStage === 5) return window.QPlanStages5to8.renderStage5(container, plan, onUpdate);
    if (currentStage === 6) return window.QPlanStages5to8.renderStage6(container, plan, onUpdate);
    if (currentStage === 7) return window.QPlanStages5to8.renderStage7(container, plan, onUpdate);
    if (currentStage === 8) return window.QPlanStages5to8.renderStage8(container, plan, onUpdate);
  }

  function renderApp() {
    renderPlanSelector();
    renderStepper();
    renderStageContent();
    runQuickAudit(window.QPlanState.getActivePlan());
  }

  function bindGlobalEvents() {
    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.addEventListener('click', () => applyTheme(btn.dataset.setTheme));
    });

    document.getElementById('planSelector').addEventListener('change', (e) => {
      window.QPlanState.setActivePlan(e.target.value);
      renderApp();
    });

    document.getElementById('btnNewPlan').addEventListener('click', () => {
      const title = prompt('Nombre del nuevo Plan de Mejora:', 'Plan de Mejora Clínica');
      if (!title) return;
      const unit = prompt('Servicio o Unidad:', 'Unidad Clínica');
      window.QPlanState.createNewPlan(title.trim(), (unit || '').trim());
      isReportMode = false;
      currentStage = 1;
      renderApp();
    });

    document.getElementById('btnDuplicatePlan').addEventListener('click', () => {
      window.QPlanState.duplicateActivePlan();
      renderApp();
    });

    document.getElementById('btnExportJson').addEventListener('click', () => {
      window.QPlanState.exportPlanJSON(window.QPlanState.getActivePlan());
    });

    document.getElementById('btnImportJson').addEventListener('click', () => {
      document.getElementById('importJsonInput').click();
    });

    document.getElementById('importJsonInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      window.QPlanState.importPlanJSON(file, (err) => {
        if (err) {
          alert(`Error al importar archivo: ${err.message}`);
          return;
        }
        isReportMode = false;
        currentStage = 1;
        renderApp();
      });
      e.target.value = '';
    });

    document.getElementById('btnLoadSample').addEventListener('click', () => {
      window.QPlanState.loadSamplePlan();
      isReportMode = false;
      currentStage = 1;
      renderApp();
    });

    document.getElementById('btnDeletePlan').addEventListener('click', () => {
      const active = window.QPlanState.getActivePlan();
      if (!confirm(`¿Eliminar el plan "${active.title}"?`)) return;
      if (!window.QPlanState.deletePlan(active.id)) {
        alert('Debe existir al menos un plan activo.');
        return;
      }
      isReportMode = false;
      currentStage = 1;
      renderApp();
    });

    document.getElementById('btnToggleAuditDetails').addEventListener('click', () => {
      document.getElementById('auditDetailsPanel').classList.toggle('hidden');
    });

    document.getElementById('btnPrevStage').addEventListener('click', () => {
      if (currentStage > 1) {
        currentStage--;
        renderApp();
      }
    });

    document.getElementById('btnNextStage').addEventListener('click', () => {
      if (currentStage < 8) {
        currentStage++;
        renderApp();
      }
    });

    document.getElementById('btnReportMode').addEventListener('click', () => {
      isReportMode = !isReportMode;
      renderApp();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem(window.QPlanState.THEME_KEY) || 'paper';
    applyTheme(savedTheme);
    window.QPlanState.init();
    bindGlobalEvents();
    renderApp();

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  });
})();
