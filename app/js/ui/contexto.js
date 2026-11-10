import { crearAlmacen } from '../dominio/almacen.js';
import { crearBuzon } from '../dominio/buzon.js';
import { crearServicioAuth } from '../dominio/autenticacion.js';
import { crearRepositorioCarrito } from '../dominio/carrito.js';
import { entornoValido } from '../dominio/flags.js';

export const ENTORNO = entornoValido(window.APP_ENV ?? 'local');

const persistente = crearAlmacen(window.localStorage);
const deSesion = crearAlmacen(window.sessionStorage);

export const buzon = crearBuzon({ almacen: persistente });
export const auth = crearServicioAuth({ almacen: persistente, buzon, urlBase: `${location.origin}${location.pathname}` });
const repoCarrito = crearRepositorioCarrito(deSesion);

export const estado = {
  flags: null,
  tiendas: [],
  productos: new Map(),
  indice: [],
  tienda: persistente.leer('cr.tienda', 'T01'),
  carrito: null,
};

const oyentesCarrito = [];

export const alCambiarCarrito = (fn) => oyentesCarrito.push(fn);
export const usuarioActual = () => auth.sesionActual()?.email ?? null;
export const tiendaActual = () => estado.tiendas.find((t) => t.id === estado.tienda);

function publicar(carrito) {
  estado.carrito = carrito;
  oyentesCarrito.forEach((fn) => fn(carrito));
}

export function cargarCarrito() {
  publicar(repoCarrito.cargar(usuarioActual(), estado.tienda));
}

export function guardarCarrito(carrito) {
  repoCarrito.guardar(usuarioActual(), carrito);
  publicar(carrito);
}

export function fusionarCarritoInvitado(email) {
  publicar(repoCarrito.fusionarInvitado(email, estado.tienda));
}

export function cambiarTienda(id) {
  estado.tienda = id;
  persistente.guardar('cr.tienda', id);
  cargarCarrito();
}
