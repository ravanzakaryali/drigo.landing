// One shared request for /api/landing (car models with their from-prices, and a few available cars).
import { API } from './api.js?v=2';

let request;
export function landing() {
  request ??= fetch(`${API}/landing`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
    .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); });
  return request;
}

export async function getJSON(path) {
  const response = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Backend sends decimals (186.25, 159.20): whole prices lose the ".00", others keep two decimals.
export function formatPrice(value) {
  const num = Number(value);
  const decimals = Number.isInteger(num) ? 0 : 2;
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
