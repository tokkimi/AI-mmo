import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { ApiError } from '@/lib/server';

export const ICOURTIER_OFFER = 'immo-pro';
const MODEL = 'claude-opus-5-5';

// Tant que ICOURTIER_LAUNCHED n'est pas « true », i-Courtier reste « Bientôt disponible » :
// seuls les testeurs (administrateurs et courriels de ICOURTIER_FREE_EMAILS) y ont accès.
export const isLaunched = () => process.env.ICOURTIER_LAUNCHED === 'true';
export function isTester(user: any) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const free = (process.env.ICOURTIER_FREE_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return !!user.email && free.includes(String(user.email).toLowerCase());
}

// Accès à l'extension : administrateurs, comptes offerts, ou abonnement Stripe actif à l'offre immo-pro.
export async function hasExtensionAccess(user: any) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  // Accès gratuit pour l'équipe i-ateliers : courriels séparés par des virgules dans ICOURTIER_FREE_EMAILS.
  const free = (process.env.ICOURTIER_FREE_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (user.email && free.includes(String(user.email).toLowerCase())) return true;
  if (!user.stripe_customer || !process.env.STRIPE_SECRET_KEY) return false;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const subs = await stripe.subscriptions.list({ customer: user.stripe_customer, status: 'all', limit: 20 });
  return subs.data.some(s => ['active', 'trialing'].includes(s.status) && s.metadata?.offer === ICOURTIER_OFFER);
}

const RULES = `Tu es i-Courtier, l'assistant administratif d'un courtier immobilier résidentiel au Québec.
Règles absolues :
- Tu n'inventes aucun fait. Une information absente de la source reste vide ("") et apparaît dans la liste des éléments à vérifier.
- Tu distingues les faits fournis des hypothèses. Chiffres, superficies, dates, noms et numéros sont recopiés exactement.
- Les formulaires obligatoires de l'OACIQ restent la référence : tu prépares des ébauches et des données à reporter, jamais un document final à signer.
- Le courtier valide tout avant usage. Tu respectes la Loi 25 : aucune donnée personnelle inutile.
- Langue : français québécois professionnel, sauf demande contraire.
- Format : texte brut prêt à coller dans un courriel ou un formulaire. Aucun Markdown : pas d'astérisques, de dièses, de tableaux ni de lignes « --- ». Titres en majuscules et listes avec des tirets simples.`;

const str = { type: 'string' } as const;
const strList = { type: 'array', items: str } as const;
const obj = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

