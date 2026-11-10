const CLAVE = 'cr.buzon';
const MAXIMO_MENSAJES = 50;

export function crearBuzon({ almacen, reloj = () => Date.now() }) {
  const leer = () => almacen.leer(CLAVE, []);

  return {
    enviar({ para, asunto, cuerpo, enlace = null }) {
      if (!para || !asunto) throw new Error('El correo necesita destinatario y asunto.');
      const mensajes = leer();
      const mensaje = {
        id: `MSG-${reloj()}-${mensajes.length + 1}`,
        para: para.toLowerCase(),
        asunto,
        cuerpo,
        enlace,
        fecha: new Date(reloj()).toISOString(),
      };
      almacen.guardar(CLAVE, [mensaje, ...mensajes].slice(0, MAXIMO_MENSAJES));
      return mensaje;
    },
    listar(para = null) {
      const mensajes = leer();
      return para ? mensajes.filter((m) => m.para === para.toLowerCase()) : mensajes;
    },
  };
}
