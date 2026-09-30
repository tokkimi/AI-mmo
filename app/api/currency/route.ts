import { NextRequest, NextResponse } from 'next/server';
const euroCountries = new Set('AT BE BG HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES AD MC SM VA'.split(' '));
export async function GET(req: NextRequest) {
  const country = (req.headers.get('x-vercel-ip-country') || '').toUpperCase();
  let rate: number | null = null;
  let date: string | null = null;
  try {
    const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Rates unavailable');
    const xml = await response.text();
    const cad = Number(xml.match(/currency=['"]CAD['"]\s+rate=['"]([\d.]+)['"]/)?.[1]);
    if (Number.isFinite(cad) && cad > 0) rate = 1 / cad;
    date = xml.match(/time=['"]([\d-]+)['"]/)?.[1] || null;
  } catch { /* Keep CAD when the reference rate is unavailable. */ }
  return NextResponse.json({ currency: euroCountries.has(country) && rate ? 'EUR' : 'CAD', rate, date }, { headers: { 'Cache-Control': 'private, no-store' } });
}
