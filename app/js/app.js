import { indexar } from './dominio/catalogo.js';
import { obtenerCatalogo } from './dominio/erp.js';
import { resolverFlags } from './dominio/flags.js';
import { $, esc, vista } from './ui/dom.js';
import { ENTORNO, estado, cargarCarrito } from './ui/contexto.js';
import { estadoVacio } from './ui/componentes.js';
import { prepararCabecera } from './ui/cabecera.js';
import { registrarRuta, rutaNoEncontrada, pintar } from './ui/rutas.js';
import { vistaCatalogo } from './ui/vistas/catalogo.js';
import { vistaCarrito } from './ui/vistas/carrito.js';
import { vistaIngresar, vistaRegistro, vistaRecuperar, vistaRestablecer } from './ui/vistas/cuenta.js';
import { vistaBuzon } from './ui/vistas/buzon.js';

function noEncontrada() {
  vista().innerHTML = estadoVacio('Página no encontrada.', '<a class="btn btn--primario" href="#/">Ir al catálogo</a>');
}

function registrarRutas() {
  registrarRuta('/', 'Catálogo', vistaCatalogo);
  registrarRuta('/ingresar', 'Ingresar', vistaIngresar);
  registrarRuta('/registro', 'Crear cuenta', vistaRegistro);
  registrarRuta('/recuperar', 'Recuperar contraseña', vistaRecuperar);
  registrarRuta('/restablecer', 'Nueva contraseña', vistaRestablecer);
  registrarRuta('/carrito', 'Carrito', vistaCarrito);
  if (estado.flags.buzonSandbox) registrarRuta('/buzon', 'Buzón sandbox', vistaBuzon);
  rutaNoEncontrada(noEncontrada);
}

async function cargarDatos() {
  const [configuracion, catalogo] = await Promise.all([
    fetch('config/flags.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    obtenerCatalogo(),
  ]);
  estado.flags = resolverFlags(configuracion, ENTORNO);
  estado.tiendas = catalogo.tiendas;
  catalogo.productos.forEach((p) => estado.productos.set(p.sku, p));
  estado.indice = indexar(catalogo.productos);
  if (!estado.tiendas.some((t) => t.id === estado.tienda)) estado.tienda = estado.tiendas[0].id;
}

function mostrarEntorno() {
  if (ENTORNO !== 'produccion') {
    const franja = $('#franja-entorno');
    franja.hidden = false;
    franja.textContent = `Ambiente ${ENTORNO.toUpperCase()} · datos de prueba · pagos deshabilitados`;
  }
  $('#pie-version').textContent = `Versión ${window.APP_VERSION ?? 'desarrollo'}`;
}

async function iniciar() {
  mostrarEntorno();
  try {
    await cargarDatos();
  } catch (error) {
    vista().innerHTML = estadoVacio(`No pudimos cargar el catálogo. ${esc(error.message)}`,
      '<button class="btn btn--primario" type="button" id="reintentar">Reintentar</button>');
    $('#reintentar').addEventListener('click', () => location.reload());
    return;
  }

  registrarRutas();
  prepararCabecera();
  cargarCarrito();
  window.addEventListener('hashchange', () => {
    pintar();
    vista().focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });
  pintar();
  document.body.dataset.listo = 'true';
}

iniciar();
