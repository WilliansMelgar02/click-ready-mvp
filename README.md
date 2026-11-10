# Click&Ready · Andes Market — Incremento del Sprint 1

Prototipo del MVP **Click&Ready** (compra online con retiro en tienda y entrega programada) para
la cadena de supermercados Andes Market, desarrollado con **Scrum** en 3 sprints de 2 semanas.
Este repositorio contiene el **Incremento del Sprint 1** (6 al 17 de julio de 2026).

| | |
|---|---|
| **Staging (Incremento)** | <https://williansmelgar02.github.io/click-ready-mvp/> |
| **Tablero del Sprint 1** | <https://williansmelgar02.github.io/click-ready-mvp/sprint.html> |
| **Reportes del pipeline** | <https://williansmelgar02.github.io/click-ready-mvp/reportes/> |
| **Product Backlog** | [Issues del repositorio](../../issues) agrupados por milestone (Sprint 1, Sprint 2, Product Backlog) |

> Caso académico: Andes Market, las personas del equipo y las marcas del catálogo son ficticias.
> El catálogo proviene de un ERP simulado (API mock) y no hay cobros reales.

## Sprint Goal

> Un cliente de las 3 tiendas piloto puede crear su cuenta, encontrar productos del catálogo real
> (1.500 SKUs vía ERP mock) y armar su carrito en staging, para validar la usabilidad con 5 operadores de tienda.

| PBI | Historia de usuario | SP | Estado |
|---|---|---|---|
| PBI-11 | Como cliente, quiero ver el catálogo y el stock de mi tienda, para comprar solo lo que está disponible | 5 | Done |
| PBI-01 | Como cliente, quiero registrarme e iniciar sesión, para guardar mis pedidos | 5 | Done |
| PBI-02 | Como cliente, quiero buscar productos por nombre o categoría, para encontrarlos rápido | 8 | Done |
| PBI-03 | Como cliente, quiero gestionar mi carrito, para controlar qué compro y cuánto pago | 8 | Done |
| PBI-12 | Como PO, quiero validar la pasarela sandbox (spike), para reducir el riesgo del checkout | 3 | Done |

El checkout (PBI-04) y la franja de retiro (PBI-05) existen detrás del feature flag `checkout`,
apagado, y se construyen en el Sprint 2.

## Cómo ejecutarlo

Requisitos: Node.js 22.8 o superior (el pipeline usa Node 24).

```bash
npm install            # instala Playwright (solo para las pruebas E2E)
npm start              # sirve app/ en http://localhost:4173
npm test               # pruebas unitarias + cobertura con umbral ≥ 70 %
npm run test:e2e       # pruebas funcionales del happy path (Playwright)
```

En Windows se puede usar el Edge instalado en lugar de descargar Chromium:
`$env:PW_CANAL="msedge"; npm run test:e2e`.

## Definition of Done y pipeline

Cada Pull Request usa la [plantilla con el checklist de la DoD](.github/pull_request_template.md)
y pasa por el workflow [CI/CD](.github/workflows/ci-cd.yml):

1. **Pruebas unitarias + cobertura**: `node:test` con umbral ≥ 70 % en líneas, ramas y funciones
   del dominio. Si no se alcanza, el build falla: la DoD no se negocia.
2. **E2E del happy path**: 7 escenarios en Playwright (registro, recuperación, búsqueda, filtros y carrito).
3. **Despliegue a staging** (solo en `main`): `scripts/construir.mjs` genera `dist/` con el entorno
   que define la variable de configuración `APP_ENV`, y se publica en GitHub Pages junto con los reportes.

**Feature flags por entorno** en [`app/config/flags.json`](app/config/flags.json): `buzonSandbox`
está activo en staging y apagado en producción; `checkout` y `franjasRetiro` siguen apagados en
todos los entornos hasta el Sprint 2. Un flag desconocido o con un tipo incorrecto se ignora, y un
entorno desconocido se trata como producción.

## Estructura del repositorio

