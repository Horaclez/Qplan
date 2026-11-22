(function () {
  function createSamplePlan() {
    return {
      id: 'plan_modelo_caidas_01',
      title: 'Prevención de Caídas Intrahospitalarias en Medicina Interna',
      unit: 'Servicio de Medicina Interna — Hospital Base',
      horizonWeeks: 12,
      updatedAt: new Date().toISOString(),
      foda: {
        F: [
          { id: 'f_1', text: 'Equipo de enfermería con alta adherencia a protocolos de seguridad clínica.' },
          { id: 'f_2', text: 'Disponibilidad de escala de valoración de riesgo de caídas (Downton) en ficha clínica electrónica.' },
          { id: 'f_3', text: 'Liderazgo participativo de enfermería supervisora y referentes de calidad.' }
        ],
        O: [
          { id: 'o_1', text: 'Programa institucional anual de acreditación en calidad y seguridad del paciente.' },
          { id: 'o_2', text: 'Apoyo de unidad de capacitación continua para talleres breves en turno.' }
        ],
        D: [
          { id: 'd_1', text: 'Incumplimiento en la reevaluación periódica del riesgo de caídas (Escala Downton) tras cambios clínicos y ausencia de señalética visible en cabecera.' },
          { id: 'd_2', text: 'Registro incompleto de educación preventiva entregada al paciente y familia al ingreso.' },
          { id: 'd_3', text: 'Falta de estandarización en la entrega de turno respecto a pacientes con alto riesgo de caída.' },
          { id: 'd_4', text: 'Déficit de timbres de llamado inalámbricos en salas de aislamiento.' }
        ],
        A: [
          { id: 'a_1', text: 'Aumento progresivo de hospitalización de adultos mayores con polifarmacia y deterioro cognitivo.' },
          { id: 'a_2', text: 'Restricción presupuestaria central para remodelación estructural de baños hospitalarios.' }
        ]
      },
      abordabilidad: {
        d_1: { abordable: true, justificacion: '' },
        d_2: { abordable: true, justificacion: '' },
        d_3: { abordable: true, justificacion: '' },
        d_4: { abordable: false, justificacion: 'Requiere licitación pública y compra centralizada de equipamiento eléctrico por Subdirección Administrativa.' },
        a_1: { abordable: true, justificacion: '' },
        a_2: { abordable: false, justificacion: 'Depende de presupuesto de inversión en infraestructura hospitalaria fuera del alcance de gestión del servicio.' }
      },
      priorizacion: {
        criterios: [
          { id: 'c_1', nombre: 'Magnitud / Frecuencia' },
          { id: 'c_2', nombre: 'Gravedad / Riesgo Clínico' },
          { id: 'c_3', nombre: 'Factibilidad de Intervención' },
          { id: 'c_4', nombre: 'Costo-Beneficio' }
        ],
        scores: {
          d_1: { c_1: 6, c_2: 6, c_3: 6, c_4: 6 },
          d_2: { c_1: 5, c_2: 4, c_3: 5, c_4: 5 },
          d_3: { c_1: 5, c_2: 5, c_3: 5, c_4: 4 },
          a_1: { c_1: 5, c_2: 5, c_3: 2, c_4: 3 }
        }
      },
      delimitacion: {
        problemId: 'd_1',
        que: 'Omisión de la reevaluación sistemática del riesgo de caídas (Escala Downton) ante cambios de estado clínico o fármacos sedantes, sumada a la falta de identificación visual inmediata en la unidad del paciente.',
        como: 'Se evidencia mediante auditoría de fichas clínicas sin reevaluación a las 48 h o post-cambio de terapia, y camas de pacientes de alto riesgo sin brazalete ni disco identificador en cabecera.',
        donde: 'Salas de hospitalización adulto (camas 1 a 36) del Servicio de Medicina Interna.',
        cuando: 'Trimestre julio - septiembre del año en curso.',
        cuantoValor: 4.8,
        cuantoUnidad: 'caídas por cada 1.000 días-cama ocupados'
      },
      causas: {
        tool: 'ishikawa',
        ramas: {
          'Método': [
            { id: 'cr_1', text: 'No existe pauta operativa que defina cuándo reevaluar Downton más allá del ingreso.' },
            { id: 'cr_2', text: 'Falta de checklist de verificación visual de medidas de prevención en entrega de turno.' }
          ],
          'Mano de Obra': [
            { id: 'cr_3', text: 'Desconocimiento del personal nuevo sobre criterios de reevaluación ante ajuste de psicofármacos.' }
          ],
          'Materiales': [
            { id: 'cr_4', text: 'Insuficiencia de discos magnéticos de señalética de riesgo en cabeceras de cama.' }
          ],
          'Medición': [
            { id: 'cr_5', text: 'Ausencia de monitoreo semanal de adherencia a la reevaluación antes de que ocurra el evento.' }
          ],
          'Medio Ambiente': [
            { id: 'cr_6', text: 'Iluminación nocturna deficiente en pasillos hacia servicios higiénicos.' }
          ],
          'Maquinaria': []
        },
        priorizadasIds: ['cr_1', 'cr_3', 'cr_4']
      },
      objetivos: {
        general: 'Disminuir la tasa de caídas intrahospitalarias en el Servicio de Medicina Interna desde 4.8 a menos de 2.0 caídas por cada 1.000 días-cama ocupados en un plazo de 12 semanas.',
        especificos: [
          {
            id: 'oe_1',
            causaId: 'cr_1',
            texto: 'Estandarizar en un 100 % la reevaluación protocolizada del riesgo de caídas ante cambios clínicos o farmacológicos en las 36 camas del servicio durante las primeras 4 semanas.',
            plazoSemanas: 4
          },
          {
            id: 'oe_2',
            causaId: 'cr_3',
            texto: 'Capacitar al menos al 90 % del personal de enfermería y TENS en criterios de reevaluación y medidas preventivas de caídas en un plazo de 6 semanas.',
            plazoSemanas: 6
          },
          {
            id: 'oe_3',
            causaId: 'cr_4',
            texto: 'Implementar señalética visual estandarizada de alto riesgo en el 100 % de las unidades de pacientes clasificados con Downton >= 3 puntos en un periodo de 8 semanas.',
            plazoSemanas: 8
          }
        ],
        fundamentacion: 'La prevención efectiva de caídas requiere vigilancia dinámica del riesgo clínico y barreras visuales inmediatas para todo el equipo asistencial. Atacar simultáneamente la estandarización del flujo de reevaluación, la competencia del equipo de turno y la disponibilidad de señalética en cabecera rompe la cadena de omisiones identificada en el diagnóstico.'
      },
      indicadores: [
        {
          id: 'ind_1',
          oeId: 'oe_1',
          nombre: 'Porcentaje de adherencia a reevaluación oportuna de Escala Downton',
          formula: '(N° de fichas auditadas con reevaluación oportuna / Total de fichas auditadas con criterio de reevaluación) × 100',
          lineaBase: '38 % (4.8 caídas/1.000 días-cama)',
          meta: '≥ 95 % de adherencia',
          fuente: 'Pauta de auditoría semanal de ficha clínica electrónica'
        },
        {
          id: 'ind_2',
          oeId: 'oe_2',
          nombre: 'Cobertura de capacitación y aprobación en prevención de caídas',
          formula: '(N° de enfermeros y TENS capacitados con evaluación aprobada / Dotación total del servicio) × 100',
          lineaBase: '42 % del personal capacitado',
          meta: '≥ 90 % del personal aprobado',
          fuente: 'Registro de asistencia y test breve de salida'
        },
        {
          id: 'ind_3',
          oeId: 'oe_3',
          nombre: 'Cobertura de señalética preventiva visible en cabecera de alto riesgo',
          formula: '(N° de pacientes con Downton >= 3 con disco visual instalado / Total de pacientes con Downton >= 3) × 100',
          lineaBase: '30 % con señalética activa',
          meta: '100 % con señalética activa',
          fuente: 'Ronda de observación directa de enfermería'
        }
      ],
      operativo: {
        actividades: [
          {
            id: 'act_1',
            oeId: 'oe_1',
            que: 'Actualizar el flujograma local de reevaluación de riesgo de caídas (ingreso, 48 h, post-sedación y post-caída).',
            quien: 'Enfermera Encargada de Calidad del Servicio',
            cuandoTexto: 'Semanas 1 a 2',
            semanas: [1, 2],
            donde: 'Oficina de Supervisión de Medicina Interna',
            recursos: 'Computador, normativa institucional vigente, impresora',
            verificacion: 'Flujograma aprobado y firmado en carpeta de protocolos'
          },
          {
            id: 'act_2',
            oeId: 'oe_1',
            que: 'Incorporar ítem de verificación de Downton en la pauta de entrega de turno de enfermería.',
            quien: 'Enfermeras Clínicas referentes de turno',
            cuandoTexto: 'Semanas 3 a 4',
            semanas: [3, 4],
            donde: 'Estación de Enfermería Medicina Interna',
            recursos: 'Planilla digital de entrega de turno',
            verificacion: 'Registro diario de entrega de turno actualizado'
          },
          {
            id: 'act_3',
            oeId: 'oe_2',
            que: 'Realizar cápsulas educativas presenciales de 15 minutos en los 4 turnos sobre reevaluación y medidas preventivas.',
            quien: 'Enfermera Supervisora y Referente de Calidad',
            cuandoTexto: 'Semanas 3 a 6',
            semanas: [3, 4, 5, 6],
            donde: 'Sala de reuniones Medicina Interna',
            recursos: 'Presentación visual, casos clínicos breves, lista de asistencia',
            verificacion: 'Planilla de asistencia firmada y resultados de evaluación rápida'
          },
          {
            id: 'act_4',
            oeId: 'oe_3',
            que: 'Gestionar e instalar discos magnéticos de alerta de riesgo de caída en las 36 cabeceras de cama.',
            quien: 'Enfermera Supervisora y Técnico Paramédico de insumos',
            cuandoTexto: 'Semanas 5 a 8',
            semanas: [5, 6, 7, 8],
            donde: 'Salas de hospitalización (camas 1 a 36)',
            recursos: '40 discos magnéticos lavables de alto contraste',
            verificacion: 'Inventario instalado y lista de chequeo por sala'
          }
        ],
        monitoreo: [
          {
            id: 'mon_1',
            indicadorId: 'ind_1',
            metodo: 'Muestreo aleatorio de 15 fichas clínicas de pacientes hospitalizados > 48 h',
            frecuencia: 'Semanal (cada viernes)',
            supervisor: 'Enfermera Referente de Calidad',
            umbralCorrectivo: 'Si adherencia < 85 %, realizar retroalimentación inmediata por turno'
          },
          {
            id: 'mon_2',
            indicadorId: 'ind_3',
            metodo: 'Ronda visual directa en salas verificando concordancia puntaje Downton vs. disco en cabecera',
            frecuencia: 'Bisemanal (martes y viernes)',
            supervisor: 'Enfermera Clínica de Turno Diurno',
            umbralCorrectivo: 'Si cobertura < 95 %, reposición inmediata y refuerzo en entrega de turno'
          }
        ]
      }
    };
  }

  window.QPlanSample = { createSamplePlan };
})();