// Fiche organisée comme la saisie à la source (pages 1 à 9). Les clés existantes sont conservées.
export const FICHE_PAGES: { page: string; titre: string; champs: Record<string, string> }[] = [
  { page: 'dossier', titre: 'Dossier', champs: {
    adresse: 'Adresse complète', ville: 'Ville', categorie: 'Catégorie de propriété', type_mandat: 'Type de mandat',
    vendeurs: 'Vendeur(s)', matricule: "Matricule (rôle d'évaluation)", acte_vente: 'Dernier acte de vente (date, prix, n° d’inscription)',
    transmission: 'Déclaration de transmission / succession', servitudes: 'Servitudes connues' } },
  { page: '1', titre: 'Page 1 · Renseignements préliminaires', champs: {
    no_contrat: 'Numéro du contrat de courtage', genre_propriete: 'Genre de propriété', type_propriete: 'Type de bâtiment',
    prix_demande: 'Prix demandé', date_signature_contrat: 'Date de signature du contrat', date_expiration_contrat: "Date d'expiration du contrat",
    partage_retribution: 'Partage de la rétribution', declaration_courtier: 'Déclaration du courtier', vente_proprietaire: 'À vendre par le propriétaire' } },
  { page: '2', titre: 'Page 2 · Localisation et visites', champs: {
    secteur: 'Secteur', quartier: 'Quartier', code_postal: 'Code postal', rue_intersection: "Rue d'intersection", cadastre: 'Numéro de lot / cadastre',
    certificat_annee: 'Certificat de localisation (année)', delai_acte_vente: "Délai pour l'acte de vente", date_occupation: "Occupation (délai ou date)",
    rendez_vous: 'Prise de rendez-vous', preavis: 'Préavis de visite', boite_a_cles: 'Boîte à clés' } },
  { page: '3', titre: 'Page 3 · Propriétaires et hypothèque', champs: {
    simple_avis: 'Simple avis', hypotheque: 'Hypothèque (oui/non, créancier, montant, date)' } },
  { page: '4', titre: 'Page 4 · Terrain, bâtiment et garantie', champs: {
    annee_construction: 'Année de construction', dimensions_terrain: 'Dimensions du terrain (contrat)', superficie_terrain: 'Superficie du terrain (contrat)',
    superficie_terrain_certificat: 'Superficie du terrain (certificat)', dimensions_batiment: 'Dimensions du bâtiment (certificat)', superficie_habitable: 'Superficie habitable',
    zonage: 'Zonage', reprise_justice: 'Reprise de finance / contrôle de justice', garantie_legale: 'Garantie légale (avec / sans / limitée)',
    clause_garantie_fr: 'Clause de garantie (FR)', clause_garantie_en: 'Clause de garantie (EN)', no_declaration_vendeur: 'Numéro de la déclaration du vendeur' } },
  { page: '5', titre: 'Page 5 · Pièces', champs: {
    nb_pieces: 'Nombre de pièces', nb_chambres: 'Chambres (total)', nb_chambres_hors_sol: 'Chambres hors-sol', nb_chambres_sous_sol: 'Chambres au sous-sol',
    nb_salles_bain: 'Salles de bain', nb_salles_eau: "Salles d'eau" } },
  { page: '6', titre: 'Page 6 · Évaluation, taxes et dépenses', champs: {
    annee_evaluation: "Année de l'évaluation", evaluation_terrain: 'Évaluation du terrain', evaluation_batiment: 'Évaluation du bâtiment',
    evaluation_municipale: 'Évaluation totale', taxes_municipales: 'Taxes municipales (total annuel)', annee_taxes_municipales: 'Année des taxes municipales',
    taxes_scolaires: 'Taxes scolaires (total annuel)', annee_taxes_scolaires: 'Année des taxes scolaires', hydro_cout_annuel: 'Électricité : coût annuel estimé',
    frais_copropriete: 'Frais de copropriété' } },
  { page: '7', titre: 'Page 7 · Inclusions et exclusions', champs: {
    inclusions: 'Inclusions', exclusions: 'Exclusions' } },
  { page: '8', titre: 'Page 8 · Caractéristiques', champs: {
    chauffage: 'Chauffage / énergie', fondation: 'Fondation', toiture: 'Toiture', revetement: 'Revêtement extérieur', fenestration: 'Fenestration',
    sous_sol: 'Sous-sol', stationnement: 'Stationnement / garage', eau_egouts: 'Approvisionnement en eau / égouts', equipements: 'Équipements et services',
    caracteristiques_autres: 'Autres caractéristiques' } },
  { page: 'notes', titre: 'Notes', champs: { notes_courtier: 'Notes du courtier' } },
];
export const FICHE_FIELDS: Record<string, string> = Object.assign({}, ...FICHE_PAGES.map(p => p.champs));

const ownerSchema = obj({ nom: str, genre: { type: 'string', enum: ['personne physique', 'compagnie', 'succession', ''] }, adresse: str, courriel: str, langue: str });
const roomSchema = obj({ nom: str, niveau: { type: 'string', enum: ['Rez-de-chaussée', 'Étage', 'Sous-sol', 'Autre'] }, dimensions: str, revetement: str });

const ficheSchema = obj({
  fiche: obj(Object.fromEntries(Object.keys(FICHE_FIELDS).map(k => [k, str]))),
  proprietaires: { type: 'array', items: ownerSchema },
  pieces: { type: 'array', items: roomSchema },
  a_verifier: strList,
  resume: str,
});

export const TEXT_LIMITS: Record<string, number> = { description_fr: 650, description_en: 650, addenda_fr: 3000, addenda_en: 3000 };

const listingSchema = obj({
  description_fr: str,
  description_en: str,
  addenda_fr: str,
  addenda_en: str,
  inclusions_fr: str,
  inclusions_en: str,
  exclusions_fr: str,
  exclusions_en: str,
  questions_courtier: strList,
  points_forts: strList,
  checklist: { type: 'array', items: obj({ document: str, statut: { type: 'string', enum: ['reçu', 'à obtenir', 'à vérifier'] }, raison: str }) },
  courriel_vendeur: str,
  alertes: strList,
});

