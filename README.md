# NAFA — Chaque franc compte

Application web moderne de gestion budgétaire et d'épargne conçue pour les étudiants et jeunes actifs burkinabè (FCFA).

## Prérequis

- **Node.js** : version 20 ou supérieure (`node -v`)
- **npm** : version 9 ou supérieure (`npm -v`)

## Installation & Démarrage local

1. **Cloner le dépôt :**
   ```bash
   git clone <URL_DU_DEPOT_GITHUB>
   cd nafa
   ```

2. **Installer les dépendances :**
   ```bash
   npm ci
   ```

3. **Configurer l'environnement :**
   ```bash
   cp .env.example .env
   # Optionnel : définir GEMINI_API_KEY pour la synthèse vocale avancée
   ```

4. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
   L'application est disponible sur `http://localhost:3000`.

## Scripts de compilation & vérification

| Commande | Description |
|---|---|
| `npm run lint` | Validation stricte des types TypeScript via `tsc --noEmit` |
| `npm run build` | Compilation complète de production (Client Vite SPA + Serveur Express bundlé) |
| `npm run build:client` | Compilation uniquement de l'interface client statique (`dist/`) |
| `npm run start` | Démarrage du serveur de production compilé (`node dist/server.cjs`) |
| `npm run preview` | Prévisualisation du build Vite statique |

## Intégration Continue & Compilation APK (GitHub Actions)

Le dépôt intègre trois workflows automatisés sous `.github/workflows/` :

1. **`build-apk.yml` (Compilation APK Android)** :
   - Déclenché automatiquement lors de chaque `push` sur `main` / `master`, lors de la création d'un tag de version (`v*`), ou manuellement via l'onglet **Actions > Build Android APK > Run workflow**.
   - Configure automatiquement l'environnement Java JDK 21, Node.js 20, le SDK Android et Gradle.
   - Compile l'application React/Vite en bundle web de production et synchronise Capacitor Android.
   - Génère l'**APK Debug** et l'**APK Release** prêts à être installés directement sur smartphone Android.
   - Met à disposition les fichiers APK téléchargeables sous forme d'artefacts GitHub Actions (`nafa-app-debug-apk` et `nafa-app-release-apk`).

2. **`ci.yml` (Build & Verification)** :
   - Exécuté automatiquement à chaque `push` et `pull_request` sur les branches `main` et `master`.
   - Lance `npm ci`, puis le linting de typechecking (`npm run lint`), puis la compilation de production (`npm run build`).
   - Archive automatiquement le bundle compilé `dist/` en artefact téléchargeable.

3. **`deploy-pages.yml` (Déploiement GitHub Pages)** :
   - Permet de publier en un clic ou lors d'un push l'interface client SPA statique sur GitHub Pages.

## Structure du projet

- `src/` : Code source React 19 + Tailwind CSS 4 + TypeScript
  - `components/` : Écrans (Aujourd'hui, Objectifs, Carnet, Mémoire, Réglages) et modales (saisie, claviers, export)
  - `utils/` : Moteur de calcul budgétaire NAFA, persistance locale (`localStorage`), export PDF / JSON
  - `types.ts` : Modèle de données typé (dépenses, revenus, objectifs, dettes, tontines)
- `server.ts` : Backend Express (API REST, synthèse vocale Gemini TTS, service statique Vite)
- `.github/workflows/` : Configurations d'automatisation CI/CD pour GitHub
