import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { currentUser } from '@/lib/server';
import { hasExtensionAccess, isLaunched, isTester } from '@/lib/icourtier';

export const dynamic = 'force-dynamic';

// Le fichier de l'extension n'est servi qu'aux comptes connectés avec un abonnement i-Courtier actif.
// ?check=1 renvoie seulement l'état, pour afficher le bon bouton sur la page.
export async function GET(req: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const user = await currentUser();
    // Avant le lancement, seuls les testeurs voient et téléchargent l'extension.
    const open = isLaunched() || isTester(user);
    const access = user && open ? await hasExtensionAccess(user) : false;
    if (req.nextUrl.searchParams.has('check')) return NextResponse.json({ user: !!user, access, comingSoon: !isLaunched(), tester: isTester(user) }, { headers });
    if (!access) return NextResponse.redirect(new URL(isLaunched() ? '/i-courtier#abonnement' : '/i-courtier', req.url));
    const file = await readFile(path.join(process.cwd(), 'private/i-courtier.zip'));
    return new NextResponse(file, { headers: { ...headers, 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="i-courtier.zip"' } });
  } catch (e) {
    console.error('i-Courtier download error', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({ error: 'Téléchargement indisponible. Réessayez dans un instant.' }, { status: 500, headers });
  }
}
