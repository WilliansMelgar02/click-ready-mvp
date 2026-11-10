import { evaluarClave } from '../dominio/autenticacion.js';
import { formatoCLP } from '../dominio/formato.js';
import { $, esc, iniciales } from './dom.js';

export function miniatura(nombre, categoria, clase = 'producto__imagen') {
  return `<div class="${clase}" data-categoria="${esc(categoria)}" aria-hidden="true">${esc(iniciales(nombre))}</div>`;
}

export function tarjetaProducto(producto, tienda) {
  const stock = producto.stock[tienda] ?? 0;
  const [clase, texto] = stock === 0
    ? ['agotado', 'Sin stock en esta tienda']
    : stock <= 5 ? ['bajo', `Quedan ${stock}`] : ['ok', 'Disponible para retiro'];
  return `
    <article class="producto" data-sku="${esc(producto.sku)}">
      ${miniatura(producto.nombre, producto.categoria)}
      <p class="producto__marca">${esc(producto.marca)}</p>
      <h3 class="producto__nombre">${esc(producto.nombre)}</h3>
      <p class="producto__precio">${formatoCLP(producto.precio)}</p>
      <p class="producto__stock producto__stock--${clase}">${texto}</p>
      <button class="btn btn--primario btn--bloque" type="button" data-accion="agregar" data-sku="${esc(producto.sku)}" ${stock === 0 ? 'disabled' : ''}>Agregar</button>
    </article>`;
}

export function encabezadoPagina({ id, titulo, detalle, idDetalle = '', acciones = '' }) {
  return `
    <div class="encabezado-pagina">
      <div class="encabezado-pagina__texto">
        <h1 id="${id}">${titulo}</h1>
        <p class="tenue"${idDetalle ? ` id="${idDetalle}"` : ''}>${detalle}</p>
      </div>
      ${acciones}
    </div>`;
}

export function estadoVacio(texto, accion = '') {
  return `<div class="vacio"><p>${texto}</p>${accion}</div>`;
}

export function paginacion(pagina, paginas) {
  if (paginas <= 1) return '';
  return `
    <nav class="paginacion" aria-label="Paginación">
      <button class="btn btn--secundario" type="button" data-accion="pagina" data-valor="${pagina - 1}" ${pagina === 1 ? 'disabled' : ''}>Anterior</button>
      <span>Página ${pagina} de ${paginas}</span>
      <button class="btn btn--secundario" type="button" data-accion="pagina" data-valor="${pagina + 1}" ${pagina === paginas ? 'disabled' : ''}>Siguiente</button>
    </nav>`;
}

export function tarjetaFormulario(titulo, cuerpo, pie = '') {
  return `<section class="tarjeta-form" aria-labelledby="titulo-form">
      <h1 id="titulo-form">${titulo}</h1>${cuerpo}${pie ? `<div class="tarjeta-form__pie">${pie}</div>` : ''}
    </section>`;
}

export function campo(etiqueta, atributos) {
  return `<label>${etiqueta}<input ${atributos}></label>`;
}

export const cajaError = '<div class="error-form" role="alert" hidden></div>';

export function mostrarError(form, texto, faltantes = []) {
  const caja = $('.error-form', form);
  caja.hidden = false;
  caja.innerHTML = `<p>${esc(texto)}</p>${faltantes.length ? `<ul>${faltantes.map((x) => `<li>Falta ${esc(x)}</li>`).join('')}</ul>` : ''}`;
}

export function bloquear(form, ocupado) {
  form.querySelectorAll('button, input').forEach((el) => { el.disabled = ocupado; });
}

const REGLAS_CLAVE = ['al menos 8 caracteres', 'una letra minúscula', 'una letra mayúscula', 'un número', 'un símbolo'];

export const listaReglasClave = '<ul class="reglas-clave" id="reglas-clave" aria-live="polite"></ul>';

export function medidorClave(entrada, destino) {
  const actualizar = () => {
    const { faltantes } = evaluarClave(entrada.value);
    destino.innerHTML = REGLAS_CLAVE
      .map((r) => `<li class="${faltantes.includes(r) ? '' : 'cumple'}">${esc(r[0].toUpperCase() + r.slice(1))}</li>`)
      .join('');
  };
  entrada.addEventListener('input', actualizar);
  actualizar();
}
