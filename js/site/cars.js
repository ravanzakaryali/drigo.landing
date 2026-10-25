// The cars section: one row per model with its own from-price, loaded live from /api/landing.
// The HTML ships the current models as a fallback, so the section reads fine without JS or the API.
import { API } from './api.js?v=2';
import { landing, formatPrice } from './landing-data.js?v=2';

const list = document.querySelector('.plan-list');
const SPRITE = 'assets/images/site/icons.svg?v=1';

// Studio photos for the models we have them for; any other model uses its photo from the API.
const photos = {
  'geely gx3 pro': 'assets/images/site/car-gx3-pro.webp',
  'geely emgrand': 'assets/images/site/car-emgrand.webp',
  'geely coolray': 'assets/images/site/car-coolray.webp',
  'gac gs3 emzoom': 'assets/images/site/car-gac-gs3.webp'
};

function svgUse(id) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'), use = document.createElementNS(ns, 'use');
  svg.setAttribute('aria-hidden', 'true'); use.setAttribute('href', `${SPRITE}#${id}`); svg.append(use);
  return svg;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function describe(model) {
  const name = `${model.brandName} ${model.modelName}`.trim();
  const discounted = model.discountedPrice != null && model.originalPrice != null && Number(model.discountedPrice) < Number(model.originalPrice);
  const unit = String(model.timeUnit || 'day').toLowerCase();
  const km = Number(model.includedDistance) > 0 ? `${formatPrice(model.includedDistance)} km a ${unit}` : '';
  return {
    name, unit, km, year: model.manufactureYear, body: model.bodyTypeName, seats: model.seats, currency: model.currency || 'AED',
    price: formatPrice(discounted ? model.discountedPrice : model.price),
    photo: photos[name.toLowerCase()] || (model.mediaId ? `${API}/image/${model.mediaId}?w=1080&q=80&f=webp` : '')
  };
}

const details = car => [[car.seats && `${car.seats} seats`, car.km && `${car.km} included`].filter(Boolean).join(', '), 'Fuel included on eligible trips', 'Daily and monthly packages'].filter(Boolean);

function fill(row, car, i) {
  const photo = row.querySelector('.plan-photo');
  if (photo && car.photo) { photo.src = car.photo; photo.alt = car.name; }
  row.querySelector('.plan-n').textContent = [String(i + 1).padStart(2, '0'), car.year, car.body].filter(Boolean).join(' · ');
  row.querySelector('.plan-name').textContent = car.name;
  row.querySelector('.plan-desc').replaceChildren(el('b', null, `From ${car.currency} ${car.price} / ${car.unit}`));
  row.querySelector('.plan-details').replaceChildren(...details(car).map(text => { const li = el('li'); li.append(svgUse('check'), text); return li; }));
}

function buildRow() {
  const item = el('li', 'plan'), link = el('a');
  link.href = '#get-the-app';
  const photo = el('img', 'plan-photo');
  Object.assign(photo, { width: 1080, height: 458, loading: 'lazy', decoding: 'async' });
  const go = el('span', 'plan-go'); go.setAttribute('aria-hidden', 'true'); go.append(svgUse('arrow-up-right'));
  link.append(photo, el('span', 'plan-n'), el('span', 'plan-name'), el('span', 'plan-desc'), go, el('ul', 'plan-details'));
  item.append(link);
  return item;
}

// A long model name shrinks to fit its row instead of running past it; short names keep the CSS size.
function fitNames() {
  list?.querySelectorAll('.plan-name').forEach(name => {
    name.style.fontSize = '';
    const overflow = name.scrollWidth / name.clientWidth;
    if (name.clientWidth && overflow > 1.01) name.style.fontSize = `${parseFloat(getComputedStyle(name).fontSize) / overflow * .97}px`;
  });
}
let fitFrame = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(fitNames); });
document.fonts.ready.then(fitNames);

function render(models) {
  const cars = models.filter(model => model && model.brandName).map(describe);
  if (!cars.length || !list) return;
  let rows = [...list.querySelectorAll(':scope > .plan')];
  // Same number of models: update the rows in place so their reveal and hover state survive.
  if (rows.length !== cars.length) { list.replaceChildren(...cars.map(buildRow)); rows = [...list.children]; }
  rows.forEach((row, i) => fill(row, cars[i], i));
  fitNames();
}

landing()
  .then(data => render(Array.isArray(data?.models) ? data.models : []))
  .catch(error => console.info('Showing the built-in car list.', error.message));
