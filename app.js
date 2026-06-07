/* ══════════════════════════════════════════
   La Selección: Álbum Oficial — app.js
   ══════════════════════════════════════════ */

// ─────────────────────────────────────
// 1. DATA MODEL
// ─────────────────────────────────────
const STORAGE_KEY = 'seleccion-album-v1';
const TOTAL = 72;

/** Carga desde LocalStorage o genera un array fresco de 72 cartas */
function loadCards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === TOTAL) return parsed;
    }
  } catch (e) { /* ignore parse errors */ }
  return Array.from({ length: TOTAL }, (_, i) => ({ id: i + 1, cantidad: 0 }));
}

/** Persiste el estado actual en LocalStorage */
function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

let cards = loadCards();

// ─────────────────────────────────────
// 2. CARD RENDERING
// ─────────────────────────────────────

/** Emojis que se asignan cíclicamente a las cartas obtenidas/repetidas */
const CARD_EMOJIS = ['⚽', '🏆', '🌟', '🔴', '🥇', '🎯', '💪', '🦁', '👑', '🔥', '⚡', '🎽'];

/** Devuelve el estado de una carta: 'missing' | 'owned' | 'repeated' */
function getCardState(card) {
  if (card.cantidad === 0) return 'missing';
  if (card.cantidad === 1) return 'owned';
  return 'repeated';
}

/** Construye y devuelve el elemento DOM de una carta */
function buildCardElement(card) {
  const state = getCardState(card);
  const el = document.createElement('div');
  el.className = 'album-card card-ratio rounded-xl flex flex-col items-center justify-center select-none';
  el.dataset.cardId = card.id;
  el.classList.add(`card-${state}`);

  const emoji = CARD_EMOJIS[(card.id - 1) % CARD_EMOJIS.length];

  // Badge de repetidas
  if (state === 'repeated') {
    const badge = document.createElement('div');
    badge.className = 'repeat-badge';
    badge.textContent = `+${card.cantidad - 1}`;
    el.appendChild(badge);
  }

  // Botón de restar (visible sólo al hacer hover, sólo si se tiene la carta)
  if (state !== 'missing') {
    const minusBtn = document.createElement('button');
    minusBtn.className = 'minus-btn';
    minusBtn.innerHTML = '−';
    minusBtn.title = 'Quitar una unidad';
    minusBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // evita disparar el click de la carta
      changeCardCount(card.id, -1);
    });
    el.appendChild(minusBtn);
  }

  // Icono / arte de la carta
  const iconEl = document.createElement('span');
  iconEl.className = 'card-icon';
  iconEl.textContent = state === 'missing' ? '👤' : emoji;
  el.appendChild(iconEl);

  // Número de carta
  const numEl = document.createElement('span');
  numEl.className = 'card-num';
  numEl.textContent = card.id;
  el.appendChild(numEl);

  // Click principal: sumar +1
  el.addEventListener('click', () => {
    changeCardCount(card.id, +1);
  });

  return el;
}

/** Renderiza todas las cartas en el grid desde cero */
function renderGrid() {
  const grid = document.getElementById('card-grid');
  grid.innerHTML = '';
  cards.forEach(card => {
    grid.appendChild(buildCardElement(card));
  });
}

// ─────────────────────────────────────
// 3. ACTUALIZAR CARTA INDIVIDUAL EN EL DOM
// ─────────────────────────────────────

/** Reemplaza un elemento de carta en el DOM con uno nuevo (y lo anima) */
function updateCardElement(cardId) {
  const card = cards[cardId - 1];
  const grid = document.getElementById('card-grid');
  const oldEl = grid.querySelector(`[data-card-id="${cardId}"]`);
  if (!oldEl) return;

  const newEl = buildCardElement(card);
  newEl.classList.add('card-pop');
  newEl.addEventListener('animationend', () => newEl.classList.remove('card-pop'), { once: true });

  grid.replaceChild(newEl, oldEl);
}

// ─────────────────────────────────────
// 4. MANEJADOR DE CAMBIOS DE ESTADO
// ─────────────────────────────────────

/**
 * Cambia la cantidad de una carta y actualiza toda la UI.
 * @param {number} cardId  - ID de la carta (1-72)
 * @param {number} delta   - +1 o -1
 */
