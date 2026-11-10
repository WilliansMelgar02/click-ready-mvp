import { cpSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { entornoValido } from '../app/js/dominio/flags.js';

const pedido = process.env.APP_ENV ?? 'staging';
const entorno = entornoValido(pedido);
if (entorno !== pedido) {
  console.error(`APP_ENV="${pedido}" no es válido (local | staging | produccion).`);
  process.exit(1);
}
const version = (process.env.APP_VERSION ?? 'local').slice(0, 12);
const fecha = new Date().toISOString().slice(0, 10);

rmSync('dist', { recursive: true, force: true });
cpSync('app', 'dist', { recursive: true });
writeFileSync('dist/config/entorno.js',
  `window.APP_ENV = ${JSON.stringify(entorno)};\nwindow.APP_VERSION = ${JSON.stringify(`${version} · ${fecha}`)};\n`);

mkdirSync('dist/reportes', { recursive: true });
writeFileSync('dist/reportes/index.html', `<!doctype html><html lang="es-CL"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Reportes del pipeline · Click&amp;Ready</title>
<link rel="stylesheet" href="../css/estilos.css"></head><body><main class="contenedor" style="padding:32px 20px">
<h1>Reportes del pipeline</h1><p class="tenue">Versión ${version} · ${fecha} · entorno ${entorno}</p>
<ul><li><a href="unitarias/reporte-unitarias.txt">Pruebas unitarias y cobertura (node:test)</a></li>
<li><a href="e2e/index.html">Pruebas funcionales E2E (Playwright)</a></li>
<li><a href="../sprint.html">Tablero del Sprint 1</a></li><li><a href="../">Incremento en staging</a></li></ul>
</main></body></html>\n`);

console.log(`dist/ listo · entorno=${entorno} · versión=${version}`);
