# Guide de Déploiement sur Vercel

Ce guide vous explique comment déployer VendorShield sur Vercel étape par étape.

## ✅ Avantages avec Turso

Oui, vous avez raison ! Avec Turso, vous n'aurez **aucun problème de base de données** car :
- ✅ Turso est une base de données cloud (pas de stockage local)
- ✅ Accessible depuis n'importe où via HTTP
- ✅ Parfait pour Vercel (serverless)

---

## ⚠️ Limitations Vercel à Connaître

Vercel est optimisé pour les **fonctions serverless**, pas pour les applications Express long-running :

1. **Limite de temps** : 10 secondes par requête (plan gratuit)
2. **Adaptation nécessaire** : Il faut adapter Express pour Vercel
3. **Pas de processus long-running** : Chaque requête est une fonction séparée

**Mais** : Pour votre application, cela devrait fonctionner car les requêtes sont rapides !

---

## 🚀 Étapes de Déploiement

### Étape 1 : Créer le fichier `vercel.json`

Créez un fichier `vercel.json` à la racine de votre projet :

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Étape 2 : Adapter `app.js` pour Vercel

Vercel nécessite que l'application soit exportée comme une fonction serverless. Nous devons adapter le code.

**Option A : Créer un wrapper (Recommandé)**

Créez un fichier `api/index.js` :

```javascript
import app from '../app.js';

export default app;
```

Et modifiez `app.js` pour exporter l'app au lieu de lancer le serveur directement.

**Option B : Modifier app.js directement (Plus simple)**

Nous allons modifier `app.js` pour qu'il fonctionne à la fois en local et sur Vercel.

### Étape 3 : Préparer votre code Git

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push
```

### Étape 4 : Créer un compte Vercel

1. Allez sur https://vercel.com
2. Cliquez sur **"Sign Up"**
3. Connectez-vous avec **GitHub** (recommandé)
4. Autorisez Vercel à accéder à vos dépôts

### Étape 5 : Importer votre projet

1. Dans le dashboard Vercel, cliquez sur **"Add New..."** → **"Project"**
2. Importez votre dépôt GitHub `vendorshield`
3. Vercel détectera automatiquement que c'est un projet Node.js

### Étape 6 : Configuration du projet

#### Framework Preset :
- Laissez **"Other"** ou sélectionnez **"Other"**

#### Build Settings :
- **Root Directory** : `.` (racine)
- **Build Command** : `npm install` (ou laissez vide, Vercel le fait automatiquement)
- **Output Directory** : (laissez vide)
- **Install Command** : `npm install`

#### Environment Variables :
Cliquez sur **"Environment Variables"** et ajoutez **TOUTES** ces variables :

```
TURSO_DB_URL = libsql://vendorshield-fadlaouisimoo.aws-eu-west-1.turso.io
TURSO_DB_AUTH_TOKEN = votre-token-turso
NODE_ENV = production
BASE_URL = https://votre-app.vercel.app
ADMIN_USERNAME = votre-admin-username
ADMIN_PASSWORD = votre-admin-password
SESSION_SECRET = votre-session-secret
GMAIL_USER = votre-email@gmail.com
GMAIL_APP_PASSWORD = votre-app-password
EMAIL_FROM = votre-email@gmail.com (optionnel)
EMAIL_FROM_NAME = VendorShield (optionnel)
```

**Note** : `BASE_URL` sera mis à jour automatiquement après le déploiement.

### Étape 7 : Déployer

1. Cliquez sur **"Deploy"**
2. Attendez 2-5 minutes pour le build
3. Votre application sera disponible sur : `https://votre-app.vercel.app`

---

## 🔧 Adaptation du Code pour Vercel

Vercel nécessite que l'application soit exportée comme une fonction serverless. Voici comment adapter votre code :

### Modification de `app.js`

À la fin de `app.js`, remplacez :

