import type { Metadata } from 'next';
import { PublicInfoShell } from '@/components/public-info-shell';

export const metadata: Metadata = { title: 'Conditions, confidentialité et annulation | i-ateliers', description: 'Conditions d’utilisation, confidentialité, résiliation et droits applicables aux services i-ateliers.', alternates: { canonical: '/conditions' } };

export default function ConditionsPage() {
  return <PublicInfoShell><main className="public-info legal-copy">
    <span className="eyebrow">MISE À JOUR · 17 NOVEMBRE 2026</span><h1>Conditions et confidentialité.</h1>
    <section><h2>Identité et contact</h2><p>Les services i-ateliers sont exploités par Émilie Cauvier Inc., entreprise québécoise immatriculée sous le numéro d’entreprise du Québec (NEQ) <strong>1173036386</strong>. Pour une question, une demande d’accès, de rectification, de retrait de consentement ou de suppression : <a href="mailto:emilie@equipecauvier.com">emilie@equipecauvier.com</a> ou <a href="tel:+15147749818">514 774-9818</a>.</p></section>
    <section><h2>Offres, prix et accès</h2><p>Les montants affichés sont en dollars canadiens, taxes applicables en sus. La formation accompagnée est offerte à 1 200 CAD en paiement unique; la formation autonome Claude + ChatGPT à 499 CAD; mia — i-Courtier à 250 CAD par mois. Les détails, le prix total et les conditions applicables sont présentés avant tout paiement.</p></section>
    <section><h2>Annulation et résiliation</h2><p>L’abonnement mia — i-Courtier peut être résilié afin d’arrêter les renouvellements futurs. Les formations et services demeurent soumis aux droits impératifs prévus par les lois québécoises, notamment les règles applicables aux contrats de cours. Aucune disposition ne limite un droit auquel le consommateur ne peut renoncer.</p></section>
    <section><h2>Renseignements personnels</h2><p>Le compte peut contenir votre nom, courriel, mot de passe haché, progression, notes, travaux, réservations et messages. Ces renseignements servent à fournir la formation, sécuriser le compte, offrir le soutien et respecter les obligations légales. Les fournisseurs d’hébergement et d’infrastructure peuvent traiter des données hors Québec; des mesures contractuelles et techniques appropriées doivent alors s’appliquer.</p></section>
    <section><h2>Témoins et mesure</h2><p>Les témoins essentiels soutiennent la connexion et la sécurité. Le pixel Meta et les autres mesures non essentielles ne sont activés qu’après votre choix dans le panneau de préférences. Vous pouvez refuser ou modifier ce choix à tout moment.</p></section>
    <section><h2>Utilisation responsable</h2><p>Les formations et outils ne remplacent pas un avis juridique, fiscal ou professionnel. Ne téléversez pas de renseignements de clients sans autorisation. Vérifiez les sources, les résultats générés et les documents obligatoires avant toute utilisation.</p></section>
    <section><h2>Recours</h2><p>Vous pouvez consulter l’<a href="https://www.opc.gouv.qc.ca/" target="_blank" rel="noreferrer">Office de la protection du consommateur</a> et la <a href="https://www.cai.gouv.qc.ca/" target="_blank" rel="noreferrer">Commission d’accès à l’information du Québec</a>.</p></section>
  </main></PublicInfoShell>;
}
