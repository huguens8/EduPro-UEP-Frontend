import React, { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';
import { ACCEPTED_FILE_TYPES, apiErrorMessage, downloadFile } from '../api/download';
import Modal from '../components/Modal';
import { formatDateTimeFr } from './fiopShared';
import './PtfPage.css';

export const TYPES_DOCUMENT = [
  'Document de projet',
  "Protocole d'accord",
  'Convention de financement',
  'Étude de faisabilité',
  'Rapport',
  'Plan / Carte',
  'Photo',
  'Autre',
];

// UC-E1 — Archiver un document de projet : le Porteur de Projet créateur du FIOP téléverse les
// pièces du dossier, le Superviseur UEP aussi et il les consulte tous. Une fois le projet traité
// (FIOP validé par l'UEP), seul le Superviseur UEP peut encore les modifier (voir FiopWorkspacePage).
// Re-téléverser un fichier du même nom crée une nouvelle version (l'ancienne reste conservée côté serveur).
export default function DocumentsTabContent({ fiop, canEdit }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [fichier, setFichier] = useState(null);
  const [typeDocument, setTypeDocument] = useState(TYPES_DOCUMENT[0]);
  const [description, setDescription] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  const [retrait, setRetrait] = useState(null);
  const [retraitError, setRetraitError] = useState('');

  const load = useCallback(async () => {
    setListError('');
    try {
      const { data } = await apiClient.get(`/fiop/${fiop.id}/documents`);
      setDocuments(data);
    } catch (err) {
      setListError(err.response?.data?.message || 'Impossible de charger les documents du projet.');
    } finally {
      setLoading(false);
    }
  }, [fiop.id]);

  useEffect(() => { load(); }, [load]);

  const upload = async (event) => {
    event.preventDefault();
    if (!fichier) {
      setUploadError('Choisissez un fichier à archiver.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('fichier', fichier);
      body.append('typeDocument', typeDocument);
      if (description.trim()) body.append('description', description.trim());
      await apiClient.post(`/fiop/${fiop.id}/documents`, body);
      setFichier(null);
      setDescription('');
      if (fileInput.current) fileInput.current.value = '';
      load();
    } catch (err) {
      setUploadError(await apiErrorMessage(err, "L'archivage du document a échoué."));
    } finally {
      setUploading(false);
    }
  };

  const telecharger = async (doc) => {
    setListError('');
    try {
      await downloadFile(`/documents/${doc.id}/fichier`, doc.nomDocument);
    } catch (err) {
      setListError(await apiErrorMessage(err, 'Téléchargement impossible.'));
    }
  };

  const confirmRetrait = async () => {
    setRetraitError('');
    try {
      await apiClient.delete(`/documents/${retrait.id}`);
      setRetrait(null);
      load();
    } catch (err) {
      setRetraitError(err.response?.data?.message || 'Le retrait a échoué.');
    }
  };

  return (
    <div>
      <p className="documents-hint">
        Dossier d'archives du projet {fiop.codeProjet} : documents de projet, protocoles, conventions, rapports…
        Formats acceptés : PDF, Word, Excel, PowerPoint, OpenDocument, images, ZIP (20 Mo maximum).
      </p>

      {canEdit && (
        <form className="documents-upload" onSubmit={upload}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="doc-fichier">Fichier <span className="required-mark">*</span></label>
              <input
                id="doc-fichier"
                ref={fileInput}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={(e) => setFichier(e.target.files[0] || null)}
              />
            </div>
            <div className="field">
              <label htmlFor="doc-type">Type de document <span className="required-mark">*</span></label>
              <select id="doc-type" value={typeDocument} onChange={(e) => setTypeDocument(e.target.value)}>
                {TYPES_DOCUMENT.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="doc-description">Description</label>
            <textarea id="doc-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {uploadError && <div className="form-error">{uploadError}</div>}
          <div className="documents-upload-actions">
            <button type="submit" className="primary-btn" disabled={uploading}>
              {uploading ? 'Archivage...' : 'Archiver le document'}
            </button>
          </div>
        </form>
      )}

      {listError && <div className="form-error">{listError}</div>}
      <div className="fiop-table-wrap">
        <table className="fiop-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Version</th>
              <th>Ajouté</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <div className="ptf-nom">{doc.nomDocument}</div>
                  {doc.description && <div className="ptf-sub">{doc.description}</div>}
                </td>
                <td>{doc.typeDocument}</td>
                <td><span className="version-badge">v{doc.version}</span></td>
                <td>
                  <div>{formatDateTimeFr(doc.dateAjout)}</div>
                  {doc.ajoutePar && <div className="ptf-sub">par {doc.ajoutePar}</div>}
                </td>
                <td className="fiop-row-actions">
                  <button type="button" className="mini-btn" onClick={() => telecharger(doc)}>Télécharger</button>
                  {canEdit && (
                    <button type="button" className="mini-btn danger" onClick={() => { setRetraitError(''); setRetrait(doc); }}>
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && documents.length === 0 && (
              <tr><td colSpan={5}>Aucun document archivé pour ce projet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {retrait && (
        <Modal title="Retirer le document" onClose={() => setRetrait(null)}>
          <p className="modal-warning">
            Retirer « {retrait.nomDocument} » du dossier du projet ? Le fichier reste conservé dans les archives du serveur.
          </p>
          {retraitError && <div className="form-error">{retraitError}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={() => setRetrait(null)}>Annuler</button>
            <button type="button" className="danger-btn" onClick={confirmRetrait}>Retirer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
