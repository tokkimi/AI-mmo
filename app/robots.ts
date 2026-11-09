import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/console', '/admin', '/?view='] }, sitemap: 'https://www.i-ateliers.com/sitemap.xml' };
}
