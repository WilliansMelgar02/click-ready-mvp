import { esc, vista } from '../dom.js';
import { buzon, ENTORNO } from '../contexto.js';
import { estadoVacio } from '../componentes.js';

function correo(m) {
  return `
    <li class="correo">
      <div class="correo__cabecera"><strong>${esc(m.asunto)}</strong><time>${esc(new Date(m.fecha).toLocaleString('es-CL'))}</time></div>
      <p class="tenue">Para: ${esc(m.para)}</p>
      <p>${esc(m.cuerpo)}</p>
      ${m.enlace ? `<a class="btn btn--primario" href="${esc(m.enlace)}">Restablecer contraseña</a>` : ''}
    </li>`;
}

export function vistaBuzon() {
  const mensajes = buzon.listar();
  vista().innerHTML = `
    <section class="buzon" aria-labelledby="titulo-buzon">
      <h1 id="titulo-buzon">Buzón sandbox</h1>
      <p class="tenue">Correos transaccionales capturados en ${esc(ENTORNO)}. No se envían a direcciones reales.</p>
      ${mensajes.length ? `<ul class="correos">${mensajes.map(correo).join('')}</ul>` : estadoVacio('No hay correos todavía.')}
    </section>`;
}
