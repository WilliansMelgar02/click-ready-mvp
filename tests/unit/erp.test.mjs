import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerCatalogo, validarProducto, CONTRATO } from '../../app/js/dominio/erp.js';

const PRODUCTO = { sku: 'AM-000001', nombre: 'Arroz 1 kg', marca: 'Cordillera', categoria: 'Despensa', precio: 1490, stock: { T01: 1 } };
const respuesta = (cuerpo, status = 200) => ({ ok: status < 400, status, json: async () => cuerpo });

describe('PBI-11 · contrato del ERP mock', () => {
  test('valida los campos obligatorios de cada producto', () => {
    assert.deepEqual(validarProducto(PRODUCTO), []);
    assert.deepEqual(validarProducto(null), ['no es un objeto']);
    const errores = validarProducto({ sku: 'X1', nombre: '', marca: ' ', categoria: null, precio: -5, stock: { T01: -1 } });
    assert.equal(errores.length, 6);
    assert.ok(validarProducto({ ...PRODUCTO, stock: null }).includes('stock inválido'));
  });

  test('carga el catálogo y descarta los productos que no cumplen el contrato', async () => {
    const cuerpo = { contrato: CONTRATO, tiendas: [{ id: 'T01' }], productos: [PRODUCTO, { ...PRODUCTO, sku: 'malo' }] };
    const r = await obtenerCatalogo({ fetchImpl: async () => respuesta(cuerpo) });
    assert.equal(r.productos.length, 1);
    assert.deepEqual(r.descartados, [{ sku: 'malo', errores: ['sku con formato inválido'] }]);
    assert.equal(r.intentos, 1);
  });

  test('reintenta ante caídas temporales del ERP', async () => {
    let llamadas = 0;
    const fetchImpl = async () => {
      llamadas += 1;
      if (llamadas < 3) return respuesta({}, 503);
      return respuesta({ contrato: CONTRATO, tiendas: [], productos: [PRODUCTO] });
    };
    const r = await obtenerCatalogo({ fetchImpl, esperaMs: 1 });
    assert.equal(r.intentos, 3);
  });

  test('falla con un mensaje claro si el ERP sigue caído', async () => {
    await assert.rejects(
      obtenerCatalogo({ fetchImpl: async () => { throw new Error('ECONNRESET'); }, reintentos: 1, esperaMs: 1 }),
      /No se pudo cargar el catálogo del ERP: ECONNRESET/,
    );
  });

  test('no reintenta si cambia el contrato (falla rápido)', async () => {
    let llamadas = 0;
    const fetchImpl = async () => { llamadas += 1; return respuesta({ contrato: 'erp/v2', tiendas: [], productos: [] }); };
    await assert.rejects(obtenerCatalogo({ fetchImpl, esperaMs: 1 }), /Contrato inesperado: erp\/v2/);
    assert.equal(llamadas, 1);
    await assert.rejects(obtenerCatalogo({ fetchImpl: async () => respuesta({ contrato: CONTRATO }), esperaMs: 1 }), /sin productos/);
    await assert.rejects(obtenerCatalogo({ fetchImpl: async () => respuesta(null), esperaMs: 1 }), /sin contrato/);
  });
});

