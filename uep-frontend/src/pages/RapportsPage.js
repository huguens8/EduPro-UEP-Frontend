import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { apiErrorMessage, downloadFile } from '../api/download';
import { STATUT_META } from './fiopShared';
import './FiopPage.css';
import './RapportsPage.css';

// UC-F3 "Générer un rapport FIOP / PIP" : l'utilisateur choisit le périmètre — un projet, ou une
// période — puis le format, et le fichier est téléchargé. Le contenu est construit côté serveur
// (même contenu pour le PDF et l'Excel). Le Superviseur UEP a accès à tous les projets
// et au portefeuille ; le Porteur de Projet ne voit que la fiche de ses propres projets (contrôlé
// aussi côté serveur).
const FORMATS = [
  { value: 'pdf', label: 'Télécharger en PDF' },
  { value: 'xlsx', label: 'Télécharger en Excel' },
];

// Fiche d'un projet : en plus, la FIOP remplie dans le classeur officiel CANEVAS FIOP (11 onglets).
const FORMATS_PROJET = [...FORMATS, { value: 'canevas', label: 'FIOP au format du canevas (Excel)' }];

function BoutonsFormat({ formats = FORMATS, enCours, desactive, onExport }) {
  return (
    <div className="rapport-actions">
      {formats.map((f) => (
        <button
          key={f.value}
          type="button"
          className={f.value === 'pdf' ? 'primary-btn' : 'secondary-btn'}
          disabled={desactive || enCours !== null}
          onClick={() => onExport(f.value)}
        >
          {enCours === f.value ? 'Génération…' : f.label}
        </button>
      ))}
    </div>
  );
}

