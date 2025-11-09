# VendorShield — Portail de Conformité Fournisseurs

Application web complète (Express + SQLite + EJS) permettant aux fournisseurs de remplir une auto-évaluation de sécurité, de déposer des preuves et de calculer un score de conformité. Un tableau de bord permet à l'équipe sécurité de suivre les fournisseurs, valider les évaluations et gérer le processus de conformité.

## Prérequis
- Node.js 18+
- OS: Windows/macOS/Linux

## Installation
```bash
npm install
```

## Configuration
Créez un fichier `.env` à la racine du projet avec les variables suivantes (voir `.env.example` pour un modèle) :
- `ADMIN_USERNAME` : Nom d'utilisateur pour l'accès admin
- `ADMIN_PASSWORD` : Mot de passe pour l'accès admin
- `SESSION_SECRET` : Secret pour les sessions (générer une chaîne aléatoire)
- `PORT` : Port du serveur (défaut: 3000)
- `BASE_URL` : URL de base de l'application
- Configuration email (SMTP ou Gmail) pour les notifications

## Lancer en développement
```bash
npm run dev
```
Puis ouvrir `http://localhost:3000`.

## Lancer en production
```bash
npm start
```

## Fonctionnalités

### Pour les Fournisseurs
- Espace fournisseur avec auto-évaluation
- Questionnaire structuré en 5 sections (9 questions)
- Téléversement de preuves pour chaque question
- Suivi du statut de validation en temps réel
- Notifications par email lors de la validation

### Pour l'Équipe Sécurité (Admin)
- Tableau de bord avec KPIs (conformité, risques, scores moyens)
- Gestion des fournisseurs (ajout, suppression, liens d'invitation)
- Validation des évaluations (Approuver / Rejeter / Demander clarifications)
- Notifications visuelles pour les évaluations en attente
- Système de marquage "lu" pour les notifications
- Détails complets des évaluations avec réponses et preuves

## Structure du Projet
- `app.js` : Serveur Express, routes, logique métier, calcul de score, validation
- `db.js` : Initialisation SQLite et migrations
- `email.js` : Module d'envoi d'emails (notifications)
- `views/` : Templates EJS (dashboard, formulaire, pages publiques)
- `public/` : Styles CSS et assets statiques
- `uploads/` : Fichiers déposés par les fournisseurs (gitignoré)
- `locales/` : Fichiers de traduction FR/EN

## Questionnaire de Conformité

Le questionnaire est organisé en **5 sections** avec **9 questions** au total :

### Section 1 : Authentification et Contrôle d'accès
1. **MFA** (poids: 2) - Authentification multi-facteurs pour tous les comptes
2. **IAM** (poids: 2) - Système de gestion des identités
3. **Désactivation de comptes** (poids: 1) - Désactivation immédiate après départ

### Section 2 : Sécurité des postes et serveurs
4. **Antivirus/EDR** (poids: 2) - Protection à jour sur tous les postes/serveurs
5. **Mises à jour de sécurité** (poids: 2) - Application régulière des patchs

### Section 3 : Segmentation et isolation des environnements
6. **Segmentation réseau** (poids: 2) - Isolation des environnements critiques
7. **Supervision** (poids: 2) - Mécanismes de surveillance des accès et flux

### Section 4 : Plan de Reprise d'Activité (PRA) et Continuité
8. **PRA documenté** (poids: 2) - Plan documenté et validé par la direction

### Section 5 : Surveillance, conformité et reporting
9. **SIEM** (poids: 2) - Système centralisé de journalisation

## Calcul du Score

Le score est calculé selon une **formule pondérée** :

### Formule
```
Score (%) = (Σ (poids × réponse_oui)) / (Σ poids) × 100
```

Où :
- **poids** : Poids de chaque question (1 ou 2 selon l'importance)
- **réponse_oui** : 1 si la réponse est "Oui", 0 si "Non"
- Les questions avec réponse "N/A" sont **exclues** du calcul (ne comptent ni au numérateur ni au dénominateur)

### Exemple de Calcul
Supposons 3 questions avec poids 2, 2, 1 :
- Question 1 (poids 2) : Oui → contribue 2
- Question 2 (poids 2) : Non → contribue 0
- Question 3 (poids 1) : N/A → exclue

Score = (2 + 0) / (2 + 2) × 100 = 50%

**Note** : Le score total possible est de 17 points (somme des poids de toutes les questions).

## Détermination du Statut

Le statut est déterminé automatiquement selon le score :

| Score | Statut | Description |
|-------|--------|-------------|
| **≥ 80%** | **COMPLIANT** (Conforme) | Le fournisseur répond aux exigences de sécurité |
| **50% - 79%** | **IN_PROGRESS** (En cours) | Des améliorations sont nécessaires |
| **< 50%** | **NON_COMPLIANT** (Non conforme) | Risques critiques identifiés |

### Formule
```javascript
if (score >= 80) return 'COMPLIANT';
if (score >= 50) return 'IN_PROGRESS';
return 'NON_COMPLIANT';
```

## Processus de Validation

1. **Soumission** : Le fournisseur remplit et soumet son évaluation
   - Statut initial : `PENDING` (En attente de validation)
   - Le score est calculé automatiquement mais **non visible** par le fournisseur

2. **Validation par l'équipe sécurité** :
   - **Approuver** : Statut → `APPROVED`, le statut calculé est conservé
   - **Rejeter** : Statut → `REJECTED`, statut forcé à `NON_COMPLIANT`
   - **Demander clarifications** : Statut → `NEEDS_CLARIFICATION`

3. **Notification** : Un email est envoyé au fournisseur avec :
   - Le résultat de la validation
   - Les commentaires de l'équipe sécurité
   - Un lien pour consulter le statut détaillé

## Sécurité

- Les liens d'invitation sont des tokens aléatoires (nanoid, 12 caractères)
- Authentification par session pour l'espace admin
- Les fichiers sont servis depuis `/uploads` (démo). En production, utilisez un stockage privé et signature d'URL.
- Variables d'environnement pour les secrets (`.env`)

## Données

- Base SQLite `vendorshield.db` créée au premier lancement
- Tables : `suppliers`, `assessments`
- Migrations automatiques pour les nouvelles colonnes

## Internationalisation

L'application supporte le français et l'anglais :
- Interface utilisateur traduite
- Emails de notification traduits
- Détection automatique de la langue (cookie, paramètre URL)

## Rapport de Gouvernance

Voir `GOVERNANCE_REPORT.md` pour les livrables gouvernance (risques, politique, processus, KPIs).

## Documentation Technique

Voir `PROJECT_TECHNICAL_INFO.txt` pour une analyse technique complète du projet.


