import { actualizarCantidad, eliminar, totales, MAXIMO_POR_PRODUCTO } from '../../dominio/carrito.js';
import { formatoCLP, pluralizar } from '../../dominio/formato.js';
import { esc, vista, avisar } from '../dom.js';
import { estado, guardarCarrito, tiendaActual, usuarioActual } from '../contexto.js';
import { miniatura, estadoVacio } from '../componentes.js';
import { MENSAJES } from '../mensajes.js';

function lineaCarrito(l) {
  return `
    <li class="linea" data-sku="${esc(l.sku)}">
      ${miniatura(l.nombre, estado.productos.get(l.sku)?.categoria, 'linea__imagen')}
      <div class="linea__detalle">
        <p class="producto__marca">${esc(l.marca)}</p>
        <p class="linea__nombre">${esc(l.nombre)}</p>
        <p class="tenue">${formatoCLP(l.precio)} c/u · SKU ${esc(l.sku)}</p>
      </div>
      <div class="cantidad" role="group" aria-label="Cantidad de ${esc(l.nombre)}">
        <button type="button" class="btn btn--icono" data-accion="restar" aria-label="Quitar uno">−</button>
        <input type="number" min="0" max="${Math.min(MAXIMO_POR_PRODUCTO, l.stock)}" value="${l.cantidad}" aria-label="Cantidad">
        <button type="button" class="btn btn--icono" data-accion="sumar" aria-label="Agregar uno">+</button>
      </div>
      <p class="linea__subtotal">${formatoCLP(l.precio * l.cantidad)}</p>
      <button type="button" class="btn btn--texto btn--peligro" data-accion="eliminar">Eliminar</button>
    </li>`;
}

function resumen(t) {
  const fila = (etiqueta, id, monto, clase = '') => `<div class="${clase}"><dt>${etiqueta}</dt><dd id="${id}">${formatoCLP(monto)}</dd></div>`;
  const pago = estado.flags.checkout
    ? '<a class="btn btn--primario btn--bloque" href="#/checkout">Continuar al pago</a>'
    : `<button class="btn btn--primario btn--bloque" type="button" disabled>Continuar al pago</button>
       <p class="nota">El pago en sandbox y la elección de franja se habilitan en el Sprint 2 (PBI-04 y PBI-05).</p>`;
  return `
    <aside class="resumen" aria-label="Resumen de la compra">
      <h2>Resumen</h2>
      <dl>
        ${fila('Neto', 'total-neto', t.neto)}
        ${fila('IVA (19 %)', 'total-iva', t.iva)}
        ${fila('Total', 'total-carrito', t.total, 'resumen__total')}
      </dl>
      ${t.lineas ? pago : ''}
      ${!usuarioActual() && t.lineas ? '<p class="nota">Puedes armar el carrito como invitado. Al <a href="#/ingresar">ingresar</a>, se guarda en tu cuenta.</p>' : ''}
    </aside>`;
}

export function vistaCarrito() {
  const t = totales(estado.carrito);
  vista().innerHTML = `
    <div class="pagina-carrito">
      <section aria-labelledby="titulo-carrito">
        <h1 id="titulo-carrito">Tu carrito</h1>
        <p class="tenue">Retiro en ${esc(tiendaActual()?.nombre)} · ${pluralizar(t.unidades, 'unidad', 'unidades')}</p>
        ${t.lineas
          ? `<ul class="lineas">${estado.carrito.lineas.map(lineaCarrito).join('')}</ul>`
          : estadoVacio('Tu carrito está vacío.', '<a class="btn btn--primario" href="#/">Ir al catálogo</a>')}
      </section>
      ${resumen(t)}
    </div>`;

  const aplicar = (resultado, aviso) => {
    if (!resultado.ok) avisar(MENSAJES[resultado.error], 'error');
    else {
      guardarCarrito(resultado.carrito);
      if (aviso) avisar(aviso);
    }
    vistaCarrito();
  };

  vista().onclick = (e) => {
    const boton = e.target.closest('button[data-accion]');
    const linea = estado.carrito.lineas.find((l) => l.sku === boton?.closest('.linea')?.dataset.sku);
    if (!linea) return;
    const { accion } = boton.dataset;
    if (accion === 'sumar') aplicar(actualizarCantidad(estado.carrito, linea.sku, linea.cantidad + 1));
    if (accion === 'restar') aplicar(actualizarCantidad(estado.carrito, linea.sku, linea.cantidad - 1));
    if (accion === 'eliminar') aplicar(eliminar(estado.carrito, linea.sku), `Eliminado: ${linea.nombre}`);
  };

  vista().querySelectorAll('.linea input').forEach((entrada) => {
    entrada.addEventListener('change', () => {
      aplicar(actualizarCantidad(estado.carrito, entrada.closest('.linea').dataset.sku, Number(entrada.value)));
    });
  });
}
