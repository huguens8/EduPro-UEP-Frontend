import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import TransmissionMpceModal from '../components/TransmissionMpceModal';
import { STATUT_META, StatCard, StatutBadge, estTraite } from './fiopShared';
import './FiopPage.css';

export default function FiopPage() {
  const { auth } = useAuth();
  const role = auth.role;
  const navigate = useNavigate();
  // ?statut=... : liste filtrée ouverte depuis le circuit de validation du tableau de bord.
  const [searchParams] = useSearchParams();
  const statutFiltre = STATUT_META[searchParams.get('statut')] ? searchParams.get('statut') : null;

  const [fiops, setFiops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');

  const [rejectFiop, setRejectFiop] = useState(null);
  const [rejectMotif, setRejectMotif] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const [busyIds, setBusyIds] = useState({});

  // Confirmation avant une action qui change le statut (ou supprime) : { title, message, confirmLabel, danger, run }.
  const [confirmAction, setConfirmAction] = useState(null);
  // FIOP traité dont le Superviseur UEP prépare la transmission au MPCE (UC-B8).
  const [transmissionFiop, setTransmissionFiop] = useState(null);

  const loadFiops = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const { data } = await apiClient.get('/fiop');
      setFiops(data);
    } catch (err) {
      setListError('Impossible de charger la liste des FIOP.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiops();
  }, [loadFiops]);

  const withBusy = async (id, action) => {
    setActionError('');
    setBusyIds((prev) => ({ ...prev, [id]: true }));
    try {
      await action();
      await loadFiops();
    } catch (err) {
      setActionError(err.response?.data?.message || "L'action a échoué.");
    } finally {
      setBusyIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // --- Retourner ---
  const openReject = (fiop) => {
    setRejectFiop(fiop);
    setRejectMotif('');
    setRejectError('');
  };

  const submitReject = async (event) => {
    event.preventDefault();
    setRejectError('');
    if (!rejectMotif.trim()) {
      setRejectError('Le motif du retour est obligatoire.');
      return;
    }
    setRejectSubmitting(true);
    try {
      await apiClient.post(`/fiop/${rejectFiop.id}/rejeter`, { motif: rejectMotif });
      setRejectFiop(null);
      loadFiops();
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Le retour a échoué.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const askConfirm = (fiop, { title, message, confirmLabel, danger = false, request }) => {
    setConfirmAction({ title, message, confirmLabel, danger, run: () => withBusy(fiop.id, request) });
  };

  const runConfirmed = () => {
    const action = confirmAction;
    setConfirmAction(null);
    action.run();
  };

  const handleSoumettre = (fiop) => askConfirm(fiop, {
    title: 'Soumettre le FIOP',
    message: `Soumettre « ${fiop.titre} » au Superviseur UEP ? Vous ne pourrez plus le modifier ensuite.`,
    confirmLabel: 'Soumettre',
    request: () => apiClient.post(`/fiop/${fiop.id}/soumettre`),
  });

  const handleValider = (fiop) => askConfirm(fiop, {
    title: 'Valider le FIOP',
    message: `Valider « ${fiop.titre} » ? Le projet sera traité : vous pourrez ensuite le transmettre au MPCE par e-mail et remplir son PIP.`,
    confirmLabel: 'Valider',
    request: () => apiClient.post(`/fiop/${fiop.id}/valider`),
  });

  const handleTransmisMpce = () => {
    setTransmissionFiop(null);
    loadFiops();
  };

  const handleDeleteFiop = (fiop) => askConfirm(fiop, {
    title: 'Supprimer le FIOP',
    message: `Supprimer définitivement « ${fiop.titre} » ?`,
    confirmLabel: 'Supprimer',
    danger: true,
    request: () => apiClient.delete(`/fiop/${fiop.id}`),
  });

  if (loading) {
    return (
      <div className="fiop-page">
        <div className="fiop-content"><p>Chargement...</p></div>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="fiop-page">
        <div className="fiop-content"><div className="form-error">{listError}</div></div>
      </div>
    );
  }

  // --- Vues personnalisées par rôle ---

  const renderOperateurView = () => {
    const mine = fiops.filter((f) => f.creeParUsername === auth.username);
    const counts = {
      brouillon: mine.filter((f) => f.statut === 'BROUILLON').length,
      soumis: mine.filter((f) => f.statut === 'SOUMIS_SUPERVISEUR_UEP').length,
      rejete: mine.filter((f) => f.statut === 'REJETE_UEP').length,
      traite: mine.filter((f) => estTraite(f.statut)).length,
    };

    return (
      <>
        <div className="stats-row">
          <StatCard value={counts.brouillon} label="Brouillons" tone="neutral" />
          <StatCard value={counts.soumis} label="En attente de validation" tone="amber" />
          <StatCard value={counts.rejete} label="À corriger" tone="red" />
          <StatCard value={counts.traite} label="Projets traités" tone="green" />
        </div>

        <section className="fiop-card">
          <div className="card-header-row">
            <h2>Mes FIOP</h2>
            <button type="button" className="primary-btn" onClick={() => navigate('/fiop/nouveau')}>
              + Nouveau FIOP
            </button>
          </div>
          {actionError && <div className="form-error">{actionError}</div>}
          <div className="fiop-table-wrap">
            <table className="fiop-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Code</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mine.map((fiop) => {
                  const busy = Boolean(busyIds[fiop.id]);
                  return (
                    <React.Fragment key={fiop.id}>
                      <tr>
                        <td>{fiop.titre}</td>
                        <td>{fiop.codeProjet}</td>
                        <td><StatutBadge statut={fiop.statut} /></td>
                        <td className="fiop-row-actions">
                          <button type="button" className="mini-btn" onClick={() => navigate(`/fiop/${fiop.id}`)}>Voir</button>
                          {fiop.statut === 'BROUILLON' && (
                            <>
                              <button type="button" className="mini-btn" disabled={busy} onClick={() => navigate(`/fiop/${fiop.id}?mode=edit`)}>Modifier</button>
                              <button type="button" className="mini-btn" disabled={busy} onClick={() => handleSoumettre(fiop)}>Soumettre</button>
                              <button type="button" className="mini-btn danger" disabled={busy} onClick={() => handleDeleteFiop(fiop)}>Supprimer</button>
                            </>
                          )}
                          {fiop.statut === 'REJETE_UEP' && (
                            <button type="button" className="mini-btn" disabled={busy} onClick={() => navigate(`/fiop/${fiop.id}?mode=correct`)}>Corriger</button>
                          )}
                        </td>
                      </tr>
                      {fiop.statut === 'REJETE_UEP' && fiop.motifRejet && (
                        <tr><td colSpan={4} className="motif-rejet">Motif du retour : {fiop.motifRejet}</td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {mine.length === 0 && (
                  <tr><td colSpan={4}>Aucun FIOP créé pour le moment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  };

  const renderSuperviseurUepView = () => {
    const aValider = fiops.filter((f) => f.statut === 'SOUMIS_SUPERVISEUR_UEP');
    const aTransmettre = fiops.filter((f) => f.statut === 'VALIDE_ACTIF');
    const traites = fiops.filter((f) => estTraite(f.statut));
    const autres = fiops.filter((f) => f.statut !== 'SOUMIS_SUPERVISEUR_UEP' && !estTraite(f.statut));

    return (
      <>
        <div className="stats-row">
          <StatCard value={aValider.length} label="À valider" tone="amber" />
          <StatCard value={aTransmettre.length} label="À transmettre au MPCE" tone="red" />
          <StatCard value={traites.length} label="Projets traités" tone="green" />
          <StatCard value={fiops.length} label="FIOP au total" tone="neutral" />
        </div>

        <section className="fiop-card">
          <h2>FIOP à valider</h2>
          {actionError && <div className="form-error">{actionError}</div>}
          <div className="fiop-table-wrap">
            <table className="fiop-table">
              <thead><tr><th>Titre</th><th>Code</th><th>Créé par</th><th></th></tr></thead>
              <tbody>
                {aValider.map((fiop) => {
                  const busy = Boolean(busyIds[fiop.id]);
                  return (
                    <tr key={fiop.id}>
                      <td>{fiop.titre}</td>
                      <td>{fiop.codeProjet}</td>
                      <td>{fiop.creeParUsername}</td>
                      <td className="fiop-row-actions">
                        <button type="button" className="mini-btn" onClick={() => navigate(`/fiop/${fiop.id}`)}>Voir</button>
                        <button type="button" className="mini-btn" disabled={busy} onClick={() => navigate(`/fiop/${fiop.id}?mode=edit`)}>Modifier</button>
                        <button type="button" className="mini-btn" disabled={busy} onClick={() => handleValider(fiop)}>Valider</button>
                        <button type="button" className="mini-btn danger" disabled={busy} onClick={() => openReject(fiop)}>Retourner</button>
                      </td>
                    </tr>
                  );
                })}
                {aValider.length === 0 && <tr><td colSpan={4}>Rien à valider pour le moment.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {renderProjetsTraites(traites)}

        <section className="fiop-card secondary-card">
          <h2>Autres FIOP</h2>
          <div className="fiop-table-wrap">
            <table className="fiop-table">
              <thead><tr><th>Titre</th><th>Code</th><th>Créé par</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                {autres.map((fiop) => (
                  <tr key={fiop.id}>
                    <td>{fiop.titre}</td>
                    <td>{fiop.codeProjet}</td>
                    <td>{fiop.creeParUsername}</td>
                    <td><StatutBadge statut={fiop.statut} /></td>
                    <td className="fiop-row-actions">
                      <button type="button" className="mini-btn" onClick={() => navigate(`/fiop/${fiop.id}`)}>Voir</button>
                    </td>
                  </tr>
                ))}
                {autres.length === 0 && <tr><td colSpan={5}>Aucun autre FIOP.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  };

  // Actions possibles sur un FIOP selon le rôle et le statut (mêmes règles que les vues par rôle).
  const renderActions = (fiop) => {
    const busy = Boolean(busyIds[fiop.id]);
    const s = fiop.statut;
    return (
      <>
        <button type="button" className="mini-btn" onClick={() => navigate(`/fiop/${fiop.id}`)}>Voir</button>
        {role === 'Porteur_PROJET' && s === 'BROUILLON' && (
          <>
            <button type="button" className="mini-btn" disabled={busy} onClick={() => navigate(`/fiop/${fiop.id}?mode=edit`)}>Modifier</button>
            <button type="button" className="mini-btn" disabled={busy} onClick={() => handleSoumettre(fiop)}>Soumettre</button>
            <button type="button" className="mini-btn danger" disabled={busy} onClick={() => handleDeleteFiop(fiop)}>Supprimer</button>
          </>
        )}
        {role === 'Porteur_PROJET' && s === 'REJETE_UEP' && (
          <button type="button" className="mini-btn" disabled={busy} onClick={() => navigate(`/fiop/${fiop.id}?mode=correct`)}>Corriger</button>
        )}
        {role === 'SUPERVISEUR_UEP' && s === 'SOUMIS_SUPERVISEUR_UEP' && (
          <>
            <button type="button" className="mini-btn" disabled={busy} onClick={() => navigate(`/fiop/${fiop.id}?mode=edit`)}>Modifier</button>
            <button type="button" className="mini-btn" disabled={busy} onClick={() => handleValider(fiop)}>Valider</button>
            <button type="button" className="mini-btn danger" disabled={busy} onClick={() => openReject(fiop)}>Retourner</button>
          </>
        )}
        {role === 'SUPERVISEUR_UEP' && estTraite(s) && renderBoutonTransmission(fiop)}
      </>
    );
  };

  const renderFiltreView = () => {
    // Le porteur ne voit que ses propres FIOP, comme dans sa vue habituelle.
    const visibles = role === 'Porteur_PROJET' ? fiops.filter((f) => f.creeParUsername === auth.username) : fiops;
    const liste = visibles.filter((f) => f.statut === statutFiltre);
    const avecCodePip = estTraite(statutFiltre);
    const colonnes = avecCodePip ? 5 : 4;

    return (
      <section className="fiop-card">
        <div className="card-header-row">
          <h2>
            FIOP — <StatutBadge statut={statutFiltre} /> <span className="filtre-count">({liste.length})</span>
          </h2>
          <button type="button" className="secondary-btn" onClick={() => navigate('/fiop')}>
            Voir tous les FIOP
          </button>
        </div>
        {actionError && <div className="form-error">{actionError}</div>}
        <div className="fiop-table-wrap">
          <table className="fiop-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Code</th>
                {avecCodePip ? <th>Code PIP</th> : null}
                <th>Créé par</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((fiop) => (
                <React.Fragment key={fiop.id}>
                  <tr>
                    <td>{fiop.titre}</td>
                    <td>{fiop.codeProjet}</td>
                    {avecCodePip && (
                      <td>{fiop.codeInternePip ? <span className="pip-badge pip-soumis">{fiop.codeInternePip}</span> : '—'}</td>
                    )}
                    <td>{fiop.creeParUsername}</td>
                    <td className="fiop-row-actions">{renderActions(fiop)}</td>
                  </tr>
                  {fiop.statut === 'REJETE_UEP' && fiop.motifRejet && (
                    <tr><td colSpan={colonnes} className="motif-rejet">Motif du retour : {fiop.motifRejet}</td></tr>
                  )}
                </React.Fragment>
              ))}
              {liste.length === 0 && <tr><td colSpan={colonnes}>Aucun FIOP à cette étape.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  // Transmission du canevas FIOP au bureau du MPCE par e-mail (UC-B8), renvoi compris.
  const renderBoutonTransmission = (fiop) => (
    <button type="button" className="mini-btn" disabled={Boolean(busyIds[fiop.id])} onClick={() => setTransmissionFiop(fiop)}>
      {fiop.statut === 'TRANSMIS_MPCE' ? 'Renvoyer au MPCE' : 'Transmettre au MPCE'}
    </button>
  );

  // Projets traités (validés par l'UEP) : le code PIP apparaît une fois saisi dans le formulaire du PIP.
  const renderProjetsTraites = (traites) => (
    <section className="fiop-card">
      <h2>Projets traités — code PIP et transmission au MPCE</h2>
      <div className="fiop-table-wrap">
        <table className="fiop-table">
          <thead><tr><th>Titre</th><th>Code projet</th><th>Code PIP</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {traites.map((fiop) => (
              <tr key={fiop.id}>
                <td>{fiop.titre}</td>
                <td>{fiop.codeProjet}</td>
                <td>
                  {fiop.codeInternePip
                    ? <span className="pip-badge pip-soumis">{fiop.codeInternePip}</span>
                    : '—'}
                </td>
                <td><StatutBadge statut={fiop.statut} /></td>
                <td className="fiop-row-actions">
                  <button type="button" className="mini-btn" onClick={() => navigate(`/fiop/${fiop.id}`)}>Voir</button>
                  {renderBoutonTransmission(fiop)}
                </td>
              </tr>
            ))}
            {traites.length === 0 && <tr><td colSpan={5}>Aucun projet traité pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="fiop-page">
      <div className="fiop-content">
        {statutFiltre && renderFiltreView()}
        {!statutFiltre && role === 'Porteur_PROJET' && renderOperateurView()}
        {!statutFiltre && role === 'SUPERVISEUR_UEP' && renderSuperviseurUepView()}
      </div>

      {confirmAction && (
        <Modal title={confirmAction.title} onClose={() => setConfirmAction(null)}>
          <div className="modal-form">
            <p>{confirmAction.message}</p>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setConfirmAction(null)}>Annuler</button>
              <button type="button" className={confirmAction.danger ? 'danger-btn' : undefined} onClick={runConfirmed} autoFocus>
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {rejectFiop && (
        <Modal
          title={`Retourner « ${rejectFiop.titre} »`}
          onClose={() => setRejectFiop(null)}
        >
          <form onSubmit={submitReject} className="modal-form">
            <div className="field">
              <label>Motif du retour</label>
              <textarea rows={3} value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)} autoFocus required />
            </div>
            {rejectError && <div className="form-error">{rejectError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setRejectFiop(null)}>Annuler</button>
              <button type="submit" className="danger-btn" disabled={rejectSubmitting}>{rejectSubmitting ? 'Envoi...' : 'Confirmer le retour'}</button>
            </div>
          </form>
        </Modal>
      )}

      {transmissionFiop && (
        <TransmissionMpceModal
          fiop={transmissionFiop}
          onClose={() => setTransmissionFiop(null)}
          onTransmis={handleTransmisMpce}
        />
      )}
    </div>
  );
}