const verifySchema = obj({
  ecarts: { type: 'array', items: obj({ champ: str, attendu: str, trouve: str, gravite: { type: 'string', enum: ['à corriger', 'à vérifier'] } }) },
  conformes: { type: 'integer' },
  resume: str,
});

const controlSchema = obj({
  pret_a_publier: { type: 'boolean' },
  termine: strList,
  manquant: strList,
  a_valider: strList,
  resume: str,
});

const mapSchema = obj({
  remplissage: { type: 'array', items: obj({ champ: str, valeur: str }) },
  non_remplis: strList,
});

export const CONTRACTS: Record<string, string> = {
  'courtage-vente': 'Contrat de courtage exclusif – vente (données et clauses à reporter)',
  'promesse-achat': "Promesse d'achat (conditions, délais, inclusions, ajustements)",
  'contre-proposition': 'Contre-proposition',
  modification: 'Modifications / avis de réalisation des conditions',
  'declarations-vendeur': 'Déclarations du vendeur – points à couvrir avec le vendeur',
  'lettre-offre': "Lettre d'accompagnement d'une offre",
};

export const WRITINGS: Record<string, string> = {
  'courriel-vendeur': 'Courriel au vendeur',
  'courriel-acheteur': 'Courriel à l’acheteur',
  'courriel-notaire': 'Courriel au notaire (transmission du dossier)',
  'courriel-collaborateur': 'Courriel à un courtier collaborateur',
  'suivi-visite': 'Suivi après une visite',
  'retroaction-visite': 'Demande de rétroaction après visite (au courtier de l’acheteur)',
  'baisse-prix': 'Recommandation de baisse de prix au vendeur',
  facebook: 'Publication Facebook',
  instagram: 'Publication Instagram (avec mots-clics)',
  'portes-ouvertes': 'Annonce de visite libre',
  infolettre: 'Texte d’infolettre',
  sms: 'Texto court',
  'info-collaborateur': 'Info courtier collaborateur (FR et EN)',
  'mention-photo-ia': 'Mention FR/EN pour une photo aménagée par IA',
  'demande-marketing': 'Demande marketing après l’inscription',
};

export const DOC_KINDS: Record<string, string> = {
  inspection: 'Rapport d’inspection', declarations: 'Déclarations du vendeur', certificat: 'Certificat de localisation',
  'proces-verbaux': 'Procès-verbaux / états financiers de copropriété', acte: 'Acte notarié (vente, prêt, servitude)', contrat: 'Contrat de courtage et modifications',
  matrix: 'Ancienne fiche Matrix', plan: 'Plan coté (pièces et dimensions)', autre: 'Autre document',
};

// Actions que l'agent peut demander à l'extension : chaque action est exécutée dans le navigateur du courtier.
const AGENT_ACTIONS = ['maj_fiche', 'statut_document', 'ajouter_tache', 'statut_dossier', 'ouvrir_site', 'remplir_page', 'generer_contrat', 'cocher_etape', 'ajouter_proprietaire', 'ajouter_piece'];

const agentSchema = obj({
  reponse: str,
  actions: { type: 'array', items: obj({
    type: { type: 'string', enum: AGENT_ACTIONS },
    champ: str, valeur: str, document: str, statut: str, tache: str, echeance: str, url: str, contrat: str, details: str,
    etape: str, nom: str, genre: str, adresse: str, courriel: str, langue: str, niveau: str, dimensions: str, revetement: str,
  }) },
});

const analyseSchema = obj({
  resume: str,
  points_cles: strList,
  points_alerte: strList,
  questions: strList,
  champs: { type: 'array', items: obj({ champ: str, valeur: str }) },
});

type Task = 'extract' | 'listing' | 'contract' | 'map' | 'agent' | 'redaction' | 'analyse' | 'verifier' | 'controle';
const TASKS: Task[] = ['extract', 'listing', 'contract', 'map', 'agent', 'redaction', 'analyse', 'verifier', 'controle'];

