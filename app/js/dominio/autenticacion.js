export const CODIGOS = Object.freeze({
  NOMBRE_REQUERIDO: 'NOMBRE_REQUERIDO',
  EMAIL_INVALIDO: 'EMAIL_INVALIDO',
  CLAVE_DEBIL: 'CLAVE_DEBIL',
  EMAIL_REGISTRADO: 'EMAIL_REGISTRADO',
  CREDENCIALES_INVALIDAS: 'CREDENCIALES_INVALIDAS',
  CUENTA_BLOQUEADA: 'CUENTA_BLOQUEADA',
  TOKEN_INVALIDO: 'TOKEN_INVALIDO',
  TOKEN_EXPIRADO: 'TOKEN_EXPIRADO',
});

export const POLITICA = Object.freeze({
  largoMinimo: 8,
  intentosMaximos: 5,
  bloqueoMs: 15 * 60 * 1000,
  duracionSesionMs: 8 * 60 * 60 * 1000,
  vigenciaTokenMs: 30 * 60 * 1000,
});

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CLAVE_USUARIOS = 'cr.usuarios';
const CLAVE_TOKENS = 'cr.tokens';
const CLAVE_SESION = 'cr.sesion';

export function normalizarEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function validarEmail(email) {
  const valor = normalizarEmail(email);
  return valor.length > 0 && valor.length <= 254 && RE_EMAIL.test(valor);
}

export function evaluarClave(clave) {
  const texto = String(clave ?? '');
  const faltantes = [];
  if (texto.length < POLITICA.largoMinimo) faltantes.push(`al menos ${POLITICA.largoMinimo} caracteres`);
  if (!/[a-záéíóúñ]/.test(texto)) faltantes.push('una letra minúscula');
  if (!/[A-ZÁÉÍÓÚÑ]/.test(texto)) faltantes.push('una letra mayúscula');
  if (!/\d/.test(texto)) faltantes.push('un número');
  if (!/[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ]/.test(texto)) faltantes.push('un símbolo');
  return { valida: faltantes.length === 0, faltantes };
}

const codificador = new TextEncoder();
const aHex = (bytes) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

function bytesAleatorios(n) {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

async function derivarClave(clave, salHex, iteraciones) {
  const sal = Uint8Array.from(salHex.match(/.{2}/g), (h) => parseInt(h, 16));
  const material = await globalThis.crypto.subtle.importKey('raw', codificador.encode(clave), 'PBKDF2', false, ['deriveBits']);
  const bits = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, material, 256);
  return aHex(bits);
}

async function resumen(texto) {
  return aHex(await globalThis.crypto.subtle.digest('SHA-256', codificador.encode(texto)));
}

function igualesSeguro(a, b) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

