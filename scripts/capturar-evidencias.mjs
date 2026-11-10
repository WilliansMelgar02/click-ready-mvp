import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const CANAL = process.argv[3] ?? 'msedge';
const DESTINO = 'docs/evidencias';
mkdirSync(DESTINO, { recursive: true });

const navegador = await chromium.launch({ channel: CANAL || undefined });
const contexto = await navegador.newContext({ viewport: { width: 1366, height: 860 }, locale: 'es-CL', deviceScaleFactor: 1 });
const page = await contexto.newPage();
const listo = () => page.waitForSelector('body[data-listo="true"]');
const sinAvisos = () => page.evaluate(() => document.querySelectorAll('.aviso').forEach((a) => a.remove()));
let n = 0;
async function capturar(nombre, { completa = false } = {}) {
  n += 1;
  const archivo = `${DESTINO}/${String(n).padStart(2, '0')}-${nombre}.png`;
  await page.waitForTimeout(250);
  await page.screenshot({ path: archivo, fullPage: completa });
  console.log(archivo);
}

await page.goto(`${BASE}/#/`);
await listo();
await capturar('catalogo-1500-skus');

await page.getByRole('combobox', { name: 'Buscar productos' }).pressSequentially('lech', { delay: 40 });
await page.waitForSelector('#sugerencias:not([hidden])');
await capturar('autocompletar');

await page.goto(`${BASE}/#/?q=leche&marcas=Valle%20Verde&max=3000&orden=precio-asc`);
await capturar('busqueda-filtros-marca-precio');

await page.goto(`${BASE}/#/registro`);
await page.getByLabel('Nombre y apellido').fill('Camila Fuentes');
await page.getByLabel('Correo electrónico').fill('camila.fuentes@correo.cl');
await page.getByLabel('Contraseña').fill('retiro2026');
await page.getByRole('button', { name: 'Crear cuenta' }).click();
await capturar('registro-clave-debil');
await page.getByLabel('Contraseña').fill('Retiro#2026');
await page.getByRole('button', { name: 'Crear cuenta' }).click();
await page.waitForSelector('#form-ingresar');

await page.getByLabel('Correo electrónico').fill('camila.fuentes@correo.cl');
await page.getByLabel('Contraseña').fill('Retiro#2026');
await sinAvisos();
await capturar('inicio-sesion');
await page.getByRole('button', { name: 'Ingresar' }).click();
await page.waitForSelector('text=Hola, Camila');

await page.goto(`${BASE}/#/?q=arroz%20largo&orden=precio-asc`);
const botones = page.locator('.producto button:not([disabled])');
await botones.nth(0).click();
await botones.nth(0).click();
await botones.nth(3).click();
await page.goto(`${BASE}/#/?q=leche%20entera`);
await page.locator('.producto button:not([disabled])').first().click();
await page.goto(`${BASE}/#/?q=detergente`);
await page.locator('.producto button:not([disabled])').nth(2).click();
await page.goto(`${BASE}/#/carrito`);
await sinAvisos();
await capturar('carrito-totales-iva');

await page.getByRole('button', { name: 'Salir' }).click();
await page.goto(`${BASE}/#/recuperar`);
await page.getByLabel('Correo electrónico').fill('camila.fuentes@correo.cl');
await page.getByRole('button', { name: 'Enviar enlace' }).click();
await page.getByRole('link', { name: 'Abrir buzón sandbox' }).click();
await page.waitForSelector('.correo');
await sinAvisos();
await capturar('buzon-sandbox-recuperacion');

const movil = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CL', deviceScaleFactor: 2, isMobile: true });
const pm = await movil.newPage();
await pm.goto(`${BASE}/#/?cat=Frutas%20y%20verduras`);
await pm.waitForSelector('body[data-listo="true"]');
await pm.waitForTimeout(250);
n += 1;
await pm.screenshot({ path: `${DESTINO}/${String(n).padStart(2, '0')}-movil-catalogo.png` });
console.log(`${DESTINO}/${String(n).padStart(2, '0')}-movil-catalogo.png`);

await page.goto(`${BASE}/sprint.html`);
await page.waitForSelector('.kanban');
await capturar('tablero-sprint1', { completa: true });

const zona = await page.locator('#zona').boundingBox();
await page.mouse.move(zona.x + zona.width * 0.33, zona.y + 100);
n += 1;
await page.waitForTimeout(250);
await page.locator('.dos-columnas').screenshot({ path: `${DESTINO}/${String(n).padStart(2, '0')}-burndown-capacidad.png` });
console.log(`${DESTINO}/${String(n).padStart(2, '0')}-burndown-capacidad.png`);

await navegador.close();
