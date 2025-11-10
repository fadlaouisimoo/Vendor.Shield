# Fix des Sessions sur Vercel

## 🔍 Problème Identifié

Sur Vercel (serverless), les sessions en mémoire ne persistent pas entre les requêtes car :
- Chaque requête peut être traitée par une instance différente
- Les sessions en mémoire ne sont pas partagées entre les instances
- Le cookie de session est perdu ou non reconnu

## ✅ Corrections Appliquées

### 1. Configuration des Cookies Améliorée

```javascript
cookie: {
    secure: isProduction, // HTTPS only
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isVercel ? 'none' : 'lax', // Important pour Vercel
}
```

### 2. Sauvegarde Explicite de la Session

Ajout de `req.session.save()` après le login pour forcer la sauvegarde.

## 🧪 Test de la Solution

1. **Déployez les modifications** :
   ```bash
   git add .
   git commit -m "Fix sessions for Vercel"
   git push
   ```

2. **Testez** :
   - Connectez-vous en tant qu'admin
   - Rechargez la page
   - Naviguez entre les pages
   - La session devrait persister

## ⚠️ Si le Problème Persiste

Si après ces corrections, les sessions ne persistent toujours pas, il faudra utiliser un **store de sessions externe**.

### Solution Alternative : Store de Sessions Externe

#### Option 1 : Upstash Redis (Gratuit)

1. **Créer un compte Upstash** : https://upstash.com
2. **Créer une base Redis** (gratuite)
3. **Installer** :
   ```bash
   npm install connect-redis redis
   ```
4. **Modifier `app.js`** :

```javascript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

// Redis client
const redisClient = createClient({
    url: process.env.REDIS_URL
});
redisClient.connect().catch(console.error);

// Session avec Redis store
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: isVercel ? 'none' : 'lax'
    }
}));
```

5. **Ajouter la variable d'environnement** :
   ```
   REDIS_URL = votre-url-redis-upstash
   ```

#### Option 2 : Sessions basées sur Cookies Signés (Plus Simple)

Si Redis est trop complexe, on peut utiliser des cookies signés au lieu de sessions :

```javascript
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret';

// Middleware d'authentification basé sur cookies
const requireAuth = (req, res, next) => {
    const authCookie = req.cookies?.auth;
    if (authCookie) {
        const [username, hash] = authCookie.split(':');
        const expectedHash = crypto
            .createHmac('sha256', SESSION_SECRET)
            .update(username + ADMIN_USERNAME)
            .digest('hex');
        if (hash === expectedHash && username === ADMIN_USERNAME) {
            req.isAuthenticated = true;
            return next();
        }
    }
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
};

// Après login
res.cookie('auth', `${username}:${hash}`, {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isVercel ? 'none' : 'lax'
});
```

## 📊 Vérification

Pour vérifier si les sessions fonctionnent :

1. **Ouvrez les DevTools** (F12)
2. **Onglet Application → Cookies**
3. **Vérifiez** :
   - Le cookie `vendorshield.sid` est présent
   - Il a `Secure` et `HttpOnly` activés
   - `SameSite` est `None` (sur Vercel)

## 🎯 Recommandation

**Pour l'instant** : Testez avec les corrections appliquées. Si ça ne fonctionne pas, utilisez **Upstash Redis** (gratuit et simple).