export function crearServicioAuth({ almacen, buzon, reloj = () => Date.now(), iteraciones = 100_000, urlBase = '' }) {
  const usuarios = () => almacen.leer(CLAVE_USUARIOS, {});
  const guardarUsuarios = (u) => almacen.guardar(CLAVE_USUARIOS, u);
  const fallo = (error, extra = {}) => ({ ok: false, error, ...extra });

  return {
    async registrar({ nombre, email, clave }) {
      const nombreLimpio = String(nombre ?? '').trim();
      if (!nombreLimpio) return fallo(CODIGOS.NOMBRE_REQUERIDO);
      if (!validarEmail(email)) return fallo(CODIGOS.EMAIL_INVALIDO);
      const evaluacion = evaluarClave(clave);
      if (!evaluacion.valida) return fallo(CODIGOS.CLAVE_DEBIL, { faltantes: evaluacion.faltantes });

      const correo = normalizarEmail(email);
      const todos = usuarios();
      if (todos[correo]) return fallo(CODIGOS.EMAIL_REGISTRADO);

      const sal = aHex(bytesAleatorios(16));
      todos[correo] = {
        nombre: nombreLimpio,
        email: correo,
        sal,
        hash: await derivarClave(clave, sal, iteraciones),
        creado: new Date(reloj()).toISOString(),
        intentosFallidos: 0,
        bloqueadoHasta: 0,
      };
      guardarUsuarios(todos);
      return { ok: true, usuario: { nombre: nombreLimpio, email: correo } };
    },

    async iniciarSesion(email, clave) {
      const correo = normalizarEmail(email);
      const todos = usuarios();
      const usuario = todos[correo];
      if (!usuario) return fallo(CODIGOS.CREDENCIALES_INVALIDAS);

      const ahora = reloj();
      if (usuario.bloqueadoHasta > ahora) {
        return fallo(CODIGOS.CUENTA_BLOQUEADA, { minutosRestantes: Math.ceil((usuario.bloqueadoHasta - ahora) / 60000) });
      }

      const hash = await derivarClave(String(clave ?? ''), usuario.sal, iteraciones);
      if (!igualesSeguro(hash, usuario.hash)) {
        usuario.intentosFallidos += 1;
        if (usuario.intentosFallidos >= POLITICA.intentosMaximos) {
          usuario.bloqueadoHasta = ahora + POLITICA.bloqueoMs;
          usuario.intentosFallidos = 0;
        }
        guardarUsuarios(todos);
        return fallo(CODIGOS.CREDENCIALES_INVALIDAS);
      }

      usuario.intentosFallidos = 0;
      usuario.bloqueadoHasta = 0;
      guardarUsuarios(todos);
      const sesion = { email: correo, nombre: usuario.nombre, expira: ahora + POLITICA.duracionSesionMs };
      almacen.guardar(CLAVE_SESION, sesion);
      return { ok: true, sesion };
    },

    sesionActual() {
      const sesion = almacen.leer(CLAVE_SESION);
      if (!sesion) return null;
      if (sesion.expira <= reloj()) {
        almacen.borrar(CLAVE_SESION);
        return null;
      }
      return sesion;
    },

    cerrarSesion() {
      almacen.borrar(CLAVE_SESION);
    },

    async solicitarRecuperacion(email) {
      const correo = normalizarEmail(email);
      const usuario = usuarios()[correo];
      if (!usuario) return { ok: true };

      const token = aHex(bytesAleatorios(16));
      const tokens = almacen.leer(CLAVE_TOKENS, {});
      tokens[await resumen(token)] = { email: correo, expira: reloj() + POLITICA.vigenciaTokenMs };
      almacen.guardar(CLAVE_TOKENS, tokens);

      buzon.enviar({
        para: correo,
        asunto: 'Click&Ready · Restablece tu contraseña',
        cuerpo: `Hola ${usuario.nombre}: recibimos una solicitud para restablecer tu contraseña. `
          + 'El enlace es válido por 30 minutos. Si no fuiste tú, ignora este correo.',
        enlace: `${urlBase}#/restablecer?token=${token}`,
      });
      return { ok: true };
    },

    async restablecerClave(token, nuevaClave) {
      const tokens = almacen.leer(CLAVE_TOKENS, {});
      const clave = await resumen(String(token ?? ''));
      const registro = tokens[clave];
      if (!registro) return fallo(CODIGOS.TOKEN_INVALIDO);
      if (registro.expira <= reloj()) {
        delete tokens[clave];
        almacen.guardar(CLAVE_TOKENS, tokens);
        return fallo(CODIGOS.TOKEN_EXPIRADO);
      }
      const evaluacion = evaluarClave(nuevaClave);
      if (!evaluacion.valida) return fallo(CODIGOS.CLAVE_DEBIL, { faltantes: evaluacion.faltantes });

      const todos = usuarios();
      const usuario = todos[registro.email];
      usuario.sal = aHex(bytesAleatorios(16));
      usuario.hash = await derivarClave(nuevaClave, usuario.sal, iteraciones);
      usuario.intentosFallidos = 0;
      usuario.bloqueadoHasta = 0;
      guardarUsuarios(todos);
      delete tokens[clave];
      almacen.guardar(CLAVE_TOKENS, tokens);
      return { ok: true };
    },
  };
}
