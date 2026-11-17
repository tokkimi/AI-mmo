import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://i-ateliers.com';
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/a-propos`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/i-courtier`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/i-courtier/confidentialite`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/conditions`, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
