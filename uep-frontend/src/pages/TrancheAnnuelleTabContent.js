import React, { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';
import {
  groupSourcesFinancement, infoGeneralesStep, matchSourceMeta, ordreSequentiel, SOURCES_FINANCEMENT_META,
} from './fiopShared';
import './BilanTabContent.css';
import './TrancheAnnuelleTabContent.css';

// Étapes du wizard "Tranche annuelle" (TROISIEME PARTIE de la FIOP), sur le modèle de BILAN_STEPS.
// Une étape par tableau du canevas : §44 "Annuelle", §45 "Activités", §46 "Chronogramme", §47
// "R.dépenses", puis les trois tableaux de la feuille "Calendrier" (§48 nationales, §49 externes,
// §50 nationales et externes — ce dernier calculé, c'est la somme des deux autres).
const TRANCHE_STEPS = [
  { id: 'depenses-previsionnelles', label: 'Dépenses prévisionnelles par source', fields: ['idExercice', 'sources'] },
  { id: 'cout-activites', label: "Coût d'exécution des activités", fields: [] },
  { id: 'chronogramme', label: "Chronogramme d'exécution des activités", fields: ['chronogramme'] },
  { id: 'voies-moyens', label: 'Voies et moyens', fields: ['voiesMoyens'] },
  { id: 'calendrier-national', label: 'Calendrier — ressources nationales', fields: ['calendrierNational'] },
  { id: 'calendrier-externe', label: 'Calendrier — ressources externes', fields: ['calendrierExterne'] },
  { id: 'calendrier-global', label: 'Calendrier — nationales et externes', fields: [] },
];

// §§48-49 : { [idRubrique]: [trim. 1, trim. 2, trim. 3, trim. 4] } pour les sous-rubriques saisies.
function buildCalendrier(lignes) {
  return Object.fromEntries((lignes || []).map((l) => [
    l.idRubrique,
    [l.trimestre1, l.trimestre2, l.trimestre3, l.trimestre4].map((v) => v ?? ''),
  ]));
}

function calendrierToRequest(calendrier) {
  return Object.entries(calendrier || {}).map(([idRubrique, trimestres]) => {
    const ligne = { idRubrique: Number(idRubrique) };
    trimestres.forEach((v, i) => { ligne[`trimestre${i + 1}`] = v === '' ? undefined : toNumber(v); });
    return ligne;
  });
}

// Colonnes "Sources de Financement" du §47, dans l'ordre du canevas : T.P, AFC, FP (Nationales)
// puis Bilatéral, Multilat. (Externes).
const VOIES_SOURCES = [
  { key: 'montantTresorPublic', label: 'T.P', groupe: 'Nationales' },
  { key: 'montantAfc', label: 'AFC', groupe: 'Nationales' },
  { key: 'montantFondsPropres', label: 'FP', groupe: 'Nationales' },
  { key: 'montantBilateral', label: 'Bilatéral', groupe: 'Externes' },
  { key: 'montantMultilateral', label: 'Multilat.', groupe: 'Externes' },
];
const VOIES_TEXTES = ['codeArticle', 'designation', 'ordreActivites', 'uniteMesure'];
const VOIES_NOMBRES = ['quantite', 'coutUnitaire', ...VOIES_SOURCES.map((s) => s.key)];

let voieKeySeq = 0;
function nouvelleVoie(idRubrique, valeurs = {}) {
  voieKeySeq += 1;
  const ligne = { key: `voie-${voieKeySeq}`, idRubrique };
  [...VOIES_TEXTES, ...VOIES_NOMBRES].forEach((k) => { ligne[k] = valeurs[k] ?? ''; });
  return ligne;
}

function voieTotal(l) {
  return toNumber(l.quantite) * toNumber(l.coutUnitaire);
}

function voieRepartition(l) {
  return VOIES_SOURCES.reduce((sum, s) => sum + toNumber(l[s.key]), 0);
}

// Colonnes 1 à 12 du §46 : l'exercice fiscal haïtien va d'octobre à septembre.
const TRIMESTRES = [
  { label: 'TRIMESTRE I', mois: ['OCT.', 'NOV.', 'DEC.'] },
  { label: 'TRIMESTRE II', mois: ['JANV.', 'FEV.', 'MARS'] },
  { label: 'TRIMESTRE III', mois: ['AVRIL', 'MAI', 'JUIN'] },
  { label: 'TRIMESTRE IV', mois: ['JUILLET', 'AOUT', 'SEPT.'] },
];

// { [idActivite]: [rangs des mois planifiés] } pour chaque activité du plan du projet.
function buildChronogramme(activites, tranche) {
  const saisis = new Map((tranche?.chronogramme || []).map((l) => [String(l.idActivite), l.mois || []]));
  return Object.fromEntries((activites || []).map((a) => [a.id, saisis.get(String(a.id)) || []]));
}

function fieldMatches(errorKey, field) {
  return errorKey === field || errorKey.startsWith(`${field}[`) || errorKey.startsWith(`${field}.`);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

// Montants affichés comme dans le canevas : toujours deux décimales (0,00).
function formatGourde(value) {
  return toNumber(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(value) {
  return value === null ? '—' : `${value.toFixed(2)}%`;
}

function rangCanevas(libelle) {
  const idx = SOURCES_FINANCEMENT_META.indexOf(matchSourceMeta(libelle));
  return idx === -1 ? SOURCES_FINANCEMENT_META.length : idx;
}

// Les 7 sources de référence, toujours affichées dans l'ordre du canevas (Ressources Nationales
// puis Externes), avec la prévision déjà saisie pour la tranche le cas échéant.
function buildSourceRows(refSources, tranche) {
  const saisies = new Map((tranche?.sources || []).map((s) => [String(s.idSource), s]));
  const references = refSources.length > 0
    ? refSources.map((s) => ({ idSource: s.id, sourceLibelle: s.libelle }))
    : (tranche?.sources || []).map((s) => ({ idSource: s.idSource, sourceLibelle: s.sourceLibelle }));
  return [...references]
    .sort((a, b) => rangCanevas(a.sourceLibelle) - rangCanevas(b.sourceLibelle))
    .map((ref) => ({
      idSource: ref.idSource,
      sourceLibelle: ref.sourceLibelle,
      previsionTotal: saisies.get(String(ref.idSource))?.previsionTotal ?? '',
    }));
}

// Exercice fiscal haïtien (octobre → septembre) contenant la date du jour, ex. "2026-2027".
function libelleExerciceCourant() {
  const now = new Date();
  const debut = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

/**
 * Tableau §44 "Dépenses prévisionnelles (Exercice Actuel)" : Ressources / Sources / Type /
 * Prévisions Total / Poids, comme la feuille "Annuelle" du canevas. `onChange` absent = lecture
 * seule (vue détail).
 */
function DepensesPrevisionnellesTable({ sources, onChange }) {
  const total = sources.reduce((sum, s) => sum + toNumber(s.previsionTotal), 0);
  const groupSpans = groupSourcesFinancement(sources, (idSource) => {
    const s = sources.find((x) => x.idSource === idSource);
    return matchSourceMeta(s?.sourceLibelle);
  });
  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table sources-financement-table">
        <thead>
          <tr>
            <th>Ressources</th>
            <th>Sources</th>
            <th>Type</th>
            <th>Prévisions Total</th>
            <th>Poids</th>
          </tr>
          <tr className="colonnes-numeros">
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s, idx) => {
            const span = groupSpans[idx];
            const poids = total > 0 ? (toNumber(s.previsionTotal) / total) * 100 : null;
            return (
              <tr key={s.idSource}>
                {span && <td className="rubrique-label-cell sources-groupe-cell" rowSpan={span.span}>{span.groupe}</td>}
                <td className="rubrique-label-cell">{s.sourceLibelle}</td>
                <td className="sources-type-cell">{matchSourceMeta(s.sourceLibelle)?.type || '—'}</td>
                {onChange ? (
                  <td><input type="number" min="0" value={s.previsionTotal} onChange={onChange(idx)} /></td>
                ) : (
                  <td className="rubrique-total-cell">{formatGourde(s.previsionTotal)}</td>
                )}
                <td className="rubrique-total-cell">{formatPct(poids)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Montant Total</td>
            <td>{formatGourde(total)}</td>
            <td>{formatPct(total > 0 ? 100 : null)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Tableau §45 "Coût d'exécution des activités", en lecture seule : sur la feuille "Activités" du
 * canevas, chaque cellule est une formule vers le §33 d'Info Générales (ex. Activités!G17 =
 * 'Info Générales'!G218) — rien n'y est ressaisi, on affiche donc le plan du projet tel quel.
 */
function CoutActivitesTable({ activites }) {
  const totalLigne = (a) => toNumber(a.quantiteResultatAttendu) * toNumber(a.coutUnitaire);
  const somme = (fn) => activites.reduce((sum, a) => sum + fn(a), 0);
  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table activites-table">
        <thead>
          <tr>
            <th rowSpan={3}># d'ordre séquentiel des Activités</th>
            <th rowSpan={3}>Activités</th>
            <th colSpan={2}>Résultats Attendus</th>
            <th colSpan={2}>Coût par Activité : RN+RE</th>
            <th colSpan={2}>Ressources</th>
          </tr>
          <tr>
            <th>Unité</th>
            <th>Quantité</th>
            <th>Unitaire</th>
            <th>Total</th>
            <th>Nationales</th>
            <th>Externes</th>
          </tr>
          <tr className="colonnes-numeros">
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4=2x3</th>
            <th>5</th>
            <th>6</th>
          </tr>
        </thead>
        <tbody>
          {activites.map((a, idx) => (
            <tr key={a.id ?? idx}>
              <td className="rubrique-total-cell">{ordreSequentiel(idx)}</td>
              <td className="rubrique-label-cell">{a.libelle || '—'}</td>
              <td className="sources-type-cell">{a.uniteResultat || '—'}</td>
              <td className="rubrique-total-cell">{a.quantiteResultatAttendu ?? '—'}</td>
              <td className="rubrique-total-cell">{formatGourde(a.coutUnitaire)}</td>
              <td className="rubrique-total-cell">{formatGourde(totalLigne(a))}</td>
              <td className="rubrique-total-cell">{formatGourde(a.ressourcesNationales)}</td>
              <td className="rubrique-total-cell">{formatGourde(a.ressourcesExternes)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5}>Coût Total Tranche Annuelle du projet</td>
            <td>{formatGourde(somme(totalLigne))}</td>
            <td>{formatGourde(somme((a) => toNumber(a.ressourcesNationales)))}</td>
            <td>{formatGourde(somme((a) => toNumber(a.ressourcesExternes)))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CoutActivitesSection({ activites }) {
  return (
    <>
      <h4 className="wizard-substep-title">45 — Coût d'exécution des activités</h4>
      <p className="bilan-plan-hint">
        Repris des résultats attendus par activité ({infoGeneralesStep('resultats-attendus')}) — modifiez-les là-bas, rien ne se saisit ici.
      </p>
      {activites.length === 0 ? (
        <p className="bilan-plan-empty">Aucune activité planifiée pour ce projet — complétez-les dans {infoGeneralesStep('activites-calendrier')}.</p>
      ) : (
        <CoutActivitesTable activites={activites} />
      )}
    </>
  );
}

/**
 * Tableau §46 "Chronogramme d'exécution des activités" : une ligne par activité du plan (libellés
 * repris d'Info Générales, comme Chronogramme!B17 = 'Info Générales'!B178), une case par mois à
 * cocher. La ligne "Coût Prévisionnel par Trimestre" vient du §48 (Chronogramme!C29 =
 * Calendrier!B59). `onToggle` absent = lecture seule (vue détail).
 */
function ChronogrammeTable({ activites, chronogramme = {}, coutTrimestres, onToggle }) {
  const couts = [0, 1, 2, 3].map((i) => toNumber(coutTrimestres?.[i]));
  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table chronogramme-table">
        <thead>
          <tr>
            <th rowSpan={3}># d'ordre séquentiel des Activités</th>
            <th rowSpan={3}>Liste des Activités</th>
            {TRIMESTRES.map((t) => <th key={t.label} colSpan={3} className="trimestre-debut">{t.label}</th>)}
          </tr>
          <tr>
            {TRIMESTRES.flatMap((t) => t.mois.map((m, i) => (
              <th key={m} className={i === 0 ? 'trimestre-debut' : undefined}>{m}</th>
            )))}
          </tr>
          <tr className="colonnes-numeros">
            {Array.from({ length: 12 }, (_, i) => (
              <th key={i} className={i % 3 === 0 ? 'trimestre-debut' : undefined}>{i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activites.map((a, idx) => {
            const planifies = chronogramme[a.id] || [];
            return (
              <tr key={a.id ?? idx}>
                <td className="rubrique-total-cell">{ordreSequentiel(idx)}</td>
                <td className="rubrique-label-cell">{a.libelle || '—'}</td>
                {Array.from({ length: 12 }, (_, i) => {
                  const rang = i + 1;
                  const planifie = planifies.includes(rang);
                  const moisLabel = TRIMESTRES[Math.floor(i / 3)].mois[i % 3];
                  const className = ['chrono-cell', planifie && 'planifie', i % 3 === 0 && 'trimestre-debut'].filter(Boolean).join(' ');
                  return (
                    <td key={rang} className={className}>
                      {onToggle ? (
                        <button
                          type="button"
                          aria-pressed={planifie}
                          aria-label={`${a.libelle || 'Activité'} — ${moisLabel}`}
                          title={planifie ? `Planifiée en ${moisLabel} — cliquer pour retirer` : `Planifier en ${moisLabel}`}
                          onClick={() => onToggle(a.id, rang)}
                        />
                      ) : (
                        <span aria-label={planifie ? `Planifiée en ${moisLabel}` : undefined} />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Coût Prévisionnel par Trimestre</td>
            {couts.map((c, i) => <td key={i} colSpan={3} className="trimestre-debut">{formatGourde(c)}</td>)}
          </tr>
          <tr>
            <td colSpan={2}>Coût Total Annuel du projet</td>
            <td colSpan={12}>{formatGourde(couts.reduce((sum, c) => sum + c, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ChronogrammeSection({ activites, chronogramme, coutTrimestres, onToggle }) {
  return (
    <>
      <h4 className="wizard-substep-title">46 — Chronogramme d'exécution des activités</h4>
      <p className="bilan-plan-hint">
        {onToggle ? 'Cliquez sur les mois où chaque activité est exécutée. ' : ''}
        Le coût prévisionnel par trimestre provient du calendrier d'utilisation des ressources financières nationales (§48).
      </p>
      {activites.length === 0 ? (
        <p className="bilan-plan-empty">Aucune activité planifiée pour ce projet — complétez-les dans {infoGeneralesStep('activites-calendrier')}.</p>
      ) : (
        <ChronogrammeTable activites={activites} chronogramme={chronogramme} coutTrimestres={coutTrimestres} onToggle={onToggle} />
      )}
    </>
  );
}

/**
 * Tableau §47 "Voies et moyens pour la réalisation des activités du projet" (feuille "R.dépenses"
 * du canevas) : un bloc par rubrique principale (1.- Dépenses de personnel, 2.- Services et
 * charges diverses…), des lignes libres rattachées à une de ses sous-rubriques, un sous-total par
 * bloc et un total général. Sans `onChange`/`onAdd`/`onRemove`, lecture seule (vue détail).
 */
function VoiesMoyensTable({ rubriques, lignes, errors = {}, onChange, onAdd, onRemove }) {
  const readOnly = !onChange;
  const principales = rubriques.filter((r) => r.idRubriqueParent == null);
  const sousRubriques = (idParent) => rubriques.filter((r) => r.idRubriqueParent === idParent);
  const parentDe = new Map(rubriques.map((r) => [String(r.id), r.idRubriqueParent]));
  const libelleRubrique = (id) => {
    const r = rubriques.find((x) => String(x.id) === String(id));
    return r ? `${r.code}-${r.libelle}` : '—';
  };
  const somme = (items, fn) => items.reduce((sum, l) => sum + fn(l), 0);
  const nbColonnes = 9 + VOIES_SOURCES.length + (readOnly ? 0 : 1);

  const renderMontants = (items) => (
    <>
      <td>{formatGourde(somme(items, voieTotal))}</td>
      {VOIES_SOURCES.map((s) => <td key={s.key}>{formatGourde(somme(items, (l) => toNumber(l[s.key])))}</td>)}
    </>
  );

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table voies-moyens-table">
        <thead>
          <tr>
            <th rowSpan={3}>Sous-rubrique</th>
            <th rowSpan={3}>Code article</th>
            <th rowSpan={3}>Codes et articles budgétaires</th>
            <th rowSpan={3}>N° d'ordre Activités</th>
            <th rowSpan={3}>Unité de Mesure</th>
            <th rowSpan={3}>Quantité</th>
            <th rowSpan={3}>Coût Unitaire</th>
            <th rowSpan={3}>Total</th>
            <th colSpan={VOIES_SOURCES.length}>Sources de Financement</th>
            {!readOnly && <th rowSpan={3} aria-label="Actions" />}
          </tr>
          <tr>
            <th colSpan={VOIES_SOURCES.filter((s) => s.groupe === 'Nationales').length}>Nationales</th>
            <th colSpan={VOIES_SOURCES.filter((s) => s.groupe === 'Externes').length}>Externes</th>
          </tr>
          <tr>
            {VOIES_SOURCES.map((s) => <th key={s.key}>{s.label}</th>)}
          </tr>
        </thead>
        {principales.map((principale) => {
          const items = lignes
            .map((ligne, index) => ({ ligne, index }))
            .filter(({ ligne }) => parentDe.get(String(ligne.idRubrique)) === principale.id);
          if (readOnly && items.length === 0) return null;
          const enfants = sousRubriques(principale.id);
          return (
            <tbody key={principale.id}>
              <tr className="voies-rubrique-row">
                <td colSpan={nbColonnes}>{principale.code}.- {principale.libelle.toUpperCase()}</td>
              </tr>
              {items.map(({ ligne, index }) => {
                const total = voieTotal(ligne);
                const repartition = voieRepartition(ligne);
                const ecart = repartition > 0 && Math.abs(repartition - total) >= 0.01;
                const erreurs = Object.entries(errors)
                  .filter(([k]) => k.startsWith(`voiesMoyens[${index}]`))
                  .map(([, message]) => message);
                const input = (field, type = 'text') => (
                  <input type={type} min={type === 'number' ? '0' : undefined} value={ligne[field]} onChange={onChange(index, field)} />
                );
                return (
                  <React.Fragment key={ligne.key}>
                    <tr className={erreurs.length > 0 ? 'voies-ligne-erreur' : undefined}>
                      <td className="rubrique-label-cell">
                        {readOnly ? libelleRubrique(ligne.idRubrique) : (
                          <select value={ligne.idRubrique} onChange={onChange(index, 'idRubrique')}>
                            {enfants.map((e) => <option key={e.id} value={e.id}>{e.code}-{e.libelle}</option>)}
                          </select>
                        )}
                      </td>
                      {readOnly ? (
                        <>
                          <td>{ligne.codeArticle || '—'}</td>
                          <td className="rubrique-label-cell">{ligne.designation || '—'}</td>
                          <td>{ligne.ordreActivites || '—'}</td>
                          <td>{ligne.uniteMesure || '—'}</td>
                          <td className="rubrique-total-cell">{ligne.quantite === '' || ligne.quantite == null ? '—' : ligne.quantite}</td>
                          <td className="rubrique-total-cell">{formatGourde(ligne.coutUnitaire)}</td>
                        </>
                      ) : (
                        <>
                          <td className="voies-code-cell">{input('codeArticle')}</td>
                          <td className="voies-designation-cell">{input('designation')}</td>
                          <td className="voies-code-cell">{input('ordreActivites')}</td>
                          <td className="voies-code-cell">{input('uniteMesure')}</td>
                          <td>{input('quantite', 'number')}</td>
                          <td>{input('coutUnitaire', 'number')}</td>
                        </>
                      )}
                      <td className="rubrique-total-cell">{formatGourde(total)}</td>
                      {VOIES_SOURCES.map((s) => (
                        <td
                          key={s.key}
                          className={[readOnly && 'rubrique-total-cell', ecart && 'voies-ecart'].filter(Boolean).join(' ') || undefined}
                          title={ecart ? `Répartition par source (${formatGourde(repartition)}) différente du total (${formatGourde(total)})` : undefined}
                        >
                          {readOnly ? formatGourde(ligne[s.key]) : input(s.key, 'number')}
                        </td>
                      ))}
                      {!readOnly && (
                        <td>
                          <button type="button" className="mini-btn danger" onClick={() => onRemove(index)} aria-label="Retirer la ligne">×</button>
                        </td>
                      )}
                    </tr>
                    {erreurs.length > 0 && (
                      <tr className="voies-ligne-erreur">
                        <td colSpan={nbColonnes}><span className="field-error">{erreurs.join(' ')}</span></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!readOnly && (
                <tr>
                  <td colSpan={nbColonnes} className="voies-ajout-cell">
                    <button type="button" className="link-btn" onClick={() => onAdd(enfants[0]?.id)} disabled={enfants.length === 0}>
                      + Ajouter une ligne en {principale.code}.- {principale.libelle}
                    </button>
                  </td>
                </tr>
              )}
              {items.length > 0 && (
                <tr className="voies-sous-total-row">
                  <td colSpan={7}>Sous-total {principale.code}.- {principale.libelle}</td>
                  {renderMontants(items.map(({ ligne }) => ligne))}
                  {!readOnly && <td />}
                </tr>
              )}
            </tbody>
          );
        })}
        <tfoot>
          <tr>
            <td colSpan={7}>Total Général</td>
            {renderMontants(lignes)}
            {!readOnly && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function VoiesMoyensSection({ rubriques, lignes, errors, onChange, onAdd, onRemove }) {
  const readOnly = !onChange;
  return (
    <>
      <h4 className="wizard-substep-title">47 — Voies et moyens pour la réalisation des activités du projet</h4>
      <p className="bilan-plan-hint">
        Codes et articles budgétaires à spécifier (voir Nomenclature des Dépenses Budgétaires de l'État).
        {!readOnly && " « N° d'ordre Activités » : numéros des activités servies, ex. 01, 04, 06. Une case orange signale une répartition par source différente du total."}
      </p>
      {rubriques.length === 0 ? (
        <p className="bilan-plan-empty">Les rubriques budgétaires n'ont pas pu être chargées.</p>
      ) : readOnly && lignes.length === 0 ? (
        <p className="bilan-plan-empty">Aucune ligne de voies et moyens renseignée.</p>
      ) : (
        <VoiesMoyensTable rubriques={rubriques} lignes={lignes} errors={errors} onChange={onChange} onAdd={onAdd} onRemove={onRemove} />
      )}
    </>
  );
}

/**
 * Tableaux §§48-50 "Calendrier prévisionnel d'utilisation des ressources financières" (feuille
 * "Calendrier" du canevas) : rubriques principales en gras avec le sous-total de leurs
 * sous-rubriques, une colonne par trimestre, TOTAL par ligne et TOTAL général. `valeur(id, i)`
 * donne le montant d'une sous-rubrique pour le trimestre i (0-3) ; sans `onChange`, lecture seule.
 */
function CalendrierTable({ rubriques, valeur, onChange }) {
  const principales = rubriques.filter((r) => r.idRubriqueParent == null);
  const sousRubriques = (idParent) => rubriques.filter((r) => r.idRubriqueParent === idParent);
  const montant = (id, i) => toNumber(valeur(id, i));
  const ligneTotal = (id) => [0, 1, 2, 3].reduce((sum, i) => sum + montant(id, i), 0);
  const sousTotal = (idParent, i) => sousRubriques(idParent).reduce((sum, r) => sum + montant(r.id, i), 0);
  const totalGeneral = (i) => principales.reduce((sum, p) => sum + sousTotal(p.id, i), 0);
  const trimestres = [0, 1, 2, 3];

  return (
    <div className="rubrique-table-wrap">
      <table className="rubrique-calendrier-table calendrier-trimestriel-table">
        <thead>
          <tr>
            <th>Rubriques de Dépenses</th>
            <th>1er Trim.</th>
            <th>2ème Trim.</th>
            <th>3ème Trim.</th>
            <th>4ème Trim.</th>
            <th>TOTAL</th>
          </tr>
          <tr className="colonnes-numeros">
            <th />
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {principales.map((p) => (
            <React.Fragment key={p.id}>
              <tr className="voies-rubrique-row calendrier-principale-row">
                <td>{p.code}-{p.libelle}</td>
                {trimestres.map((i) => <td key={i}>{formatGourde(sousTotal(p.id, i))}</td>)}
                <td>{formatGourde(trimestres.reduce((sum, i) => sum + sousTotal(p.id, i), 0))}</td>
              </tr>
              {sousRubriques(p.id).map((r) => (
                <tr key={r.id}>
                  <td className="rubrique-label-cell calendrier-sous-rubrique">{r.code}-{r.libelle}</td>
                  {trimestres.map((i) => (
                    <td key={i} className={onChange ? undefined : 'rubrique-total-cell'}>
                      {onChange ? (
                        <input
                          type="number"
                          min="0"
                          aria-label={`${r.code}-${r.libelle} — trimestre ${i + 1}`}
                          value={valeur(r.id, i)}
                          onChange={onChange(r.id, i)}
                        />
                      ) : formatGourde(valeur(r.id, i))}
                    </td>
                  ))}
                  <td className="rubrique-total-cell">{formatGourde(ligneTotal(r.id))}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            {trimestres.map((i) => <td key={i}>{formatGourde(totalGeneral(i))}</td>)}
            <td>{formatGourde(trimestres.reduce((sum, i) => sum + totalGeneral(i), 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const CALENDRIER_TITRES = {
  national: '48 — Calendrier prévisionnel d\'utilisation des ressources financières nationales',
  externe: '49 — Calendrier prévisionnel d\'utilisation des ressources financières externes',
  global: '50 — Calendrier prévisionnel d\'utilisation des ressources financières nationales et externes',
};

const CALENDRIER_AIDES = {
  national: 'Montants en gourdes par trimestre de l\'exercice. Le TOTAL par trimestre alimente la ligne « Coût Prévisionnel par Trimestre » du chronogramme (§46).',
  externe: 'Montants en gourdes par trimestre de l\'exercice.',
  global: 'Calculé automatiquement : somme des ressources nationales (§48) et externes (§49).',
};

function CalendrierSection({ type, rubriques, valeur, onChange }) {
  return (
    <>
      <h4 className="wizard-substep-title">{CALENDRIER_TITRES[type]}</h4>
      <p className="bilan-plan-hint">{CALENDRIER_AIDES[type]}</p>
      {rubriques.length === 0 ? (
        <p className="bilan-plan-empty">Les rubriques budgétaires n'ont pas pu être chargées.</p>
      ) : (
        <CalendrierTable rubriques={rubriques} valeur={valeur} onChange={onChange} />
      )}
    </>
  );
}

// Lecteurs `valeur(id, i)` des trois tableaux du calendrier, à partir des deux saisies.
function calendrierLecteurs(national, externe) {
  const lire = (cal) => (id, i) => cal?.[id]?.[i] ?? '';
  return {
    national: lire(national),
    externe: lire(externe),
    global: (id, i) => toNumber(lire(national)(id, i)) + toNumber(lire(externe)(id, i)),
  };
}

/**
 * Contenu de l'onglet "Tranche Annuelle" du FIOP (TROISIEME PARTIE de la FIOP dans le canevas
 * d'origine) : une tranche par exercice. Comme le Bilan d'Exécution, c'est un onglet du même
 * document que "Info Générales", validé avec le reste en un seul cycle.
 */
export default function TrancheAnnuelleTabContent({ fiop, canEdit }) {
  const [view, setView] = useState('list');

  const [tranches, setTranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');

  const [exercices, setExercices] = useState([]);
  const [refSources, setRefSources] = useState([]);
  const [rubriques, setRubriques] = useState([]);

  const [editingTranche, setEditingTranche] = useState(null);
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [savedNotice, setSavedNotice] = useState('');
  const userEdited = useRef(false);

  const [detailTranche, setDetailTranche] = useState(null);

  const loadTranches = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const { data } = await apiClient.get(`/fiop/${fiop.id}/tranches`);
      setTranches(data);
    } catch (err) {
      setListError('Impossible de charger les tranches annuelles.');
    } finally {
      setLoading(false);
    }
  }, [fiop.id]);

  useEffect(() => {
    loadTranches();
    apiClient.get('/reference/exercices').then(({ data }) => setExercices(data)).catch(() => setExercices([]));
    apiClient.get('/reference/sources-financement').then(({ data }) => setRefSources(data)).catch(() => setRefSources([]));
    apiClient.get('/reference/rubriques-budgetaires-hierarchie').then(({ data }) => setRubriques(data)).catch(() => setRubriques([]));
  }, [loadTranches]);

  // Si le formulaire a été ouvert avant l'arrivée des sources de référence, on complète le
  // tableau avec les sources manquantes sans perdre ce qui a déjà été saisi.
  useEffect(() => {
    if (refSources.length === 0) return;
    setForm((prev) => (prev ? { ...prev, sources: buildSourceRows(refSources, prev) } : prev));
  }, [refSources]);

  const exercicesPris = new Set(tranches.map((t) => String(t.idExercice)));

  const openCreate = () => {
    const courant = exercices.find((ex) => ex.libelle === libelleExerciceCourant() && !exercicesPris.has(String(ex.id)));
    setEditingTranche(null);
    setForm({
      idExercice: courant ? String(courant.id) : '',
      sources: buildSourceRows(refSources, null),
      chronogramme: buildChronogramme(fiop.activites, null),
      voiesMoyens: [],
      calendrierNational: {},
      calendrierExterne: {},
    });
    setFormErrors({});
    setStepIndex(0);
    setSavedNotice('');
    userEdited.current = false;
    setView('form');
  };

  const openEdit = (tranche) => {
    setEditingTranche(tranche);
    setForm({
      idExercice: String(tranche.idExercice),
      sources: buildSourceRows(refSources, tranche),
      chronogramme: buildChronogramme(fiop.activites, tranche),
      voiesMoyens: (tranche.voiesMoyens || []).map((v) => nouvelleVoie(v.idRubrique, v)),
      calendrierNational: buildCalendrier(tranche.calendrierNational),
      calendrierExterne: buildCalendrier(tranche.calendrierExterne),
    });
    setFormErrors({});
    setStepIndex(0);
    setSavedNotice('');
    userEdited.current = false;
    setView('form');
  };

  const openDetail = (tranche) => {
    setDetailTranche(tranche);
    setView('detail');
  };

  const handleDelete = async (tranche) => {
    if (!window.confirm(`Supprimer la tranche annuelle de l'exercice "${tranche.exerciceLibelle}" ?`)) return;
    setActionError('');
    try {
      await apiClient.delete(`/fiop/${fiop.id}/tranches/${tranche.idExercice}`);
      loadTranches();
    } catch (err) {
      setActionError(err.response?.data?.message || 'La suppression a échoué.');
    }
  };

  // Création au premier enregistrement (l'exercice est alors figé), puis mise à jour.
  const saveTranche = async () => {
    if (!form.idExercice) {
      setFormErrors({ idExercice: "L'exercice est obligatoire." });
      setStepIndex(0);
      return false;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      const body = {
        idExercice: Number(form.idExercice),
        sources: form.sources.map((s) => ({
          idSource: s.idSource,
          previsionTotal: s.previsionTotal === '' ? undefined : toNumber(s.previsionTotal),
        })),
        chronogramme: Object.entries(form.chronogramme || {}).map(([idActivite, mois]) => ({
          idActivite: Number(idActivite),
          mois,
        })),
        voiesMoyens: (form.voiesMoyens || []).map((l) => {
          const ligne = { idRubrique: Number(l.idRubrique) };
          VOIES_TEXTES.forEach((k) => { ligne[k] = l[k] || undefined; });
          VOIES_NOMBRES.forEach((k) => { ligne[k] = l[k] === '' ? undefined : toNumber(l[k]); });
          return ligne;
        }),
        calendrierNational: calendrierToRequest(form.calendrierNational),
        calendrierExterne: calendrierToRequest(form.calendrierExterne),
      };
      const { data } = editingTranche
        ? await apiClient.put(`/fiop/${fiop.id}/tranches/${editingTranche.idExercice}`, body)
        : await apiClient.post(`/fiop/${fiop.id}/tranches`, body);
      setEditingTranche(data);
      return true;
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.message) {
        setFormErrors(data);
        const errorKeys = Object.keys(data);
        const idx = TRANCHE_STEPS.findIndex((s) => s.fields.some((f) => errorKeys.some((k) => fieldMatches(k, f))));
        if (idx >= 0) setStepIndex(idx);
      } else {
        setFormErrors({ general: data?.message || "L'enregistrement de la tranche annuelle a échoué." });
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Même principe que les autres wizards : l'étape est enregistrée quand on la quitte, seulement
  // si l'utilisateur a réellement saisi quelque chose.
  const goToStep = async (targetIdx) => {
    if (submitting) return;
    const target = Math.max(0, Math.min(TRANCHE_STEPS.length - 1, targetIdx));
    if (target === stepIndex) return;
    if (userEdited.current) {
      const ok = await saveTranche();
      if (!ok) return;
      userEdited.current = false;
      setSavedNotice(`Étape « ${TRANCHE_STEPS[stepIndex].label} » enregistrée.`);
    }
    setStepIndex(target);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (stepIndex < TRANCHE_STEPS.length - 1) {
      goToStep(stepIndex + 1);
      return;
    }
    const ok = await saveTranche();
    if (!ok) return;
    setView('list');
    loadTranches();
  };

  const closeForm = () => {
    setView('list');
    loadTranches();
  };

  const markEdited = () => {
    userEdited.current = true;
    setSavedNotice('');
  };

  const updateSource = (idx) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const sources = [...prev.sources];
      sources[idx] = { ...sources[idx], previsionTotal: value };
      return { ...prev, sources };
    });
  };

  // Les cases du §46 sont des boutons : l'événement "change" du formulaire ne les voit pas, on
  // marque donc la saisie explicitement.
  const toggleMois = (idActivite, rang) => {
    markEdited();
    setForm((prev) => {
      const chronogramme = prev.chronogramme || {};
      const actuels = chronogramme[idActivite] || [];
      const mois = actuels.includes(rang) ? actuels.filter((m) => m !== rang) : [...actuels, rang].sort((a, b) => a - b);
      return { ...prev, chronogramme: { ...chronogramme, [idActivite]: mois } };
    });
  };

  const updateVoie = (idx, field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const voiesMoyens = [...prev.voiesMoyens];
      voiesMoyens[idx] = { ...voiesMoyens[idx], [field]: value };
      return { ...prev, voiesMoyens };
    });
  };

  // Ajout et retrait sont des boutons : comme pour le §46, la saisie est marquée explicitement.
  const addVoie = (idRubrique) => {
    markEdited();
    setForm((prev) => ({ ...prev, voiesMoyens: [...(prev.voiesMoyens || []), nouvelleVoie(idRubrique)] }));
  };

  const removeVoie = (idx) => {
    markEdited();
    setForm((prev) => ({ ...prev, voiesMoyens: prev.voiesMoyens.filter((_, i) => i !== idx) }));
  };

  const updateCalendrier = (champ) => (idRubrique, i) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const calendrier = prev[champ] || {};
      const trimestres = [...(calendrier[idRubrique] || ['', '', '', ''])];
      trimestres[i] = value;
      return { ...prev, [champ]: { ...calendrier, [idRubrique]: trimestres } };
    });
  };

  if (view === 'form' && form) {
    const step = TRANCHE_STEPS[stepIndex];
    const lecteurs = calendrierLecteurs(form.calendrierNational, form.calendrierExterne);
    const isLast = stepIndex === TRANCHE_STEPS.length - 1;
    const stepHasError = (s) => s.fields.some((f) => Object.keys(formErrors).some((k) => fieldMatches(k, f)));

    const renderDepensesPrevisionnelles = () => (
      <>
        <div className="field-row">
          <div className="field">
            <label>Exercice <span className="required-mark">*</span></label>
            <select
              value={form.idExercice}
              disabled={!!editingTranche}
              title={editingTranche ? "L'exercice d'une tranche déjà enregistrée ne peut plus être changé." : undefined}
              onChange={(e) => setForm((prev) => ({ ...prev, idExercice: e.target.value }))}
            >
              <option value="">—</option>
              {exercices.map((ex) => (
                <option key={ex.id} value={ex.id} disabled={!editingTranche && exercicesPris.has(String(ex.id))}>
                  {ex.libelle}{!editingTranche && exercicesPris.has(String(ex.id)) ? ' (déjà saisi)' : ''}
                </option>
              ))}
            </select>
            {formErrors.idExercice && <span className="field-error">{formErrors.idExercice}</span>}
          </div>
        </div>
        <h4 className="wizard-substep-title">44 — Dépenses prévisionnelles (Exercice Actuel)</h4>
        <p className="bilan-plan-hint">Montants en gourdes prévus pour l'exercice, par source de financement — le poids se calcule automatiquement.</p>
        {form.sources.length === 0 ? (
          <p className="bilan-plan-empty">Aucune source de financement disponible — les sources de référence n'ont pas pu être chargées.</p>
        ) : (
          <DepensesPrevisionnellesTable sources={form.sources} onChange={updateSource} />
        )}
      </>
    );

    const renderers = {
      'depenses-previsionnelles': renderDepensesPrevisionnelles,
      'cout-activites': () => <CoutActivitesSection activites={fiop.activites || []} />,
      'calendrier-national': () => (
        <CalendrierSection type="national" rubriques={rubriques} valeur={lecteurs.national} onChange={updateCalendrier('calendrierNational')} />
      ),
      'calendrier-externe': () => (
        <CalendrierSection type="externe" rubriques={rubriques} valeur={lecteurs.externe} onChange={updateCalendrier('calendrierExterne')} />
      ),
      'calendrier-global': () => <CalendrierSection type="global" rubriques={rubriques} valeur={lecteurs.global} />,
      'voies-moyens': () => (
        <VoiesMoyensSection
          rubriques={rubriques}
          lignes={form.voiesMoyens || []}
          errors={formErrors}
          onChange={updateVoie}
          onAdd={addVoie}
          onRemove={removeVoie}
        />
      ),
      chronogramme: () => (
        <ChronogrammeSection
          activites={fiop.activites || []}
          chronogramme={form.chronogramme}
          coutTrimestres={editingTranche?.coutTrimestres}
          onToggle={toggleMois}
        />
      ),
    };

    return (
      <form onSubmit={submitForm} className="modal-form bilan-form wizard-form" noValidate>
        <h3 className="bilan-view-title">
          {editingTranche ? `Tranche annuelle — ${editingTranche.exerciceLibelle}` : 'Nouvelle tranche annuelle'}
        </h3>

        {TRANCHE_STEPS.length > 1 && (
          <nav className="wizard-steps">
            {TRANCHE_STEPS.map((s, idx) => (
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
                  onClick={() => goToStep(idx)}
                  title={s.label}
                >
                  <span className="wizard-step-circle">{idx + 1}</span>
                  <span className="wizard-step-label">{s.label}</span>
                </button>
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="wizard-step-body" onChange={markEdited}>
          <h4 className="form-section-title">{step.label}</h4>
          {renderers[step.id]()}
          {step.id.startsWith('calendrier') && Object.entries(formErrors)
            .filter(([k]) => step.fields.some((f) => fieldMatches(k, f)))
            .map(([k, message]) => <div key={k} className="field-error">{message}</div>)}
        </div>

        {formErrors.general && <div className="form-error">{formErrors.general}</div>}
        {savedNotice && !formErrors.general && <div className="form-success">{savedNotice}</div>}

        <div className="modal-actions wizard-nav">
          <button type="button" className="secondary-btn" onClick={closeForm}>Annuler</button>
          <div className="wizard-nav-spacer" />
          {stepIndex > 0 && (
            <button type="button" className="secondary-btn" disabled={submitting} onClick={() => goToStep(stepIndex - 1)}>← Précédente</button>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement...' : isLast ? 'Enregistrer la tranche' : 'Enregistrer et continuer →'}
          </button>
        </div>
      </form>
    );
  }

  if (view === 'detail' && detailTranche) {
    return (
      <div>
        <h3 className="bilan-view-title">Tranche annuelle — Exercice {detailTranche.exerciceLibelle}</h3>
        <h4 className="form-section-title">Dépenses prévisionnelles par source (§44)</h4>
        <DepensesPrevisionnellesTable sources={buildSourceRows(refSources, detailTranche)} />
        <h4 className="form-section-title">Coût d'exécution des activités (§45)</h4>
        <CoutActivitesSection activites={fiop.activites || []} />
        <h4 className="form-section-title">Chronogramme d'exécution des activités (§46)</h4>
        <ChronogrammeSection
          activites={fiop.activites || []}
          chronogramme={buildChronogramme(fiop.activites, detailTranche)}
          coutTrimestres={detailTranche.coutTrimestres}
        />
        <h4 className="form-section-title">Voies et moyens (§47)</h4>
        <VoiesMoyensSection
          rubriques={rubriques}
          lignes={(detailTranche.voiesMoyens || []).map((v) => nouvelleVoie(v.idRubrique, v))}
        />
        {(() => {
          const lecteurs = calendrierLecteurs(
            buildCalendrier(detailTranche.calendrierNational),
            buildCalendrier(detailTranche.calendrierExterne),
          );
          return (
            <>
              <h4 className="form-section-title">Calendrier d'utilisation des ressources financières (§48-50)</h4>
              <CalendrierSection type="national" rubriques={rubriques} valeur={lecteurs.national} />
              <CalendrierSection type="externe" rubriques={rubriques} valeur={lecteurs.externe} />
              <CalendrierSection type="global" rubriques={rubriques} valeur={lecteurs.global} />
            </>
          );
        })()}
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={() => setView('list')}>Retour à la liste</button>
        </div>
      </div>
    );
  }

  return loading ? (
    <p>Chargement...</p>
  ) : listError ? (
    <div className="form-error">{listError}</div>
  ) : (
    <div>
      <div className="card-header-row">
        <h4 className="form-section-title bilan-list-title">Tranches annuelles existantes</h4>
        {canEdit && (
          <button type="button" className="primary-btn" onClick={openCreate}>
            + Nouvelle tranche annuelle
          </button>
        )}
      </div>
      {actionError && <div className="form-error">{actionError}</div>}
      <div className="bilan-table-wrap">
        <table className="bilan-table">
          <thead><tr><th>Exercice</th><th>Dépenses prévisionnelles (§44)</th><th></th></tr></thead>
          <tbody>
            {tranches.map((t) => (
              <tr key={t.idExercice}>
                <td>{t.exerciceLibelle}</td>
                <td>{formatGourde(t.montantTotal)} G</td>
                <td className="fiop-row-actions">
                  <button type="button" className="mini-btn" onClick={() => openDetail(t)}>Voir</button>
                  {canEdit && <button type="button" className="mini-btn" onClick={() => openEdit(t)}>Modifier</button>}
                  {canEdit && <button type="button" className="mini-btn danger" onClick={() => handleDelete(t)}>Supprimer</button>}
                </td>
              </tr>
            ))}
            {tranches.length === 0 && (
              <tr><td colSpan={3}>Aucune tranche annuelle pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
