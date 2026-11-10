const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s) => document.querySelector(s);

const SIGUIENTE = [
  ['PBI-04a', 'Pago del carrito en pasarela sandbox', 8],
  ['PBI-14', 'Reserva de stock al confirmar el pago', 5],
  ['PBI-05', 'Elegir franja de retiro (tope 20 pedidos/hora)', 8],
  ['PBI-06', 'Correo de confirmación de pedido', 3],
];

function tile(valor, etiqueta) {
  return `<div class="tile"><div class="tile__valor">${valor}</div><div class="tile__etiqueta">${etiqueta}</div></div>`;
}

function burndown({ dias, ideal, real, notas }) {
  const ancho = 640; const alto = 260; const m = { t: 16, r: 16, b: 34, l: 40 };
  const max = Math.max(...ideal, ...real);
  const x = (i) => m.l + (i * (ancho - m.l - m.r)) / (dias.length - 1);
  const y = (v) => m.t + (1 - v / max) * (alto - m.t - m.b);
  const linea = (serie) => serie.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const marcas = [0, 50, 100, 150, 200];
  return `
    <p class="leyenda"><span>Horas restantes (real)</span><span class="l-ideal">Ideal</span></p>
    <div class="grafico" id="grafico">
      <svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Burndown del Sprint 1: de 200 horas a 0 en 9 días hábiles">
        ${marcas.map((v) => `<line class="rejilla" x1="${m.l}" x2="${ancho - m.r}" y1="${y(v)}" y2="${y(v)}"/>
          <text class="eje" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
        ${dias.map((d, i) => `<text class="eje" x="${x(i)}" y="${alto - 10}" text-anchor="middle">${esc(d)}</text>`).join('')}
        <path class="ideal" d="${linea(ideal)}"/>
        <path class="real" d="${linea(real)}"/>
        ${real.map((v, i) => `<circle class="punto" cx="${x(i)}" cy="${y(v)}" r="4"/>`).join('')}
        <line class="guia" id="guia" y1="${m.t}" y2="${alto - m.b}" visibility="hidden"/>
        <rect id="zona" x="${m.l}" y="0" width="${ancho - m.l - m.r}" height="${alto}" fill="transparent"/>
      </svg>
      <div class="tooltip" id="tooltip" hidden></div>
    </div>
    <details class="tabla-datos"><summary>Ver como tabla</summary>
      <table class="tabla"><thead><tr><th>Día</th><th class="num">Ideal (h)</th><th class="num">Real (h)</th><th>Nota</th></tr></thead>
      <tbody>${dias.map((d, i) => `<tr><td>${esc(d)}</td><td class="num">${ideal[i]}</td><td class="num">${real[i]}</td><td>${esc(notas[d] ?? '')}</td></tr>`).join('')}</tbody></table>
    </details>`;
}

function activarTooltip({ dias, ideal, real, notas }) {
  const svg = $('#grafico svg');
  const zona = $('#zona');
  const guia = $('#guia');
  const tip = $('#tooltip');
  const puntos = [...svg.querySelectorAll('.punto')];
  const mostrar = (evento) => {
    const caja = svg.getBoundingClientRect();
    const escala = svg.viewBox.baseVal.width / caja.width;
    const px = (evento.clientX - caja.left) * escala;
    let i = 0;
    puntos.forEach((p, k) => { if (Math.abs(p.cx.baseVal.value - px) < Math.abs(puntos[i].cx.baseVal.value - px)) i = k; });
    const cx = puntos[i].cx.baseVal.value;
    guia.setAttribute('x1', cx); guia.setAttribute('x2', cx); guia.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.style.left = `${cx / escala}px`;
    tip.style.top = `${puntos[i].cy.baseVal.value / escala}px`;
    tip.innerHTML = `<strong>${esc(dias[i])}</strong>Real: ${real[i]} h · Ideal: ${ideal[i]} h${notas[dias[i]] ? `<br>${esc(notas[dias[i]])}` : ''}`;
  };
  zona.addEventListener('pointermove', mostrar);
  zona.addEventListener('pointerleave', () => { tip.hidden = true; guia.setAttribute('visibility', 'hidden'); });
}

async function iniciar() {
  const datos = await fetch('data/sprint-1.json', { cache: 'no-store' }).then((r) => r.json());
  const { sprint, capacidad, equipo, tareas } = datos;
  const persona = Object.fromEntries(equipo.map((e) => [e.id, e]));
  const iniciales = (id) => persona[id].nombre.split(' ').map((p) => p[0]).join('');

  const porPersona = equipo.filter((e) => e.dias).map((e) => {
    const asignadas = tareas.filter((t) => t.resp === e.id).reduce((s, t) => s + t.horas, 0);
    const bruta = e.dias * capacidad.horasFocoPorDia;
    return { ...e, bruta, asignadas, carga: asignadas / (bruta * 0.9) };
  });

  const TITULOS = {
    'PBI-11': ['Catálogo y stock desde el ERP mock', 5], 'PBI-01': ['Registro, inicio de sesión y recuperación', 5],
    'PBI-02': ['Búsqueda con autocompletar y filtros', 8], 'PBI-03': ['Carrito con totales y persistencia', 8],
    'PBI-12': ['Spike de pasarela sandbox', 3], DoD: ['Habilitadores de la DoD', null], 'Validación': ['Validación del Incremento', null],
  };
  const grupos = [...new Set(tareas.map((t) => t.pbi))];
  const hecho = grupos.map((g) => {
    const items = tareas.filter((t) => t.pbi === g);
    const [titulo, sp] = TITULOS[g] ?? [g, null];
    return `<div class="tarjeta tarjeta--grupo"><span class="etiqueta">${esc(g)}</span><strong>${esc(titulo)}</strong>
      <ul class="subtareas">${items.map((t) => `<li><span>${esc(t.titulo)}</span><span class="tenue">${t.horas} h</span>
        <span class="avatar" title="${esc(persona[t.resp].nombre)}">${iniciales(t.resp)}</span></li>`).join('')}</ul>
      <div class="tarjeta__pie"><span>${items.length} tareas · ${items.reduce((s, t) => s + t.horas, 0)} h</span><span>${sp ? `${sp} SP · ` : ''}Done</span></div></div>`;
  }).join('');

  $('#tablero').innerHTML = `
    <section class="panel">
      <p class="eyebrow">Sprint ${sprint.numero} · ${new Date(`${sprint.inicio}T12:00`).toLocaleDateString('es-CL')} al ${new Date(`${sprint.fin}T12:00`).toLocaleDateString('es-CL')} · ${sprint.diasHabiles} días hábiles (16-07 feriado)</p>
      <h1>Sprint Goal</h1>
      <p class="objetivo">${esc(sprint.objetivo)}</p>
      <ul class="medicion">${sprint.medicion.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
    </section>

    <div class="tiles">
      ${tile(`${capacidad.bruta} h`, 'Capacidad bruta (foco 6 h/día)')}
      ${tile(`${capacidad.refinamiento} h`, 'Reservadas a refinamiento (10 %)')}
      ${tile(`${capacidad.planificada} h`, `Planificadas en ${tareas.length} tareas`)}
      ${tile(`${capacidad.colchon} h`, 'Colchón para imprevistos')}
      ${tile('29 SP', 'Comprometidos y terminados (Done)')}
    </div>

    <div class="dos-columnas">
      <section class="panel">
        <h2>Burndown del Sprint</h2>
        <p class="tenue">Horas restantes del Sprint Backlog al cierre de cada día.</p>
        ${burndown(datos.burndown)}
      </section>
      <section class="panel">
        <h2>Capacidad por persona</h2>
        <p class="tenue">Horas asignadas frente al 90 % de la capacidad individual (el 10 % va a refinamiento).</p>
        <table class="tabla"><thead><tr><th>Developer</th><th class="num">Cap.</th><th class="num">Asig.</th><th>Carga</th></tr></thead>
          <tbody>${porPersona.map((p) => `<tr><td>${esc(p.nombre)}<br><span class="tenue">${esc(p.cargo)}${p.nota ? ` · ${esc(p.nota)}` : ''}</span></td>
            <td class="num">${p.bruta}</td><td class="num">${p.asignadas}</td>
            <td><div class="barra"><span style="width:${Math.min(100, p.carga * 100).toFixed(0)}%"></span></div>
            <span class="tenue">${(p.carga * 100).toFixed(0)} %</span></td></tr>`).join('')}</tbody></table>
      </section>
    </div>

    <section class="panel">
      <h2>Tablero al cierre del Sprint</h2>
      <p class="tenue">Estado del Sprint Backlog el viernes 17-07-2026, después de la Sprint Review.</p>
      <div class="kanban">
        <div class="columna"><h3>Siguiente (Sprint 2) <span>${SIGUIENTE.length}</span></h3>
          ${SIGUIENTE.map(([id, t, sp]) => `<div class="tarjeta"><span class="etiqueta etiqueta--s2">${id}</span>${esc(t)}<div class="tarjeta__pie"><span>${sp} SP</span></div></div>`).join('')}</div>
        <div class="columna"><h3>En curso <span>0</span></h3><p class="tenue" style="padding:4px">Sin trabajo en curso: todo lo comprometido cumple la DoD.</p></div>
        <div class="columna columna--hecho"><h3>Hecho (Done) <span>${grupos.length} ítems · ${tareas.length} tareas</span></h3><div class="grupos">${hecho}</div></div>
      </div>
    </section>`;

  activarTooltip(datos.burndown);
}

iniciar();
