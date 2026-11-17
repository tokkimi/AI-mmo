import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'i-Courtier — Bientôt disponible | i-ateliers',
  description: 'L’extension i-Courtier est actuellement en préparation.',
};

export default function Page() {
  redirect('/i-courtier');
}
