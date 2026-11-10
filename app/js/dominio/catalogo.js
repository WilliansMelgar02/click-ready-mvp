export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function indexar(productos) {
  return productos.map((p) => ({ producto: p, texto: normalizar(`${p.nombre} ${p.marca}`), nombre: normalizar(p.nombre) }));
}

function puntaje(entrada, consulta) {
  if (!consulta) return 0;
  if (entrada.nombre.startsWith(consulta)) return 3;
  if (entrada.nombre.split(' ').some((palabra) => palabra.startsWith(consulta))) return 2;
  return 1;
}

function vitrina(sku) {
  const n = Number(String(sku).replace(/\D/g, '')) || 0;
  return (n * 2654435761) % 4294967296;
}

const COMPARADORES = {
  relevancia: (a, b) => b.puntaje - a.puntaje || a.producto.nombre.localeCompare(b.producto.nombre, 'es'),
  'precio-asc': (a, b) => a.producto.precio - b.producto.precio,
  'precio-desc': (a, b) => b.producto.precio - a.producto.precio,
  nombre: (a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es'),
};

export function facetas(productos) {
  const marcas = new Map();
  const categorias = new Map();
  let min = Infinity;
  let max = -Infinity;
  for (const p of productos) {
    marcas.set(p.marca, (marcas.get(p.marca) ?? 0) + 1);
    categorias.set(p.categoria, (categorias.get(p.categoria) ?? 0) + 1);
    min = Math.min(min, p.precio);
    max = Math.max(max, p.precio);
  }
  const ordenar = (mapa) => [...mapa].map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));
  return {
    marcas: ordenar(marcas),
    categorias: ordenar(categorias),
    precio: productos.length ? { min, max } : null,
  };
}

export function buscar(indice, opciones = {}) {
  const {
    texto = '', categoria = null, marcas = [], precioMin = null, precioMax = null,
    tienda = null, soloConStock = false, orden = 'relevancia', pagina = 1, porPagina = 24,
  } = opciones;

  const consulta = normalizar(texto);
  const terminos = consulta ? consulta.split(' ') : [];

  const base = indice.filter((e) => terminos.every((t) => e.texto.includes(t))
    && (!categoria || e.producto.categoria === categoria));

  const filtrados = base.filter((e) => {
    const p = e.producto;
    if (marcas.length && !marcas.includes(p.marca)) return false;
    if (precioMin !== null && p.precio < precioMin) return false;
    if (precioMax !== null && p.precio > precioMax) return false;
    if (soloConStock && tienda && (p.stock?.[tienda] ?? 0) <= 0) return false;
    return true;
  }).map((e) => ({ ...e, puntaje: puntaje(e, consulta) }));

  const comparador = !consulta && (orden === 'relevancia' || !COMPARADORES[orden])
    ? (a, b) => vitrina(a.producto.sku) - vitrina(b.producto.sku) || a.producto.sku.localeCompare(b.producto.sku)
    : COMPARADORES[orden] ?? COMPARADORES.relevancia;
  filtrados.sort(comparador);

  const tamano = Math.max(1, porPagina);
  const paginas = Math.max(1, Math.ceil(filtrados.length / tamano));
  const actual = Math.min(Math.max(1, pagina), paginas);
  return {
    total: filtrados.length,
    pagina: actual,
    paginas,
    items: filtrados.slice((actual - 1) * tamano, actual * tamano).map((e) => e.producto),
    facetas: facetas(base.map((e) => e.producto)),
  };
}

export function autocompletar(indice, prefijo, limite = 8) {
  const consulta = normalizar(prefijo);
  if (consulta.length < 2) return [];
  const vistos = new Map();
  for (const e of indice) {
    if (!e.nombre.includes(consulta)) continue;
    const sugerencia = e.producto.nombre;
    const p = puntaje(e, consulta);
    if (!vistos.has(sugerencia) || vistos.get(sugerencia) < p) vistos.set(sugerencia, p);
  }
  return [...vistos]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, limite)
    .map(([sugerencia]) => sugerencia);
}
