import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser, db } from '@/lib/server';

const offers = {
  signature: { name: 'i-ateliers — Structurer et automatiser · Accompagné', amount: 120000, mode: 'payment' },
  monthly: { name: 'i-ateliers — Structurer et automatiser · Autonomie', amount: 10000, mode: 'subscription' },
  autonomous: { name: 'i-ateliers — Claude + ChatGPT · 100 % autonome', amount: 49900, mode: 'payment' },
  'immo-signature': { name: 'i-ateliers — Immobilier Québec · Accès complet', amount: 120000, mode: 'payment' },
  'immo-monthly': { name: 'i-ateliers — Immobilier Québec · À votre rythme', amount: 10000, mode: 'subscription' },
} as const;
type OfferId = keyof typeof offers;

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    if (req.headers.get('origin') !== new URL(req.url).origin) return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Connectez-vous pour continuer.' }, { status: 401 });
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Les paiements ne sont pas encore activés.' }, { status: 503 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { action } = await params;
    const base = new URL(req.url).origin;
    if (action === 'portal') {
      if (!user.stripe_customer) return NextResponse.json({ error: 'Aucun compte de facturation.' }, { status: 400 });
      const session = await stripe.billingPortal.sessions.create({ customer: user.stripe_customer, return_url: `${base}/?view=subscription` });
      return NextResponse.json({ url: session.url });
    }
    if (action !== 'checkout') return NextResponse.json({ error: 'Action introuvable' }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const offerId = body.offer as OfferId;
    const offer = offers[offerId];
    if (!offer) return NextResponse.json({ error: 'Offre introuvable.' }, { status: 400 });
    let customer = user.stripe_customer;
    if (!customer) {
      const created = await stripe.customers.create({ email: user.email, name: user.name, metadata: { iateliers_user_id: user.id } });
      customer = created.id;
      await db()`UPDATE users SET stripe_customer=${customer} WHERE id=${user.id}`;
    }
    const subscription = offer.mode === 'subscription';
    const cancelUrl = offerId.startsWith('immo-')
      ? `${base}/immobilier-quebec?payment=cancelled`
      : offerId === 'autonomous'
        ? `${base}/?view=autonomous-info&payment=cancelled`
        : `${base}/?view=business-info&payment=cancelled`;
    const session = await stripe.checkout.sessions.create({
      mode: offer.mode,
      customer,
      client_reference_id: user.id,
      metadata: { offer: offerId, user_id: user.id },
      line_items: [{ quantity: 1, price_data: { currency: 'cad', unit_amount: offer.amount, product_data: { name: offer.name }, ...(subscription ? { recurring: { interval: 'month' as const } } : {}) } }],
      success_url: `${base}/?view=subscription&payment=success`,
      cancel_url: cancelUrl,
      billing_address_collection: 'required',
      ...(process.env.STRIPE_AUTOMATIC_TAX === 'true' ? { automatic_tax: { enabled: true } } : {}),
      ...(subscription ? { subscription_data: { metadata: { offer: offerId, user_id: user.id } } } : {}),
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error', error);
    return NextResponse.json({ error: 'La facturation est indisponible. Réessayez dans un instant.' }, { status: 500 });
  }
}
