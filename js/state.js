(function () {
  const STORAGE_KEY = 'qplan_store_v1';
  const THEME_KEY = 'qplan_theme_v1';

  let store = {
    activePlanId: null,
    plans: []
  };

  function generateId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  function createBlankPlan(title, unit) {
    return {
      id: generateId('plan'),
      title: title || 'Nuevo Plan de Mejora Continua',
      unit: unit || 'Servicio / Unidad Clínica',
      horizonWeeks: 12,
      updatedAt: new Date().toISOString(),
      foda: { F: [], O: [], D: [], A: [] },
      abordabilidad: {},
      priorizacion: {
        criterios: [
          { id: 'c_1', nombre: 'Magnitud / Frecuencia' },
          { id: 'c_2', nombre: 'Gravedad / Riesgo' },
          { id: 'c_3', nombre: 'Factibilidad' },
          { id: 'c_4', nombre: 'Costo-Beneficio' }
        ],
        scores: {}
      },
      delimitacion: {
        problemId: '',
        que: '',
        como: '',
        donde: '',
        cuando: '',
        cuantoValor: '',
        cuantoUnidad: ''
      },
      causas: {
        tool: 'ishikawa',
        ramas: {
          'Método': [],
          'Mano de Obra': [],
          'Materiales': [],
          'Medición': [],
          'Medio Ambiente': [],
          'Maquinaria': []
        },
        priorizadasIds: []
      },
      objetivos: {
        general: '',
        especificos: [],
        fundamentacion: ''
      },
      indicadores: [],
      operativo: {
        actividades: [],
        monitoreo: []
      }
    };
  }

  function save() {
    const active = getActivePlan();
    if (active) {
      active.updatedAt = new Date().toISOString();
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
      console.error('Error guardando en localStorage:', err);
    }
  }

  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.plans) && parsed.plans.length > 0) {
          store = parsed;
          return;
        }
      }
    } catch (err) {
      console.warn('Almacenamiento previo inválido, cargando caso modelo.', err);
    }
    const sample = window.QPlanSample.createSamplePlan();
    store = { activePlanId: sample.id, plans: [sample] };
    save();
  }

  function getAllPlans() {
    return store.plans;
  }

  function getActivePlan() {
    return store.plans.find((p) => p.id === store.activePlanId) || store.plans[0];
  }

  function setActivePlan(id) {
    if (store.plans.some((p) => p.id === id)) {
      store.activePlanId = id;
      save();
    }
  }

  function createNewPlan(title, unit) {
    const plan = createBlankPlan(title, unit);
    store.plans.unshift(plan);
    store.activePlanId = plan.id;
    save();
    return plan;
  }

  function duplicateActivePlan() {
    const current = getActivePlan();
    if (!current) return null;
    const copy = JSON.parse(JSON.stringify(current));
    copy.id = generateId('plan');
    copy.title = `${current.title} (Copia)`;
    copy.updatedAt = new Date().toISOString();
    store.plans.unshift(copy);
    store.activePlanId = copy.id;
    save();
    return copy;
  }

  function deletePlan(id) {
    if (store.plans.length <= 1) return false;
    store.plans = store.plans.filter((p) => p.id !== id);
    if (store.activePlanId === id) {
      store.activePlanId = store.plans[0].id;
    }
    save();
    return true;
  }

  function loadSamplePlan() {
    const sample = window.QPlanSample.createSamplePlan();
    sample.id = generateId('plan_modelo');
    store.plans.unshift(sample);
    store.activePlanId = sample.id;
    save();
    return sample;
  }

  function getFodaProblems(plan) {
    const debilidades = (plan.foda.D || []).map((item) => ({
      id: item.id,
      text: item.text,
      origin: 'Debilidad'
    }));
    const amenazas = (plan.foda.A || []).map((item) => ({
      id: item.id,
      text: item.text,
      origin: 'Amenaza'
    }));
    return [...debilidades, ...amenazas];
  }

  function getAbordableProblems(plan) {
    return getFodaProblems(plan).filter((prob) => {
      const entry = plan.abordabilidad[prob.id];
      return entry ? entry.abordable === true : true;
    });
  }

  function getPrioritizationRanking(plan) {
    const abordables = getAbordableProblems(plan);
    const criterios = plan.priorizacion.criterios || [];
    const scoresMap = plan.priorizacion.scores || {};

    const ranked = abordables.map((prob) => {
      const pScores = scoresMap[prob.id] || {};
      let total = 0;
      let count = 0;
      criterios.forEach((c) => {
        const val = Number(pScores[c.id]) || 0;
        total += val;
        if (val > 0) count += 1;
      });
      const avg = criterios.length > 0 ? (total / criterios.length).toFixed(2) : '0.00';
      return { ...prob, total, avg, ratedCount: count };
    });

    ranked.sort((a, b) => b.total - a.total);
    const winner = ranked.length > 0 && ranked[0].total > 0 ? ranked[0] : null;
    if (winner && plan.delimitacion) {
      plan.delimitacion.problemId = winner.id;
    }
    return { ranking: ranked, winner };
  }

  async function exportPlanJSON(plan) {
    const filename = `QPLAN_${plan.title.replace(/[^a-z0-9]/gi, '_').slice(0, 32)}.json`;
    const jsonString = JSON.stringify(plan, null, 2);

    if (window.electronAPI && typeof window.electronAPI.saveFile === 'function') {
      await window.electronAPI.saveFile(filename, jsonString);
      return;
    }

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importPlanJSON(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || !parsed.foda || !parsed.title) {
          throw new Error('Estructura JSON incompatible con Q-PLAN.');
        }
        parsed.id = generateId('plan_imp');
        parsed.updatedAt = new Date().toISOString();
        store.plans.unshift(parsed);
        store.activePlanId = parsed.id;
        save();
        callback(null, parsed);
      } catch (err) {
        callback(err, null);
      }
    };
    reader.readAsText(file);
  }

  window.QPlanState = {
    THEME_KEY,
    generateId,
    init,
    save,
    getAllPlans,
    getActivePlan,
    setActivePlan,
    createNewPlan,
    duplicateActivePlan,
    deletePlan,
    loadSamplePlan,
    getFodaProblems,
    getAbordableProblems,
    getPrioritizationRanking,
    exportPlanJSON,
    importPlanJSON
  };
})();