// Règles du métier tirées du processus de saisie à la source.
const METIER = `Règles de la saisie à la source :
- Taxes : distinguer le total annuel du solde à payer et noter l'année; relever séparément les valeurs du terrain et du bâtiment.
- Certificat de localisation : relever l'année, le lot, les dimensions et la superficie; un certificat de plus de 10 ans appelle une vérification de renouvellement; signaler tout écart avec le contrat.
- Hydro-Québec : il s'agit d'une estimation annuelle, pas de factures réelles.
- Un ancien document ne prouve pas que la situation est inchangée; vérifier l'adresse, la date et la version de chaque pièce. Distinguer un formulaire préparé d'un formulaire signé.
- Déclaration du vendeur : ne jamais confondre « non », « ne sais pas » et un champ vide.
- Propriétaires : noms exacts tels qu'ils figurent à l'acte; personne physique, compagnie ou succession.
- Pièces : d'après le plan coté, sans l'entrée ni les couloirs, classées rez-de-chaussée, étage puis sous-sol, dimensions en pieds et pouces si le plan les donne ainsi.
- Ne jamais inventer de matériaux, de marques, de rénovations complètes ni d'accès extérieur fonctionnel.
- « Info courtier collaborateur » : toujours demander au courtier quoi y écrire.`;

function field(v: unknown, max: number, name: string) {
  if (typeof v !== 'string') return '';
  if (v.length > max) throw new ApiError(`${name} : contenu trop long.`, 413);
  return v.trim();
}

type Prompt = { text: string; format: Record<string, unknown> | null; effort: 'low' | 'medium' | 'high'; pdf?: string; image?: { data: string; type: 'image/png' | 'image/jpeg' } };

function profile(b: any) {
  const p = b.profil && typeof b.profil === 'object' ? b.profil : {};
  const lines = ['nom', 'agence', 'permis', 'telephone', 'courriel'].map(k => field(p[k], 200, 'Profil')).filter(Boolean);
  return lines.length ? `Courtier : ${lines.join(' · ')}` : 'Courtier : [À COMPLÉTER dans le profil]';
}

