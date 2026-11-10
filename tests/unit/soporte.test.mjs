import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolverFlags, entornoValido, FLAGS_POR_DEFECTO } from '../../app/js/dominio/flags.js';
import { crearAlmacen, crearAlmacenMemoria } from '../../app/js/dominio/almacen.js';
import { crearBuzon } from '../../app/js/dominio/buzon.js';
import { formatoCLP, pluralizar } from '../../app/js/dominio/formato.js';

describe('DoD · feature toggles por entorno', () => {
  const config = {
    comunes: { autocompletar: true },
    entornos: { staging: { buzonSandbox: true, checkout: false }, produccion: { buzonSandbox: false } },
  };

  test('staging habilita el buzón sandbox y mantiene apagado el checkout', () => {
    const f = resolverFlags(config, 'staging');
    assert.equal(f.buzonSandbox, true);
    assert.equal(f.checkout, false);
    assert.ok(Object.isFrozen(f));
  });

  test('un entorno desconocido se trata como producción (lo más seguro)', () => {
    assert.equal(entornoValido('qa'), 'produccion');
    assert.equal(entornoValido('local'), 'local');
    assert.equal(resolverFlags(config, 'qa').buzonSandbox, false);
  });

  test('ignora flags desconocidos o con tipos incorrectos', () => {
    const f = resolverFlags({ comunes: { checkout: 'si', inventado: true } }, 'staging');
    assert.equal(f.checkout, false);
    assert.equal('inventado' in f, false);
    assert.deepEqual({ ...resolverFlags(undefined, 'local') }, { ...FLAGS_POR_DEFECTO });
  });
});

describe('Soporte · almacén, buzón y formato', () => {
  test('el almacén tolera valores corruptos y permite borrar', () => {
    const backend = crearAlmacenMemoria();
    const almacen = crearAlmacen(backend);
    backend.setItem('roto', '{no es json');
    assert.equal(almacen.leer('roto', 'defecto'), 'defecto');
    almacen.guardar('x', { a: 1 });
    assert.deepEqual(almacen.leer('x'), { a: 1 });
    almacen.borrar('x');
    assert.equal(almacen.leer('x'), null);
  });

  test('el buzón guarda los correos recientes primero y filtra por destinatario', () => {
    const buzon = crearBuzon({ almacen: crearAlmacen(), reloj: () => 0 });
    buzon.enviar({ para: 'Ana@Mail.cl', asunto: 'Uno', cuerpo: '...' });
    buzon.enviar({ para: 'otro@mail.cl', asunto: 'Dos', cuerpo: '...' });
    assert.deepEqual(buzon.listar().map((m) => m.asunto), ['Dos', 'Uno']);
    assert.equal(buzon.listar('ana@mail.cl').length, 1);
    assert.throws(() => buzon.enviar({ para: '', asunto: 'x' }), /destinatario/);
  });

  test('formatea montos en pesos chilenos', () => {
    assert.equal(formatoCLP(1490), '$1.490');
    assert.equal(formatoCLP(1234567.4), '$1.234.567');
    assert.equal(pluralizar(1, 'producto'), '1 producto');
    assert.equal(pluralizar(3, 'producto'), '3 productos');
    assert.equal(pluralizar(2, 'unidad', 'unidades'), '2 unidades');
  });
});
