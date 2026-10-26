import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, digest, rateLimit, ApiError, textField } from '@/lib/server';
import { hasExtensionAccess, runTask, CONTRACTS, FICHE_FIELDS, WRITINGS, DOC_KINDS } from '@/lib/icourtier';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// L'extension appelle cette API depuis son origine chrome-extension://.
function cors(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  return origin.startsWith('chrome-extension://')
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', Vary: 'Origin' }
    : {};
}
const json = (req: NextRequest, data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', ...cors(req) } });

async function tokenUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const rows = await db()`SELECT u.id,u.email,u.name,u.role,u.stripe_customer FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${digest(token)} AND s.expires_at>now()`;
  return rows[0] || null;
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    if (action !== 'me') throw new ApiError('Action inconnue.', 404);
    const user = await tokenUser(req);
    if (!user) throw new ApiError('Session expirée. Reconnectez-vous.', 401);
    return json(req, { user: { name: user.name, email: user.email }, access: await hasExtensionAccess(user), contracts: CONTRACTS, fields: FICHE_FIELDS, writings: WRITINGS, docKinds: DOC_KINDS });
  } catch (e) { return fail(req, e); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    if (Number(req.headers.get('content-length') || 0) > 4_400_000) throw new ApiError('Requête trop volumineuse.', 413);
    const body = await req.json().catch(() => ({}));
    if (action === 'login') {
      const email = textField(body.email, 254).toLowerCase();
      const password = textField(body.password, 72);
      await rateLimit('auth:' + email, 12);
      await rateLimit('ip:' + req.headers.get('x-forwarded-for'), 60);
      const rows = await db()`SELECT id,password_hash FROM users WHERE email=${email}`;
      if (!rows.length || !await bcrypt.compare(password, rows[0].password_hash)) throw new ApiError('Courriel ou mot de passe incorrect.', 401);
      const token = randomBytes(32).toString('hex');
      await db()`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(${digest(token)},${rows[0].id},now()+interval '30 days')`;
      return json(req, { token });
    }
    const user = await tokenUser(req);
    if (!user) throw new ApiError('Session expirée. Reconnectez-vous.', 401);
    if (action === 'logout') {
      const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      await db()`DELETE FROM sessions WHERE token_hash=${digest(token)}`;
      return json(req, { ok: true });
    }
    if (!await hasExtensionAccess(user)) throw new ApiError('Abonnement i-Courtier requis. Abonnez-vous sur i-ateliers.ca/i-courtier.', 402);
    await rateLimit('icourtier:' + user.id, 120);
    return json(req, await runTask(action, body));
  } catch (e) { return fail(req, e); }
}

function fail(req: NextRequest, e: unknown) {
  if (e instanceof ApiError) return json(req, { error: e.message }, e.status);
  console.error('i-Courtier error', e instanceof Error ? e.message : 'unknown');
  return json(req, { error: 'Une erreur est survenue. Réessayez dans un instant.' }, 500);
}
