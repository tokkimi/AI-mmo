# AI IMMO Académie

Plateforme Next.js en français canadien, déployée sur Vercel. Base PostgreSQL Neon dédiée.

## Fonctionnalités
12 parcours, 36 leçons textuelles, 36 prompts personnalisables, 72 questions corrigées côté serveur, tentatives historisées, travaux et correction humaine, notes, favoris, profil, messagerie privée, séances de coaching et réservations, administration des accès et réinitialisation des mots de passe.

La page publique présente le programme. Les contenus pédagogiques et prompts nécessitent un compte connecté avec accès actif. Un accès invité ou un abonnement actif ouvre le reste. Les administrateurs ont les droits complets ; les comptes de test sont créés par le script de provisioning et leurs mots de passe ne sont jamais versionnés.

## Développement
Node 24, npm install, variables de .env.example dans .env.local, node scripts/migrate.mjs, npm run dev. npm run build vérifie la compilation. Les migrations SQL sont idempotentes et destinées à cette base dédiée.

## Déploiement
vercel --prod. Le dépôt GitHub est relié au projet Vercel ai-mmo. Base dans iad1 (États-Unis), donc hors Québec : divulgation dans la politique et examen juridique nécessaire avant activité commerciale.

## Paiement
Préparer STRIPE_SECRET_KEY, STRIPE_PRICE_ID (120000 cents CAD, mensuel), STRIPE_WEBHOOK_SECRET. Configurer Stripe Tax et le portail client. Webhook POST /api/billing/webhook : checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted. Signature vérifiée ; droits recalculés depuis l’état Stripe actuel. Aucun prélèvement n’est activé sans configuration. Les accès invités fonctionnent immédiatement.

## Visioconférence
L’administrateur crée une réunion chez Zoom, Meet, Teams ou Jitsi puis publie le lien dans son calendrier. Le site gère les places et réservations. Il n’invente pas de réunions ni de vidéos préenregistrées.

## ChatGPT
Prompts copiables, téléchargement, variables et guides de configuration. ChatGPT s’ouvre dans le compte du membre ; aucun prompt n’est envoyé automatiquement. Les Actions GPT sont enseignées, pas provisionnées automatiquement dans les comptes des membres.

## Sécurité
Mots de passe bcrypt, sessions aléatoires hachées en base, cookie HTTP-only/SameSite, vérification d’origine sur mutations, limites de débit persistantes, contrôles de rôle et propriété côté serveur. Les réponses QCM ne figurent pas dans le catalogue client ; correction serveur. Les liens de réinitialisation sont à usage unique et expirent après une heure. L’admin doit vérifier l’identité avant transmission. Les courriels de récupération et vérification d’adresse ne sont pas intégrés dans cette version.

## Contenus et lancement
Les références sont liées dans chaque leçon. Formation indépendante, aucune affiliation ou reconnaissance OACIQ/Coursera/OpenAI revendiquée. Compléter identité juridique, contact de confidentialité, conditions commerciales, validation juridique des textes, politique de conservation détaillée et procédure d’exercice des droits avant ouverture commerciale. Les contenus ne remplacent pas un avis professionnel adapté.

## Validation
node scripts/smoke.mjs exécute le parcours API avec les comptes de test locaux et nettoie ses données de test. Le fichier d’identifiants doit rester hors dépôt. Ne pas utiliser de vrais dossiers clients.

## Programme V2 — état éditorial
16 parcours et 48 modules, 240 questions (5 par module), un dossier pratique par module et 21 outils avec versions conditionnées par QCM + approbation du formateur. Identifiants v2-01 à v2-48 ; les anciens résultats restent en base.
Les cours sont actuellement synthétiques. La décomposition complète en 150+ unités et les questionnaires spécialisés approfondis restent à enrichir. Les méthodes personnelles d’Émilie et dates de visio ne sont pas inventées. Le paiement reste désactivé : la configuration Stripe du projet source ne fournit pas de clé utilisable (authentification refusée). Ne pas annoncer la formation intégralement finalisée pour une ouverture commerciale.
