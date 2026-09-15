import Stripe from 'stripe';
import {NextRequest,NextResponse} from 'next/server';
import {currentUser,db,hasAccess} from '@/lib/server';
export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){try{if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Origine non autorisée'},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:'Connectez-vous.'},{status:401});if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_PRICE_ID)return NextResponse.json({error:'Les paiements ne sont pas encore activés.'},{status:503});const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const {action}=await params;const base=new URL(req.url).origin;
if(action==='portal'){if(!user.stripe_customer)return NextResponse.json({error:'Aucun compte de facturation.'},{status:400});const s=await stripe.billingPortal.sessions.create({customer:user.stripe_customer,return_url:base+'/?view=subscription'});return NextResponse.json({url:s.url})}
if(action!=='checkout')return NextResponse.json({error:'Action introuvable'},{status:404});return NextResponse.json({error:'Les nouvelles offres sont en cours de configuration. Aucun achat ne peut être effectué pour le moment.'},{status:503});
}catch{return NextResponse.json({error:'La facturation est indisponible. Contactez l’administration.'},{status:500})}}
