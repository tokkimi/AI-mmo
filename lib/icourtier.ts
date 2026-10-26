import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { ApiError } from '@/lib/server';

export const ICOURTIER_OFFER = 'immo-pro';
const MODEL = 'claude-opus-5-5';

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

export const FICHE_FIELDS: Record<string, string> = {
  adresse: 'Adresse complète', ville: 'Ville', code_postal: 'Code postal', type_propriete: 'Type de propriété', prix_demande: 'Prix demandé',
  annee_construction: 'Année de construction', superficie_habitable: 'Superficie habitable', superficie_terrain: 'Superficie du terrain',
  nb_chambres: 'Chambres', nb_salles_bain: 'Salles de bain', nb_pieces: 'Pièces', stationnement: 'Stationnement', chauffage: 'Chauffage',
  fondation: 'Fondation', toiture: 'Toiture', evaluation_municipale: 'Évaluation municipale', taxes_municipales: 'Taxes municipales',
  taxes_scolaires: 'Taxes scolaires', frais_copropriete: 'Frais de copropriété', cadastre: 'Numéro de lot / cadastre', zonage: 'Zonage',
  inclusions: 'Inclusions', exclusions: 'Exclusions', servitudes: 'Servitudes connues', date_occupation: "Date d'occupation",
  vendeurs: 'Vendeur(s)', matricule: "Matricule (rôle d'évaluation)", acte_vente: 'Dernier acte de vente (date, prix, n° d’inscription)',
  hypotheque: 'Hypothèque inscrite (créancier, montant, date)', transmission: 'Déclaration de transmission / succession',
  hydro_cout_annuel: 'Coût annuel estimé Hydro-Québec', notes_courtier: 'Notes du courtier',
};

const ficheSchema = obj({
  fiche: obj(Object.fromEntries(Object.keys(FICHE_FIELDS).map(k => [k, str]))),
  a_verifier: strList,
  resume: str,
});

const listingSchema = obj({
  description_fr: str,
  description_en: str,
  points_forts: strList,
  checklist: { type: 'array', items: obj({ document: str, statut: { type: 'string', enum: ['reçu', 'à obtenir', 'à vérifier'] }, raison: str }) },
  courriel_vendeur: str,
  alertes: strList,
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
};

export const DOC_KINDS: Record<string, string> = {
  inspection: 'Rapport d’inspection', declarations: 'Déclarations du vendeur', certificat: 'Certificat de localisation',
  'proces-verbaux': 'Procès-verbaux / états financiers de copropriété', acte: 'Acte notarié (vente, prêt, servitude)', autre: 'Autre document',
};

// Actions que l'agent peut demander à l'extension : chaque action est exécutée dans le navigateur du courtier.
const AGENT_ACTIONS = ['maj_fiche', 'statut_document', 'ajouter_tache', 'statut_dossier', 'ouvrir_site', 'remplir_page', 'generer_contrat'];

const agentSchema = obj({
  reponse: str,
  actions: { type: 'array', items: obj({
    type: { type: 'string', enum: AGENT_ACTIONS },
    champ: str, valeur: str, document: str, statut: str, tache: str, echeance: str, url: str, contrat: str, details: str,
  }) },
});

const analyseSchema = obj({
  resume: str,
  points_cles: strList,
  points_alerte: strList,
  questions: strList,
  champs: { type: 'array', items: obj({ champ: str, valeur: str }) },
});

type Task = 'extract' | 'listing' | 'contract' | 'map' | 'agent' | 'redaction' | 'analyse';

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
    return { format: null, effort: 'medium', text: `Rédige : ${type}. Langue : ${langue}. Ton : ${field(b.ton, 60, 'Ton') || 'professionnel et chaleureux'}.
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
"a_verifier" liste les champs manquants, contradictoires ou à confirmer avec un document officiel. "resume" : 2 phrases.

<source>
${source || 'Voir le document ou la capture joints.'}
</source>` };
  }
  if (task === 'listing') {
    if (!fiche) throw new ApiError("Complétez d'abord la fiche d'inscription.");
    return { format: listingSchema, effort: 'medium' as const, text: `Administration de l'inscription. À partir de la fiche, prépare :
- description_fr (180 à 250 mots, factuelle, sans superlatif non fondé ni mention discriminatoire) et description_en (traduction fidèle);
- points_forts (5 maximum, tirés des faits);
- checklist des documents d'une inscription résidentielle au Québec (déclarations du vendeur, certificat de localisation, comptes de taxes, acte de vente, procès-verbaux et états financiers si copropriété, etc.) avec statut selon la fiche et les documents déjà reçus;
- courriel_vendeur poli demandant les documents et renseignements manquants;
- alertes (incohérences, risques, éléments à valider).
Documents déjà reçus : ${field(b.recus, 2000, 'Documents') || 'aucun indiqué'}.

<fiche>${fiche}</fiche>` };
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
  return { format: mapSchema, effort: 'low' as const, text: `Remplissage de formulaire. Associe les données de la fiche aux champs du formulaire web. "champ" = la clé "k" exacte du champ. Pour un champ à choix, "valeur" doit être une des options proposées. Ne remplis que ce qui correspond clairement; liste les autres libellés dans "non_remplis".

<champs>${JSON.stringify(fields).slice(0, 40000)}</champs>
<fiche>${fiche}</fiche>` };
}

export async function runTask(task: string, body: any) {
  if (!['extract', 'listing', 'contract', 'map', 'agent', 'redaction', 'analyse'].includes(task)) throw new ApiError('Action inconnue.', 404);
  if (!process.env.ANTHROPIC_API_KEY) throw new ApiError("Le moteur IA d'i-Courtier n'est pas encore activé. Contactez i-ateliers.", 503);
  const p = prompt(task as Task, body);
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
  });
  if (response.stop_reason === 'refusal') throw new ApiError('Demande refusée par le moteur IA. Reformulez la source.', 422);
  if (response.stop_reason === 'max_tokens') throw new ApiError('Réponse trop longue. Réduisez la source.', 413);
  const text = response.content.flatMap(c => (c.type === 'text' ? [c.text] : [])).join('');
  return p.format ? JSON.parse(text) : { texte: text };
}
