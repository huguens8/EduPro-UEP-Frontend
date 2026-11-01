import React from 'react';
import { Link } from 'react-router-dom';
import { percent } from './dashboardFormat';
import './DashboardBlocks.css';

// Étapes du cycle de vie du FIOP, dans l'ordre du circuit (voir StatutFiop.java).
const ETAPES = [
  { statut: 'BROUILLON', label: 'Brouillon', detail: 'chez le porteur' },
  { statut: 'SOUMIS_SUPERVISEUR_UEP', label: 'Soumis à l’UEP', detail: 'en attente de validation' },
  { statut: 'VALIDE_ACTIF', label: 'Validé (UEP) — traité', detail: 'à transmettre au MPCE et à inscrire au PIP' },
  { statut: 'TRANSMIS_MPCE', label: 'Transmis au MPCE', detail: 'canevas FIOP envoyé par e-mail' },
];
const RETOURS = [
  { statut: 'REJETE_UEP', label: 'Retourné par l’UEP', detail: 'à corriger par le porteur' },
];

// Rôles qui ont accès à la page /fiop (voir FIOP_ROLES dans App.js).
const FIOP_ROLES = ['Porteur_PROJET', 'SUPERVISEUR_UEP'];

function Ligne({ etape, nombre, max, total, retour, cliquable }) {
  const className = `circuit-row${retour ? ' is-retour' : ''}`;
  const contenu = (
    <>
      <span className="circuit-label">
        {retour && <span className="circuit-icon" aria-hidden="true">↩</span>}
        <span>
          {etape.label}
          <small>{etape.detail}</small>
        </span>
      </span>
      <span className="circuit-track">
        <span className="circuit-bar" style={{ width: `${max > 0 ? (nombre / max) * 100 : 0}%` }} />
      </span>
      <span className="circuit-value">
        {nombre}
        <small>{total > 0 ? percent((nombre / total) * 100) : '—'}</small>
      </span>
    </>
  );
  return (
    <li>
      {cliquable ? (
        <Link to={`/fiop?statut=${etape.statut}`} className={`${className} is-link`} title={`Voir les FIOP « ${etape.label} »`}>
          {contenu}
        </Link>
      ) : (
        <div className={className}>{contenu}</div>
      )}
    </li>
  );
}

/**
 * Nombre de FIOP à chaque étape du circuit Porteur → UEP → transmission au MPCE, retours compris.
 * Pour les rôles qui ont accès à la page FIOP, chaque ligne ouvre la liste filtrée sur ce statut.
 * Le porteur ne compte que ses propres FIOP, comme la liste sur laquelle il arrive.
 */
export default function CircuitValidation({ projets, role }) {
  const porteur = role === 'Porteur_PROJET';
  const cliquable = FIOP_ROLES.includes(role);
  const visibles = porteur ? projets.filter((p) => p.mien) : projets;
  const parStatut = visibles.reduce((acc, p) => ({ ...acc, [p.statut]: (acc[p.statut] || 0) + 1 }), {});
  const total = visibles.length;
  const max = Math.max(0, ...[...ETAPES, ...RETOURS].map((e) => parStatut[e.statut] || 0));

  return (
    <section className="dash-card">
      <h2>Circuit de validation</h2>
      <p className="dash-subtitle">
        {porteur ? 'Nombre de vos FIOP à chaque étape' : 'Nombre de FIOP à chaque étape, tous projets confondus'}
        {cliquable && total > 0 && ' — cliquez sur une étape pour voir la liste'}
      </p>
      {total === 0 ? (
        <p className="dash-empty">{porteur ? 'Vous n’avez encore créé aucun FIOP.' : 'Aucun projet enregistré.'}</p>
      ) : (
        <>
          <ol className="circuit-list">
            {ETAPES.map((e) => (
              <Ligne key={e.statut} etape={e} nombre={parStatut[e.statut] || 0} max={max} total={total} cliquable={cliquable} />
            ))}
          </ol>
          <p className="circuit-group">Retours pour correction</p>
          <ul className="circuit-list">
            {RETOURS.map((e) => (
              <Ligne key={e.statut} etape={e} nombre={parStatut[e.statut] || 0} max={max} total={total} retour cliquable={cliquable} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
