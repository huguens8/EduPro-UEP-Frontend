import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';

export const BILAN_EDIT_ROLES = ['Porteur_PROJET', 'SUPERVISEUR_UEP'];

export const COUNTRY_CODES = [
  { code: '+509', label: 'Haïti (+509)' },
  { code: '+1', label: 'États-Unis / Canada / Rép. Dominicaine (+1)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+34', label: 'Espagne (+34)' },
  { code: '+44', label: 'Royaume-Uni (+44)' },
  { code: '+49', label: 'Allemagne (+49)' },
  { code: '+52', label: 'Mexique (+52)' },
  { code: '+55', label: 'Brésil (+55)' },
  { code: '+57', label: 'Colombie (+57)' },
  { code: '+81', label: 'Japon (+81)' },
];

export function formatDateFr(isoDate) {
  if (!isoDate) return '—';
  // Reformatage direct de la chaîne "AAAA-MM-JJ" : new Date() interpréterait
  // une date sans heure comme minuit UTC, ce qui décale d'un jour dans les
  // fuseaux horaires en arrière (ex. 2026-09-13 affiché comme 12/09/2026).
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('fr-FR');
}

// Le code projet affiché à l'écran est toujours "FIOP-<id>" (voir ProjetService.creer) : on
// accepte donc aussi bien "23" que "FIOP-23" dans la recherche par identifiant.
export function parseFiopSearchId(raw) {
  const trimmed = (raw || '').trim();
  const sansPrefixe = trimmed.replace(/^FIOP-/i, '');
  return /^\d+$/.test(sansPrefixe) ? sansPrefixe : null;
}

