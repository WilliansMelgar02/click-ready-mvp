import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacen } from '../../app/js/dominio/almacen.js';
import { crearBuzon } from '../../app/js/dominio/buzon.js';
import {
  crearServicioAuth, validarEmail, evaluarClave, normalizarEmail, CODIGOS, POLITICA,
} from '../../app/js/dominio/autenticacion.js';

const CLAVE_OK = 'Andes#2026';

function contexto() {
  let ahora = Date.parse('2026-07-06T10:00:00Z');
  const reloj = () => ahora;
  const almacen = crearAlmacen();
  const buzon = crearBuzon({ almacen, reloj });
  const auth = crearServicioAuth({ almacen, buzon, reloj, iteraciones: 1000, urlBase: 'https://staging.test/' });
  return { auth, buzon, almacen, avanzar: (ms) => { ahora += ms; } };
}

const tokenDelCorreo = (correo) => new URL(correo.enlace.replace('#/', '')).searchParams.get('token');

describe('PBI-01 · validaciones', () => {
  test('acepta correos válidos y rechaza los mal formados', () => {
    assert.equal(validarEmail('cliente@andesmarket.cl'), true);
    assert.equal(validarEmail('  Cliente@AndesMarket.CL '), true);
    for (const malo of ['', 'cliente', 'cliente@', '@andes.cl', 'cli ente@andes.cl', 'a@b.c', null]) {
      assert.equal(validarEmail(malo), false, `debería rechazar ${malo}`);
    }
  });

  test('normaliza el correo a minúsculas y sin espacios', () => {
    assert.equal(normalizarEmail('  Ana.Rojas@Mail.CL '), 'ana.rojas@mail.cl');
  });

  test('exige clave segura y explica lo que falta', () => {
    assert.deepEqual(evaluarClave(CLAVE_OK), { valida: true, faltantes: [] });
    const debil = evaluarClave('abc');
    assert.equal(debil.valida, false);
    assert.deepEqual(debil.faltantes, ['al menos 8 caracteres', 'una letra mayúscula', 'un número', 'un símbolo']);
    assert.equal(evaluarClave('SOLOMAYUSCULAS1!').faltantes[0], 'una letra minúscula');
    assert.equal(evaluarClave(undefined).valida, false);
  });
});

describe('PBI-01 · registro', () => {
  test('registra un cliente sin guardar la clave en texto plano', async () => {
    const { auth, almacen } = contexto();
    const r = await auth.registrar({ nombre: 'Ana Rojas', email: 'Ana@Mail.cl', clave: CLAVE_OK });
    assert.deepEqual(r, { ok: true, usuario: { nombre: 'Ana Rojas', email: 'ana@mail.cl' } });
    const guardado = almacen.leer('cr.usuarios')['ana@mail.cl'];
    assert.notEqual(guardado.hash, CLAVE_OK);
    assert.equal(guardado.hash.length, 64);
    assert.equal(JSON.stringify(guardado).includes(CLAVE_OK), false);
  });

  test('rechaza nombre vacío, correo inválido, clave débil y correo duplicado', async () => {
    const { auth } = contexto();
    assert.equal((await auth.registrar({ nombre: ' ', email: 'a@mail.cl', clave: CLAVE_OK })).error, CODIGOS.NOMBRE_REQUERIDO);
    assert.equal((await auth.registrar({ nombre: 'Ana', email: 'malo', clave: CLAVE_OK })).error, CODIGOS.EMAIL_INVALIDO);
    const debil = await auth.registrar({ nombre: 'Ana', email: 'a@mail.cl', clave: '123' });
    assert.equal(debil.error, CODIGOS.CLAVE_DEBIL);
    assert.ok(debil.faltantes.length > 0);
    await auth.registrar({ nombre: 'Ana', email: 'a@mail.cl', clave: CLAVE_OK });
    assert.equal((await auth.registrar({ nombre: 'Otra', email: 'A@MAIL.CL', clave: CLAVE_OK })).error, CODIGOS.EMAIL_REGISTRADO);
  });
});

