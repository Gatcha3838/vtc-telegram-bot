// Bot Telegram VTC Assistant avec Claude AI
const { Telegraf } = require('telegraf');
const Anthropic = require('@anthropic-ai/sdk');
const { google } = require('googleapis');
const axios = require('axios');
require('dotenv').config();

// Configuration
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const API_URL = process.env.BACKEND_API_URL || 'https://pleasing-patience-production-de08.up.railway.app';
const BOT_PASSWORD = process.env.BOT_PASSWORD;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';

// Groupes autorisés (après authentification)
const authorizedGroups = new Set();

// Initialiser Google Sheets API
let sheetsAPI = null;

async function initGoogleSheets() {
  try {
    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    sheetsAPI = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API initialisée');
  } catch (error) {
    console.error('❌ Erreur initialisation Google Sheets:', error);
  }
}

// Récupérer les candidatures depuis le backend
async function getCandidatures() {
  try {
    const response = await axios.get(`${API_URL}/api/candidatures`);
    return response.data;
  } catch (error) {
    console.error('Erreur récupération candidatures:', error);
    return [];
  }
}

// Récupérer les chauffeurs depuis Google Sheets
async function getDriversFromSheet() {
  if (!sheetsAPI) return [];
  
  try {
    const response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Feuille 1!A2:G1000'
    });
    
    const rows = response.data.values || [];
    return rows.map(row => ({
      nom: row[0] || '',
      email: row[1] || '',
      telephone: row[2] || '',
      ville: row[3] || '',
      rib: row[4] || '',
      dateRattachement: row[5] || '',
      statut: row[6] || ''
    }));
  } catch (error) {
    console.error('Erreur lecture Google Sheet:', error);
    return [];
  }
}

// Récupérer l'historique des paiements depuis Google Sheets
async function getPaymentHistory() {
  if (!sheetsAPI) return [];
  
  try {
    const response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Historique Paiements!A2:I1000'
    });
    
    const rows = response.data.values || [];
    return rows.map(row => ({
      semaine: row[0] || '',
      chauffeur: row[1] || '',
      uber: parseFloat(row[2]) || 0,
      bolt: parseFloat(row[3]) || 0,
      total: parseFloat(row[4]) || 0,
      commission: parseFloat(row[5]) || 0,
      dette: parseFloat(row[6]) || 0,
      aReverser: parseFloat(row[7]) || 0,
      nouvelleDette: parseFloat(row[8]) || 0
    }));
  } catch (error) {
    console.error('Erreur lecture historique paiements:', error);
    return [];
  }
}

// Fonction pour préparer le contexte pour Claude
async function prepareContext() {
  const candidatures = await getCandidatures();
  const chauffeurs = await getDriversFromSheet();
  const historique = await getPaymentHistory();
  
  const stats = {
    totalCandidatures: candidatures.length,
    nouveau: candidatures.filter(c => c.status === 'nouveau').length,
    enCours: candidatures.filter(c => c.status === 'en_cours').length,
    accepte: candidatures.filter(c => c.status === 'accepte').length,
    rejete: candidatures.filter(c => c.status === 'rejete').length,
    totalChauffeurs: chauffeurs.length
  };
  
  return {
    candidatures,
    chauffeurs,
    historique,
    stats
  };
}

