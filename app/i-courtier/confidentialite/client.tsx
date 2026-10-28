'use client';

import { PublicShell } from '../../landing';
import Link from 'next/link';

const go = (view: string) => window.location.assign('/?view=' + view);

export default function PrivacyPage() {
  return (
    <PublicShell go={go} user={null}>
      <article className="sales-section icourtier-privacy">
        <span className="eyebrow">EXTENSION i-COURTIER</span>
        <h1>Politique de confidentialité</h1>
        <p className="muted">Mise à jour le 29 octobre 2026. Éditeur : i-ateliers, Québec.</p>

        <h2>À quoi sert i-Courtier</h2>
        <p>i-Courtier est une extension de navigateur réservée aux courtiers immobiliers abonnés. Elle aide à préparer les fiches d’inscription, les documents et les communications d’un dossier immobilier. Elle n’agit que lorsque le courtier clique sur une action.</p>

        <h2>Données conservées dans votre navigateur</h2>
        <p>Les dossiers (fiche de la propriété, statut des documents, tâches, conversations avec l’agent, textes et ébauches générés) et votre profil de courtier sont enregistrés localement, dans le stockage de l’extension de votre navigateur. Le stockage principal de ces dossiers est local; les fonctions IA transmettent toutefois les éléments nécessaires au traitement décrit ci-dessous. Vous pouvez exporter ou supprimer vos dossiers depuis l’extension. La suppression locale et la désinstallation ne suppriment pas les données de votre compte, les fichiers exportés ou les données déjà transmises aux prestataires. La déconnexion retire le jeton local et demande la fermeture de la session au serveur; elle ne supprime pas vos dossiers locaux.</p>

        <h2>Données transmises, et seulement à votre demande</h2>
        <ul>
          <li><b>Connexion</b> : votre courriel et votre mot de passe i-ateliers servent à ouvrir une session. Un jeton est conservé dans l’extension; la session correspondante expire côté serveur après 30 jours au maximum. Le serveur conserve une empreinte du jeton, son échéance et son association à votre compte. Le mot de passe est vérifié à partir de son empreinte sécurisée en base.</li>
          <li><b>Contenu des pages</b> : « Capturer la page » lit la sélection ou le texte de la page et le conserve dans la source locale, avec le titre et l’URL. Ces éléments sont transmis lorsque vous lancez l’extraction. « Remplir le formulaire » transmet les libellés et options des champs ainsi que la fiche nécessaire au remplissage. « Capturer le montant » transmet une capture d’écran et l’URL de la page. Lorsque « Inclure la page ouverte » est coché, l’envoi d’une demande à l’agent transmet aussi le texte, le titre et l’URL de cette page. Le menu « Envoyer la sélection à i-Courtier » conserve d’abord la sélection localement. Il n’y a pas de collecte continue de votre historique de navigation.</li>
          <li><b>Documents et textes</b> : les fonctions d’extraction ou d’analyse transmettent les PDF sélectionnés et les données nécessaires. Les demandes à l’agent, la rédaction et les ébauches peuvent transmettre votre profil de courtier, vos consignes, la fiche du bien, la conversation et les tâches ou statuts utiles à la demande. Selon les documents fournis, ces contenus peuvent comprendre des noms, coordonnées, communications personnelles et renseignements financiers (hypothèque, taxes, prix).</li>
        </ul>
        <p>Ces contenus transitent par les serveurs d’i-ateliers (Vercel, États-Unis) et sont traités par le moteur d’intelligence artificielle d’Anthropic (États-Unis) pour produire la réponse. L’API i-Courtier ne crée pas de copie des dossiers ou documents en base après la réponse. Des données de compte et de session, des compteurs de limitation des requêtes et des messages d’erreur techniques sont néanmoins traités côté serveur. La suppression d’un dossier local n’entraîne pas leur suppression. Les traitements et la conservation par les prestataires relèvent aussi de leurs conditions et de la configuration du service; la présente politique ne promet pas une absence de conservation chez ces prestataires. Ils ne sont ni vendus, ni utilisés à des fins publicitaires, ni utilisés pour évaluer la solvabilité de quiconque.</p>

        <h2>Sur le site i-ateliers.ca</h2>
        <p>Sur les pages d’i-ateliers.ca, l’extension indique seulement son numéro de version, afin que la page d’installation confirme qu’elle est bien installée.</p>

        <h2>Renseignements de vos clients</h2>
        <p>Les dossiers peuvent contenir des renseignements personnels de vendeurs ou d’acheteurs. Avant d’utiliser ces fonctions, assurez-vous d’être autorisé à transmettre ces renseignements : ne transmettez que ce qui est nécessaire au dossier et validez chaque document avant usage. Les formulaires obligatoires de l’OACIQ prévalent toujours sur les ébauches.</p>

        <h2>Vos droits</h2>
        <p>Vous pouvez demander l’accès, la rectification ou la suppression des renseignements de votre compte i-ateliers, et cesser les transmissions de l’extension en arrêtant d’utiliser ses fonctions ou en la désinstallant. La résiliation de l’abonnement ne constitue pas à elle seule une demande de suppression du compte ou des données déjà transmises. Écrivez-nous depuis la messagerie de votre espace membre.</p>

        <p className="muted">Voir aussi les <Link href="/?view=privacy">conditions et la politique de confidentialité d’i-ateliers</Link>.</p>
      </article>
    </PublicShell>
  );
}
