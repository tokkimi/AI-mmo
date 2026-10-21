import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // L'ancienne page de la formation immobilier mène maintenant à l'outil i-Courtier.
  async redirects() {
    return [{ source: '/immobilier-quebec', destination: '/i-courtier', permanent: false }];
  },
};

export default nextConfig;
