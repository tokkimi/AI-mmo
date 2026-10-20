import type { Metadata } from 'next';
import IcourtierPage from './client';

export const metadata: Metadata = {
  title: 'i-Courtier — L’IA pour vos pratiques immo | i-ateliers',
  description: 'Extension pour courtiers immobiliers du Québec : saisie à la source, ébauches de contrats et administration des inscriptions. 250 CAD/mois, sans frais fixes.',
};

export default function Page() {
  return <IcourtierPage />;
}
