import { API } from './api.js?v=2';
import { roll } from './roll.js?v=2';
import { landing } from './landing-data.js?v=2';

// Start fetching the map before waiting for the document.
const cityModule = import('./city.js?v=20261019-loader');
cityModule.catch(() => {}); // The initialization block below handles fallback.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));

const hero = document.querySelector('.hero');
const pause = document.querySelector('#pause-motion');
const mapHost = document.querySelector('#city-canvas');
const pins = [...document.querySelectorAll('[data-destination]')];
const districtButtons = [...document.querySelectorAll('[data-district]')];
const place = document.querySelector('#map-place');
const mapStatus = document.querySelector('#map-status');
let city, paused = reduced.matches, selected = -1;
const places = [
  ['Downtown, looking up.', 'Tapered towers, sweeping boulevards and a skyline made for looking up.', 'Downtown', ['Burj Khalifa', 'The Boulevard', 'Dubai Mall']],
  ['Around the marina.', 'Glass towers along the water, palm-lined promenades and a little room for a detour.', 'Dubai Marina', ['Waterfront', 'JBR', 'Promenade']],
  ['A different side of Dubai.', 'Wind towers, low-rise neighbourhoods and quiet lanes beside the creek.', 'Old Dubai', ['The Creek', 'Souks', 'Wind towers']],
  ['The coastal way.', 'Low-rise villas, broad palm avenues and a quieter pace along the waterfront.', 'Jumeirah', ['Beach road', 'Villas', 'Palm avenues']],
  ['Out on the Palm.', 'Frond-shaped islands, waterfront villas and an open sweep of sea.', 'The Palm', ['Fronds', 'Sea views', 'Boardwalk']]
];
function syncMotionControl() {
  if (pause) pause.hidden = reduced.matches;
  document.querySelector('#reduced-motion-label').hidden = !reduced.matches;
  pause?.setAttribute('aria-pressed', String(paused));
  pause?.setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
  if (pause) pause.querySelector('span').textContent = paused ? 'Resume motion' : 'Pause motion';
  document.body.classList.toggle('motion-paused', paused);
  city?.setPaused(paused);
}
syncMotionControl();
pause?.addEventListener('click', () => { paused = !paused; syncMotionControl(); });
reduced.addEventListener('change', () => { paused = reduced.matches; syncMotionControl(); });
function interacted() { document.querySelector('.map-help').classList.add('has-interacted'); }
function closePlace(restoreFocus = false, clearSelection = false) {
  place.hidden = true;
  hero.classList.remove('has-place');
  if (restoreFocus) {
    const pin = pins[selected];
    (pin && !pin.hidden ? pin : districtButtons[selected] || mapHost).focus({ preventScroll: true });
  }
  if (clearSelection) {
    [...pins, ...districtButtons].forEach(button => button.setAttribute('aria-pressed', 'false'));
    selected = -1;
  }
  requestAnimationFrame(() => window.ScrollTrigger?.refresh());
}
// The card's notch points at the active tab when the tab sits under the card.
function aimCaret() {
  const tab = districtButtons[selected];
  if (!tab || place.hidden) return;
  const card = place.getBoundingClientRect(), box = tab.getBoundingClientRect();
  const x = box.left + box.width / 2 - card.left, below = box.top >= card.bottom - 4 && box.top - card.bottom < 60;
  const inside = x > 26 && x < card.width - 26;
  place.style.setProperty('--caret-x', `${Math.round(x)}px`);
  place.style.setProperty('--caret-on', below && inside ? '1' : '0');
}
window.addEventListener('resize', aimCaret);
function selectPlace(index) {
  selected = index;
  pins.forEach((pin, i) => pin.setAttribute('aria-pressed', String(i === index)));
  districtButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  hero.classList.add('has-place');
  document.querySelector('#place-title').textContent = places[index][0];
  document.querySelector('#place-description').textContent = places[index][1];
  const number = String(index + 1).padStart(2, '0');
  document.querySelector('#place-num').textContent = number;
  document.querySelector('#place-count').textContent = `${number} / ${String(places.length).padStart(2, '0')}`;
  document.querySelector('#place-name').textContent = places[index][2];
  document.querySelector('#place-tags').replaceChildren(...places[index][3].map(tag => { const item = document.createElement('li'); item.textContent = tag; return item; }));
  const opening = place.hidden;
  place.hidden = false;
  city?.setDestination(index);
  requestAnimationFrame(() => { window.ScrollTrigger?.refresh(); aimCaret(); });
  interacted();
  mapStatus.textContent = `${pins[index].querySelector('.map-pin-label').textContent} selected. ${places[index][0]}`;
  if (!reduced.matches && window.gsap) {
    if (opening) gsap.fromTo(place, { y: 24, opacity: 0, scale: .96 }, { y: 0, opacity: 1, scale: 1, duration: .6, overwrite: true, ease: 'expo.out' });
    gsap.fromTo(place.querySelectorAll('.place-kicker, h2, #place-description, .place-tags li, .place-foot'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .55, stagger: .045, overwrite: true, ease: 'power3.out' });
    gsap.fromTo('#place-num', { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .8, overwrite: true, ease: 'expo.out' });
  }
}
pins.forEach((pin, i) => pin.addEventListener('click', () => selectPlace(i)));
document.querySelectorAll('[data-place-step]').forEach(button => button.addEventListener('click', () => selectPlace((Math.max(selected, 0) + Number(button.dataset.placeStep) + places.length) % places.length)));
districtButtons.forEach((button, i) => button.addEventListener('click', () => selectPlace(i)));
document.querySelector('.place-close').addEventListener('click', () => closePlace(true));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !place.hidden) closePlace(true); });
function mapAction(action) {
  interacted();
  if (action === 'zoom-in') city?.zoomBy(.16);
  if (action === 'zoom-out') city?.zoomBy(-.16);
  if (action === 'rotate-left') city?.rotateBy(-.28);
  if (action === 'rotate-right') city?.rotateBy(.28);
  if (action === 'reset') { city?.resetView(); closePlace(false, true); mapStatus.textContent = 'Map view reset.'; }
}
document.querySelectorAll('[data-map-action]').forEach(button => button.addEventListener('click', () => mapAction(button.dataset.mapAction)));
mapHost.addEventListener('keydown', event => {
  const action = { ArrowLeft: 'rotate-left', ArrowRight: 'rotate-right', '+': 'zoom-in', '=': 'zoom-in', '-': 'zoom-out', Home: 'reset' }[event.key];
  if (!action) return;
  event.preventDefault(); mapAction(action);
});
async function startMap() {
try {
  const { initCity } = await cityModule;
  window.drigoLoading?.progress?.(46, .6);
  await window.drigoLoading?.assetsReady;
  // Building the city holds the main thread (about 1 s on a fast computer, 4–5 s on a mid-range
  // phone), which would keep the loading screen up past its 3 s limit. So the page is shown first:
  // the static city picture stays in the hero and the live city fades in over it once built.
  await window.drigoLoading?.finish();
  // The city's car labels read their prices from the car rows, which cars.js fills from the API:
  // give that answer up to 2 s to arrive, so the labels show today's prices.
  await Promise.race([landing().catch(() => {}), new Promise(resolve => setTimeout(resolve, 2000))]);
  // Paint the complete loader artwork before building the live scene.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // The build has no stage reports; the bar eases towards 94% meanwhile and finish() completes it.
  window.drigoLoading?.progress?.(94, 4.5);
  city = await initCity(mapHost, {
    theme: 'night',
    onReady: () => { document.body.classList.add('city-ready'); window.drigoLoading?.finish(); },
    onInteract: interacted,
    onStatus: text => { mapStatus.textContent = text; },
    onPins: positions => {
      const safeTop = parseFloat(getComputedStyle(mapHost).getPropertyValue('--map-safe-top')) || 310;
      const mapHeight = mapHost.clientHeight;
      positions.forEach((position, i) => {
      const pin = pins[i];
      if (!pin) return;
      // Pins stay clear of the hero copy and the app preview, not only the top band.
      const px = position.x * mapHost.clientWidth, py = position.y * mapHeight;
      const host = mapHost.getBoundingClientRect();
      const covered = [...document.querySelectorAll('.hero-heading, .district-nav')].some(element => { const box = element.getBoundingClientRect(); return box.width > 0 && px >= box.left - host.left - 24 && px <= box.right - host.left + 24 && py >= box.top - host.top - 40 && py <= box.bottom - host.top + 12; });
      const visible = position.visible && !covered && position.x > .035 && position.x < .965 && position.y * mapHeight > safeTop && position.y < .86;
      if (!visible && document.activeElement === pin) mapHost.focus({ preventScroll: true });
      pin.hidden = !visible;
      pin.style.left = `${position.x * 100}%`;
      pin.style.top = `${position.y * 100}%`;
      });
    }
  });
  if (!city) throw new Error('WebGL unavailable');
  syncMotionControl();
  window.drigoScene = city;
} catch (error) {
  window.drigoLoading?.fail();
  console.info('Using the accessible city fallback.', error.message);
}
}
startMap();

