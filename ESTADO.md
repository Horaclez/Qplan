# ESTADO.md — Q-PLAN (PWA Planes de Mejora Continua)
- **Stack:** PWA Offline-First (HTML5, CSS3, JS ES6+ vanilla), mobile-first, sin dependencias externas, compatible Capacitor/Electron.
- **Archivos:** `index.html`, `styles.css`, `manifest.json`, `sw.js`, `js/sample-case.js`, `js/state.js`, `js/diagrams.js`, `js/stages-1-4.js`, `js/stages-5-8.js`, `js/report.js`, `js/app.js`.
- **Persistencia:** `localStorage` (`qplan_store_v1`), multi-plan, exportar/importar `.json`, caso clínico modelo precargado.
- **Temas:** `data-theme="paper"` | `"sage"` | `"dark"` en `styles.css`.
- **Flujo 8 Etapas:** 1.FODA (D+A) -> 2.Abordabilidad -> 3.Likert 1-6 (ganador) -> 4.Delimitación 5W (Cuánto=LB) -> 5.Causas Raíz SVG (Ishikawa/Árbol/5Porqués, 3 top) -> 6.1 OG + 3 OE -> 7.Indicadores -> 8.Actividades (6/6) + Gantt SVG + Monitoreo.
- **Funciones Listas:** Arrastre automático entre etapas, auditoría metodológica en vivo (`runQuickAudit`), SVG dinámicos, Modo Informe imprimible (`report.js`).
- **Reglas Estrictas:** No romper IDs del DOM ni estructura de `plan` en `state.js`. Entregar código 100 % completo (sin `// TODO`) y solo los bloques/archivos modificados.
