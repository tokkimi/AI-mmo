import type { Metadata } from 'next';
import { PublicInfoShell } from '@/components/public-info-shell';

export const metadata: Metadata = { title: 'Contact et accompagnement | i-ateliers', description: 'Une question sur une formation, mia — i-Courtier ou une formation d’équipe? Communiquez directement avec i-ateliers.', alternates: { canonical: '/contact' } };

export default function ContactPage() {
  return <PublicInfoShell><main className="public-info">
    <span className="eyebrow">CONTACT · RÉPONSE HUMAINE</span><h1>Parlons de ce que vous voulez simplifier.</h1>
    <p className="public-info-lead">Formation individuelle, déploiement dans une équipe ou question sur mia — i-Courtier : indiquez-nous votre contexte et l’objectif que vous souhaitez atteindre.</p>
    <div className="public-info-grid contact-cards">
      <a className="panel" href="mailto:emilie@equipecauvier.com?subject=Demande%20i-ateliers"><span className="eyebrow">COURRIEL</span><h2>emilie@equipecauvier.com</h2><p>Écrivez-nous avec votre rôle, la taille de votre équipe et le sujet qui vous intéresse.</p></a>
      <a className="panel" href="tel:+15147749818"><span className="eyebrow">TÉLÉPHONE</span><h2>514 774-9818</h2><p>Appelez pour une question préalable ou pour discuter d’une formation d’équipe.</p></a>
      <a className="panel" href="/?view=register"><span className="eyebrow">CAMPUS</span><h2>Créer un compte gratuit</h2><p>Accédez ensuite à la messagerie privée et conservez toutes vos réponses au même endroit.</p></a>
      <a className="panel" href="/?view=enterprise"><span className="eyebrow">ENTREPRISE</span><h2>Demander une proposition</h2><p>Pour 4 à 8, 9 à 12 ou plus de 12 participants.</p></a>
    </div><p className="public-info-note">i-ateliers est exploité par Emilie Cauvier Inc., Québec, Canada.</p>
  </main></PublicInfoShell>;
}
