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

Le dépôt intègre un workflow CI/CD complet sous `.github/workflows/` :

### 1. `build-apk.yml` (Compilation & Publication APK Android)
- **Déclenchement automatique** : À chaque `push` sur les branches `main` ou `master`, à la création d'un tag (`v*`), ou manuellement via **GitHub > Actions > Build Android APK > Run workflow**.
- **Environnement configuré** : Java JDK 21 (Temurin), Android SDK Tools (API 36 & 35), licences Android automatiquement acceptées, Gradle 8.14.3.
- **Artefacts générés** :
  - `NAFA-debug.apk` (recommandé pour test et installation directe immédiate sur tout smartphone Android).
  - `NAFA-release.apk` (compilé avec signature debug pour permettre l'installation sans bloquage de certificat).

### 2. Liens directs de téléchargement des APKs

Dès que le workflow s'exécute sur votre dépôt GitHub, les APKs sont immédiatement accessibles via deux canaux :

1. **Lien direct public GitHub Releases (sans connexion requise) :**
   - **APK Debug (Direct)** : `https://github.com/<UTILISATEUR>/<DEPOT>/releases/latest/download/NAFA-debug.apk`
   - **APK Release (Direct)** : `https://github.com/<UTILISATEUR>/<DEPOT>/releases/latest/download/NAFA-release.apk`
   *(Remplacez `<UTILISATEUR>/<DEPOT>` par le nom de votre compte GitHub et de votre dépôt)*

2. **Depuis l'onglet Actions :**
   - Rendez-vous sur votre dépôt GitHub : `https://github.com/<UTILISATEUR>/<DEPOT>/actions`
   - Cliquez sur la dernière exécution **Build Android APK**
   - Descendez à la section **Artifacts** et cliquez sur **nafa-android-apks** pour télécharger l'archive zip contenant les APKs.

## Structure du projet

- `src/` : Code source React 19 + Tailwind CSS 4 + TypeScript
  - `components/` : Écrans (Aujourd'hui, Objectifs, Carnet, Mémoire, Réglages) et modales (saisie, claviers, export)
  - `utils/` : Moteur de calcul budgétaire NAFA, persistance locale (`localStorage`), export PDF / JSON
  - `types.ts` : Modèle de données typé (dépenses, revenus, objectifs, dettes, tontines)
- `server.ts` : Backend Express (API REST, synthèse vocale Gemini TTS, service statique Vite)
- `.github/workflows/` : Configurations d'automatisation CI/CD pour GitHub
