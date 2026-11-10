## PBI y cambio

Cierra #<!-- número del issue del PBI -->

<!-- Qué se hizo y cómo se verifica en staging. -->

## Checklist de la Definition of Done

- [ ] Revisado por un par (este PR aprobado)
- [ ] Pruebas unitarias del módulo afectado con cobertura ≥ 70 % (líneas, ramas y funciones), en verde en CI
- [ ] Happy path cubierto por la suite E2E (Playwright)
- [ ] Integrado a `main` con el pipeline CI/CD en verde
- [ ] Lo inconcluso queda detrás de un feature flag; sin TODO bloqueantes
- [ ] Sin defectos críticos (P0/P1) abiertos en el PBI
- [ ] Seguridad básica: sin secretos en el código, claves con hash y salida escapada
- [ ] README o notas actualizadas si cambia el uso
- [ ] Flags por entorno revisados en `app/config/flags.json`
- [ ] Desplegado en staging y accesible para la Sprint Review
