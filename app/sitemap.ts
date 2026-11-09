import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://www.i-ateliers.com/', changeFrequency: 'weekly', priority: 1 }];
}
