'use client';

import { PublicShell } from '../../landing';

const go = (view: string) => window.location.assign('/?view=' + view);

export default function PrivacyPage() {
  return (
    <PublicShell go={go} user={null}>
      <article className="sales-section icourtier-privacy">
        <span className="eyebrow">EXTENSION i-COURTIER</span>
        <h1>Politique de confidentialité</h1>
        <p className="muted">En vigueur le 26 octobre 2026. Éditeur : i-ateliers, Québec.</p>

        <h2>À quoi sert i-Courtier</h2>
        <p>i-Courtier est une extension de navigateur réservée aux courtiers immobiliers abonnés. Elle aide à préparer les fiches d’inscription, les documents et les communications d’un dossier immobilier. Elle n’agit que lorsque le courtier clique sur une action.</p>

        <h2>Données conservées dans votre navigateur</h2>
        <p>Les dossiers (fiche de la propriété, statut des documents, tâches, conversations avec l’agent, textes et ébauches générés) et votre profil de courtier sont enregistrés localement, dans le stockage de l’extension de votre navigateur. i-ateliers ne conserve pas ces dossiers sur ses serveurs. Vous pouvez les exporter ou les supprimer à tout moment depuis l’extension; désinstaller l’extension les efface.</p>

        <h2>Données transmises, et seulement à votre demande</h2>
        <ul>
          <li><b>Connexion</b> : votre courriel et votre mot de passe i-ateliers servent à ouvrir une session. Un jeton de session est conservé dans l’extension pendant 30 jours au maximum.</li>
          <li><b>Contenu des pages</b> : lorsque vous cliquez sur « Capturer la page », « Remplir le formulaire », « Capturer le montant » ou cochez « Inclure la page ouverte », le texte, les champs ou la capture d’écran de l’onglet actif sont envoyés pour produire le résultat demandé. Aucune page n’est lue en arrière-plan.</li>
          <li><b>Documents et textes</b> : les PDF importés, vos notes et les données du dossier nécessaires à l’action demandée.</li>
        </ul>
        <p>Ces contenus transitent par les serveurs d’i-ateliers (Vercel, États-Unis) et sont traités par le moteur d’intelligence artificielle d’Anthropic (États-Unis) pour produire la réponse. i-ateliers ne les enregistre pas après la réponse. Ils ne sont ni vendus, ni utilisés à des fins publicitaires, ni utilisés pour évaluer la solvabilité de quiconque.</p>

        <h2>Sur le site i-ateliers.ca</h2>
        <p>Sur les pages d’i-ateliers.ca, l’extension indique seulement son numéro de version, afin que la page d’installation confirme qu’elle est bien installée.</p>

        <h2>Renseignements de vos clients</h2>
        <p>Les dossiers peuvent contenir des renseignements personnels de vendeurs ou d’acheteurs. Vous en demeurez responsable au sens de la Loi 25 : ne transmettez que ce qui est nécessaire au dossier et validez chaque document avant usage. Les formulaires obligatoires de l’OACIQ prévalent toujours sur les ébauches.</p>

        <h2>Vos droits</h2>
        <p>Vous pouvez demander l’accès, la rectification ou la suppression des renseignements de votre compte i-ateliers, et retirer votre consentement en désinstallant l’extension ou en résiliant votre abonnement. Écrivez-nous depuis la messagerie de votre espace membre.</p>

        <p className="muted">Voir aussi les <a href="/?view=privacy">conditions et la politique de confidentialité d’i-ateliers</a>.</p>
      </article>
    </PublicShell>
  );
}
