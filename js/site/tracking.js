// Meta Pixel + CAPI — app download tracking.
// Every App Store / Google Play click is sent twice with one event id: from the browser (Pixel)
// and from our server (CAPI via /landing/track), so Meta can deduplicate the pair.
import { API } from './api.js?v=1';

function eventId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function cookie(name) {
  const match = document.cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

function fbc() {
  const stored = cookie('_fbc');
  if (stored) return stored;
  const click = location.search.match(/fbclid=([^&]+)/);
  return click ? `fb.1.${Date.now()}.${click[1]}` : null;
}

function sendCapi(eventName, id) {
  try {
    fetch(`${API}/landing/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, eventId: id, sourceUrl: location.href, fbp: cookie('_fbp'), fbc: fbc() }),
      keepalive: true
    }).catch(() => {});
  } catch {}
}

function trackDownload(store) {
  const id = eventId();
  if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_name: store, currency: 'USD', value: 0 }, { eventID: id });
  sendCapi('Lead', id);
}

document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!link) return;
  const href = link.getAttribute('href');
  if (href.includes('apps.apple.com')) trackDownload('App Store');
  else if (href.includes('play.google.com')) trackDownload('Google Play');
});
