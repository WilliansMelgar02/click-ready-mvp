import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacen } from '../../app/js/dominio/almacen.js';
import {
  crearCarrito, agregar, actualizarCantidad, eliminar, totales, crearRepositorioCarrito, ERRORES, MAXIMO_POR_PRODUCTO,
} from '../../app/js/dominio/carrito.js';

const ARROZ = { sku: 'AM-000001', nombre: 'Arroz grado 1 1 kg', marca: 'Cordillera', precio: 1490, stock: { T01: 10 } };
const LECHE = { sku: 'AM-000003', nombre: 'Leche entera 1 L', marca: 'Cordillera', precio: 1090, stock: { T01: 100 } };
const AGOTADO = { sku: 'AM-000009', nombre: 'Palta hass 1 kg', marca: 'Del Sur', precio: 4990, stock: { T01: 0 } };

const conProductos = () => {
  let c = crearCarrito('T01');
  c = agregar(c, ARROZ, 2).carrito;
  c = agregar(c, LECHE, 3).carrito;
  return c;
};

describe('PBI-03 · agregar', () => {
  test('agrega un producto nuevo y suma cantidades si ya estaba', () => {
    let c = crearCarrito('T01');
    c = agregar(c, ARROZ).carrito;
    c = agregar(c, ARROZ, 2).carrito;
    assert.equal(c.lineas.length, 1);
    assert.equal(c.lineas[0].cantidad, 3);
  });

  test('no modifica el carrito original (inmutable)', () => {
    const original = crearCarrito('T01');
    agregar(original, ARROZ);
    assert.equal(original.lineas.length, 0);
  });

  test('respeta el stock de la tienda, el máximo por producto y cantidades válidas', () => {
    const c = crearCarrito('T01');
    assert.equal(agregar(c, AGOTADO).error, ERRORES.SIN_STOCK);
    assert.equal(agregar(c, ARROZ, 11).error, ERRORES.STOCK_INSUFICIENTE);
    assert.equal(agregar(c, LECHE, MAXIMO_POR_PRODUCTO + 1).error, ERRORES.LIMITE_POR_PRODUCTO);
    for (const mala of [0, -1, 1.5, '2']) assert.equal(agregar(c, ARROZ, mala).error, ERRORES.CANTIDAD_INVALIDA);
    assert.equal(agregar(crearCarrito('T09'), ARROZ).error, ERRORES.SIN_STOCK);
  });
});

describe('PBI-03 · editar y eliminar', () => {
  test('actualiza la cantidad dentro del stock', () => {
    const r = actualizarCantidad(conProductos(), ARROZ.sku, 5);
    assert.equal(r.ok, true);
    assert.equal(r.carrito.lineas[0].cantidad, 5);
    assert.equal(actualizarCantidad(conProductos(), ARROZ.sku, 11).error, ERRORES.STOCK_INSUFICIENTE);
    assert.equal(actualizarCantidad(conProductos(), 'AM-999999', 1).error, ERRORES.NO_ESTA_EN_CARRITO);
  });

  test('cantidad 0 elimina la línea', () => {
    const r = actualizarCantidad(conProductos(), ARROZ.sku, 0);
    assert.deepEqual(r.carrito.lineas.map((l) => l.sku), [LECHE.sku]);
  });

  test('elimina una línea', () => {
    const r = eliminar(conProductos(), LECHE.sku);
    assert.deepEqual(r.carrito.lineas.map((l) => l.sku), [ARROZ.sku]);
    assert.equal(eliminar(r.carrito, LECHE.sku).error, ERRORES.NO_ESTA_EN_CARRITO);
  });
});

describe('PBI-03 · totales actualizados (IVA incluido)', () => {
  test('calcula total, neto e IVA a partir de precios con IVA', () => {
    assert.deepEqual(totales(conProductos()), { lineas: 2, unidades: 5, neto: 5252, iva: 998, total: 6250 });
  });

  test('un carrito vacío totaliza cero', () => {
    assert.deepEqual(totales(crearCarrito('T01')), { lineas: 0, unidades: 0, neto: 0, iva: 0, total: 0 });
  });

  test('los totales cambian al editar', () => {
    const r = actualizarCantidad(conProductos(), LECHE.sku, 1);
    assert.equal(totales(r.carrito).total, 2 * 1490 + 1090);
  });
});

describe('PBI-03 · persistencia por sesión', () => {
  test('guarda y recupera el carrito por usuario y tienda', () => {
    const repo = crearRepositorioCarrito(crearAlmacen());
    repo.guardar('ana@mail.cl', conProductos());
    assert.equal(repo.cargar('ana@mail.cl', 'T01').lineas.length, 2);
    assert.equal(repo.cargar('ana@mail.cl', 'T02').lineas.length, 0);
    assert.equal(repo.cargar('otro@mail.cl', 'T01').lineas.length, 0);
  });

  test('un valor corrupto se reemplaza por un carrito vacío', () => {
    const almacen = crearAlmacen();
    almacen.guardar('cr.carrito.invitado.T01', { lineas: 'no-es-lista' });
    assert.deepEqual(crearRepositorioCarrito(almacen).cargar(null, 'T01'), crearCarrito('T01'));
  });

  test('al iniciar sesión fusiona el carrito de invitado con el del usuario', () => {
    const almacen = crearAlmacen();
    const repo = crearRepositorioCarrito(almacen);
    repo.guardar(null, agregar(crearCarrito('T01'), ARROZ, 2).carrito);
    repo.guardar('ana@mail.cl', agregar(crearCarrito('T01'), ARROZ, 1).carrito);
    const fusionado = repo.fusionarInvitado('ana@mail.cl', 'T01');
    assert.equal(fusionado.lineas[0].cantidad, 3);
    assert.equal(repo.cargar(null, 'T01').lineas.length, 0);
  });
});
