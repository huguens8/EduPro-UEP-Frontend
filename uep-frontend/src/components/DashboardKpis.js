import React from 'react';
import { estTraite, formatMontant } from '../pages/fiopShared';
import { compact, plural } from './dashboardFormat';
import './DashboardBlocks.css';

const RETOURNES = ['REJETE_UEP'];

/** Indicateurs clés de tout le portefeuille (indépendants du filtre de statut). */
export default function DashboardKpis({ projets }) {
  const count = (statuts) => projets.filter((p) => statuts.includes(p.statut)).length;
  const traites = projets.filter((p) => estTraite(p.statut));
  const coutTraites = traites.reduce((sum, p) => sum + Number(p.coutTotalGourde || 0), 0);
  const enValidation = count(['SOUMIS_SUPERVISEUR_UEP']);
  const retournes = count(RETOURNES);

  return (
    <div className="kpi-row">
      <div className="kpi-tile">
        <span className="kpi-label">Projets enregistrés</span>
        <span className="kpi-value">{projets.length}</span>
        <span className="kpi-sub">{count(['BROUILLON'])} en brouillon</span>
      </div>
      <div className="kpi-tile">
        <span className="kpi-label">Projets traités</span>
        <span className="kpi-value">{traites.length}</span>
        <span className="kpi-sub">{count(['TRANSMIS_MPCE'])} transmis au MPCE</span>
      </div>
      <div className="kpi-tile" title={`${formatMontant(coutTraites)} HTG`}>
        <span className="kpi-label">Coût des projets traités</span>
        <span className="kpi-value">{compact(coutTraites)}<small> HTG</small></span>
        <span className="kpi-sub">coût total cumulé</span>
      </div>
      <div className="kpi-tile">
        <span className="kpi-label">En cours de validation</span>
        <span className="kpi-value">{enValidation}</span>
        <span className="kpi-sub">soumis à l'UEP</span>
      </div>
      <div className="kpi-tile">
        <span className="kpi-label">Retournés pour correction</span>
        <span className="kpi-value">{retournes}</span>
        <span className="kpi-sub">
          {retournes === 0 ? 'aucun retour en attente' : `${plural(retournes, 'FIOP')} à corriger`}
        </span>
      </div>
    </div>
  );
}
