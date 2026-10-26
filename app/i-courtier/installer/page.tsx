import type { Metadata } from 'next';
import InstallerPage from './client';

export const metadata: Metadata = {
  title: 'Installer i-Courtier | i-ateliers',
  description: 'Installez l’extension i-Courtier dans Chrome ou Edge en quelques minutes, étape par étape.',
};

export default function Page() {
  return <InstallerPage />;
}
