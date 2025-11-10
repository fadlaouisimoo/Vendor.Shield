# Options de Déploiement Gratuites pour VendorShield

Voici plusieurs alternatives gratuites pour déployer votre application VendorShield.

---

## 🚀 Option 1 : Railway (Recommandé - Très Simple)

### Avantages :
- ✅ **100% gratuit** avec $5 de crédit par mois
- ✅ Déploiement automatique depuis GitHub
- ✅ Variables d'environnement faciles
- ✅ Pas de sommeil automatique
- ✅ HTTPS automatique
- ✅ Très simple à utiliser

### Étapes :

1. **Créer un compte** : https://railway.app
   - Connectez-vous avec GitHub

2. **Créer un nouveau projet** :
   - Cliquez sur "New Project"
   - Sélectionnez "Deploy from GitHub repo"
   - Choisissez votre dépôt `vendorshield`

3. **Configurer** :
   - Railway détecte automatiquement Node.js
   - Build Command : `npm install` (automatique)
   - Start Command : `npm start` (automatique)

4. **Variables d'environnement** :
   - Cliquez sur votre service → "Variables"
   - Ajoutez toutes les variables (même que Render)

5. **Déployer** :
   - Railway déploie automatiquement
   - Votre URL sera : `https://votre-app.up.railway.app`

**Documentation** : https://docs.railway.app

---

## 🚀 Option 2 : Fly.io (Gratuit avec Limitations)

### Avantages :
- ✅ **Gratuit** : 3 VMs partagées gratuites
- ✅ Déploiement rapide
- ✅ Global (multi-régions)
- ✅ Pas de sommeil automatique

### Étapes :

1. **Installer Fly CLI** :
   ```bash
   # Windows (PowerShell)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Créer un compte** : https://fly.io
   ```bash
   fly auth signup
   ```

3. **Initialiser le projet** :
   ```bash
   fly launch
   ```
   - Suivez les instructions
   - Créez un `fly.toml` automatiquement

4. **Configurer les secrets** :
   ```bash
   fly secrets set TURSO_DB_URL="votre-url"
   fly secrets set TURSO_DB_AUTH_TOKEN="votre-token"
   # ... etc pour toutes les variables
   ```

5. **Déployer** :
   ```bash
   fly deploy
   ```

**Documentation** : https://fly.io/docs

---

## 🚀 Option 3 : Vercel (Gratuit - Limité pour Backend)

### Avantages :
- ✅ **100% gratuit**
- ✅ Déploiement très rapide
- ✅ Excellent pour les API
- ⚠️ Limité à 10 secondes par requête (plan gratuit)

### Étapes :

1. **Créer un compte** : https://vercel.com
   - Connectez-vous avec GitHub

2. **Importer le projet** :
   - "Add New" → "Project"
   - Importez votre dépôt GitHub

3. **Configuration** :
   - Framework Preset : "Other"
   - Build Command : `npm install`
   - Output Directory : (laissez vide)
   - Install Command : `npm install`

4. **Variables d'environnement** :
   - Onglet "Environment Variables"
   - Ajoutez toutes les variables

5. **Déployer** :
   - Cliquez sur "Deploy"
   - Votre URL sera : `https://votre-app.vercel.app`

**Note** : Vercel est optimisé pour les fonctions serverless. Pour une app Express complète, Railway ou Fly.io sont meilleurs.

**Documentation** : https://vercel.com/docs

---

## 🚀 Option 4 : Render (Plan Gratuit Disponible)

### Note :
Render a bien un plan gratuit, mais avec limitations :
- ⚠️ Service s'endort après 15 minutes d'inactivité
- ⚠️ Réveil lent (30-60 secondes)
- ✅ Mais c'est gratuit !

Si vous voulez quand même utiliser Render :
- Le plan gratuit fonctionne pour le développement/test
- Pour la production, considérez Railway (meilleur gratuit)

---

## 🚀 Option 5 : Cyclic.sh (Gratuit - Serverless)

### Avantages :
- ✅ **100% gratuit**
- ✅ Déploiement depuis GitHub
- ✅ Pas de configuration complexe
- ✅ HTTPS automatique

### Étapes :

1. **Créer un compte** : https://cyclic.sh
   - Connectez-vous avec GitHub

2. **Déployer** :
   - "Deploy Now"
   - Sélectionnez votre dépôt
   - Cyclic détecte automatiquement Node.js

3. **Variables d'environnement** :
   - Onglet "Environment"
   - Ajoutez vos variables

**Documentation** : https://docs.cyclic.sh

---

## 📊 Comparaison Rapide

| Plateforme | Gratuit | Sommeil | Simplicité | Recommandé |
|------------|---------|---------|------------|------------|
| **Railway** | ✅ $5/mois | ❌ Non | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Fly.io** | ✅ 3 VMs | ❌ Non | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Vercel** | ✅ Oui | ❌ Non | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Render** | ✅ Oui | ⚠️ Oui (15min) | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Cyclic** | ✅ Oui | ❌ Non | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 Ma Recommandation

### Pour votre cas : **Railway**

**Pourquoi Railway ?**
1. ✅ Très simple (presque automatique)
2. ✅ $5 de crédit gratuit par mois (suffisant pour une petite app)
3. ✅ Pas de sommeil automatique
4. ✅ Déploiement depuis GitHub en 1 clic
5. ✅ Support excellent

**Alternative si Railway ne fonctionne pas** : **Fly.io** (également excellent et gratuit)

---

## 📝 Configuration pour Railway

Si vous choisissez Railway, voici un guide rapide :

### 1. Créer le projet
- Allez sur https://railway.app
- "New Project" → "Deploy from GitHub repo"
- Sélectionnez votre dépôt

### 2. Variables d'environnement
Ajoutez exactement les mêmes variables que pour Render :
- `TURSO_DB_URL`
- `TURSO_DB_AUTH_TOKEN`
- `NODE_ENV=production`
- `PORT` (Railway le définit automatiquement, mais vous pouvez mettre `10000`)
- `BASE_URL=https://votre-app.up.railway.app`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `EMAIL_FROM` (optionnel)
- `EMAIL_FROM_NAME` (optionnel)

### 3. Déploiement
- Railway déploie automatiquement
- Votre app sera disponible sur `https://votre-app.up.railway.app`

---

## 🆘 Besoin d'aide ?

Si vous choisissez Railway ou Fly.io, je peux vous créer un guide détaillé spécifique à la plateforme choisie !

