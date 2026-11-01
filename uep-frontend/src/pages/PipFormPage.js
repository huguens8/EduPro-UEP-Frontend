import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { estTraite, formatMontant } from './fiopShared';
import './FiopPage.css';
import './FiopWorkspacePage.css';
import './PtfPage.css';
import './PipPage.css';

// Saisie d'une ligne du PIP, en page pleine : /pip/nouveau?exercice=<id> (UC-C1) ou /pip/<id>/modifier
// (UC-C2), par le Superviseur UEP. Seuls les projets traités (FIOP validé par l'UEP) et pas encore
// inscrits à l'exercice sont proposés. Rien n'est automatique : le Superviseur UEP saisit aussi le
// code PIP du projet (enregistré sur le projet, valable pour tous les exercices). Le serveur
// applique les mêmes règles.
const EMPTY_PIP = {
  idProjet: '',
  codeInternePip: '',
  codeBudgetaire: '',
  localisation: '',
  montantTresorPublic: '',
  montantAutresInternes: '',
  sourceAutresInternes: '',
  montantBilateral: '',
  montantMultilateral: '',
  sourceExterne: '',
  typeFinancementExterne: '',
};

const MONTANT_KEYS = ['montantTresorPublic', 'montantAutresInternes', 'montantBilateral', 'montantMultilateral'];

const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
const montantVersChamp = (v) => (num(v) ? String(v) : '');

function toForm(ligne) {
  return {
    idProjet: String(ligne.idProjet),
    codeInternePip: ligne.codeInternePip || '',
    codeBudgetaire: ligne.codeBudgetaire || '',
    localisation: ligne.localisation || '',
    montantTresorPublic: montantVersChamp(ligne.montantTresorPublic),
    montantAutresInternes: montantVersChamp(ligne.montantAutresInternes),
    sourceAutresInternes: ligne.sourceAutresInternes || '',
    montantBilateral: montantVersChamp(ligne.montantBilateral),
    montantMultilateral: montantVersChamp(ligne.montantMultilateral),
    sourceExterne: ligne.sourceExterne || '',
    typeFinancementExterne: ligne.typeFinancementExterne || '',
  };
}

