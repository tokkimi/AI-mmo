import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server';

const permanent = new Date('2099-12-31T23:59:59.000Z').toISOString();
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Non configuré' }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') || '', process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return NextResponse.json({ error: 'Signature invalide' }, { status: 400 }); }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id || session.client_reference_id;
      const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (userId && customer) {
        const until = session.mode === 'payment' && session.payment_status === 'paid' ? permanent : new Date().toISOString();
        await db()`UPDATE users SET stripe_customer=${customer},access_until=${until} WHERE id=${userId} AND role='member'`;
      }
    }
    if (event.type.startsWith('customer.subscription.')) {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const active = ['active', 'trialing'].includes(subscription.status);
      const until = active ? new Date(Math.max(...subscription.items.data.map(item => item.current_period_end)) * 1000).toISOString() : new Date().toISOString();
      const userId = subscription.metadata.user_id;
      if (userId) await db()`UPDATE users SET stripe_customer=${customer},stripe_subscription=${subscription.id},access_until=${until} WHERE id=${userId} AND role='member'`;
      else await db()`UPDATE users SET stripe_subscription=${subscription.id},access_until=${until} WHERE stripe_customer=${customer} AND role='member'`;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error', error);
    return NextResponse.json({ error: 'Réessayez' }, { status: 500 });
  }
}
