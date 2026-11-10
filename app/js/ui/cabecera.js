import { autocompletar, normalizar } from '../dominio/catalogo.js';
import { totales } from '../dominio/carrito.js';
import { $, esc, avisar } from './dom.js';
import { auth, estado, cargarCarrito, cambiarTienda, tiendaActual, alCambiarCarrito } from './contexto.js';
import { navegar, pintar, despuesDePintar } from './rutas.js';

function pintarInsignia(carrito) {
  const { unidades } = totales(carrito);
  const insignia = $('#insignia-carrito');
  insignia.textContent = unidades;
  insignia.classList.toggle('insignia--vacia', unidades === 0);
}

function pintarUsuario() {
  const sesion = auth.sesionActual();
  const enlaceBuzon = estado.flags?.buzonSandbox ? '<a class="enlace-sutil" href="#/buzon">Buzón sandbox</a>' : '';
  $('#zona-usuario').innerHTML = sesion
    ? `<span class="saludo">Hola, <strong>${esc(sesion.nombre.split(' ')[0])}</strong></span>
       ${enlaceBuzon}<button class="btn btn--texto" id="btn-salir" type="button">Salir</button>`
    : `${enlaceBuzon}<a class="btn btn--secundario" href="#/ingresar">Ingresar</a>`;
  $('#btn-salir')?.addEventListener('click', () => {
    auth.cerrarSesion();
    cargarCarrito();
    avisar('Sesión cerrada.');
    navegar('/');
  });
}

function prepararTiendas() {
  const selector = $('#selector-tienda');
  selector.innerHTML = estado.tiendas.map((t) => `<option value="${esc(t.id)}">${esc(t.comuna)}</option>`).join('');
  selector.value = estado.tienda;
  selector.addEventListener('change', () => {
    cambiarTienda(selector.value);
    avisar(`Tienda de retiro: ${tiendaActual().nombre}`);
    pintar();
  });
}

function resaltar(texto, consulta) {
  const buscado = normalizar(consulta);
  const pos = buscado ? normalizar(texto).indexOf(buscado) : -1;
  if (pos < 0 || normalizar(texto).length !== texto.length) return esc(texto);
  const fin = pos + buscado.length;
  return `${esc(texto.slice(0, pos))}<mark>${esc(texto.slice(pos, fin))}</mark>${esc(texto.slice(fin))}`;
}

function prepararBuscador() {
  const formulario = $('#buscador');
  const entrada = $('#buscador-texto');
  const lista = $('#sugerencias');
  let activa = -1;

  const cerrar = () => {
    lista.hidden = true;
    lista.innerHTML = '';
    entrada.setAttribute('aria-expanded', 'false');
    entrada.removeAttribute('aria-activedescendant');
    activa = -1;
  };

  const buscar = (texto) => {
    cerrar();
    navegar('/', new URLSearchParams(texto.trim() ? { q: texto.trim() } : {}));
  };

  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const elegida = lista.querySelector('[aria-selected="true"]');
    buscar(elegida ? elegida.dataset.valor : entrada.value);
  });

  entrada.addEventListener('input', () => {
    if (!estado.flags.autocompletar) return;
    const sugerencias = autocompletar(estado.indice, entrada.value, 8);
    if (!sugerencias.length) return cerrar();
    lista.innerHTML = sugerencias
      .map((s, i) => `<li role="option" id="sug-${i}" data-valor="${esc(s)}" aria-selected="false">${resaltar(s, entrada.value)}</li>`)
      .join('');
    lista.hidden = false;
    entrada.setAttribute('aria-expanded', 'true');
    activa = -1;
  });

  entrada.addEventListener('keydown', (e) => {
    const opciones = [...lista.querySelectorAll('li')];
    if (!opciones.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      activa = (activa + (e.key === 'ArrowDown' ? 1 : -1) + opciones.length) % opciones.length;
      opciones.forEach((o, i) => o.setAttribute('aria-selected', String(i === activa)));
      entrada.setAttribute('aria-activedescendant', opciones[activa].id);
    } else if (e.key === 'Escape') {
      cerrar();
    }
  });

  lista.addEventListener('mousedown', (e) => {
    const opcion = e.target.closest('li');
    if (!opcion) return;
    e.preventDefault();
    entrada.value = opcion.dataset.valor;
    buscar(opcion.dataset.valor);
  });

  entrada.addEventListener('blur', () => setTimeout(cerrar, 120));

  despuesDePintar((camino, params) => {
    entrada.value = camino === '/' ? params.get('q') ?? '' : '';
    cerrar();
  });
}

export function prepararCabecera() {
  alCambiarCarrito(pintarInsignia);
  despuesDePintar(pintarUsuario);
  prepararTiendas();
  prepararBuscador();
}
