const rutas = new Map();
const alPintar = [];
let vistaPorDefecto = () => {};

export function registrarRuta(camino, titulo, vista) {
  rutas.set(camino, { titulo, vista });
}

export function rutaNoEncontrada(vista) {
  vistaPorDefecto = vista;
}

export function despuesDePintar(fn) {
  alPintar.push(fn);
}

function rutaActual() {
  const [camino, consulta = ''] = location.hash.replace(/^#/, '').split('?');
  return { camino: camino || '/', params: new URLSearchParams(consulta) };
}

export function pintar() {
  const { camino, params } = rutaActual();
  const ruta = rutas.get(camino);
  (ruta?.vista ?? vistaPorDefecto)(params);
  document.title = `${ruta?.titulo ?? 'Página no encontrada'} · Click&Ready`;
  alPintar.forEach((fn) => fn(camino, params));
}

export function navegar(camino, params) {
  const consulta = params && [...params].length ? `?${params}` : '';
  const destino = `#${camino}${consulta}`;
  if (location.hash === destino) pintar();
  else location.hash = destino;
}
