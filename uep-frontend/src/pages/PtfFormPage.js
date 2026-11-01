import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/client';
import './FiopPage.css';
import './FiopWorkspacePage.css';
import './PtfPage.css';

// Saisie d'un partenaire technique et financier, en page pleine : /partenaires/nouveau ou
// /partenaires/<id>/modifier (UC-D1 à UC-D3, Porteur de Projet). Le document du protocole
// d'accord n'est pas déposé ici : seuls sa référence et sa date sont saisies.
const EMPTY_PTF = {
  nom: '', pays: '', telephone: '', courriel: '', dateProtocole: '', referenceProtocole: '',
};

function toForm(ptf) {
  return {
    nom: ptf.nom || '',
    pays: ptf.pays || '',
    telephone: ptf.telephone || '',
    courriel: ptf.courriel || '',
    dateProtocole: ptf.dateProtocole || '',
    referenceProtocole: ptf.referenceProtocole || '',
  };
}

export default function PtfFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ptf, setPtf] = useState(null); // partenaire existant (modification)
  const [form, setForm] = useState(EMPTY_PTF);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [ready, setReady] = useState(!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await apiClient.get('/ptf');
        const existant = data.find((p) => String(p.id) === id);
        if (!existant) {
          setLoadError('Partenaire introuvable.');
          return;
        }
        setPtf(existant);
        setForm(toForm(existant));
        setReady(true);
      } catch (err) {
        setLoadError('Impossible de charger le partenaire.');
      }
    })();
  }, [id]);

  const retourListe = () => navigate('/partenaires');

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    const payload = { ...form, dateProtocole: form.dateProtocole || null };
    try {
      await (ptf
        ? apiClient.put(`/ptf/${ptf.id}`, payload)
        : apiClient.post('/ptf', payload));
      retourListe();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.message) {
        setErrors(data);
      } else {
        setErrors({ general: data?.message || "L'enregistrement a échoué." });
      }
      setSaving(false);
    }
  };

  const title = ptf ? `Modifier « ${ptf.nom} »` : 'Nouveau partenaire (PTF)';

  return (
    <div className="fiop-page">
      <div className="fiop-content">
        <div className="workspace-page-header">
          <button type="button" className="secondary-btn" onClick={retourListe}>← Retour aux partenaires</button>
          <h1>{title}</h1>
        </div>

        {!ready ? (
          loadError ? <div className="form-error">{loadError}</div> : <p>Chargement...</p>
        ) : (
          <form onSubmit={submit} className="ptf-form-layout">
            <section className="fiop-card">
              <h3 className="ptf-form-title">Partenaire</h3>
              <div className="field">
                <label htmlFor="ptf-nom">Nom <span className="required-mark">*</span></label>
                <input id="ptf-nom" type="text" value={form.nom} onChange={set('nom')} maxLength={200} required />
                {errors.nom && <span className="field-error">{errors.nom}</span>}
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="ptf-pays">Pays</label>
                  <input id="ptf-pays" type="text" value={form.pays} onChange={set('pays')} maxLength={100} />
                </div>
                <div className="field">
                  <label htmlFor="ptf-tel">Téléphone</label>
                  <input id="ptf-tel" type="tel" value={form.telephone} onChange={set('telephone')} maxLength={30} />
                  {errors.telephone && <span className="field-error">{errors.telephone}</span>}
                </div>
              </div>
              <div className="field">
                <label htmlFor="ptf-courriel">Courriel</label>
                <input id="ptf-courriel" type="email" value={form.courriel} onChange={set('courriel')} maxLength={100} />
                {errors.courriel && <span className="field-error">{errors.courriel}</span>}
              </div>
              <h3 className="ptf-form-title">Protocole d'accord</h3>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="ptf-ref">Référence</label>
                  <input id="ptf-ref" type="text" value={form.referenceProtocole} onChange={set('referenceProtocole')} maxLength={100} />
                </div>
                <div className="field">
                  <label htmlFor="ptf-date">Date de signature</label>
                  <input id="ptf-date" type="date" value={form.dateProtocole} onChange={set('dateProtocole')} />
                </div>
              </div>
              {errors.general && <div className="form-error">{errors.general}</div>}
              <div className="ptf-form-actions">
                <button type="button" className="secondary-btn" onClick={retourListe}>Annuler</button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Enregistrement...' : ptf ? 'Enregistrer les modifications' : 'Enregistrer le partenaire'}
                </button>
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}