function prompt(task: Task, b: any): Prompt {
  const fiche = b.fiche ? JSON.stringify(b.fiche).slice(0, 20000) : '';
  if (task === 'agent') {
    const history = (Array.isArray(b.messages) ? b.messages : []).slice(-20)
      .map((m: any) => `${m.role === 'assistant' ? 'i-Courtier' : 'Courtier'} : ${field(m.content, 8000, 'Message')}`).join('\n\n');
    if (!history) throw new ApiError('Écrivez votre demande.');
    const page = field(b.page, 40000, 'Page');
    return { format: agentSchema, effort: 'medium', text: `Tu es l'agent i-Courtier dans le navigateur du courtier. Réponds à sa dernière demande et agis quand c'est utile.
Actions possibles (chaque action est exécutée par l'extension; laisse "" dans les propriétés inutilisées) :
- maj_fiche : champ (une clé parmi ${Object.keys(FICHE_FIELDS).join(', ')}) + valeur.
- statut_document : document (une clé parmi index, hypotheque, vente, transmission, municipal, scolaire, hydro) + statut ("reçu" ou "à obtenir").
- ajouter_tache : tache + echeance (AAAA-MM-JJ, ou "" si aucune).
- statut_dossier : statut parmi Prospection, Inscription en préparation, Inscription en vigueur, Promesse acceptée, Conditions remplies, Vendu, Annulé.
- ouvrir_site : url (https seulement) — par ex. https://www.registrefoncier.gouv.qc.ca, https://zone.centris.ca, https://pr.transactiondesk.com, https://www.hydroquebec.com.
- remplir_page : remplit le formulaire ouvert avec la fiche.
- generer_contrat : contrat (une clé parmi ${Object.keys(CONTRACTS).join(', ')}) + details.
- cocher_etape : etape (une clé du parcours fourni dans le dossier) + statut ("fait" ou "à faire").
- ajouter_proprietaire : nom (exact, comme à l'acte) + genre (personne physique, compagnie ou succession) + adresse + courriel + langue.
- ajouter_piece : nom + niveau (Rez-de-chaussée, Étage, Sous-sol ou Autre) + dimensions + revetement.
Le dossier indique l'étape en cours du parcours de saisie : guide le courtier vers la suite et dis ce qui bloque.
${METIER}
N'invente aucune donnée : demande ce qui manque. Calcule les dates d'échéance à partir des dates fournies (date du jour : ${new Date().toISOString().slice(0, 10)}).
Rédige "reponse" en texte clair, prêt à copier si c'est un courriel ou un texte. ${profile(b)}.

<dossier>${JSON.stringify(b.dossier || {}).slice(0, 20000)}</dossier>
<fiche>${fiche || '{}'}</fiche>
${page ? `<page_ouverte>${page}</page_ouverte>` : ''}
<conversation>
${history}
</conversation>` };
  }
  if (task === 'redaction') {
    const type = WRITINGS[b.type];
    if (!type) throw new ApiError('Type de texte inconnu.');
    const langue = b.langue === 'en' ? 'anglais' : 'français québécois';
    return { format: null, effort: 'medium', text: `Rédige : ${type}. Langue : ${langue}${['info-collaborateur', 'mention-photo-ia'].includes(b.type) ? ' (donne la version française puis la version anglaise)' : ''}. Ton : ${field(b.ton, 60, 'Ton') || 'professionnel et chaleureux'}.
Appuie-toi seulement sur les faits de la fiche et des consignes; mets [À COMPLÉTER] pour une information absente. Pas de mention discriminatoire ni de promesse non fondée.
Pour un courriel : un objet, puis le corps, puis la signature. Pour une publication : un texte prêt à publier. Pour un texto : 300 caractères maximum.
Consignes du courtier : ${field(b.consignes, 4000, 'Consignes') || 'aucune'}
${profile(b)}

<fiche>${fiche || '{}'}</fiche>` };
  }
  if (task === 'analyse') {
    const pdf = field(b.pdf, 4_000_000, 'PDF');
    if (!pdf) throw new ApiError('Importez le document à analyser.');
    const kind = DOC_KINDS[b.kind] || DOC_KINDS.autre;
    return { pdf, format: analyseSchema, effort: 'high', text: `Analyse ce document pour le courtier : ${kind}.
- resume : 4 à 6 phrases factuelles.
- points_cles : les faits importants (dates, montants, travaux, défauts, servitudes, empiétements, cotisations spéciales…).
- points_alerte : ce qui peut nuire à la transaction ou exiger une divulgation, une vérification ou un expert.
- questions : questions précises à poser au vendeur, au syndicat ou à un professionnel.
- champs : valeurs que ce document établit pour la fiche (clés parmi ${Object.keys(FICHE_FIELDS).join(', ')}).
Ne donne pas d'avis juridique : signale ce qui mérite l'avis d'un notaire ou d'un expert.

<fiche>${fiche || '{}'}</fiche>` };
  }
  if (task === 'extract') {
    const source = field(b.source, 60000, 'Source');
    const pdf = field(b.pdf, 4_000_000, 'PDF');
    const imageData = field(b.image, 4_000_000, 'Capture');
    const image = imageData ? { data: imageData, type: b.imageType === 'image/jpeg' ? 'image/jpeg' as const : 'image/png' as const } : undefined;
    if (!source && !pdf && !image) throw new ApiError('Ajoutez une source : page capturée, PDF, capture d’écran, courriel ou notes.');
    const doc = field(b.doc, 300, 'Document');
    return { pdf, image, format: ficheSchema, effort: 'medium' as const, text: `Saisie à la source. Extrais la fiche d'inscription à partir de la source ci-dessous${b.url ? ` (page : ${field(b.url, 2000, 'URL')})` : ''}.
${doc ? `Document fourni : ${doc}. Ne remplis que les champs que ce document établit; laisse les autres vides.` : ''}
Champs prévus : ${JSON.stringify(FICHE_FIELDS)}.
"proprietaires" : les propriétaires que la source établit (acte, contrat), sinon une liste vide. "pieces" : les pièces que la source établit (plan coté, fiche, déclaration), sinon une liste vide.
"a_verifier" liste les champs manquants, contradictoires ou à confirmer avec un document officiel, et les alertes du métier (certificat ancien, solde de taxes pris pour un total, etc.). "resume" : 2 phrases.
${METIER}

<source>
${source || 'Voir le document ou la capture joints.'}
</source>` };
  }
  if (task === 'listing') {
    if (!fiche) throw new ApiError("Complétez d'abord la fiche d'inscription.");
    return { format: listingSchema, effort: 'medium' as const, text: `Textes de l'inscription (page 7 de la saisie). À partir du dossier, prépare :
- description_fr et description_en : 650 caractères MAXIMUM chacune, espaces compris. Ton chaleureux et narratif; mets en valeur la lumière, l'espace et le quartier, seulement d'après les faits du dossier.
- addenda_fr et addenda_en : 3 000 caractères MAXIMUM chacun : détails des pièces, des caractéristiques et des améliorations établies.
- inclusions_fr, inclusions_en, exclusions_fr, exclusions_en : reprises du contrat, fidèles, traduites sans changer la portée.
- questions_courtier : ce que le courtier doit confirmer avant d'entrer les textes. Inclus toujours la question « Que voulez-vous écrire dans Info courtier collaborateur ? » et les lieux de proximité à vérifier.
- points_forts (5 maximum, tirés des faits);
- checklist des documents de l'inscription (contrat de courtage et modifications, déclaration du vendeur, certificat de localisation avec rapport et plan, comptes de taxes, rôle d'évaluation, Hydro, index, acte de vente, acte hypothécaire, plan cadastral, inspection, plans cotés, photos) avec statut;
- courriel_vendeur poli demandant les documents et renseignements manquants;
- alertes (incohérences, risques, éléments à valider).
${METIER}
Documents reçus : ${field(b.recus, 3000, 'Documents') || 'aucun indiqué'}.

<dossier>${JSON.stringify(b.dossier || {}).slice(0, 20000)}</dossier>
<fiche>${fiche}</fiche>` };
  }
  if (task === 'verifier') {
    const fields = Array.isArray(b.fields) ? b.fields.slice(0, 250) : [];
    if (!fields.length) throw new ApiError('Aucun champ de formulaire détecté sur cette page.');
    return { format: verifySchema, effort: 'low' as const, text: `Relecture d'une page de saisie après sauvegarde${b.page ? ` (${field(b.page, 100, 'Page')})` : ''}. Compare la valeur affichée de chaque champ ("v") avec le dossier.
Signale dans "ecarts" : une valeur différente, un texte tronqué, un champ vide alors que le dossier a la donnée, un montant mal formaté. "conformes" : le nombre de champs correspondant au dossier. "resume" : une phrase.

<champs>${JSON.stringify(fields).slice(0, 40000)}</champs>
<dossier>${JSON.stringify(b.dossier || {}).slice(0, 20000)}</dossier>
<fiche>${fiche || '{}'}</fiche>` };
  }
  if (task === 'controle') {
    return { format: controlSchema, effort: 'high' as const, text: `Contrôle final avant publication de l'inscription. Relis tout le dossier comme pour les pages 1 à 9 : noms, adresse, formulaires, prix, dates, délais, mesures, pièces, taxes, textes FR/EN (longueurs), photos, mentions IA et documents joints.
- termine : ce qui est complet et cohérent.
- manquant : ce qui manque, précisément.
- a_valider : ce que le courtier doit confirmer (contradictions, documents anciens ou non signés, réponses « ne sais pas »).
- pret_a_publier : vrai seulement s'il ne manque rien d'essentiel. Rappelle qu'une page sauvegardée ne signifie pas que la fiche est publiée.
${METIER}

<dossier>${JSON.stringify(b.dossier || {}).slice(0, 40000)}</dossier>
<fiche>${fiche || '{}'}</fiche>` };
  }
  if (task === 'contract') {
    const type = CONTRACTS[b.type];
    if (!type) throw new ApiError('Type de document inconnu.');
    return { format: null, effort: 'high' as const, text: `Ébauche : ${type}.
Rédige une ébauche structurée en sections avec titres, prête à être reportée dans le formulaire obligatoire de l'OACIQ correspondant ou à être révisée par le courtier :
1. Parties et identification de l'immeuble; 2. Prix, acompte et modalités; 3. Conditions et délais (dates calculées si une date de départ est fournie); 4. Inclusions / exclusions; 5. Clauses particulières proposées; 6. Éléments à vérifier avant signature.
Laisse [À COMPLÉTER] pour chaque donnée absente. Termine par un rappel que le formulaire officiel prévaut.
${profile(b)}
Paramètres du courtier : ${field(b.details, 6000, 'Paramètres') || 'aucun'}

<fiche>${fiche || '{}'}</fiche>` };
  }
  const fields = Array.isArray(b.fields) ? b.fields.slice(0, 250) : [];
  if (!fields.length) throw new ApiError('Aucun champ de formulaire détecté sur cette page.');
  if (!fiche) throw new ApiError("Complétez d'abord la fiche d'inscription.");
  const page = field(b.page, 100, 'Page');
  return { format: mapSchema, effort: 'low' as const, text: `Remplissage de formulaire${page ? ` : ${page} de la saisie à la source` : ''}. Associe les données du dossier aux champs du formulaire web. "champ" = la clé "k" exacte du champ. Pour un champ à choix, "valeur" doit être une des options proposées. Ne remplis que ce qui correspond clairement et ne remplace pas une valeur déjà saisie ("v") par une valeur douteuse; liste les autres libellés dans "non_remplis".
Les propriétaires, pièces et textes du dossier vont dans les champs correspondants (nom du propriétaire 1, pièce 1, description, addenda…). Respecte les longueurs maximales indiquées par les champs ("max").

<champs>${JSON.stringify(fields).slice(0, 40000)}</champs>
<dossier>${JSON.stringify(b.dossier || {}).slice(0, 20000)}</dossier>
<fiche>${fiche}</fiche>` };
}

