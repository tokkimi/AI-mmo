import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Le fichier de l'extension est hors de public/ : il n'est servi qu'aux abonnés par cette route.
  outputFileTracingIncludes: { '/api/icourtier/download': ['./private/i-courtier.zip'] },
  // L'ancienne page de la formation immobilier mène maintenant à l'outil i-Courtier.
  async redirects() {
    return [{ source: '/immobilier-quebec', destination: '/i-courtier', permanent: false }];
  },
};

export default nextConfig;
