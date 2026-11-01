import { STATUT_META, estTraite } from '../pages/fiopShared';

// Filtre de statut partagé par les graphiques du tableau de bord.
export const ALL_STATUTS = 'TOUS';
// Projets traités : validés par l'UEP, transmis ou non au MPCE.
export const TRAITES = 'TRAITES';
export const DEFAULT_STATUT = TRAITES;

export function matchesStatut(row, statut) {
  if (statut === TRAITES) return estTraite(row.statut);
  return statut === ALL_STATUTS || row.statut === statut;
}

export function statutPhrase(statut) {
  if (statut === ALL_STATUTS) return 'tous statuts confondus';
  if (statut === TRAITES) return 'statut « traité » (validé par l’UEP ou transmis au MPCE)';
  return `statut « ${STATUT_META[statut].label} »`;
}
