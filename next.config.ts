import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Le fichier de l'extension est hors de public/ : il n'est servi qu'aux abonnés par cette route.
  outputFileTracingIncludes: { '/api/icourtier/download': ['./private/i-courtier.zip'] },
  // L'ancienne page de la formation immobilier mène maintenant à l'outil i-Courtier.
  async redirects() {
    return [
      { source: '/immobilier-quebec', destination: '/i-courtier', permanent: false },
      // admin.i-ateliers.com ouvre la console centrale des trois sites d'Emilie.
      { source: '/', has: [{ type: 'host', value: 'admin.i-ateliers.com' }], destination: 'https://www.i-ateliers.com/console', permanent: false },
      { source: '/admin', destination: '/console', permanent: false },
    ];
  },
};

export default nextConfig;
