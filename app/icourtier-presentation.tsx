'use client';

import { Bot, Calculator, Check, ClipboardCheck, Download, FileSearch, FileSignature, FileText, MousePointerClick, PenLine, ScanText, ShieldCheck, Timer } from 'lucide-react';
import PurchaseSheet from '@/components/purchase-sheet';

const pillars = [
  { icon: Bot, title: 'Un agent qui agit', text: 'Demandez en langage courant : « ajoute les échéances de la promesse », « coche l’acte de vente », « prépare la contre-proposition ». L’agent répond et met à jour le dossier, crée les tâches, ouvre les sites et remplit les formulaires.' },
  { icon: ScanText, title: 'Saisie à la source', text: 'Capturez la page ouverte, un courriel du vendeur, un compte de taxes ou un PDF : i-Courtier extrait les 32 champs de la fiche d’inscription et signale ce qui manque ou se contredit.' },
  { icon: MousePointerClick, title: 'Remplissage automatique', text: 'Ouvrez votre formulaire en ligne (système d’inscription, CRM, portail) : un clic et les champs reconnus sont remplis et surlignés, prêts à être vérifiés.' },
  { icon: FileSignature, title: 'Ébauches de contrats', text: 'Contrat de courtage, promesse d’achat, contre-proposition, modifications, déclarations du vendeur : des ébauches structurées, délais calculés, données à reporter dans les formulaires de l’OACIQ.' },
  { icon: ClipboardCheck, title: 'Administration des inscriptions', text: 'Liste des documents par dossier avec statuts, descriptions FR et EN, points forts, alertes d’incohérence et courriel au vendeur pour obtenir les pièces manquantes.' },
  { icon: PenLine, title: 'Rédaction', text: 'Courriels au vendeur, à l’acheteur, au notaire et aux collaborateurs, suivis de visite, baisse de prix, publications Facebook et Instagram, visites libres, infolettres et textos, signés à votre nom.' },
  { icon: FileSearch, title: 'Analyse de documents', text: 'Inspection, déclarations du vendeur, certificat de localisation, procès-verbaux : résumé, points d’alerte et questions à poser, puis mise à jour de la fiche.' },
  { icon: Calculator, title: 'Suivi et calculs', text: 'Statut de chaque dossier, tâches et échéances avec alertes de retard, mensualité hypothécaire, commission avec TPS et TVQ, répartition des taxes.' },
];

const steps = [
  ['Installez', 'Téléchargez l’extension et ajoutez-la à Chrome ou Edge en quelques clics.'],
  ['Connectez-vous', 'Utilisez votre compte i-ateliers. L’abonnement actif déverrouille l’extension.'],
  ['Capturez', 'Une page, une sélection (clic droit), un PDF ou vos notes de visite.'],
  ['Validez', 'Relisez la fiche, remplissez vos formulaires et générez vos ébauches.'],
];

const faq = [
  ['Est-ce que i-Courtier remplace les formulaires de l’OACIQ ?', 'Non. i-Courtier prépare des ébauches et les données à reporter. Les formulaires obligatoires de l’OACIQ prévalent toujours et le courtier valide chaque document avant usage.'],
  ['Où sont conservés mes dossiers ?', 'Les dossiers sont enregistrés localement dans votre navigateur. Les textes et PDF ne sont transmis au moteur IA qu’au moment où vous lancez une action, pour produire la réponse.'],
  ['Sur quels sites fonctionne la saisie ?', 'Sur toute page web lisible : fiches, courriels dans le navigateur, rôles d’évaluation, portails et formulaires en ligne. Les champs reconnus sont remplis; les autres sont listés.'],
  ['Y a-t-il des frais d’installation ?', 'Aucuns frais fixes. 250 CAD par mois + taxes, résiliable à tout moment depuis votre espace de facturation.'],
  ['Que peut faire l’agent ?', 'Il connaît le dossier ouvert (fiche, documents, tâches, contrats) et peut lire la page affichée. Il répond à vos questions, rédige vos textes et agit : mise à jour de la fiche, documents cochés, tâches et échéances, statut du dossier, sites ouverts, formulaires remplis et ébauches de contrats.'],
  ['Puis-je utiliser i-Courtier sur plusieurs ordinateurs ou en équipe ?', 'Oui. Exportez vos dossiers en un clic et importez-les sur un autre poste ou chez un collègue de votre agence.'],
  ['Une formation est-elle incluse ?', 'Non. i-Courtier est uniquement l’outil. Le volet immobilier Québec est offert sur demande aux participants de la formation Structurer et automatiser à 1 200 CAD.'],
];

