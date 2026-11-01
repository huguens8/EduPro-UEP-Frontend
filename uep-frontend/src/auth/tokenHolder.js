// Garde l'access token en mémoire uniquement (jamais localStorage, pour limiter
// l'exposition en cas de XSS). Module partagé entre client.js et AuthContext.js
// pour éviter un import circulaire entre les deux.
let accessToken = null;
let refreshPromise = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function getRefreshPromise() {
  return refreshPromise;
}

export function setRefreshPromise(promise) {
  refreshPromise = promise;
}
