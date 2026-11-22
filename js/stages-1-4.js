(function () {
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderStage1(container, plan, onUpdate) {
    const quads = [
      { key: 'F', title: 'Fortalezas (Internas +)', hint: 'Capacidades y recursos propios del equipo/unidad' },
      { key: 'O', title: 'Oportunidades (Externas +)', hint: 'Factores favorables del entorno institucional' },
      { key: 'D', title: 'Debilidades (Internas -)', hint: 'Brechas internas (pasan automáticamente a Etapa 2)' },
      { key: 'A', title: 'Amenazas (Externas -)', hint: 'Riesgos externos (pasan automáticamente a Etapa 2)' }
    ];

    const problemCount = (plan.foda.D?.length || 0) + (plan.foda.A?.length || 0);

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 1: Contexto Institucional y Análisis FODA</h2>
            <p class="card-desc">Define el contexto del servicio y completa los cuatro cuadrantes. Las Debilidades y Amenazas alimentarán automáticamente la Etapa 2.</p>
          </div>
          <span class="badge badge-accent">${problemCount} problemas detectados para Etapa 2</span>
        </div>

        <div class="grid-3">
          <div class="field-group">
            <label class="field-label" for="metaTitle">Nombre del Plan de Mejora</label>
            <input id="metaTitle" class="input-control" type="text" value="${esc(plan.title)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="metaUnit">Servicio / Unidad Clínica</label>
            <input id="metaUnit" class="input-control" type="text" value="${esc(plan.unit)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="metaHorizon">Horizonte Temporal (Semanas)</label>
            <input id="metaHorizon" class="input-control" type="number" min="2" max="52" value="${Number(plan.horizonWeeks) || 12}" />
          </div>
        </div>
      </div>

      <div class="grid-2">
        ${quads.map((q) => {
          const items = plan.foda[q.key] || [];
          return `
            <div class="foda-box" data-quad="${q.key}">
              <h3>
                <span>${q.title}</span>
                <span class="badge ${q.key === 'D' || q.key === 'A' ? 'badge-warn' : 'badge-accent'}">${items.length}</span>
              </h3>
              <p class="field-hint">${q.hint}</p>
              <ul class="item-list">
                ${items.map((it) => `
                  <li class="item-row">
                    <input type="text" class="input-control foda-edit" data-quad="${q.key}" data-id="${it.id}" value="${esc(it.text)}" />
                    <button type="button" class="btn btn-danger-ghost btn-sm foda-del" data-quad="${q.key}" data-id="${it.id}" title="Eliminar">✕</button>
                  </li>
                `).join('')}
              </ul>
              <div class="inline-add">
                <input type="text" class="input-control foda-new-input" data-quad="${q.key}" placeholder="Agregar ítem en ${q.title.split(' ')[0]}..." />
                <button type="button" class="btn btn-secondary btn-sm foda-add-btn" data-quad="${q.key}">Agregar</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelector('#metaTitle').addEventListener('input', (e) => {
      plan.title = e.target.value;
      onUpdate(false);
    });
    container.querySelector('#metaUnit').addEventListener('input', (e) => {
      plan.unit = e.target.value;
      onUpdate(false);
    });
    container.querySelector('#metaHorizon').addEventListener('change', (e) => {
      plan.horizonWeeks = Math.max(2, Math.min(52, Number(e.target.value) || 12));
      onUpdate(true);
    });

    container.querySelectorAll('.foda-edit').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const { quad, id } = e.target.dataset;
        const target = plan.foda[quad].find((x) => x.id === id);
        if (target) target.text = e.target.value;
        onUpdate(false);
      });
    });

    container.querySelectorAll('.foda-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { quad, id } = e.target.dataset;
        plan.foda[quad] = plan.foda[quad].filter((x) => x.id !== id);
        delete plan.abordabilidad[id];
        delete plan.priorizacion.scores[id];
        onUpdate(true);
      });
    });

    const addItem = (quad) => {
      const inp = container.querySelector(`.foda-new-input[data-quad="${quad}"]`);
      const text = inp.value.trim();
      if (!text) return;
      const newId = window.QPlanState.generateId(quad.toLowerCase());
      plan.foda[quad].push({ id: newId, text });
      if (quad === 'D' || quad === 'A') {
        plan.abordabilidad[newId] = { abordable: true, justificacion: '' };
      }
      onUpdate(true);
    };

    container.querySelectorAll('.foda-add-btn').forEach((btn) => {
      btn.addEventListener('click', () => addItem(btn.dataset.quad));
    });
    container.querySelectorAll('.foda-new-input').forEach((inp) => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addItem(inp.dataset.quad);
        }
      });
    });
  }

  function renderStage2(container, plan, onUpdate) {
    const problems = window.QPlanState.getFodaProblems(plan);
    const abordablesCount = window.QPlanState.getAbordableProblems(plan).length;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 2: Filtro de Abordabilidad por el Equipo</h2>
            <p class="card-desc">Los ítems provienen automáticamente de Debilidades y Amenazas (Etapa 1). Separa aquellos gobernables por el equipo de enfermería/unidad de los que dependen de nivel central.</p>
          </div>
          <span class="badge badge-success">${abordablesCount} abordables pasan a Matriz Likert</span>
        </div>

        ${problems.length === 0 ? `
          <p class="card-desc">No hay Debilidades ni Amenazas registradas aún en la Etapa 1.</p>
        ` : `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 110px;">Origen</th>
                  <th>Problema Detectado (Arrastrado de FODA)</th>
                  <th style="width: 190px;">Clasificación</th>
                  <th>Justificación (Obligatoria si No es Abordable)</th>
                </tr>
              </thead>
              <tbody>
                ${problems.map((p) => {
                  const state = plan.abordabilidad[p.id] || { abordable: true, justificacion: '' };
                  return `
                    <tr>
                      <td><span class="badge ${p.origin === 'Debilidad' ? 'badge-warn' : 'badge-accent'}">${p.origin}</span></td>
                      <td>${esc(p.text)}</td>
                      <td>
                        <select class="select-control abord-select" data-id="${p.id}">
                          <option value="true" ${state.abordable ? 'selected' : ''}>Abordable (Pasa a Etapa 3)</option>
                          <option value="false" ${!state.abordable ? 'selected' : ''}>No Abordable (Excluido)</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          class="input-control abord-just"
                          data-id="${p.id}"
                          placeholder="${state.abordable ? 'Opcional: alcance del equipo...' : 'Obligatorio: explique por qué no es abordable...'}"
                          value="${esc(state.justificacion)}"
                        />
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('.abord-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const prev = plan.abordabilidad[id] || { justificacion: '' };
        plan.abordabilidad[id] = {
          abordable: e.target.value === 'true',
          justificacion: prev.justificacion || ''
        };
        onUpdate(true);
      });
    });

    container.querySelectorAll('.abord-just').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const id = e.target.dataset.id;
        const prev = plan.abordabilidad[id] || { abordable: true };
        plan.abordabilidad[id] = {
          abordable: prev.abordable,
          justificacion: e.target.value
        };
        onUpdate(false);
      });
    });
  }

  function renderStage3(container, plan, onUpdate) {
    const criterios = plan.priorizacion.criterios || [];
    const { ranking, winner } = window.QPlanState.getPrioritizationRanking(plan);

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 3: Matriz de Priorización (Escala Likert 1 a 6)</h2>
            <p class="card-desc">Evalúa cada problema abordable sin punto medio neutro: <strong>1</strong> = Muy bajo, <strong>2</strong> = Bajo, <strong>3</strong> = Moderado-bajo, <strong>4</strong> = Moderado-alto, <strong>5</strong> = Alto, <strong>6</strong> = Crítico / Máximo.</p>
          </div>
          <button type="button" id="btnAddCriterion" class="btn btn-secondary btn-sm">+ Criterio</button>
        </div>

        ${winner ? `
          <div class="inherited-banner">
            <strong>Problema Principal Coronado (Pasa a Etapa 4):</strong> ${esc(winner.text)}
            <span class="badge badge-success" style="margin-left:0.5rem;">Puntaje Total: ${winner.total} pts (Prom: ${winner.avg})</span>
          </div>
        ` : ''}

        ${ranking.length === 0 ? `
          <p class="card-desc">Marca al menos un problema como "Abordable" en la Etapa 2 para priorizarlo aquí.</p>
        ` : `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Problema Abordable</th>
                  ${criterios.map((c) => `
                    <th style="min-width: 195px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; gap:0.25rem;">
                        <input type="text" class="input-control crit-edit" data-cid="${c.id}" value="${esc(c.nombre)}" style="padding:0.25rem 0.4rem; font-size:0.8rem;" />
                        ${criterios.length > 1 ? `<button type="button" class="btn btn-danger-ghost btn-sm crit-del" data-cid="${c.id}" title="Quitar criterio">✕</button>` : ''}
                      </div>
                    </th>
                  `).join('')}
                  <th style="width: 95px;">Total</th>
                  <th style="width: 110px;">Ranking</th>
                </tr>
              </thead>
              <tbody>
                ${ranking.map((item, idx) => {
                  const isWinner = winner && winner.id === item.id;
                  const pScores = plan.priorizacion.scores[item.id] || {};
                  return `
                    <tr class="${isWinner ? 'winner-row' : ''}">
                      <td>
                        <strong>${esc(item.text)}</strong>
                        ${isWinner ? '<br><span class="badge badge-success">★ Problema Principal</span>' : ''}
                      </td>
                      ${criterios.map((c) => {
                        const currentVal = Number(pScores[c.id]) || 0;
                        return `
                          <td>
                            <div class="likert-group">
                              ${[1, 2, 3, 4, 5, 6].map((n) => `
                                <button
                                  type="button"
                                  class="likert-btn ${currentVal === n ? 'selected' : ''}"
                                  data-pid="${item.id}"
                                  data-cid="${c.id}"
                                  data-val="${n}"
                                >${n}</button>
                              `).join('')}
                            </div>
                          </td>
                        `;
                      }).join('')}
                      <td><strong>${item.total}</strong> / ${criterios.length * 6}</td>
                      <td><strong>#${idx + 1}</strong> (Ø ${item.avg})</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    container.querySelector('#btnAddCriterion').addEventListener('click', () => {
      const cid = window.QPlanState.generateId('c');
      plan.priorizacion.criterios.push({ id: cid, nombre: 'Nuevo Criterio' });
      onUpdate(true);
    });

    container.querySelectorAll('.crit-edit').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const target = plan.priorizacion.criterios.find((c) => c.id === e.target.dataset.cid);
        if (target) target.nombre = e.target.value;
        onUpdate(false);
      });
    });

    container.querySelectorAll('.crit-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const cid = e.target.dataset.cid;
        plan.priorizacion.criterios = plan.priorizacion.criterios.filter((c) => c.id !== cid);
        Object.keys(plan.priorizacion.scores).forEach((pid) => {
          delete plan.priorizacion.scores[pid][cid];
        });
        onUpdate(true);
      });
    });

    container.querySelectorAll('.likert-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { pid, cid, val } = e.target.dataset;
        if (!plan.priorizacion.scores[pid]) plan.priorizacion.scores[pid] = {};
        plan.priorizacion.scores[pid][cid] = Number(val);
        onUpdate(true);
      });
    });
  }

  function renderStage4(container, plan, onUpdate) {
    const { winner } = window.QPlanState.getPrioritizationRanking(plan);
    const del = plan.delimitacion;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 4: Delimitación Operativa del Problema Principal (5W)</h2>
            <p class="card-desc">Delimita con precisión el problema ganador de la Matriz Likert. El dato numérico del campo <strong>Cuánto</strong> alimentará automáticamente la Línea Base de tus indicadores.</p>
          </div>
        </div>

        <div class="inherited-banner">
          <strong>Problema Principal (Heredado de Etapa 3):</strong><br />
          ${winner ? esc(winner.text) : '<em>Aún no hay un problema puntuado en la Etapa 3.</em>'}
        </div>

        <div class="field-group">
          <label class="field-label" for="delQue">1. ¿Qué ocurre? (Descripción fenomenológica exacta)</label>
          <textarea id="delQue" class="textarea-control" placeholder="Describe qué falla o brecha ocurre exactamente...">${esc(del.que)}</textarea>
        </div>

        <div class="field-group">
          <label class="field-label" for="delComo">2. ¿Cómo se manifiesta? (Evidencia clínica u operativa)</label>
          <textarea id="delComo" class="textarea-control" placeholder="Cómo se observa en registros, auditorías o práctica diaria...">${esc(del.como)}</textarea>
        </div>

        <div class="grid-2">
          <div class="field-group">
            <label class="field-label" for="delDonde">3. ¿Dónde ocurre? (Servicio, unidad, camas o proceso exacto)</label>
            <input id="delDonde" class="input-control" type="text" value="${esc(del.donde)}" placeholder="Ej. Salas 1 a 6, Medicina Interna" />
          </div>
          <div class="field-group">
            <label class="field-label" for="delCuando">4. ¿Cuándo ocurre? (Periodo o turno observado)</label>
            <input id="delCuando" class="input-control" type="text" value="${esc(del.cuando)}" placeholder="Ej. Trimestre julio - septiembre 2026" />
          </div>
        </div>

        <div class="grid-2">
          <div class="field-group">
            <label class="field-label" for="delCuantoVal">5. ¿Cuánto? — Magnitud Numérica (Línea Base)</label>
            <input id="delCuantoVal" class="input-control" type="number" step="any" value="${esc(del.cuantoValor)}" placeholder="Ej. 4.8" />
          </div>
          <div class="field-group">
            <label class="field-label" for="delCuantoUni">Unidad de Medida / Tasa / Porcentaje</label>
            <input id="delCuantoUni" class="input-control" type="text" value="${esc(del.cuantoUnidad)}" placeholder="Ej. caídas por cada 1.000 días-cama ocupados" />
          </div>
        </div>

        <div class="foda-box" style="margin-top:0.5rem;">
          <strong>Conexión Automática con Etapa 7 (Indicadores):</strong>
          <span style="margin-left:0.4rem;">
            ${del.cuantoValor !== '' ? `Línea Base detectada: <strong>${esc(del.cuantoValor)} ${esc(del.cuantoUnidad)}</strong>` : 'Completa el valor numérico en "Cuánto" para generar la línea base.'}
          </span>
        </div>
      </div>
    `;

    const bind = (id, key) => {
      container.querySelector(id).addEventListener('input', (e) => {
        plan.delimitacion[key] = e.target.value;
        onUpdate(false);
      });
    };
    bind('#delQue', 'que');
    bind('#delComo', 'como');
    bind('#delDonde', 'donde');
    bind('#delCuando', 'cuando');
    bind('#delCuantoVal', 'cuantoValor');
    bind('#delCuantoUni', 'cuantoUnidad');
  }

  window.QPlanStages1to4 = {
    renderStage1,
    renderStage2,
    renderStage3,
    renderStage4
  };
})();