export default function IcourtierPresentation({ go, user }: any) {
  return (
    <div className="immo-presentation icourtier">
      <section className="sales-section immo-hero">
        <div className="sales-section-title">
          <span className="eyebrow">NOUVEAU · EXTENSION POUR COURTIERS · QUÉBEC</span>
          <h1>i-Courtier.<br />L’IA pour vos pratiques immo.</h1>
          <p>
            L’outil révolutionnaire des courtiers pour la saisie à la source, les ébauches de contrats et
            l’administration des inscriptions. Jusqu’à 20 heures de travail d’adjointe ramenées à quelques minutes,
            directement dans votre navigateur.
          </p>
          <div className="row sales-cta">
            <PurchaseSheet offer="immo-pro" user={user} go={go} label="M’abonner — 250 CAD / mois" />
            <a className="text-button" href="#fonctionnement">Voir comment ça marche →</a>
          </div>
        </div>
        <div className="icourtier-mock" aria-hidden="true">
          <div className="icourtier-mock-top"><img src="/brand/i-courtier-icon.png" alt="" /><span>i-Courtier<small>L’IA pour vos pratiques immo</small></span></div>
          <div className="icourtier-mock-tabs"><i>Saisie</i><i className="on">Fiche</i><i>Inscription</i><i>Contrats</i></div>
          {[['Adresse', '214, rue des Érables, Lévis'], ['Prix demandé', '465 000 $'], ['Année de construction', '1998'], ['Taxes municipales', '3 412 $'], ['Inclusions', 'Électroménagers, stores']].map(([l, v]) => (
            <div className="icourtier-mock-field" key={l}><small>{l}</small><span>{v}</span></div>
          ))}
          <div className="icourtier-mock-alert">À vérifier : certificat de localisation, superficie du terrain</div>
          <div className="icourtier-mock-btn">Remplir le formulaire de la page</div>
        </div>
      </section>

      <div className="sales-numbers">
        <div><strong>20 h</strong><span>de saisie ramenées à quelques minutes</span></div>
        <div><strong>32</strong><span>champs de fiche extraits</span></div>
        <div><strong>18</strong><span>modèles de contrats et de textes</span></div>
        <div><strong>0 $</strong><span>de frais fixes</span></div>
      </div>

      <section className="sales-section">
        <div className="sales-section-title">
          <span className="eyebrow">CE QUE FAIT i-COURTIER</span>
          <h2>Une adjointe administrative, dans votre navigateur.</h2>
          <p>Huit outils reliés par dossier : ce que vous saisissez une fois sert partout.</p>
        </div>
        <div className="icourtier-grid">
          {pillars.map(({ icon: Icon, title, text }) => (
            <article key={title}><Icon /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="sales-section">
        <div className="sales-section-title">
          <span className="eyebrow">LES DOCUMENTS, GUIDÉS PAS À PAS</span>
          <h2>Chaque pièce du dossier, au bon endroit.</h2>
          <p>Pour chaque document, i-Courtier ouvre le bon site, copie le n° de lot ou l’adresse, rappelle les étapes, puis lit le PDF importé pour compléter la fiche.</p>
        </div>
        <div className="icourtier-docs">
          {[
            ['Registre foncier', 'Index des immeubles, acte de vente, acte de prêt (hypothèque) et, au besoin, déclaration de transmission.'],
            ['Taxes municipales', 'Rôle d’évaluation et rôle de taxation de la ville, y compris Montréal.'],
            ['Taxes scolaires', 'Compte de taxes le plus récent, recherché par n° de cadastre.'],
            ['Hydro-Québec', 'Estimation du coût annuel, lue directement à l’écran.'],
            ['Centris', 'Vos inscriptions incomplètes s’ouvrent et se remplissent à partir de la fiche.'],
            ['Instanet Forms', 'Le dossier de transaction est nommé avec l’adresse de la propriété, en un clic.'],
          ].map(([t, d]) => (<article key={t}><Check /><div><h3>{t}</h3><p>{d}</p></div></article>))}
        </div>
      </section>

      <section id="fonctionnement" className="sales-section">
        <div className="sales-section-title">
          <span className="eyebrow">COMMENT ÇA MARCHE</span>
          <h2>Quatre étapes, aucune configuration.</h2>
        </div>
        <ol className="icourtier-steps">
          {steps.map(([t, d], i) => (<li key={t}><span>{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{d}</p></li>))}
        </ol>
      </section>

      <section className="sales-section">
        <div className="sales-section-title">
          <span className="eyebrow">AVANT / APRÈS</span>
          <h2>Le même dossier, une fraction du temps.</h2>
        </div>
        <div className="icourtier-compare">
          <div className="panel"><h3><Timer /> Sans i-Courtier</h3><ul>
            <li>Recopier à la main l’adresse, les taxes, les superficies et les inclusions</li>
            <li>Ressaisir les mêmes données dans chaque formulaire et portail</li>
            <li>Rédiger chaque promesse d’achat ou contre-proposition depuis zéro</li>
            <li>Suivre les documents manquants dans des courriels épars</li>
          </ul></div>
          <div className="panel on"><h3><Check /> Avec i-Courtier</h3><ul>
            <li>Une capture ou un PDF : la fiche se remplit et signale ce qui manque</li>
            <li>Un clic : les formulaires ouverts sont remplis et surlignés</li>
            <li>Une ébauche structurée avec délais calculés et clauses proposées</li>
            <li>Une liste de documents par dossier et le courriel au vendeur déjà rédigé</li>
          </ul></div>
        </div>
      </section>

      <section className="sales-section">
        <div className="immo-value-grid">
          <article><ShieldCheck /><h3>Le courtier garde la main</h3><p>Rien n’est signé, publié ou envoyé automatiquement. Chaque champ rempli est surligné pour vérification.</p></article>
          <article><FileText /><h3>Formulaires OACIQ respectés</h3><p>Les ébauches servent à préparer et à reporter; les formulaires obligatoires de l’OACIQ prévalent.</p></article>
          <article><ShieldCheck /><h3>Loi 25 en tête</h3><p>Dossiers enregistrés dans votre navigateur. Données transmises au moteur IA seulement à votre demande.</p></article>
        </div>
      </section>

      <section id="abonnement" className="sales-section">
        <div className="immo-pricing">
          <article className="panel">
            <span className="eyebrow">ABONNEMENT i-COURTIER</span>
            <h2>250 CAD / mois + taxes</h2>
            <ul className="offer-inclusions">
              <li>Extension i-Courtier pour Chrome et Edge</li>
              <li>Saisie à la source, PDF et remplissage de formulaires</li>
              <li>Ébauches de contrats et administration des inscriptions</li>
              <li>Descriptions FR / EN, alertes et courriels au vendeur</li>
              <li>Aucuns frais fixes · résiliable à tout moment</li>
            </ul>
            <PurchaseSheet offer="immo-pro" user={user} go={go} label="M’abonner à i-Courtier" />
          </article>
          <article className="panel">
            <span className="eyebrow">INSTALLATION</span>
            <h2>Déjà abonné ?</h2>
            <p>Une page d’installation vous guide pas à pas et confirme quand i-Courtier est prêt.</p>
            <a className="button outline" href="/i-courtier/installer"><Download size={16} /> Installer i-Courtier</a>
          </article>
        </div>
      </section>

      <section className="sales-section sales-faq">
        <div className="sales-section-title"><span className="eyebrow">VOS QUESTIONS</span><h2>Avant de vous abonner.</h2></div>
        <div className="icourtier-faq">
          {faq.map(([q, a]) => (<details key={q}><summary>{q}</summary><p>{a}</p></details>))}
        </div>
      </section>
    </div>
  );
}
