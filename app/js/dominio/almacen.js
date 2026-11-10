export function crearAlmacenMemoria() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => { datos.set(clave, String(valor)); },
    removeItem: (clave) => { datos.delete(clave); },
  };
}

export function crearAlmacen(backend = crearAlmacenMemoria()) {
  return {
    leer(clave, porDefecto = null) {
      const crudo = backend.getItem(clave);
      if (crudo === null || crudo === undefined) return porDefecto;
      try {
        return JSON.parse(crudo);
      } catch {
        return porDefecto;
      }
    },
    guardar(clave, valor) {
      backend.setItem(clave, JSON.stringify(valor));
    },
    borrar(clave) {
      backend.removeItem(clave);
    },
  };
}
