# 🤖 BOT TELEGRAM VTC ASSISTANT

Assistant IA intelligent pour gérer votre système VTC via Telegram avec Claude AI.

## 🚀 DÉPLOIEMENT SUR RAILWAY

### 1. Créer un nouveau projet Railway

1. Allez sur : https://railway.app
2. Connectez-vous (ou créez un compte)
3. Cliquez sur "New Project"
4. Sélectionnez "Deploy from GitHub repo"
5. Connectez votre compte GitHub
6. Créez un nouveau repo "vtc-telegram-bot"
7. Uploadez les 3 fichiers :
   - `bot.js`
   - `package.json`
   - `.env.example` (pour référence)

### 2. Configurer les variables d'environnement

Dans Railway, allez dans "Variables" et ajoutez :

```
TELEGRAM_BOT_TOKEN=8775964272:AAGf-L_BPEp4_R5L_euRX-dKbos9quyDCm4
BOT_PASSWORD=Lagrossebeuteuaghais
CLAUDE_API_KEY=sk-ant-api03-uHwjDrFnw-21NNP8IoovaP9W2fqvTFU2k1A8_9rR_7QHWDIHForgjZJRN-mbHxNi_agNDnIsV4p3p9Um8TU1Lg-WDLy5QAA
BACKEND_API_URL=https://pleasing-patience-production-de08.up.railway.app
GOOGLE_SHEET_ID=1yccj7XxWmqEsNWSyPtm-3Mv3qohIfoSdZcoYwlgpEfI
GOOGLE_SERVICE_ACCOUNT_EMAIL=vtc-backend-service@vtc-backend-491214.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=[Votre clé privée Google]
```

⚠️ **Important** : Pour `GOOGLE_PRIVATE_KEY`, copiez la MÊME clé que celle utilisée dans votre backend Railway actuel !

### 3. Configurer le Webhook

Une fois déployé, Railway vous donnera une URL (ex: `vtc-bot.railway.app`).

Ajoutez cette variable :
```
WEBHOOK_DOMAIN=vtc-bot.railway.app
```

### 4. Créer l'onglet "Historique Paiements" dans Google Sheets

1. Ouvrez votre Google Sheet
2. Créez un nouvel onglet nommé : **"Historique Paiements"**
3. Ajoutez ces en-têtes dans la première ligne (A1 à I1) :

```
Semaine | Chauffeur | Uber | Bolt | Total | Commission | Dette | À reverser | Nouvelle Dette
```

### 5. Démarrer le bot

Railway va automatiquement démarrer le bot dès que tout est configuré !

## 📱 UTILISATION

### Créer le groupe Telegram

1. Ouvrez Telegram
2. Créez un nouveau groupe
3. Ajoutez vos associés au groupe
4. Recherchez votre bot : `@votre_bot_username`
5. Ajoutez le bot au groupe
6. Dans le groupe, envoyez le mot de passe : `Lagrossebeuteuaghais`
7. Le bot est activé ! ✅

### Commandes disponibles

- `/start` - Démarrer le bot
- `/stats` - Statistiques générales
- `/chauffeurs` - Liste des chauffeurs rattachés
- `/help` - Aide

### Questions naturelles

Posez simplement vos questions en langage naturel :

- "Combien de chauffeurs rattachés ?"
- "Combien a fait Franck cette semaine ?"
- "Liste des candidatures en attente"
- "Qui a une dette ?"
- "Total à payer cette semaine"
- "Compare Franck et Khalil"
- "Chauffeurs de Paris"

Le bot comprend le contexte et répond intelligemment !

## 🔧 MAINTENANCE

### Vérifier les logs

Dans Railway, allez dans l'onglet "Logs" pour voir l'activité du bot.

### Redémarrer le bot

Si nécessaire, dans Railway, cliquez sur "Restart" pour redémarrer le bot.

## ⚠️ SÉCURITÉ

- Ne partagez JAMAIS le token Telegram
- Ne partagez JAMAIS la clé API Claude
- Changez le mot de passe si nécessaire
- Le bot ne fonctionne QUE dans les groupes autorisés

## 💰 COÛTS

- Railway : Gratuit (tier gratuit)
- Claude API : ~0.01€ par conversation (très faible)
- Telegram : Gratuit

**Total : Presque gratuit !**
