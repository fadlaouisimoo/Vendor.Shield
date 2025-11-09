# Configuration Email - VendorShield

## 📧 Configuration des Notifications Email

Le système envoie automatiquement des emails aux fournisseurs lorsque leur évaluation est validée, rejetée, ou lorsque des clarifications sont demandées.

## 🔧 Configuration

### Option 1 : SMTP Personnalisé (Recommandé pour production)

Créez un fichier `.env` à la racine du projet avec :

```env
# Configuration SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@vendorshield.com
EMAIL_FROM_NAME=VendorShield - Équipe Sécurité
BASE_URL=http://localhost:3000
```

**Exemples de services SMTP :**
- **SendGrid** : `smtp.sendgrid.net` (port 587)
- **Mailgun** : `smtp.mailgun.org` (port 587)
- **Outlook/Office365** : `smtp.office365.com` (port 587)
- **Ovh** : `ssl0.ovh.net` (port 465, SMTP_SECURE=true)

### Option 2 : Gmail (Pour développement/test)

1. Activez la validation en 2 étapes sur votre compte Gmail
2. Générez un "App Password" :
   - Allez sur https://myaccount.google.com/apppasswords
   - Créez un mot de passe d'application
3. Configurez dans `.env` :

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_FROM=noreply@vendorshield.com
EMAIL_FROM_NAME=VendorShield - Équipe Sécurité
BASE_URL=http://localhost:3000
```

## 📝 Variables d'Environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `SMTP_HOST` | Serveur SMTP | Si SMTP personnalisé |
| `SMTP_PORT` | Port SMTP (587 ou 465) | Si SMTP personnalisé |
| `SMTP_SECURE` | true pour SSL (port 465), false pour TLS (port 587) | Si SMTP personnalisé |
| `SMTP_USER` | Nom d'utilisateur SMTP | Si SMTP personnalisé |
| `SMTP_PASS` | Mot de passe SMTP | Si SMTP personnalisé |
| `GMAIL_USER` | Email Gmail | Si Gmail |
| `GMAIL_APP_PASSWORD` | App Password Gmail | Si Gmail |
| `EMAIL_FROM` | Email expéditeur | Optionnel |
| `EMAIL_FROM_NAME` | Nom expéditeur | Optionnel |
| `BASE_URL` | URL de base pour les liens dans les emails | Requis |

## 🧪 Test de Configuration

Au démarrage de l'application, le système teste automatiquement la configuration email. Vous verrez dans la console :

- ✅ `Email server is ready` → Configuration OK
- ❌ `Email server configuration error` → Vérifiez vos paramètres

## 📨 Contenu des Emails

Les emails envoyés contiennent :
- **Statut de validation** (Approuvé/Rejeté/Clarifications demandées)
- **Commentaires** de l'équipe sécurité
- **Lien direct** vers la page de statut
- **Informations** sur qui a validé et quand

## 🔒 Sécurité

⚠️ **Important** :
- Ne commitez **JAMAIS** le fichier `.env` dans Git
- Utilisez des mots de passe forts
- En production, utilisez un service SMTP professionnel (SendGrid, Mailgun, etc.)

## 🚀 Installation

1. Installez les dépendances :
```bash
npm install
```

2. Créez le fichier `.env` avec vos paramètres

3. Démarrez l'application :
```bash
npm start
```

## 📚 Documentation Nodemailer

Pour plus d'options de configuration, consultez : https://nodemailer.com/about/

