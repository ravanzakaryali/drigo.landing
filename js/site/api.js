// Local previews talk to a local API on 8089; everything else uses production.
export const API = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://127.0.0.1:8089/api'
  : 'https://api.drigo.com/api';
