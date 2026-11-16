import type { Metadata } from 'next';
import { PublicInfoShell } from '@/components/public-info-shell';

export const metadata: Metadata = { title: 'À propos d’Emilie Cauvier et d’i-ateliers', description: 'Découvrez pourquoi Emilie Cauvier a créé i-ateliers : des formations IA concrètes, humaines et adaptées aux entreprises du Québec.', alternates: { canonical: '/a-propos' } };

export default function AboutPage() {
  return <PublicInfoShell><main className="public-info">
    <span className="eyebrow">À PROPOS · QUÉBEC</span><h1>Mettre l’IA au service du vrai travail.</h1>
    <p className="public-info-lead">i-ateliers a été créé par Emilie Cauvier pour aider les entrepreneurs, les équipes et les courtiers à transformer l’intelligence artificielle en méthodes utiles, vérifiables et simples à adopter.</p>
    <div className="public-info-grid">
      <article className="panel"><h2>Une approche issue du terrain</h2><p>Courtière immobilière résidentielle et commerciale au Québec, Emilie connaît la réalité des dossiers, des suivis clients, des communications et des obligations professionnelles. Les formations partent de situations concrètes, pas de démonstrations abstraites.</p></article>
      <article className="panel"><h2>Un accompagnement humain</h2><p>L’objectif n’est pas de remplacer le jugement professionnel. Chaque méthode prévoit une validation humaine, des sources à vérifier et une utilisation responsable des renseignements.</p></article>
      <article className="panel"><h2>Des outils qui restent maîtrisables</h2><p>Prompts, processus, automatisations et extension mia — i-Courtier sont pensés pour garder les décisions entre vos mains et documenter les étapes importantes.</p></article>
      <article className="panel"><h2>Une entreprise québécoise</h2><p>i-ateliers est exploité par Emilie Cauvier Inc. au Québec. Les prix sont en dollars canadiens et les contenus tiennent compte des réalités et des repères applicables ici.</p></article>
    </div>
    <div className="public-info-actions"><a className="button" href="/#tarif">Voir les offres</a><a className="button outline" href="/contact">Parler de votre projet</a></div>
  </main></PublicInfoShell>;
}
