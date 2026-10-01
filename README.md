# NAFA — Chaque franc compte

NAFA est un compagnon de budget et d’épargne pour étudiants et jeunes actifs burkinabè, avec une comptabilité en FCFA.

## Prérequis

- **Node.js** : 20 ou supérieur
- **npm** : 9 ou supérieur
- Pour Android : Java 21 et Android SDK (ou GitHub Actions)

## Installation et démarrage local

```bash
npm ci
cp .env.example .env
# Facultatif : définir GEMINI_API_KEY pour la synthèse vocale avancée
npm run dev
```

L’application est disponible sur `http://localhost:3000`. Sans clé Gemini, le lecteur audio conserve son mécanisme de repli vers la voix de l’appareil.

## Vérification et compilation

| Commande | Description |
|---|---|
| `npm test` | Tests unitaires de l’arrondi FCFA, du registre et des imports JSON |
| `npm run lint` | Vérification des types TypeScript (`tsc --noEmit`) |
| `npm run build` | Compilation de l’interface Vite et du serveur Express |
| `npm run build:client` | Compilation de l’interface statique (`dist/`) |
| `npm run start` | Démarrage du serveur compilé |
| `npm run preview` | Prévisualisation locale du build Vite |

## Données et confidentialité

Les dépenses, revenus, objectifs et sauvegardes sont conservés localement sur l’appareil. L’option **Audio** transmet le texte lu — qui peut inclure le prénom et le budget quotidien — au service de synthèse vocale pour produire la voix. Aucun appel audio n’est déclenché sans action de l’utilisateur. Le mode discret floute les principaux montants visibles sur l’écran d’accueil.

Une sauvegarde JSON peut être exportée depuis Réglages. L’import valide la structure et les montants avant de remplacer les données; les imports de plus de 10 Mo sont refusés. Conserve une copie séparée de l’appareil.

Lors du passage au stockage local v6, la clé v5 existante n’est pas supprimée : elle reste disponible sur l’appareil comme copie de récupération. Cette copie locale ne remplace pas une sauvegarde JSON exportée hors de l’appareil.

## GitHub Actions

### Vérification CI

`.github/workflows/ci.yml` s’exécute sur les pushes de branche, les pull requests vers `main`/`master` et à la demande. Elle installe exactement le lockfile avec `npm ci`, puis exécute les tests, le contrôle TypeScript et le build.

### APK Android

`.github/workflows/build-apk.yml` produit un APK debug sur les pushes vers `main`/`master`. Les exécutions manuelles permettent aussi de choisir `debug`, `release` ou `both`. Les APK sont déposés comme artefacts temporaires de l’exécution Actions (rétention de 30 jours); ils ne sont plus publiés automatiquement dans une GitHub Release.

Pour produire un **APK release signé**, configure dans les secrets du dépôt :

- `NAFA_ANDROID_KEYSTORE_BASE64` — keystore encodé en Base64
- `NAFA_ANDROID_KEY_ALIAS`
- `NAFA_ANDROID_STORE_PASSWORD`
- `NAFA_ANDROID_KEY_PASSWORD`

Les secrets de signature ne doivent jamais être ajoutés au dépôt. En leur absence, le workflow refuse un build release; le build debug reste disponible.

### GitHub Pages

Le workflow Pages est manuel pour éviter une publication publique avant configuration explicite. Avant de le lancer, sélectionne **Settings → Pages → Build and deployment → GitHub Actions** sur GitHub, puis lance « Déploiement GitHub Pages » depuis l’onglet Actions.

## Fonctionnalités

- Tableau de bord budget du jour, solde réel, radar de fin de mois et raccourcis
- Saisie rapide des dépenses et revenus, annulation temporaire d’une saisie et restauration d’une suppression
- Objectifs d’épargne, progression par étapes, arrondis, dettes, tontines et rattrapage historique
- Export PDF, sauvegarde/restauration JSON et mode discret
- Animations compatibles avec la préférence système « Réduire les animations »
- Langue française complète; Mooré, Dioula et Fulfuldé sont annoncés comme « bientôt » et ne sont pas présentés comme déjà traduits

## Structure

- `src/components/` : écrans et modales React
- `src/utils/engine.ts` : calculs budgétaires et arrondis FCFA
- `src/utils/ledger.ts` : transitions testables du registre dépenses/solde/objectifs
- `src/utils/storage.ts` : persistance locale et import/export de sauvegarde
- `server.ts` : service Express pour audio Gemini, avec validation de requêtes et limitation de débit
- `.github/workflows/` : vérification CI, build Android et déploiement manuel Pages
