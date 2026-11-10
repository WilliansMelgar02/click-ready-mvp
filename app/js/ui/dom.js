export const $ = (selector, raiz = document) => raiz.querySelector(selector);

export const vista = () => $('#vista');

export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function iniciales(nombre) {
  return String(nombre ?? '')
    .split(' ')
    .filter((p) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(p))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function avisar(texto, tipo = 'ok') {
  const aviso = document.createElement('div');
  aviso.className = `aviso aviso--${tipo}`;
  aviso.textContent = texto;
  $('#avisos').append(aviso);
  setTimeout(() => aviso.remove(), 3200);
}
