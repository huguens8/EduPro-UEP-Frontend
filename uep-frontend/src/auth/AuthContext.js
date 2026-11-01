import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiClient from '../api/client';
import STORAGE_KEYS from './storageKeys';
import { getRefreshPromise, setAccessToken, setRefreshPromise } from './tokenHolder';

const AuthContext = createContext(null);

// mustChangePassword : compte créé par l'administrateur, mot de passe temporaire
// pas encore remplacé ; l'application ne donne alors accès qu'au changement de mot de passe.
function toAuth(data) {
  return {
    username: data.username,
    role: data.role,
    roleLibelle: data.roleLibelle,
    mustChangePassword: Boolean(data.mustChangePassword),
  };
}

function persistIdentity(data) {
  localStorage.setItem(STORAGE_KEYS.username, data.username);
  localStorage.setItem(STORAGE_KEYS.role, data.role);
  localStorage.setItem(STORAGE_KEYS.roleLibelle, data.roleLibelle);
}

function clearStoredIdentity() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au chargement de l'app, on tente de restaurer la session via le cookie
  // httpOnly (refresh silencieux) plutôt que de relire un token en localStorage.
  // Le refresh token est à usage unique (rotation côté serveur) : en React.StrictMode,
  // cet effet est invoqué deux fois au montage initial, donc on déduplique l'appel via
  // le même mécanisme que l'intercepteur (tokenHolder), sinon le second appel utilise
  // un cookie déjà consommé par le premier et échoue, déconnectant l'utilisateur.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let refreshPromise = getRefreshPromise();
        if (!refreshPromise) {
          refreshPromise = apiClient.post('/auth/refresh').finally(() => setRefreshPromise(null));
          setRefreshPromise(refreshPromise);
        }
        const { data } = await refreshPromise;
        if (cancelled) return;
        setAccessToken(data.token);
        persistIdentity(data);
        setAuth(toAuth(data));
      } catch {
        if (cancelled) return;
        setAccessToken(null);
        clearStoredIdentity();
        setAuth(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setAccessToken(data.token);
    persistIdentity(data);
    setAuth(toAuth(data));
    return data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    setAccessToken(data.token);
    persistIdentity(data);
    setAuth(toAuth(data));
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // best-effort : on nettoie la session locale même si l'appel échoue.
    }
    setAccessToken(null);
    clearStoredIdentity();
    setAuth(null);
    // Rechargement complet sur /login : aucune page ni donnée du compte
    // précédent (ex. le FIOP consulté) ne survit au changement de compte.
    window.location.replace('/login');
  }, []);

  return (
    <AuthContext.Provider value={{ auth, loading, login, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}
