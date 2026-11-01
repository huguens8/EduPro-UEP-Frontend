import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { apiErrorMessage, downloadFile } from '../api/download';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import { formatDateTimeFr, formatMontant, StatCard } from './fiopShared';
import './FiopPage.css';
import './PtfPage.css';
import './PipPage.css';

// UC-C1 à UC-C3 : le PIP d'un exercice, présenté comme le document officiel du MENFP (programme,
// sous-programme, projets ; colonnes A à G). Le PIP vient après le cycle de vie du FIOP : seul un
// projet traité (FIOP validé par l'UEP) peut y être inscrit. Le Superviseur UEP inscrit, met à jour
// et retire les projets, à la main : rien n'est automatique (règles contrôlées aussi côté serveur).
// La saisie se fait sur une page dédiée (PipFormPage) ; l'exercice affiché est gardé dans l'URL
// (?exercice=) pour y revenir après l'enregistrement.
const SANS_PROGRAMME = 'Programme non renseigné';
const SANS_SOUS_PROGRAMME = 'Sous-programme non renseigné';

// Exercice fiscal haïtien : du 1er octobre au 30 septembre.
function exerciceCourant() {
  const now = new Date();
  const debut = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

function somme(lignes, key) {
  return lignes.reduce((acc, l) => acc + num(l[key]), 0);
}

function grouper(lignes, cle) {
  const groupes = new Map();
  lignes.forEach((l) => {
    const k = cle(l);
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(l);
  });
  return [...groupes.entries()];
}

function LigneTotal({ niveau, libelle, lignes }) {
  return (
    <tr className={`pip-row-niveau${niveau}`}>
      <td></td>
      <td colSpan={2}>{libelle}</td>
      <td className="num">{formatMontant(somme(lignes, 'montantTresorPublic'))}</td>
      <td className="num">{formatMontant(somme(lignes, 'montantAutresInternes'))}</td>
      <td></td>
      <td className="num">{formatMontant(somme(lignes, 'ressourcesNationales'))}</td>
      <td className="num">{formatMontant(somme(lignes, 'montantBilateral'))}</td>
      <td className="num">{formatMontant(somme(lignes, 'montantMultilateral'))}</td>
      <td></td>
      <td className="num">{formatMontant(somme(lignes, 'ressourcesExternes'))}</td>
      <td className="num">{formatMontant(somme(lignes, 'total'))}</td>
      <td></td>
    </tr>
  );
}

export default function PipPage() {
  const { auth } = useAuth();
  // Seul le Superviseur UEP accède au PIP (PIP_ROLES dans App.js) : il inscrit et retire les projets.
  const peutInscrire = auth.role === 'SUPERVISEUR_UEP';

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const idExercice = searchParams.get('exercice') || '';
  const setIdExercice = useCallback((value) => setSearchParams({ exercice: value }, { replace: true }), [setSearchParams]);

  const [exercices, setExercices] = useState([]);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    apiClient.get('/reference/exercices')
      .then(({ data }) => {
        setExercices(data);
        if (!data.some((x) => String(x.id) === searchParams.get('exercice'))) {
          const courant = data.find((x) => x.libelle === exerciceCourant());
          setIdExercice(String((courant || data[0])?.id ?? ''));
        }
      })
      .catch(() => {
        setListError('Impossible de charger les exercices.');
        setLoading(false);
      });
    // Exercice par défaut : une seule fois au chargement, pas à chaque changement d'URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!idExercice) return;
    setListError('');
    setLoading(true);
    try {
      const { data } = await apiClient.get('/pip', { params: { exercice: idExercice } });
      setLignes(data);
    } catch (err) {
      setListError(err.response?.data?.message || 'Impossible de charger le PIP.');
    } finally {
      setLoading(false);
    }
  }, [idExercice]);

  useEffect(() => { load(); }, [load]);

  const exerciceLibelle = exercices.find((e) => String(e.id) === idExercice)?.libelle || '';

  const groupes = useMemo(() => grouper(lignes, (l) => l.programmeLibelle || SANS_PROGRAMME)
    .map(([programme, ls]) => [programme, grouper(ls, (l) => l.sousProgrammeLibelle || SANS_SOUS_PROGRAMME)]),
  [lignes]);

  const totalG = somme(lignes, 'total');
  const part = (key) => (totalG ? `${((somme(lignes, key) / totalG) * 100).toFixed(2).replace('.', ',')} %` : '—');

  const confirmDelete = async () => {
    setDeleteError('');
    try {
      await apiClient.delete(`/pip/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'La suppression a échoué.');
    }
  };

  const exporter = async () => {
    setActionError('');
    setExporting(true);
    try {
      await downloadFile(`/pip/export?exercice=${idExercice}`, `PIP ${exerciceLibelle}.xlsx`);
    } catch (err) {
      setActionError(await apiErrorMessage(err, "L'export a échoué."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fiop-page">
      <div className="fiop-content">
        <div className="stats-row">
          <StatCard value={lignes.length} label={`Projets inscrits au PIP ${exerciceLibelle}`} tone="neutral" />
          <StatCard value={formatMontant(totalG)} label="Total PIP (G) — HTG" tone="green" />
          <StatCard value={part('ressourcesNationales')} label="Ressources nationales (C/G)" tone="amber" />
          <StatCard value={part('ressourcesExternes')} label="Ressources externes (F/G)" tone="red" />
        </div>

        <section className="fiop-card">
          <div className="card-header-row">
            <h2>Programme d'Investissement Public</h2>
            <div className="pip-toolbar">
              <div className="field pip-exercice">
                <label htmlFor="pip-exercice">Exercice</label>
                <select id="pip-exercice" value={idExercice} onChange={(e) => setIdExercice(e.target.value)}>
                  {exercices.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
                </select>
              </div>
              <button type="button" className="secondary-btn" onClick={exporter}
                disabled={exporting || !idExercice || lignes.length === 0}>
                {exporting ? 'Export…' : 'Exporter en Excel'}
              </button>
              {peutInscrire && (
                <button type="button" className="primary-btn" onClick={() => navigate(`/pip/nouveau?exercice=${idExercice}`)} disabled={!idExercice}>
                  + Inscrire un projet
                </button>
              )}
            </div>
          </div>
          <p className="pip-intro">
            Seuls les projets traités (FIOP validé par l'UEP) peuvent être inscrits. L'inscription n'est pas
            automatique : vous inscrivez chaque projet, mettez à jour ses montants et pouvez le retirer.
          </p>
          {listError && <div className="form-error">{listError}</div>}
          {actionError && <div className="form-error">{actionError}</div>}

          <div className="fiop-table-wrap">
            <table className="fiop-table pip-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Programmes et projets</th>
                  <th>Localisation</th>
                  <th className="num">Trésor public (A)</th>
                  <th className="num">Autres fin. internes (B)</th>
                  <th>Source</th>
                  <th className="num">Ress. nationales (C=A+B)</th>
                  <th className="num">Bilatérale (D)</th>
                  <th className="num">Multilatérale (E)</th>
                  <th>Source / type</th>
                  <th className="num">Ress. externes (F=D+E)</th>
                  <th className="num">Total PIP (G=C+F)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lignes.length > 0 && (
                  <LigneTotal niveau={1} libelle={`MENFP — total PIP ${exerciceLibelle}`} lignes={lignes} />
                )}
                {groupes.map(([programme, sousProgrammes]) => (
                  <React.Fragment key={programme}>
                    <LigneTotal niveau={2} libelle={programme}
                      lignes={sousProgrammes.flatMap(([, ls]) => ls)} />
                    {sousProgrammes.map(([sousProgramme, ls]) => (
                      <React.Fragment key={sousProgramme}>
                        <LigneTotal niveau={3} libelle={sousProgramme} lignes={ls} />
                        {ls.map((l) => (
                          <tr key={l.id}>
                            <td className="pip-code">
                              <div>{l.codeBudgetaire || l.codeInternePip}</div>
                              {l.codeBudgetaire && <div className="ptf-sub">{l.codeInternePip}</div>}
                            </td>
                            <td>
                              <div>{l.titre}</div>
                              <div className="ptf-sub" title={l.dateModification ? `Le ${formatDateTimeFr(l.dateModification)}` : undefined}>
                                Mis à jour par {l.modifieParUsername || '—'}
                              </div>
                            </td>
                            <td>{l.localisation}</td>
                            <td className="num">{formatMontant(l.montantTresorPublic)}</td>
                            <td className="num">{formatMontant(l.montantAutresInternes)}</td>
                            <td>{l.sourceAutresInternes || ''}</td>
                            <td className="num">{formatMontant(l.ressourcesNationales)}</td>
                            <td className="num">{formatMontant(l.montantBilateral)}</td>
                            <td className="num">{formatMontant(l.montantMultilateral)}</td>
                            <td>
                              {l.sourceExterne && (
                                <>
                                  <div>{l.sourceExterne}</div>
                                  <div className="ptf-sub">{l.typeFinancementExterne === 'PRET' ? 'Prêt' : 'Don'}</div>
                                </>
                              )}
                            </td>
                            <td className="num">{formatMontant(l.ressourcesExternes)}</td>
                            <td className="num pip-total">{formatMontant(l.total)}</td>
                            <td className="fiop-row-actions">
                              <button type="button" className="mini-btn" onClick={() => navigate(`/pip/${l.id}/modifier`)}>Modifier</button>
                              {peutInscrire && (
                                <button type="button" className="mini-btn danger"
                                  onClick={() => { setDeleteError(''); setDeleting(l); }}>
                                  Retirer
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                {!loading && lignes.length === 0 && (
                  <tr>
                    <td colSpan={13}>
                      Aucun projet inscrit au PIP {exerciceLibelle}.
                      {peutInscrire && ' Utilisez « Inscrire un projet » pour commencer.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {deleting && (
        <Modal title="Retirer le projet du PIP" onClose={() => setDeleting(null)}>
          <p className="modal-warning">
            Retirer « {deleting.titre} » du PIP {deleting.exerciceLibelle} ?
            Le FIOP du projet reste inchangé (toujours actif) et pourra être réinscrit.
          </p>
          {deleteError && <div className="form-error">{deleteError}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={() => setDeleting(null)}>Annuler</button>
            <button type="button" className="danger-btn" onClick={confirmDelete}>Retirer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
