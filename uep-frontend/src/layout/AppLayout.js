import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { parseFiopSearchId } from '../pages/fiopShared';
import uepLogo from '../assets/Logo UEP.jpeg';
import NotificationBell, { resetNotificationRappel } from './NotificationBell';
import './AppLayout.css';

const TABS_BY_ROLE = {
  ADMINISTRATEUR: [
    { to: '/tableau-de-bord', label: 'Tableau de bord' },
    { to: '/admin/comptes', label: 'Comptes' },
  ],
  Porteur_PROJET: [
    { to: '/tableau-de-bord', label: 'Tableau de bord' },
    { to: '/fiop', label: 'FIOP' },
    { to: '/partenaires', label: 'Partenaires (PTF)' },
    { to: '/rapports', label: 'Rapports' },
  ],
  SUPERVISEUR_UEP: [
    { to: '/tableau-de-bord', label: 'Tableau de bord' },
    { to: '/fiop', label: 'FIOP' },
    { to: '/pip', label: 'PIP' },
    { to: '/partenaires', label: 'Partenaires (PTF)' },
    { to: '/rapports', label: 'Rapports' },
  ],
  VISITEUR: [
    { to: '/tableau-de-bord', label: 'Tableau de bord' },
  ],
};

export default function AppLayout() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const tabs = TABS_BY_ROLE[auth.role] || [];
  const hasFiopAccess = tabs.some((tab) => tab.to === '/fiop');

  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState('');

  const handleLogout = () => {
    resetNotificationRappel();
    logout();
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const id = parseFiopSearchId(searchId);
    if (!id) {
      setSearchError('Entrez un identifiant ou un code projet valide (ex. 23 ou FIOP-23).');
      return;
    }
    setSearchError('');
    setSearchId('');
    navigate(`/fiop/${id}?mode=edit`);
  };

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-brand">
          <img src={uepLogo} alt="UEP" className="app-brand-logo" />
          <div>
            <h1>EduPro-UEP</h1>
            <p>Connecté en tant que <strong>{auth.username}</strong> · {auth.roleLibelle}</p>
          </div>
        </div>
        <div className="app-topbar-actions">
          {hasFiopAccess && <NotificationBell canOpenFiop={hasFiopAccess} />}
          <button type="button" className="logout-btn" onClick={handleLogout}>Déconnexion</button>
        </div>
      </header>

      <nav className="app-tabs">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
        {hasFiopAccess && (
          <form className="app-tabs-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="ex. 23 ou FIOP-23"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <button type="submit" className="secondary-btn">Rechercher un FIOP</button>
            {searchError && <span className="app-tabs-search-error">{searchError}</span>}
          </form>
        )}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
