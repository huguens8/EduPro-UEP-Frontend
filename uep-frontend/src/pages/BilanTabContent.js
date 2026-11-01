import React, { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';
import { groupSourcesFinancement, infoGeneralesStep, matchSourceMeta, SOURCES_FINANCEMENT_META } from './fiopShared';
import './BilanTabContent.css';

/**
 * Lignes du tableau §39 : comme dans le canevas, les 7 sources de référence apparaissent toujours,
 * dans l'ordre du canevas (Ressources Nationales puis Externes), même celles que le plan du projet
 * (§29) ne finance pas — leur prévision vaut alors 0. `execOf(idSource)` fournit les valeurs
 * d'exécution à reprendre pour chaque ligne.
 */
function buildSourceRows(fiop, refSources, execOf) {
  const plan = new Map((fiop.sourcesFinancement || []).map((s) => [String(s.idSource), s]));
  const references = refSources.length > 0
    ? refSources.map((s) => ({ idSource: s.id, sourceLibelle: s.libelle }))
    : (fiop.sourcesFinancement || []).map((s) => ({ idSource: s.idSource, sourceLibelle: s.sourceLibelle }));
  const rang = (libelle) => {
    const idx = SOURCES_FINANCEMENT_META.indexOf(matchSourceMeta(libelle));
    return idx === -1 ? SOURCES_FINANCEMENT_META.length : idx;
  };
  return [...references]
    .sort((a, b) => rang(a.sourceLibelle) - rang(b.sourceLibelle))
    .map((ref) => ({
      idSource: ref.idSource,
      sourceLibelle: ref.sourceLibelle,
      previsionTotal: plan.get(String(ref.idSource))?.previsionTotal ?? 0,
      ...execOf(ref.idSource),
    }));
}

const CATEGORIES_BUDGET = ['NATIONAL', 'EXTERNE'];
const CHAMPS_BUDGET = ['montantPrevu', 'depensesAnterieuresN2', 'depensesExercice'];

/**
 * Saisie des §§44-45 indexée par catégorie puis sous-rubrique :
 * { NATIONAL: { [idRubrique]: { montantPrevu, depensesAnterieuresN2, depensesExercice } }, EXTERNE: {...} }.
 * Pour un nouveau bilan, `bilanPrecedent` (le plus récent du projet) fournit les montants prévus :
 * ils portent sur le budget total du projet et ne changent pas d'un exercice à l'autre.
 */
function toAvancementBudget(bilan, bilanPrecedent) {
  const result = { NATIONAL: {}, EXTERNE: {} };
  if (bilan) {
    (bilan.avancementBudget || []).forEach((l) => {
      if (!result[l.categorieFinancement]) return;
      result[l.categorieFinancement][l.idRubrique] = {
        montantPrevu: l.montantPrevu ?? '',
        depensesAnterieuresN2: l.depensesAnterieuresN2 ?? '',
        depensesExercice: l.depensesExercice ?? '',
      };
    });
  } else if (bilanPrecedent) {
    (bilanPrecedent.avancementBudget || []).forEach((l) => {
      if (!result[l.categorieFinancement] || !Number(l.montantPrevu)) return;
      result[l.categorieFinancement][l.idRubrique] = { montantPrevu: l.montantPrevu, depensesAnterieuresN2: '', depensesExercice: '' };
    });
  }
  return result;
}

/**
 * Rubriques des tableaux §§44-46 : comme dans le canevas, les rubriques principales 1 à 5 (la
 * rubrique 7 n'y figure pas), chacune suivie de ses sous-rubriques.
 */
function rubriquesAvancementBudget(rubriques) {
  const principales = rubriques.filter((r) => r.idRubriqueParent == null && ['1', '2', '3', '4', '5'].includes(String(r.code)));
  return principales.map((p) => ({ ...p, sousRubriques: rubriques.filter((r) => r.idRubriqueParent === p.id) }));
}

/**
 * Tableaux §§44-46 "Avancement du budget total du projet" (feuille "Bilan suite 3" du canevas) :
 * colonnes 1 (montant prévu), 2 (dépenses des exercices antérieurs à n-2), 3 (exercice n-2),
 * 4 = 2+3 et 5 = 1-4 ; rubriques principales en bandeau avec le sous-total de leurs
 * sous-rubriques, puis Sous Total (1@2), Sous TOTAL (3@5) et TOTAL (1@5).
 * `valeur(idRubrique, champ)` lit une saisie ; sans `onChange`, le tableau est en lecture seule.
 */
function AvancementBudgetTable({ rubriques, valeur, onChange }) {
  const groupes = rubriquesAvancementBudget(rubriques);
  const ligne = (id) => {
    const [prevu, ant, ex] = CHAMPS_BUDGET.map((c) => toNumber(valeur(id, c)));
    return [prevu, ant, ex, ant + ex, prevu - ant - ex];
  };
  const somme = (lignes) => lignes.reduce((acc, l) => acc.map((v, i) => v + l[i]), [0, 0, 0, 0, 0]);
  const totalGroupe = (g) => somme(g.sousRubriques.map((r) => ligne(r.id)));
  const totalCodes = (codes) => somme(groupes.filter((g) => codes.includes(String(g.code))).map(totalGroupe));
  const cellules = (valeurs) => valeurs.map((v, i) => <td key={i}>{formatGourde(v)}</td>);

  const sousTotalRow = (libelle, codes) => (
    <tr className="avancement-sous-total-row">
      <td>{libelle}</td>
      {cellules(totalCodes(codes))}
    </tr>
  );

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table avancement-budget-table">
        <thead>
          <tr>
            <th rowSpan={2}>Rubriques de Dépenses</th>
            <th rowSpan={2}>Montant Prévu</th>
            <th colSpan={3}>Dépenses Effectives</th>
            <th rowSpan={2}>Balance Prévisionnelle</th>
          </tr>
          <tr>
            <th>Exer. Anté à (n-2)</th>
            <th>Exercice (n-2)</th>
            <th>Cumulées</th>
          </tr>
          <tr className="colonnes-numeros">
            <th />
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4=2+3</th>
            <th>5=1-4</th>
          </tr>
        </thead>
        <tbody>
          {groupes.map((g) => (
            <React.Fragment key={g.id}>
              <tr className="avancement-principale-row">
                <td>{g.code}-{g.libelle}</td>
                {cellules(totalGroupe(g))}
              </tr>
              {g.sousRubriques.map((r) => {
                const [, , , cumulees, balance] = ligne(r.id);
                return (
                  <tr key={r.id}>
                    <td className="rubrique-label-cell avancement-sous-rubrique">{r.code}-{r.libelle}</td>
                    {CHAMPS_BUDGET.map((champ) => (
                      <td key={champ} className={onChange ? undefined : 'rubrique-total-cell'}>
                        {onChange ? (
                          <input
                            type="number"
                            min="0"
                            aria-label={`${r.code}-${r.libelle} — ${champ}`}
                            value={valeur(r.id, champ)}
                            onChange={onChange(r.id, champ)}
                          />
                        ) : formatGourde(valeur(r.id, champ))}
                      </td>
                    ))}
                    <td className="rubrique-total-cell">{formatGourde(cumulees)}</td>
                    <td className="rubrique-total-cell">{formatGourde(balance)}</td>
                  </tr>
                );
              })}
              {String(g.code) === '2' && sousTotalRow('Sous Total (1@2)', ['1', '2'])}
            </React.Fragment>
          ))}
          {sousTotalRow('Sous TOTAL (3@5)', ['3', '4', '5'])}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL (1@5)</td>
            {cellules(totalCodes(['1', '2', '3', '4', '5']))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const AVANCEMENT_BUDGET_TITRES = {
  NATIONAL: '44 — Avancement du budget total du projet sur financement national',
  EXTERNE: '45 — Avancement du budget total du projet sur financement externe',
  GLOBAL: '46 — Avancement du budget total du projet sur financement national et externe',
};

// Lecteur `valeur(idRubrique, champ)` d'une catégorie, ou du §46 (somme des deux) pour 'GLOBAL'.
function lecteurAvancementBudget(avancementBudget, categorie) {
  const lire = (cat) => (id, champ) => avancementBudget?.[cat]?.[id]?.[champ] ?? '';
  if (categorie !== 'GLOBAL') return lire(categorie);
  return (id, champ) => CATEGORIES_BUDGET.reduce((sum, cat) => sum + toNumber(lire(cat)(id, champ)), 0);
}

/**
 * Construit les lignes d'exécution du formulaire à partir du plan ACTUEL du projet (fiop.activites
 * / fiop.calendrierRubriques / fiop.sourcesFinancement — saisis une seule fois dans la FIOP,
 * §§29/31/33/34), en restaurant les valeurs d'exécution déjà saisies pour un bilan existant
 * (matching par identifiant). Le "prévu" n'est jamais éditable ici : il est toujours lu depuis
 * le plan, comme dans le classeur Excel d'origine (ex. Bilan Suite 2!E15 = 'Info Générales'!L178).
 */
function toFormValues(fiop, bilan, refSources, bilanPrecedent) {
  const activitesExec = new Map((bilan?.activites || []).map((a) => [a.idActivite, a]));
  const rubriquesExec = new Map((bilan?.rubriques || []).map((r) => [r.idRubrique, r]));
  const sourcesExec = new Map((bilan?.sources || []).map((s) => [s.idSource, s]));
  const pipParAnnee = new Map((bilan?.pipAnnuel || []).map((p) => [p.anneeNumero, p]));

  return {
    idExercice: bilan?.idExercice || '',
    dateDemarrageEffective: bilan?.dateDemarrageEffective || '',
    dureeTotaleProjetMois: bilan?.dureeTotaleProjetMois ?? fiop.dureeTotaleMois ?? '',
    activites: (fiop.activites || []).map((a) => {
      const exec = activitesExec.get(a.id);
      return {
        idActivite: a.id,
        libelle: a.libelle,
        uniteResultat: a.uniteResultat,
        quantiteResultatAttendu: a.quantiteResultatAttendu,
        montantPrevu: exec?.montantPrevu ?? a.coutTotal ?? null,
        resultatsObtenus: exec?.resultatsObtenus || '',
        depensesAnterieuresN2: exec?.depensesAnterieuresN2 ?? '',
        depensesExercice: exec?.depensesExercice ?? '',
      };
    }),
    rubriques: (fiop.calendrierRubriques || []).map((r) => {
      const exec = rubriquesExec.get(r.idRubrique);
      return {
        idRubrique: r.idRubrique,
        rubriqueLibelle: r.rubriqueLibelle,
        montantTotal: r.montantTotal,
        depensesAnterieuresN2: exec?.depensesAnterieuresN2 ?? '',
        depensesExercice: exec?.depensesExercice ?? '',
      };
    }),
    sources: buildSourceRows(fiop, refSources, (idSource) => {
      const exec = sourcesExec.get(idSource);
      return {
        totalDecaissementsEffectifs: exec?.totalDecaissementsEffectifs ?? '',
        totalDepensesEffectives: exec?.totalDepensesEffectives ?? '',
      };
    }),
    pipAnnuel: [1, 2, 3, 4, 5].map((n) => {
      const p = pipParAnnee.get(n);
      return {
        anneeNumero: n,
        idExercice: p?.idExercice ?? '',
        budgetPrevisionnel: p?.budgetPrevisionnel ?? '',
        budgetAlloue: p?.budgetAlloue ?? '',
        budgetReel: p?.budgetReel ?? '',
      };
    }),
    avancementBudget: toAvancementBudget(bilan, bilanPrecedent),
  };
}

// Étapes du wizard "Bilan d'exécution", sur le modèle de FIOP_STEPS (Info Générales), dans l'ordre
// de numérotation du canevas : §35-37, §38, §39-40, §41, §42-43, §44, §45, §46. `fields`
// sert à marquer l'étape en erreur et à s'y replacer après un refus du backend (les clés d'erreur
// des lignes arrivent sous la forme "activites[0].depensesExercice").
const BILAN_STEPS = [
  { id: 'temporel', label: 'Évolution temporelle du projet', fields: ['idExercice', 'dureeTotaleProjetMois', 'dateDemarrageEffective'] },
  { id: 'pip', label: "Programme d'Investissement Public (PIP)", fields: ['pipAnnuel'] },
  { id: 'sources', label: 'Évolution et avancement financiers par source', fields: ['sources'] },
  { id: 'rubriques', label: 'Opérations financières par rubrique', fields: ['rubriques'] },
  { id: 'activites', label: 'Avancement des activités', fields: ['activites'] },
  { id: 'budget-national', label: 'Avancement du budget — financement national', fields: ['avancementBudget'] },
  { id: 'budget-externe', label: 'Avancement du budget — financement externe', fields: [] },
  { id: 'budget-global', label: 'Avancement du budget — national et externe', fields: [] },
];

function fieldMatches(errorKey, field) {
  return errorKey === field || errorKey.startsWith(`${field}[`) || errorKey.startsWith(`${field}.`);
}

function toNumberOrUndefined(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function buildRequest(form) {
  return {
    idExercice: form.idExercice ? Number(form.idExercice) : undefined,
    dateDemarrageEffective: form.dateDemarrageEffective || undefined,
    dureeTotaleProjetMois: toNumberOrUndefined(form.dureeTotaleProjetMois),
    activites: form.activites.map((a) => ({
      idActivite: a.idActivite,
      resultatsObtenus: a.resultatsObtenus || undefined,
      depensesAnterieuresN2: toNumberOrUndefined(a.depensesAnterieuresN2),
      depensesExercice: toNumberOrUndefined(a.depensesExercice),
    })),
    rubriques: form.rubriques.map((r) => ({
      idRubrique: r.idRubrique,
      depensesAnterieuresN2: toNumberOrUndefined(r.depensesAnterieuresN2),
      depensesExercice: toNumberOrUndefined(r.depensesExercice),
    })),
    sources: form.sources.map((s) => ({
      idSource: s.idSource,
      totalDecaissementsEffectifs: toNumberOrUndefined(s.totalDecaissementsEffectifs),
      totalDepensesEffectives: toNumberOrUndefined(s.totalDepensesEffectives),
    })),
    pipAnnuel: form.pipAnnuel.map((p) => ({
      anneeNumero: p.anneeNumero,
      idExercice: p.idExercice ? Number(p.idExercice) : undefined,
      budgetPrevisionnel: toNumberOrUndefined(p.budgetPrevisionnel),
      budgetAlloue: toNumberOrUndefined(p.budgetAlloue),
      budgetReel: toNumberOrUndefined(p.budgetReel),
    })),
    avancementBudget: CATEGORIES_BUDGET.flatMap((categorie) =>
      Object.entries(form.avancementBudget[categorie])
        .filter(([, v]) => CHAMPS_BUDGET.some((c) => toNumber(v[c]) !== 0))
        .map(([idRubrique, v]) => ({
          idRubrique: Number(idRubrique),
          categorieFinancement: categorie,
          montantPrevu: toNumberOrUndefined(v.montantPrevu),
          depensesAnterieuresN2: toNumberOrUndefined(v.depensesAnterieuresN2),
          depensesExercice: toNumberOrUndefined(v.depensesExercice),
        }))),
  };
}

function formatMontant(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

// Montants du tableau §39, affichés comme dans le canevas : toujours deux décimales (0,00).
function formatGourde(value) {
  return toNumber(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(value) {
  return value === null ? '—' : `${value.toFixed(2)}%`;
}

function formatDateFr(isoDate) {
  if (!isoDate) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  return isoDate;
}

/**
 * Contenu de l'onglet "Bilan d'Exécution" du FIOP (DEUXIEME PARTIE de la FIOP dans le canevas
 * d'origine) : ce n'est PAS une modale séparée, mais un onglet du même formulaire que "Info
 * Générales" (PREMIERE PARTIE) — les deux sont soumis et validés ensemble, en un seul cycle.
 */
export default function BilanTabContent({ fiop, canEdit }) {
  const [view, setView] = useState('list');

  const [bilans, setBilans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');

  const [exercices, setExercices] = useState([]);
  const [refSources, setRefSources] = useState([]);
  const [rubriques, setRubriques] = useState([]);

  const [editingBilan, setEditingBilan] = useState(null);
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [bilanStep, setBilanStep] = useState(0);
  const [savedNotice, setSavedNotice] = useState('');
  const userEdited = useRef(false);

  const [detailBilan, setDetailBilan] = useState(null);

  const loadBilans = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const { data } = await apiClient.get(`/fiop/${fiop.id}/bilans`);
      setBilans(data);
    } catch (err) {
      setListError("Impossible de charger les bilans d'exécution.");
    } finally {
      setLoading(false);
    }
  }, [fiop.id]);

  useEffect(() => {
    loadBilans();
    apiClient.get('/reference/exercices').then(({ data }) => setExercices(data)).catch(() => setExercices([]));
    apiClient.get('/reference/sources-financement').then(({ data }) => setRefSources(data)).catch(() => setRefSources([]));
    apiClient.get('/reference/rubriques-budgetaires-hierarchie').then(({ data }) => setRubriques(data)).catch(() => setRubriques([]));
  }, [loadBilans]);

  // Si le formulaire a été ouvert avant l'arrivée des sources de référence, on complète le
  // tableau §39 avec les sources manquantes sans perdre ce qui a déjà été saisi.
  useEffect(() => {
    if (refSources.length === 0) return;
    setForm((prev) => {
      if (!prev) return prev;
      const saisies = new Map(prev.sources.map((s) => [String(s.idSource), s]));
      const sources = buildSourceRows(fiop, refSources, (idSource) => {
        const s = saisies.get(String(idSource));
        return {
          totalDecaissementsEffectifs: s?.totalDecaissementsEffectifs ?? '',
          totalDepensesEffectives: s?.totalDepensesEffectives ?? '',
        };
      });
      return { ...prev, sources };
    });
  }, [refSources, fiop]);

  const planIncomplet = (fiop.activites || []).length === 0 && (fiop.calendrierRubriques || []).length === 0;

  const resetWizard = () => {
    setBilanStep(0);
    setSavedNotice('');
    userEdited.current = false;
  };

  const openCreate = () => {
    setEditingBilan(null);
    // La liste est triée par exercice décroissant : le premier bilan est le plus récent.
    setForm(toFormValues(fiop, null, refSources, bilans[0]));
    setFormErrors({});
    resetWizard();
    setView('form');
  };

  const openEdit = (bilan) => {
    setEditingBilan(bilan);
    setForm(toFormValues(fiop, bilan, refSources));
    setFormErrors({});
    resetWizard();
    setView('form');
  };

  const openDetail = async (bilan) => {
    try {
      const { data } = await apiClient.get(`/bilans/${bilan.id}`);
      setDetailBilan(data);
      setView('detail');
    } catch (err) {
      setActionError('Impossible de charger le détail du bilan.');
    }
  };

  const handleDelete = async (bilan) => {
    if (!window.confirm(`Supprimer le bilan de l'exercice "${bilan.exerciceLibelle}" ?`)) return;
    setActionError('');
    try {
      await apiClient.delete(`/bilans/${bilan.id}`);
      loadBilans();
    } catch (err) {
      setActionError(err.response?.data?.message || 'La suppression a échoué.');
    }
  };

  // Enregistre le bilan (création au premier enregistrement, puis mise à jour) et renvoie `true`
  // si tout s'est bien passé. Le bilan créé devient `editingBilan`, ce qui rafraîchit aussi les
  // valeurs calculées par le backend (temps écoulé/restant, achèvement prévu).
  const saveBilan = async () => {
    setFormErrors({});
    setSubmitting(true);
    try {
      const body = buildRequest(form);
      const { data } = editingBilan
        ? await apiClient.put(`/bilans/${editingBilan.id}`, body)
        : await apiClient.post(`/fiop/${fiop.id}/bilans`, body);
      setEditingBilan(data);
      return true;
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.message) {
        setFormErrors(data);
        const errorKeys = Object.keys(data);
        const idx = BILAN_STEPS.findIndex((s) => s.fields.some((f) => errorKeys.some((k) => fieldMatches(k, f))));
        if (idx >= 0) setBilanStep(idx);
      } else {
        setFormErrors({ general: data?.message || "L'enregistrement du bilan a échoué." });
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // L'exercice est la seule donnée obligatoire (elle identifie le bilan) : sans elle, on renvoie
  // à la première étape plutôt que de laisser le backend refuser l'enregistrement.
  const exerciceManquant = () => {
    if (form.idExercice) return false;
    setFormErrors({ idExercice: "L'exercice est obligatoire." });
    setBilanStep(0);
    return true;
  };

  // Même principe que le wizard "Info Générales" : l'étape est enregistrée quand on la quitte,
  // seulement si l'utilisateur a réellement saisi quelque chose.
  const goToStep = async (targetIdx) => {
    if (submitting) return;
    const target = Math.max(0, Math.min(BILAN_STEPS.length - 1, targetIdx));
    if (target === bilanStep) return;
    if (!userEdited.current) {
      setBilanStep(target);
      return;
    }
    if (exerciceManquant()) return;
    const ok = await saveBilan();
    if (!ok) return;
    userEdited.current = false;
    setSavedNotice(`Étape « ${BILAN_STEPS[bilanStep].label} » enregistrée.`);
    setBilanStep(target);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (bilanStep < BILAN_STEPS.length - 1) {
      goToStep(bilanStep + 1);
      return;
    }
    if (exerciceManquant()) return;
    const ok = await saveBilan();
    if (!ok) return;
    setView('list');
    loadBilans();
  };

  const closeForm = () => {
    setView('list');
    loadBilans();
  };

  const markEdited = () => {
    userEdited.current = true;
    setSavedNotice('');
  };

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const updateLigne = (listName, idx, field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = [...prev[listName]];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, [listName]: next };
    });
  };

  const updateAvancementBudget = (categorie) => (idRubrique, champ) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const parCategorie = prev.avancementBudget[categorie];
      const ligne = { montantPrevu: '', depensesAnterieuresN2: '', depensesExercice: '', ...parCategorie[idRubrique], [champ]: value };
      return {
        ...prev,
        avancementBudget: { ...prev.avancementBudget, [categorie]: { ...parCategorie, [idRubrique]: ligne } },
      };
    });
  };

  if (view === 'form' && form) {
    const totalRubriquesPrevu = form.rubriques.reduce((sum, r) => sum + toNumber(r.montantTotal), 0);
    const totalRubriquesCumulees = form.rubriques.reduce(
      (sum, r) => sum + toNumber(r.depensesAnterieuresN2) + toNumber(r.depensesExercice), 0);
    const totalRubriquesBalance = totalRubriquesPrevu - totalRubriquesCumulees;

    const totalSourcesPrevu = form.sources.reduce((sum, s) => sum + toNumber(s.previsionTotal), 0);
    const totalSourcesDecaissements = form.sources.reduce((sum, s) => sum + toNumber(s.totalDecaissementsEffectifs), 0);
    const totalSourcesDepensesEff = form.sources.reduce((sum, s) => sum + toNumber(s.totalDepensesEffectives), 0);
    const groupSpans = groupSourcesFinancement(form.sources, (idSource) => {
      const s = form.sources.find((x) => x.idSource === idSource);
      return matchSourceMeta(s?.sourceLibelle);
    });

    const step = BILAN_STEPS[bilanStep];
    const isLast = bilanStep === BILAN_STEPS.length - 1;
    const stepHasError = (s) => s.fields.some((f) => Object.keys(formErrors).some((k) => fieldMatches(k, f)));

    const renderTemporel = () => (
      <>
        <h4 className="wizard-substep-title">35 — Évolution temporelle du projet</h4>
        <div className="field-row">
          <div className="field">
            <label>Exercice <span className="required-mark">*</span></label>
            <select value={form.idExercice} onChange={updateField('idExercice')}>
              <option value="">—</option>
              {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
            </select>
            {formErrors.idExercice && <span className="field-error">{formErrors.idExercice}</span>}
          </div>
          <div className="field">
            <label>Durée totale du projet (mois)</label>
            <input type="number" value={form.dureeTotaleProjetMois} onChange={updateField('dureeTotaleProjetMois')} />
          </div>
          <div className="field">
            <label>Date de démarrage effective</label>
            <input type="date" value={form.dateDemarrageEffective} onChange={updateField('dateDemarrageEffective')} />
          </div>
          <div className="field">
            <label>Temps écoulé (mois)</label>
            <input type="text" value={editingBilan?.tempsEcouleMois ?? '—'} disabled />
          </div>
          <div className="field">
            <label>Temps restant (mois)</label>
            <input type="text" value={editingBilan?.tempsRestantMois ?? '—'} disabled />
          </div>
        </div>
        {editingBilan && (
          <p className="bilan-computed-hint">
            Achèvement prévu : <strong>{formatDateFr(editingBilan.dateAchevementPrevue)}</strong>
          </p>
        )}
        <p className="bilan-computed-hint">
          36 — N° compte bancaire : <strong>{fiop.numeroCompteBancaire || '—'}</strong> · 37 — Type d'investissement : <strong>{fiop.typeInvestissement || '—'}</strong>
          <span> (renseignés dans l'onglet Info Générales)</span>
        </p>
      </>
    );

    const renderPip = () => (
      <>
        <h4 className="wizard-substep-title">38 — Programme d'Investissement Public (PIP)</h4>
        <div className="rubrique-table-wrap">
          <table className="rubrique-calendrier-table">
            <thead>
              <tr>
                <th>Année</th>
                <th>Exercice fiscal</th>
                <th>Budget prévisionnel</th>
                <th>Budget alloué</th>
                <th>Budget réel</th>
                <th>Écart prévisionnel</th>
                <th>Écart exécution</th>
              </tr>
            </thead>
            <tbody>
              {form.pipAnnuel.map((p, idx) => {
                const ecartPrevisionnel = toNumber(p.budgetPrevisionnel) - toNumber(p.budgetAlloue);
                const ecartExecution = p.budgetReel === '' ? null : toNumber(p.budgetAlloue) - toNumber(p.budgetReel);
                return (
                  <tr key={p.anneeNumero}>
                    <td className="rubrique-total-cell">{p.anneeNumero}</td>
                    <td>
                      <select value={p.idExercice} onChange={updateLigne('pipAnnuel', idx, 'idExercice')}>
                        <option value="">—</option>
                        {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
                      </select>
                    </td>
                    <td><input type="number" value={p.budgetPrevisionnel} onChange={updateLigne('pipAnnuel', idx, 'budgetPrevisionnel')} /></td>
                    <td><input type="number" value={p.budgetAlloue} onChange={updateLigne('pipAnnuel', idx, 'budgetAlloue')} /></td>
                    <td><input type="number" value={p.budgetReel} onChange={updateLigne('pipAnnuel', idx, 'budgetReel')} /></td>
                    <td className="rubrique-total-cell">{formatMontant(ecartPrevisionnel)}</td>
                    <td className="rubrique-total-cell">{ecartExecution === null ? '—' : formatMontant(ecartExecution)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Coût Total</td>
                <td>{formatMontant(form.pipAnnuel.reduce((sum, p) => sum + toNumber(p.budgetPrevisionnel), 0))}</td>
                <td>{formatMontant(form.pipAnnuel.reduce((sum, p) => sum + toNumber(p.budgetAlloue), 0))}</td>
                <td>{formatMontant(form.pipAnnuel.reduce((sum, p) => sum + toNumber(p.budgetReel), 0))}</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </>
    );

    const renderActivites = () => (
      <>
        <h4 className="wizard-substep-title">42-43 — Avancement des activités du projet</h4>
        <p className="bilan-plan-hint">
          Le "prévu" (résultat attendu, montant) provient du plan du projet ({infoGeneralesStep('activites-calendrier')}) — seule l'exécution se saisit ici.
        </p>
        {form.activites.length === 0 ? (
          <p className="bilan-plan-empty">Aucune activité planifiée pour ce projet — complétez-les dans {infoGeneralesStep('activites-calendrier')}.</p>
        ) : (
          <div className="rubrique-table-wrap">
            <table className="rubrique-calendrier-table activites-table">
              <thead>
                <tr>
                  <th rowSpan={2}>Activités</th>
                  <th colSpan={4}>Avancement physique</th>
                  <th colSpan={5}>Avancement financier</th>
                </tr>
                <tr>
                  <th>Prévu</th>
                  <th>Obtenu</th>
                  <th>Écart</th>
                  <th>% Avan.</th>
                  <th>Montant prévu</th>
                  <th>Dép. ant. n-2</th>
                  <th>Dép. exercice</th>
                  <th>Dép. cumulées</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {form.activites.map((a, idx) => {
                  const quantite = toNumber(a.quantiteResultatAttendu);
                  const obtenu = a.resultatsObtenus === '' ? null : toNumber(a.resultatsObtenus);
                  const ecart = obtenu === null ? null : quantite - obtenu;
                  const pct = obtenu === null || quantite <= 0 ? null : (obtenu / quantite) * 100;
                  const cumulees = toNumber(a.depensesAnterieuresN2) + toNumber(a.depensesExercice);
                  const balance = toNumber(a.montantPrevu) - cumulees;
                  return (
                    <tr key={a.idActivite}>
                      <td className="rubrique-label-cell">{a.libelle}</td>
                      <td className="rubrique-total-cell">{a.quantiteResultatAttendu ?? '—'} {a.uniteResultat || ''}</td>
                      <td><input type="text" value={a.resultatsObtenus} onChange={updateLigne('activites', idx, 'resultatsObtenus')} /></td>
                      <td className="rubrique-total-cell">{ecart === null ? '—' : ecart}</td>
                      <td className="rubrique-total-cell">{formatPct(pct)}</td>
                      <td className="rubrique-total-cell">{formatMontant(a.montantPrevu)}</td>
                      <td><input type="number" value={a.depensesAnterieuresN2} onChange={updateLigne('activites', idx, 'depensesAnterieuresN2')} /></td>
                      <td><input type="number" value={a.depensesExercice} onChange={updateLigne('activites', idx, 'depensesExercice')} /></td>
                      <td className="rubrique-total-cell">{formatMontant(cumulees)}</td>
                      <td className="rubrique-total-cell">{formatMontant(balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );

    const renderRubriques = () => (
      <>
        <h4 className="wizard-substep-title">41 — Résumé des opérations financières (par rubrique)</h4>
        <p className="bilan-plan-hint">
          Le "coût prévisionnel" provient du calendrier budgétaire du projet ({infoGeneralesStep('depenses-rubriques')}, §34) — seule l'exécution se saisit ici.
        </p>
        {form.rubriques.length === 0 ? (
          <p className="bilan-plan-empty">Aucun calendrier budgétaire planifié pour ce projet — complétez-le dans {infoGeneralesStep('depenses-rubriques')}, section « 34 — Calendrier des dépenses prévisionnelles par rubrique ».</p>
        ) : (
          <div className="rubrique-table-wrap">
            <table className="rubrique-calendrier-table">
              <thead>
                <tr>
                  <th>Rubriques de dépenses</th>
                  <th>Coût prévisionnel</th>
                  <th>Dép. ant. n-2</th>
                  <th>Dép. exercice</th>
                  <th>Dép. cumulées</th>
                  <th>Balance budgétaire</th>
                </tr>
              </thead>
              <tbody>
                {form.rubriques.map((r, idx) => {
                  const cumulees = toNumber(r.depensesAnterieuresN2) + toNumber(r.depensesExercice);
                  const balance = toNumber(r.montantTotal) - cumulees;
                  return (
                    <tr key={r.idRubrique}>
                      <td className="rubrique-label-cell">{r.rubriqueLibelle}</td>
                      <td className="rubrique-total-cell">{formatMontant(r.montantTotal)}</td>
                      <td><input type="number" value={r.depensesAnterieuresN2} onChange={updateLigne('rubriques', idx, 'depensesAnterieuresN2')} /></td>
                      <td><input type="number" value={r.depensesExercice} onChange={updateLigne('rubriques', idx, 'depensesExercice')} /></td>
                      <td className="rubrique-total-cell">{formatMontant(cumulees)}</td>
                      <td className="rubrique-total-cell">{formatMontant(balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total Général</td>
                  <td>{formatMontant(totalRubriquesPrevu)}</td>
                  <td colSpan={2}></td>
                  <td>{formatMontant(totalRubriquesCumulees)}</td>
                  <td>{formatMontant(totalRubriquesBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </>
    );

    // §39 et §40 restent sur la même étape : les taux du §40 se recalculent à mesure qu'on saisit
    // les décaissements et dépenses du §39, l'utilisateur voit donc l'effet de sa saisie.
    const renderSources = () => (
      <>
        <h4 className="wizard-substep-title">39 — Évolution financière du projet (Montant en Gourde)</h4>
        <p className="bilan-plan-hint">
          Les "Prévisions Total" proviennent des sources de financement du projet ({infoGeneralesStep('financement-phase')}) — seuls les décaissements et dépenses effectives se saisissent ici.
        </p>
        {form.sources.length === 0 ? (
          <p className="bilan-plan-empty">Aucune source de financement disponible — les sources de référence n'ont pas pu être chargées.</p>
        ) : (
          <div className="rubrique-table-wrap">
            <table className="rubrique-calendrier-table sources-financement-table">
              <thead>
                <tr>
                  <th>Ressources</th>
                  <th>Sources</th>
                  <th>Type</th>
                  <th>Prévisions Total</th>
                  <th>Total Décaissements Effectifs</th>
                  <th>Balance Prévisionnelle</th>
                  <th>Total Dépenses effectives</th>
                  <th>Valeur aux Livres Comptables</th>
                </tr>
                <tr className="colonnes-numeros">
                  <th>1</th>
                  <th>2</th>
                  <th>3</th>
                  <th>4</th>
                  <th>5</th>
                  <th>6=4-5</th>
                  <th>7</th>
                  <th>8=5-7</th>
                </tr>
              </thead>
              <tbody>
                {form.sources.map((s, idx) => {
                  const previsionTotal = toNumber(s.previsionTotal);
                  const decaissements = toNumber(s.totalDecaissementsEffectifs);
                  const depensesEff = toNumber(s.totalDepensesEffectives);
                  const balance = previsionTotal - decaissements;
                  const valeurLivres = decaissements - depensesEff;
                  const span = groupSpans[idx];
                  return (
                    <tr key={s.idSource}>
                      {span && <td className="rubrique-label-cell sources-groupe-cell" rowSpan={span.span}>{span.groupe}</td>}
                      <td className="rubrique-label-cell">{s.sourceLibelle}</td>
                      <td className="sources-type-cell">{matchSourceMeta(s.sourceLibelle)?.type || '—'}</td>
                      <td className="rubrique-total-cell">{formatGourde(previsionTotal)}</td>
                      <td><input type="number" value={s.totalDecaissementsEffectifs} onChange={updateLigne('sources', idx, 'totalDecaissementsEffectifs')} /></td>
                      <td className="rubrique-total-cell">{formatGourde(balance)}</td>
                      <td><input type="number" value={s.totalDepensesEffectives} onChange={updateLigne('sources', idx, 'totalDepensesEffectives')} /></td>
                      <td className="rubrique-total-cell">{formatGourde(valeurLivres)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Montant Total</td>
                  <td>{formatGourde(totalSourcesPrevu)}</td>
                  <td>{formatGourde(totalSourcesDecaissements)}</td>
                  <td>{formatGourde(totalSourcesPrevu - totalSourcesDecaissements)}</td>
                  <td>{formatGourde(totalSourcesDepensesEff)}</td>
                  <td>{formatGourde(totalSourcesDecaissements - totalSourcesDepensesEff)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <h4 className="wizard-substep-title">40 — Pourcentage d'avancement financière</h4>
        <p className="bilan-plan-hint">Calculé automatiquement à partir des montants saisis en §39 ci-dessus.</p>
        {form.sources.length > 0 && (
          <div className="rubrique-table-wrap">
            <table className="rubrique-calendrier-table">
              <thead>
                <tr>
                  <th>Ressources</th>
                  <th>Taux de financement</th>
                  <th>Taux d'absorption</th>
                </tr>
              </thead>
              <tbody>
                {form.sources.map((s) => {
                  const previsionTotal = toNumber(s.previsionTotal);
                  const decaissements = toNumber(s.totalDecaissementsEffectifs);
                  const depensesEff = toNumber(s.totalDepensesEffectives);
                  const tauxFinancement = previsionTotal > 0 ? (decaissements / previsionTotal) * 100 : null;
                  const tauxAbsorption = decaissements > 0 ? (depensesEff / decaissements) * 100 : null;
                  return (
                    <tr key={s.idSource}>
                      <td className="rubrique-label-cell">{s.sourceLibelle}</td>
                      <td className="rubrique-total-cell">{formatPct(tauxFinancement)}</td>
                      <td className="rubrique-total-cell">{formatPct(tauxAbsorption)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );

    const AVANCEMENT_BUDGET_AIDES = {
      NATIONAL: "Montants en gourdes par sous-rubrique. Le montant prévu porte sur le budget total du projet : pour un nouveau bilan, il est repris du bilan le plus récent.",
      EXTERNE: "Montants en gourdes par sous-rubrique. Le montant prévu porte sur le budget total du projet : pour un nouveau bilan, il est repris du bilan le plus récent.",
      GLOBAL: 'Calculé automatiquement : somme des financements national (§44) et externe (§45).',
    };

    const renderAvancementBudget = (categorie) => () => (
      <>
        <h4 className="wizard-substep-title">{AVANCEMENT_BUDGET_TITRES[categorie]}</h4>
        <p className="bilan-plan-hint">{AVANCEMENT_BUDGET_AIDES[categorie]}</p>
        {rubriques.length === 0 ? (
          <p className="bilan-plan-empty">Les rubriques budgétaires n'ont pas pu être chargées.</p>
        ) : (
          <AvancementBudgetTable
            rubriques={rubriques}
            valeur={lecteurAvancementBudget(form.avancementBudget, categorie)}
            onChange={categorie === 'GLOBAL' ? undefined : updateAvancementBudget(categorie)}
          />
        )}
      </>
    );

    const renderers = {
      temporel: renderTemporel,
      pip: renderPip,
      activites: renderActivites,
      rubriques: renderRubriques,
      sources: renderSources,
      'budget-national': renderAvancementBudget('NATIONAL'),
      'budget-externe': renderAvancementBudget('EXTERNE'),
      'budget-global': renderAvancementBudget('GLOBAL'),
    };

    return (
      <form onSubmit={submitForm} className="modal-form bilan-form wizard-form" noValidate>
        <h3 className="bilan-view-title">
          {editingBilan ? `Bilan d'exécution — ${editingBilan.exerciceLibelle}` : "Nouveau bilan d'exécution"}
        </h3>

        <nav className="wizard-steps">
          {BILAN_STEPS.map((s, idx) => (
            <React.Fragment key={s.id}>
              {idx > 0 && <div className={`wizard-connector${idx <= bilanStep ? ' done' : ''}`} />}
              <button
                type="button"
                className={[
                  'wizard-step',
                  idx === bilanStep && 'active',
                  idx < bilanStep && 'done',
                  stepHasError(s) && 'has-error',
                ].filter(Boolean).join(' ')}
                onClick={() => goToStep(idx)}
                title={s.label}
              >
                <span className="wizard-step-circle">{idx + 1}</span>
                <span className="wizard-step-label">{s.label}</span>
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div className="wizard-step-body" onChange={markEdited}>
          <h4 className="form-section-title">{step.label}</h4>
          {renderers[step.id]()}
        </div>

        {formErrors.general && <div className="form-error">{formErrors.general}</div>}
        {savedNotice && !formErrors.general && <div className="form-success">{savedNotice}</div>}

        <div className="modal-actions wizard-nav">
          <button type="button" className="secondary-btn" onClick={closeForm}>Annuler</button>
          <div className="wizard-nav-spacer" />
          {bilanStep > 0 && (
            <button type="button" className="secondary-btn" disabled={submitting} onClick={() => goToStep(bilanStep - 1)}>← Précédente</button>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement...' : isLast ? 'Enregistrer le bilan' : 'Enregistrer et continuer →'}
          </button>
        </div>
      </form>
    );
  }

  if (view === 'detail' && detailBilan) {
    return (
      <div>
        <h3 className="bilan-view-title">Bilan — Exercice {detailBilan.exerciceLibelle}</h3>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Date de démarrage effective</span><span>{formatDateFr(detailBilan.dateDemarrageEffective)}</span></div>
                    <div className="detail-row"><span className="detail-label">Temps écoulé / restant</span><span>{detailBilan.tempsEcouleMois ?? '—'} / {detailBilan.tempsRestantMois ?? '—'} mois</span></div>
          <div className="detail-row"><span className="detail-label">Durée totale</span><span>{detailBilan.dureeTotaleProjetMois ?? '—'} mois</span></div>
          <div className="detail-row"><span className="detail-label">Achèvement prévu</span><span>{formatDateFr(detailBilan.dateAchevementPrevue)}</span></div>
        </div>

        <h4 className="form-section-title">Programme d'Investissement Public (§38)</h4>
        <div className="bilan-table-wrap">
          <table className="bilan-table">
            <thead>
              <tr><th>Année</th><th>Exercice</th><th>Budget prévisionnel</th><th>Budget alloué</th><th>Budget réel</th><th>Écart prévisionnel</th><th>Écart exécution</th></tr>
            </thead>
            <tbody>
              {(detailBilan.pipAnnuel || []).map((p, idx) => (
                <tr key={idx}>
                  <td>{p.anneeNumero}</td>
                  <td>{p.exerciceLibelle}</td>
                  <td>{formatMontant(p.budgetPrevisionnel)}</td>
                  <td>{formatMontant(p.budgetAlloue)}</td>
                  <td>{formatMontant(p.budgetReel)}</td>
                  <td>{formatMontant(p.ecartPrevisionnel)}</td>
                  <td>{formatMontant(p.ecartExecution)}</td>
                </tr>
              ))}
              {(!detailBilan.pipAnnuel || detailBilan.pipAnnuel.length === 0) && (
                <tr><td colSpan={7}>Aucune ligne PIP renseignée.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <h4 className="form-section-title">Évolution financière par source (§39)</h4>
        <div className="bilan-table-wrap">
          <table className="bilan-table">
            <thead>
              <tr>
                <th>Source</th><th>Prévision totale</th><th>Poids</th><th>Décaissements effectifs</th>
                <th>Balance prévisionnelle</th><th>Dépenses effectives</th><th>Valeur aux livres</th>
              </tr>
            </thead>
            <tbody>
              {(detailBilan.sources || []).map((s, idx) => (
                <tr key={idx}>
                  <td>{s.sourceLibelle}</td>
                  <td>{formatMontant(s.previsionTotal)}</td>
                  <td>{s.poidsPct != null ? `${s.poidsPct}%` : '—'}</td>
                  <td>{formatMontant(s.totalDecaissementsEffectifs)}</td>
                  <td>{formatMontant(s.balancePrevisionnelle)}</td>
                  <td>{formatMontant(s.totalDepensesEffectives)}</td>
                  <td>{formatMontant(s.valeurAuxLivresComptables)}</td>
                </tr>
              ))}
              {(!detailBilan.sources || detailBilan.sources.length === 0) && (
                <tr><td colSpan={7}>Aucune source renseignée.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <h4 className="form-section-title">Pourcentage d'avancement financière (§40)</h4>
        <div className="bilan-table-wrap">
          <table className="bilan-table">
            <thead><tr><th>Source</th><th>Taux de financement</th><th>Taux d'absorption</th></tr></thead>
            <tbody>
              {(detailBilan.sources || []).map((s, idx) => (
                <tr key={idx}>
                  <td>{s.sourceLibelle}</td>
                  <td>{s.tauxFinancementPct != null ? `${s.tauxFinancementPct}%` : '—'}</td>
                  <td>{s.tauxAbsorptionPct != null ? `${s.tauxAbsorptionPct}%` : '—'}</td>
                </tr>
              ))}
              {(!detailBilan.sources || detailBilan.sources.length === 0) && (
                <tr><td colSpan={3}>Aucune source renseignée.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <h4 className="form-section-title">Résumé des opérations financières par rubrique (§41)</h4>
        <div className="bilan-table-wrap">
          <table className="bilan-table">
            <thead><tr><th>Rubrique</th><th>Montant prévu</th><th>Dép. cumulées</th><th>Balance</th></tr></thead>
            <tbody>
              {(detailBilan.rubriques || []).map((r, idx) => (
                <tr key={idx}>
                  <td>{r.rubriqueLibelle}</td>
                  <td>{formatMontant(r.montantPrevu)}</td>
                  <td>{formatMontant(r.depensesCumulees)}</td>
                  <td>{formatMontant(r.balancePrevisionnelle)}</td>
                </tr>
              ))}
              {(!detailBilan.rubriques || detailBilan.rubriques.length === 0) && (
                <tr><td colSpan={4}>Aucune rubrique renseignée.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <h4 className="form-section-title">Avancement des activités (§42-43)</h4>
        <div className="bilan-table-wrap">
          <table className="bilan-table">
            <thead>
              <tr><th>Activité</th><th>Prévu</th><th>Obtenu</th><th>Écart</th><th>% Avan.</th><th>Montant prévu</th><th>Dép. cumulées</th><th>Balance</th></tr>
            </thead>
            <tbody>
              {(detailBilan.activites || []).map((a, idx) => (
                <tr key={idx}>
                  <td>{a.libelle}</td>
                  <td>{a.resultatsPrevus || '—'}</td>
                  <td>{a.resultatsObtenus || '—'}</td>
                  <td>{a.ecarts ?? '—'}</td>
                  <td>{a.pctAvancementPhysique != null ? `${a.pctAvancementPhysique}%` : '—'}</td>
                  <td>{formatMontant(a.montantPrevu)}</td>
                  <td>{formatMontant(a.depensesCumulees)}</td>
                  <td>{formatMontant(a.balancePrevisionnelle)}</td>
                </tr>
              ))}
              {(!detailBilan.activites || detailBilan.activites.length === 0) && (
                <tr><td colSpan={8}>Aucune activité renseignée.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {rubriques.length > 0 && ['NATIONAL', 'EXTERNE', 'GLOBAL'].map((categorie) => (
          <React.Fragment key={categorie}>
            <h4 className="form-section-title">{AVANCEMENT_BUDGET_TITRES[categorie]}</h4>
            <AvancementBudgetTable
              rubriques={rubriques}
              valeur={lecteurAvancementBudget(toAvancementBudget(detailBilan, null), categorie)}
            />
          </React.Fragment>
        ))}

        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={() => setView('list')}>Retour à la liste</button>
        </div>
      </div>
    );
  }

  return loading ? (
    <p>Chargement...</p>
  ) : listError ? (
    <div className="form-error">{listError}</div>
  ) : (
    <div>
      <div className="card-header-row">
        <h4 className="form-section-title bilan-list-title">Bilans existants</h4>
        {canEdit && (
          <button type="button" className="primary-btn" onClick={openCreate} disabled={planIncomplet}>
            + Nouveau bilan
          </button>
        )}
      </div>
      {canEdit && planIncomplet && (
        <p className="bilan-plan-empty">
          Complétez d'abord le plan du projet (Activités, Calendrier budgétaire) dans l'onglet Info Générales avant de créer un bilan.
        </p>
      )}
      {actionError && <div className="form-error">{actionError}</div>}
      <div className="bilan-table-wrap">
        <table className="bilan-table">
          <thead><tr><th>Exercice</th><th>Démarrage</th><th>Écoulé/Restant</th><th></th></tr></thead>
          <tbody>
            {bilans.map((b) => (
              <tr key={b.id}>
                <td>{b.exerciceLibelle}</td>
                <td>{formatDateFr(b.dateDemarrageEffective)}</td>
                <td>{b.tempsEcouleMois ?? '—'} / {b.tempsRestantMois ?? '—'} mois</td>
                <td className="fiop-row-actions">
                  <button type="button" className="mini-btn" onClick={() => openDetail(b)}>Voir</button>
                  {canEdit && <button type="button" className="mini-btn" onClick={() => openEdit(b)}>Modifier</button>}
                  {canEdit && <button type="button" className="mini-btn danger" onClick={() => handleDelete(b)}>Supprimer</button>}
                </td>
              </tr>
            ))}
            {bilans.length === 0 && (
              <tr><td colSpan={4}>Aucun bilan d'exécution pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
