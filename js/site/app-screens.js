// The phone screens on the page are drawn here in HTML, not shown as screenshots, so what they show
// is Drigo's real data: the car, its packages and prices, its free parking zones and fees, all from
// the public API. Each screen is laid out at the app's own 390 × 844 and scaled to its phone frame.
// They render straight away with the built-in data below, then refresh once the API answers.
// Never shown: a plate number, a car's location, or anything that belongs to one customer.
import { API } from './api.js?v=2';
import { landing, getJSON, formatPrice } from './landing-data.js?v=2';

const VAT_RATE = 0.05;

// Built-in data, as the API returned it on 2026-10-19. Only used until (or if not) the API answers.
const FALLBACK = {
  car: { name: 'Geely Emgrand', year: 2026, body: 'Sedan', seats: 5, maxSpeed: 180, transmission: 'Automatic', fuel: 'Petrol', fuelLevel: 43, image: 'assets/images/site/car-emgrand.webp' },
  zones: ['A', 'AP', 'B', 'BP', 'C', 'CP', 'D', 'DP'],
  stations: ['ENOC', 'EPPCO'],
  insurance: { name: 'Basic Insurance', price: 0 },
  packages: [
    { label: '1 day - 150 km', original: 192.25, final: 139 },
    { label: '2 days - 325 km', original: 402.67, final: 273 },
    { label: '3 days - 500 km', original: 596, final: 404 },
    { label: '5 days - 850 km', original: 985.33, final: 667 }
  ],
  extra: { distance: 50, price: 45 },
  adminFee: 15,
  currency: 'AED',
  list: [
    { name: 'Geely Emgrand', year: 2026, body: 'Sedan', seats: 5, price: 139, image: 'assets/images/site/car-emgrand.webp' },
    { name: 'Geely GX3 Pro', year: 2026, body: 'SUV', seats: 5, price: 129, image: 'assets/images/site/car-gx3-pro.webp' }
  ],
  bodies: ['Sedan', 'SUV']
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (value, currency) => `${formatPrice(value)} ${currency}`;

// ---- Icons (24 × 24, stroked) ---------------------------------------------------------
const paths = {
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3M7 7h5v4H7z"/>',
  speed: '<path d="M4 17a8 8 0 1 1 16 0M12 17l4-5M6.5 12.5l1 .6M12 8v1.2M17.5 12.5l-1 .6"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.6M18 14.5a5 5 0 0 1 2.5 4.5"/>',
  gear: '<circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v8M12 8v8M18 8v4H6"/>',
  parking: '<circle cx="12" cy="12" r="9"/><path d="M10 16.5V7.5h3a2.5 2.5 0 0 1 0 5h-3"/>',
  pump: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M8 7h4M15 10h2l2 2v5a1.5 1.5 0 0 1-3 0v-3"/>',
  shield: '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.3l8 4.5"/>',
  route: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/>',
  receipt: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  fee: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.6 0-2.6.8-2.6 1.9 0 2.8 5.3 1.4 5.3 4.2 0 1.1-1.1 1.9-2.7 1.9-1.2 0-2.2-.5-2.7-1.4M12 6.5V8M12 16v1.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19a3 3 0 0 1-3 3h-3"/>',
  warning: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  forward: '<path d="m6 7 5 5-5 5M13 7l5 5-5 5"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM7 19v1.5M17 19v1.5M5 11h14"/>',
  smile: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 10h.01M15 10h.01M9 14.5a4 4 0 0 0 6 0"/>'
};
const icon = (name, cls = '') => `<svg class="as-i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;

const statusBar = dark => `<div class="as-status${dark ? ' is-dark' : ''}"><span>9:41</span><span class="as-status-icons"><i class="as-signal"></i><i class="as-wifi"></i><i class="as-battery"></i></span></div>`;
const free = '<b class="as-free">FREE</b>';

// ---- Screens -------------------------------------------------------------------------------
function booking(d) {
  const c = d.car;
  const included = [
    ['parking', 'is-violet', 'Parking zones', d.zones.join(', ')],
    ['pump', 'is-blue', 'Fuel included:', `Refuel at ${d.stations.join(', ')}`],
    ['shield', 'is-green', 'Insurance:', d.insurance.price > 0 ? `${d.insurance.name} · from ${money(d.insurance.price, d.currency)}` : d.insurance.name]
  ];
  return `${statusBar()}<div class="as-map as-map-strip"></div>
  <div class="as-sheet as-sheet-book"><i class="as-grab"></i>
    <button class="as-help" tabindex="-1">${icon('headset')}</button>
    <span class="as-year">${esc(c.year)}</span><strong class="as-title">${esc(c.name)}</strong><span class="as-sub">${esc(c.body)} · ${esc(c.seats)} seats</span>
    <img class="as-car" src="${esc(c.image)}" alt="" decoding="async">
    <div class="as-specs">
      ${[['fuel', 'Fuel level', `${c.fuelLevel}%`], ['speed', 'Max speed', `${c.maxSpeed} km/h`], ['people', 'Capacity', `${c.seats} seats`], ['gear', 'Transmission', c.transmission]]
        .map(([i, k, v]) => `<span class="as-spec">${icon(i)}<small>${esc(k)}</small><b>${esc(v)}</b></span>`).join('')}
    </div>
    <div class="as-included">${included.map(([i, tone, k, v]) => `<span class="as-inc ${tone}"><span class="as-inc-icon">${icon(i)}</span><span><small>${esc(k)}</small><b>${esc(v)}</b></span>${d.insurance.price > 0 && i === 'shield' ? '' : free}</span>`).join('')}</div>
    <strong class="as-h">Packages</strong>
    <div class="as-packages">${d.packages.slice(0, 4).map((p, i) => `<span class="as-pack${i === 0 ? ' is-on' : ''}"><small>${esc(p.label)}</small><span>${p.final < p.original ? `<s>${money(p.original, d.currency)}</s> ` : ''}<b>${money(p.final, d.currency)}</b></span></span>`).join('')}</div>
  </div>
  <div class="as-actions"><span class="as-btn is-soft">Book for later</span><span class="as-btn">Start ride</span></div><i class="as-home"></i>`;
}

function unlock(d) {
  const c = d.car, p = d.packages[0];
  const rows = [['box', 'Package', p.label, p.final], ['route', 'Extra', `Added ${formatPrice(d.extra.distance)} km`, d.extra.price]];
  if (d.adminFee > 0) rows.push(['fee', 'Fee', 'Admin fee', d.adminFee]);
  const vat = rows.reduce((sum, row) => sum + Number(row[3]), 0) * VAT_RATE;
  rows.splice(2, 0, ['receipt', 'Fee', `VAT (${Math.round(VAT_RATE * 100)}%)`, Math.round(vat * 100) / 100]);
  rows.push(['coin', 'Deposit', 'No deposit charge', 0]);
  return `${statusBar()}<div class="as-map as-map-walk"><svg class="as-route" viewBox="0 0 390 300" aria-hidden="true"><path d="M70 300C110 262 150 246 190 226S262 190 292 158"/></svg><span class="as-pin">${icon('car')}</span></div>
  <div class="as-walk-head"><span class="as-back">${icon('back')}</span><span class="as-eta"><b>3 min · 250 m</b><small>Distance to the car</small></span><span class="as-help is-square">${icon('headset')}</span></div>
  <div class="as-blink"><span>Can’t find your car?</span><b>Blink car lights ${icon('smile')}</b></div>
  <div class="as-sheet as-sheet-walk"><i class="as-grab"></i>
    <strong class="as-title">${esc(c.name)}</strong><span class="as-sub">${esc(c.year)} · ${esc(c.body)} · ${esc(c.seats)} seats</span>
    <img class="as-car is-small" src="${esc(c.image)}" alt="" decoding="async">
    <strong class="as-h">Rent details</strong>
    <div class="as-rows">${rows.map(([i, k, v, a]) => `<span class="as-row"><span class="as-row-icon">${icon(i)}</span><span><small>${esc(k)}</small><b>${esc(v)}</b></span><b class="as-amount">${a ? money(a, d.currency) : '0'}</b></span>`).join('')}</div>
    <span class="as-more">Included for free ${icon('chevron')}</span>
  </div>
  <div class="as-unlock"><span class="as-unlock-knob">${icon('lock')}</span><b>Reach car 30m to unlock</b></div><i class="as-home"></i>`;
}

function finish(d) {
  const c = d.car;
  const rules = [`You parked in a designated parking area (${d.zones.join(', ')})`, 'You closed the doors and the windows', 'You turned off the car lights', 'You left the key inside the car'];
  return `${statusBar()}<div class="as-end-bg">
    <div class="as-end-head"><span class="as-back is-soft">${icon('back')}</span><span class="as-help is-square is-soft">${icon('headset')}</span><span class="as-help is-square is-amber">${icon('warning')}</span></div>
    <span class="as-year">${esc(c.year)}</span><strong class="as-title">${esc(c.name)}</strong><span class="as-sub">${esc(c.body)} · ${esc(c.seats)} seats</span>
    <img class="as-car" src="${esc(c.image)}" alt="" decoding="async">
    <span class="as-inc is-plain as-end-zones"><span class="as-inc-icon">${icon('parking')}</span><span><small>Parking zones</small><b>${esc(d.zones.join(', '))}</b></span>${free}</span>
  </div>
  <div class="as-dim"></div>
  <div class="as-modal"><span class="as-x">${icon('close')}</span><strong>Before ending rental</strong><small>Please make sure you follow the rules listed below</small>
    <ol>${rules.map((rule, i) => `<li><i>${i + 1}</i>${esc(rule)}</li>`).join('')}</ol><span class="as-btn">End rental</span></div>
  <div class="as-swipe"><span class="as-swipe-knob">${icon('forward')}</span><b>Swipe to end the rental</b></div><i class="as-home"></i>`;
}

function mapSheet(d) {
  return `<div class="as-sheet as-sheet-map"><i class="as-grab"></i>
    <div class="as-chips"><span class="as-chip is-on">${icon('car')}All cars</span>${d.bodies.map(b => `<span class="as-chip">${esc(b)}</span>`).join('')}</div>
    ${d.list.slice(0, 2).map(car => `<span class="as-card"><img src="${esc(car.image)}" alt="" decoding="async"><span><b>${esc(car.name)}</b><span><i class="as-year is-small">${esc(car.year)}</i>${esc(car.body)} · ${esc(car.seats)} seats</span></span><span class="as-card-price"><small>from</small><b>${money(car.price, d.currency)}</b></span></span>`).join('')}
  </div>`;
}

const screens = { booking, unlock, end: finish, map: mapSheet };

// ---- Live data -----------------------------------------------------------------------------
const unitName = (count, unit) => `${count} ${String(unit || 'day').toLowerCase()}${Number(count) === 1 ? '' : 's'}`;
const image = id => `${API}/image/${id}?w=640&f=webp`;

async function live() {
  const data = await landing();
  const withPhoto = (data.cars || []).filter(car => car.carImageMediaId);
  const pick = withPhoto.find(car => /emgrand/i.test(car.modelName)) || withPhoto[0];
  if (!pick) throw new Error('No car to show');
  const [car, services, packages, prices] = await Promise.all([
    getJSON(`/cars/${pick.id}`),
    getJSON(`/cars/${pick.id}/included-services`),
    getJSON(`/cars/v2/${pick.id}/tariff-packages`),
    getJSON(`/discounts/v2/car-prices?carId=${pick.id}`).catch(() => [])
  ]);
  const finals = new Map((prices || []).map(p => [p.carTariffPackageId, p.finalPrice]));
  const packs = (packages || []).filter(p => p.price > 0).map(p => ({
    label: `${unitName(p.unitCount, p.timeUnit)} - ${formatPrice(p.includedDistance)} km`,
    original: Number(p.price), final: Number(finals.get(p.id) ?? p.price), extras: p.extras || [], insurances: p.insurances || []
  }));
  if (!packs.length) throw new Error('No packages');
  const insurance = [...packs[0].insurances].sort((a, b) => a.price - b.price)[0];
  const extra = [...packs[0].extras].sort((a, b) => a.distance - b.distance)[0];
  const models = data.models || [];
  const modelPrice = name => {
    const m = models.find(model => `${model.brandName} ${model.modelName}` === name);
    if (!m) return null;
    return m.discountedPrice != null && Number(m.discountedPrice) < Number(m.originalPrice) ? Number(m.discountedPrice) : Number(m.price);
  };
  const seen = new Set(), list = [];
  for (const c of withPhoto) {
    const name = `${c.brandName} ${c.modelName}`;
    if (seen.has(name)) continue;
    seen.add(name);
    list.push({ name, year: c.manufactureYear, body: c.bodyTypeName, seats: c.seats, price: modelPrice(name) ?? c.price, image: image(c.carImageMediaId) });
  }
  return {
    car: {
      name: `${car.brand?.name ?? pick.brandName} ${car.model?.name ?? pick.modelName}`.trim(), year: car.manufactureYear ?? pick.manufactureYear,
      body: car.model?.bodyType?.name ?? pick.bodyTypeName, seats: car.model?.seats ?? pick.seats, maxSpeed: car.maxSpeed,
      transmission: car.transmission, fuel: car.fuelType?.name, fuelLevel: car.fuelLevel, image: image(pick.carImageMediaId)
    },
    zones: (services?.parkingZones || []).map(z => z.name).filter(Boolean),
    stations: (services?.gasStations || []).map(s => String(s.name).toUpperCase()).filter(Boolean),
    insurance: insurance ? { name: insurance.name, price: Number(insurance.price) } : FALLBACK.insurance,
    packages: packs,
    extra: extra ? { distance: extra.distance, price: extra.price } : FALLBACK.extra,
    adminFee: Number(car.tripFee?.price) || 0,
    currency: packages[0]?.currency || 'AED',
    list: list.length ? list : FALLBACK.list,
    bodies: [...new Set(models.map(m => m.bodyTypeName).filter(Boolean))]
  };
}

// ---- Mounting ------------------------------------------------------------------------------
const hosts = [...document.querySelectorAll('[data-screen]')];
const scaler = new ResizeObserver(entries => entries.forEach(entry => entry.target.style.setProperty('--s', entry.contentRect.width / 390)));

function render(d) {
  hosts.forEach(host => {
    const draw = screens[host.dataset.screen];
    if (!draw) return;
    let canvas = host.querySelector('.as-canvas');
    if (!canvas) { canvas = document.createElement('div'); canvas.className = `as-canvas as-screen-${host.dataset.screen}`; host.append(canvas); scaler.observe(host); }
    canvas.innerHTML = draw(d);
  });
}

function merge(d) {
  // Keep the built-in values for anything the API did not send, so a screen never shows a blank.
  return { ...FALLBACK, ...d, car: { ...FALLBACK.car, ...Object.fromEntries(Object.entries(d.car).filter(([, v]) => v != null && v !== '')) },
    zones: d.zones.length ? d.zones : FALLBACK.zones, stations: d.stations.length ? d.stations : FALLBACK.stations, bodies: d.bodies.length ? d.bodies : FALLBACK.bodies };
}

if (hosts.length) {
  render(FALLBACK);
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    live().then(d => render(merge(d))).catch(error => console.info('App screens: showing built-in data.', error.message));
  };
  // Live data is fetched once the first screen comes near, not with the first paint.
  const near = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { near.disconnect(); start(); } }, { rootMargin: '600px 0px' });
  hosts.forEach(host => near.observe(host));
}
