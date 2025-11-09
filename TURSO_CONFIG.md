# Configuration Turso pour VendorShield

## ✅ Configuration terminée

Votre application a été configurée pour utiliser Turso. Voici les informations de votre base de données :

- **Nom de la base** : vendorshield
- **URL** : libsql://vendorshield-fadlaouisimoo.aws-eu-west-1.turso.io

## 📝 Configuration du fichier .env

Ajoutez ces lignes à votre fichier `.env` :

```env
# Turso Database Configuration
TURSO_DB_URL=libsql://vendorshield-fadlaouisimoo.aws-eu-west-1.turso.io
TURSO_DB_AUTH_TOKEN=eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18yYzA4R3ZNeEhYMlNCc3l0d2padm95cEdJeDUiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NjMzMzQ3MjYsImlhdCI6MTc2MjcyOTkyNiwiaXNzIjoiaHR0cHM6Ly9jbGVyay50dXJzby50ZWNoIiwianRpIjoiMmZhNTNmZTVjNmU2OTZjNGUzOTkiLCJuYmYiOjE3NjI3Mjk5MjEsInN1YiI6InVzZXJfMzVHQ01LdklIMGlPVm9xUjZwMVVKaHZLa2lSIn0.BosLUYK1S4jubcVqOIWumM7WNYCacp8xk3iS0VuqxdwgnOQTvRzX0c-2Q_nejYgtnoA0P37ao-6YjIzGvKiKRAsdphU4_11lGrxpaoMgmsyosn81vqToK59dAl-EIqX-V_nMhtFmdbUlkk0_L4AiQuayQJVWkjN0IbgT-dy2fJfAI44F_WFeqXWNUsgtuFoKAEajiE92DavNgIyNykul9Hts0kR9FFdzrsyboG6U8x4vLSSE_mjGxgHuX8CpCyGonfcYrzEhjbVhwENxMmgdIA-f_sqmSz4EU83Yc_WGaxgjcNwndGCcWio6wkuFtgfjRsrln75rtG_m0ObCxQybOg
```

## 🚀 Démarrage

1. **Assurez-vous que le fichier `.env` contient les variables Turso**

2. **Lancez l'application** :
   ```bash
   npm start
   ```

3. **Vérifiez la connexion** :
   - Si vous voyez `✅ Connected to Turso database` → Tout fonctionne !
   - Si vous voyez `⚠️ Turso not configured, falling back to local SQLite` → Vérifiez votre fichier `.env`

## 🔄 Fallback automatique

Si les variables Turso ne sont pas configurées, l'application utilisera automatiquement SQLite3 local pour le développement. Cela permet de développer sans connexion Turso.

## 📊 Migration des données

Si vous avez déjà des données dans votre base SQLite locale et que vous voulez les migrer vers Turso :

1. **Exporter les données** :
   ```bash
   sqlite3 vendorshield.db .dump > dump.sql
   ```

2. **Importer dans Turso** :
   - Utilisez l'outil Turso CLI
   - Ou utilisez le dashboard Turso pour exécuter les requêtes SQL

## ✅ Vérification

Une fois l'application démarrée, vérifiez que :
- Les tables sont créées automatiquement
- Vous pouvez créer des fournisseurs
- Les évaluations fonctionnent correctement

## 🔒 Sécurité

⚠️ **Important** : Ne commitez jamais votre fichier `.env` avec le token Turso dans Git. Le token est sensible et doit rester secret.

## 📚 Documentation

Pour plus d'informations sur Turso :
- Documentation : https://docs.turso.tech
- Dashboard : https://turso.tech

