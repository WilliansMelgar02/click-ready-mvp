import { CODIGOS } from '../dominio/autenticacion.js';
import { ERRORES } from '../dominio/carrito.js';

export const MENSAJES = {
  [CODIGOS.NOMBRE_REQUERIDO]: 'Ingresa tu nombre.',
  [CODIGOS.EMAIL_INVALIDO]: 'El correo no tiene un formato válido.',
  [CODIGOS.CLAVE_DEBIL]: 'La contraseña no cumple la política de seguridad.',
  [CODIGOS.EMAIL_REGISTRADO]: 'Ese correo ya tiene una cuenta. Puedes ingresar o recuperar tu contraseña.',
  [CODIGOS.CREDENCIALES_INVALIDAS]: 'Correo o contraseña incorrectos.',
  [CODIGOS.CUENTA_BLOQUEADA]: 'Cuenta bloqueada temporalmente por intentos fallidos.',
  [CODIGOS.TOKEN_INVALIDO]: 'El enlace no es válido o ya fue usado. Solicita uno nuevo.',
  [CODIGOS.TOKEN_EXPIRADO]: 'El enlace venció (dura 30 minutos). Solicita uno nuevo.',
  [ERRORES.SIN_STOCK]: 'Producto sin stock en la tienda elegida.',
  [ERRORES.STOCK_INSUFICIENTE]: 'No hay stock suficiente para esa cantidad.',
  [ERRORES.LIMITE_POR_PRODUCTO]: 'Máximo 24 unidades por producto.',
  [ERRORES.CANTIDAD_INVALIDA]: 'La cantidad debe ser un número entero mayor que cero.',
};
