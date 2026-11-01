import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { STATUT_META, formatMontant } from '../pages/fiopShared';
import { matchesStatut, statutPhrase } from './dashboardStatut';
import './MontantsProjetsChart.css';

// Au-delà, la liste est repliée (bouton "Afficher tous les projets").
const COLLAPSED_COUNT = 10;

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

export default function MontantsProjetsChart({ statut }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    apiClient.get('/dashboard/montants-projets')
      .then(({ data }) => setRows(data))
      .catch(() => setError('Impossible de charger les montants des projets.'));
  }, []);

  const { projets, sansMontant, total } = useMemo(() => {
    const filtered = (rows || []).filter((r) => matchesStatut(r, statut));
    const withAmount = filtered
      .filter((r) => r.coutTotalGourde !== null)
      .map((r) => ({ ...r, montant: Number(r.coutTotalGourde) }))
      .sort((a, b) => b.montant - a.montant);
    return {
      projets: withAmount,
      sansMontant: filtered.length - withAmount.length,
      total: withAmount.reduce((sum, p) => sum + p.montant, 0),
    };
  }, [rows, statut]);

  const max = projets.length > 0 ? projets[0].montant : 0;
  const visible = expanded ? projets : projets.slice(0, COLLAPSED_COUNT);
  const hoveredProjet = projets.find((p) => p.id === hovered);

  const handleMove = (event) => {
    const box = event.currentTarget.closest('.bars-plot').getBoundingClientRect();
    setTooltipPos({ x: event.clientX - box.left, y: event.clientY - box.top });
  };

  return (
    <section className="bars-card">
      <div className="bars-header">
        <div>
          <h2>Coût total par projet</h2>
          <p className="bars-subtitle">En gourdes (HTG) · FIOP au {statutPhrase(statut)}</p>
        </div>
        {projets.length > 0 && (
          <div className="bars-sum">
            <span className="bars-sum-value">{formatMontant(total)} HTG</span>
            <span className="bars-sum-label">
              total sur {projets.length} projet{projets.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {error && <div className="bars-error">{error}</div>}
      {!error && rows === null && <p className="bars-empty">Chargement...</p>}
      {!error && rows !== null && projets.length === 0 && (
        <p className="bars-empty">Aucun projet avec un coût renseigné pour ce statut.</p>
      )}

      {projets.length > 0 && (
        <div className="bars-plot" role="list">
          {visible.map((p) => (
            <div
              key={p.id}
              role="listitem"
              className={`bars-row${hovered && hovered !== p.id ? ' is-dimmed' : ''}`}
              onMouseEnter={() => setHovered(p.id)}
              onMouseMove={handleMove}
              onMouseLeave={() => setHovered(null)}
              aria-label={`${p.titre} : ${formatMontant(p.montant)} gourdes`}
            >
              <span className="bars-label">{p.titre}</span>
              <span className="bars-track">
                <span className="bars-bar" style={{ width: `${max > 0 ? (p.montant / max) * 100 : 0}%` }} />
              </span>
              <span className="bars-value">{compact.format(p.montant)}</span>
            </div>
          ))}
          {hoveredProjet && (
            <div className="bars-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
              <div className="bars-tooltip-title">{hoveredProjet.titre}</div>
              <div className="bars-tooltip-value">{formatMontant(hoveredProjet.montant)} HTG</div>
              <div className="bars-tooltip-detail">{STATUT_META[hoveredProjet.statut]?.label}</div>
            </div>
          )}
        </div>
      )}

      {(projets.length > COLLAPSED_COUNT || sansMontant > 0) && (
        <div className="bars-footer">
          {sansMontant > 0 && (
            <span className="bars-note">
              {sansMontant} projet{sansMontant > 1 ? 's' : ''} sans coût renseigné (non affiché{sansMontant > 1 ? 's' : ''})
            </span>
          )}
          {projets.length > COLLAPSED_COUNT && (
            <button type="button" className="bars-toggle" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Réduire' : `Afficher les ${projets.length} projets`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
