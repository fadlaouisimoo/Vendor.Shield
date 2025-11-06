# VendorShield — Portail de Conformité Fournisseurs

Application web simple (Express + SQLite + EJS) permettant aux fournisseurs de remplir une auto-évaluation, de déposer des preuves et de calculer un score de conformité. Un tableau de bord liste les fournisseurs, leurs scores et statuts.

## Prérequis
- Node.js 18+
- OS: Windows/macOS/Linux

## Installation
```bash
npm install
```

## Lancer en développement
```bash
npm run dev
```
Puis ouvrir `http://localhost:3000`.

## Lancer en production simple
```bash
npm start
```

## Fonctionnalités
- Base fournisseurs (SQLite)
- Lien d'invitation public par fournisseur
- Questionnaire (Oui / Non / N/A) avec téléversement de preuves
- Calcul du score pondéré et statut (Conforme / En cours / Non conforme)
- Tableau de bord avec KPIs simples

## Structure
- `app.js` serveur Express, routes, scoring
- `db.js` initialisation SQLite
- `views/` templates EJS (dashboard, formulaire, etc.)
- `public/` styles
- `uploads/` fichiers déposés (gitignoré)

## Questions/Exigences (exemple)
1. Antivirus à jour
2. MFA activée
3. PRA testé
4. Gestion de correctifs
5. Sauvegardes chiffrées et testées

## Sécurité (démo)
- Les liens d'invitation sont des tokens aléatoires (nanoid)
- Les fichiers sont servis depuis `/uploads` (démo). En prod, utilisez un stockage privé et signature d'URL.

## Données
- Base SQLite `vendorshield.db` créée au premier lancement

## Membre de l'équipe
- Groupe de 3 — vous pouvez répartir: Backend, Front (EJS), Gouvernance

## Rapport de Gouvernance
Voir `GOVERNANCE_REPORT.md` pour les livrables gouvernance (risques, politique, processus, KPIs).


