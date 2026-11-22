(function () {
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderFormalReport(container, plan, onExitReport) {
    const problems = window.QPlanState.getFodaProblems(plan);
    const { ranking, winner } = window.QPlanState.getPrioritizationRanking(plan);
    const problemText = winner ? winner.text : 'No definido';
    const allCauses = window.QPlanStages5to8.getAllCausesFlat(plan);
    const prioCauses = (plan.causas.priorizadasIds || []).map((cid) => allCauses.find((c) => c.id === cid)).filter(Boolean);
    const oes = plan.objetivos.especificos || [];
    const del = plan.delimitacion;

    let causeDiagramSvg = '';
    if (plan.causas.tool === 'arbol') {
      causeDiagramSvg = window.QPlanDiagrams.renderProblemTreeSVG(problemText, plan.causas.arbol, plan.causas.priorizadasIds);
    } else if (plan.causas.tool === '5porques') {
      causeDiagramSvg = window.QPlanDiagrams.renderFiveWhysSVG(problemText, plan.causas.cincoPorques, plan.causas.priorizadasIds);
    } else {
      causeDiagramSvg = window.QPlanDiagrams.renderIshikawaSVG(problemText, plan.causas.ramas, plan.causas.priorizadasIds);
    }

    container.innerHTML = `
      <div class="report-toolbar no-print">
        <button type="button" id="btnExitReport" class="btn btn-secondary">← Volver al Editor</button>
        <div style="display:flex;gap:0.5rem;">
          <button type="button" id="btnPrintReport" class="btn btn-primary">Imprimir / Guardar PDF</button>
        </div>
      </div>

      <article class="card report-document">
        <header style="border-bottom:2px solid var(--accent);padding-bottom:0.85rem;margin-bottom:1.25rem;">
          <span class="badge badge-accent">PLAN DE MEJORA CONTINUA — Q-PLAN</span>
          <h1 style="margin:0.4rem 0 0.25rem;font-size:1.45rem;">${esc(plan.title)}</h1>
          <p style="margin:0;color:var(--text-muted);font-size:0.9rem;">
            <strong>Servicio / Unidad:</strong> ${esc(plan.unit)} &nbsp;|&nbsp;
            <strong>Horizonte:</strong> ${Number(plan.horizonWeeks) || 12} semanas &nbsp;|&nbsp;
            <strong>Actualizado:</strong> ${new Date(plan.updatedAt).toLocaleDateString()}
          </p>
        </header>

        <section class="report-section">
          <h2>1. Diagnóstico Situacional (Análisis FODA)</h2>
          <div class="grid-2">
            <div class="foda-box"><h3>Fortalezas</h3><ul>${(plan.foda.F || []).map((x) => `<li>${esc(x.text)}</li>`).join('') || '<li>Sin registros</li>'}</ul></div>
            <div class="foda-box"><h3>Oportunidades</h3><ul>${(plan.foda.O || []).map((x) => `<li>${esc(x.text)}</li>`).join('') || '<li>Sin registros</li>'}</ul></div>
            <div class="foda-box"><h3>Debilidades</h3><ul>${(plan.foda.D || []).map((x) => `<li>${esc(x.text)}</li>`).join('') || '<li>Sin registros</li>'}</ul></div>
            <div class="foda-box"><h3>Amenazas</h3><ul>${(plan.foda.A || []).map((x) => `<li>${esc(x.text)}</li>`).join('') || '<li>Sin registros</li>'}</ul></div>
          </div>
        </section>

        <section class="report-section">
          <h2>2. Filtro de Abordabilidad</h2>
          <table class="data-table">
            <thead><tr><th>Origen</th><th>Problema Detectado</th><th>Estado</th><th>Justificación</th></tr></thead>
            <tbody>
              ${problems.map((p) => {
                const ab = plan.abordabilidad[p.id] || { abordable: true, justificacion: '' };
                return `<tr><td>${esc(p.origin)}</td><td>${esc(p.text)}</td><td>${ab.abordable ? 'Abordable' : 'No Abordable'}</td><td>${esc(ab.justificacion || '—')}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </section>

        <section class="report-section">
          <h2>3. Priorización (Matriz Likert 1–6) y Delimitación (5W)</h2>
          <table class="data-table" style="margin-bottom:0.85rem;">
            <thead><tr><th>Ranking</th><th>Problema Abordable</th><th>Puntaje Total</th><th>Promedio</th></tr></thead>
            <tbody>
              ${ranking.map((r, i) => `<tr class="${i === 0 ? 'winner-row' : ''}"><td>#${i + 1}</td><td>${esc(r.text)}</td><td>${r.total}</td><td>${r.avg}</td></tr>`).join('')}
            </tbody>
          </table>

          <table class="data-table">
            <tbody>
              <tr><th style="width:180px;">Problema Principal</th><td><strong>${esc(problemText)}</strong></td></tr>
              <tr><th>¿Qué ocurre?</th><td>${esc(del.que)}</td></tr>
              <tr><th>¿Cómo se manifiesta?</th><td>${esc(del.como)}</td></tr>
              <tr><th>¿Dónde ocurre?</th><td>${esc(del.donde)}</td></tr>
              <tr><th>¿Cuándo ocurre?</th><td>${esc(del.cuando)}</td></tr>
              <tr><th>¿Cuánto? (Línea Base)</th><td><strong>${esc(del.cuantoValor)} ${esc(del.cuantoUnidad)}</strong></td></tr>
            </tbody>
          </table>
        </section>

        <section class="report-section">
          <h2>4. Análisis de Causas Raíz</h2>
          <div style="margin-bottom:0.75rem;">${causeDiagramSvg}</div>
          <p><strong>Causas Raíz Priorizadas a Intervenir:</strong></p>
          <ol>${prioCauses.map((c) => `<li>${esc(c.text)} <em>(${esc(c.group)})</em></li>`).join('')}</ol>
        </section>

        <section class="report-section">
          <h2>5. Objetivos y Fundamentación Técnica</h2>
          <p><strong>Objetivo General:</strong> ${esc(plan.objetivos.general)}</p>
          <ol>${oes.map((oe) => `<li>${esc(oe.texto)} <strong>(Plazo: Semana ${oe.plazoSemanas})</strong></li>`).join('')}</ol>
          <p><strong>Fundamentación:</strong> ${esc(plan.objetivos.fundamentacion)}</p>
        </section>

        <section class="report-section">
          <h2>6. Indicadores Pertinentes</h2>
          <table class="data-table">
            <thead><tr><th>OE</th><th>Indicador</th><th>Fórmula</th><th>Línea Base</th><th>Meta</th><th>Fuente</th></tr></thead>
            <tbody>
              ${plan.indicadores.map((ind) => {
                const oeIdx = oes.findIndex((o) => o.id === ind.oeId);
                return `<tr><td>OE #${oeIdx >= 0 ? oeIdx + 1 : '-'}</td><td>${esc(ind.nombre)}</td><td>${esc(ind.formula)}</td><td>${esc(ind.lineaBase)}</td><td>${esc(ind.meta)}</td><td>${esc(ind.fuente)}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </section>

        <section class="report-section">
          <h2>7. Plan Operativo, Carta Gantt y Monitoreo</h2>
          <table class="data-table" style="margin-bottom:1rem;">
            <thead><tr><th>OE</th><th>Actividad (Qué)</th><th>Responsable (Quién)</th><th>Cuándo</th><th>Dónde</th><th>Recursos</th><th>Verificación</th></tr></thead>
            <tbody>
              ${plan.operativo.actividades.map((a) => {
                const oeIdx = oes.findIndex((o) => o.id === a.oeId);
                return `<tr><td>OE #${oeIdx >= 0 ? oeIdx + 1 : '-'}</td><td>${esc(a.que)}</td><td>${esc(a.quien)}</td><td>${esc(a.cuandoTexto)}</td><td>${esc(a.donde)}</td><td>${esc(a.recursos)}</td><td>${esc(a.verificacion)}</td></tr>`;
              }).join('')}
            </tbody>
          </table>

          <h3>Carta Gantt</h3>
          ${window.QPlanDiagrams.renderGanttSVG(plan.horizonWeeks, oes, plan.operativo.actividades)}

          <h3 style="margin-top:1rem;">Plan de Monitoreo y Control</h3>
          <table class="data-table">
            <thead><tr><th>Indicador</th><th>Método de Medición</th><th>Frecuencia</th><th>Supervisor</th><th>Umbral Correctivo</th></tr></thead>
            <tbody>
              ${plan.operativo.monitoreo.map((m) => {
                const ind = plan.indicadores.find((x) => x.id === m.indicadorId);
                return `<tr><td>${esc(ind ? ind.nombre : 'Indicador')}</td><td>${esc(m.metodo)}</td><td>${esc(m.frecuencia)}</td><td>${esc(m.supervisor)}</td><td>${esc(m.umbralCorrectivo)}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </section>
      </article>
    `;

    container.querySelector('#btnExitReport').addEventListener('click', onExitReport);
    container.querySelector('#btnPrintReport').addEventListener('click', () => window.print());
  }

  window.QPlanReport = { renderFormalReport };
})();
