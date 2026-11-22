(function () {
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureCausasStructure(plan) {
    if (!plan.causas) {
      plan.causas = { tool: 'ishikawa', ramas: {}, priorizadasIds: [] };
    }
    if (!plan.causas.ramas) {
      plan.causas.ramas = {
        'Método': [],
        'Mano de Obra': [],
        'Materiales': [],
        'Medición': [],
        'Medio Ambiente': [],
        'Maquinaria': []
      };
    }
    if (!plan.causas.arbol) {
      plan.causas.arbol = {
        efectos: [],
        causasDirectas: []
      };
    }
    if (!Array.isArray(plan.causas.cincoPorques)) {
      plan.causas.cincoPorques = [
        { id: window.QPlanState.generateId('pq'), niveles: ['', '', '', '', ''] }
      ];
    }
    if (!Array.isArray(plan.causas.priorizadasIds)) {
      plan.causas.priorizadasIds = [];
    }
  }

  function getAllCausesFlat(plan) {
    ensureCausasStructure(plan);
    const out = [];
    Object.entries(plan.causas.ramas).forEach(([cat, items]) => {
      (items || []).forEach((it) => out.push({ id: it.id, text: it.text, group: `Ishikawa (${cat})` }));
    });
    (plan.causas.arbol.causasDirectas || []).forEach((cd) => {
      out.push({ id: cd.id, text: cd.text, group: 'Árbol (Causa Directa)' });
      (cd.indirectas || []).forEach((ci) => {
        out.push({ id: ci.id, text: ci.text, group: 'Árbol (Causa Indirecta)' });
      });
    });
    (plan.causas.cincoPorques || []).forEach((ch, i) => {
      const filled = (ch.niveles || []).filter((n) => n && n.trim());
      if (filled.length > 0) {
        out.push({ id: ch.id, text: filled[filled.length - 1], group: `5 Porqués (Cadena #${i + 1})` });
      }
    });
    return out;
  }

  function syncObjectivesWithCauses(plan) {
    const prioIds = (plan.causas.priorizadasIds || []).slice(0, 3);
    const existing = plan.objetivos.especificos || [];
    plan.objetivos.especificos = prioIds.map((cid, idx) => {
      const found = existing.find((oe) => oe.causaId === cid) || existing[idx];
      if (found) {
        return { ...found, causaId: cid };
      }
      return {
        id: window.QPlanState.generateId('oe'),
        causaId: cid,
        texto: '',
        plazoSemanas: Number(plan.horizonWeeks) || 12
      };
    });
  }

  function evaluateObjectiveRule(text, plazo) {
    const clean = String(text || '').trim();
    const hasInfinitive = /^[a-záéíóúñ]+(ar|er|ir)\b/i.test(clean);
    const hasNumber = /\d+/.test(clean);
    const hasDeadline = Number(plazo) > 0 && (/\b(semana|semanas|mes|meses|día|días|plazo|periodo)\b/i.test(clean) || Number(plazo) > 0);
    return { hasInfinitive, hasNumber, hasDeadline };
  }

  function renderStage5(container, plan, onUpdate) {
    ensureCausasStructure(plan);
    const { winner } = window.QPlanState.getPrioritizationRanking(plan);
    const problemText = winner ? winner.text : 'Problema Principal pendiente en Etapa 3';
    const tool = plan.causas.tool || 'ishikawa';

    const renderDiagramHtml = () => {
      if (tool === 'arbol') {
        return window.QPlanDiagrams.renderProblemTreeSVG(problemText, plan.causas.arbol, plan.causas.priorizadasIds);
      }
      if (tool === '5porques') {
        return window.QPlanDiagrams.renderFiveWhysSVG(problemText, plan.causas.cincoPorques, plan.causas.priorizadasIds);
      }
      return window.QPlanDiagrams.renderIshikawaSVG(problemText, plan.causas.ramas, plan.causas.priorizadasIds);
    };

    const allCauses = getAllCausesFlat(plan);
    const prioSet = new Set(plan.causas.priorizadasIds);

    let editorHtml = '';
    if (tool === 'ishikawa') {
      editorHtml = `
        <div class="grid-3">
          ${Object.keys(plan.causas.ramas).map((cat) => {
            const list = plan.causas.ramas[cat] || [];
            return `
              <div class="foda-box">
                <h3><span>${esc(cat)}</span><span class="badge badge-accent">${list.length}</span></h3>
                <ul class="item-list">
                  ${list.map((it) => `
                    <li class="item-row">
                      <input type="text" class="input-control ish-edit" data-cat="${esc(cat)}" data-id="${it.id}" value="${esc(it.text)}" />
                      <button type="button" class="btn btn-danger-ghost btn-sm ish-del" data-cat="${esc(cat)}" data-id="${it.id}">✕</button>
                    </li>
                  `).join('')}
                </ul>
                <div class="inline-add">
                  <input type="text" class="input-control ish-new" data-cat="${esc(cat)}" placeholder="Nueva causa en ${esc(cat)}..." />
                  <button type="button" class="btn btn-secondary btn-sm ish-add" data-cat="${esc(cat)}">+</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (tool === 'arbol') {
      editorHtml = `
        <div class="grid-2">
          <div class="foda-box">
            <h3><span>Efectos / Consecuencias (Copa)</span></h3>
            <ul class="item-list">
              ${plan.causas.arbol.efectos.map((ef) => `
                <li class="item-row">
                  <input type="text" class="input-control arb-ef-edit" data-id="${ef.id}" value="${esc(ef.text)}" />
                  <button type="button" class="btn btn-danger-ghost btn-sm arb-ef-del" data-id="${ef.id}">✕</button>
                </li>
              `).join('')}
            </ul>
            <div class="inline-add">
              <input type="text" id="arbEfNew" class="input-control" placeholder="Agregar efecto observado..." />
              <button type="button" id="arbEfAdd" class="btn btn-secondary btn-sm">Agregar</button>
            </div>
          </div>

          <div class="foda-box">
            <h3><span>Causas Directas (Raíces)</span></h3>
            <ul class="item-list">
              ${plan.causas.arbol.causasDirectas.map((cd) => `
                <li class="item-row">
                  <input type="text" class="input-control arb-cd-edit" data-id="${cd.id}" value="${esc(cd.text)}" />
                  <button type="button" class="btn btn-danger-ghost btn-sm arb-cd-del" data-id="${cd.id}">✕</button>
                </li>
              `).join('')}
            </ul>
            <div class="inline-add">
              <input type="text" id="arbCdNew" class="input-control" placeholder="Agregar causa directa..." />
              <button type="button" id="arbCdAdd" class="btn btn-secondary btn-sm">Agregar</button>
            </div>
          </div>
        </div>
      `;
    } else {
      editorHtml = `
        <div style="display:flex;flex-direction:column;gap:0.75rem;">
          ${plan.causas.cincoPorques.map((ch, idx) => `
            <div class="foda-box">
              <h3>
                <span>Cadena Causal #${idx + 1} (El último nivel completado actúa como Causa Raíz)</span>
                ${plan.causas.cincoPorques.length > 1 ? `<button type="button" class="btn btn-danger-ghost btn-sm pq-del" data-idx="${idx}">Quitar</button>` : ''}
              </h3>
              <div class="grid-3">
                ${[0, 1, 2, 3, 4].map((lvl) => `
                  <div>
                    <label class="field-hint">${lvl + 1}° ¿Por qué?</label>
                    <input type="text" class="input-control pq-input" data-idx="${idx}" data-lvl="${lvl}" value="${esc((ch.niveles || [])[lvl] || '')}" placeholder="Nivel ${lvl + 1}..." />
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
          <div>
            <button type="button" id="pqAddChain" class="btn btn-secondary btn-sm">+ Agregar Cadena de 5 Porqués</button>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 5: Análisis de Causas Raíz (Diagrama en Vivo)</h2>
            <p class="card-desc">Desglosa las causas del Problema Principal. El diagrama se dibuja automáticamente mientras escribes. Luego marca <strong>exactamente 3 causas raíz</strong> para atacar en la Etapa 6.</p>
          </div>
          <div class="theme-switcher">
            <button type="button" class="theme-btn tool-tab ${tool === 'ishikawa' ? 'active' : ''}" data-tool="ishikawa">Ishikawa (6M)</button>
            <button type="button" class="theme-btn tool-tab ${tool === 'arbol' ? 'active' : ''}" data-tool="arbol">Árbol de Problemas</button>
            <button type="button" class="theme-btn tool-tab ${tool === '5porques' ? 'active' : ''}" data-tool="5porques">5 Porqués</button>
          </div>
        </div>

        <div id="liveDiagramBox" style="margin-bottom:1rem;">${renderDiagramHtml()}</div>
        ${editorHtml}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Selección de las 3 Causas Raíz Prioritarias (Pasan a Objetivos Específicos)</h3>
            <p class="card-desc">Selecciona 3 causas críticas. Se vincularán 1 a 1 con los Objetivos Específicos de la Etapa 6.</p>
          </div>
          <span class="badge ${prioSet.size === 3 ? 'badge-success' : 'badge-warn'}">Seleccionadas: ${prioSet.size} / 3</span>
        </div>

        ${allCauses.length === 0 ? '<p class="card-desc">Registra causas arriba para habilitar la selección.</p>' : `
          <div class="grid-2">
            ${allCauses.map((c) => {
              const checked = prioSet.has(c.id);
              return `
                <label class="foda-box" style="display:flex;align-items:flex-start;gap:0.6rem;cursor:pointer;border-color:${checked ? 'var(--accent)' : 'var(--border)'};">
                  <input type="checkbox" class="prio-cause-chk" value="${c.id}" ${checked ? 'checked' : ''} style="margin-top:0.25rem;" />
                  <div>
                    <span class="badge badge-accent">${esc(c.group)}</span>
                    <div style="margin-top:0.25rem;font-size:0.88rem;font-weight:${checked ? '700' : '400'};">${esc(c.text)}</div>
                  </div>
                </label>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    const refreshLiveSvgOnly = () => {
      const box = container.querySelector('#liveDiagramBox');
      if (box) box.innerHTML = renderDiagramHtml();
      onUpdate(false);
    };

    container.querySelectorAll('.tool-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        plan.causas.tool = btn.dataset.tool;
        onUpdate(true);
      });
    });

    container.querySelectorAll('.ish-edit').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const item = plan.causas.ramas[e.target.dataset.cat].find((x) => x.id === e.target.dataset.id);
        if (item) item.text = e.target.value;
        refreshLiveSvgOnly();
      });
    });
    container.querySelectorAll('.ish-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { cat, id } = e.target.dataset;
        plan.causas.ramas[cat] = plan.causas.ramas[cat].filter((x) => x.id !== id);
        plan.causas.priorizadasIds = plan.causas.priorizadasIds.filter((x) => x !== id);
        syncObjectivesWithCauses(plan);
        onUpdate(true);
      });
    });
    container.querySelectorAll('.ish-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        const inp = container.querySelector(`.ish-new[data-cat="${cat}"]`);
        if (!inp.value.trim()) return;
        plan.causas.ramas[cat].push({ id: window.QPlanState.generateId('cr'), text: inp.value.trim() });
        onUpdate(true);
      });
    });

    const efAdd = container.querySelector('#arbEfAdd');
    if (efAdd) {
      efAdd.addEventListener('click', () => {
        const inp = container.querySelector('#arbEfNew');
        if (!inp.value.trim()) return;
        plan.causas.arbol.efectos.push({ id: window.QPlanState.generateId('ef'), text: inp.value.trim() });
        onUpdate(true);
      });
      container.querySelectorAll('.arb-ef-edit').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const item = plan.causas.arbol.efectos.find((x) => x.id === e.target.dataset.id);
          if (item) item.text = e.target.value;
          refreshLiveSvgOnly();
        });
      });
      container.querySelectorAll('.arb-ef-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          plan.causas.arbol.efectos = plan.causas.arbol.efectos.filter((x) => x.id !== e.target.dataset.id);
          onUpdate(true);
        });
      });

      container.querySelector('#arbCdAdd').addEventListener('click', () => {
        const inp = container.querySelector('#arbCdNew');
        if (!inp.value.trim()) return;
        plan.causas.arbol.causasDirectas.push({ id: window.QPlanState.generateId('cd'), text: inp.value.trim(), indirectas: [] });
        onUpdate(true);
      });
      container.querySelectorAll('.arb-cd-edit').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const item = plan.causas.arbol.causasDirectas.find((x) => x.id === e.target.dataset.id);
          if (item) item.text = e.target.value;
          refreshLiveSvgOnly();
        });
      });
      container.querySelectorAll('.arb-cd-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          plan.causas.arbol.causasDirectas = plan.causas.arbol.causasDirectas.filter((x) => x.id !== id);
          plan.causas.priorizadasIds = plan.causas.priorizadasIds.filter((x) => x !== id);
          syncObjectivesWithCauses(plan);
          onUpdate(true);
        });
      });
    }

    const pqAdd = container.querySelector('#pqAddChain');
    if (pqAdd) {
      pqAdd.addEventListener('click', () => {
        plan.causas.cincoPorques.push({ id: window.QPlanState.generateId('pq'), niveles: ['', '', '', '', ''] });
        onUpdate(true);
      });
      container.querySelectorAll('.pq-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const idx = Number(e.target.dataset.idx);
          const removed = plan.causas.cincoPorques.splice(idx, 1)[0];
          if (removed) {
            plan.causas.priorizadasIds = plan.causas.priorizadasIds.filter((x) => x !== removed.id);
            syncObjectivesWithCauses(plan);
          }
          onUpdate(true);
        });
      });
      container.querySelectorAll('.pq-input').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const idx = Number(e.target.dataset.idx);
          const lvl = Number(e.target.dataset.lvl);
          plan.causas.cincoPorques[idx].niveles[lvl] = e.target.value;
          refreshLiveSvgOnly();
        });
      });
    }

    container.querySelectorAll('.prio-cause-chk').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const cid = e.target.value;
        if (e.target.checked) {
          if (plan.causas.priorizadasIds.length >= 3) {
            e.target.checked = false;
            alert('Solo puedes seleccionar hasta 3 causas raíz principales.');
            return;
          }
          plan.causas.priorizadasIds.push(cid);
        } else {
          plan.causas.priorizadasIds = plan.causas.priorizadasIds.filter((x) => x !== cid);
        }
        syncObjectivesWithCauses(plan);
        onUpdate(true);
      });
    });
  }

  function renderStage6(container, plan, onUpdate) {
    syncObjectivesWithCauses(plan);
    const { winner } = window.QPlanState.getPrioritizationRanking(plan);
    const allCauses = getAllCausesFlat(plan);
    const ogCheck = evaluateObjectiveRule(plan.objetivos.general, plan.horizonWeeks);

    const pills = (chk) => `
      <span class="badge ${chk.hasInfinitive ? 'badge-success' : 'badge-warn'}">${chk.hasInfinitive ? '✓' : '✕'} Verbo Infinitivo</span>
      <span class="badge ${chk.hasNumber ? 'badge-success' : 'badge-warn'}">${chk.hasNumber ? '✓' : '✕'} Cifra/Meta</span>
      <span class="badge ${chk.hasDeadline ? 'badge-success' : 'badge-warn'}">${chk.hasDeadline ? '✓' : '✕'} Plazo</span>
    `;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 6: Objetivos (General y Específicos) y Fundamentación</h2>
            <p class="card-desc">Cada objetivo debe iniciar con verbo en infinitivo (-ar, -er, -ir), incluir una cifra cuantificable y declarar un plazo.</p>
          </div>
        </div>

        <div class="inherited-banner">
          <strong>Problema Principal a Revertir (Heredado):</strong> ${winner ? esc(winner.text) : 'Pendiente en Etapa 3'}
        </div>

        <div class="field-group">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.3rem;">
            <label class="field-label" for="ogInput" style="margin:0;">Objetivo General (1)</label>
            <div id="ogPills">${pills(ogCheck)}</div>
          </div>
          <textarea id="ogInput" class="textarea-control" placeholder="Ej. Disminuir la tasa de caídas desde 4.8 a < 2.0 por 1.000 días-cama en un plazo de 12 semanas...">${esc(plan.objetivos.general)}</textarea>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Objetivos Específicos (Vinculados 1:1 a las 3 Causas Raíz Priorizadas)</h3>
          </div>
        </div>

        ${plan.objetivos.especificos.length === 0 ? `
          <p class="card-desc">Selecciona 3 causas raíz en la Etapa 5 para generar automáticamente tus 3 Objetivos Específicos aquí.</p>
        ` : plan.objetivos.especificos.map((oe, idx) => {
          const causeObj = allCauses.find((c) => c.id === oe.causaId);
          const chk = evaluateObjectiveRule(oe.texto, oe.plazoSemanas);
          return `
            <div class="foda-box" style="margin-bottom:0.85rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.4rem;">
                <strong>Objetivo Específico #${idx + 1}</strong>
                <div class="oe-pills" data-idx="${idx}">${pills(chk)}</div>
              </div>
              <p class="field-hint"><strong>Causa Raíz #${idx + 1} que ataca:</strong> ${causeObj ? esc(causeObj.text) : 'Causa vinculada'}</p>
              <div class="grid-3">
                <div style="grid-column: span 2;">
                  <textarea class="textarea-control oe-text" data-idx="${idx}" placeholder="Verbo infinitivo + acción + cifra + plazo...">${esc(oe.texto)}</textarea>
                </div>
                <div>
                  <label class="field-label">Plazo máximo (Semanas)</label>
                  <input type="number" min="1" max="${Number(plan.horizonWeeks) || 52}" class="input-control oe-plazo" data-idx="${idx}" value="${Number(oe.plazoSemanas) || 4}" />
                  <span class="field-hint">Controla el límite permitido en la Carta Gantt.</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}

        <div class="field-group" style="margin-top:1rem;">
          <label class="field-label" for="fundInput">Fundamentación y Coherencia Técnica del Plan</label>
          <textarea id="fundInput" class="textarea-control" placeholder="Sustenta técnicamente por qué abordar estas 3 causas resolverá el problema principal...">${esc(plan.objetivos.fundamentacion)}</textarea>
        </div>
      </div>
    `;

    container.querySelector('#ogInput').addEventListener('input', (e) => {
      plan.objetivos.general = e.target.value;
      container.querySelector('#ogPills').innerHTML = pills(evaluateObjectiveRule(e.target.value, plan.horizonWeeks));
      onUpdate(false);
    });

    container.querySelectorAll('.oe-text').forEach((ta) => {
      ta.addEventListener('input', (e) => {
        const idx = Number(e.target.dataset.idx);
        plan.objetivos.especificos[idx].texto = e.target.value;
        const oe = plan.objetivos.especificos[idx];
        container.querySelector(`.oe-pills[data-idx="${idx}"]`).innerHTML = pills(evaluateObjectiveRule(oe.texto, oe.plazoSemanas));
        onUpdate(false);
      });
    });

    container.querySelectorAll('.oe-plazo').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        const idx = Number(e.target.dataset.idx);
        plan.objetivos.especificos[idx].plazoSemanas = Math.max(1, Number(e.target.value) || 1);
        onUpdate(true);
      });
    });

    container.querySelector('#fundInput').addEventListener('input', (e) => {
      plan.objetivos.fundamentacion = e.target.value;
      onUpdate(false);
    });
  }

  function renderStage7(container, plan, onUpdate) {
    syncObjectivesWithCauses(plan);
    const oes = plan.objetivos.especificos || [];
    const defaultLb = plan.delimitacion.cuantoValor !== ''
      ? `${plan.delimitacion.cuantoValor} ${plan.delimitacion.cuantoUnidad}`.trim()
      : '';

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 7: Matriz de Indicadores Pertinentes</h2>
            <p class="card-desc">Formula al menos 1 indicador por cada Objetivo Específico con fórmula matemática, línea base conectada al "Cuánto" de la Etapa 4 y meta esperada.</p>
          </div>
          <button type="button" id="btnAddInd" class="btn btn-primary btn-sm">+ Nuevo Indicador</button>
        </div>

        <div class="inherited-banner">
          <strong>Línea Base del Problema Principal (Heredada de Etapa 4):</strong> ${defaultLb ? esc(defaultLb) : '<em>Completa el campo "Cuánto" en Etapa 4</em>'}
        </div>

        ${oes.length === 0 ? '<p class="card-desc">Define primero tus Objetivos Específicos en la Etapa 6.</p>' : `
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
            ${oes.map((oe, i) => {
              const count = plan.indicadores.filter((ind) => ind.oeId === oe.id).length;
              return `<span class="badge ${count > 0 ? 'badge-success' : 'badge-warn'}">OE #${i + 1}: ${count} indicador(es)</span>`;
            }).join('')}
          </div>
        `}

        ${plan.indicadores.map((ind, idx) => `
          <div class="foda-box" style="margin-bottom:0.85rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
              <strong>Indicador #${idx + 1}</strong>
              <button type="button" class="btn btn-danger-ghost btn-sm ind-del" data-id="${ind.id}">Eliminar</button>
            </div>
            <div class="grid-2">
              <div class="field-group">
                <label class="field-label">Objetivo Específico Vinculado</label>
                <select class="select-control ind-field" data-id="${ind.id}" data-key="oeId" style="width:100%;">
                  ${oes.map((oe, i) => `<option value="${oe.id}" ${ind.oeId === oe.id ? 'selected' : ''}>OE #${i + 1}: ${esc(oe.texto.slice(0, 65))}...</option>`).join('')}
                </select>
              </div>
              <div class="field-group">
                <label class="field-label">Nombre del Indicador</label>
                <input type="text" class="input-control ind-field" data-id="${ind.id}" data-key="nombre" value="${esc(ind.nombre)}" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Fórmula Matemática (Numerador / Denominador × 100)</label>
              <input type="text" class="input-control ind-field" data-id="${ind.id}" data-key="formula" value="${esc(ind.formula)}" placeholder="(N° de casos cumplidos / Total de casos evaluados) × 100" />
            </div>
            <div class="grid-3">
              <div class="field-group">
                <label class="field-label">Línea Base</label>
                <input type="text" class="input-control ind-field" data-id="${ind.id}" data-key="lineaBase" value="${esc(ind.lineaBase)}" />
              </div>
              <div class="field-group">
                <label class="field-label">Meta Esperada</label>
                <input type="text" class="input-control ind-field" data-id="${ind.id}" data-key="meta" value="${esc(ind.meta)}" placeholder="Ej. ≥ 95 %" />
              </div>
              <div class="field-group">
                <label class="field-label">Fuente de Verificación</label>
                <input type="text" class="input-control ind-field" data-id="${ind.id}" data-key="fuente" value="${esc(ind.fuente)}" placeholder="Ej. Pauta de auditoría semanal" />
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelector('#btnAddInd').addEventListener('click', () => {
      const firstOe = oes[0] ? oes[0].id : '';
      plan.indicadores.push({
        id: window.QPlanState.generateId('ind'),
        oeId: firstOe,
        nombre: '',
        formula: '(Numerador / Denominador) × 100',
        lineaBase: defaultLb,
        meta: '',
        fuente: ''
      });
      onUpdate(true);
    });

    container.querySelectorAll('.ind-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        plan.indicadores = plan.indicadores.filter((x) => x.id !== id);
        plan.operativo.monitoreo = plan.operativo.monitoreo.filter((m) => m.indicadorId !== id);
        onUpdate(true);
      });
    });

    container.querySelectorAll('.ind-field').forEach((el) => {
      el.addEventListener('input', (e) => {
        const target = plan.indicadores.find((x) => x.id === e.target.dataset.id);
        if (target) target[e.target.dataset.key] = e.target.value;
        onUpdate(false);
      });
    });
  }

  function renderStage8(container, plan, onUpdate) {
    syncObjectivesWithCauses(plan);
    const oes = plan.objetivos.especificos || [];
    const weeks = Math.max(2, Number(plan.horizonWeeks) || 12);

    const getActStatus = (a) => {
      const checks = [
        Boolean(a.que && a.que.trim()),
        Boolean(a.quien && a.quien.trim()),
        Array.isArray(a.semanas) && a.semanas.length > 0,
        Boolean(a.donde && a.donde.trim()),
        Boolean(a.recursos && a.recursos.trim()),
        Boolean(a.verificacion && a.verificacion.trim())
      ];
      const count = checks.filter(Boolean).length;
      const parentOe = oes.find((o) => o.id === a.oeId);
      const maxAllowed = parentOe ? Number(parentOe.plazoSemanas) : weeks;
      const overflow = (a.semanas || []).some((w) => w > maxAllowed);
      return { count, complete: count === 6, overflow, maxAllowed };
    };

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 8A: Actividades Operativas (6 Datos Obligatorios)</h2>
            <p class="card-desc">Ninguna actividad se considera lista si le falta alguno de los 6 datos: Qué, Quién, Cuándo (semanas), Dónde, Recursos y Verificación.</p>
          </div>
          <button type="button" id="btnAddAct" class="btn btn-primary btn-sm">+ Nueva Actividad</button>
        </div>

        ${plan.operativo.actividades.map((a, idx) => {
          const st = getActStatus(a);
          return `
            <div class="foda-box" style="margin-bottom:0.9rem;border-color:${st.overflow ? 'var(--danger)' : st.complete ? 'var(--accent)' : 'var(--border)'};">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.5rem;">
                <div>
                  <strong>Actividad #${idx + 1}</strong>
                  <span class="badge ${st.complete ? 'badge-success' : 'badge-warn'}" style="margin-left:0.4rem;">
                    ${st.complete ? '✓ Lista (6/6)' : `Incompleta (${st.count}/6)`}
                  </span>
                  ${st.overflow ? `<span class="badge" style="background:var(--danger-soft);color:var(--danger);margin-left:0.4rem;">⚠ Excede plazo OE (Máx S${st.maxAllowed})</span>` : ''}
                </div>
                <button type="button" class="btn btn-danger-ghost btn-sm act-del" data-id="${a.id}">Eliminar</button>
              </div>

              <div class="grid-2">
                <div class="field-group">
                  <label class="field-label">Objetivo Específico</label>
                  <select class="select-control act-oe" data-id="${a.id}" style="width:100%;">
                    ${oes.map((oe, i) => `<option value="${oe.id}" ${a.oeId === oe.id ? 'selected' : ''}>OE #${i + 1} (Plazo S${oe.plazoSemanas}): ${esc(oe.texto.slice(0, 55))}...</option>`).join('')}
                  </select>
                </div>
                <div class="field-group">
                  <label class="field-label">1. ¿Qué se hará? (Acción concreta)</label>
                  <input type="text" class="input-control act-field" data-id="${a.id}" data-key="que" value="${esc(a.que)}" />
                </div>
              </div>

              <div class="grid-3">
                <div class="field-group">
                  <label class="field-label">2. ¿Quién es el responsable?</label>
                  <input type="text" class="input-control act-field" data-id="${a.id}" data-key="quien" value="${esc(a.quien)}" />
                </div>
                <div class="field-group">
                  <label class="field-label">4. ¿Dónde se realiza?</label>
                  <input type="text" class="input-control act-field" data-id="${a.id}" data-key="donde" value="${esc(a.donde)}" />
                </div>
                <div class="field-group">
                  <label class="field-label">5. ¿Qué recursos requiere?</label>
                  <input type="text" class="input-control act-field" data-id="${a.id}" data-key="recursos" value="${esc(a.recursos)}" />
                </div>
              </div>

              <div class="grid-2">
                <div class="field-group">
                  <label class="field-label">3. ¿Cuándo se ejecuta? (Marca semanas para Carta Gantt)</label>
                  <div style="display:flex;flex-wrap:wrap;gap:0.25rem;">
                    ${Array.from({ length: weeks }, (_, i) => {
                      const w = i + 1;
                      const active = (a.semanas || []).includes(w);
                      const over = w > st.maxAllowed;
                      return `
                        <button
                          type="button"
                          class="likert-btn act-week ${active ? 'selected' : ''}"
                          data-id="${a.id}"
                          data-week="${w}"
                          style="${active && over ? 'background:var(--danger);border-color:var(--danger);' : ''}"
                          title="${over ? 'Fuera de plazo del OE' : 'Semana ' + w}"
                        >S${w}</button>
                      `;
                    }).join('')}
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label">6. Fuente de Verificación</label>
                  <input type="text" class="input-control act-field" data-id="${a.id}" data-key="verificacion" value="${esc(a.verificacion)}" />
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 8B: Carta Gantt Automática (Ordenada por Objetivos)</h2>
            <p class="card-desc">Se actualiza automáticamente según las semanas marcadas arriba y alerta en rojo si superan el plazo del Objetivo Específico.</p>
          </div>
        </div>
        <div id="liveGanttBox">
          ${window.QPlanDiagrams.renderGanttSVG(weeks, oes, plan.operativo.actividades)}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Etapa 8C: Plan de Monitoreo y Control</h2>
            <p class="card-desc">Define cómo y cada cuánto se medirán los indicadores, quién supervisa y qué umbral activa una acción correctiva.</p>
          </div>
          <button type="button" id="btnAddMon" class="btn btn-secondary btn-sm">+ Nuevo Monitoreo</button>
        </div>

        ${plan.operativo.monitoreo.map((m, idx) => `
          <div class="foda-box" style="margin-bottom:0.75rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
              <strong>Control de Monitoreo #${idx + 1}</strong>
              <button type="button" class="btn btn-danger-ghost btn-sm mon-del" data-id="${m.id}">Eliminar</button>
            </div>
            <div class="grid-2">
              <div class="field-group">
                <label class="field-label">Indicador Supervisado</label>
                <select class="select-control mon-field" data-id="${m.id}" data-key="indicadorId" style="width:100%;">
                  ${plan.indicadores.map((ind, i) => `<option value="${ind.id}" ${m.indicadorId === ind.id ? 'selected' : ''}>Ind #${i + 1}: ${esc(ind.nombre || 'Sin nombre')}</option>`).join('')}
                </select>
              </div>
              <div class="field-group">
                <label class="field-label">¿Cómo se medirá? (Método / Muestreo)</label>
                <input type="text" class="input-control mon-field" data-id="${m.id}" data-key="metodo" value="${esc(m.metodo)}" />
              </div>
            </div>
            <div class="grid-3">
              <div class="field-group">
                <label class="field-label">Frecuencia</label>
                <input type="text" class="input-control mon-field" data-id="${m.id}" data-key="frecuencia" value="${esc(m.frecuencia)}" placeholder="Ej. Semanal (viernes)" />
              </div>
              <div class="field-group">
                <label class="field-label">Supervisor Responsable</label>
                <input type="text" class="input-control mon-field" data-id="${m.id}" data-key="supervisor" value="${esc(m.supervisor)}" />
              </div>
              <div class="field-group">
                <label class="field-label">Umbral de Acción Correctiva</label>
                <input type="text" class="input-control mon-field" data-id="${m.id}" data-key="umbralCorrectivo" value="${esc(m.umbralCorrectivo)}" placeholder="Ej. Si adherencia < 85 %..." />
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelector('#btnAddAct').addEventListener('click', () => {
      plan.operativo.actividades.push({
        id: window.QPlanState.generateId('act'),
        oeId: oes[0] ? oes[0].id : '',
        que: '',
        quien: '',
        cuandoTexto: '',
        semanas: [],
        donde: '',
        recursos: '',
        verificacion: ''
      });
      onUpdate(true);
    });

    container.querySelectorAll('.act-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        plan.operativo.actividades = plan.operativo.actividades.filter((x) => x.id !== e.target.dataset.id);
        onUpdate(true);
      });
    });

    container.querySelectorAll('.act-oe').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const act = plan.operativo.actividades.find((x) => x.id === e.target.dataset.id);
        if (act) act.oeId = e.target.value;
        onUpdate(true);
      });
    });

    container.querySelectorAll('.act-field').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const act = plan.operativo.actividades.find((x) => x.id === e.target.dataset.id);
        if (act) act[e.target.dataset.key] = e.target.value;
        onUpdate(false);
      });
    });

    container.querySelectorAll('.act-week').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { id, week } = e.target.dataset;
        const w = Number(week);
        const act = plan.operativo.actividades.find((x) => x.id === id);
        if (!act) return;
        const set = new Set(act.semanas || []);
        if (set.has(w)) set.delete(w);
        else set.add(w);
        act.semanas = Array.from(set).sort((a, b) => a - b);
        act.cuandoTexto = act.semanas.length > 0 ? `Semanas ${act.semanas.join(', ')}` : '';
        onUpdate(true);
      });
    });

    container.querySelector('#btnAddMon').addEventListener('click', () => {
      plan.operativo.monitoreo.push({
        id: window.QPlanState.generateId('mon'),
        indicadorId: plan.indicadores[0] ? plan.indicadores[0].id : '',
        metodo: '',
        frecuencia: '',
        supervisor: '',
        umbralCorrectivo: ''
      });
      onUpdate(true);
    });

    container.querySelectorAll('.mon-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        plan.operativo.monitoreo = plan.operativo.monitoreo.filter((x) => x.id !== e.target.dataset.id);
        onUpdate(true);
      });
    });

    container.querySelectorAll('.mon-field').forEach((el) => {
      el.addEventListener('input', (e) => {
        const m = plan.operativo.monitoreo.find((x) => x.id === e.target.dataset.id);
        if (m) m[e.target.dataset.key] = e.target.value;
        onUpdate(false);
      });
    });
  }

  window.QPlanStages5to8 = {
    getAllCausesFlat,
    renderStage5,
    renderStage6,
    renderStage7,
    renderStage8
  };
})();