export default function PipFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const modification = Boolean(id);

  const [ligne, setLigne] = useState(null); // ligne existante (modification)
  const [idExercice, setIdExercice] = useState(searchParams.get('exercice') || '');
  const [exerciceLibelle, setExerciceLibelle] = useState('');
  const [projetsInscriptibles, setProjetsInscriptibles] = useState([]);
  const [form, setForm] = useState(EMPTY_PIP);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: exercices } = await apiClient.get('/reference/exercices');
        if (modification) {
          const { data } = await apiClient.get(`/pip/${id}`);
          setLigne(data);
          setForm(toForm(data));
          setIdExercice(String(data.idExercice));
          setExerciceLibelle(data.exerciceLibelle);
        } else {
          const exercice = exercices.find((e) => String(e.id) === searchParams.get('exercice'));
          if (!exercice) {
            setLoadError('Exercice introuvable : revenez au PIP et choisissez un exercice.');
            return;
          }
          setExerciceLibelle(exercice.libelle);
          const [fiops, inscrits] = await Promise.all([
            apiClient.get('/fiop'),
            apiClient.get('/pip', { params: { exercice: exercice.id } }),
          ]);
          const dejaInscrits = new Set(inscrits.data.map((l) => l.idProjet));
          setProjetsInscriptibles(fiops.data
            .filter((p) => estTraite(p.statut) && !dejaInscrits.has(p.id))
            .sort((a, b) => (a.codeInternePip || '').localeCompare(b.codeInternePip || '')));
        }
        setReady(true);
      } catch (err) {
        setLoadError(err.response?.data?.message || 'Impossible de charger le PIP.');
      }
    })();
  }, [id, modification, searchParams]);

  const retourListe = () => navigate(idExercice ? `/pip?exercice=${idExercice}` : '/pip');

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  // Choix du projet : on reprend son code PIP s'il en a déjà un (inscrit à un autre exercice).
  const choisirProjet = (event) => {
    const idProjet = event.target.value;
    const projet = projetsInscriptibles.find((p) => String(p.id) === idProjet);
    setForm((prev) => ({ ...prev, idProjet, codeInternePip: projet?.codeInternePip || '' }));
  };

  const totaux = useMemo(() => {
    const c = num(form.montantTresorPublic) + num(form.montantAutresInternes);
    const f = num(form.montantBilateral) + num(form.montantMultilateral);
    return { c, f, g: c + f };
  }, [form]);
  const avecExterne = totaux.f > 0;

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    const payload = {
      ...form,
      idProjet: form.idProjet ? Number(form.idProjet) : null,
      idExercice: Number(idExercice),
      typeFinancementExterne: form.typeFinancementExterne || null,
    };
    MONTANT_KEYS.forEach((k) => { payload[k] = form[k] === '' ? null : Number(form[k]); });
    try {
      if (modification) {
        await apiClient.put(`/pip/${id}`, payload);
      } else {
        await apiClient.post('/pip', payload);
      }
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

  const montantField = (key, label) => (
    <div className="field">
      <label htmlFor={`pip-${key}`}>{label}</label>
      <input id={`pip-${key}`} type="number" min="0" step="0.01" inputMode="decimal"
        value={form[key]} onChange={set(key)} placeholder="0,00" />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </div>
  );

  const title = modification
    ? `Modifier le PIP ${exerciceLibelle}${ligne ? ` — ${ligne.codeInternePip || ligne.codeProjet}` : ''}`
    : `Inscrire un projet au PIP ${exerciceLibelle}`;

  return (
    <div className="fiop-page">
      <div className="fiop-content">
        <div className="workspace-page-header">
          <button type="button" className="secondary-btn" onClick={retourListe}>← Retour au PIP</button>
          <h1>{title}</h1>
        </div>

        {!ready ? (
          loadError ? <div className="form-error">{loadError}</div> : <p>Chargement...</p>
        ) : (
          <form onSubmit={submit} className="pip-form-layout">
            <div className="pip-form-main">
              <section className="fiop-card">
                <h2>Projet</h2>
                {modification ? (
                  <div className="pip-projet-fixe">
                    <div><strong>{ligne.codeProjet}</strong> — {ligne.titre}</div>
                    {ligne.programmeLibelle && <div className="ptf-sub">{ligne.programmeLibelle}</div>}
                    {ligne.sousProgrammeLibelle && <div className="ptf-sub">{ligne.sousProgrammeLibelle}</div>}
                  </div>
                ) : (
                  <div className="field">
                    <label htmlFor="pip-projet">Projet traité <span className="required-mark">*</span></label>
                    <select id="pip-projet" value={form.idProjet} onChange={choisirProjet} required>
                      <option value="">— Choisir un projet —</option>
                      {projetsInscriptibles.map((p) => (
                        <option key={p.id} value={p.id}>{p.codeInternePip || p.codeProjet} — {p.titre}</option>
                      ))}
                    </select>
                    <span className="ptf-sub">
                      {projetsInscriptibles.length === 0
                        ? 'Tous les projets traités sont déjà inscrits au PIP de cet exercice.'
                        : 'Seuls les projets traités (FIOP validé par l\'UEP) et pas encore inscrits à cet exercice sont proposés.'}
                    </span>
                    {errors.idProjet && <span className="field-error">{errors.idProjet}</span>}
                  </div>
                )}
                <div className="field">
                  <label htmlFor="pip-code-pip">Code PIP du projet <span className="required-mark">*</span></label>
                  <input id="pip-code-pip" type="text" value={form.codeInternePip} onChange={set('codeInternePip')}
                    maxLength={50} required placeholder="ex. PIP-2026-0036" />
                  <span className="ptf-sub">Saisi par l'UEP ; il vaut pour tous les exercices du projet.</span>
                  {errors.codeInternePip && <span className="field-error">{errors.codeInternePip}</span>}
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="pip-code">Code budgétaire</label>
                    <input id="pip-code" type="text" value={form.codeBudgetaire} onChange={set('codeBudgetaire')}
                      maxLength={50} placeholder="ex. 1311-1-12-50-28" />
                    {errors.codeBudgetaire && <span className="field-error">{errors.codeBudgetaire}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="pip-localisation">Localisation</label>
                    <input id="pip-localisation" type="text" value={form.localisation} onChange={set('localisation')}
                      maxLength={100} placeholder="Par défaut : département du projet, ou NATIONAL" />
                    {errors.localisation && <span className="field-error">{errors.localisation}</span>}
                  </div>
                </div>
              </section>

              <section className="fiop-card">
                <h2>Ressources nationales</h2>
                <div className="field-row">
                  {montantField('montantTresorPublic', 'Trésor public (A)')}
                  {montantField('montantAutresInternes', 'Autres financements internes (B)')}
                </div>
                {num(form.montantAutresInternes) > 0 && (
                  <div className="field">
                    <label htmlFor="pip-source-b">Source des autres financements internes</label>
                    <input id="pip-source-b" type="text" value={form.sourceAutresInternes}
                      onChange={set('sourceAutresInternes')} maxLength={50} placeholder="ex. FNE" />
                  </div>
                )}
              </section>

              <section className="fiop-card">
                <h2>Ressources externes</h2>
                <div className="field-row">
                  {montantField('montantBilateral', 'Bilatérale (D)')}
                  {montantField('montantMultilateral', 'Multilatérale (E)')}
                </div>
                {avecExterne && (
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="pip-source-ext">Bailleur <span className="required-mark">*</span></label>
                      <input id="pip-source-ext" type="text" value={form.sourceExterne} onChange={set('sourceExterne')}
                        maxLength={50} placeholder="ex. BID, BM, CDB" />
                      {errors.sourceExterne && <span className="field-error">{errors.sourceExterne}</span>}
                    </div>
                    <div className="field">
                      <label htmlFor="pip-type">Type <span className="required-mark">*</span></label>
                      <select id="pip-type" value={form.typeFinancementExterne} onChange={set('typeFinancementExterne')}>
                        <option value="">— Choisir —</option>
                        <option value="DON">Don</option>
                        <option value="PRET">Prêt</option>
                      </select>
                      {errors.typeFinancementExterne && <span className="field-error">{errors.typeFinancementExterne}</span>}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <aside className="fiop-card pip-form-recap">
              <h2>Récapitulatif</h2>
              <dl>
                <dt>Trésor public (A)</dt><dd>{formatMontant(num(form.montantTresorPublic))}</dd>
                <dt>Autres fin. internes (B)</dt><dd>{formatMontant(num(form.montantAutresInternes))}</dd>
                <dt className="pip-recap-sous-total">Ressources nationales (C = A + B)</dt>
                <dd className="pip-recap-sous-total">{formatMontant(totaux.c)}</dd>
                <dt>Bilatérale (D)</dt><dd>{formatMontant(num(form.montantBilateral))}</dd>
                <dt>Multilatérale (E)</dt><dd>{formatMontant(num(form.montantMultilateral))}</dd>
                <dt className="pip-recap-sous-total">Ressources externes (F = D + E)</dt>
                <dd className="pip-recap-sous-total">{formatMontant(totaux.f)}</dd>
                <dt className="pip-recap-total">Total PIP (G = C + F)</dt>
                <dd className="pip-recap-total">{formatMontant(totaux.g)} <span>HTG</span></dd>
              </dl>
              {errors.general && <div className="form-error">{errors.general}</div>}
              <div className="pip-recap-actions">
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Enregistrement...' : modification ? 'Enregistrer les modifications' : 'Inscrire au PIP'}
                </button>
                <button type="button" className="secondary-btn" onClick={retourListe}>Annuler</button>
              </div>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
