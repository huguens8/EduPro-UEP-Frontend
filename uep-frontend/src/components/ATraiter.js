import React from 'react';
import { Link } from 'react-router-dom';
import { joursDepuis, plural } from './dashboardFormat';
import './DashboardBlocks.css';

// Ce que chaque rôle doit faire, par statut (mêmes règles que ProjetService : soumettre, valider,
// corriger, transmettre au MPCE). Le porteur ne voit que les FIOP qu'il a créés.
const ACTIONS_PAR_ROLE = {
  Porteur_PROJET: {
    BROUILLON: 'Brouillon à compléter et soumettre',
    REJETE_UEP: 'Retourné par l’UEP : à corriger',
  },
  SUPERVISEUR_UEP: {
    SOUMIS_SUPERVISEUR_UEP: 'À valider',
    VALIDE_ACTIF: 'Projet traité : à transmettre au MPCE',
  },
};

const MAX_VISIBLE = 6;

export function hasATraiter(role) {
  return Boolean(ACTIONS_PAR_ROLE[role]);
}

function depuis(jours) {
  if (jours === null) return '';
  if (jours === 0) return 'aujourd’hui';
  return `depuis ${jours} ${plural(jours, 'jour')}`;
}

/** File d'attente personnelle : les FIOP sur lesquels l'utilisateur connecté doit agir, les plus anciens d'abord. */
export default function ATraiter({ projets, role }) {
  const actions = ACTIONS_PAR_ROLE[role];
  const items = projets
    .filter((p) => actions[p.statut] && (role !== 'Porteur_PROJET' || p.mien))
    .sort((a, b) => new Date(a.dateModification) - new Date(b.dateModification));

  return (
    <section className="dash-card">
      <div className="dash-card-header">
        <div>
          <h2>À traiter</h2>
          <p className="dash-subtitle">FIOP qui attendent une action de votre part, tous exercices confondus</p>
        </div>
        <span className={`todo-count${items.length === 0 ? ' is-zero' : ''}`}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="dash-empty todo-done"><span aria-hidden="true">✓</span> Rien en attente. Tout est à jour.</p>
      ) : (
        <ul className="todo-list">
          {items.slice(0, MAX_VISIBLE).map((p) => (
            <li key={p.id}>
              <Link to={`/fiop/${p.id}`} className="todo-item">
                <span className="todo-title">{p.titre}</span>
                <span className="todo-meta">
                  <span className="todo-action">{actions[p.statut]}</span>
                  <span>{p.codeProjet} · {depuis(joursDepuis(p.dateModification))}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {items.length > MAX_VISIBLE && (
        <Link to="/fiop" className="todo-more">Voir les {items.length} FIOP dans l'onglet FIOP</Link>
      )}
    </section>
  );
}
