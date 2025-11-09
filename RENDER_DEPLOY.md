# Guide de Déploiement sur Render

Ce guide vous explique comment déployer VendorShield sur Render étape par étape.

## 📋 Prérequis

1. Un compte GitHub/GitLab/Bitbucket (pour héberger votre code)
2. Un compte Render (gratuit) : https://render.com
3. Votre base de données Turso configurée
4. Votre code poussé sur un dépôt Git

---

## 🚀 Étapes de Déploiement

### Étape 1 : Préparer votre code

#### 1.1 Vérifier le .gitignore

Assurez-vous que votre `.gitignore` contient :
```
node_modules/
uploads/
vendorshield.db*
.env
npm-debug.log*
```

#### 1.2 Pousser votre code sur GitHub

```bash
git init
git add .
git commit -m "Initial commit - VendorShield ready for deployment"
git branch -M main
git remote add origin https://github.com/votre-username/vendorshield.git
git push -u origin main
```

---

### Étape 2 : Créer un compte Render

1. Allez sur https://render.com
2. Cliquez sur "Get Started for Free"
3. Connectez-vous avec GitHub/GitLab/Bitbucket
4. Autorisez Render à accéder à vos dépôts

---

### Étape 3 : Créer un nouveau Web Service

1. Dans le dashboard Render, cliquez sur **"New +"**
2. Sélectionnez **"Web Service"**
3. Connectez votre dépôt GitHub :
   - Cliquez sur **"Connect account"** si nécessaire
   - Sélectionnez votre dépôt `vendorshield`
   - Cliquez sur **"Connect"**

---

### Étape 4 : Configurer le Web Service

Remplissez les informations suivantes :

#### Informations de base :
- **Name** : `vendorshield` (ou le nom de votre choix)
- **Region** : Choisissez la région la plus proche (ex: `Frankfurt` pour l'Europe)
- **Branch** : `main` (ou votre branche principale)
- **Root Directory** : Laissez vide (racine du projet)
- **Runtime** : `Node`
- **Build Command** : `npm install`
- **Start Command** : `npm start`

#### Configuration avancée (cliquez sur "Advanced") :
- **Auto-Deploy** : `Yes` (déploie automatiquement à chaque push)
- **Health Check Path** : `/` (optionnel)

---

### Étape 5 : Configurer les Variables d'Environnement

Dans la section **"Environment Variables"**, ajoutez toutes ces variables :

#### Base de données Turso :
```
TURSO_DB_URL = libsql://vendorshield-fadlaouisimoo.aws-eu-west-1.turso.io
TURSO_DB_AUTH_TOKEN = votre-token-turso-actuel
```

#### Configuration serveur :
```
NODE_ENV = production
PORT = 10000
BASE_URL = https://votre-app.onrender.com
```

**Note** : Render définit automatiquement `PORT`, mais vous pouvez le laisser à 10000.

#### Authentification admin :
```
ADMIN_USERNAME = votre-nom-admin
ADMIN_PASSWORD = votre-mot-de-passe-securise
SESSION_SECRET = generez-une-chaine-aleatoire-longue-et-securisee
```

**Pour générer SESSION_SECRET** :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Configuration email (choisissez une option) :

**Option 1 : SMTP personnalisé**
```
SMTP_HOST = smtp.example.com
SMTP_PORT = 587
SMTP_USER = votre-email@example.com
SMTP_PASS = votre-mot-de-passe
SMTP_FROM_NAME = VendorShield
SMTP_FROM_EMAIL = noreply@example.com
```

**Option 2 : Gmail**
```
GMAIL_USER = votre-email@gmail.com
GMAIL_APP_PASSWORD = votre-app-password-gmail
```

---

### Étape 6 : Créer le Service

1. Cliquez sur **"Create Web Service"**
2. Render va commencer à construire et déployer votre application
3. Attendez 5-10 minutes pour le premier déploiement

---

### Étape 7 : Vérifier le Déploiement

1. Une fois le déploiement terminé, vous verrez :
   - ✅ "Your service is live at https://votre-app.onrender.com"
2. Cliquez sur l'URL pour tester votre application
3. Vérifiez les logs dans l'onglet **"Logs"** pour voir :
   - `✅ Connected to Turso database`
   - `✅ Email server is ready`
   - `VendorShield running at http://localhost:10000`

---

## ⚠️ Points Importants

### 1. Stockage des Fichiers (Uploads)

**Problème** : Render utilise un système de fichiers éphémère. Les fichiers uploadés seront perdus lors des redémarrages.

**Solutions** :

#### Option A : Utiliser un service de stockage cloud (Recommandé)
- **Cloudinary** (gratuit jusqu'à 25GB)
- **AWS S3**
- **Google Cloud Storage**

#### Option B : Utiliser un Disk persistant Render (Payant)
- Dans Render, créez un **"Disk"** persistant
- Montez-le dans votre service

#### Option C : Stocker dans Turso (pour petits fichiers)
- Convertir les fichiers en base64 et les stocker dans la base

**Pour l'instant** : Les uploads fonctionneront, mais seront perdus lors des redémarrages. C'est acceptable pour tester.

### 2. URL de Base

Après le déploiement, mettez à jour `BASE_URL` dans les variables d'environnement avec votre URL Render réelle :
```
BASE_URL = https://votre-app.onrender.com
```

### 3. HTTPS

Render fournit automatiquement HTTPS. Votre application sera accessible via `https://`.

### 4. Redémarrages

Render redémarre automatiquement votre service :
- Après chaque déploiement
- Après 15 minutes d'inactivité (plan gratuit)
- En cas d'erreur

---

## 🔧 Dépannage

### Erreur de build

Vérifiez les logs de build :
- Assurez-vous que `package.json` est correct
- Vérifiez que toutes les dépendances sont listées

### Erreur 401 Turso

- Vérifiez que `TURSO_DB_AUTH_TOKEN` est correct
- Générez un nouveau token si nécessaire

### Erreur de connexion

- Vérifiez que toutes les variables d'environnement sont définies
- Vérifiez les logs pour les erreurs spécifiques

### Service qui se redémarre

- Vérifiez les logs pour les erreurs
- Assurez-vous que le port est correct (Render utilise le port défini dans `PORT`)

---

## 📝 Mise à Jour de l'Application

Pour mettre à jour votre application :

1. Faites vos modifications localement
2. Commitez et poussez sur GitHub :
   ```bash
   git add .
   git commit -m "Description des modifications"
   git push
   ```
3. Render déploiera automatiquement (si Auto-Deploy est activé)
4. Ou allez dans Render et cliquez sur **"Manual Deploy"**

---

## 🎉 Félicitations !

Votre application VendorShield est maintenant déployée sur Render !

**URL de votre application** : `https://votre-app.onrender.com`

---

## 📚 Ressources

- Documentation Render : https://render.com/docs
- Support Render : https://render.com/support
- Dashboard Turso : https://turso.tech

