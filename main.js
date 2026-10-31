'use strict';

// Navegación móvil: apertura, cierre y teclado.
const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.main-nav');
if (menuToggle && menu) {
  const closeMenu = () => {
    menu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú');
  };
  menuToggle.addEventListener('click', () => {
    const opened = menuToggle.getAttribute('aria-expanded') === 'true';
    menu.classList.toggle('is-open', !opened);
    menuToggle.setAttribute('aria-expanded', String(!opened));
    menuToggle.setAttribute('aria-label', opened ? 'Abrir menú' : 'Cerrar menú');
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
}

// El recorrido da una referencia permanente de cuánta página falta.
const sectionInfo = [
  ['inicio', 'Inicio'], ['manifesto', 'Esencia'], ['destinos', 'Destinos'],
  ['colecciones', 'Colecciones'], ['como-funciona', 'Cómo funciona'], ['contacto', 'Contacto']
];
const sectionEls = sectionInfo.map(([id]) => document.getElementById(id));
const railLinks = document.querySelectorAll('.journey-rail a');
const progressBar = document.getElementById('page-progress-bar');
const mobileCurrent = document.getElementById('mobile-current-step');
const nextButton = document.getElementById('next-section-button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let activeSection = 0;
let scrollScheduled = false;

function syncScrollUI() {
  const scrollHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const ratio = Math.max(0, Math.min(1, window.scrollY / scrollHeight));
  if (progressBar) progressBar.style.width = `${(ratio * 100).toFixed(2)}%`;
  const activationLine = window.innerHeight * .47;
  let current = 0;
  sectionEls.forEach((section, i) => {
    if (section && section.getBoundingClientRect().top <= activationLine) current = i;
  });
  if (current !== activeSection || !syncScrollUI.initialized) {
    activeSection = current;
    railLinks.forEach(link => {
      if (link.dataset.section === sectionInfo[current][0]) {
        link.setAttribute('aria-current', 'location');
      } else link.removeAttribute('aria-current');
    });
    if (mobileCurrent) mobileCurrent.textContent = `${String(current + 1).padStart(2, '0')} / ${String(sectionInfo.length).padStart(2, '0')}`;
    if (nextButton) {
      const isLast = current === sectionInfo.length - 1;
      nextButton.innerHTML = isLast ? 'VOLVER ARRIBA <span>↑</span>' : 'SIGUIENTE <span>↓</span>';
      nextButton.setAttribute('aria-label', isLast ? 'Volver al inicio' : `Ir a ${sectionInfo[current + 1][1]}`);
    }
  }
  syncScrollUI.initialized = true;
  const heroStack = document.querySelector('.hero-stack');
  if (heroStack && !reducedMotion && window.innerWidth > 760) {
    const shift = Math.max(-17, Math.min(17, window.scrollY * .065));
    heroStack.style.setProperty('--hero-drift', `${shift.toFixed(1)}px`);
  }
  scrollScheduled = false;
}
window.addEventListener('scroll', () => {
  if (!scrollScheduled) {
    scrollScheduled = true;
    requestAnimationFrame(syncScrollUI);
  }
}, { passive: true });
window.addEventListener('resize', syncScrollUI);
window.addEventListener('load', syncScrollUI);
requestAnimationFrame(syncScrollUI);
if (nextButton) {
  nextButton.addEventListener('click', () => {
    const next = (activeSection + 1) % sectionInfo.length;
    sectionEls[next]?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  });
}

// Galería horizontal interactiva y filtros por estilo de experiencia.
const destinationGrid = document.getElementById('destination-grid');
const cards = Array.from(document.querySelectorAll('.destination-card'));
const filters = Array.from(document.querySelectorAll('[data-filter]'));
const previousDestination = document.getElementById('destination-prev');
const nextDestination = document.getElementById('destination-next');
const destinationCounter = document.getElementById('destination-counter');
const visibleCards = () => cards.filter(card => !card.hidden);

function cardIndex() {
  const shown = visibleCards();
  if (!shown.length || !destinationGrid) return 0;
  const left = destinationGrid.getBoundingClientRect().left;
  let best = 0;
  let shortest = Infinity;
  shown.forEach((card, index) => {
    const distance = Math.abs(card.getBoundingClientRect().left - left);
    if (distance < shortest) { shortest = distance; best = index; }
  });
  return best;
}
function updateDestinationControls() {
  if (!destinationGrid) return;
  const shown = visibleCards();
  const current = cardIndex();
  if (destinationCounter) destinationCounter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(shown.length).padStart(2, '0')}`;
  if (previousDestination) previousDestination.disabled = current === 0;
  if (nextDestination) nextDestination.disabled = shown.length <= 1 || destinationGrid.scrollLeft + destinationGrid.clientWidth >= destinationGrid.scrollWidth - 4;
}
function goToCard(delta) {
  const shown = visibleCards();
  const current = cardIndex();
  const next = Math.max(0, Math.min(shown.length - 1, current + delta));
  shown[next]?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', inline: 'start', block: 'nearest' });
  window.setTimeout(updateDestinationControls, reducedMotion ? 0 : 440);
}
previousDestination?.addEventListener('click', () => goToCard(-1));
nextDestination?.addEventListener('click', () => goToCard(1));
destinationGrid?.addEventListener('scroll', updateDestinationControls, { passive: true });
window.addEventListener('resize', updateDestinationControls);
filters.forEach(button => button.addEventListener('click', () => {
  const selected = button.dataset.filter;
  filters.forEach(btn => {
    const active = btn === button;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  cards.forEach(card => card.hidden = selected !== 'todos' && card.dataset.category !== selected);
  if (destinationGrid) destinationGrid.scrollLeft = 0;
  requestAnimationFrame(updateDestinationControls);
}));
requestAnimationFrame(updateDestinationControls);

// Las tarjetas de destinos funcionan como CTA hacia el formulario.
// Se preselecciona el destino; NO se crea una reserva.
cards.forEach(card => {
  const place = card.querySelector('h3')?.textContent?.trim();
  if (!place) return;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Consultar el destino ${place}`);
  const openInquiry = () => {
    const select = document.getElementById('destino');
    if (select && [...select.options].some(option => option.value === place || option.textContent === place)) {
      select.value = place;
    }
    document.getElementById('contacto')?.scrollIntoView({behavior: reducedMotion ? 'auto' : 'smooth', block: 'start'});
  };
  card.addEventListener('click', openInquiry);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openInquiry();
    }
  });
});

