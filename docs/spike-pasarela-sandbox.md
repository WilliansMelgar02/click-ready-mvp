# Spike PBI-12 · Pasarela de pago en modo sandbox

**Timebox:** 10 horas (Javier Riquelme) · **Sprint 1** · **Estado:** cerrado el 15-07-2026

## Pregunta que respondía

¿Se puede integrar el checkout del Sprint 2 (PBI-04) con la pasarela en modo sandbox sin
manejar datos de tarjeta en Click&Ready, y qué riesgos quedan abiertos?

## Hallazgos

1. El flujo de la pasarela es por redirección con token: Click&Ready crea la transacción
   (monto, orden y URL de retorno), recibe un token y redirige al formulario de la pasarela.
   **Los datos de la tarjeta nunca pasan por el sistema**, lo que reduce el alcance de PCI DSS.
2. Al volver, el token se confirma con el servidor de la pasarela. Si el cliente cierra la
   pestaña antes de volver, la orden queda "pendiente" y hay que conciliarla.
3. El sandbox entrega tarjetas de prueba para respuestas aprobadas y rechazadas, así que los
   dos criterios de aceptación del checkout (aprobado y rechazado) se pueden automatizar.

## Decisiones para el Product Backlog

- PBI-04 (13 SP) se **divide** en PBI-04a "pagar el carrito" (8 SP) y PBI-04b "pago rechazado y
  reintento" (5 SP). Así cada ítem cabe en un sprint y se puede probar por separado.
- Se crea PBI-14 "reservar stock al confirmar el pago" (5 SP), porque sin reserva dos clientes
  pueden pagar la última unidad.
- El adaptador de pago se implementa detrás del flag `checkout` (apagado en producción hasta el piloto).

## Riesgos que siguen abiertos

- Disponibilidad del sandbox: si se cae más de 2 horas, el plan B es un simulador local con el
  mismo contrato (respuesta aprobada/rechazada), igual que el ERP mock.
- Conciliación de órdenes "pendientes": queda como criterio de aceptación de PBI-04a.