| Ruta | Para qué sirve |
|---|---|
| `app/index.html` | Página única del Incremento (cabecera, buscador y contenedor de vistas) |
| `app/js/app.js` | Arranque: carga flags y catálogo, registra las rutas y pinta la primera vista |
| `app/js/ui/rutas.js` | Router por hash: registro de rutas, navegación y ganchos después de pintar |
| `app/js/ui/contexto.js` | Servicios compartidos (auth, buzón, carrito) y estado de la sesión |
| `app/js/ui/componentes.js` | Componentes reutilizables: tarjeta de producto, miniatura, formularios, medidor de clave, paginación y estado vacío |
| `app/js/ui/cabecera.js` | Cabecera: buscador con autocompletar, selector de tienda, usuario e insignia del carrito |
| `app/js/ui/dom.js` | Utilidades del DOM: selección, escape de HTML, iniciales y avisos |
| `app/js/ui/mensajes.js` | Textos de error para los códigos del dominio |
| `app/js/ui/vistas/catalogo.js` | Vista de PBI-02: resultados, filtros, orden y paginación |
| `app/js/ui/vistas/cuenta.js` | Vistas de PBI-01: ingreso, registro, recuperación y nueva clave |
| `app/js/ui/vistas/carrito.js` | Vista de PBI-03: líneas, cantidades y resumen con IVA |
| `app/js/ui/vistas/buzon.js` | Vista del buzón sandbox (solo con el flag `buzonSandbox`) |
| `app/js/dominio/erp.js` | PBI-11 · Cliente del ERP mock con validación de contrato y reintentos |
| `app/js/dominio/autenticacion.js` | PBI-01 · Registro, sesión, bloqueo por intentos y recuperación (PBKDF2) |
| `app/js/dominio/buzon.js` | Buzón de correo sandbox (recuperación de clave; confirmación de pedido en el Sprint 2) |
| `app/js/dominio/catalogo.js` | PBI-02 · Búsqueda sin tildes, relevancia, autocompletar y facetas |
| `app/js/dominio/carrito.js` | PBI-03 · Carrito inmutable, reglas de stock, totales con IVA y persistencia |
| `app/js/dominio/flags.js` | Feature toggles por entorno |
| `app/js/dominio/almacen.js` | Adaptador de persistencia (localStorage, sessionStorage o memoria) |
| `app/js/dominio/formato.js` | Formato de pesos chilenos y plurales |
| `app/js/sprint.js` | Tablero del Sprint 1: objetivo, capacidad, burndown y Kanban |
| `app/sprint.html` | Página del tablero |
| `app/css/estilos.css` | Estilos del Incremento (adaptables a celular) |
| `app/css/sprint.css` | Estilos del tablero |
| `app/config/flags.json` | Valores de los feature flags por entorno |
| `app/config/entorno.js` | Entorno de ejecución (`local` en el repo; el pipeline lo reemplaza) |
| `app/data/catalogo.json` | Respuesta del ERP mock: 1.500 SKUs con stock en 3 tiendas (generado) |
| `app/data/sprint-1.json` | Datos del Sprint 1: equipo, capacidad, tareas y burndown |
| `scripts/generar-catalogo.mjs` | Genera el catálogo mock de forma determinista (semilla fija) |
| `scripts/servidor.mjs` | Servidor estático para desarrollo y para las pruebas E2E |
| `scripts/construir.mjs` | Genera `dist/` con el entorno y la versión para el despliegue |
| `scripts/capturar-evidencias.mjs` | Recorre el Incremento y guarda las capturas de `docs/evidencias/` |
| `tests/unit/*.test.mjs` | 51 pruebas unitarias (una suite por PBI más soporte y flags) |
| `tests/e2e/flujo-sprint1.spec.mjs` | 6 pruebas funcionales del happy path |
| `tests/e2e/humo.spec.mjs` | Prueba de humo: el sitio responde |
| `playwright.config.mjs` | Configuración de Playwright (levanta el servidor estático) |
| `docs/spike-pasarela-sandbox.md` | Resultado del spike PBI-12 y decisiones para el backlog |
| `docs/evidencias/` | Capturas del Incremento en staging y del tablero (usadas en la Review) |
| `.github/workflows/ci-cd.yml` | Pipeline: pruebas unitarias, E2E y despliegue a staging |
| `.github/pull_request_template.md` | Checklist de la Definition of Done en cada PR |
| `.github/ISSUE_TEMPLATE/pbi.md` | Plantilla de PBI con criterios Given-When-Then y Definition of Ready |
| `package.json` / `package-lock.json` | Scripts del proyecto y dependencia de Playwright |
| `.gitignore` / `.gitattributes` | Archivos excluidos y fin de línea LF |

## Equipo Scrum (ficticio)

| Rol | Persona |
|---|---|
| Product Owner | Mariela Contreras, Gerente Comercial |
| Scrum Master | Rodrigo Saavedra |
| Developers | Valentina Muñoz (Frontend), Diego Araya (Backend), Francisca Pizarro (QA), Tomás Herrera (UX/UI), Javier Riquelme (DevOps) |