```javascript
// Start
await initDb();

// Test email configuration on startup (non-blocking)
testEmailConfig().catch(err => {
	console.warn('⚠️  Email configuration test failed (emails may not work):', err.message);
});

app.listen(port, () => {
	console.log(`VendorShield running at http://localhost:${port}`);
});
```

Par :

```javascript
// Initialize database and start server
let serverStarted = false;

async function startServer() {
	if (serverStarted) return;
	serverStarted = true;
	
	await initDb();

	// Test email configuration on startup (non-blocking)
	testEmailConfig().catch(err => {
		console.warn('⚠️  Email configuration test failed (emails may not work):', err.message);
	});

	// Only start server if not on Vercel (Vercel handles the server)
	if (process.env.VERCEL !== '1') {
		const port = process.env.PORT || 3000;
		app.listen(port, () => {
			console.log(`VendorShield running at http://localhost:${port}`);
		});
	}
}

// Start server (for local development)
startServer().catch(console.error);

// Export for Vercel
export default app;
```

### Créer `api/index.js` (Alternative - Plus propre)

Si vous préférez une approche plus propre, créez `api/index.js` :

```javascript
import app from '../app.js';

export default app;
```

Et dans `vercel.json`, changez la route :

```json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ]
}
```

---

## 📝 Fichier `vercel.json` Complet

Créez `vercel.json` à la racine :

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.js"
    }
  ]
}
```

---

## ✅ Vérification après Déploiement

1. **Vérifiez l'URL** : `https://votre-app.vercel.app`
2. **Testez les fonctionnalités** :
   - Page d'accueil
   - Connexion admin
   - Création de fournisseur
   - Soumission d'évaluation
3. **Vérifiez les logs** :
   - Dans Vercel Dashboard → "Deployments" → Cliquez sur votre déploiement → "Logs"
   - Vous devriez voir : `✅ Connected to Turso database`

---

## ⚠️ Points Importants

### 1. Stockage des Fichiers (Uploads)

**Problème** : Vercel est serverless, le système de fichiers est en lecture seule.

**Solutions** :
- **Option A** : Utiliser un service de stockage cloud (Cloudinary, AWS S3)
- **Option B** : Stocker les fichiers en base64 dans Turso (pour petits fichiers)
- **Option C** : Utiliser Vercel Blob Storage (payant)

**Pour l'instant** : Les uploads ne fonctionneront pas sur Vercel sans adaptation. Il faut migrer vers un stockage cloud.

### 2. Sessions

Les sessions en mémoire ne fonctionneront pas sur Vercel (chaque requête est une nouvelle fonction).

**Solution** : Utiliser un store de sessions externe (Redis, ou sessions basées sur cookies signés).

### 3. Limite de Temps

- Plan gratuit : **10 secondes** par requête
- Si une requête prend plus de 10 secondes, elle sera annulée
- Pour votre app, cela devrait être suffisant

---

## 🔄 Mise à Jour

Pour mettre à jour votre application :

1. Faites vos modifications
2. Commitez et poussez sur GitHub :
   ```bash
   git add .
   git commit -m "Update"
   git push
   ```
3. Vercel déploiera automatiquement

---

## 🆘 Dépannage

### Erreur "Cannot find module"

- Vérifiez que toutes les dépendances sont dans `package.json`
- Vérifiez les logs de build dans Vercel

### Erreur 401 Turso

- Vérifiez que `TURSO_DB_AUTH_TOKEN` est correct dans les variables d'environnement
- Générez un nouveau token si nécessaire

### Erreur de timeout

- Vérifiez que vos requêtes prennent moins de 10 secondes
- Optimisez les requêtes lentes

### Sessions ne fonctionnent pas

- Vercel nécessite un store de sessions externe
- Utilisez `connect-redis` ou sessions basées sur cookies signés uniquement

---

## 🎉 Félicitations !

Votre application VendorShield est maintenant déployée sur Vercel !

**URL** : `https://votre-app.vercel.app`

---

## 📚 Ressources

- Documentation Vercel : https://vercel.com/docs
- Vercel + Express : https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/node-js

