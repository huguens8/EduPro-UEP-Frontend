import './loadingIndicator.css';

// Indicateur d'attente des appels API, branché une seule fois sur apiClient :
// - le bouton qui a déclenché l'appel affiche une petite icône qui tourne et ne peut plus être
//   recliqué tant que la réponse n'est pas arrivée ;
// - tout appel qui dure plus de DELAI_GLOBAL_MS affiche aussi un indicateur en bas à droite
//   (chargements de page, actions sans bouton).
const DELAI_CLIC_MS = 1000; // un appel parti dans la seconde qui suit le clic est rattaché au bouton
const DELAI_GLOBAL_MS = 300; // pas d'indicateur global pour les réponses rapides

let dernierBouton = null;
let dateDernierBouton = 0;
let appelsEnCours = 0;
let timerGlobal = null;

function memoriserBouton(bouton) {
  if (bouton && !bouton.disabled) {
    dernierBouton = bouton;
    dateDernierBouton = Date.now();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => memoriserBouton(e.target.closest?.('button')), true);
  // Formulaire validé avec la touche Entrée : le bouton de soumission est e.submitter.
  document.addEventListener('submit', (e) => memoriserBouton(e.submitter), true);
}

function demarrerGlobal() {
  appelsEnCours += 1;
  if (appelsEnCours === 1) {
    timerGlobal = setTimeout(() => document.body.classList.add('api-busy'), DELAI_GLOBAL_MS);
  }
}

function arreterGlobal() {
  appelsEnCours = Math.max(0, appelsEnCours - 1);
  if (appelsEnCours === 0) {
    clearTimeout(timerGlobal);
    document.body.classList.remove('api-busy');
  }
}

function prendreBouton(bouton) {
  const n = Number(bouton.dataset.appels || 0) + 1;
  bouton.dataset.appels = String(n);
  bouton.classList.add('btn-loading');
  bouton.setAttribute('aria-busy', 'true');
}

function rendreBouton(bouton) {
  const n = Math.max(0, Number(bouton.dataset.appels || 0) - 1);
  bouton.dataset.appels = String(n);
  if (n === 0) {
    bouton.classList.remove('btn-loading');
    bouton.removeAttribute('aria-busy');
  }
}

export function installerIndicateurChargement(client) {
  client.interceptors.request.use((config) => {
    if (config._bouton === undefined) {
      const recent = dernierBouton && Date.now() - dateDernierBouton < DELAI_CLIC_MS && dernierBouton.isConnected;
      config._bouton = recent ? dernierBouton : null;
    }
    if (config._bouton) prendreBouton(config._bouton);
    demarrerGlobal();
    return config;
  });

  const terminer = (config) => {
    if (!config) return;
    if (config._bouton) rendreBouton(config._bouton);
    arreterGlobal();
  };

  client.interceptors.response.use(
    (response) => {
      terminer(response.config);
      return response;
    },
    (error) => {
      terminer(error.config);
      return Promise.reject(error);
    },
  );
}
