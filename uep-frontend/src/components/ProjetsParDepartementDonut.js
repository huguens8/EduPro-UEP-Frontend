import React, { useMemo, useState } from 'react';
import { matchesStatut, statutPhrase } from './dashboardStatut';
import './ProjetsParDepartementDonut.css';

// Palette catégorielle validée (ordre fixe, jamais recyclé).
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const OTHERS_COLOR = '#e87ba4';
// "Non renseigné" n'est pas une catégorie : gris neutre.
const UNKNOWN_COLOR = '#b8b6ae';
// Au-delà de 4 départements nommés, le reste est regroupé dans "Autres" (lisibilité de l'anneau).
const MAX_NAMED = SERIES_COLORS.length;

const SIZE = 200;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2;

/** Somme par département (clé = id, null pour "non renseigné"), triée par nombre décroissant. */
function sumByDepartement(rows) {
  const byDep = new Map();
  rows.forEach((r) => {
    const current = byDep.get(r.idDepartement) || { idDepartement: r.idDepartement, libelle: r.libelle, nombre: 0 };
    current.nombre += r.nombre;
    byDep.set(r.idDepartement, current);
  });
  return [...byDep.values()].sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle));
}

/**
 * Les couleurs sont attribuées une fois pour toutes d'après le classement tous statuts confondus :
 * changer de statut ne repeint donc jamais un département.
 */
function buildSegments(rows, statut) {
  const namedIds = sumByDepartement(rows)
    .filter((d) => d.idDepartement)
    .slice(0, MAX_NAMED)
    .map((d) => d.idDepartement);

  const filtered = rows.filter((r) => matchesStatut(r, statut));
  const totals = sumByDepartement(filtered);

  const segments = [];
  namedIds.forEach((id, i) => {
    const dep = totals.find((d) => d.idDepartement === id);
    if (dep) {
      segments.push({ key: id, label: dep.libelle, nombre: dep.nombre, color: SERIES_COLORS[i] });
    }
  });
  const rest = totals.filter((d) => d.idDepartement && !namedIds.includes(d.idDepartement));
  if (rest.length > 0) {
    segments.push({
      key: 'autres',
      label: `Autres départements (${rest.length})`,
      detail: rest.map((d) => `${d.libelle} : ${d.nombre}`).join(', '),
      nombre: rest.reduce((sum, d) => sum + d.nombre, 0),
      color: OTHERS_COLOR,
    });
  }
  const unknown = totals.find((d) => !d.idDepartement);
  if (unknown) {
    segments.push({ key: 'inconnu', label: 'Département non renseigné', nombre: unknown.nombre, color: UNKNOWN_COLOR });
  }
  return segments;
}

function formatPercent(value, total) {
  return `${Math.round((value / total) * 100)} %`;
}

function plural(n, word) {
  return `${word}${n > 1 ? 's' : ''}`;
}

/** Projets du tableau de bord (déjà filtrés par exercice) → une ligne par projet pour buildSegments. */
function toRows(projets) {
  return projets.map((p) => ({
    idDepartement: p.idDepartement,
    libelle: p.departement || 'Non renseigné',
    statut: p.statut,
    nombre: 1,
  }));
}

export default function ProjetsParDepartementDonut({ projets, statut }) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const rows = useMemo(() => (projets ? toRows(projets) : null), [projets]);

  const segments = useMemo(() => (rows ? buildSegments(rows, statut) : []), [rows, statut]);
  const total = segments.reduce((sum, s) => sum + s.nombre, 0);

  const handleMove = (event) => {
    const box = event.currentTarget.closest('.donut-figure').getBoundingClientRect();
    setTooltipPos({ x: event.clientX - box.left, y: event.clientY - box.top });
  };

  let offset = 0;
  const arcs = segments.map((s) => {
    const length = (s.nombre / total) * CIRCUMFERENCE;
    const visible = segments.length > 1 ? Math.max(length - GAP, 0.5) : length;
    const arc = { ...s, dash: `${visible} ${CIRCUMFERENCE - visible}`, offset: -offset };
    offset += length;
    return arc;
  });
  const hoveredSegment = segments.find((s) => s.key === hovered);
  const statutLabel = statutPhrase(statut);

  return (
    <section className="donut-card">
      <h2>Projets par département</h2>
      <p className="donut-subtitle">FIOP au {statutLabel}</p>

      {rows === null && <p className="donut-empty">Chargement...</p>}
      {rows !== null && total === 0 && (
        <p className="donut-empty">Aucun projet pour ce statut et cet exercice.</p>
      )}

      {total > 0 && (
        <div className="donut-body">
          <div className="donut-figure">
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={`${total} ${plural(total, 'projet')} répartis par département, ${statutLabel}`}
            >
              <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
                {arcs.map((a) => (
                  <circle
                    key={a.key}
                    className={`donut-arc${hovered && hovered !== a.key ? ' is-dimmed' : ''}`}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={STROKE}
                    strokeDasharray={a.dash}
                    strokeDashoffset={a.offset}
                    onMouseEnter={() => setHovered(a.key)}
                    onMouseMove={handleMove}
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}
              </g>
            </svg>
            <div className="donut-center" aria-hidden="true">
              <span className="donut-total">{total}</span>
              <span className="donut-total-label">{plural(total, 'projet')}</span>
            </div>
            {hoveredSegment && (
              <div className="donut-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                <div className="donut-tooltip-title">
                  <span className="donut-swatch" style={{ background: hoveredSegment.color }} />
                  {hoveredSegment.label}
                </div>
                <div className="donut-tooltip-value">
                  {hoveredSegment.nombre} {plural(hoveredSegment.nombre, 'projet')} ·{' '}
                  {formatPercent(hoveredSegment.nombre, total)}
                </div>
                {hoveredSegment.detail && <div className="donut-tooltip-detail">{hoveredSegment.detail}</div>}
              </div>
            )}
          </div>

          <table className="donut-legend">
            <thead>
              <tr>
                <th scope="col">Département</th>
                <th scope="col">Projets</th>
                <th scope="col">Part</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr
                  key={s.key}
                  className={hovered === s.key ? 'is-active' : ''}
                  onMouseEnter={() => setHovered(s.key)}
                  onMouseLeave={() => setHovered(null)}
                  title={s.detail}
                >
                  <td>
                    <span className="donut-swatch" style={{ background: s.color }} />
                    {s.label}
                  </td>
                  <td className="num">{s.nombre}</td>
                  <td className="num">{formatPercent(s.nombre, total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
