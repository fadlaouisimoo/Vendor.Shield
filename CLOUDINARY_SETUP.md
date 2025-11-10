# Configuration Cloudinary pour VendorShield

Ce guide vous explique comment configurer Cloudinary pour stocker les fichiers (preuves) de votre application VendorShield.

## Pourquoi Cloudinary ?

- ✅ **Stockage cloud fiable** : Vos fichiers sont stockés dans le cloud, pas dans la base de données
- ✅ **Performance** : Meilleure performance que le stockage base64
- ✅ **CDN intégré** : Cloudinary fournit un CDN pour une livraison rapide des fichiers
- ✅ **Optimisation automatique** : Compression et optimisation des images
- ✅ **Compatible Vercel** : Fonctionne parfaitement avec les fonctions serverless

## Étapes de configuration

### 1. Créer un compte Cloudinary

1. Allez sur [https://cloudinary.com](https://cloudinary.com)
2. Cliquez sur **"Sign Up for Free"**
3. Créez un compte (gratuit jusqu'à 25 GB de stockage)
4. Confirmez votre email

### 2. Obtenir les clés API

Une fois connecté à votre dashboard Cloudinary :

1. Allez dans **Dashboard** (ou cliquez sur votre nom en haut à droite)
2. Vous verrez vos **Account Details** :
   - **Cloud Name** (ex: `dxyz1234`)
   - **API Key** (ex: `123456789012345`)
   - **API Secret** (ex: `abcdefghijklmnopqrstuvwxyz123456`)

⚠️ **Important** : Gardez votre **API Secret** confidentiel !

### 3. Configurer les variables d'environnement

#### En local (fichier `.env`)

Ajoutez ces lignes à votre fichier `.env` :

```env
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

**Exemple :**
```env
CLOUDINARY_CLOUD_NAME=dxyz1234
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

#### Sur Vercel

1. Allez dans votre projet Vercel
2. Cliquez sur **Settings** → **Environment Variables**
3. Ajoutez les trois variables :
   - `CLOUDINARY_CLOUD_NAME` = votre cloud name
   - `CLOUDINARY_API_KEY` = votre API key
   - `CLOUDINARY_API_SECRET` = votre API secret
4. Sélectionnez les environnements (Production, Preview, Development)
5. Cliquez sur **Save**

### 4. Installer les dépendances

```bash
npm install
```

Cela installera le package `cloudinary` ajouté à `package.json`.

### 5. Tester la configuration

1. Démarrez votre application localement :
   ```bash
   npm start
   ```

2. Vérifiez les logs - vous devriez voir :
   ```
   ✅ Using Cloudinary for file storage
   ```

3. Testez l'upload d'un fichier :
   - Ajoutez un fournisseur
   - Remplissez le formulaire avec une preuve
   - Vérifiez que le fichier est bien uploadé sur Cloudinary

## Comment ça fonctionne ?

### Flux d'upload

1. **Utilisateur soumet le formulaire** avec un fichier
2. **Multer** reçoit le fichier en mémoire (buffer)
3. **Cloudinary** upload le fichier et retourne une URL
4. **L'URL Cloudinary** est stockée dans la base de données (Turso)
5. **L'admin** peut voir et télécharger le fichier via l'URL Cloudinary

### Structure des dossiers Cloudinary

Les fichiers sont organisés ainsi :
```
vendorshield/
  └── proofs/
      └── {supplier_id}/
          └── {filename}
```

Exemple : `vendorshield/proofs/123/document.pdf`

## Fallback (sans Cloudinary)

Si Cloudinary n'est pas configuré :

- **En local** : Les fichiers sont stockés dans le dossier `uploads/`
- **Sur Vercel** : Les fichiers sont stockés en base64 dans Turso (⚠️ non recommandé pour la production)

## Dépannage

### Erreur : "Cloudinary upload error"

1. Vérifiez que vos variables d'environnement sont correctement définies
2. Vérifiez que votre API Secret est correct
3. Vérifiez que votre compte Cloudinary est actif
4. Consultez les logs Cloudinary dans votre dashboard

### Les fichiers ne s'uploadent pas

1. Vérifiez la taille du fichier (limite : 10 MB)
2. Vérifiez votre quota Cloudinary (25 GB gratuit)
3. Vérifiez les logs de l'application

### Erreur 401 Unauthorized

- Votre API Secret est incorrect ou expiré
- Régénérez votre API Secret dans Cloudinary Dashboard

## Sécurité

- ⚠️ **Ne commitez JAMAIS** votre `.env` avec les clés API
- ⚠️ **Utilisez des variables d'environnement** sur Vercel
- ⚠️ **Limitez les accès** à votre compte Cloudinary
- ⚠️ **Activez l'authentification** sur votre compte Cloudinary si possible

## Ressources

- [Documentation Cloudinary](https://cloudinary.com/documentation)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Pricing Cloudinary](https://cloudinary.com/pricing) (plan gratuit généreux)

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs de l'application
2. Vérifiez les logs Cloudinary dans votre dashboard
3. Consultez la documentation Cloudinary
4. Contactez le support Cloudinary si nécessaire

