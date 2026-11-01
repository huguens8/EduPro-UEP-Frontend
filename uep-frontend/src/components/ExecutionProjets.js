import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { STATUT_META, formatMontant } from '../pages/fiopShared';
import { compact, percent, plural } from './dashboardFormat';
import './DashboardBlocks.css';

// Un projet est "en retard" quand son avancement physique est inférieur de plus de
// RETARD_SEUIL points à la part de sa durée déjà écoulée.
const RETARD_SEUIL = 10;

function taux(depenses, prevision) {
  return prevision > 0 ? (depenses / prevision) * 100 : null;
}

function enRetard(p) {
  return p.avancementPhysique !== null && p.tempsConsomme !== null
    && Number(p.avancementPhysique) < Number(p.tempsConsomme) - RETARD_SEUIL;
}

/**
 * Exécution financière (tranche §44 vs bilan §41) et physique des projets, pour un exercice.
 * Avec {@code exerciceImpose} (filtre global du tableau de bord), le sélecteur interne est masqué ;
 * sans lui (« Tous les exercices »), l'exécution se lit exercice par exercice via ce sélecteur.
 */
export default function ExecutionProjets({ idExercice: exerciceImpose = null }) {
  const [exerciceChoisi, setExerciceChoisi] = useState(null);
  const idExercice = exerciceImpose ?? exerciceChoisi;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setError('');
    setData(null);
    apiClient.get('/dashboard/execution', { params: idExercice ? { idExercice } : {} })
      .then(({ data: d }) => setData(d))
      .catch(() => setError('Impossible de charger l’exécution des projets.'));
  }, [idExercice]);

  const projets = (data?.projets || []).map((p) => ({
    ...p,
    prevision: p.prevision === null ? null : Number(p.prevision),
    depenses: Number(p.depenses || 0),
  }));
  const totalPrevision = projets.reduce((sum, p) => sum + (p.prevision || 0), 0);
  const totalDepenses = projets.reduce((sum, p) => sum + p.depenses, 0);
  const avancements = projets.filter((p) => p.avancementPhysique !== null).map((p) => Number(p.avancementPhysique));
  const avancementMoyen = avancements.length ? avancements.reduce((a, b) => a + b, 0) / avancements.length : null;
  const retards = projets.filter(enRetard);
  const max = Math.max(0, ...projets.map((p) => Math.max(p.prevision || 0, p.depenses)));
  const hoveredProjet = projets.find((p) => p.id === hovered);

  const handleMove = (event) => {
    const box = event.currentTarget.closest('.exec-plot').getBoundingClientRect();
    setTooltipPos({ x: event.clientX - box.left, y: event.clientY - box.top });
  };

  return (
    <section className="dash-card">
      <div className="dash-card-header">
        <div>
          <h2>Exécution des projets</h2>
          <p className="dash-subtitle">D'après les bilans d'exécution saisis pour l'exercice</p>
        </div>
        {exerciceImpose === null && data?.exercices?.length > 0 && (
          <label className="dashboard-filter">
            <span>Exercice</span>
            <select value={data.idExercice ?? ''} onChange={(e) => setExerciceChoisi(Number(e.target.value))}>
              {data.exercices.map((e) => (
                <option key={e.id} value={e.id}>{e.libelle}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <div className="dash-error">{error}</div>}
      {!error && data === null && <p className="dash-empty">Chargement...</p>}
      {!error && data !== null && projets.length === 0 && (
        <p className="dash-empty">
          {exerciceImpose === null
            ? "Aucun bilan d'exécution n'a encore été saisi."
            : "Aucun bilan d'exécution n'a été saisi pour cet exercice."}
        </p>
      )}

      {projets.length > 0 && (
        <>
          <div className="exec-kpis">
            <div className="exec-kpi" title={`${formatMontant(totalPrevision)} HTG`}>
              <span className="kpi-label">Prévu (tranches)</span>
              <span className="exec-kpi-value">{compact(totalPrevision)} <small>HTG</small></span>
            </div>
            <div className="exec-kpi" title={`${formatMontant(totalDepenses)} HTG`}>
              <span className="kpi-label">Dépensé (bilans)</span>
              <span className="exec-kpi-value">{compact(totalDepenses)} <small>HTG</small></span>
            </div>
            <div className="exec-kpi">
              <span className="kpi-label">Taux d'exécution financière</span>
              <span className="exec-kpi-value">{percent(taux(totalDepenses, totalPrevision))}</span>
            </div>
            <div className="exec-kpi">
              <span className="kpi-label">Avancement physique moyen</span>
              <span className="exec-kpi-value">{percent(avancementMoyen)}</span>
            </div>
            <div className="exec-kpi">
              <span className="kpi-label">Projets en retard</span>
              <span className="exec-kpi-value">
                {retards.length}
                <small> / {projets.length}</small>
              </span>
            </div>
          </div>

          <ul className="exec-legend">
            <li><span className="dash-swatch exec-swatch-prevu" />Prévu pour l'exercice</li>
            <li><span className="dash-swatch exec-swatch-depense" />Dépensé</li>
          </ul>

          <div className="exec-plot" role="list">
            {projets.map((p) => {
              const t = taux(p.depenses, p.prevision);
              const retard = enRetard(p);
              return (
                <div
                  key={p.id}
                  role="listitem"
                  className={`exec-row${hovered && hovered !== p.id ? ' is-dimmed' : ''}`}
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseMove={handleMove}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="exec-head">
                    <span className="exec-title">{p.titre}</span>
                    <span className="exec-taux">{t === null ? 'prévision non saisie' : `${percent(t)} exécuté`}</span>
                  </div>
                  <span className="exec-track">
                    {p.prevision !== null && (
                      <span className="exec-prevu" style={{ width: `${(p.prevision / max) * 100}%` }} />
                    )}
                    <span className="exec-depense" style={{ width: `${max > 0 ? (p.depenses / max) * 100 : 0}%` }} />
                  </span>
                  <div className="exec-foot">
                    <span>Avancement physique {percent(p.avancementPhysique)}</span>
                    <span>Temps écoulé {percent(p.tempsConsomme)}</span>
                    {retard && <span className="exec-badge is-retard"><span aria-hidden="true">⚠</span> En retard</span>}
                    {t !== null && t > 100 && (
                      <span className="exec-badge is-depassement"><span aria-hidden="true">▲</span> Dépassement</span>
                    )}
                  </div>
                </div>
              );
            })}
            {hoveredProjet && (
              <div className="dash-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                <div className="dash-tooltip-title">{hoveredProjet.titre}</div>
                <div className="dash-tooltip-value">
                  Prévu : {hoveredProjet.prevision === null ? 'non saisi' : `${formatMontant(hoveredProjet.prevision)} HTG`}
                </div>
                <div className="dash-tooltip-value">Dépensé : {formatMontant(hoveredProjet.depenses)} HTG</div>
                <div className="dash-tooltip-detail">{STATUT_META[hoveredProjet.statut]?.label}</div>
              </div>
            )}
          </div>
          <p className="dash-note">
            En retard : avancement physique inférieur de plus de {RETARD_SEUIL} points au temps écoulé.{' '}
            {projets.length} {plural(projets.length, 'projet')} avec un bilan pour cet exercice.
          </p>
        </>
      )}
    </section>
  );
}
