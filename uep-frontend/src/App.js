import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import FiopPage from './pages/FiopPage';
import FiopWorkspacePage from './pages/FiopWorkspacePage';
import PipFormPage from './pages/PipFormPage';
import PipPage from './pages/PipPage';
import PtfPage from './pages/PtfPage';
import PtfFormPage from './pages/PtfFormPage';
import RapportsPage from './pages/RapportsPage';
import './App.css';

// Le MPCE, externe au MENFP, n'a pas accès à la plateforme : il reçoit le canevas FIOP par e-mail (UC-B8).
const FIOP_ROLES = ['Porteur_PROJET', 'SUPERVISEUR_UEP'];
// UC-F3 : le Superviseur UEP génère tous les rapports ; le porteur, la fiche de ses propres projets.
const RAPPORT_ROLES = ['Porteur_PROJET', 'SUPERVISEUR_UEP'];
// UC-C1 à UC-C3 : le PIP est créé, mis à jour et supprimé par le Superviseur UEP.
const PIP_ROLES = ['SUPERVISEUR_UEP'];

function HomeRedirect() {
  const { auth, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/tableau-de-bord" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/changer-mot-de-passe" element={<ChangePasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/tableau-de-bord" element={<DashboardPage />} />
              <Route element={<ProtectedRoute allowedRoles={['ADMINISTRATEUR']} />}>
                <Route path="/admin/comptes" element={<AdminUsersPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={FIOP_ROLES} />}>
                <Route path="/fiop" element={<FiopPage />} />
                <Route path="/fiop/:id" element={<FiopWorkspacePage />} />
                <Route path="/partenaires" element={<PtfPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={PIP_ROLES} />}>
                <Route path="/pip" element={<PipPage />} />
                <Route path="/pip/nouveau" element={<PipFormPage />} />
                <Route path="/pip/:id/modifier" element={<PipFormPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['Porteur_PROJET']} />}>
                <Route path="/partenaires/nouveau" element={<PtfFormPage />} />
                <Route path="/partenaires/:id/modifier" element={<PtfFormPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={RAPPORT_ROLES} />}>
                <Route path="/rapports" element={<RapportsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