export default function RapportsPage() {
  const { auth } = useAuth();
  const estPorteur = auth.role === 'Porteur_PROJET';
  const [projets, setProjets] = useState([]);
  const [exercices, setExercices] = useState([]);
  const [chargementErreur, setChargementErreur] = useState('');

  const [projetId, setProjetId] = useState('');
  const [exerciceProjet, setExerciceProjet] = useState('');
  const [exercicePortefeuille, setExercicePortefeuille] = useState('');
  const [statut, setStatut] = useState('');

  // Format en cours de génération pour chaque rapport (null = aucun), et dernier message.
  const [enCoursProjet, setEnCoursProjet] = useState(null);
  const [enCoursPortefeuille, setEnCoursPortefeuille] = useState(null);
  const [erreurProjet, setErreurProjet] = useState('');
  const [erreurPortefeuille, setErreurPortefeuille] = useState('');

  useEffect(() => {
    Promise.all([apiClient.get('/fiop'), apiClient.get('/reference/exercices')])
      .then(([p, e]) => {
        const visibles = estPorteur ? p.data.filter((f) => f.creeParUsername === auth.username) : p.data;
        setProjets([...visibles].sort((a, b) => a.id - b.id));
        setExercices(e.data);
        // Exercice fiscal haïtien en cours (octobre → septembre) proposé par défaut pour la période.
        const now = new Date();
        const debut = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
        const courant = e.data.find((ex) => ex.libelle === `${debut}-${debut + 1}`);
        if (courant) setExercicePortefeuille(String(courant.id));
      })
      .catch(() => setChargementErreur('Impossible de charger la liste des projets ou des exercices.'));
  }, [estPorteur, auth.username]);

  const exporterProjet = async (format) => {
    setErreurProjet('');
    setEnCoursProjet(format);
    try {
      if (format === 'canevas') {
        const params = new URLSearchParams();
        if (exerciceProjet) params.set('idExercice', exerciceProjet);
        await downloadFile(`/rapports/projets/${projetId}/canevas?${params}`, `FIOP_canevas-${projetId}.xlsx`);
        return;
      }
      const params = new URLSearchParams({ format });
      if (exerciceProjet) params.set('idExercice', exerciceProjet);
      await downloadFile(`/rapports/projets/${projetId}?${params}`, `Rapport_FIOP-${projetId}.${format}`);
    } catch (err) {
      setErreurProjet(await apiErrorMessage(err, 'La génération du rapport a échoué.'));
    } finally {
      setEnCoursProjet(null);
    }
  };

  const exporterPortefeuille = async (format) => {
    setErreurPortefeuille('');
    setEnCoursPortefeuille(format);
    try {
      const params = new URLSearchParams({ format, idExercice: exercicePortefeuille });
      if (statut) params.set('statut', statut);
      await downloadFile(`/rapports/portefeuille?${params}`, `Portefeuille_projets.${format}`);
    } catch (err) {
      setErreurPortefeuille(await apiErrorMessage(err, 'La génération du rapport a échoué.'));
    } finally {
      setEnCoursPortefeuille(null);
    }
  };

  return (
    <div className="fiop-page">
      <div className="fiop-content">
        <section className="fiop-card">
          <div className="card-header-row">
            <h2>Rapports FIOP / PIP</h2>
          </div>
          <p className="rapport-intro">
            {estPorteur
              ? "Choisissez l'un de vos projets, puis le format. "
              : 'Choisissez le périmètre du rapport, puis le format. '}Le PDF et l'Excel contiennent les mêmes données ;
            dans l'Excel, les montants restent des nombres utilisables dans des formules.
          </p>
          {chargementErreur && <div className="form-error">{chargementErreur}</div>}

          <div className="rapport-grid">
            <div className="rapport-carte">
              <h3>Fiche d'un projet</h3>
              <p className="rapport-aide">
                Identification, localisation, sources de financement, activités et dépenses par rubrique.
                Avec un exercice : bilan d'exécution et tranche annuelle de cet exercice en plus.
                Le format « canevas » remplit le classeur officiel CANEVAS FIOP (11 onglets, même mise en page).
              </p>
              <div className="field">
                <label htmlFor="rapport-projet">Projet <span className="required-mark">*</span></label>
                <select id="rapport-projet" value={projetId} onChange={(e) => setProjetId(e.target.value)}>
                  <option value="">{estPorteur && projets.length === 0 ? '— Aucun projet créé —' : '— Choisir un projet —'}</option>
                  {projets.map((p) => (
                    <option key={p.id} value={p.id}>{p.codeProjet} · {p.titre}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="rapport-exercice-projet">Exercice (facultatif)</label>
                <select id="rapport-exercice-projet" value={exerciceProjet} onChange={(e) => setExerciceProjet(e.target.value)}>
                  <option value="">Aucun — fiche du projet seulement</option>
                  {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
                </select>
              </div>
              {erreurProjet && <div className="form-error">{erreurProjet}</div>}
              <BoutonsFormat formats={FORMATS_PROJET} enCours={enCoursProjet} desactive={!projetId} onExport={exporterProjet} />
            </div>

            {!estPorteur && (
              <div className="rapport-carte">
                <h3>Portefeuille des projets</h3>
                <p className="rapport-aide">
                  Tous les projets avec leur coût, la prévision de l'exercice (tranche annuelle, §44), les dépenses
                  de l'exercice (bilan d'exécution) et le taux d'exécution.
                </p>
                <div className="field">
                  <label htmlFor="rapport-exercice">Exercice (période) <span className="required-mark">*</span></label>
                  <select id="rapport-exercice" value={exercicePortefeuille} onChange={(e) => setExercicePortefeuille(e.target.value)}>
                    <option value="">— Choisir un exercice —</option>
                    {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="rapport-statut">Statut des projets</label>
                  <select id="rapport-statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
                    <option value="">Tous les statuts</option>
                    {Object.entries(STATUT_META).map(([code, meta]) => (
                      <option key={code} value={code}>{meta.label}</option>
                    ))}
                  </select>
                </div>
                {erreurPortefeuille && <div className="form-error">{erreurPortefeuille}</div>}
                <BoutonsFormat enCours={enCoursPortefeuille} desactive={!exercicePortefeuille} onExport={exporterPortefeuille} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
