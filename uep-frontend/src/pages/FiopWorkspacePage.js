import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { apiErrorMessage, downloadFile } from '../api/download';
import { useAuth } from '../auth/AuthContext';
import TransmissionMpceModal from '../components/TransmissionMpceModal';
import BilanTabContent from './BilanTabContent';
import DocumentsTabContent from './DocumentsTabContent';
import TrancheAnnuelleTabContent from './TrancheAnnuelleTabContent';
import {
  BILAN_EDIT_ROLES, EMPTY_FORM, FiopWizard, StatutBadge, estTraite,
  formatDateFr, formatDateTimeFr, toFormValues,
} from './fiopShared';
import './FiopWorkspacePage.css';

function FiopDetailView({ fiop }) {
  return (
    <div className="detail-grid">
      <div className="detail-row"><span className="detail-label">Statut</span><StatutBadge statut={fiop.statut} /></div>
      <div className="detail-row"><span className="detail-label">Code projet</span><span>{fiop.codeProjet}</span></div>
      {fiop.codeInternePip && (
        <div className="detail-row"><span className="detail-label">Code PIP</span><span>{fiop.codeInternePip}</span></div>
      )}
      <div className="detail-row"><span className="detail-label">Créé par</span><span>{fiop.creeParUsername}</span></div>
      <div className="detail-row"><span className="detail-label">Date d'inscription</span><span>{formatDateFr(fiop.dateInscription)}</span></div>
      <div className="detail-row"><span className="detail-label">Code externe (bailleur)</span><span>{fiop.codeExterneBailleur || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Projet PSDH</span><span>{fiop.projetPsdh || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Grand Chantier</span><span>{fiop.grandChantierLibelle || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Programme</span><span>{fiop.programmeLibelle || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Sous-Programme</span><span>{fiop.sousProgrammeLibelle || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Exercice de création</span><span>{fiop.exerciceLibelle || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Ministère de tutelle</span><span>{fiop.ministereTutelle || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Cible prioritaire du gvt</span><span>{fiop.ciblePrioritaireGvt ? 'Oui' : 'Non'}</span></div>
      <div className="detail-row">
        <span className="detail-label">Phase(s) actuelle(s)</span>
        <span>
          {Array.isArray(fiop.phasesActuelles) && fiop.phasesActuelles.length > 0
            ? fiop.phasesActuelles.map((p) => `${p.phase}${p.periode ? ` (${p.periode})` : ''}`).join(', ')
            : '—'}
        </span>
      </div>
      <div className="detail-row"><span className="detail-label">Durée totale</span><span>{fiop.dureeTotaleMois ? `${fiop.dureeTotaleMois} mois` : '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Budget</span><span>{fiop.coutTotalGourde != null ? `${fiop.coutTotalGourde} G` : '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Responsable</span><span>{fiop.nomChargeProjet || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Téléphone</span><span>{fiop.telephoneChargeProjet || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Courriel</span><span>{fiop.courrielChargeProjet || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Échelon territorial</span><span>{fiop.echelonTerritorial || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Département</span><span>{fiop.departementLibelle || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Arrondissement</span><span>{fiop.arrondissementLibelle || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Commune</span><span>{fiop.communeLibelle || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Section communale</span><span>{fiop.sectionCommunaleLibelle || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Localité / Quartier</span><span>{fiop.habitationLocaliteQuartier || '—'}</span></div>
      <div className="detail-row"><span className="detail-label">Coordonnées GPS</span><span>{fiop.localisationGps || '—'}</span></div>
      <div className="detail-block">
        <span className="detail-label">Justification</span>
        <p>{fiop.justification || '—'}</p>
      </div>
      <div className="detail-block">
        <span className="detail-label">Effets attendus</span>
        <p>{fiop.effetsAttendus || '—'}</p>
      </div>
      {fiop.aspectsLegaux && fiop.aspectsLegaux.length > 0 && (
        <div className="detail-block">
          <span className="detail-label">Aspects légaux</span>
          <ul className="detail-list">
            {fiop.aspectsLegaux.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
      {fiop.aspectsInstitutionnels && fiop.aspectsInstitutionnels.length > 0 && (
        <div className="detail-block">
          <span className="detail-label">Aspects institutionnels</span>
          <ul className="detail-list">
            {fiop.aspectsInstitutionnels.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
      {fiop.indicateursResultats && fiop.indicateursResultats.length > 0 && (
        <div className="detail-block">
          <span className="detail-label">Indicateurs de résultats</span>
          <ul className="detail-list">
            {fiop.indicateursResultats.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
      {fiop.extrants && fiop.extrants.length > 0 && (
        <div className="detail-block">
          <span className="detail-label">Extrants</span>
          <ul className="detail-list">
            {fiop.extrants.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
      <div className="detail-row"><span className="detail-label">Population — Enfants G/F</span><span>{fiop.populationEnfantsGarcons ?? 0} / {fiop.populationEnfantsFilles ?? 0}</span></div>
      <div className="detail-row"><span className="detail-label">Population — Hommes/Femmes</span><span>{fiop.populationHommes ?? 0} / {fiop.populationFemmes ?? 0}</span></div>
      <div className="detail-row"><span className="detail-label">Emplois pendant H/F</span><span>{fiop.emploiPendantHomme ?? 0} / {fiop.emploiPendantFemme ?? 0}</span></div>
      <div className="detail-row"><span className="detail-label">Emplois après H/F</span><span>{fiop.emploiApresHomme ?? 0} / {fiop.emploiApresFemme ?? 0}</span></div>
      {[
        ['Supervision', fiop.supervision],
        ['Exécution', fiop.execution],
        ['Bailleur de fonds', fiop.bailleur],
        ['Agence 1', fiop.agence1],
        ['Agence 2', fiop.agence2],
      ].filter(([, v]) => v).map(([label, v]) => (
        <div className="detail-row" key={label}>
          <span className="detail-label">{label}</span>
          <span>{v.nomCharge || '—'}{v.telephone ? ` · ${v.telephone}` : ''}{v.courriel ? ` · ${v.courriel}` : ''}</span>
        </div>
      ))}
      {fiop.motifRejet && (
        <div className="detail-block detail-motif">
          <span className="detail-label">Motif du retour</span>
          <p>{fiop.motifRejet}</p>
        </div>
      )}
      <div className="detail-row"><span className="detail-label">Créé le</span><span>{formatDateTimeFr(fiop.dateCreation)}</span></div>
      <div className="detail-row"><span className="detail-label">Modifié le</span><span>{formatDateTimeFr(fiop.dateModification)}</span></div>
    </div>
  );
}

// Page dédiée pour créer / consulter / modifier un FIOP — remplace l'ancienne fenêtre modale
// à onglets. "Info Générales", "Bilan d'Exécution" et "Tranche Annuelle" restent les onglets
// d'un même document (voir le classeur d'origine : PREMIERE / DEUXIEME / TROISIEME PARTIE).
export default function FiopWorkspacePage() {
  const { id } = useParams();
  const isNew = id === 'nouveau';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const role = auth.role;

  const tabParam = searchParams.get('tab');
  const tab = !isNew && ['bilan', 'tranche', 'documents'].includes(tabParam) ? tabParam : 'info';

  const [fiop, setFiop] = useState(null);
  // UC-B8 : fenêtre de transmission du canevas FIOP au MPCE (Superviseur UEP, projet traité).
  const [transmissionOuverte, setTransmissionOuverte] = useState(false);
  // Canevas FIOP officiel (Excel), le même que celui joint à l'e-mail envoyé au MPCE.
  const [telechargement, setTelechargement] = useState(false);
  const [telechargementErreur, setTelechargementErreur] = useState('');
  const telechargerCanevas = async () => {
    setTelechargementErreur('');
    setTelechargement(true);
    try {
      await downloadFile(`/rapports/projets/${fiop.id}/canevas`, `FIOP_canevas-${fiop.codeProjet}.xlsx`);
    } catch (err) {
      setTelechargementErreur(await apiErrorMessage(err, 'Le téléchargement du canevas a échoué.'));
    } finally {
      setTelechargement(false);
    }
  };
  // Une fois le FIOP validé par l'UEP (projet traité), "Info Générales" n'est plus jamais modifiable
  // (le serveur le refuse aussi) ; le bilan, la tranche annuelle et les documents restent modifiables.
  const infoVerrouillee = estTraite(fiop?.statut);
  // Après cette validation, seul le Superviseur UEP peut encore modifier les autres onglets.
  const peutModifierBilan = infoVerrouillee ? role === 'SUPERVISEUR_UEP' : BILAN_EDIT_ROLES.includes(role);
  const peutModifierDocuments = infoVerrouillee
    ? role === 'SUPERVISEUR_UEP'
    : role === 'SUPERVISEUR_UEP' || (role === 'Porteur_PROJET' && fiop?.creeParUsername === auth.username);
  const modeParam = searchParams.get('mode');
  const mode = isNew ? 'create'
    : (modeParam === 'edit' || modeParam === 'correct') && !infoVerrouillee ? modeParam : 'view';
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Le routeur ne démonte pas ce composant en passant de /fiop/nouveau à /fiop/:id (ou d'un
  // FIOP à un autre) : `fiop` reste donc temporairement celui de la route précédente pendant
  // qu'un nouveau chargement démarre. On ne considère les données prêtes que si elles
  // correspondent bien à l'id actuel de l'URL, plutôt que de se fier à un simple booléen
  // "loading" qui, lui, resterait faux pendant ce rendu transitoire.
  const dataReady = isNew || (fiop != null && String(fiop.id) === String(id));

  const loadFiop = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await apiClient.get(`/fiop/${id}`);
      setFiop(data);
      setForm(toFormValues(data));
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Impossible de charger ce FIOP.');
    }
  }, [id]);

  useEffect(() => {
    if (isNew) {
      setFiop(null);
      setForm(EMPTY_FORM);
      setErrors({});
      setLoadError('');
    } else {
      loadFiop();
    }
  }, [isNew, loadFiop]);

  const setTab = (nextTab) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === 'info') next.delete('tab'); else next.set('tab', nextTab);
    setSearchParams(next, { replace: true });
  };

  const showSaveErrors = (err, fallback) => {
    const data = err.response?.data;
    if (data && typeof data === 'object' && !data.message) {
      setErrors(data);
    } else {
      setErrors({ general: data?.message || fallback });
    }
  };

  // Enregistrement à chaque changement d'étape du wizard. Le premier enregistrement d'un
  // nouveau FIOP le crée (POST) puis bascule sur /fiop/:id en mode édition, positionné sur
  // l'étape suivante ; ensuite chaque étape est un simple PUT, sans changement de statut —
  // y compris en mode correction, où seule la dernière étape resoumet (voir submitEdit).
  const saveStep = async (nextStep) => {
    setErrors({});
    setSubmitting(true);
    try {
      if (isNew) {
        const { data } = await apiClient.post('/fiop', form);
        navigate(`/fiop/${data.id}?mode=edit&step=${nextStep}`, { replace: true });
        return false;
      }
      // `fiop` (la version enregistrée) alimente l'onglet Bilan : on le remplace par la réponse
      // du PUT pour que les activités/rubriques/sources tout juste saisies y apparaissent sans
      // recharger la page. `form` n'est pas touché, pour ne pas écraser la saisie en cours.
      const { data } = await apiClient.put(`/fiop/${id}`, form);
      setFiop(data);
      return true;
    } catch (err) {
      showSaveErrors(err, isNew ? 'La création a échoué.' : "L'enregistrement a échoué.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/fiop', form);
      navigate(`/fiop/${data.id}`);
    } catch (err) {
      showSaveErrors(err, 'La création a échoué.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const url = mode === 'correct' ? `/fiop/${id}/corriger` : `/fiop/${id}`;
      const { data } = await apiClient.put(url, form);
      setFiop(data);
      setForm(toFormValues(data));
      navigate(`/fiop/${id}`);
    } catch (err) {
      showSaveErrors(err, "L'enregistrement a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = isNew
    ? 'Créer un FIOP'
    : mode === 'edit' ? `Modifier « ${fiop?.titre || ''} »`
      : mode === 'correct' ? `Corriger « ${fiop?.titre || ''} »`
        : `FIOP — ${fiop?.titre || ''}`;

  return (
    <div className="fiop-page">
      <div className="fiop-content">
        <div className="workspace-page-header">
          <button type="button" className="secondary-btn" onClick={() => navigate('/fiop')}>← Retour aux FIOP</button>
          <h1>{title}</h1>
        </div>

        {!dataReady ? (
          loadError ? <div className="form-error">{loadError}</div> : <p>Chargement...</p>
        ) : (
          <section className="fiop-card">
            <nav className="workspace-tabs">
              <button
                type="button"
                className={`workspace-tab${tab === 'info' ? ' active' : ''}`}
                onClick={() => setTab('info')}
              >
                Info Générales
              </button>
              <button
                type="button"
                className={`workspace-tab${tab === 'bilan' ? ' active' : ''}`}
                disabled={isNew}
                title={isNew ? "Enregistrez d'abord les informations générales pour saisir le bilan d'exécution." : undefined}
                onClick={() => setTab('bilan')}
              >
                Bilan d'Exécution
              </button>
              <button
                type="button"
                className={`workspace-tab${tab === 'tranche' ? ' active' : ''}`}
                disabled={isNew}
                title={isNew ? "Enregistrez d'abord les informations générales pour saisir la tranche annuelle." : undefined}
                onClick={() => setTab('tranche')}
              >
                Tranche Annuelle
              </button>
              <button
                type="button"
                className={`workspace-tab${tab === 'documents' ? ' active' : ''}`}
                disabled={isNew}
                title={isNew ? "Enregistrez d'abord les informations générales pour archiver des documents." : undefined}
                onClick={() => setTab('documents')}
              >
                Documents
              </button>
            </nav>

            {tab === 'info' && (
              isNew ? (
                <FiopWizard
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  onSaveStep={saveStep}
                  onSubmit={submitCreate}
                  submitting={submitting}
                  submitLabel="Créer le FIOP"
                  submittingLabel="Création..."
                  onCancel={() => navigate('/fiop')}
                />
              ) : mode === 'view' ? (
                <>
                  {infoVerrouillee && (
                    <p className="workspace-verrou-notice">
                      Projet traité (FIOP validé par l'UEP) : les informations générales ne sont plus modifiables.
                      Le bilan d'exécution, la tranche annuelle et les documents restent modifiables par le Superviseur UEP uniquement.
                    </p>
                  )}
                  <FiopDetailView fiop={fiop} />
                  {telechargementErreur && <div className="form-error">{telechargementErreur}</div>}
                  <div className="modal-actions">
                    <button type="button" className="secondary-btn" onClick={() => navigate('/fiop')}>Fermer</button>
                    <button type="button" className="secondary-btn" onClick={telechargerCanevas} disabled={telechargement}>
                      {telechargement ? 'Téléchargement...' : 'Télécharger le canevas FIOP'}
                    </button>
                    {role === 'SUPERVISEUR_UEP' && infoVerrouillee && (
                      <button type="button" onClick={() => setTransmissionOuverte(true)}>
                        {fiop.statut === 'TRANSMIS_MPCE' ? 'Renvoyer au MPCE' : 'Transmettre au MPCE'}
                      </button>
                    )}
                  </div>
                  {transmissionOuverte && (
                    <TransmissionMpceModal
                      fiop={fiop}
                      onClose={() => setTransmissionOuverte(false)}
                      onTransmis={() => { setTransmissionOuverte(false); loadFiop(); }}
                    />
                  )}
                </>
              ) : (
                <FiopWizard
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  onSaveStep={saveStep}
                  onSubmit={submitEdit}
                  initialStep={Number(searchParams.get('step')) || 0}
                  submitting={submitting}
                  submitLabel={mode === 'correct' ? 'Enregistrer et resoumettre' : 'Enregistrer et terminer'}
                  onCancel={() => navigate(`/fiop/${id}`)}
                />
              )
            )}

            {tab === 'bilan' && !isNew && (
              <BilanTabContent fiop={fiop} canEdit={peutModifierBilan} />
            )}

            {tab === 'tranche' && !isNew && (
              <TrancheAnnuelleTabContent fiop={fiop} canEdit={peutModifierBilan} />
            )}

            {tab === 'documents' && !isNew && (
              <DocumentsTabContent
                fiop={fiop}
                canEdit={peutModifierDocuments}
              />
            )}
          </section>
        )}
      </div>
    </div>
  );
}
