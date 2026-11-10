export const CONTRATO = 'erp-mock/v1';
const RE_SKU = /^AM-\d{6}$/;

export function validarProducto(p) {
  const errores = [];
  if (!p || typeof p !== 'object') return ['no es un objeto'];
  if (!RE_SKU.test(p.sku ?? '')) errores.push('sku con formato inválido');
  if (typeof p.nombre !== 'string' || !p.nombre.trim()) errores.push('nombre vacío');
  if (typeof p.marca !== 'string' || !p.marca.trim()) errores.push('marca vacía');
  if (typeof p.categoria !== 'string' || !p.categoria.trim()) errores.push('categoría vacía');
  if (!Number.isInteger(p.precio) || p.precio <= 0) errores.push('precio inválido');
  if (!p.stock || typeof p.stock !== 'object' || Object.values(p.stock).some((s) => !Number.isInteger(s) || s < 0)) {
    errores.push('stock inválido');
  }
  return errores;
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export async function obtenerCatalogo({ fetchImpl = globalThis.fetch, url = 'data/catalogo.json', reintentos = 2, esperaMs = 300 } = {}) {
  let ultimoError;
  for (let intento = 0; intento <= reintentos; intento++) {
    try {
      const respuesta = await fetchImpl(url, { cache: 'no-store' });
      if (!respuesta.ok) throw new Error(`El ERP respondió HTTP ${respuesta.status}`);
      const datos = await respuesta.json();
      if (datos?.contrato !== CONTRATO) throw new Error(`Contrato inesperado: ${datos?.contrato ?? 'sin contrato'}`);
      if (!Array.isArray(datos.productos) || !Array.isArray(datos.tiendas)) throw new Error('Respuesta sin productos o tiendas');

      const productos = [];
      const descartados = [];
      for (const p of datos.productos) {
        const errores = validarProducto(p);
        if (errores.length) descartados.push({ sku: p?.sku ?? null, errores });
        else productos.push(p);
      }
      return { tiendas: datos.tiendas, productos, descartados, intentos: intento + 1 };
    } catch (error) {
      ultimoError = error;
      if (/Contrato|sin productos/.test(error.message)) break;
      if (intento < reintentos) await esperar(esperaMs * (intento + 1));
    }
  }
  throw new Error(`No se pudo cargar el catálogo del ERP: ${ultimoError.message}`);
}