// Erreurs du moteur IA traduites en messages clairs pour le courtier.
function engineError(e: unknown): never {
  if (e instanceof Anthropic.APIError) {
    if (e.status === 400 && /credit balance/i.test(e.message)) { console.error('i-Courtier : crédits Anthropic épuisés'); throw new ApiError('Le moteur IA d’i-Courtier est momentanément indisponible. L’équipe i-ateliers a été avisée; réessayez plus tard.', 503); }
    if (e.status === 429) throw new ApiError('Beaucoup de demandes en même temps : réessayez dans une minute.', 429);
    if (e.status === 401 || e.status === 403) { console.error('i-Courtier : clé Anthropic refusée'); throw new ApiError('Le moteur IA d’i-Courtier est momentanément indisponible. Contactez i-ateliers.', 503); }
    if ((e.status ?? 0) >= 500) throw new ApiError('Le moteur IA est surchargé. Réessayez dans quelques instants.', 503);
  }
  throw e;
}

async function callModel(p: Prompt) {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: RULES,
    output_config: { effort: p.effort, ...(p.format ? { format: { type: 'json_schema', schema: p.format } } : {}) },
    messages: [{ role: 'user', content: [
      ...(p.pdf ? [{ type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: p.pdf } }] : []),
      ...(p.image ? [{ type: 'image' as const, source: { type: 'base64' as const, media_type: p.image.type, data: p.image.data } }] : []),
      { type: 'text' as const, text: p.text },
    ] }],
  }).catch(engineError);
  if (response.stop_reason === 'refusal') throw new ApiError('Demande refusée par le moteur IA. Reformulez la source.', 422);
  if (response.stop_reason === 'max_tokens') throw new ApiError('Réponse trop longue. Réduisez la source.', 413);
  const text = response.content.flatMap(c => (c.type === 'text' ? [c.text] : [])).join('');
  return p.format ? JSON.parse(text) : { texte: text };
}

// Les champs de la saisie tronquent les textes trop longs : on les fait raccourcir avant de les rendre.
async function enforceLimits(r: Record<string, any>) {
  await Promise.all(Object.entries(TEXT_LIMITS).map(async ([key, max]) => {
    for (let i = 0; i < 2 && typeof r[key] === 'string' && r[key].length > max; i++) {
      const s = await callModel({ format: null, effort: 'low', text: `Raccourcis ce texte à ${Math.round(max * 0.92)} caractères au maximum, espaces compris, dans la même langue, sans perdre les faits essentiels ni en ajouter. Renvoie seulement le texte.\n\n${r[key]}` });
      r[key] = String(s.texte).trim();
    }
  }));
  return r;
}

export async function runTask(task: string, body: any) {
  if (!TASKS.includes(task as Task)) throw new ApiError('Action inconnue.', 404);
  if (!process.env.ANTHROPIC_API_KEY) throw new ApiError("Le moteur IA d'i-Courtier n'est pas encore activé. Contactez i-ateliers.", 503);
  const result = await callModel(prompt(task as Task, body));
  return task === 'listing' ? enforceLimits(result) : result;
}
