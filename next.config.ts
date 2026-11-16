import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Le fichier de l'extension est hors de public/ : il n'est servi qu'aux abonnés par cette route.
  outputFileTracingIncludes: { '/api/icourtier/download': ['./private/i-courtier.zip'] },
  // L'ancienne page de la formation immobilier mène maintenant à l'outil i-Courtier.
  async redirects() {
    return [
      { source: '/immobilier-quebec', destination: '/i-courtier', permanent: false },
      // admin.i-ateliers.com ouvre la console centrale des trois sites d'Emilie.
      { source: '/', has: [{ type: 'host', value: 'admin.i-ateliers.com' }], destination: 'https://i-ateliers.store/console', permanent: false },
      ...['i-ateliers.com', 'www.i-ateliers.com', 'i-ateliers.ca', 'www.i-ateliers.ca', 'i-ateliers.net', 'www.i-ateliers.net', 'i-ateliers.info', 'www.i-ateliers.info', 'i-ateliers.xyz', 'www.i-ateliers.xyz', 'www.i-ateliers.store'].map((host) => ({
        source: '/:path*',
        has: [{ type: 'host' as const, value: host }],
        destination: 'https://i-ateliers.store/:path*',
        permanent: true,
      })),
      { source: '/admin', destination: '/console', permanent: false },
    ];
  },
};

export default nextConfig;
