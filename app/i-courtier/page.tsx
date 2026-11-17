import type { Metadata } from 'next';
import IcourtierPage from './client';

export const metadata: Metadata = {
  title: 'i-Courtier — Bientôt disponible | i-ateliers',
  description: 'Découvrez en avant-première i-Courtier, la future extension pour les courtiers immobiliers du Québec.',
};

export default function Page() {
  return <IcourtierPage />;
}
