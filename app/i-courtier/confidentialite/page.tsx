import type { Metadata } from 'next';
import PrivacyPage from './client';

export const metadata: Metadata = {
  title: 'Confidentialité i-Courtier | i-ateliers',
  description: 'Politique de confidentialité de l’extension i-Courtier : données traitées, finalités, conservation et vos droits.',
};

export default function Page() {
  return <PrivacyPage />;
}
