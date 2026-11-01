import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import ATraiter, { hasATraiter } from '../components/ATraiter';
import DashboardKpis from '../components/DashboardKpis';
import ExecutionProjets from '../components/ExecutionProjets';
import ProjetsParDepartementDonut from '../components/ProjetsParDepartementDonut';
import { ALL_STATUTS, DEFAULT_STATUT, TRAITES } from '../components/dashboardStatut';
import { STATUT_META } from './fiopShared';
import './DashboardPage.css';

const WELCOME_BY_ROLE = {
  ADMINISTRATEUR: "Gérez les comptes des agents du MENFP depuis l'onglet Comptes.",
  Porteur_PROJET: 'Créez vos FIOP, soumettez-les pour validation et corrigez ceux qui vous ont été renvoyés depuis l\'onglet FIOP.',
  SUPERVISEUR_UEP: "Validez les FIOP soumis par les porteurs de projet, puis transmettez par e-mail le canevas FIOP des projets traités au bureau du MPCE depuis l'onglet FIOP.",
  VISITEUR: 'Consultez les indicateurs agrégés des projets ci-dessous (accès en lecture seule).',
};

const TOUS_EXERCICES = 'TOUS';

/** Exercice budgétaire en cours (1er octobre → 30 septembre), au format des libellés « 2026-2027 ». */
function libelleExerciceCourant() {
  const now = new Date();
  const debut = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

export default function DashboardPage() {
  const { auth } = useAuth();
  // Filtre global : tous les blocs (sauf « À traiter ») ne montrent que les projets de cet exercice.
  const [exercices, setExercices] = useState([]);
  const [exercice, setExercice] = useState(TOUS_EXERCICES);
  // Filtre de statut propre à la section "Répartition".
  const [statut, setStatut] = useState(DEFAULT_STATUT);
  const [projets, setProjets] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/dashboard/projets')
      .then(({ data }) => setProjets(data))
      .catch(() => setError('Impossible de charger les indicateurs du portefeuille.'));
    apiClient.get('/reference/exercices')
      .then(({ data }) => {
        setExercices(data);
        const courant = data.find((e) => e.libelle === libelleExerciceCourant());
        if (courant) setExercice(String(courant.id));
      })
      .catch(() => setExercices([]));
  }, []);

  const idExercice = exercice === TOUS_EXERCICES ? null : Number(exercice);
  const libelleExercice = exercices.find((e) => e.id === idExercice)?.libelle;
  const projetsExercice = useMemo(
    () => (projets && idExercice !== null ? projets.filter((p) => (p.exercices || []).includes(idExercice)) : projets),
    [projets, idExercice],
  );

  const showTodo = hasATraiter(auth.role);

  return (
    <div className="dashboard-content">
      <p className="home-welcome">
        Bienvenue, <strong>{auth.username}</strong> · {auth.roleLibelle}
      </p>
      <div className="welcome-card">
        <div>
          <h2>EduPro-UEP</h2>
          <p>{WELCOME_BY_ROLE[auth.role] || "Aucune fonctionnalité n'est encore associée à ce rôle."}</p>
        </div>
        <label className="dashboard-filter dashboard-exercice">
          <span>Exercice budgétaire</span>
          <select value={exercice} onChange={(e) => setExercice(e.target.value)}>
            <option value={TOUS_EXERCICES}>Tous les exercices</option>
            {exercices.map((e) => (
              <option key={e.id} value={e.id}>{e.libelle}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="dashboard-section-title">
        <h2>{libelleExercice ? `Exercice ${libelleExercice}` : 'Tous les exercices'}</h2>
        <p>
          {libelleExercice
            ? 'Projets créés dans l’exercice ou ayant une tranche annuelle, un bilan ou une inscription au PIP pour cet exercice'
            : 'Ensemble du portefeuille, tous exercices confondus'}
        </p>
      </div>

      {error && <div className="dash-error dashboard-error">{error}</div>}
      {!error && projets === null && <p className="dashboard-loading">Chargement des indicateurs...</p>}
      {projetsExercice !== null && (
        <>
          <DashboardKpis projets={projetsExercice} />
          {showTodo && <ATraiter projets={projets} role={auth.role} />}
        </>
      )}

      <div className="dashboard-filters">
        <div>
          <h2>Répartition des projets</h2>
          <p>Projets par département{libelleExercice ? ` · exercice ${libelleExercice}` : ''}</p>
        </div>
        <label className="dashboard-filter">
          <span>Statut</span>
          <select value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value={TRAITES}>Projets traités (validés ou transmis)</option>
            <option value={ALL_STATUTS}>Tous les statuts</option>
            {Object.entries(STATUT_META).map(([value, meta]) => (
              <option key={value} value={value}>{meta.label}</option>
            ))}
          </select>
        </label>
      </div>
      <ProjetsParDepartementDonut projets={projetsExercice} statut={statut} />

      <div className="dashboard-filters">
        <div>
          <h2>Suivi de l'exécution</h2>
          <p>Prévu, dépensé et avancement physique{libelleExercice ? ` · exercice ${libelleExercice}` : ' par exercice'}</p>
        </div>
      </div>
      <ExecutionProjets idExercice={idExercice} />
    </div>
  );
}
