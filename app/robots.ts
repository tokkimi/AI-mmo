import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/console', '/admin', '/?view='] }, sitemap: 'https://i-ateliers.com/sitemap.xml', host: 'https://i-ateliers.com' };
}
