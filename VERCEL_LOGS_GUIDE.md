# Comment Accéder aux Logs Vercel

## 📍 Accès aux Logs

### Méthode 1 : Via le Dashboard (Recommandé)

1. **Allez sur** https://vercel.com
2. **Connectez-vous** à votre compte
3. **Sélectionnez votre projet** `vendorshield`
4. **Cliquez sur l'onglet "Deployments"** (en haut)
5. **Cliquez sur le dernier déploiement** (le plus récent)
6. **Cliquez sur "Logs"** (onglet en haut de la page du déploiement)

Vous verrez tous les logs en temps réel !

### Méthode 2 : Via la CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Voir les logs
vercel logs votre-app.vercel.app
```

---

## 🔍 Ce que vous devriez voir dans les logs

Lors d'une tentative de connexion, vous devriez voir :
- Les requêtes HTTP (GET, POST)
- Les erreurs éventuelles
- Les messages `console.log` que nous avons ajoutés

---

## ✅ Solution Implémentée : Cookies Signés

J'ai modifié le code pour utiliser **des cookies signés** au lieu de sessions en mémoire. C'est plus fiable sur Vercel car :

- ✅ Les cookies sont stockés côté client (navigateur)
- ✅ Pas besoin de partager l'état entre les instances serverless
- ✅ Fonctionne même si chaque requête est traitée par une instance différente

### Comment ça fonctionne maintenant :

1. **Lors du login** : Un cookie signé `auth_token` est créé et envoyé au navigateur
2. **Lors des requêtes** : Le middleware vérifie le cookie signé
3. **Sécurité** : Le cookie est signé avec `SESSION_SECRET`, donc impossible à falsifier

---

## 🚀 Déployez et Testez

1. **Commitez et poussez** :
   ```bash
   git add .
   git commit -m "Use signed cookies for auth (Vercel compatible)"
   git push
   ```

2. **Attendez le déploiement** (2-5 minutes)

3. **Testez** :
   - Connectez-vous avec vos credentials
   - Rechargez la page
   - Naviguez entre les pages
   - La session devrait persister maintenant !

---

## 🔧 Si ça ne fonctionne toujours pas

Vérifiez dans les DevTools (F12) → Application → Cookies :
- Le cookie `auth_token` est présent
- Il a `Secure` et `HttpOnly` activés
- `SameSite` est `None` (sur Vercel)

Si le cookie n'apparaît pas, il y a peut-être un problème avec la configuration des cookies.

