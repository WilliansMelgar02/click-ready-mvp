import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexar, buscar, autocompletar, normalizar, facetas } from '../../app/js/dominio/catalogo.js';

const PRODUCTOS = [
  { sku: 'AM-000001', nombre: 'Arroz grado 1 1 kg', marca: 'Cordillera', categoria: 'Despensa', precio: 1490, stock: { T01: 10, T02: 0 } },
  { sku: 'AM-000002', nombre: 'Arroz grado 1 5 kg', marca: 'Valle Verde', categoria: 'Despensa', precio: 5990, stock: { T01: 3, T02: 2 } },
  { sku: 'AM-000003', nombre: 'Leche entera 1 L', marca: 'Cordillera', categoria: 'Lácteos y huevos', precio: 1090, stock: { T01: 0, T02: 8 } },
  { sku: 'AM-000004', nombre: 'Café instantáneo 170 g', marca: 'Pacífico', categoria: 'Despensa', precio: 3490, stock: { T01: 5, T02: 5 } },
  { sku: 'AM-000005', nombre: 'Galletas de arroz 100 g', marca: 'Del Sur', categoria: 'Despensa', precio: 890, stock: { T01: 7, T02: 1 } },
];
const indice = indexar(PRODUCTOS);
const skus = (r) => r.items.map((p) => p.sku);

describe('PBI-02 · normalización', () => {
  test('ignora tildes, mayúsculas y espacios repetidos', () => {
    assert.equal(normalizar('  CAFÉ   Instantáneo '), 'cafe instantaneo');
    assert.equal(normalizar(null), '');
  });
});

describe('PBI-02 · búsqueda por nombre o categoría', () => {
  test('encuentra por nombre sin importar tildes', () => {
    assert.deepEqual(skus(buscar(indice, { texto: 'cafe' })), ['AM-000004']);
  });

  test('ordena por relevancia: primero los que empiezan con el término', () => {
    assert.deepEqual(skus(buscar(indice, { texto: 'arroz' })), ['AM-000001', 'AM-000002', 'AM-000005']);
  });

  test('todos los términos deben aparecer (nombre o marca)', () => {
    assert.deepEqual(skus(buscar(indice, { texto: 'arroz cordillera' })), ['AM-000001']);
  });

  test('filtra por categoría', () => {
    assert.deepEqual(skus(buscar(indice, { categoria: 'Lácteos y huevos' })), ['AM-000003']);
  });

  test('sin resultados devuelve total 0 y una página', () => {
    const r = buscar(indice, { texto: 'parlante' });
    assert.equal(r.total, 0);
    assert.equal(r.paginas, 1);
    assert.equal(r.facetas.precio, null);
  });
});

describe('PBI-02 · filtros por marca y precio', () => {
  test('filtra por una o varias marcas', () => {
    assert.deepEqual(skus(buscar(indice, { marcas: ['Cordillera'], orden: 'nombre' })), ['AM-000001', 'AM-000003']);
    assert.equal(buscar(indice, { marcas: ['Cordillera', 'Pacífico'] }).total, 3);
  });

  test('filtra por rango de precio inclusivo', () => {
    assert.deepEqual(skus(buscar(indice, { precioMin: 1090, precioMax: 1490, orden: 'precio-asc' })), ['AM-000003', 'AM-000001']);
  });

  test('puede ocultar productos sin stock en la tienda elegida', () => {
    const r = buscar(indice, { texto: 'arroz', tienda: 'T02', soloConStock: true });
    assert.deepEqual(skus(r), ['AM-000002', 'AM-000005']);
  });

  test('las facetas de marca no se pierden al filtrar una marca', () => {
    const r = buscar(indice, { texto: 'arroz', marcas: ['Valle Verde'] });
    assert.equal(r.total, 1);
    assert.deepEqual(r.facetas.marcas.map((m) => m.nombre), ['Cordillera', 'Del Sur', 'Valle Verde']);
    assert.deepEqual(r.facetas.precio, { min: 890, max: 5990 });
  });

  test('ordena por precio descendente y por nombre', () => {
    assert.equal(buscar(indice, { orden: 'precio-desc' }).items[0].sku, 'AM-000002');
    assert.equal(buscar(indice, { orden: 'nombre' }).items[0].sku, 'AM-000001');
    assert.equal(buscar(indice, { orden: 'desconocido', texto: 'arroz' }).items[0].sku, 'AM-000001');
  });

  test('pagina los resultados y acota la página pedida', () => {
    const r = buscar(indice, { porPagina: 2, pagina: 99 });
    assert.equal(r.paginas, 3);
    assert.equal(r.pagina, 3);
    assert.equal(r.items.length, 1);
  });
});

describe('PBI-02 · autocompletar', () => {
  test('sugiere desde 2 caracteres, sin duplicados y priorizando el inicio', () => {
    assert.deepEqual(autocompletar(indice, 'a'), []);
    assert.deepEqual(autocompletar(indice, 'ar'), ['Arroz grado 1 1 kg', 'Arroz grado 1 5 kg', 'Galletas de arroz 100 g']);
    assert.deepEqual(autocompletar(indice, 'ARR', 1), ['Arroz grado 1 1 kg']);
  });

  test('las facetas cuentan marcas y categorías', () => {
    const f = facetas(PRODUCTOS);
    assert.deepEqual(f.marcas[0], { nombre: 'Cordillera', cantidad: 2 });
    assert.deepEqual(f.categorias[0], { nombre: 'Despensa', cantidad: 4 });
  });
});

describe('PBI-02 · rendimiento con el catálogo completo (1.500 SKUs)', () => {
  const catalogo = JSON.parse(readFileSync(new URL('../../app/data/catalogo.json', import.meta.url), 'utf8'));
  const completo = indexar(catalogo.productos);

  test('el catálogo mock trae exactamente 1.500 SKUs únicos', () => {
    assert.equal(catalogo.productos.length, 1500);
    assert.equal(new Set(catalogo.productos.map((p) => p.sku)).size, 1500);
  });

  test('una búsqueda con filtros responde en menos de 50 ms', () => {
    const inicio = performance.now();
    for (let i = 0; i < 20; i++) buscar(completo, { texto: 'leche', marcas: ['Cordillera'], precioMax: 5000 });
    const promedio = (performance.now() - inicio) / 20;
    assert.ok(promedio < 50, `promedio ${promedio.toFixed(2)} ms`);
  });
});