const menu = document.querySelector('.menu-button'), mobileMenu = document.querySelector('#mobile-menu');
function closeMenu(focus = false) {
  menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); mobileMenu.hidden = true;
  if (focus) menu.focus();
}
menu.addEventListener('click', () => {
  const opening = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(opening)); menu.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation'); mobileMenu.hidden = !opening;
});
mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileMenu.hidden) closeMenu(true); });
document.addEventListener('click', event => { if (!event.target.closest('.header, .mobile-menu')) closeMenu(); });
matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);


/* ======================================================================================
   Below the hero: text is split, revealed and rolled; the page moves with the scroll.
   Everything here is progressive — without JS or with reduced motion the page is static.
   ====================================================================================== */
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const moving = !reduced.matches;
if (moving) document.documentElement.classList.add('js-motion');

// Hero headline: each line splits into letters that rise out of their own mask.
document.querySelectorAll('.hl').forEach(line => {
  const text = line.textContent; line.textContent = '';
  [...text].forEach(character => { const letter = document.createElement('span'); letter.className = 'ch'; letter.textContent = character; line.append(letter); });
});

// Hero craft: the city leans a little toward the pointer.
if (fine.matches && moving) {
  hero.addEventListener('pointermove', event => {
    if (paused) return;
    const box = hero.getBoundingClientRect();
    city?.setLean?.((event.clientX - box.left) / box.width * 2 - 1, (event.clientY - box.top) / box.height * 2 - 1);
  });
  hero.addEventListener('pointerleave', () => city?.setLean?.(0, 0));
}