// Carrusel independiente para las cuatro colecciones.
const collectionRail = document.getElementById('collection-rail');
const collectionPrev = document.getElementById('collection-prev');
const collectionNext = document.getElementById('collection-next');
function updateCollectionControls() {
  if (!collectionRail) return;
  if (collectionPrev) collectionPrev.disabled = collectionRail.scrollLeft <= 2;
  if (collectionNext) collectionNext.disabled = collectionRail.scrollLeft + collectionRail.clientWidth >= collectionRail.scrollWidth - 3;
}
function advanceCollection(delta) {
  if (!collectionRail) return;
  const card = collectionRail.querySelector('.route-card');
  const width = card?.getBoundingClientRect().width || 300;
  collectionRail.scrollBy({ left: delta * (width + 14), behavior: reducedMotion ? 'instant' : 'smooth' });
}
collectionPrev?.addEventListener('click', () => advanceCollection(-1));
collectionNext?.addEventListener('click', () => advanceCollection(1));
collectionRail?.addEventListener('scroll', updateCollectionControls, { passive: true });
window.addEventListener('resize', updateCollectionControls);
requestAnimationFrame(updateCollectionControls);

// Formulario de ejemplo para la propuesta de Marketing Digital.
// NO realiza envíos ni reservas: solo valida y muestra una confirmación local.
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = document.getElementById('nombre').value.trim();
    const email = document.getElementById('correo').value.trim();
    const destination = document.getElementById('destino').value.trim();
    const feedback = document.getElementById('form-feedback');
    if (!name || !email || !destination || !form.checkValidity()) {
      feedback.textContent = 'Completá tu nombre, un correo válido y el destino que te interesa.';
      form.reportValidity();
      return;
    }
    feedback.textContent = `¡Listo, ${name}! Así se prepararía una consulta sobre ${destination}. Esta es una simulación: no enviamos ni guardamos tus datos, y no se generó ninguna reserva.`;
    feedback.setAttribute('role', 'status');
    // No se almacena ningún dato: limpiamos la prueba al terminar.
    form.reset();
  });
}

// Aparición progresiva. Al desactivar animaciones, todo queda visible.
const revealItems = document.querySelectorAll('.reveal');
if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach(item => item.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .07, rootMargin: '0px 0px 50px 0px' });
  revealItems.forEach(item => observer.observe(item));
}
