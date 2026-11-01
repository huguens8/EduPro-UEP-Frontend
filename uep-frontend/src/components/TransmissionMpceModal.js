import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { apiErrorMessage, downloadFile } from '../api/download';
import Modal from './Modal';
import './TransmissionMpceModal.css';

function formatDateHeure(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * UC-B8 — Transmettre le FIOP au MPCE par e-mail. Fenêtre de confirmation du Superviseur UEP :
 * le canevas FIOP (Excel) est généré par le serveur et envoyé en pièce jointe à l'adresse officielle
 * du bureau du MPCE (fixée par configuration, non modifiable ici). Renvois permis, tous tracés.
 */
export default function TransmissionMpceModal({ fiop, onClose, onTransmis }) {
  const [destinataire, setDestinataire] = useState(null);
  const [envois, setEnvois] = useState([]);
  const [exercices, setExercices] = useState([]);
  const [idExercice, setIdExercice] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([apiClient.get(`/fiop/${fiop.id}/transmissions-mpce`), apiClient.get('/reference/exercices')])
      .then(([historique, refs]) => {
        setDestinataire(historique.data.destinataire);
        setEnvois(historique.data.envois);
        setExercices(refs.data);
      })
      .catch(() => setError("Impossible de charger l'historique des transmissions."))
      .finally(() => setLoading(false));
  }, [fiop.id]);

  const renvoi = envois.length > 0;

  // Même classeur que la pièce jointe (même exercice), pour le vérifier ou le garder avant l'envoi.
  const telecharger = async () => {
    setError('');
    setDownloading(true);
    try {
      const params = idExercice ? `?idExercice=${idExercice}` : '';
      await downloadFile(`/rapports/projets/${fiop.id}/canevas${params}`, `FIOP_canevas-${fiop.codeProjet}.xlsx`);
    } catch (err) {
      setError(await apiErrorMessage(err, 'Le téléchargement du canevas a échoué.'));
    } finally {
      setDownloading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post(`/fiop/${fiop.id}/transmissions-mpce`, {
        message: message.trim() || null,
        idExercice: idExercice ? Number(idExercice) : null,
      });
      onTransmis();
    } catch (err) {
      setError(err.response?.data?.message || "L'e-mail n'a pas pu être envoyé au MPCE.");
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`${renvoi ? 'Renvoyer' : 'Transmettre'} « ${fiop.titre} » au MPCE`} onClose={onClose}>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <form onSubmit={submit} className="modal-form">
          <p className="transmission-intro">
            Le canevas FIOP officiel (fichier Excel) sera généré et envoyé par e-mail au bureau du MPCE.
          </p>
          <dl className="transmission-recap">
            <dt>Destinataire</dt>
            <dd>{destinataire || <span className="transmission-manquant">adresse non configurée</span>}</dd>
            <dt>Pièce jointe</dt>
            <dd>FIOP_canevas-{fiop.codeProjet}.xlsx</dd>
          </dl>
          <div className="field">
            <label htmlFor="transmission-exercice">Exercice (facultatif)</label>
            <select id="transmission-exercice" value={idExercice} onChange={(e) => setIdExercice(e.target.value)}>
              <option value="">FIOP seule (sans bilan ni tranche annuelle)</option>
              {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="transmission-message">Message au MPCE (facultatif)</label>
            <textarea id="transmission-message" rows={3} maxLength={2000} value={message}
              onChange={(e) => setMessage(e.target.value)} />
          </div>

          {renvoi && (
            <div className="transmission-historique">
              <h4>Envois précédents</h4>
              <ul>
                {envois.map((e) => (
                  <li key={e.id}>
                    {formatDateHeure(e.dateEnvoi)} — par {e.expediteur} à {e.destinataire}
                    {e.exercice ? ` (exercice ${e.exercice})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-btn transmission-telecharger" onClick={telecharger} disabled={downloading}>
              {downloading ? 'Téléchargement...' : 'Télécharger le canevas'}
            </button>
            <button type="button" className="secondary-btn" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={submitting || !destinataire}>
              {submitting ? 'Envoi...' : renvoi ? "Renvoyer l'e-mail" : 'Transmettre au MPCE'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