describe('PBI-01 · inicio de sesión', () => {
  test('inicia sesión con credenciales correctas y la sesión expira a las 8 horas', async () => {
    const { auth, avanzar } = contexto();
    await auth.registrar({ nombre: 'Ana', email: 'ana@mail.cl', clave: CLAVE_OK });
    const r = await auth.iniciarSesion('ANA@mail.cl', CLAVE_OK);
    assert.equal(r.ok, true);
    assert.equal(auth.sesionActual().email, 'ana@mail.cl');
    avanzar(POLITICA.duracionSesionMs);
    assert.equal(auth.sesionActual(), null);
  });

  test('no revela si el correo existe', async () => {
    const { auth } = contexto();
    await auth.registrar({ nombre: 'Ana', email: 'ana@mail.cl', clave: CLAVE_OK });
    const inexistente = await auth.iniciarSesion('nadie@mail.cl', CLAVE_OK);
    const claveMala = await auth.iniciarSesion('ana@mail.cl', 'Otra#2026');
    assert.equal(inexistente.error, CODIGOS.CREDENCIALES_INVALIDAS);
    assert.equal(claveMala.error, CODIGOS.CREDENCIALES_INVALIDAS);
  });

  test('bloquea la cuenta 15 minutos tras 5 intentos fallidos', async () => {
    const { auth, avanzar } = contexto();
    await auth.registrar({ nombre: 'Ana', email: 'ana@mail.cl', clave: CLAVE_OK });
    for (let i = 0; i < POLITICA.intentosMaximos; i++) await auth.iniciarSesion('ana@mail.cl', 'Mala#2026');
    const bloqueada = await auth.iniciarSesion('ana@mail.cl', CLAVE_OK);
    assert.equal(bloqueada.error, CODIGOS.CUENTA_BLOQUEADA);
    assert.equal(bloqueada.minutosRestantes, 15);
    avanzar(POLITICA.bloqueoMs);
    assert.equal((await auth.iniciarSesion('ana@mail.cl', CLAVE_OK)).ok, true);
  });

  test('cerrar sesión elimina la sesión activa', async () => {
    const { auth } = contexto();
    await auth.registrar({ nombre: 'Ana', email: 'ana@mail.cl', clave: CLAVE_OK });
    await auth.iniciarSesion('ana@mail.cl', CLAVE_OK);
    auth.cerrarSesion();
    assert.equal(auth.sesionActual(), null);
  });
});

describe('PBI-01 · recuperación vía correo', () => {
  test('envía un enlace de un solo uso y permite definir una nueva clave', async () => {
    const { auth, buzon } = contexto();
    await auth.registrar({ nombre: 'Ana', email: 'ana@mail.cl', clave: CLAVE_OK });
    assert.deepEqual(await auth.solicitarRecuperacion('ana@mail.cl'), { ok: true });

    const [correo] = buzon.listar('ana@mail.cl');
    assert.match(correo.asunto, /Restablece tu contraseña/);
    assert.match(correo.enlace, /^https:\/\/staging\.test\/#\/restablecer\?token=[0-9a-f]{32}$/);

    const token = tokenDelCorreo(correo);
    assert.equal((await auth.restablecerClave(token, 'Nueva#2026')).ok, true);
    assert.equal((await auth.iniciarSesion('ana@mail.cl', 'Nueva#2026')).ok, true);
    assert.equal((await auth.iniciarSesion('ana@mail.cl', CLAVE_OK)).ok, false);
    assert.equal((await auth.restablecerClave(token, 'Otra#2026')).error, CODIGOS.TOKEN_INVALIDO);
  });

  test('no envía correo a cuentas inexistentes, pero responde igual', async () => {
    const { auth, buzon } = contexto();
    assert.deepEqual(await auth.solicitarRecuperacion('nadie@mail.cl'), { ok: true });
    assert.equal(buzon.listar().length, 0);
  });

  test('el enlace vence a los 30 minutos y exige clave segura', async () => {
    const { auth, buzon, avanzar } = contexto();
    await auth.registrar({ nombre: 'Ana', email: 'ana@mail.cl', clave: CLAVE_OK });
    await auth.solicitarRecuperacion('ana@mail.cl');
    const token = tokenDelCorreo(buzon.listar()[0]);
    assert.equal((await auth.restablecerClave(token, 'debil')).error, CODIGOS.CLAVE_DEBIL);
    avanzar(POLITICA.vigenciaTokenMs);
    assert.equal((await auth.restablecerClave(token, 'Nueva#2026')).error, CODIGOS.TOKEN_EXPIRADO);
    assert.equal((await auth.restablecerClave('inventado', 'Nueva#2026')).error, CODIGOS.TOKEN_INVALIDO);
  });
});
