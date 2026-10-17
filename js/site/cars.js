// The cars section: one row per model with its own from-price, loaded live from /api/landing.
// The HTML ships the current models as a fallback, so the section reads fine without JS or the API.
import { API } from './api.js?v=1';
import { setRolledText } from './roll.js?v=1';

const list = document.querySelector('.plan-list');
const preview = document.querySelector('.plan-preview');

// Studio photos for the models we have them for; any other model uses its photo from the API.
const photos = {
  'geely gx3 pro': 'assets/images/site/car-gx3-pro.webp',
  'geely emgrand': 'assets/images/site/car-emgrand.webp',
  'geely coolray': 'assets/images/site/car-coolray.webp',
  'gac gs3 emzoom': 'assets/images/site/car-gac-gs3.webp'
};

// Backend sends decimals (186.25, 159.20): whole prices lose the ".00", others keep two decimals.
function formatPrice(value) {
  const num = Number(value);
  const decimals = Number.isInteger(num) ? 0 : 2;
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function svgUse(id) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'), use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `#${id}`); svg.append(use);
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
  const price = formatPrice(discounted ? model.discountedPrice : model.price);
  const unit = String(model.timeUnit || 'day').toLowerCase();
  const km = Number(model.includedDistance) > 0 ? `${formatPrice(model.includedDistance)} km a ${unit}` : '';
  const seats = model.seats ? `${model.seats} seats` : '';
  const photo = photos[name.toLowerCase()] || (model.mediaId ? `${API}/image/${model.mediaId}?w=1080&q=80&f=webp` : '');
  return { name, price, unit, km, seats, photo, year: model.manufactureYear, body: model.bodyTypeName, currency: model.currency || 'AED' };
}

function fillDesc(desc, car) {
  desc.replaceChildren(el('b', null, `From ${car.currency} ${car.price} / ${car.unit}`), [car.body, car.seats, car.km].filter(Boolean).join(' · '));
}

function buildRow(car, i) {
  const item = el('li', 'plan'), link = el('a');
  link.href = '#get-the-app';
  const name = el('span', 'plan-name'); name.dataset.roll = '';
  const desc = el('span', 'plan-desc');
  const go = el('span', 'plan-go'); go.setAttribute('aria-hidden', 'true'); go.append(svgUse('arrow-up-right'));
  link.append(el('span', 'plan-n', String(i + 1).padStart(2, '0')), name, desc, go);
  item.append(link);
  setRolledText(name, car.name);
  fillDesc(desc, car);
  return item;
}

function buildPanel(car, i) {
  const panel = el('article', 'pp-panel'); panel.dataset.i = i;
  if (car.photo) {
    const photo = el('img', 'pp-photo');
    Object.assign(photo, { src: car.photo, alt: '', width: 1080, height: 458, loading: 'lazy', decoding: 'async' });
    panel.append(photo);
  }
  const header = el('header'), title = el('span');
  title.append(el('small', null, [car.year, car.body].filter(Boolean).join(' · ')), el('strong', null, car.name));
  header.append(title);
  const bullets = el('ul');
  [[car.seats, car.km && `${car.km} included`].filter(Boolean).join(', '), 'Fuel included on eligible trips', 'Hourly and daily packages']
    .filter(Boolean).forEach(text => { const li = el('li'); li.append(svgUse('check'), text); bullets.append(li); });
  const foot = el('span', 'pp-foot'), from = el('span');
  from.append('From ', el('b', null, `${car.currency} ${car.price}`), ` / ${car.unit}`);
  foot.append(from, svgUse('arrow-up-right'));
  panel.append(header, bullets, foot);
  return panel;
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
  const rows = [...list.querySelectorAll('.plan')];
  if (rows.length === cars.length) {
    // Same number of models: update the rows in place so their reveal and hover state survive.
    rows.forEach((row, i) => {
      row.querySelector('.plan-n').textContent = String(i + 1).padStart(2, '0');
      setRolledText(row.querySelector('.plan-name'), cars[i].name);
      fillDesc(row.querySelector('.plan-desc'), cars[i]);
    });
  } else {
    list.replaceChildren(...cars.map(buildRow));
  }
  preview?.replaceChildren(...cars.map(buildPanel));
  fitNames();
}

fetch(`${API}/landing`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
  .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then(data => render(Array.isArray(data?.models) ? data.models : []))
  .catch(error => console.info('Showing the built-in car list.', error.message));