// Rolling labels: a visually hidden copy for assistive tech, two letter rows for the eye.
document.querySelectorAll('[data-roll]').forEach(roll);

// Split text nodes into word spans, keeping <em> accents intact.
function splitWords(root, wrap) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  let index = 0;
  nodes.forEach(node => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { fragment.append(' '); return; }
      fragment.append(wrap(part, index++));
    });
    node.replaceWith(fragment);
  });
}
document.querySelectorAll('.split-words').forEach(heading => splitWords(heading, (word, i) => {
  const outer = document.createElement('span'), inner = document.createElement('span');
  outer.className = 'sw'; inner.textContent = word; inner.style.setProperty('--i', i); outer.append(inner); return outer;
}));
document.querySelectorAll('.fill-text').forEach(text => splitWords(text, word => {
  const span = document.createElement('span'); span.className = 'fw'; span.textContent = word; return span;
}));

// One reveal: elements rise into place the first time they enter, siblings a beat apart.
const revealSelectors = ['.split-words', '.sec-head > p', '.manifesto-foot', '.plan', '.tile', '.voices-head > p', '.qa-head > p', '.qa-head .btn', '.faq details', '.fleet-copy > p', '.fleet-form', '.getapp-lead', '.stores-row', '.fineprint', '.foot-top > *', '.foot-nav > div'];
const revealTargets = [...document.querySelectorAll(revealSelectors.join(','))];
revealTargets.forEach(element => {
  if (!element.matches('.split-words')) element.classList.add('rv');
  const siblings = [...element.parentElement.children].filter(child => revealTargets.includes(child));
  element.style.setProperty('--d', Math.max(0, siblings.indexOf(element)));
});
if (!moving || !('IntersectionObserver' in window)) revealTargets.forEach(element => element.classList.add('is-in'));
else {
  const revealer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in'); revealer.unobserve(entry.target);
    const done = event => { if (event.target !== entry.target || event.propertyName !== 'transform') return; entry.target.classList.remove('rv'); entry.target.removeEventListener('transitionend', done); };
    entry.target.addEventListener('transitionend', done);
  }), { rootMargin: '0px 0px -10% 0px' });
  revealTargets.forEach(element => { revealer.observe(element); element.addEventListener('focusin', () => element.classList.add('is-in'), { once: true }); });
}

