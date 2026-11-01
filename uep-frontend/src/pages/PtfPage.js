import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import { formatDateFr } from './fiopShared';
import './FiopPage.css';
import './PtfPage.css';

// UC-D1 à UC-D3 : le Porteur de Projet enregistre les partenaires techniques et financiers et
// la référence et la date de leur protocole d'accord ; les superviseurs consultent.
export default function PtfPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const canEdit = auth.role === 'Porteur_PROJET';

  const [ptfs, setPtfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setListError('');
    try {
      const { data } = await apiClient.get('/ptf');
      setPtfs(data);
    } catch (err) {
      setListError('Impossible de charger les partenaires.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    setDeleteError('');
    try {
      await apiClient.delete(`/ptf/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'La suppression a échoué.');
    }
  };

  return (
    <div className="fiop-page">
      <div className="fiop-content">
        <section className="fiop-card">
          <div className="card-header-row">
            <h2>Partenaires techniques et financiers</h2>
            {canEdit && (
              <button type="button" className="primary-btn" onClick={() => navigate('/partenaires/nouveau')}>+ Nouveau PTF</button>
            )}
          </div>
          {listError && <div className="form-error">{listError}</div>}
          <div className="fiop-table-wrap">
            <table className="fiop-table">
              <thead>
                <tr>
                  <th>Partenaire</th>
                  <th>Contact</th>
                  <th>Protocole d'accord</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {ptfs.map((ptf) => (
                  <tr key={ptf.id}>
                    <td>
                      <div className="ptf-nom">{ptf.nom}</div>
                      {ptf.pays && <div className="ptf-sub">{ptf.pays}</div>}
                    </td>
                    <td>
                      {ptf.courriel && <div>{ptf.courriel}</div>}
                      {ptf.telephone && <div className="ptf-sub">{ptf.telephone}</div>}
                      {!ptf.courriel && !ptf.telephone && '—'}
                    </td>
                    <td>
                      {ptf.referenceProtocole || ptf.dateProtocole ? (
                        <>
                          <div>{ptf.referenceProtocole || 'Sans référence'}</div>
                          {ptf.dateProtocole && <div className="ptf-sub">Signé le {formatDateFr(ptf.dateProtocole)}</div>}
                        </>
                      ) : '—'}
                    </td>
                    {canEdit && (
                      <td className="fiop-row-actions">
                        <button type="button" className="mini-btn" onClick={() => navigate(`/partenaires/${ptf.id}/modifier`)}>Modifier</button>
                        <button
                          type="button"
                          className="mini-btn danger"
                          disabled={ptf.engageSurUnProjet}
                          title={ptf.engageSurUnProjet ? 'Partenaire engagé sur un projet : suppression impossible.' : undefined}
                          onClick={() => { setDeleteError(''); setDeleting(ptf); }}
                        >
                          Supprimer
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {!loading && ptfs.length === 0 && (
                  <tr><td colSpan={canEdit ? 4 : 3}>Aucun partenaire enregistré pour le moment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {deleting && (
        <Modal title="Supprimer le partenaire" onClose={() => setDeleting(null)}>
          <p className="modal-warning">
            Supprimer définitivement « {deleting.nom} » ?
          </p>
          {deleteError && <div className="form-error">{deleteError}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={() => setDeleting(null)}>Annuler</button>
            <button type="button" className="danger-btn" onClick={confirmDelete}>Supprimer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
