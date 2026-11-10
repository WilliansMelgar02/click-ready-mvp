import { buscar } from '../../dominio/catalogo.js';
import { agregar } from '../../dominio/carrito.js';
import { pluralizar } from '../../dominio/formato.js';
import { $, esc, vista, avisar } from '../dom.js';
import { estado, guardarCarrito, tiendaActual } from '../contexto.js';
import { tarjetaProducto, estadoVacio, paginacion, encabezadoPagina } from '../componentes.js';
import { MENSAJES } from '../mensajes.js';
import { navegar } from '../rutas.js';

const POR_PAGINA = 24;

const ORDENES = [
  ['relevancia', 'Relevancia'], ['precio-asc', 'Menor precio'], ['precio-desc', 'Mayor precio'], ['nombre', 'Nombre (A-Z)'],
];

function leerFiltros(params) {
  const numero = (clave) => {
    const valor = params.get(clave);
    return valor !== null && valor !== '' && !Number.isNaN(Number(valor)) ? Number(valor) : null;
  };
  return {
    texto: params.get('q') ?? '',
    categoria: params.get('cat') || null,
    marcas: params.get('marcas') ? params.get('marcas').split('|') : [],
    precioMin: numero('min'),
    precioMax: numero('max'),
    soloConStock: params.get('stock') === '1',
    orden: params.get('orden') ?? 'relevancia',
    pagina: Number(params.get('p') ?? 1) || 1,
  };
}

function escribirFiltros(f) {
  const p = new URLSearchParams();
  if (f.texto) p.set('q', f.texto);
  if (f.categoria) p.set('cat', f.categoria);
  if (f.marcas.length) p.set('marcas', f.marcas.join('|'));
  if (f.precioMin !== null) p.set('min', f.precioMin);
  if (f.precioMax !== null) p.set('max', f.precioMax);
  if (f.soloConStock) p.set('stock', '1');
  if (f.orden !== 'relevancia') p.set('orden', f.orden);
  if (f.pagina > 1) p.set('p', f.pagina);
  return p;
}

function chipCategoria(nombre, valor, activo, cantidad = null) {
  return `<li><button type="button" class="chip ${activo ? 'chip--activo' : ''}" data-accion="categoria" data-valor="${esc(valor)}">
    ${esc(nombre)}${cantidad === null ? '' : ` <span>${cantidad}</span>`}</button></li>`;
}

function panelFiltros(filtros, facetas) {
  const activos = filtros.marcas.length + (filtros.precioMin !== null) + (filtros.precioMax !== null) + filtros.soloConStock;
  const abierto = !window.matchMedia('(max-width: 900px)').matches;
  const marcas = facetas.marcas.map((m) => `
    <li><label class="casilla"><input type="checkbox" name="marca" value="${esc(m.nombre)}" ${filtros.marcas.includes(m.nombre) ? 'checked' : ''}>
      <span>${esc(m.nombre)}</span><small>${m.cantidad}</small></label></li>`).join('');
  const precio = (nombre, etiqueta, valor, sugerido) => `<label>${etiqueta}<input type="number" name="${nombre}" min="0" step="100"
    inputmode="numeric" value="${valor ?? ''}" placeholder="${sugerido ?? 0}"></label>`;

  return `
    <aside class="filtros" aria-label="Filtros">
      <details class="filtros__plegable" ${abierto ? 'open' : ''}>
        <summary>Filtrar y categorías${activos ? ` <span class="insignia">${activos}</span>` : ''}</summary>
        <form id="form-filtros">
          <fieldset><legend>Categoría</legend>
            <ul class="lista-chips">
              ${chipCategoria('Todas', '', !filtros.categoria)}
              ${facetas.categorias.map((c) => chipCategoria(c.nombre, c.nombre, filtros.categoria === c.nombre, c.cantidad)).join('')}
            </ul>
          </fieldset>
          <fieldset><legend>Marca</legend><ul class="lista-casillas">${marcas || '<li class="tenue">Sin marcas</li>'}</ul></fieldset>
          <fieldset><legend>Precio</legend>
            <div class="rango">
              ${precio('min', 'Desde', filtros.precioMin, facetas.precio?.min)}
              ${precio('max', 'Hasta', filtros.precioMax, facetas.precio?.max)}
            </div>
          </fieldset>
          <fieldset><legend>Disponibilidad</legend>
            <label class="casilla"><input type="checkbox" name="stock" ${filtros.soloConStock ? 'checked' : ''}><span>Solo con stock en mi tienda</span></label>
          </fieldset>
          <div class="filtros__acciones">
            <button class="btn btn--primario" type="submit">Aplicar</button>
            <button class="btn btn--texto" type="button" data-accion="limpiar">Limpiar filtros</button>
          </div>
        </form>
      </details>
    </aside>`;
}