// Header: clear over the city, a floating pill over the page; it steps aside while you read down.
const header = document.querySelector('.header');
let lastY = window.scrollY, headerTick = false;
function syncHeader() {
  headerTick = false;
  const y = window.scrollY, heroEnd = hero.offsetHeight - 90;
  header.classList.toggle('is-solid', y > heroEnd);
  const holding = header.contains(document.activeElement) || !mobileMenu.hidden;
  if (y > heroEnd + 240 && y > lastY + 4 && !holding) header.classList.add('is-hidden');
  else if (y < lastY - 4 || y <= heroEnd || holding) header.classList.remove('is-hidden');
  lastY = y;
}
window.addEventListener('scroll', () => { if (!headerTick) { headerTick = true; requestAnimationFrame(syncHeader); } }, { passive: true });
header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
syncHeader();

// Pointer craft: magnetic buttons, wipe origin, tile spotlight, cursor-following plan preview.
if (fine.matches && moving && window.gsap) {
  document.querySelectorAll('[data-magnetic]').forEach(element => {
    const xTo = gsap.quickTo(element, 'x', { duration: .7, ease: 'elastic.out(1, .45)' });
    const yTo = gsap.quickTo(element, 'y', { duration: .7, ease: 'elastic.out(1, .45)' });
    element.addEventListener('pointermove', event => {
      if (paused) return;
      const box = element.getBoundingClientRect();
      xTo((event.clientX - box.left - box.width / 2) * .28); yTo((event.clientY - box.top - box.height / 2) * .38);
    });
    element.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}
document.querySelectorAll('.btn, .store').forEach(button => ['pointerenter', 'pointerleave'].forEach(type => button.addEventListener(type, event => {
  const box = button.getBoundingClientRect();
  button.style.setProperty('--x', `${event.clientX - box.left}px`); button.style.setProperty('--y', `${event.clientY - box.top}px`);
})));
document.querySelectorAll('[data-spot]').forEach(tile => tile.addEventListener('pointermove', event => {
  const box = tile.getBoundingClientRect();
  tile.style.setProperty('--mx', `${event.clientX - box.left}px`); tile.style.setProperty('--my', `${event.clientY - box.top}px`);
}));
// Custom cursor: a dot that sticks to the pointer and a ring that trails it and swells over anything clickable.
if (fine.matches && moving) {
  const root = document.documentElement, dot = document.createElement('div'), ring = document.createElement('div');
  dot.className = 'cursor-dot'; ring.className = 'cursor-ring';
  dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring); root.classList.add('has-cursor');
  let x = -100, y = -100, rx = -100, ry = -100, frame = 0;
  const follow = () => {
    rx += (x - rx) * .2; ry += (y - ry) * .2;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    frame = Math.abs(x - rx) + Math.abs(y - ry) > .1 ? requestAnimationFrame(follow) : 0;
  };
  const clickable = 'a, button, summary, label, select, [data-spot], .plan, .frag, .sticker, #city-canvas[data-hot]';
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    x = event.clientX; y = event.clientY;
    if (!root.classList.contains('cursor-on')) { rx = x; ry = y; root.classList.add('cursor-on'); }
    dot.style.transform = `translate(${x}px, ${y}px)`;
    const target = event.target instanceof Element ? event.target : null;
    root.classList.toggle('cursor-text', Boolean(target?.closest('input, textarea')));
    root.classList.toggle('cursor-hover', Boolean(target?.closest(clickable)) && !target?.closest('input, textarea'));
    root.classList.toggle('cursor-light', Boolean(target?.closest('.map-hero, .voices, .foot, .tile-fuel, .tile-phone, .rc-find, .rc-drive, .ride-media, .plan a:hover, .btn-ink, .btn-violet, .store, .frag-unlock, .header:not(.is-solid)')) && !target?.closest('.map-place'));
    if (!frame) frame = requestAnimationFrame(follow);
  }, { passive: true });
  document.addEventListener('pointerdown', () => root.classList.add('cursor-down'));
  document.addEventListener('pointerup', () => root.classList.remove('cursor-down'));
  document.documentElement.addEventListener('mouseleave', () => root.classList.remove('cursor-on', 'cursor-hover'));
  window.addEventListener('blur', () => root.classList.remove('cursor-on', 'cursor-hover'));
}