// Fonction pour appeler Claude AI
async function askClaude(question, context) {
  const systemPrompt = `Tu es un assistant IA pour un système de gestion VTC (Véhicules de Tourisme avec Chauffeur). 

Tu as accès aux données suivantes :

**CANDIDATURES** (${context.stats.totalCandidatures} total):
- Nouveau: ${context.stats.nouveau}
- En cours: ${context.stats.enCours}
- Accepté: ${context.stats.accepte}
- Rejeté: ${context.stats.rejete}

**CHAUFFEURS RATTACHÉS** (${context.stats.totalChauffeurs} total):
${context.chauffeurs.map(c => `- ${c.nom} (${c.ville}) - Rattaché le ${c.dateRattachement}`).join('\n')}

**HISTORIQUE PAIEMENTS** (${context.historique.length} entrées):
${context.historique.slice(-20).map(h => `Semaine ${h.semaine}: ${h.chauffeur} - Uber: ${h.uber}€, Bolt: ${h.bolt}€, Total: ${h.total}€, À reverser: ${h.aReverser}€, Dette: ${h.dette}€`).join('\n')}

**RÈGLES MÉTIER**:
- Commission fixe: 50€ par semaine
- Système de dette: Si le chauffeur génère moins de 50€, la différence devient une dette qui s'accumule
- Paiement hebdomadaire tous les lundis
- 10 documents requis pour chaque candidature

Tu dois répondre de manière :
- Précise et factuelle
- Concise (sauf si l'utilisateur demande des détails)
- En français
- Avec des chiffres exacts quand disponibles
- En utilisant des emojis pour rendre les réponses plus lisibles

Si l'utilisateur demande des informations qui ne sont pas dans les données, dis-le clairement.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: question
      }]
    });
    
    return response.content[0].text;
  } catch (error) {
    console.error('Erreur Claude AI:', error);
    return "Désolé, je n'ai pas pu traiter votre demande. Erreur technique.";
  }
}

// Middleware d'authentification pour les groupes
bot.use(async (ctx, next) => {
  if (ctx.chat.type === 'private') {
    // Messages privés non autorisés
    return ctx.reply('⚠️ Ce bot fonctionne uniquement dans les groupes Telegram.');
  }
  
  // Vérifier si le groupe est autorisé
  if (!authorizedGroups.has(ctx.chat.id)) {
    // Le groupe n'est pas encore autorisé
    if (ctx.message && ctx.message.text === BOT_PASSWORD) {
      authorizedGroups.add(ctx.chat.id);
      return ctx.reply('✅ Groupe autorisé ! Vous pouvez maintenant me poser toutes vos questions sur votre système VTC.\n\n' +
        'Exemples de questions :\n' +
        '• "Combien de chauffeurs rattachés ?"\n' +
        '• "Combien a fait Franck cette semaine ?"\n' +
        '• "Liste des candidatures en attente"\n' +
        '• "Qui a une dette ?"\n' +
        '• "Statistiques générales"');
    }
    
    // Si ce n'est pas le mot de passe, ignorer
    return;
  }
  
  // Groupe autorisé, continuer
  return next();
});

// Commande /start
bot.start((ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('⚠️ Ce bot fonctionne uniquement dans les groupes Telegram.\n\n' +
      '1. Créez un groupe Telegram\n' +
      '2. Ajoutez vos associés au groupe\n' +
      '3. Ajoutez ce bot au groupe\n' +
      '4. Dans le groupe, envoyez le mot de passe pour activer le bot');
  }
  
  if (!authorizedGroups.has(ctx.chat.id)) {
    return ctx.reply('🔐 Pour activer ce bot dans ce groupe, envoyez le mot de passe.');
  }
  
  ctx.reply('👋 Assistant VTC activé !\n\n' +
    'Je peux répondre à toutes vos questions sur :\n' +
    '📊 Statistiques et données\n' +
    '👤 Informations sur les chauffeurs\n' +
    '💰 Paiements et finances\n' +
    '📝 Candidatures\n' +
    '🔍 Recherches et analyses\n\n' +
    'Posez-moi simplement votre question en langage naturel !');
});

// Commande /stats
bot.command('stats', async (ctx) => {
  const context = await prepareContext();
  
  const message = `📊 **STATISTIQUES GÉNÉRALES**\n\n` +
    `👥 **Chauffeurs rattachés**: ${context.stats.totalChauffeurs}\n\n` +
    `📝 **Candidatures**:\n` +
    `• Total: ${context.stats.totalCandidatures}\n` +
    `• Nouveau: ${context.stats.nouveau}\n` +
    `• En cours: ${context.stats.enCours}\n` +
    `• Accepté: ${context.stats.accepte}\n` +
    `• Rejeté: ${context.stats.rejete}\n\n` +
    `💾 **Historique**: ${context.historique.length} paiements enregistrés`;
  
  ctx.reply(message, { parse_mode: 'Markdown' });
});

// Commande /chauffeurs
bot.command('chauffeurs', async (ctx) => {
  const chauffeurs = await getDriversFromSheet();
  
  if (chauffeurs.length === 0) {
    return ctx.reply('Aucun chauffeur rattaché pour le moment.');
  }
  
  const message = `👥 **CHAUFFEURS RATTACHÉS** (${chauffeurs.length})\n\n` +
    chauffeurs.map((c, i) => `${i + 1}. ${c.nom} - ${c.ville}`).join('\n');
  
  ctx.reply(message, { parse_mode: 'Markdown' });
});

// Commande /help
bot.command('help', (ctx) => {
  const message = `🤖 **ASSISTANT VTC - AIDE**\n\n` +
    `**Commandes disponibles**:\n` +
    `/stats - Statistiques générales\n` +
    `/chauffeurs - Liste des chauffeurs\n` +
    `/help - Cette aide\n\n` +
    `**Questions naturelles** (exemples):\n` +
    `• "Combien a fait Franck cette semaine ?"\n` +
    `• "Liste des candidatures en attente"\n` +
    `• "Qui a une dette ?"\n` +
    `• "Total à payer cette semaine"\n` +
    `• "Compare Franck et Khalil"\n` +
    `• "Chauffeurs de Paris"\n\n` +
    `Posez simplement votre question !`;
  
  ctx.reply(message, { parse_mode: 'Markdown' });
});

// Gestion des messages texte (questions)
bot.on('text', async (ctx) => {
  // Ignorer si c'est le mot de passe (déjà géré par le middleware)
  if (ctx.message.text === BOT_PASSWORD) {
    return;
  }
  
  // Ignorer les commandes (déjà gérées)
  if (ctx.message.text.startsWith('/')) {
    return;
  }
  
  // Indiquer que le bot est en train de répondre
  await ctx.sendChatAction('typing');
  
  try {
    const context = await prepareContext();
    const response = await askClaude(ctx.message.text, context);
    
    await ctx.reply(response, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Erreur traitement question:', error);
    ctx.reply('❌ Désolé, une erreur s\'est produite. Réessayez plus tard.');
  }
});

// Gestion des erreurs
bot.catch((err, ctx) => {
  console.error('Erreur bot:', err);
  ctx.reply('❌ Une erreur s\'est produite.');
});

// Démarrage du bot
async function startBot() {
  await initGoogleSheets();
  
  bot.launch({
    webhook: {
      domain: process.env.WEBHOOK_DOMAIN,
      port: process.env.PORT || 3000
    }
  });
  
  console.log('🤖 Bot VTC Assistant démarré !');
  console.log(`📝 ${authorizedGroups.size} groupe(s) autorisé(s)`);
}

startBot();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
