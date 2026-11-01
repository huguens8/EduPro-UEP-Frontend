import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { SOURCES_FINANCEMENT_META, formatMontant, matchSourceMeta } from '../pages/fiopShared';
import { matchesStatut, statutPhrase } from './dashboardStatut';
import { compact, percent, plural } from './dashboardFormat';
import './DashboardBlocks.css';

// Un groupe = une couleur (ordre catégoriel fixe), comme dans le tableau §29 du canevas.
const GROUPES = [
  { key: 'Ressources Nationales', label: 'Ressources nationales', color: '#2a78d6' },
  { key: 'Ressources Externes', label: 'Ressources externes', color: '#eb6834' },
  { key: 'Autres sources', label: 'Autres sources', color: '#1baf7a' },
];

function groupeDe(libelle) {
  return matchSourceMeta(libelle)?.groupe || 'Autres sources';
}

function rang(libelle) {
  const idx = SOURCES_FINANCEMENT_META.indexOf(matchSourceMeta(libelle));
  return idx === -1 ? SOURCES_FINANCEMENT_META.length : idx;
}

/** Montants prévus (§29) par source de financement, regroupés en ressources nationales / externes. */
export default function FinancementParSource({ statut }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    apiClient.get('/dashboard/financement-par-source')
      .then(({ data }) => setRows(data))
      .catch(() => setError('Impossible de charger le financement par source.'));
  }, []);

  const { sources, groupes, total } = useMemo(() => {
    const bySource = new Map();
    (rows || []).filter((r) => matchesStatut(r, statut)).forEach((r) => {
      const s = bySource.get(r.idSource) || { idSource: r.idSource, libelle: r.libelle, montant: 0, nombreProjets: 0 };
      s.montant += Number(r.montant);
      s.nombreProjets += r.nombreProjets;
      bySource.set(r.idSource, s);
    });
    const list = [...bySource.values()]
      .map((s) => ({ ...s, groupe: groupeDe(s.libelle) }))
      .sort((a, b) => rang(a.libelle) - rang(b.libelle) || a.libelle.localeCompare(b.libelle));
    const sum = list.reduce((acc, s) => acc + s.montant, 0);
    const parGroupe = GROUPES
      .map((g) => ({ ...g, montant: list.filter((s) => s.groupe === g.key).reduce((acc, s) => acc + s.montant, 0) }))
      .filter((g) => g.montant > 0);
    return { sources: list, groupes: parGroupe, total: sum };
  }, [rows, statut]);

  const max = Math.max(0, ...sources.map((s) => s.montant));
  const colorOf = (groupe) => GROUPES.find((g) => g.key === groupe).color;
  const hoveredSource = sources.find((s) => s.idSource === hovered);

  const handleMove = (event) => {
    const box = event.currentTarget.closest('.fin-plot').getBoundingClientRect();
    setTooltipPos({ x: event.clientX - box.left, y: event.clientY - box.top });
  };

  return (
    <section className="dash-card">
      <div className="dash-card-header">
        <div>
          <h2>Financement prévu par source</h2>
          <p className="dash-subtitle">En gourdes (HTG) · plan de financement des FIOP au {statutPhrase(statut)}</p>
        </div>
        {total > 0 && (
          <div className="dash-sum" title={`${formatMontant(total)} HTG`}>
            <span className="dash-sum-value">{compact(total)} HTG</span>
            <span className="dash-sum-label">prévus au total</span>
          </div>
        )}
      </div>

      {error && <div className="dash-error">{error}</div>}
      {!error && rows === null && <p className="dash-empty">Chargement...</p>}
      {!error && rows !== null && total === 0 && (
        <p className="dash-empty">Aucun financement prévu pour ce statut.</p>
      )}

      {total > 0 && (
        <>
          <div className="fin-split" role="img"
            aria-label={groupes.map((g) => `${g.label} : ${percent((g.montant / total) * 100)}`).join(', ')}>
            {groupes.map((g) => (
              <span key={g.key} className="fin-split-seg" style={{ flexGrow: g.montant, background: g.color }} />
            ))}
          </div>
          <ul className="fin-legend">
            {groupes.map((g) => (
              <li key={g.key}>
                <span className="dash-swatch" style={{ background: g.color }} />
                {g.label}
                <strong>{percent((g.montant / total) * 100)}</strong>
                <span className="fin-legend-amount">{compact(g.montant)} HTG</span>
              </li>
            ))}
          </ul>

          <div className="fin-plot" role="list">
            {sources.map((s) => (
              <div
                key={s.idSource}
                role="listitem"
                className={`fin-row${hovered && hovered !== s.idSource ? ' is-dimmed' : ''}`}
                onMouseEnter={() => setHovered(s.idSource)}
                onMouseMove={handleMove}
                onMouseLeave={() => setHovered(null)}
                aria-label={`${s.libelle} : ${formatMontant(s.montant)} gourdes`}
              >
                <span className="fin-label">{s.libelle}</span>
                <span className="fin-track">
                  <span className="fin-bar" style={{ width: `${(s.montant / max) * 100}%`, background: colorOf(s.groupe) }} />
                </span>
                <span className="fin-value">{compact(s.montant)}</span>
              </div>
            ))}
            {hoveredSource && (
              <div className="dash-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                <div className="dash-tooltip-title">
                  <span className="dash-swatch" style={{ background: colorOf(hoveredSource.groupe) }} />
                  {hoveredSource.libelle}
                </div>
                <div className="dash-tooltip-value">{formatMontant(hoveredSource.montant)} HTG</div>
                <div className="dash-tooltip-detail">
                  {percent((hoveredSource.montant / total) * 100)} du total · {hoveredSource.nombreProjets}{' '}
                  {plural(hoveredSource.nombreProjets, 'projet')}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
