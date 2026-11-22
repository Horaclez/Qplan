(function () {
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function wrapLines(text, maxChars, maxLines) {
    const words = String(text || '').trim().split(/\s+/);
    if (!words[0]) return ['Sin definir'];
    const lines = [];
    let current = '';
    for (const w of words) {
      if ((current + ' ' + w).trim().length <= maxChars) {
        current = (current + ' ' + w).trim();
      } else {
        if (current) lines.push(current);
        current = w;
        if (lines.length >= maxLines) break;
      }
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(4, maxChars - 3)) + '...';
    }
    return lines;
  }

  function renderIshikawaSVG(problemText, ramas, priorizadasIds) {
    const prioSet = new Set(priorizadasIds || []);
    const topCats = ['Método', 'Mano de Obra', 'Materiales'];
    const botCats = ['Medición', 'Medio Ambiente', 'Maquinaria'];
    const width = 960;
    const height = 470;
    const spineY = 235;

    const headLines = wrapLines(problemText || 'Problema Principal pendiente (Etapa 3)', 22, 5);

    const drawBranch = (cat, idx, isTop) => {
      const tipX = 165 + idx * 215;
      const tipY = spineY;
      const baseX = tipX - 75;
      const baseY = isTop ? 44 : 426;
      const items = (ramas && ramas[cat]) || [];

      const itemsSvg = items.slice(0, 4).map((item, i) => {
        const t = (i + 1) / 5;
        const ix = baseX + (tipX - baseX) * t;
        const iy = baseY + (tipY - baseY) * t;
        const isPrio = prioSet.has(item.id);
        const label = wrapLines((isPrio ? '★ ' : '• ') + item.text, 25, 2);
        return `
          <line x1="${ix - 12}" y1="${iy}" x2="${ix}" y2="${iy}" stroke="${isPrio ? 'var(--accent)' : 'var(--text-muted)'}" stroke-width="1.5" />
          <text x="${ix - 15}" y="${iy - 3}" text-anchor="end" font-size="11" font-weight="${isPrio ? '700' : '400'}" fill="${isPrio ? 'var(--accent)' : 'var(--text)'}">
            ${label.map((ln, li) => `<tspan x="${ix - 15}" dy="${li === 0 ? 0 : 12}">${esc(ln)}</tspan>`).join('')}
          </text>
        `;
      }).join('');

      return `
        <line x1="${baseX}" y1="${baseY}" x2="${tipX}" y2="${tipY}" stroke="var(--text-muted)" stroke-width="2" />
        <rect x="${baseX - 62}" y="${isTop ? 14 : 430}" width="124" height="24" rx="4" fill="var(--surface-alt)" stroke="var(--accent)" stroke-width="1.5" />
        <text x="${baseX}" y="${isTop ? 30 : 446}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">${esc(cat)}</text>
        ${itemsSvg}
      `;
    };

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Diagrama de Ishikawa 6M" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;">
        <line x1="35" y1="${spineY}" x2="735" y2="${spineY}" stroke="var(--accent)" stroke-width="3.5" />
        <polygon points="735,${spineY - 7} 750,${spineY} 735,${spineY + 7}" fill="var(--accent)" />
        <rect x="752" y="${spineY - 58}" width="192" height="116" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
        <text x="848" y="${spineY - 32}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text)">
          ${headLines.map((ln, i) => `<tspan x="848" dy="${i === 0 ? 0 : 15}">${esc(ln)}</tspan>`).join('')}
        </text>
        ${topCats.map((c, i) => drawBranch(c, i, true)).join('')}
        ${botCats.map((c, i) => drawBranch(c, i, false)).join('')}
      </svg>
    `;
  }

  function renderProblemTreeSVG(problemText, arbol, priorizadasIds) {
    const prioSet = new Set(priorizadasIds || []);
    const efectos = (arbol && arbol.efectos) || [];
    const directas = (arbol && arbol.causasDirectas) || [];
    const width = 960;
    const height = 460;

    const trunkLines = wrapLines(problemText || 'Problema Principal', 44, 2);

    const drawNodes = (list, y, isCause) => {
      if (list.length === 0) {
        return `<text x="480" y="${y + 24}" text-anchor="middle" font-size="12" fill="var(--text-muted)">Sin ${isCause ? 'causas' : 'efectos'} registrados</text>`;
      }
      const cols = Math.min(list.length, 4);
      const boxW = Math.floor(860 / cols) - 14;
      return list.slice(0, 4).map((item, idx) => {
        const cx = 50 + idx * (boxW + 14) + boxW / 2;
        const x = cx - boxW / 2;
        const isPrio = isCause && prioSet.has(item.id);
        const lines = wrapLines((isPrio ? '★ ' : '') + item.text, Math.max(16, Math.floor(boxW / 6.5)), 3);
        const targetY = isCause ? 262 : 198;
        const lineY1 = isCause ? y : y + 66;
        return `
          <line x1="${cx}" y1="${lineY1}" x2="480" y2="${targetY}" stroke="${isPrio ? 'var(--accent)' : 'var(--text-muted)'}" stroke-width="1.6" />
          <rect x="${x}" y="${y}" width="${boxW}" height="66" rx="6" fill="${isPrio ? 'var(--accent-soft)' : 'var(--surface-alt)'}" stroke="${isPrio ? 'var(--accent)' : 'var(--border)'}" stroke-width="${isPrio ? '2' : '1.2'}" />
          <text x="${cx}" y="${y + 20}" text-anchor="middle" font-size="11" font-weight="${isPrio ? '700' : '400'}" fill="var(--text)">
            ${lines.map((ln, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : 14}">${esc(ln)}</tspan>`).join('')}
          </text>
        `;
      }).join('');
    };

    const indirectas = [];
    directas.forEach((d) => {
      (d.indirectas || []).forEach((ind) => indirectas.push(ind));
    });

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Árbol de Problemas" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;">
        <text x="20" y="24" font-size="11" font-weight="700" fill="var(--text-muted)">COPA: EFECTOS / CONSECUENCIAS</text>
        ${drawNodes(efectos, 36, false)}

        <rect x="210" y="198" width="540" height="64" rx="8" fill="var(--accent)" />
        <text x="480" y="224" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--accent-text)">
          ${trunkLines.map((ln, i) => `<tspan x="480" dy="${i === 0 ? 0 : 17}">${esc(ln)}</tspan>`).join('')}
        </text>

        <text x="20" y="292" font-size="11" font-weight="700" fill="var(--text-muted)">RAÍCES DIRECTAS</text>
        ${drawNodes(directas, 302, true)}

        ${indirectas.length > 0 ? `
          <text x="20" y="384" font-size="11" font-weight="700" fill="var(--text-muted)">RAÍCES INDIRECTAS</text>
          ${drawNodes(indirectas, 392, true)}
        ` : ''}
      </svg>
    `;
  }

  function renderFiveWhysSVG(problemText, chains, priorizadasIds) {
    const prioSet = new Set(priorizadasIds || []);
    const list = (chains || []).slice(0, 3);
    const width = 960;
    const height = Math.max(220, 95 + list.length * 115);
    const headLines = wrapLines(problemText || 'Problema Principal', 55, 2);

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Diagrama de Los 5 Porqués" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;">
        <rect x="30" y="16" width="900" height="48" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
        <text x="480" y="36" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">
          ${headLines.map((ln, i) => `<tspan x="480" dy="${i === 0 ? 0 : 15}">${esc(ln)}</tspan>`).join('')}
        </text>
        ${list.map((ch, rIdx) => {
          const y = 84 + rIdx * 110;
          const niveles = (ch.niveles || []).filter((n) => n && n.trim());
          const stepW = 165;
          return niveles.slice(0, 5).map((txt, cIdx) => {
            const x = 30 + cIdx * 182;
            const isLast = cIdx === niveles.slice(0, 5).length - 1;
            const isPrio = isLast && prioSet.has(ch.id);
            const lines = wrapLines((isPrio ? '★ ' : '') + txt, 22, 3);
            return `
              ${cIdx > 0 ? `<line x1="${x - 17}" y1="${y + 42}" x2="${x}" y2="${y + 42}" stroke="var(--accent)" stroke-width="2" />` : ''}
              <rect x="${x}" y="${y}" width="${stepW}" height="84" rx="6" fill="${isPrio ? 'var(--accent-soft)' : 'var(--surface-alt)'}" stroke="${isPrio ? 'var(--accent)' : 'var(--border)'}" stroke-width="${isPrio ? '2' : '1'}" />
              <text x="${x + 8}" y="${y + 15}" font-size="10" font-weight="700" fill="var(--accent)">${cIdx + 1}° Por qué</text>
              <text x="${x + 8}" y="${y + 31}" font-size="10.5" fill="var(--text)">
                ${lines.map((ln, li) => `<tspan x="${x + 8}" dy="${li === 0 ? 0 : 13}">${esc(ln)}</tspan>`).join('')}
              </text>
            `;
          }).join('');
        }).join('')}
      </svg>
    `;
  }

  function renderGanttSVG(horizonWeeks, objetivosEspecificos, actividades) {
    const weeks = Math.max(2, Number(horizonWeeks) || 12);
    const oes = objetivosEspecificos || [];
    const acts = actividades || [];

    const rows = [];
    oes.forEach((oe, idx) => {
      rows.push({ type: 'oe', label: `OE ${idx + 1}: ${oe.texto}`, plazo: Number(oe.plazoSemanas) || weeks });
      acts
        .filter((a) => a.oeId === oe.id)
        .forEach((a) => {
          rows.push({
            type: 'act',
            label: a.que || 'Actividad sin descripción',
            quien: a.quien || '',
            semanas: a.semanas || [],
            plazo: Number(oe.plazoSemanas) || weeks
          });
        });
    });

    const orphans = acts.filter((a) => !oes.some((oe) => oe.id === a.oeId));
    orphans.forEach((a) => {
      rows.push({
        type: 'act',
        label: `[Sin OE] ${a.que || 'Actividad'}`,
        quien: a.quien || '',
        semanas: a.semanas || [],
        plazo: weeks
      });
    });

    if (rows.length === 0) {
      return '<p class="card-desc">Agrega objetivos específicos y actividades con semanas asignadas para generar la Carta Gantt.</p>';
    }

    const leftColW = 360;
    const weekColW = Math.max(32, Math.floor(580 / weeks));
    const width = leftColW + weeks * weekColW + 20;
    const rowH = 34;
    const headerH = 38;
    const height = headerH + rows.length * rowH + 16;

    const weekHeaders = Array.from({ length: weeks }, (_, i) => {
      const w = i + 1;
      const x = leftColW + i * weekColW;
      return `
        <rect x="${x}" y="0" width="${weekColW}" height="${headerH}" fill="var(--surface-alt)" stroke="var(--border)" />
        <text x="${x + weekColW / 2}" y="23" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text)">S${w}</text>
      `;
    }).join('');

    const rowsSvg = rows.map((r, rIdx) => {
      const y = headerH + rIdx * rowH;
      const shortLabel = wrapLines(r.label, 46, 1)[0];

      if (r.type === 'oe') {
        const deadlineX = leftColW + Math.min(weeks, r.plazo) * weekColW;
        return `
          <rect x="0" y="${y}" width="${width - 20}" height="${rowH}" fill="var(--accent-soft)" stroke="var(--border)" />
          <text x="10" y="${y + 21}" font-size="11.5" font-weight="700" fill="var(--text)">${esc(shortLabel)} (Meta: S${r.plazo})</text>
          <line x1="${deadlineX}" y1="${y}" x2="${deadlineX}" y2="${y + rowH}" stroke="var(--warn)" stroke-width="2.5" stroke-dasharray="4,2" />
        `;
      }

      const cells = Array.from({ length: weeks }, (_, i) => {
        const w = i + 1;
        const x = leftColW + i * weekColW;
        const active = r.semanas.includes(w);
        const outOfDeadline = active && w > r.plazo;
        return `
          <rect x="${x}" y="${y}" width="${weekColW}" height="${rowH}" fill="var(--surface)" stroke="var(--border)" />
          ${active ? `
            <rect x="${x + 3}" y="${y + 6}" width="${weekColW - 6}" height="${rowH - 12}" rx="4" fill="${outOfDeadline ? 'var(--danger)' : 'var(--accent)'}" />
          ` : ''}
        `;
      }).join('');

      return `
        <rect x="0" y="${y}" width="${leftColW}" height="${rowH}" fill="var(--surface)" stroke="var(--border)" />
        <text x="18" y="${y + 21}" font-size="11" fill="var(--text)">${esc(shortLabel)}</text>
        ${cells}
      `;
    }).join('');

    return `
      <div class="table-wrap">
        <svg viewBox="0 0 ${width} ${height}" style="min-width:${Math.min(width, 760)}px;width:100%;border:1px solid var(--border);border-radius:8px;background:var(--surface);">
          <rect x="0" y="0" width="${leftColW}" height="${headerH}" fill="var(--surface-alt)" stroke="var(--border)" />
          <text x="12" y="23" font-size="11.5" font-weight="700" fill="var(--text)">Objetivo / Actividad Operativa</text>
          ${weekHeaders}
          ${rowsSvg}
        </svg>
      </div>
      <p class="field-hint" style="margin-top:0.4rem;">
        <span class="badge badge-accent">■ Plazo válido</span>
        <span class="badge badge-warn" style="margin-left:0.4rem;">┆ Límite plazo OE</span>
        <span class="badge" style="background:var(--danger-soft);color:var(--danger);margin-left:0.4rem;">■ Fuera de plazo OE</span>
      </p>
    `;
  }

  window.QPlanDiagrams = {
    renderIshikawaSVG,
    renderProblemTreeSVG,
    renderFiveWhysSVG,
    renderGanttSVG
  };
})();