function changeCardCount(cardId, delta) {
  const card = cards[cardId - 1];
  const newVal = Math.max(0, card.cantidad + delta);
  if (newVal === card.cantidad) return; // sin cambio

  card.cantidad = newVal;
  saveCards();
  updateCardElement(cardId);
  updateStats();
  updateLists();

  // Toast de feedback
  if (delta > 0) {
    if (newVal === 1) showToast(`✅ Carta ${cardId} añadida a tu colección`);
    else showToast(`🔄 Carta ${cardId} — ahora tienes ${newVal - 1} repetida(s)`);
  } else {
    if (newVal === 0) showToast(`🗑️ Carta ${cardId} eliminada de tu colección`);
    else showToast(`↩️ Carta ${cardId} — ahora tienes ${newVal} unidad(es)`);
  }
}

// ─────────────────────────────────────
// 5. ACTUALIZAR ESTADÍSTICAS
// ─────────────────────────────────────

/** Actualiza los contadores de progreso y la barra */
function updateStats() {
  const owned   = cards.filter(c => c.cantidad >= 1).length;
  const missing = cards.filter(c => c.cantidad === 0).length;
  const repes   = cards.filter(c => c.cantidad >= 2).length;
  const pct     = Math.round((owned / TOTAL) * 100);

  // Sidebar
  document.getElementById('stat-tengo').textContent  = owned;
  document.getElementById('stat-faltan').textContent = missing;
  document.getElementById('stat-repes').textContent  = repes;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-pct').textContent = `${pct}% (${owned}/${TOTAL})`;

  // Header mini-stats
  document.getElementById('header-tengo').textContent  = owned;
  document.getElementById('header-faltan').textContent = missing;
  document.getElementById('header-repes').textContent  = repes;
}

// ─────────────────────────────────────
// 6. ACTUALIZAR LISTAS DE TEXTO
// ─────────────────────────────────────

/** Actualiza los tres textarea con los números de cada estado */
function updateLists() {
  const missing = cards.filter(c => c.cantidad === 0).map(c => c.id);
  const owned   = cards.filter(c => c.cantidad >= 1).map(c => c.id);
  const repes   = cards.filter(c => c.cantidad >= 2);

  document.getElementById('list-faltan').value =
    missing.length > 0
      ? missing.join(', ')
      : '¡No te falta ninguna! 🎉';

  document.getElementById('list-tengo').value =
    owned.length > 0
      ? owned.join(', ')
      : 'Aún no tienes ninguna carta.';

  document.getElementById('list-repes').value =
    repes.length > 0
      ? repes.map(c => `${c.id}(x${c.cantidad - 1})`).join(', ')
      : 'No tienes repetidas aún.';
}

// ─────────────────────────────────────
// 7. COPIAR AL PORTAPAPELES
// ─────────────────────────────────────

/**
 * Copia texto al portapapeles con feedback visual en el botón.
 * @param {string} text       - Texto a copiar
 * @param {HTMLElement} btn   - Botón que disparó la acción
 * @param {string} successMsg - Mensaje para el toast
 */
function copyToClipboard(text, btn, successMsg) {
  const doFeedback = () => {
    showToast(successMsg || '✅ ¡Copiado!');
    const origHTML = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">check</span> COPIADO`;
    btn.style.background = '#16a34a';
    setTimeout(() => {
      btn.innerHTML = origHTML;
      btn.style.background = '';
    }, 2200);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(doFeedback).catch(() => fallbackCopy(text, doFeedback));
  } else {
    fallbackCopy(text, doFeedback);
  }
}

/** Fallback para navegadores sin Clipboard API */
function fallbackCopy(text, callback) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  if (callback) callback();
}

// Botón: copiar faltantes
document.getElementById('copy-faltan').addEventListener('click', function () {
  const missing = cards.filter(c => c.cantidad === 0).map(c => c.id);
  const text = missing.length > 0
    ? `Me faltan estas cartas de La Roja (${missing.length}): ${missing.join(', ')}`
    : '¡Ya tengo todas las cartas! 🏆';
  copyToClipboard(text, this, '📋 Lista de faltantes copiada');
});

// Botón: copiar repetidas
document.getElementById('copy-repes').addEventListener('click', function () {
  const repes = cards.filter(c => c.cantidad >= 2);
  const text = repes.length > 0
    ? `Tengo estas cartas repetidas de La Roja (${repes.length}): ${repes.map(c => `${c.id}(x${c.cantidad - 1})`).join(', ')}`
    : 'No tengo cartas repetidas.';
  copyToClipboard(text, this, '📋 Lista de repetidas copiada');
});

