import { $, vista, avisar } from '../dom.js';
import { auth, estado, fusionarCarritoInvitado } from '../contexto.js';
import {
  tarjetaFormulario, campo, cajaError, mostrarError, bloquear, medidorClave, listaReglasClave,
} from '../componentes.js';
import { MENSAJES } from '../mensajes.js';
import { navegar } from '../rutas.js';

const CORREO = campo('Correo electrónico', 'name="email" type="email" autocomplete="email" required');

function formulario(id, contenido, boton) {
  return `<form id="${id}" novalidate>${cajaError}${contenido}<button class="btn btn--primario btn--bloque" type="submit">${boton}</button></form>`;
}

function alEnviar(form, accion) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = new FormData(form);
    bloquear(form, true);
    try {
      await accion(datos);
    } finally {
      bloquear(form, false);
    }
  });
}

export function vistaIngresar(params) {
  vista().innerHTML = tarjetaFormulario('Ingresa a tu cuenta',
    formulario('form-ingresar', CORREO + campo('Contraseña', 'name="clave" type="password" autocomplete="current-password" required'), 'Ingresar'),
    '<a href="#/recuperar">¿Olvidaste tu contraseña?</a><span>¿No tienes cuenta? <a href="#/registro">Créala aquí</a></span>');

  if (params.get('registrado')) avisar('Cuenta creada. Ya puedes ingresar.');
  const form = $('#form-ingresar');
  alEnviar(form, async (datos) => {
    const r = await auth.iniciarSesion(datos.get('email'), datos.get('clave'));
    if (!r.ok) {
      const espera = r.minutosRestantes ? ` Intenta de nuevo en ${r.minutosRestantes} minutos.` : '';
      return mostrarError(form, MENSAJES[r.error] + espera);
    }
    fusionarCarritoInvitado(r.sesion.email);
    avisar(`Bienvenida/o, ${r.sesion.nombre.split(' ')[0]}.`);
    navegar('/');
  });
}

export function vistaRegistro() {
  vista().innerHTML = tarjetaFormulario('Crea tu cuenta',
    formulario('form-registro',
      campo('Nombre y apellido', 'name="nombre" autocomplete="name" required')
      + CORREO
      + campo('Contraseña', 'name="clave" type="password" autocomplete="new-password" required aria-describedby="reglas-clave"')
      + listaReglasClave,
      'Crear cuenta'),
    '<span>¿Ya tienes cuenta? <a href="#/ingresar">Ingresa</a></span>');

  const form = $('#form-registro');
  medidorClave(form.elements.clave, $('#reglas-clave'));
  alEnviar(form, async (datos) => {
    const r = await auth.registrar(Object.fromEntries(datos));
    if (!r.ok) return mostrarError(form, MENSAJES[r.error], r.faltantes);
    navegar('/ingresar', new URLSearchParams({ registrado: '1' }));
  });
}

export function vistaRecuperar() {
  vista().innerHTML = tarjetaFormulario('Recupera tu contraseña',
    `<p class="tenue">Te enviaremos un enlace para crear una nueva contraseña. Vence en 30 minutos.</p>
     ${formulario('form-recuperar', CORREO, 'Enviar enlace')}
     <div class="exito" id="exito-recuperar" hidden></div>`,
    '<a href="#/ingresar">Volver a ingresar</a>');

  const form = $('#form-recuperar');
  alEnviar(form, async (datos) => {
    await auth.solicitarRecuperacion(datos.get('email'));
    const exito = $('#exito-recuperar');
    exito.hidden = false;
    exito.innerHTML = `<p>Si el correo está registrado, te enviamos un enlace de recuperación.</p>
      ${estado.flags.buzonSandbox ? '<p><a class="btn btn--secundario" href="#/buzon">Abrir buzón sandbox</a></p>' : ''}`;
    form.hidden = true;
  });
}

export function vistaRestablecer(params) {
  vista().innerHTML = tarjetaFormulario('Crea una nueva contraseña',
    formulario('form-restablecer',
      campo('Nueva contraseña', 'name="clave" type="password" autocomplete="new-password" required') + listaReglasClave,
      'Guardar contraseña'));

  const form = $('#form-restablecer');
  medidorClave(form.elements.clave, $('#reglas-clave'));
  alEnviar(form, async (datos) => {
    const r = await auth.restablecerClave(params.get('token'), datos.get('clave'));
    if (!r.ok) return mostrarError(form, MENSAJES[r.error], r.faltantes);
    avisar('Contraseña actualizada. Ingresa con tu nueva clave.');
    navegar('/ingresar');
  });
}
