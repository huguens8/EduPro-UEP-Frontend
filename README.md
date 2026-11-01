
# MOAR Car
_Jasmin MICHEL_,
_Josselet ORELUS_,
_Huguens AIME_,
_Jean Wilky RENE_

> Ici on adapte le sujet initialement proposé au cas spécifique de Port-au-Prince ?

## Contexte du problème 
En Haiti et surtout dans la région métropolitaine de Port-au-Prince, la mobilité urbaine est devenue un véritable défi. Tous les jours :

* Les embouteillages paralysent la circulation aux heures de pointe.
* Le coût du carburant augmente régulièrement.
* Les transports publics sont souvent surchargés et peu fiables.
* Les employés, les étudiants, les élèves perdent beaucoup de temps dans les déplacements et ils arrivent souvent en retard à leur destination.

De plus, nous pouvons constater que de nombreuses voitures privées circulent avec une seule ou deux personnes à bord, alors que plusieurs personnes effectuent les mêmes trajets.

Dans un contexte d’instabilité économique, de manque de confiance dans certains cas et de difficultés d’accès au transport, il devient plus qu’urgent de trouver une solution plus économique, plus sûre et plus organisée qui donnera naissance du même coup à une communauté.

> Plus modestement, on propose une solution adaptée au cas des étudiants qui pourra ausi être adoptée en dehors de cette communauté si elle fait ses preuves

## Problème
Le déplacement des gens pour arriver à destination pose pas mal de problèmes que nous essayons d’énumérer :
* Difficulté dans le transport en commun pour permettre aux employés de déplacer d’une manière acceptable
* Une voiture privée peut tomber en panne dans le circuit
* Trop de voitures sur la route émettent des gaz à effet de serre ce qui entraine une pollution de l’air

> Dans notre cas le point important est d'apporter de la flexibilité et ce en temps réel si possible

## Présentation du projet
L’application __*MOAR Car*__ est un service de covoiturage gratuit c’est-à-dire que l’application ne prélève aucun paiement sur les trajets.

> Rien n'interdit d'imaginer une contribution / récompense des participants

Son objectif principal est de favoriser la mobilité des employés, de leur permettre de lier de nouvelle connaissance et augmenter la confiance entre collègues.
La mise en place de l’application MOAR Car permettra :
* De connecter les conducteurs et passagers ayant des trajets similaires.
* De partager les frais de carburant si possible.
* De réduire le nombre de véhicules en circulation sur la voie publique.
* D’améliorer la sécurité grâce à un système d’inscription et d’évaluation des utilisateurs. 

Les Cas d’Utilisation associés à l’application MOAR Car sont :
* S’Inscrire au système
* Se Connecter au système
* Consulter les itinéraires similaires
* Rechercher un itinéraire
* Réserver un itinéraire
* Sélectionner un conducteur
* Accepter / refuser une réservation
* Publier un itinéraire
* Gérer les utilisateurs
* Confirmer itinéraire

## Architecture technique actuelle du dépôt
Le dépôt contient un socle Android en Kotlin avec Jetpack Compose (MVVM + Hilt).

* Interface mobile : navigation Compose entre authentification, accueil et publication de trajet.
* Persistance locale : Room (`AppDatabase`) sert de cache hors-ligne (utilisateurs, véhicules, trajets, réservations).
* Base de données partagée : **Supabase** (Postgres + Auth + Realtime) est la source de vérité pour la synchronisation entre utilisateurs. Le schéma SQL est dans [`supabase/schema.sql`](supabase/schema.sql).
* Cartographie / adresses : Retrofit + l'API Nominatim (OpenStreetMap) pour la recherche d'adresses.

### Configuration Supabase (requis pour lancer l'app)
1. Créer un projet gratuit sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécuter le contenu de [`supabase/schema.sql`](supabase/schema.sql).
3. Dans **Authentication > Providers > Email**, désactiver *Confirm email* pour le développement (sinon l'inscription ne connecte pas automatiquement l'utilisateur).
4. Récupérer l'URL du projet et la clé `anon public` (**Project Settings > API**).
5. Ajouter ces deux lignes dans `local.properties` (fichier non versionné, à la racine du dépôt) :
   ```
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
6. Recompiler le projet — ces valeurs sont injectées via `BuildConfig`.

> Enfin, il est attendu de compléter cette analyse par un état de l’art accompagné d’une étude comparative de solutions similaires, existantes ou potentiellement adaptables au contexte du projet. Cette démarche permettra de mieux situer MOAR Car par rapport aux approches de covoiturage déjà déployées, tant sur le plan fonctionnel que sur le plan technique et organisationnel.


# EduPro-UEP-Frontend