function agregarAlCarrito(sku, boton) {
  const producto = estado.productos.get(sku);
  const r = agregar(estado.carrito, producto, 1);
  if (!r.ok) return avisar(MENSAJES[r.error], 'error');
  guardarCarrito(r.carrito);
  avisar(`Agregado: ${producto.nombre}`);
  boton.textContent = 'Agregado';
  setTimeout(() => { boton.textContent = 'Agregar'; }, 1200);
}

export function vistaCatalogo(params) {
  const filtros = leerFiltros(params);
  const r = buscar(estado.indice, { ...filtros, tienda: estado.tienda, porPagina: POR_PAGINA });
  const titulo = filtros.texto ? `Resultados para “${esc(filtros.texto)}”` : esc(filtros.categoria ?? 'Todos los productos');
  const ir = (cambios) => navegar('/', escribirFiltros({ ...filtros, pagina: 1, ...cambios }));

  vista().innerHTML = `
    <div class="catalogo">
      ${estado.flags.filtros ? panelFiltros(filtros, r.facetas) : ''}
      <section class="resultados" aria-labelledby="titulo-resultados">
        ${encabezadoPagina({
          id: 'titulo-resultados',
          titulo,
          idDetalle: 'total-resultados',
          detalle: `${pluralizar(r.total, 'producto')} · retiro en ${esc(tiendaActual()?.comuna)}`,
          acciones: `<label class="orden">Ordenar
            <select id="orden">${ORDENES.map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join('')}</select>
          </label>`,
        })}
        ${r.total
          ? `<div class="grilla">${r.items.map((p) => tarjetaProducto(p, estado.tienda)).join('')}</div>`
          : estadoVacio('No encontramos productos con esos criterios.', '<button class="btn btn--secundario" type="button" data-accion="ver-todo">Ver todo el catálogo</button>')}
        ${paginacion(r.pagina, r.paginas)}
      </section>
    </div>`;

  const orden = $('#orden');
  orden.value = filtros.orden;
  orden.addEventListener('change', () => ir({ orden: orden.value }));

  const form = $('#form-filtros');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const datos = new FormData(form);
      const numero = (v) => (v === '' || v === null ? null : Math.max(0, Number(v)));
      ir({
        marcas: datos.getAll('marca'),
        precioMin: numero(datos.get('min')),
        precioMax: numero(datos.get('max')),
        soloConStock: datos.get('stock') === 'on',
      });
    });
    form.querySelectorAll('input[type="checkbox"]').forEach((c) => c.addEventListener('change', () => form.requestSubmit()));
  }

  vista().onclick = (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const { accion, valor, sku } = boton.dataset;
    if (accion === 'agregar') agregarAlCarrito(sku, boton);
    if (accion === 'categoria') ir({ categoria: valor || null, marcas: [] });
    if (accion === 'pagina') ir({ pagina: Number(valor) });
    if (accion === 'limpiar') navegar('/', new URLSearchParams(filtros.texto ? { q: filtros.texto } : {}));
    if (accion === 'ver-todo') navegar('/');
  };
}
