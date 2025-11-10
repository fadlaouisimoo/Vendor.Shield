# Guide de déploiement avec Cloudinary

## ✅ Étape 1 : Configuration locale (TERMINÉE)

Votre fichier `.env` est correctement configuré avec Cloudinary.

## 📋 Étape 2 : Tester localement

1. **Démarrez l'application** :
   ```bash
   npm start
   ```

2. **Vérifiez les logs** - Vous devriez voir :
   ```
   ✅ Using Cloudinary for file storage
   ✅ Database initialized
   VendorShield running at http://localhost:3000
   ```

3. **Testez l'upload** :
   - Allez sur http://localhost:3000
   - Connectez-vous en tant qu'admin
   - Ajoutez un fournisseur
   - Remplissez le formulaire avec un fichier (preuve)
   - Vérifiez que le fichier est bien uploadé sur Cloudinary

## 🚀 Étape 3 : Configurer Vercel

### 3.1 Ajouter les variables d'environnement sur Vercel

1. Allez sur [https://vercel.com](https://vercel.com)
2. Ouvrez votre projet VendorShield
3. Cliquez sur **Settings** → **Environment Variables**
4. Ajoutez les variables suivantes (une par une) :

   **Variable 1 :**
   - Name: `CLOUDINARY_CLOUD_NAME`
   - Value: (votre cloud name depuis .env)
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Cliquez sur **Save**

   **Variable 2 :**
   - Name: `CLOUDINARY_API_KEY`
   - Value: (votre API key depuis .env)
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Cliquez sur **Save**

   **Variable 3 :**
   - Name: `CLOUDINARY_API_SECRET`
   - Value: (votre API secret depuis .env)
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Cliquez sur **Save**

### 3.2 Vérifier les autres variables

Assurez-vous que ces variables sont également configurées sur Vercel :
- `TURSO_DB_URL`
- `TURSO_DB_AUTH_TOKEN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `BASE_URL` (votre URL Vercel, ex: `https://votre-app.vercel.app`)

## 🔄 Étape 4 : Déployer sur Vercel

### Option A : Déploiement automatique (si connecté à Git)

1. **Commitez vos changements** :
   ```bash
   git add .
   git commit -m "Add Cloudinary integration for file storage"
   git push
   ```

2. Vercel déploiera automatiquement

### Option B : Déploiement manuel

1. **Installez Vercel CLI** (si pas déjà fait) :
   ```bash
   npm install -g vercel
   ```

2. **Déployez** :
   ```bash
   vercel --prod
   ```

## ✅ Étape 5 : Vérifier le déploiement

1. **Allez sur votre site Vercel**
2. **Vérifiez les logs** :
   - Allez dans Vercel Dashboard → Votre projet → **Logs**
   - Vous devriez voir : `✅ Using Cloudinary for file storage`

3. **Testez l'application** :
   - Connectez-vous en tant qu'admin
   - Ajoutez un fournisseur
   - Testez l'upload d'un fichier
   - Vérifiez que le fichier apparaît sur Cloudinary

## 🔍 Vérification sur Cloudinary

1. Allez sur [https://console.cloudinary.com](https://console.cloudinary.com)
2. Cliquez sur **Media Library**
3. Vous devriez voir un dossier `vendorshield/proofs/`
4. Les fichiers uploadés devraient apparaître dedans

## ❌ Dépannage

### Erreur : "Cloudinary upload error"

- Vérifiez que les variables d'environnement sont correctes sur Vercel
- Vérifiez que votre API Secret est correct
- Consultez les logs Vercel pour plus de détails

### Les fichiers ne s'uploadent pas

- Vérifiez la taille du fichier (limite : 10 MB)
- Vérifiez votre quota Cloudinary (25 GB gratuit)
- Vérifiez les logs de l'application

### L'application crash toujours

- Vérifiez que toutes les variables d'environnement sont définies sur Vercel
- Vérifiez les logs Vercel pour voir l'erreur exacte
- Assurez-vous que `cloudinary` est bien installé (`npm install`)

## 📝 Résumé

✅ Configuration locale terminée
⏭️ Prochaine étape : Configurer les variables sur Vercel
⏭️ Puis : Déployer et tester

