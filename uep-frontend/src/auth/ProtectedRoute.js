import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { auth, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  // Mot de passe temporaire : aucune autre page tant qu'il n'est pas changé
  // (le backend refuse de toute façon les autres appels).
  if (auth.mustChangePassword) {
    return <Navigate to="/changer-mot-de-passe" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
