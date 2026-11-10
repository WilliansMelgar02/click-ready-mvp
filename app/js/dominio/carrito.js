export const IVA = 0.19;
export const MAXIMO_POR_PRODUCTO = 24;

export const ERRORES = Object.freeze({
  CANTIDAD_INVALIDA: 'CANTIDAD_INVALIDA',
  SIN_STOCK: 'SIN_STOCK',
  STOCK_INSUFICIENTE: 'STOCK_INSUFICIENTE',
  LIMITE_POR_PRODUCTO: 'LIMITE_POR_PRODUCTO',
  NO_ESTA_EN_CARRITO: 'NO_ESTA_EN_CARRITO',
});

export function crearCarrito(tienda) {
  return { tienda, lineas: [] };
}

const esCantidadValida = (n) => Number.isInteger(n) && n > 0;

function validarCantidad(cantidad, stockDisponible) {
  if (!esCantidadValida(cantidad)) return ERRORES.CANTIDAD_INVALIDA;
  if (stockDisponible <= 0) return ERRORES.SIN_STOCK;
  if (cantidad > MAXIMO_POR_PRODUCTO) return ERRORES.LIMITE_POR_PRODUCTO;
  if (cantidad > stockDisponible) return ERRORES.STOCK_INSUFICIENTE;
  return null;
}

export function agregar(carrito, producto, cantidad = 1) {
  const stock = producto.stock?.[carrito.tienda] ?? 0;
  const existente = carrito.lineas.find((l) => l.sku === producto.sku);
  const nuevaCantidad = (existente?.cantidad ?? 0) + cantidad;
  const error = esCantidadValida(cantidad) ? validarCantidad(nuevaCantidad, stock) : ERRORES.CANTIDAD_INVALIDA;
  if (error) return { ok: false, error, carrito };

  const linea = { sku: producto.sku, nombre: producto.nombre, marca: producto.marca, precio: producto.precio, cantidad: nuevaCantidad, stock };
  const lineas = existente
    ? carrito.lineas.map((l) => (l.sku === producto.sku ? linea : l))
    : [...carrito.lineas, linea];
  return { ok: true, carrito: { ...carrito, lineas } };
}

export function actualizarCantidad(carrito, sku, cantidad) {
  const linea = carrito.lineas.find((l) => l.sku === sku);
  if (!linea) return { ok: false, error: ERRORES.NO_ESTA_EN_CARRITO, carrito };
  if (cantidad === 0) return eliminar(carrito, sku);
  const error = validarCantidad(cantidad, linea.stock);
  if (error) return { ok: false, error, carrito };
  return { ok: true, carrito: { ...carrito, lineas: carrito.lineas.map((l) => (l.sku === sku ? { ...l, cantidad } : l)) } };
}

export function eliminar(carrito, sku) {
  if (!carrito.lineas.some((l) => l.sku === sku)) return { ok: false, error: ERRORES.NO_ESTA_EN_CARRITO, carrito };
  return { ok: true, carrito: { ...carrito, lineas: carrito.lineas.filter((l) => l.sku !== sku) } };
}

export function vaciar(carrito) {
  return { ok: true, carrito: { ...carrito, lineas: [] } };
}

export function totales(carrito) {
  const total = carrito.lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0);
  const neto = Math.round(total / (1 + IVA));
  return {
    lineas: carrito.lineas.length,
    unidades: carrito.lineas.reduce((suma, l) => suma + l.cantidad, 0),
    neto,
    iva: total - neto,
    total,
  };
}

export function crearRepositorioCarrito(almacen) {
  const clave = (usuario, tienda) => `cr.carrito.${usuario ?? 'invitado'}.${tienda}`;
  return {
    cargar(usuario, tienda) {
      const guardado = almacen.leer(clave(usuario, tienda));
      return guardado && Array.isArray(guardado.lineas) ? guardado : crearCarrito(tienda);
    },
    guardar(usuario, carrito) {
      almacen.guardar(clave(usuario, carrito.tienda), carrito);
    },
    fusionarInvitado(usuario, tienda) {
      const invitado = this.cargar(null, tienda);
      let destino = this.cargar(usuario, tienda);
      for (const linea of invitado.lineas) {
        const r = agregar(destino, { sku: linea.sku, nombre: linea.nombre, marca: linea.marca, precio: linea.precio, stock: { [tienda]: linea.stock } }, linea.cantidad);
        if (r.ok) destino = r.carrito;
      }
      this.guardar(usuario, destino);
      almacen.borrar(clave(null, tienda));
      return destino;
    },
  };
}
