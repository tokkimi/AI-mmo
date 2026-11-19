import type { Metadata } from 'next';
import EssaiPage from './client';

export const metadata: Metadata = {
  title: 'Banc d’essai i-Courtier | i-ateliers',
  description: 'Espace réservé aux testeurs d’i-Courtier.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <EssaiPage />;
}
