import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import './NotificationBell.css';

const POLL_MS = 60000;
// Le rappel "vous avez N notifications" ne s'affiche qu'une fois par session de navigateur.
const RAPPEL_KEY = 'edupro.notifications.rappel';

const TYPE_META = {
  SOUMIS: { icon: '↗', label: 'Soumis', cls: 'is-soumis' },
  RETOURNE: { icon: '↩', label: 'Retourné', cls: 'is-retourne' },
  ACTIF: { icon: '✓', label: 'Actif', cls: 'is-actif' },
};

function ilYa(isoDate) {
  const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 7) return `il y a ${jours} j`;
  return new Date(isoDate).toLocaleDateString('fr-FR');
}

function lireRappel() {
  try {
    return sessionStorage.getItem(RAPPEL_KEY) === '1';
  } catch {
    return false;
  }
}

/** À la déconnexion : le rappel réapparaîtra à la prochaine connexion. */
export function resetNotificationRappel() {
  try {
    sessionStorage.removeItem(RAPPEL_KEY);
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}

function noterRappel() {
  try {
    sessionStorage.setItem(RAPPEL_KEY, '1');
  } catch {
    // Stockage indisponible : le rappel pourra réapparaître, sans gravité.
  }
}

/** Cloche de l'en-tête : notifications du circuit de validation des FIOP. */
export default function NotificationBell({ canOpenFiop }) {
  const navigate = useNavigate();
  const [data, setData] = useState({ nonLues: 0, notifications: [] });
  const [open, setOpen] = useState(false);
  const [rappel, setRappel] = useState(false);
  const rootRef = useRef(null);

  const charger = useCallback(() => {
    apiClient.get('/notifications')
      .then(({ data: d }) => {
        setData(d);
        if (d.nonLues > 0 && !lireRappel()) {
          setRappel(true);
          noterRappel();
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    charger();
    const timer = setInterval(charger, POLL_MS);
    window.addEventListener('focus', charger);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', charger);
    };
  }, [charger]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setRappel(false);
    setOpen((v) => !v);
    if (!open) charger();
  };

  const ouvrir = (n) => {
    if (!n.lue) {
      apiClient.post(`/notifications/${n.id}/lue`).then(charger).catch(() => {});
    }
    setOpen(false);
    if (canOpenFiop) navigate(`/fiop/${n.idProjet}`);
  };

  const toutLire = () => {
    apiClient.post('/notifications/lues').then(charger).catch(() => {});
  };

  const { nonLues, notifications } = data;

  return (
    <div className="notif" ref={rootRef}>
      <button
        type="button"
        className="notif-btn"
        onClick={toggle}
        aria-expanded={open}
        aria-label={nonLues > 0 ? `Notifications : ${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Notifications'}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.4A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6Zm0 18a2.5 2.5 0 0 0 2.4-2h-4.8a2.5 2.5 0 0 0 2.4 2Z"
            fill="currentColor"
          />
        </svg>
        {nonLues > 0 && <span className="notif-badge">{nonLues > 99 ? '99+' : nonLues}</span>}
      </button>

      {rappel && !open && (
        <button type="button" className="notif-rappel" onClick={toggle}>
          Vous avez {nonLues} notification{nonLues > 1 ? 's' : ''} non lue{nonLues > 1 ? 's' : ''}.
          <span>Voir</span>
        </button>
      )}

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel-header">
            <strong>Notifications</strong>
            {nonLues > 0 && (
              <button type="button" className="notif-link" onClick={toutLire}>Tout marquer comme lu</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="notif-empty">Aucune notification pour le moment.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => {
                const meta = TYPE_META[n.type] || TYPE_META.SOUMIS;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`notif-item${n.traitee ? ' is-traitee' : n.lue ? '' : ' is-unread'}`}
                      onClick={() => ouvrir(n)}
                    >
                      <span className={`notif-icon ${meta.cls}`} aria-hidden="true">{meta.icon}</span>
                      <span className="notif-body">
                        <span className="notif-message">{n.message}</span>
                        <span className="notif-meta">
                          {meta.label} · {ilYa(n.dateCreation)}
                          {n.traitee && <span className="notif-traitee"> · Traité</span>}
                        </span>
                      </span>
                      {!n.lue && <span className="notif-dot" aria-label="non lue" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