// Botón: copiar mis números
document.getElementById('copy-tengo').addEventListener('click', function () {
  const owned = cards.filter(c => c.cantidad >= 1).map(c => c.id);
  const text = owned.length > 0
    ? `Mis cartas de La Roja (${owned.length}): ${owned.join(', ')}`
    : 'Aún no tengo ninguna carta.';
  copyToClipboard(text, this, '📋 Lista de cartas copiada');
});

// ─────────────────────────────────────
// 8. EXPORTAR LISTA COMPLETA
// ─────────────────────────────────────

document.getElementById('export-btn').addEventListener('click', () => {
  const owned   = cards.filter(c => c.cantidad >= 1).map(c => c.id);
  const missing = cards.filter(c => c.cantidad === 0).map(c => c.id);
  const repes   = cards.filter(c => c.cantidad >= 2);
  const pct     = Math.round((owned.length / TOTAL) * 100);

  const text = [
    `🇪🇸 MI ÁLBUM — LA SELECCIÓN: TODOS CON LA ROJA`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 Progreso: ${owned.length}/${TOTAL} cromos (${pct}%)`,
    ``,
    `✅ TENGO (${owned.length}):`,
    owned.length > 0 ? owned.join(', ') : '— Ninguna',
    ``,
    `❌ ME FALTAN (${missing.length}):`,
    missing.length > 0 ? missing.join(', ') : '¡Ninguna! 🎉',
    ``,
    `🔄 REPETIDAS (${repes.length}):`,
    repes.length > 0 ? repes.map(c => `${c.id}(x${c.cantidad - 1})`).join(', ') : '— Ninguna',
  ].join('\n');

  copyToClipboard(text, document.getElementById('export-btn'), '📤 Lista completa exportada');
});

// ─────────────────────────────────────
// 9. QUICK ADD (añadir carta por número)
// ─────────────────────────────────────

/** Añade +1 a la carta indicada y hace scroll hasta ella */
function quickAdd(value) {
  const num = parseInt(value, 10);
  if (!num || num < 1 || num > TOTAL) {
    showToast('⚠️ Escribe un número entre 1 y 72');
    return;
  }
  changeCardCount(num, +1);
  const el = document.querySelector(`[data-card-id="${num}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('quick-add-input').value = '';
}

document.getElementById('quick-add-btn').addEventListener('click', () => {
  quickAdd(document.getElementById('quick-add-input').value);
});

document.getElementById('quick-add-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') quickAdd(e.target.value);
});

// ─────────────────────────────────────
// 10. RESETEAR COLECCIÓN
// ─────────────────────────────────────

const resetModal = document.getElementById('reset-modal');

document.getElementById('reset-btn').addEventListener('click', () => {
  resetModal.classList.remove('hidden');
  resetModal.classList.add('flex');
});

document.getElementById('reset-cancel').addEventListener('click', () => {
  resetModal.classList.add('hidden');
  resetModal.classList.remove('flex');
});

document.getElementById('reset-confirm').addEventListener('click', () => {
  cards = Array.from({ length: TOTAL }, (_, i) => ({ id: i + 1, cantidad: 0 }));
  saveCards();
  renderGrid();
  updateStats();
  updateLists();
  resetModal.classList.add('hidden');
  resetModal.classList.remove('flex');
  showToast('🔄 Colección reiniciada');
});

// ─────────────────────────────────────
// 11. TOAST
// ─────────────────────────────────────

let toastTimer = null;

/** Muestra un mensaje temporal en pantalla */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─────────────────────────────────────
// 12. BOTTOM NAV — estado activo
// ─────────────────────────────────────

const bottomNavLinks = document.querySelectorAll('.bottom-nav-link');

bottomNavLinks.forEach(link => {
  link.addEventListener('click', () => {
    // Quitar activo de todos
    bottomNavLinks.forEach(l => l.classList.remove('active'));
    // Activar el pulsado
    link.classList.add('active');
  });
});

// ─────────────────────────────────────
// 13. INICIALIZACIÓN
// ─────────────────────────────────────

renderGrid();
updateStats();
updateLists();