// Scroll choreography.
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const expo = 'expo.out';
    // Keep the hero readable from first paint; map startup must never freeze
    // an entrance animation with its heading and actions hidden.

    // Leaving the hero: the camera orbits the city, the two headline lines part ways,
    // the floats lift off faster than the page and the frame eases back.
    const heroOut = { trigger: '.map-hero', start: 'top top', end: 'bottom top', scrub: true };
    ScrollTrigger.create({ ...heroOut, scrub: false, onUpdate: self => city?.setOrbit?.(self.progress) });
    gsap.fromTo('.hl-1', { xPercent: 0, opacity: 1 }, { xPercent: -14, opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: heroOut });
    gsap.fromTo('.hl-2', { xPercent: 0, opacity: 1 }, { xPercent: 10, opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: heroOut });
    gsap.fromTo('.hero-kicker, .hero-sub', { y: 0, opacity: 1 }, { y: -80, opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: { ...heroOut, end: 'bottom 40%' } });
    gsap.fromTo('.district-nav, .map-footer', { opacity: 1, y: 0 }, { opacity: 0, y: 20, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.map-hero', start: 'top top', end: 'bottom 55%', scrub: true } });
    gsap.to('.map-hero', { scale: .96, borderRadius: 40, ease: 'none', transformOrigin: '50% 100%', scrollTrigger: { trigger: '.map-hero', start: 'bottom 90%', end: 'bottom 20%', scrub: .6 } });


    // Parallax depth: data-speed above 1 drifts faster than the page, below 1 lags behind it.
    gsap.utils.toArray('[data-speed]').forEach(element => {
      const depth = (parseFloat(element.dataset.speed) - 1) * 260;
      gsap.fromTo(element, { y: -depth / 2 }, { y: depth / 2, ease: 'none', scrollTrigger: { trigger: element.closest('section, .tile') || element, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Reviews: each card settles back as the next one slides over it.
    const voices = gsap.utils.toArray('.voice');
    voices.forEach((voice, i) => {
      const next = voices[i + 1];
      if (next) gsap.to(voice, { scale: .9, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 35%', scrub: true } });
    });

    // Download: the phone rises into the stage and the app's pieces fly out of it to their places.
    const stageIn = { trigger: '.stage', start: 'top 90%', end: 'center 55%', scrub: .7 };
    gsap.fromTo('.stage-panel', { scale: .9, borderRadius: 80 }, { scale: 1, borderRadius: 40, ease: 'none', scrollTrigger: stageIn });
    gsap.utils.toArray('.frag').forEach(frag => {
      const box = frag.getBoundingClientRect(), stage = document.querySelector('.stage').getBoundingClientRect();
      const dx = stage.left + stage.width / 2 - (box.left + box.width / 2), dy = stage.top + stage.height / 2 - (box.top + box.height / 2);
      gsap.fromTo(frag, { x: dx * .85, y: dy * .85, scale: .4, opacity: 0 }, { x: 0, y: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: stageIn });
    });
  });

  // The trip: pinned, and scrolled sideways through four stops on wide screens.
  const ride = document.querySelector('.ride');
  media.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    ride.classList.add('is-horizontal');
    const track = ride.querySelector('.ride-track');
    const counter = ride.querySelector('.ride-now');
    const distance = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    let stop = 0;
    const slide = gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: ride, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: self => {
          const progress = self.progress;
          const now = Math.min(3, Math.round(progress * 3));
          if (now !== stop) { stop = now; counter.textContent = String(now + 1).padStart(2, '0'); gsap.fromTo(counter, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .45, ease: 'power3.out', overwrite: true }); }
        }
      }
    });
    ride.querySelectorAll('.ride-card').forEach(card => {
      const inner = card.querySelector('.ride-media-phone [data-inner]');
      if (inner) gsap.fromTo(inner, { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true } });
      gsap.fromTo(card.querySelector('.ride-copy'), { x: 120, opacity: .2 }, { x: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left right', end: 'left 45%', scrub: true } });
      gsap.fromTo(card, { scale: .9 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left right', end: 'left 50%', scrub: true } });
    });
    return () => ride.classList.remove('is-horizontal');
  });
  // Narrow screens: the stops stack, each rising in with its image drifting inside the frame.
  media.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    ride.querySelectorAll('.ride-card').forEach(card => {
      gsap.from(card, { y: 70, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 88%' } });
      const inner = card.querySelector('.ride-media > img');

    });
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

// Loops only run while their section is on screen and motion isn't paused.
document.addEventListener('visibilitychange', () => document.body.classList.toggle('motion-paused', paused || document.hidden));
const sectionWatcher = new IntersectionObserver(entries => entries.forEach(entry => {
  entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
  entry.target.querySelectorAll('svg').forEach(svg => { if (typeof svg.pauseAnimations !== 'function') return; entry.isIntersecting && !paused && !reduced.matches ? svg.unpauseAnimations() : svg.pauseAnimations(); });
}), { rootMargin: '10% 0px' });
document.querySelectorAll('main > section').forEach(section => sectionWatcher.observe(section));
pause?.addEventListener('click', () => document.querySelectorAll('main svg').forEach(svg => { if (typeof svg.pauseAnimations === 'function') paused ? svg.pauseAnimations() : svg.closest('.is-offscreen') || svg.unpauseAnimations(); }));

// FAQ answers open and close smoothly.
document.querySelectorAll('.faq details').forEach(details => {
  const summary = details.querySelector('summary'), panel = details.querySelector('p');
  if (!summary || !panel) return;
  summary.addEventListener('click', event => {
    if (reduced.matches) return;
    event.preventDefault();
    if (details.open) {
      const animation = panel.animate([{ height: `${panel.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.22,.61,.36,1)' });
      animation.onfinish = () => { details.open = false; panel.style.height = ''; };
    } else {
      details.open = true;
      const height = panel.offsetHeight;
      const animation = panel.animate([{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)' });
      animation.onfinish = () => { panel.style.height = ''; };
    }
  });
});

const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

const form = document.querySelector('#partner-form');
// Country codes for the phone field, as the current form offered them; typing a code still works.
fetch(`${API}/countries`, { signal: AbortSignal.timeout(10000) })
  .then(response => response.ok ? response.json() : [])
  .then(countries => document.querySelector('#phone-codes')?.replaceChildren(...countries
    .filter(country => /^\+[0-9]{1,6}$/.test(country.phoneCode || ''))
    .map(country => { const option = document.createElement('option'); option.value = country.phoneCode; option.label = `${country.flag || ''} ${country.name}`.trim(); return option; })))
  .catch(() => {});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(form), value = name => String(data.get(name) || '').trim();
  const status = document.querySelector('#form-status'), button = form.querySelector('[type=submit]');
  if (button.disabled) return;
  status.className = 'form-status';
  for (const name of ['company', 'name', 'email', 'phoneCode', 'phone']) {
    const field = form.elements[name]; field.removeAttribute('aria-invalid');
    if (!value(name)) { status.classList.add('error'); status.textContent = 'Please complete all fields.'; field.setAttribute('aria-invalid','true'); field.focus(); return; }
  }
  if (!/^[0-9 ()-]{6,20}$/.test(value('phone')) || value('phone').replace(/\D/g, '').length < 6) {
    status.classList.add('error'); status.textContent = 'Enter your phone number without the country code.'; form.elements.phone.setAttribute('aria-invalid','true'); form.elements.phone.focus(); return;
  }
  const body = { companyName: value('company'), companyType: value('type'), personName: value('name'), email: value('email'), phoneCode: value('phoneCode'), phoneNumber: value('phone') };
  button.disabled = true; button.querySelector('.button-label').textContent = 'Sending…'; status.textContent = 'Sending your enquiry…';
  try {
    const response = await fetch(`${API}/landing/business-inquiry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Enquiry failed');
    status.textContent = 'Your enquiry has been received. The Drigo team will get in touch.'; form.reset();
  } catch { status.classList.add('error'); status.textContent = 'Your enquiry wasn’t sent. Please try again, or email support@drigo.com.'; }
  finally { button.disabled = false; button.querySelector('.button-label').textContent = 'Send enquiry'; }
});

// Custom company-type picker; the underlying select preserves form values and reset.
const companySelect = document.querySelector('select[name="type"]');
if (companySelect) {
  const oldField = companySelect.parentElement;
  const field = document.createElement('div');
  field.className = 'field field-select company-picker';
  oldField.replaceWith(field);
  field.append(...oldField.childNodes);
  const label = field.querySelector('.field-label');
  label.id = 'company-type-label';
  companySelect.hidden = true;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'company-trigger';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'company-type-options');
  trigger.setAttribute('aria-labelledby', 'company-type-label company-type-value');
  trigger.innerHTML = '<span id="company-type-value"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const list = document.createElement('div');
  list.id = 'company-type-options';
  list.className = 'company-options';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-labelledby', label.id);
  list.hidden = true;
  const options = [...companySelect.options].map((option, index) => {
    const item = document.createElement('div');
    item.id = `company-type-option-${index}`;
    item.className = 'company-option';
    item.setAttribute('role', 'option');
    item.textContent = option.textContent;
    item.addEventListener('pointerdown', event => event.preventDefault());
    item.addEventListener('click', () => commit(index));
    list.append(item);
    return item;
  });
  field.append(trigger, list);
  let active = companySelect.selectedIndex;
  function highlight(index) {
    active = (index + options.length) % options.length;
    options.forEach((option, i) => option.classList.toggle('is-active', i === active));
    trigger.setAttribute('aria-activedescendant', options[active].id);
  }
  function sync() {
    trigger.querySelector('span').textContent = companySelect.selectedOptions[0].textContent;
    options.forEach((option, i) => option.setAttribute('aria-selected', String(i === companySelect.selectedIndex)));
  }
  function close() {
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
  }
  function open() {
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    highlight(companySelect.selectedIndex);
  }
  function commit(index) {
    companySelect.selectedIndex = index;
    companySelect.dispatchEvent(new Event('change', { bubbles: true }));
    sync(); close(); trigger.focus();
  }
  trigger.addEventListener('click', () => list.hidden ? open() : close());
  trigger.addEventListener('keydown', event => {
    const key = event.key;
    if (key === 'Tab') { close(); return; }
    if (key === 'Escape') { event.preventDefault(); close(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      if (list.hidden) open();
      else if (key === 'ArrowDown' || key === 'ArrowUp') highlight(active + (key === 'ArrowDown' ? 1 : -1));
      if (key === 'Home') highlight(0);
      if (key === 'End') highlight(options.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault(); list.hidden ? open() : commit(active);
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const match = options.findIndex(option => option.textContent.toLowerCase().startsWith(key.toLowerCase()));
      if (match >= 0) { event.preventDefault(); if (list.hidden) open(); highlight(match); }
    }
  });
  document.addEventListener('pointerdown', event => { if (!field.contains(event.target)) close(); });
  field.addEventListener('focusout', event => { if (!field.contains(event.relatedTarget)) close(); });
  companySelect.addEventListener('change', sync);
  companySelect.form.addEventListener('reset', () => { close(); setTimeout(sync, 0); });
  sync();
}

// Keep each section title on its two authored lines at every container width.
const twoLineTitles = [...document.querySelectorAll('h2 > .heading-line')].map(line => line.parentElement);
function fitSectionTitles() {
  twoLineTitles.forEach(title => {
    title.style.removeProperty('font-size');
    const size = parseFloat(getComputedStyle(title).fontSize);
    const available = title.clientWidth;
    const widest = Math.max(...[...title.children].map(line => line.scrollWidth));
    if (available && widest > available) title.style.fontSize = `${size * available / widest * .99}px`;
  });
}
document.fonts.ready.then(fitSectionTitles);
let titleFitFrame;
const titleObserver = new ResizeObserver(() => {
  cancelAnimationFrame(titleFitFrame);
  titleFitFrame = requestAnimationFrame(fitSectionTitles);
});
twoLineTitles.forEach(title => titleObserver.observe(title.parentElement));
