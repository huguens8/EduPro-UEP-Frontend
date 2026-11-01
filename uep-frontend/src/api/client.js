import axios from 'axios';
import STORAGE_KEYS from '../auth/storageKeys';
import { getAccessToken, getRefreshPromise, setAccessToken, setRefreshPromise } from '../auth/tokenHolder';
import { installerIndicateurChargement } from './loadingIndicator';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api',
  // Nécessaire pour envoyer/recevoir le cookie httpOnly du refresh token.
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un 401 sur un appel protégé tente un refresh silencieux (le cookie httpOnly
// suffit) puis rejoue la requête une fois. Si le refresh échoue aussi, on
// nettoie la session locale et on renvoie vers le login avec un message clair.
// Les refresh concurrents sont dédupliqués pour éviter de consommer deux fois
// un refresh token à usage unique (rotation côté serveur).
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !isAuthCall && original && !original._retry) {
      original._retry = true;
      try {
        let refreshPromise = getRefreshPromise();
        if (!refreshPromise) {
          refreshPromise = apiClient.post('/auth/refresh').finally(() => setRefreshPromise(null));
          setRefreshPromise(refreshPromise);
        }
        const { data } = await refreshPromise;
        setAccessToken(data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return apiClient(original);
      } catch (refreshError) {
        setAccessToken(null);
        Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=1';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Icône qui tourne sur le bouton cliqué (et en bas à droite) tant que la réponse n'est pas arrivée.
installerIndicateurChargement(apiClient);

export default apiClient;
