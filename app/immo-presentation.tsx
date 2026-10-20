'use client';

import { Building2, Check, ShieldCheck, Zap } from 'lucide-react';
import { modules } from '@/content/catalog';
import PurchaseSheet from '@/components/purchase-sheet';

export default function ImmoPresentation({ go, user }: any) {
  return (
    <div className="immo-presentation">
      <section className="sales-section immo-hero">
        <div className="sales-section-title">
          <span className="eyebrow">
            FORMATION SPÉCIALISÉE · IMMOBILIER QUÉBEC
          </span>
          <h1>
            L’IA au service
            <br />
            de votre pratique immobilière.
          </h1>
          <p>
            Une formation complète pour les courtiers, équipes et agences qui
            veulent mieux préparer leurs dossiers, créer une mise en marché
            cohérente et automatiser les suivis, tout en gardant le jugement
            professionnel au centre.
          </p>
        </div>
        <div className="immo-hero-art" aria-hidden="true">
          <Building2 size={72} />
          <Zap size={44} />
          <span>COURTAGE · MARKETING · AUTOMATISATION</span>
        </div>
        <div className="immo-pricing">
          <article className="panel">
            <span className="eyebrow">ABONNEMENT i-COURTIER</span>
            <h2>250 CAD / mois + taxes</h2>
            <p>
              Aucuns frais fixes, résiliable à tout moment. L’extension
              i-Courtier pour la saisie à la source, les ébauches de contrats
              et l’administration des inscriptions, plus le parcours immobilier
              complet : prompts, exercices et QCM.
            </p>
            <PurchaseSheet offer="immo-pro" user={user} go={go} label="M’abonner à i-Courtier"/>
          </article>
          <article className="panel">
            <span className="eyebrow">L’IA POUR VOS PRATIQUES IMMO</span>
            <h2>20 h de travail, 5 minutes.</h2>
            <p>
              Des outils pensés pour les courtiers : vos inscriptions, vos
              formulaires et vos suivis sont préparés pour vous. Le courtier
              valide chaque document avant usage.
            </p>
          </article>
        </div>
      </section>
      <section className="sales-section">
        <div className="sales-section-title">
          <span className="eyebrow">CE QUE VOUS RETROUVEZ</span>
          <h2>Le programme immobilier Québec, complet.</h2>
          <p>
            Les contenus déjà construits pour l’immobilier sont remis au premier
            plan dans une offre séparée : cas fictifs québécois, contrôle des
            faits, pratiques marketing et automatisations documentées.
          </p>
        </div>
        <div className="immo-value-grid">
          <article>
            <ShieldCheck />
            <h3>Cadre professionnel Québec</h3>
            <p>
              Confidentialité, Loi 25, consentement, publicité et vérification
              humaine. L’IA prépare; le courtier valide.
            </p>
          </article>
          <article>
            <Building2 />
            <h3>Dossiers & propriétés</h3>
            <p>
              Rapports, déclarations, inspection, descriptions, présentation des
              propriétés et stratégie de mise en marché.
            </p>
          </article>
          <article>
            <Zap />
            <h3>Automatisations maîtrisées</h3>
            <p>
              CRM, formulaires, relances, infolettres, Make et Zapier avec
              contrôles, consentement et gestion des doublons.
            </p>
          </article>
        </div>
      </section>
      <section className="sales-section">
        <div className="sales-section-title">
          <span className="eyebrow">
            16 PARCOURS · 48 LEÇONS · 240 QUESTIONS
          </span>
          <h2>Les chapitres de votre spécialisation.</h2>
          <p>
            Chaque parcours comprend trois leçons, un atelier pratique, un
            prompt adaptable et des questions corrigées.
          </p>
        </div>
        <div className="immo-program-grid">
          {modules.map((m, i) => (
            <article className="panel" key={m.id}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <h3>{m.title}</h3>
              <p>{m.description}</p>
              <ul>
                {m.topics.map((t) => (
                  <li key={t}>
                    <Check size={14} />
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="sales-section immo-callout">
        <span className="eyebrow">DE LA PRÉPARATION AU SUIVI</span>
        <h2>Des livrables qui servent vraiment vos mandats.</h2>
        <div className="grid-two">
          <p>
            <strong>Exemple : un condo à Lévis.</strong> Vous partez de faits
            vérifiés, distinguez les inconnues, préparez la description, les
            questions à poser et les déclinaisons de contenu. Rien n’est publié
            sans validation.
          </p>
          <p>
            <strong>Exemple : un prospect issu d’un formulaire.</strong> Vous
            définissez les champs, le consentement, le suivi CRM et un brouillon
            de réponse. L’automatisation crée une tâche à valider, jamais une
            promesse ou un envoi non contrôlé.
          </p>
        </div>
        <PurchaseSheet offer="immo-pro" user={user} go={go} label="M’abonner à i-Courtier"/>
      </section>
    </div>
  );
}