export function formatMontant(value) {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '0,00';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDateTimeFr(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export const ECHELON_TERRITORIAL_OPTIONS = [
  'Inter-Départemental', 'Départemental', 'Arrondissement', 'Communal', 'Inter-Communal', 'Section Communale',
];

export const PHASE_ACTUELLE_OPTIONS = ['Elaboration', 'Planification', 'Execution', 'Evaluation Impact'];

export const EMPTY_INTERVENANT = { nomCharge: '', telephone: '', courriel: '' };

export const INTERVENANT_KEYS = ['supervision', 'execution', 'bailleur', 'agence1', 'agence2'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMPTY_ACTIVITE_PLAN = {
  libelle: '', uniteResultat: '', quantiteResultatAttendu: '', coutUnitaire: '',
  ressourcesNationales: '', ressourcesExternes: '',
  coutAnnee1: '', coutAnnee2: '', coutAnnee3: '', coutAnnee4: '', coutAnnee5: '',
  dureeAnnee1: '', dureeAnnee2: '', dureeAnnee3: '', dureeAnnee4: '', dureeAnnee5: '',
};
export const EMPTY_RUBRIQUE_CALENDRIER = {
  idRubrique: '', ordreActivites: '',
  montantAnnee1: '', montantAnnee2: '', montantAnnee3: '', montantAnnee4: '', montantAnnee5: '',
};
export const EMPTY_COUT_RECURRENT = {
  idRubrique: '', montantAnnee1: '', montantAnnee2: '', montantAnnee3: '', montantAnnee4: '', montantAnnee5: '',
};
export const EMPTY_SOURCE_PLAN = {
  idSource: '', previsionTotal: '', ptiAnnee1: '', ptiAnnee2: '', ptiAnnee3: '', ptiAnnee4: '', ptiAnnee5: '',
};
export const EMPTY_PIP_ANNUEL = { idExercice: '', budgetPrevisionnel: '', budgetAlloue: '' };

// §29 du canevas : ordre et regroupement fixes (Ressources Nationales puis Externes), et "Type"
// (Public/Prêt/Don/ONG) — non exposé par la table de référence en base, donc repris tel quel du
// classeur ici, par libellé de source.
export const SOURCES_FINANCEMENT_META = [
  { libelle: 'Trésor public', groupe: 'Ressources Nationales', type: 'Public' },
  { libelle: 'AFC', groupe: 'Ressources Nationales', type: 'Public' },
  { libelle: 'Fonds Propres', groupe: 'Ressources Nationales', type: 'Public' },
  { libelle: 'Petrocaribe', groupe: 'Ressources Externes', type: 'Prêt' },
  { libelle: 'Bilatéral', groupe: 'Ressources Externes', type: 'Don' },
  { libelle: 'Multilatéral', groupe: 'Ressources Externes', type: 'Prêt' },
  { libelle: 'Privé', groupe: 'Ressources Externes', type: 'ONG' },
];
const PTI_FIELD_KEYS = ['ptiAnnee1', 'ptiAnnee2', 'ptiAnnee3', 'ptiAnnee4', 'ptiAnnee5'];

export function matchSourceMeta(libelle) {
  const norm = (s) => (s || '').trim().toLowerCase();
  return SOURCES_FINANCEMENT_META.find((m) => norm(m.libelle) === norm(libelle));
}

// §28 du canevas : libellés fixes des "Voies et Moyens" (pas une table de référence — identique
// côté backend, voir ProjetService.VOIES_MOYENS_BUDGET) et des 4 phases en colonnes.
export const VOIES_MOYENS_BUDGET = [
  '1-Dépenses de Personnels',
  '2-Serv. et Charges Diverses',
  '3-Achat Biens Consom. et Petit Matériel',
  '4-Immobilisations Corporelles',
  '5-Immobilisations Incorporelles',
];
export const PHASES_BUDGET_OPTIONS = ['Elaboration', 'Planification', 'Exécution', "Evaluation d'Impact"];
const PHASE_BUDGET_FIELD_KEYS = ['montantElaboration', 'montantPlanification', 'montantExecution', 'montantEvaluationImpact'];
export const EMPTY_INTRANT_BUDGET_PHASE = {
  voieMoyen: '', montantElaboration: '', montantPlanification: '', montantExecution: '', montantEvaluationImpact: '',
};

export const EMPTY_FORM = {
  titre: '',
  dureeTotaleMois: '',
  coutTotalGourde: '',
  numeroCompteBancaire: '',
  typeInvestissement: '',
  nomChargeProjet: '',
  telephoneChargeProjet: '',
  courrielChargeProjet: '',
  justification: '',
  effetsAttendus: '',
  indicateursResultats: [''],
  extrants: [''],
  // Les lignes sont complétées automatiquement à partir des 5 "Voies et Moyens" fixes
  // (voir IntrantsBudgetPhaseFields) plutôt que saisies une à une comme les autres listes.
  intrantsBudgetPhases: [],
  idDepartement: '',
  idArrondissement: '',
  idCommune: '',
  idSectionCommunale: '',
  habitationLocaliteQuartier: '',
  localisationGps: '',
  codeExterneBailleur: '',
  idGrandChantier: '',
  idProgramme: '',
  idSousProgramme: '',
  idExerciceCreation: '',
  projetPsdh: '',
  ciblePrioritaireGvt: false,
  echelonTerritorial: '',
  ministereTutelle: 'MENFP',
  phasesActuelles: [],
  aspectsLegaux: [''],
  aspectsInstitutionnels: [''],
  populationEnfantsGarcons: '',
  populationEnfantsFilles: '',
  populationHommes: '',
  populationFemmes: '',
  emploiPendantHomme: '',
  emploiPendantFemme: '',
  emploiApresHomme: '',
  emploiApresFemme: '',
  supervision: { ...EMPTY_INTERVENANT },
  execution: { ...EMPTY_INTERVENANT },
  bailleur: { ...EMPTY_INTERVENANT },
  agence1: { ...EMPTY_INTERVENANT },
  agence2: { ...EMPTY_INTERVENANT },
  activites: [{ ...EMPTY_ACTIVITE_PLAN }],
  // Les lignes sont complétées automatiquement à partir des rubriques principales de référence
  // (voir CalendrierRubriquesFields) plutôt que saisies une à une comme les autres listes.
  calendrierRubriques: [],
  coutsRecurrents: [],
  sourcesFinancement: [{ ...EMPTY_SOURCE_PLAN }],
  pipAnnuel: [1, 2, 3, 4, 5].map(() => ({ ...EMPTY_PIP_ANNUEL })),
};

export const STATUT_META = {
  BROUILLON: { label: 'Brouillon', cls: 'statut-brouillon' },
  SOUMIS_SUPERVISEUR_UEP: { label: 'Soumis (UEP)', cls: 'statut-soumis' },
  REJETE_UEP: { label: 'Retourné (UEP)', cls: 'statut-rejete' },
  VALIDE_ACTIF: { label: 'Validé (UEP) — traité', cls: 'statut-approuve' },
  TRANSMIS_MPCE: { label: 'Transmis au MPCE', cls: 'statut-approuve' },
};

// Projet traité : FIOP validé par l'UEP, transmis ou non au MPCE (StatutFiop.estTraite côté serveur).
export const STATUTS_TRAITES = ['VALIDE_ACTIF', 'TRANSMIS_MPCE'];
export function estTraite(statut) {
  return STATUTS_TRAITES.includes(statut);
}

export function toFormValues(fiop) {
  return {
    titre: fiop.titre || '',
    dureeTotaleMois: fiop.dureeTotaleMois ?? '',
    coutTotalGourde: fiop.coutTotalGourde ?? '',
    numeroCompteBancaire: fiop.numeroCompteBancaire || '',
    typeInvestissement: fiop.typeInvestissement || '',
    nomChargeProjet: fiop.nomChargeProjet || '',
    telephoneChargeProjet: fiop.telephoneChargeProjet || '',
    courrielChargeProjet: fiop.courrielChargeProjet || '',
    justification: fiop.justification || '',
    effetsAttendus: fiop.effetsAttendus || '',
    indicateursResultats: fiop.indicateursResultats && fiop.indicateursResultats.length > 0 ? fiop.indicateursResultats : [''],
    extrants: fiop.extrants && fiop.extrants.length > 0 ? fiop.extrants : [''],
    intrantsBudgetPhases: (fiop.intrantsBudgetPhases || []).map((l) => ({
      voieMoyen: l.voieMoyen,
      montantElaboration: l.montantElaboration ?? '',
      montantPlanification: l.montantPlanification ?? '',
      montantExecution: l.montantExecution ?? '',
      montantEvaluationImpact: l.montantEvaluationImpact ?? '',
    })),
    idDepartement: fiop.idDepartement || '',
    idArrondissement: fiop.idArrondissement || '',
    idCommune: fiop.idCommune || '',
    idSectionCommunale: fiop.idSectionCommunale || '',
    habitationLocaliteQuartier: fiop.habitationLocaliteQuartier || '',
    localisationGps: fiop.localisationGps || '',
    codeExterneBailleur: fiop.codeExterneBailleur || '',
    idGrandChantier: fiop.idGrandChantier ?? '',
    idProgramme: fiop.idProgramme ?? '',
    idSousProgramme: fiop.idSousProgramme ?? '',
    idExerciceCreation: fiop.idExerciceCreation ?? '',
    projetPsdh: fiop.projetPsdh || '',
    ciblePrioritaireGvt: Boolean(fiop.ciblePrioritaireGvt),
    echelonTerritorial: fiop.echelonTerritorial || '',
    ministereTutelle: fiop.ministereTutelle || 'MENFP',
    phasesActuelles: Array.isArray(fiop.phasesActuelles) ? fiop.phasesActuelles : [],
    aspectsLegaux: fiop.aspectsLegaux && fiop.aspectsLegaux.length > 0 ? fiop.aspectsLegaux : [''],
    aspectsInstitutionnels: fiop.aspectsInstitutionnels && fiop.aspectsInstitutionnels.length > 0 ? fiop.aspectsInstitutionnels : [''],
    populationEnfantsGarcons: fiop.populationEnfantsGarcons ?? '',
    populationEnfantsFilles: fiop.populationEnfantsFilles ?? '',
    populationHommes: fiop.populationHommes ?? '',
    populationFemmes: fiop.populationFemmes ?? '',
    emploiPendantHomme: fiop.emploiPendantHomme ?? '',
    emploiPendantFemme: fiop.emploiPendantFemme ?? '',
    emploiApresHomme: fiop.emploiApresHomme ?? '',
    emploiApresFemme: fiop.emploiApresFemme ?? '',
    supervision: fiop.supervision || { ...EMPTY_INTERVENANT },
    execution: fiop.execution || { ...EMPTY_INTERVENANT },
    bailleur: fiop.bailleur || { ...EMPTY_INTERVENANT },
    agence1: fiop.agence1 || { ...EMPTY_INTERVENANT },
    agence2: fiop.agence2 || { ...EMPTY_INTERVENANT },
    activites: fiop.activites && fiop.activites.length > 0
      ? fiop.activites.map((a) => ({
        libelle: a.libelle || '',
        uniteResultat: a.uniteResultat || '',
        quantiteResultatAttendu: a.quantiteResultatAttendu ?? '',
        coutUnitaire: a.coutUnitaire ?? '',
        ressourcesNationales: a.ressourcesNationales ?? '',
        ressourcesExternes: a.ressourcesExternes ?? '',
        coutAnnee1: a.coutAnnee1 ?? '',
        coutAnnee2: a.coutAnnee2 ?? '',
        coutAnnee3: a.coutAnnee3 ?? '',
        coutAnnee4: a.coutAnnee4 ?? '',
        coutAnnee5: a.coutAnnee5 ?? '',
        dureeAnnee1: a.dureeAnnee1 || '',
        dureeAnnee2: a.dureeAnnee2 || '',
        dureeAnnee3: a.dureeAnnee3 || '',
        dureeAnnee4: a.dureeAnnee4 || '',
        dureeAnnee5: a.dureeAnnee5 || '',
      }))
      : [{ ...EMPTY_ACTIVITE_PLAN }],
    calendrierRubriques: (fiop.calendrierRubriques || []).map((r) => ({
      idRubrique: r.idRubrique,
      ordreActivites: r.ordreActivites || '',
      montantAnnee1: r.montantAnnee1 ?? '',
      montantAnnee2: r.montantAnnee2 ?? '',
      montantAnnee3: r.montantAnnee3 ?? '',
      montantAnnee4: r.montantAnnee4 ?? '',
      montantAnnee5: r.montantAnnee5 ?? '',
    })),
    coutsRecurrents: (fiop.coutsRecurrents || []).map((r) => ({
      idRubrique: r.idRubrique,
      montantAnnee1: r.montantAnnee1 ?? '',
      montantAnnee2: r.montantAnnee2 ?? '',
      montantAnnee3: r.montantAnnee3 ?? '',
      montantAnnee4: r.montantAnnee4 ?? '',
      montantAnnee5: r.montantAnnee5 ?? '',
    })),
    sourcesFinancement: fiop.sourcesFinancement && fiop.sourcesFinancement.length > 0
      ? fiop.sourcesFinancement.map((s) => ({
        idSource: s.idSource,
        previsionTotal: s.previsionTotal ?? '',
        ptiAnnee1: s.ptiAnnee1 ?? '',
        ptiAnnee2: s.ptiAnnee2 ?? '',
        ptiAnnee3: s.ptiAnnee3 ?? '',
        ptiAnnee4: s.ptiAnnee4 ?? '',
        ptiAnnee5: s.ptiAnnee5 ?? '',
      }))
      : [{ ...EMPTY_SOURCE_PLAN }],
    pipAnnuel: [1, 2, 3, 4, 5].map((annee) => {
      const ligne = (fiop.pipAnnuel || []).find((p) => p.anneeNumero === annee);
      return ligne ? {
        idExercice: ligne.idExercice ?? '',
        budgetPrevisionnel: ligne.budgetPrevisionnel ?? '',
        budgetAlloue: ligne.budgetAlloue ?? '',
      } : { ...EMPTY_PIP_ANNUEL };
    }),
  };
}

export function StatutBadge({ statut }) {
  const meta = STATUT_META[statut] || { label: statut, cls: '' };
  return <span className={`statut-badge ${meta.cls}`}>{meta.label}</span>;
}

export function StatCard({ value, label, tone }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function parsePhone(value) {
  const parts = (value || '').split(' ');
  if (parts.length >= 2 && COUNTRY_CODES.some((c) => c.code === parts[0])) {
    return { country: parts[0], local: parts.slice(1).join(' ') };
  }
  return { country: '+509', local: value || '' };
}

function PhoneField({ value, onChange }) {
  const { country, local } = parsePhone(value);

  const setCountry = (newCountry) => onChange(`${newCountry} ${local}`.trim());
  const setLocal = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length <= 4 ? digits : `${digits.slice(0, 4)}-${digits.slice(4)}`;
    onChange(`${country} ${formatted}`.trim());
  };

  return (
    <div className="phone-field">
      <select value={country} onChange={(e) => setCountry(e.target.value)}>
        {COUNTRY_CODES.map((c) => (
          <option key={c.code + c.label} value={c.code}>{c.label}</option>
        ))}
      </select>
      <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="3712-3456" maxLength={9} />
    </div>
  );
}

function GeoAddressFields({ form, setForm }) {
  const [departements, setDepartements] = useState([]);
  const [arrondissements, setArrondissements] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    apiClient.get('/geo/departements').then(({ data }) => setDepartements(data)).catch(() => setDepartements([]));
  }, []);

  useEffect(() => {
    if (!form.idDepartement) { setArrondissements([]); return; }
    apiClient.get('/geo/arrondissements', { params: { departementId: form.idDepartement } })
      .then(({ data }) => setArrondissements(data)).catch(() => setArrondissements([]));
  }, [form.idDepartement]);

  useEffect(() => {
    if (!form.idArrondissement) { setCommunes([]); return; }
    apiClient.get('/geo/communes', { params: { arrondissementId: form.idArrondissement } })
      .then(({ data }) => setCommunes(data)).catch(() => setCommunes([]));
  }, [form.idArrondissement]);

  useEffect(() => {
    if (!form.idCommune) { setSections([]); return; }
    apiClient.get('/geo/sections-communales', { params: { communeId: form.idCommune } })
      .then(({ data }) => setSections(data)).catch(() => setSections([]));
  }, [form.idCommune]);

  const onDepartementChange = (e) => {
    const idDepartement = e.target.value;
    setForm((prev) => ({ ...prev, idDepartement, idArrondissement: '', idCommune: '', idSectionCommunale: '' }));
  };
  const onArrondissementChange = (e) => {
    const idArrondissement = e.target.value;
    setForm((prev) => ({ ...prev, idArrondissement, idCommune: '', idSectionCommunale: '' }));
  };
  const onCommuneChange = (e) => {
    const idCommune = e.target.value;
    setForm((prev) => ({ ...prev, idCommune, idSectionCommunale: '' }));
  };
  const onSectionChange = (e) => setForm((prev) => ({ ...prev, idSectionCommunale: e.target.value }));

  return (
    <>
      <div className="field">
        <label>Coordonnées GPS</label>
        <input
          type="text"
          placeholder="ex. 18.5392, -72.3364"
          value={form.localisationGps}
          onChange={(e) => setForm((prev) => ({ ...prev, localisationGps: e.target.value }))}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Département</label>
          <select value={form.idDepartement} onChange={onDepartementChange}>
            <option value="">—</option>
            {departements.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Arrondissement</label>
          <select value={form.idArrondissement} onChange={onArrondissementChange} disabled={!form.idDepartement}>
            <option value="">—</option>
            {arrondissements.map((a) => <option key={a.id} value={a.id}>{a.libelle}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Commune</label>
          <select value={form.idCommune} onChange={onCommuneChange} disabled={!form.idArrondissement}>
            <option value="">—</option>
            {communes.map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Section communale</label>
          <select value={form.idSectionCommunale} onChange={onSectionChange} disabled={!form.idCommune}>
            <option value="">—</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
          {form.idCommune && sections.length === 0 && (
            <span className="field-hint">Aucune section communale enregistrée pour cette commune.</span>
          )}
        </div>
      </div>
      <div className="field">
        <label>Habitation / Localité / Quartier</label>
        <input
          type="text"
          value={form.habitationLocaliteQuartier}
          onChange={(e) => setForm((prev) => ({ ...prev, habitationLocaliteQuartier: e.target.value }))}
        />
      </div>
    </>
  );
}

function ClassificationFields({ form, setForm, errors }) {
  const [grandChantiers, setGrandChantiers] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [sousProgrammes, setSousProgrammes] = useState([]);
  const [exercices, setExercices] = useState([]);

  useEffect(() => {
    apiClient.get('/reference/grand-chantiers').then(({ data }) => setGrandChantiers(data)).catch(() => setGrandChantiers([]));
    apiClient.get('/reference/exercices').then(({ data }) => setExercices(data)).catch(() => setExercices([]));
  }, []);

  useEffect(() => {
    if (!form.idGrandChantier) { setProgrammes([]); return; }
    apiClient.get('/reference/programmes', { params: { grandChantierId: form.idGrandChantier } })
      .then(({ data }) => setProgrammes(data)).catch(() => setProgrammes([]));
  }, [form.idGrandChantier]);

  useEffect(() => {
    if (!form.idProgramme) { setSousProgrammes([]); return; }
    apiClient.get('/reference/sous-programmes', { params: { programmeId: form.idProgramme } })
      .then(({ data }) => setSousProgrammes(data)).catch(() => setSousProgrammes([]));
  }, [form.idProgramme]);

  const onGrandChantierChange = (e) => {
    const idGrandChantier = e.target.value;
    setForm((prev) => ({ ...prev, idGrandChantier, idProgramme: '', idSousProgramme: '' }));
  };
  const onProgrammeChange = (e) => {
    const idProgramme = e.target.value;
    setForm((prev) => ({ ...prev, idProgramme, idSousProgramme: '' }));
  };

  return (
    <>
      <div className="field-row">
        <div className="field">
          <label>Grand Chantier <span className="required-mark">*</span></label>
          <select
            value={form.idGrandChantier}
            onChange={onGrandChantierChange}
            className={errors.idGrandChantier ? 'field-invalid' : undefined}
          >
            <option value="">—</option>
            {grandChantiers.map((g) => <option key={g.id} value={g.id}>{g.libelle}</option>)}
          </select>
          {errors.idGrandChantier && <span className="field-error">{errors.idGrandChantier}</span>}
        </div>
        <div className="field">
          <label>Programme <span className="required-mark">*</span></label>
          <select
            value={form.idProgramme}
            onChange={onProgrammeChange}
            disabled={!form.idGrandChantier}
            className={errors.idProgramme ? 'field-invalid' : undefined}
          >
            <option value="">—</option>
            {programmes.map((p) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
          </select>
          {errors.idProgramme && <span className="field-error">{errors.idProgramme}</span>}
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Sous-Programme</label>
          <select
            value={form.idSousProgramme}
            onChange={(e) => setForm((prev) => ({ ...prev, idSousProgramme: e.target.value }))}
            disabled={!form.idProgramme}
          >
            <option value="">—</option>
            {sousProgrammes.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Exercice de création</label>
          <select
            value={form.idExerciceCreation}
            onChange={(e) => setForm((prev) => ({ ...prev, idExerciceCreation: e.target.value }))}
          >
            <option value="">—</option>
            {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}

// Actions partagées par les 3 tableaux d'activités (§31/32/33) : les 3 listent les mêmes lignes
// (form.activites), seul §31 (CalendrierActivitesTable) permet d'ajouter/retirer une activité —
// §32 et §33 se contentent d'afficher le libellé en lecture seule et d'éditer leurs propres colonnes.
function useActivitesListActions(form, setForm) {
  const items = form.activites && form.activites.length > 0 ? form.activites : [{ ...EMPTY_ACTIVITE_PLAN }];
  const update = (idx, field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = [...prev.activites];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, activites: next };
    });
  };
  const add = () => setForm((prev) => ({ ...prev, activites: [...prev.activites, { ...EMPTY_ACTIVITE_PLAN }] }));
  const remove = (idx) => setForm((prev) => ({ ...prev, activites: prev.activites.filter((_, i) => i !== idx) }));
  return { items, update, add, remove };
}

export function ordreSequentiel(idx) {
  return String(idx + 1).padStart(2, '0');
}

const ANNEE_RANGS = [1, 2, 3, 4, 5];

function activiteCoutTotalAnnuel(a) {
  return ANNEE_RANGS.reduce((sum, n) => sum + (Number(a[`coutAnnee${n}`]) || 0), 0);
}

// §31 du canevas : "Calendrier annuel prévisionnel d'exécution des activités du projet" — la seule
// des 3 tables à porter l'ajout/retrait d'activités, puisque les 3 partagent la même liste.
function CalendrierActivitesTable({ form, setForm }) {
  const { items, update, add, remove } = useActivitesListActions(form, setForm);
  const totalGeneral = items.reduce((sum, a) => sum + activiteCoutTotalAnnuel(a), 0);
  const totalAnnee = (n) => items.reduce((sum, a) => sum + (Number(a[`coutAnnee${n}`]) || 0), 0);
  const poids = (a) => {
    const t = activiteCoutTotalAnnuel(a);
    return totalGeneral > 0 ? `${(t / totalGeneral * 100).toFixed(2)}%` : '—';
  };

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table activites-table">
        <thead>
          <tr>
            <th rowSpan={2}># d'ordre</th>
            <th rowSpan={2}>Activités</th>
            <th colSpan={ANNEE_RANGS.length}>Coût du projet</th>
            <th rowSpan={2}>Coût Total par Activité</th>
            <th rowSpan={2}>Poids des Activités</th>
            <th rowSpan={2}></th>
          </tr>
          <tr>
            {ANNEE_RANGS.map((n) => <th key={n}>Année {n}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((a, idx) => (
            <tr key={idx}>
              <td className="rubrique-total-cell">{ordreSequentiel(idx)}</td>
              <td>
                <input type="text" value={a.libelle} onChange={update(idx, 'libelle')} placeholder="ex. Construction de salles de classe" />
              </td>
              {ANNEE_RANGS.map((n) => (
                <td key={n}><input type="number" value={a[`coutAnnee${n}`]} onChange={update(idx, `coutAnnee${n}`)} /></td>
              ))}
              <td className="rubrique-total-cell">{formatMontant(activiteCoutTotalAnnuel(a))}</td>
              <td className="rubrique-total-cell">{poids(a)}</td>
              <td>
                {items.length > 1 && (
                  <button type="button" className="mini-btn danger" onClick={() => remove(idx)}>× Retirer</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Coût Total d'Exécution des Activités par Année</td>
            {ANNEE_RANGS.map((n) => <td key={n}>{formatMontant(totalAnnee(n))}</td>)}
            <td>{formatMontant(totalGeneral)}</td>
            <td>{totalGeneral > 0 ? '100,00%' : '—'}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      <button type="button" className="link-btn" onClick={add}>+ Ajouter une activité</button>
    </div>
  );
}

// §32 du canevas : "Chronogramme d'exécution annuelle des activités du projet" — même liste
// d'activités que §31 (lecture seule ici), avec la durée de chacune sur les 5 années.
function ChronogrammeActivitesTable({ form, setForm }) {
  const { items, update } = useActivitesListActions(form, setForm);

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table activites-table">
        <thead>
          <tr>
            <th rowSpan={2}># d'ordre</th>
            <th rowSpan={2}>Activités</th>
            <th colSpan={ANNEE_RANGS.length}>Durée des Activités</th>
          </tr>
          <tr>
            {ANNEE_RANGS.map((n) => <th key={n}>Année {n}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((a, idx) => (
            <tr key={idx}>
              <td className="rubrique-total-cell">{ordreSequentiel(idx)}</td>
              <td className="rubrique-label-cell">{a.libelle || '—'}</td>
              {ANNEE_RANGS.map((n) => (
                <td key={n}>
                  <input type="text" value={a[`dureeAnnee${n}`]} onChange={update(idx, `dureeAnnee${n}`)} placeholder="ex. 6 mois" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// §33 du canevas : "Résultats attendus par activité" — même liste d'activités que §31 (lecture
// seule ici) ; le Total (Quantité × Coût unitaire) est calculé côté serveur (voir FiopResponse).
function ResultatsAttendusTable({ form, setForm }) {
  const { items, update, add, remove } = useActivitesListActions(form, setForm);
  const total = (a) => (Number(a.quantiteResultatAttendu) || 0) * (Number(a.coutUnitaire) || 0);
  const totalGeneral = items.reduce((sum, a) => sum + total(a), 0);
  const totalNationales = items.reduce((sum, a) => sum + (Number(a.ressourcesNationales) || 0), 0);
  const totalExternes = items.reduce((sum, a) => sum + (Number(a.ressourcesExternes) || 0), 0);

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table activites-table">
        <thead>
          <tr>
            <th rowSpan={2}># d'ordre</th>
            <th rowSpan={2}>Activités</th>
            <th colSpan={2}>Résultats</th>
            <th colSpan={2}>Cout</th>
            <th colSpan={2}>Ressources</th>
            <th rowSpan={2}></th>
          </tr>
          <tr>
            <th>Unité</th>
            <th>Quantité</th>
            <th>Unitaire</th>
            <th>Total</th>
            <th>Nationales</th>
            <th>Externes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a, idx) => (
            <tr key={idx}>
              <td className="rubrique-total-cell">{ordreSequentiel(idx)}</td>
              <td className="rubrique-label-cell">{a.libelle || '—'}</td>
              <td><input type="text" value={a.uniteResultat} onChange={update(idx, 'uniteResultat')} placeholder="ex. salles" /></td>
              <td><input type="number" value={a.quantiteResultatAttendu} onChange={update(idx, 'quantiteResultatAttendu')} /></td>
              <td><input type="number" value={a.coutUnitaire} onChange={update(idx, 'coutUnitaire')} /></td>
              <td className="rubrique-total-cell">{formatMontant(total(a))}</td>
              <td><input type="number" value={a.ressourcesNationales} onChange={update(idx, 'ressourcesNationales')} /></td>
              <td><input type="number" value={a.ressourcesExternes} onChange={update(idx, 'ressourcesExternes')} /></td>
              <td>
                {items.length > 1 && (
                  <button type="button" className="mini-btn danger" onClick={() => remove(idx)}>× Retirer</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5}>Total Général</td>
            <td>{formatMontant(totalGeneral)}</td>
            <td>{formatMontant(totalNationales)}</td>
            <td>{formatMontant(totalExternes)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      <button type="button" className="link-btn" onClick={add}>+ Ajouter une activité</button>
    </div>
  );
}

function ligneTotal(ligne) {
  return ANNEE_RANGS.reduce((sum, n) => sum + (Number(ligne[`montantAnnee${n}`]) || 0), 0);
}

// Reproduit le tableau §34 du canevas FIOP tel quel : les 6 rubriques principales (en gras, non
// éditables) affichent le sous-total de leurs sous-rubriques (éditables, seules lignes saisissables
// — comme "11-Rémunérations principales" sous "1-Dépenses de Personnels"), avec Année 1-5 en
// colonnes, Total par rubrique et Poids des Rubriques calculés automatiquement.
function CalendrierRubriquesFields({ form, setForm }) {
  const [rubriques, setRubriques] = useState([]);
  useEffect(() => {
    apiClient.get('/reference/rubriques-budgetaires-hierarchie').then(({ data }) => setRubriques(data)).catch(() => setRubriques([]));
  }, []);

  const principales = rubriques.filter((ru) => !ru.idRubriqueParent);
  const sousRubriques = rubriques.filter((ru) => ru.idRubriqueParent);

  useEffect(() => {
    if (sousRubriques.length === 0) return;
    setForm((prev) => {
      const existantes = new Map(prev.calendrierRubriques.map((r) => [String(r.idRubrique), r]));
      const completes = sousRubriques.map((ru) => existantes.get(String(ru.id)) || { ...EMPTY_RUBRIQUE_CALENDRIER, idRubrique: ru.id });
      const inchange = completes.length === prev.calendrierRubriques.length
        && completes.every((r, i) => r === prev.calendrierRubriques[i]);
      return inchange ? prev : { ...prev, calendrierRubriques: completes };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rubriques.length, setForm]);

  const update = (idx, field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = [...prev.calendrierRubriques];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, calendrierRubriques: next };
    });
  };

  const totalGeneral = form.calendrierRubriques.reduce((sum, r) => sum + ligneTotal(r), 0);
  const totalAnnee = (n) => form.calendrierRubriques.reduce((sum, r) => sum + (Number(r[`montantAnnee${n}`]) || 0), 0);
  const poids = (r) => {
    const t = ligneTotal(r);
    return totalGeneral > 0 ? `${(t / totalGeneral * 100).toFixed(2)}%` : '—';
  };

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table">
        <thead>
          <tr>
            <th>Rubriques de dépenses</th>
            <th># d'ordre des Activités</th>
            {ANNEE_RANGS.map((n) => <th key={n}>Année {n}</th>)}
            <th>Cout Total par Rubrique</th>
            <th>Poids des Rubriques</th>
          </tr>
        </thead>
        <tbody>
          {principales.map((principale) => {
            const enfants = sousRubriques.filter((s) => s.idRubriqueParent === principale.id);
            const lignesEnfants = enfants
              .map((e) => form.calendrierRubriques.find((r) => String(r.idRubrique) === String(e.id)))
              .filter(Boolean);
            const sousTotalAnnee = (n) => lignesEnfants.reduce((sum, r) => sum + (Number(r[`montantAnnee${n}`]) || 0), 0);
            const sousTotal = lignesEnfants.reduce((sum, r) => sum + ligneTotal(r), 0);
            return (
              <React.Fragment key={principale.id}>
                <tr className="rubrique-principale-row">
                  <td className="rubrique-label-cell">{principale.libelle}</td>
                  <td></td>
                  {ANNEE_RANGS.map((n) => <td key={n}>{formatMontant(sousTotalAnnee(n))}</td>)}
                  <td className="rubrique-total-cell">{formatMontant(sousTotal)}</td>
                  <td className="rubrique-total-cell">{totalGeneral > 0 ? `${(sousTotal / totalGeneral * 100).toFixed(2)}%` : '—'}</td>
                </tr>
                {enfants.map((enfant) => {
                  const idx = form.calendrierRubriques.findIndex((r) => String(r.idRubrique) === String(enfant.id));
                  const ligne = form.calendrierRubriques[idx];
                  if (!ligne) return null;
                  return (
                    <tr key={enfant.id}>
                      <td className="rubrique-label-cell rubrique-sous-cell">{enfant.libelle}</td>
                      <td>
                        <input type="text" value={ligne.ordreActivites} onChange={update(idx, 'ordreActivites')} placeholder="ex. 01, 03" />
                      </td>
                      {ANNEE_RANGS.map((n) => (
                        <td key={n}>
                          <input type="number" value={ligne[`montantAnnee${n}`]} onChange={update(idx, `montantAnnee${n}`)} />
                        </td>
                      ))}
                      <td className="rubrique-total-cell">{formatMontant(ligneTotal(ligne))}</td>
                      <td className="rubrique-total-cell">{poids(ligne)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Total Général</td>
            {ANNEE_RANGS.map((n) => <td key={n}>{formatMontant(totalAnnee(n))}</td>)}
            <td>{formatMontant(totalGeneral)}</td>
            <td>{totalGeneral > 0 ? '100,00%' : '—'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// §35 du canevas : "Coûts récurrents du projet" (Budget de Fonctionnement Post Livrable) — les 6
// rubriques principales sont des lignes fixes (pas de détail par sous-rubrique, contrairement au
// §34), avec Année 1-5 et Total par rubrique calculés automatiquement.
function CoutsRecurrentsFields({ form, setForm }) {
  const [rubriques, setRubriques] = useState([]);
  useEffect(() => {
    apiClient.get('/reference/rubriques-budgetaires-principales').then(({ data }) => setRubriques(data)).catch(() => setRubriques([]));
  }, []);

  useEffect(() => {
    if (rubriques.length === 0) return;
    setForm((prev) => {
      const existantes = new Map(prev.coutsRecurrents.map((r) => [String(r.idRubrique), r]));
      const completes = rubriques.map((ru) => existantes.get(String(ru.id)) || { ...EMPTY_COUT_RECURRENT, idRubrique: ru.id });
      const inchange = completes.length === prev.coutsRecurrents.length
        && completes.every((r, i) => r === prev.coutsRecurrents[i]);
      return inchange ? prev : { ...prev, coutsRecurrents: completes };
    });
  }, [rubriques, setForm]);

  const update = (idx, field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = [...prev.coutsRecurrents];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, coutsRecurrents: next };
    });
  };

  const libelle = (idRubrique) => rubriques.find((ru) => String(ru.id) === String(idRubrique))?.libelle || '';
  const totalAnnee = (n) => form.coutsRecurrents.reduce((sum, r) => sum + (Number(r[`montantAnnee${n}`]) || 0), 0);
  const totalGeneral = form.coutsRecurrents.reduce((sum, r) => sum + ligneTotal(r), 0);

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table">
        <thead>
          <tr>
            <th>Rubriques de dépenses</th>
            {ANNEE_RANGS.map((n) => <th key={n}>Année {n}</th>)}
            <th>Total par rubrique</th>
          </tr>
        </thead>
        <tbody>
          {form.coutsRecurrents.map((r, idx) => (
            <tr key={r.idRubrique}>
              <td className="rubrique-label-cell">{libelle(r.idRubrique)}</td>
              {ANNEE_RANGS.map((n) => (
                <td key={n}>
                  <input type="number" value={r[`montantAnnee${n}`]} onChange={update(idx, `montantAnnee${n}`)} />
                </td>
              ))}
              <td className="rubrique-total-cell">{formatMontant(ligneTotal(r))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total par année</td>
            {ANNEE_RANGS.map((n) => <td key={n}>{formatMontant(totalAnnee(n))}</td>)}
            <td>{formatMontant(totalGeneral)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Regroupe les lignes consécutives par "groupe" (Ressources Nationales/Externes) et calcule, pour
// la première ligne de chaque groupe seulement, le rowSpan à appliquer à sa cellule "Ressources"
// — c'est ce qui reproduit la fusion de cellules du classeur Excel sans dupliquer le libellé.
export function groupSourcesFinancement(lignes, metaOf) {
  const spans = [];
  let i = 0;
  while (i < lignes.length) {
    const groupe = metaOf(lignes[i].idSource)?.groupe || 'Autres sources';
    let span = 1;
    while (i + span < lignes.length && (metaOf(lignes[i + span].idSource)?.groupe || 'Autres sources') === groupe) {
      span++;
    }
    spans[i] = { groupe, span };
    for (let j = 1; j < span; j++) spans[i + j] = null;
    i += span;
  }
  return spans;
}

// Reproduit le tableau §29 du canevas tel quel : les 7 sources de référence (Ressources Nationales
// puis Externes) sont des lignes fixes, avec Poids par Sources et PTI 1-5 calculés automatiquement.
function SourcesFinancementFields({ form, setForm }) {
  const [sources, setSources] = useState([]);
  useEffect(() => {
    apiClient.get('/reference/sources-financement').then(({ data }) => setSources(data)).catch(() => setSources([]));
  }, []);

  const libelleOf = (idSource) => sources.find((s) => String(s.id) === String(idSource))?.libelle || '';
  const metaOf = (idSource) => matchSourceMeta(libelleOf(idSource));

  useEffect(() => {
    if (sources.length === 0) return;
    setForm((prev) => {
      const rang = (s) => {
        const idx = SOURCES_FINANCEMENT_META.findIndex((m) => matchSourceMeta(s.libelle) === m);
        return idx === -1 ? SOURCES_FINANCEMENT_META.length : idx;
      };
      const triees = [...sources].sort((a, b) => rang(a) - rang(b));
      const existantes = new Map(prev.sourcesFinancement.map((s) => [String(s.idSource), s]));
      const completes = triees.map((s) => existantes.get(String(s.id)) || { ...EMPTY_SOURCE_PLAN, idSource: s.id });
      const inchange = completes.length === prev.sourcesFinancement.length
        && completes.every((s, i) => s === prev.sourcesFinancement[i]);
      return inchange ? prev : { ...prev, sourcesFinancement: completes };
    });
  }, [sources, setForm]);

  const update = (idx, field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = [...prev.sourcesFinancement];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, sourcesFinancement: next };
    });
  };

  const totalPrevision = form.sourcesFinancement.reduce((sum, s) => sum + (Number(s.previsionTotal) || 0), 0);
  const totalPti = (key) => form.sourcesFinancement.reduce((sum, s) => sum + (Number(s[key]) || 0), 0);
  const poidsPct = (s) => (totalPrevision > 0 ? (Number(s.previsionTotal) || 0) / totalPrevision * 100 : null);

  const groupSpans = groupSourcesFinancement(form.sourcesFinancement, metaOf);

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table sources-financement-table">
        <thead>
          <tr>
            <th rowSpan={2}>Ressources</th>
            <th rowSpan={2}>Sources</th>
            <th rowSpan={2}>Type</th>
            <th rowSpan={2}>Prévisions Total</th>
            <th rowSpan={2}>Poids par Sources</th>
            <th colSpan={PTI_FIELD_KEYS.length}>Programme Triennal d'Investissements</th>
          </tr>
          <tr>
            {PTI_FIELD_KEYS.map((key, i) => <th key={key}>PTI {i + 1}</th>)}
          </tr>
        </thead>
        <tbody>
          {form.sourcesFinancement.map((s, idx) => {
            const meta = metaOf(s.idSource);
            const pct = poidsPct(s);
            const span = groupSpans[idx];
            return (
              <tr key={s.idSource || idx}>
                {span && <td className="rubrique-label-cell sources-groupe-cell" rowSpan={span.span}>{span.groupe}</td>}
                <td className="rubrique-label-cell">{libelleOf(s.idSource)}</td>
                <td>{meta?.type || '—'}</td>
                <td><input type="number" value={s.previsionTotal} onChange={update(idx, 'previsionTotal')} /></td>
                <td className="rubrique-total-cell">{pct == null ? '—' : `${pct.toFixed(2)}%`}</td>
                {PTI_FIELD_KEYS.map((key) => (
                  <td key={key}><input type="number" value={s[key]} onChange={update(idx, key)} /></td>
                ))}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total</td>
            <td>{formatMontant(totalPrevision)}</td>
            <td>{totalPrevision > 0 ? '100,00%' : '—'}</td>
            {PTI_FIELD_KEYS.map((key) => <td key={key}>{formatMontant(totalPti(key))}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function DynamicList({ values, setValues, placeholder }) {
  const items = values && values.length > 0 ? values : [''];
  const update = (idx, val) => {
    const next = [...items];
    next[idx] = val;
    setValues(next);
  };
  const add = () => setValues([...items, '']);
  const remove = (idx) => setValues(items.filter((_, i) => i !== idx));

  return (
    <div className="dynamic-list">
      {items.map((v, idx) => (
        <div className="dynamic-row" key={idx}>
          <input type="text" value={v} placeholder={placeholder} onChange={(e) => update(idx, e.target.value)} />
          {items.length > 1 && (
            <button type="button" className="mini-btn danger" onClick={() => remove(idx)}>×</button>
          )}
        </div>
      ))}
      <button type="button" className="link-btn" onClick={add}>+ Ajouter</button>
    </div>
  );
}

function IntervenantFields({ label, value, onChange, errors, fieldKey }) {
  const v = value || EMPTY_INTERVENANT;
  const set = (field) => (val) => onChange({ ...v, [field]: val });

  return (
    <div className="intervenant-block">
      <h4>{label}</h4>
      <div className="field">
        <label>Nom du chargé</label>
        <input type="text" value={v.nomCharge} onChange={(e) => set('nomCharge')(e.target.value)} />
      </div>
      <IntervenantContactFields value={v} set={set} errors={errors} fieldKey={fieldKey} />
    </div>
  );
}

// Le bailleur de fonds n'est pas saisi librement : c'est un des PTF enregistrés dans
// « Partenaires (PTF) ». Le choix enregistre idPtf, ce qui rattache le projet au partenaire.
function BailleurFields({ value, onChange, errors, ptfs, ptfsError, onReloadPtfs }) {
  const v = value || EMPTY_INTERVENANT;
  const set = (field) => (val) => onChange({ ...v, [field]: val });
  const ancienBailleurLibre = !v.idPtf && String(v.nomCharge || '').trim();

  const choisirPtf = (e) => {
    const id = e.target.value ? Number(e.target.value) : null;
    const ptf = ptfs.find((p) => p.id === id);
    if (!ptf) {
      onChange({ ...EMPTY_INTERVENANT });
      return;
    }
    // Les coordonnées de la fiche PTF sont proposées si l'opérateur n'en a pas encore saisi.
    onChange({
      idPtf: ptf.id,
      nomCharge: ptf.nom,
      telephone: v.telephone || ptf.telephone || '',
      courriel: v.courriel || ptf.courriel || '',
    });
  };

  return (
    <div className="intervenant-block">
      <h4>Bailleur de fonds</h4>
      <div className="field">
        <label>Partenaire (PTF) qui finance le projet</label>
        <select
          value={v.idPtf || ''}
          onChange={choisirPtf}
          className={errors.bailleur ? 'field-invalid' : undefined}
        >
          <option value="">— Aucun PTF ne finance ce projet —</option>
          {ptfs.map((p) => (
            <option key={p.id} value={p.id}>{p.nom}{p.pays ? ` (${p.pays})` : ''}</option>
          ))}
        </select>
        {errors.bailleur && <span className="field-error">{errors.bailleur}</span>}
        {ancienBailleurLibre && (
          <span className="field-error">
            Bailleur saisi auparavant en texte libre : « {v.nomCharge} ». Choisissez le partenaire
            correspondant dans la liste.
          </span>
        )}
        {ptfsError && <span className="field-error">{ptfsError}</span>}
        <span className="field-hint">
          Partenaire absent de la liste ?{' '}
          <a href="/partenaires" target="_blank" rel="noreferrer">Enregistrez-le dans Partenaires (PTF)</a>
          {' '}puis{' '}
          <button type="button" className="link-btn" onClick={onReloadPtfs}>actualisez la liste</button>.
        </span>
      </div>
      {v.idPtf && <IntervenantContactFields value={v} set={set} errors={errors} fieldKey="bailleur" />}
    </div>
  );
}

function IntervenantContactFields({ value, set, errors, fieldKey }) {
  const v = value;
  const courrielError = errors && errors[`${fieldKey}.courriel`];

  return (
    <div className="field-row">
      <div className="field">
        <label>Téléphone</label>
        <PhoneField value={v.telephone} onChange={set('telephone')} />
      </div>
      <div className="field">
        <label>Courriel</label>
        <input
          type="email"
          placeholder="nom@exemple.com"
          value={v.courriel}
          onChange={(e) => set('courriel')(e.target.value)}
          className={courrielError ? 'field-invalid' : undefined}
        />
        {courrielError && <span className="field-error">{courrielError}</span>}
      </div>
    </div>
  );
}

// Étape 1 du canevas (Titre, §3, §5-9) : ordre strictement repris de la feuille "Info Générales"
// (Titre → Code externe → Grand Chantier → Programme → Sous-Programme → Projet PSDH → Cible
// prioritaire). Le Ministère de tutelle et le Responsable ont été déplacés à l'étape §14.
function IdentificationStep({ form, setForm, errors }) {
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  // Le champ "Projet PSDH" reprend automatiquement le titre au fur et à mesure de la saisie.
  const setTitre = (e) => {
    const titre = e.target.value;
    setForm((prev) => ({ ...prev, titre, projetPsdh: titre }));
  };

  return (
    <>
      <div className="field">
        <label>Titre du projet <span className="required-mark">*</span></label>
        <input
          type="text"
          value={form.titre}
          onChange={setTitre}
          className={errors.titre ? 'field-invalid' : undefined}
        />
        {errors.titre && <span className="field-error">{errors.titre}</span>}
      </div>
      <div className="field">
        <label>Code externe (bailleur)</label>
        <input type="text" value={form.codeExterneBailleur} onChange={set('codeExterneBailleur')} />
      </div>
      <ClassificationFields form={form} setForm={setForm} errors={errors} />
      <div className="field-row">
        <div className="field">
          <label>Projet PSDH</label>
          <input type="text" value={form.projetPsdh} onChange={set('projetPsdh')} />
        </div>
        <div className="field checkbox-field">
          <label>
            <input
              type="checkbox"
              checked={form.ciblePrioritaireGvt}
              onChange={(e) => setForm((prev) => ({ ...prev, ciblePrioritaireGvt: e.target.checked }))}
            />
            Cible prioritaire du gouvernement
          </label>
        </div>
      </div>
    </>
  );
}

// §10-11 du canevas : Justification puis Population visée et emplois créés.
function JustificationPopulationStep({ form, setForm }) {
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <div className="field">
        <label>Justification</label>
        <textarea rows={2} value={form.justification} onChange={set('justification')} />
      </div>

      <h4 className="wizard-substep-title">Population visée et emplois créés</h4>
      <div className="population-emplois-row">
        <table className="rubrique-calendrier-table population-table">
          <thead>
            <tr><th>Population Cible</th><th>Nombre</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="rubrique-label-cell">Enfants garçons</td>
              <td><input type="number" value={form.populationEnfantsGarcons} onChange={set('populationEnfantsGarcons')} /></td>
            </tr>
            <tr>
              <td className="rubrique-label-cell">Enfants filles</td>
              <td><input type="number" value={form.populationEnfantsFilles} onChange={set('populationEnfantsFilles')} /></td>
            </tr>
            <tr>
              <td className="rubrique-label-cell">Hommes</td>
              <td><input type="number" value={form.populationHommes} onChange={set('populationHommes')} /></td>
            </tr>
            <tr>
              <td className="rubrique-label-cell">Femmes</td>
              <td><input type="number" value={form.populationFemmes} onChange={set('populationFemmes')} /></td>
            </tr>
          </tbody>
        </table>

        <table className="rubrique-calendrier-table emplois-table">
          <thead>
            <tr><th>* Nombre d'emplois créés</th><th>Pendant</th><th>Après</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="rubrique-label-cell">Homme</td>
              <td><input type="number" value={form.emploiPendantHomme} onChange={set('emploiPendantHomme')} /></td>
              <td><input type="number" value={form.emploiApresHomme} onChange={set('emploiApresHomme')} /></td>
            </tr>
            <tr>
              <td className="rubrique-label-cell">Femme</td>
              <td><input type="number" value={form.emploiPendantFemme} onChange={set('emploiPendantFemme')} /></td>
              <td><input type="number" value={form.emploiApresFemme} onChange={set('emploiApresFemme')} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

// §12-13 du canevas : Aspects légaux puis Aspects institutionnels.
function AspectsStep({ form, setForm }) {
  return (
    <div className="field-row">
      <div className="field">
        <label>Aspects légaux</label>
        <DynamicList
          values={form.aspectsLegaux}
          setValues={(v) => setForm((prev) => ({ ...prev, aspectsLegaux: v }))}
          placeholder="ex. Décret du..."
        />
      </div>
      <div className="field">
        <label>Aspects institutionnels</label>
        <DynamicList
          values={form.aspectsInstitutionnels}
          setValues={(v) => setForm((prev) => ({ ...prev, aspectsInstitutionnels: v }))}
          placeholder="ex. Accord avec..."
        />
      </div>
    </div>
  );
}

// §14 du canevas : Ministère de tutelle et Responsable du projet (nom, téléphone, courriel).
function MinistereResponsableStep({ form, setForm, errors }) {
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <div className="field">
        <label>Ministère de tutelle</label>
        <input type="text" value={form.ministereTutelle} onChange={set('ministereTutelle')} />
      </div>
      <div className="field">
        <label>Responsable du projet</label>
        <input type="text" value={form.nomChargeProjet} onChange={set('nomChargeProjet')} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Téléphone du responsable</label>
          <PhoneField value={form.telephoneChargeProjet} onChange={(v) => setForm((prev) => ({ ...prev, telephoneChargeProjet: v }))} />
        </div>
        <div className="field">
          <label>Courriel du responsable</label>
          <input type="email" placeholder="nom@exemple.com" value={form.courrielChargeProjet} onChange={set('courrielChargeProjet')} />
          {errors.courrielChargeProjet && <span className="field-error">{errors.courrielChargeProjet}</span>}
        </div>
      </div>
    </>
  );
}

function IntervenantsStep({ form, setForm, errors }) {
  const setIntervenant = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));
  const [ptfs, setPtfs] = useState([]);
  const [ptfsError, setPtfsError] = useState('');

  const chargerPtfs = () => {
    setPtfsError('');
    apiClient.get('/ptf')
      .then(({ data }) => setPtfs(data))
      .catch(() => setPtfsError('Impossible de charger la liste des partenaires (PTF).'));
  };
  useEffect(chargerPtfs, []);

  return (
    <>
      <IntervenantFields label="Supervision" value={form.supervision} onChange={setIntervenant('supervision')} errors={errors} fieldKey="supervision" />
      <IntervenantFields label="Exécution" value={form.execution} onChange={setIntervenant('execution')} errors={errors} fieldKey="execution" />
      <BailleurFields
        value={form.bailleur}
        onChange={setIntervenant('bailleur')}
        errors={errors}
        ptfs={ptfs}
        ptfsError={ptfsError}
        onReloadPtfs={chargerPtfs}
      />
      <IntervenantFields label="Agence 1" value={form.agence1} onChange={setIntervenant('agence1')} errors={errors} fieldKey="agence1" />
      <IntervenantFields label="Agence 2" value={form.agence2} onChange={setIntervenant('agence2')} errors={errors} fieldKey="agence2" />
    </>
  );
}

// §20-24 du canevas : Échelon territorial, GPS, Localisation géographique, puis Durée totale et
// Coût total du projet (ces deux derniers clôturent la section "LOCALISATION" dans le classeur,
// juste avant "DESCRIPTION DU PROJET").
function LocalisationStep({ form, setForm }) {
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <div className="field">
        <label>Échelon territorial</label>
        <select value={form.echelonTerritorial} onChange={set('echelonTerritorial')}>
          <option value="">—</option>
          {ECHELON_TERRITORIAL_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      <GeoAddressFields form={form} setForm={setForm} />
      <div className="field-row">
        <div className="field">
          <label>Durée totale (mois)</label>
          <input type="number" value={form.dureeTotaleMois} onChange={set('dureeTotaleMois')} />
        </div>
        <div className="field">
          <label>Coût total (gourdes)</label>
          <input type="number" value={form.coutTotalGourde} onChange={set('coutTotalGourde')} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>N° du compte bancaire (en Gourde)</label>
          <input type="text" value={form.numeroCompteBancaire} onChange={set('numeroCompteBancaire')} />
        </div>
        <div className="field">
          <label>Type d'investissement</label>
          <select value={form.typeInvestissement} onChange={set('typeInvestissement')}>
            <option value="">—</option>
            <option value="Etude">Étude</option>
            <option value="Execution">Exécution</option>
            <option value="Evaluation">Évaluation</option>
          </select>
        </div>
      </div>
    </>
  );
}

// §25 du canevas : Effets attendus, premier champ de "DESCRIPTION DU PROJET".
function EffetsAttendusStep({ form, setForm }) {
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="field">
      <label>Effets attendus</label>
      <textarea rows={3} value={form.effetsAttendus} onChange={set('effetsAttendus')} />
    </div>
  );
}

// §26-27 du canevas : Indicateurs de résultats puis Extrants (deux listes ordonnées, même principe
// que les aspects légaux/institutionnels).
function IndicateursExtrantsStep({ form, setForm }) {
  return (
    <div className="field-row">
      <div className="field">
        <label>Indicateurs de résultats</label>
        <DynamicList
          values={form.indicateursResultats}
          setValues={(v) => setForm((prev) => ({ ...prev, indicateursResultats: v }))}
          placeholder="ex. Taux de réussite au..."
        />
      </div>
      <div className="field">
        <label>Extrants</label>
        <DynamicList
          values={form.extrants}
          setValues={(v) => setForm((prev) => ({ ...prev, extrants: v }))}
          placeholder="ex. Salles de classe construites"
        />
      </div>
    </div>
  );
}

// §28 du canevas : Intrants — Budget du projet par phases. Même principe que le tableau §34
// (CalendrierRubriquesFields) mais avec des colonnes "phase" fixes au lieu d'années, et des lignes
// "Voies et Moyens" elles aussi fixes (pas une table de référence, voir VOIES_MOYENS_BUDGET).
function IntrantsBudgetPhaseFields({ form, setForm }) {
  useEffect(() => {
    setForm((prev) => {
      const existantes = new Map(prev.intrantsBudgetPhases.map((l) => [l.voieMoyen, l]));
      const completes = VOIES_MOYENS_BUDGET.map((voieMoyen) => existantes.get(voieMoyen) || { ...EMPTY_INTRANT_BUDGET_PHASE, voieMoyen });
      const inchange = completes.length === prev.intrantsBudgetPhases.length
        && completes.every((l, i) => l === prev.intrantsBudgetPhases[i]);
      return inchange ? prev : { ...prev, intrantsBudgetPhases: completes };
    });
  }, [setForm]);

  const update = (idx, field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = [...prev.intrantsBudgetPhases];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, intrantsBudgetPhases: next };
    });
  };

  const ligneTotal = (l) => PHASE_BUDGET_FIELD_KEYS.reduce((sum, k) => sum + (Number(l[k]) || 0), 0);
  const totalPhase = (k) => form.intrantsBudgetPhases.reduce((sum, l) => sum + (Number(l[k]) || 0), 0);
  const totalGeneral = form.intrantsBudgetPhases.reduce((sum, l) => sum + ligneTotal(l), 0);

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table">
        <thead>
          <tr>
            <th>Voies et Moyens</th>
            {PHASES_BUDGET_OPTIONS.map((p) => <th key={p}>{p}</th>)}
            <th>Total par Voies et Moyens</th>
          </tr>
        </thead>
        <tbody>
          {form.intrantsBudgetPhases.map((l, idx) => (
            <tr key={l.voieMoyen}>
              <td className="rubrique-label-cell">{l.voieMoyen}</td>
              {PHASE_BUDGET_FIELD_KEYS.map((key) => (
                <td key={key}>
                  <input type="number" value={l[key]} onChange={update(idx, key)} />
                </td>
              ))}
              <td className="rubrique-total-cell">{formatMontant(ligneTotal(l))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total par Phases du projet</td>
            {PHASE_BUDGET_FIELD_KEYS.map((key) => <td key={key}>{formatMontant(totalPhase(key))}</td>)}
            <td>{formatMontant(totalGeneral)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Les 4 valeurs stockées (PHASE_ACTUELLE_OPTIONS) sont contraintes côté base par un CHECK — seuls
// les libellés affichés ici reprennent la formulation complète du canevas (§30).
const PHASE_ACTUELLE_LABELS = {
  Elaboration: 'Elaboration (Etude)',
  Planification: "Planification de l'Exécution",
  Execution: 'Exécution',
  'Evaluation Impact': "Evaluation d'Impact",
};

// §30 du canevas : un projet peut avoir traversé plusieurs phases (Elaboration, Planification,
// Exécution, Evaluation d'Impact) — cases à cocher multi-choix, chacune avec sa propre Période
// (form.phasesActuelles est un tableau [{ phase, periode }], une entrée par case cochée).
function PhaseActuelleField({ form, setForm }) {
  const phases = form.phasesActuelles || [];

  const togglePhase = (phase) => {
    setForm((prev) => {
      const current = prev.phasesActuelles || [];
      const dejaCochee = current.some((p) => p.phase === phase);
      const next = dejaCochee
        ? current.filter((p) => p.phase !== phase)
        : [...current, { phase, periode: '' }];
      return { ...prev, phasesActuelles: next };
    });
  };

  const setPeriode = (phase, periode) => {
    setForm((prev) => ({
      ...prev,
      phasesActuelles: (prev.phasesActuelles || []).map((p) => (p.phase === phase ? { ...p, periode } : p)),
    }));
  };

  return (
    <div className="field-row">
      {PHASE_ACTUELLE_OPTIONS.map((phase) => {
        const ligne = phases.find((p) => p.phase === phase);
        const cochee = Boolean(ligne);
        return (
          <div className="field phase-actuelle-item" key={phase}>
            <label className="checkbox-label">
              <input type="checkbox" checked={cochee} onChange={() => togglePhase(phase)} />
              {PHASE_ACTUELLE_LABELS[phase] || phase}
            </label>
            <input
              type="text"
              placeholder="Période, ex. 2022-2023"
              disabled={!cochee}
              value={ligne?.periode || ''}
              onChange={(e) => setPeriode(phase, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}

// §29-30 du canevas : Sources de financement puis Phase actuelle du projet.
function FinancementPhaseStep({ form, setForm }) {
  return (
    <>
      <SourcesFinancementFields form={form} setForm={setForm} />
      <h4 className="wizard-substep-title">Phase actuelle du projet</h4>
      <PhaseActuelleField form={form} setForm={setForm} />
    </>
  );
}

// §31/33-34 du canevas : Activités du projet (calendrier prévisionnel + résultats, fusionnés dans
// un seul tableau) puis Calendrier des dépenses par rubrique (§32 Chronogramme et §35 Coûts
// récurrents ne sont pas encore dans l'appli).
// Étape 11 : activités du projet — calendrier prévisionnel (§31) et chronogramme (§32), les deux
// tableaux qui portent la liste des activités (ajout/retrait) et sa répartition dans le temps.
function ActivitesCalendrierStep({ form, setForm }) {
  return (
    <>
      <h4 className="wizard-substep-title">31 — Calendrier annuel prévisionnel d'exécution des activités du projet</h4>
      <CalendrierActivitesTable form={form} setForm={setForm} />
      <h4 className="wizard-substep-title">32 — Chronogramme d'exécution annuelle des activités du projet</h4>
      <ChronogrammeActivitesTable form={form} setForm={setForm} />
    </>
  );
}

// Étape 12 : résultats attendus par activité (§33) — même liste d'activités que l'étape 11, mais
// assez de colonnes (Unité/Quantité/Unitaire/Total/Ressources) pour mériter son propre onglet.
function ResultatsAttendusStep({ form, setForm }) {
  return (
    <>
      <h4 className="wizard-substep-title">33 — Résultats attendus par activité</h4>
      <ResultatsAttendusTable form={form} setForm={setForm} />
    </>
  );
}

// Étape 13 : dépenses par rubrique budgétaire — calendrier prévisionnel détaillé par sous-rubrique
// (§34, la table la plus volumineuse du formulaire) et coûts récurrents post-livrable (§35).
function DepensesRubriquesStep({ form, setForm }) {
  return (
    <>
      <h4 className="wizard-substep-title">34 — Calendrier des dépenses prévisionnelles par rubrique</h4>
      <CalendrierRubriquesFields form={form} setForm={setForm} />
      <h4 className="wizard-substep-title">35 — Coûts récurrents du projet</h4>
      <CoutsRecurrentsFields form={form} setForm={setForm} />
    </>
  );
}

// L'ordre et le regroupement des étapes suivent strictement la numérotation §1-35 de la feuille
// "Info Générales" du canevas Excel (voir documents/CANEVAS FIOP.xls), pas l'ordre pratique qu'avait
// le formulaire avant : un opérateur qui a le classeur papier sous les yeux retrouve les rubriques
// dans le même ordre à l'écran. Les rubriques §32 (Chronogramme) et §35 (Coûts récurrents) ne sont
// pas encore numérisées dans l'appli ; elles n'apparaissent donc pas ici. `fields` sert à retrouver,
// après une erreur de soumission renvoyée par le backend, l'étape sur laquelle se replacer.
export const FIOP_STEPS = [
  {
    id: 'identification',
    label: 'Identification',
    fields: ['titre', 'codeExterneBailleur', 'idGrandChantier', 'idProgramme', 'idSousProgramme', 'idExerciceCreation', 'projetPsdh', 'ciblePrioritaireGvt'],
    Component: IdentificationStep,
  },
  {
    id: 'justification-population',
    label: 'Justification et population visée',
    fields: ['justification', 'populationEnfantsGarcons', 'populationEnfantsFilles', 'populationHommes', 'populationFemmes', 'emploiPendantHomme', 'emploiPendantFemme', 'emploiApresHomme', 'emploiApresFemme'],
    Component: JustificationPopulationStep,
  },
  {
    id: 'aspects',
    label: 'Aspects légaux et institutionnels',
    fields: ['aspectsLegaux', 'aspectsInstitutionnels'],
    Component: AspectsStep,
  },
  {
    id: 'ministere-responsable',
    label: 'Ministère de tutelle et responsable du projet',
    fields: ['ministereTutelle', 'nomChargeProjet', 'telephoneChargeProjet', 'courrielChargeProjet'],
    Component: MinistereResponsableStep,
  },
  {
    id: 'intervenants',
    label: 'Supervision, exécution, bailleurs et agences',
    fields: [...INTERVENANT_KEYS, ...INTERVENANT_KEYS.map((k) => `${k}.courriel`)],
    Component: IntervenantsStep,
  },
  {
    id: 'localisation',
    label: 'Localisation, durée et coût du projet',
    fields: ['echelonTerritorial', 'idDepartement', 'idArrondissement', 'idCommune', 'idSectionCommunale', 'habitationLocaliteQuartier', 'localisationGps', 'dureeTotaleMois', 'coutTotalGourde', 'numeroCompteBancaire', 'typeInvestissement'],
    Component: LocalisationStep,
  },
  {
    id: 'effets-attendus',
    label: 'Description du projet',
    fields: ['effetsAttendus'],
    Component: EffetsAttendusStep,
  },
  {
    id: 'indicateurs-extrants',
    label: 'Indicateurs de résultats et extrants',
    fields: ['indicateursResultats', 'extrants'],
    Component: IndicateursExtrantsStep,
  },
  {
    id: 'intrants-budget',
    label: 'Intrants — budget du projet par phases',
    fields: ['intrantsBudgetPhases'],
    Component: IntrantsBudgetPhaseFields,
  },
  {
    id: 'financement-phase',
    label: 'Sources de financement et phase du projet',
    fields: ['sourcesFinancement', 'phasesActuelles'],
    Component: FinancementPhaseStep,
  },
  {
    id: 'activites-calendrier',
    label: 'Activités — calendrier et chronogramme',
    fields: ['activites'],
    Component: ActivitesCalendrierStep,
  },
  {
    id: 'resultats-attendus',
    label: 'Résultats attendus par activité',
    fields: ['activites'],
    Component: ResultatsAttendusStep,
  },
  {
    id: 'depenses-rubriques',
    label: 'Dépenses par rubrique budgétaire',
    fields: ['calendrierRubriques', 'coutsRecurrents'],
    Component: DepensesRubriquesStep,
  },
];

// Désigne une étape du wizard "Info Générales" par son numéro et son libellé, pour que les onglets
// suivants (Bilan, Tranche annuelle) indiquent précisément où compléter le plan du projet.
export function infoGeneralesStep(stepId) {
  const idx = FIOP_STEPS.findIndex((s) => s.id === stepId);
  return idx < 0 ? "l'onglet Info Générales" : `l'onglet Info Générales, étape ${idx + 1} « ${FIOP_STEPS[idx].label} »`;
}

// Validation propre à une étape, vérifiée avant de passer à la suivante (ou de soumettre à la
// dernière étape) — indépendante des erreurs renvoyées par le backend après enregistrement.
function validateStep(stepId, form) {
  if (stepId === 'identification') {
    const errors = {};
    if (!String(form.titre || '').trim()) errors.titre = 'Le titre est obligatoire.';
    if (!form.idGrandChantier) errors.idGrandChantier = 'Le grand chantier est obligatoire.';
    if (!form.idProgramme) errors.idProgramme = 'Le programme est obligatoire.';
    return errors;
  }
  if (stepId === 'ministere-responsable') {
    const errors = {};
    if (form.courrielChargeProjet && !EMAIL_REGEX.test(form.courrielChargeProjet)) {
      errors.courrielChargeProjet = "Le courriel du responsable n'est pas valide.";
    }
    return errors;
  }
  if (stepId === 'intervenants') {
    const errors = {};
    INTERVENANT_KEYS.forEach((key) => {
      const courriel = form[key]?.courriel;
      if (courriel && !EMAIL_REGEX.test(courriel)) {
        errors[`${key}.courriel`] = "Le courriel n'est pas valide.";
      }
    });
    if (!form.bailleur?.idPtf && String(form.bailleur?.nomCharge || '').trim()) {
      errors.bailleur = 'Le bailleur doit être choisi dans la liste des partenaires (PTF).';
    }
    return errors;
  }
  return {};
}

// Wizard "vrai" à étapes : une section du canevas à la fois, avec une barre de progression
// cliquable. Remplace l'ancien formulaire à défilement unique (FiopFormFields) pour "Info
// Générales" — voir la demande du tuteur de ne pas empiler toutes les sections sur une page.
//
// Chaque étape est enregistrée dès qu'on la quitte (Suivante, Précédente ou clic dans la barre)
// via `onSaveStep(indexCible)`, qui renvoie `true` si le wizard peut avancer lui-même. Rien n'est
// envoyé si le formulaire n'a pas changé depuis le dernier enregistrement. La dernière étape
// garde `onSubmit` (fin de saisie : retour à la fiche, ou resoumission en mode correction).
export function FiopWizard({
  form, setForm, errors, onSaveStep, onSubmit, submitting, submitLabel, submittingLabel, onCancel, initialStep = 0,
}) {
  const clampStep = (idx) => Math.max(0, Math.min(FIOP_STEPS.length - 1, idx));
  const [stepIndex, setStepIndex] = useState(() => clampStep(initialStep));
  const [localErrors, setLocalErrors] = useState({});
  const [savedNotice, setSavedNotice] = useState('');
  const savedSnapshot = useRef(JSON.stringify(form));
  // Vrai seulement après une vraie saisie de l'utilisateur. Les étapes 9 et 10 complètent `form`
  // toutes seules à l'ouverture (lignes fixes Voies et Moyens / Sources) : sans ce drapeau, le
  // simple fait de les traverser déclenchait un enregistrement, refusé par le backend tant que
  // l'Identification est vide, ce qui renvoyait l'utilisateur à l'étape 1.
  const userEdited = useRef(false);
  const markEdited = () => { userEdited.current = true; };
  const markEditedOnButton = (e) => { if (e.target.closest('button')) markEdited(); };

  // Le message "Étape enregistrée" disparaît dès la première modification.
  useEffect(() => { setSavedNotice(''); }, [form]);

  useEffect(() => {
    const errorKeys = Object.keys(errors || {}).filter((k) => k !== 'general');
    if (errorKeys.length === 0) return;
    const idx = FIOP_STEPS.findIndex((step) => step.fields.some((f) => errorKeys.includes(f)));
    if (idx >= 0) setStepIndex(idx);
  }, [errors]);

  // Efface l'erreur locale dès que le champ concerné redevient valide, sans attendre une
  // nouvelle tentative de passage à l'étape suivante.
  useEffect(() => {
    setLocalErrors((prev) => {
      const stillInvalid = validateStep(FIOP_STEPS[stepIndex].id, form);
      const next = {};
      Object.keys(prev).forEach((key) => { if (stillInvalid[key]) next[key] = stillInvalid[key]; });
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, stepIndex]);

  const stepHasError = (step) => step.fields.some((f) => (errors && errors[f]) || localErrors[f]);

  const isLast = stepIndex === FIOP_STEPS.length - 1;
  const step = FIOP_STEPS[stepIndex];
  const StepComponent = step.Component;
  const mergedErrors = { ...errors, ...localErrors };

  // Enregistre l'étape courante (si modifiée et valide) puis se déplace vers `targetIdx`.
  const goTo = async (targetIdx) => {
    if (submitting) return;
    const target = clampStep(targetIdx);
    if (target === stepIndex) return;
    const snapshot = JSON.stringify(form);
    if (!userEdited.current || snapshot === savedSnapshot.current) {
      setStepIndex(target);
      return;
    }
    const stepErrors = validateStep(step.id, form);
    if (Object.keys(stepErrors).length > 0) {
      setLocalErrors(stepErrors);
      return;
    }
    const canAdvance = await onSaveStep(target);
    if (!canAdvance) return;
    savedSnapshot.current = snapshot;
    userEdited.current = false;
    setStepIndex(target);
    setSavedNotice(`Étape « ${step.label} » enregistrée.`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isLast) {
      goTo(stepIndex + 1);
      return;
    }
    const stepErrors = validateStep(step.id, form);
    if (Object.keys(stepErrors).length > 0) {
      setLocalErrors(stepErrors);
      return;
    }
    onSubmit(event);
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form wizard-form" noValidate>
      <nav className="wizard-steps">
        {FIOP_STEPS.map((s, idx) => (
          <React.Fragment key={s.id}>
            {idx > 0 && <div className={`wizard-connector${idx <= stepIndex ? ' done' : ''}`} />}
            <button
              type="button"
              className={[
                'wizard-step',
                idx === stepIndex && 'active',
                idx < stepIndex && 'done',
                stepHasError(s) && 'has-error',
              ].filter(Boolean).join(' ')}
              onClick={() => goTo(idx)}
              title={s.label}
            >
              <span className="wizard-step-circle">{idx + 1}</span>
              <span className="wizard-step-label">{s.label}</span>
            </button>
          </React.Fragment>
        ))}
      </nav>

      <div className="wizard-step-body" onChange={markEdited} onClickCapture={markEditedOnButton}>
        <h4 className="form-section-title">{step.label}</h4>
        <StepComponent form={form} setForm={setForm} errors={mergedErrors} />
      </div>

      {errors.general && <div className="form-error">{errors.general}</div>}
      {savedNotice && !errors.general && <div className="form-success">{savedNotice}</div>}

      <div className="modal-actions wizard-nav">
        <button type="button" className="secondary-btn" onClick={onCancel}>Annuler</button>
        <div className="wizard-nav-spacer" />
        {stepIndex > 0 && (
          <button type="button" className="secondary-btn" disabled={submitting} onClick={() => goTo(stepIndex - 1)}>← Précédente</button>
        )}
        {!isLast && (
          <button type="submit" disabled={submitting}>{submitting ? 'Enregistrement...' : 'Enregistrer et continuer →'}</button>
        )}
        {isLast && (
          <button type="submit" disabled={submitting}>{submitting ? (submittingLabel || 'Enregistrement...') : submitLabel}</button>
        )}
      </div>
    </form>
  );
}
