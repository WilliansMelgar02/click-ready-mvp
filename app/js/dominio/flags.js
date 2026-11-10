const ENTORNOS = Object.freeze(['local', 'staging', 'produccion']);

export const FLAGS_POR_DEFECTO = Object.freeze({
  autocompletar: true,
  filtros: true,
  buzonSandbox: false,
  checkout: false,
});

export function entornoValido(entorno) {
  return ENTORNOS.includes(entorno) ? entorno : 'produccion';
}

export function resolverFlags(configuracion, entorno) {
  const env = entornoValido(entorno);
  const comunes = configuracion?.comunes ?? {};
  const propios = configuracion?.entornos?.[env] ?? {};
  const resultado = { ...FLAGS_POR_DEFECTO };
  for (const fuente of [comunes, propios]) {
    for (const [nombre, valor] of Object.entries(fuente)) {
      if (nombre in FLAGS_POR_DEFECTO && typeof valor === 'boolean') resultado[nombre] = valor;
    }
  }
  return Object.freeze(resultado);
}
