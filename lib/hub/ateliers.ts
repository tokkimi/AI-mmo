import Stripe from 'stripe';
import {randomBytes} from 'node:crypto';
import {db,digest,ApiError,textField,uuid} from '@/lib/server';
import {catalog} from '@/content/catalog';
import type {HubSnapshot,HubActionResult,HubRow,HubBlock} from './types';

// Administration i-ateliers : membres et pédagogie lus dans la base Neon du site,
// ventes et comptabilité lues dans le compte Stripe i-ateliers (STRIPE_SECRET_KEY).
// Les actions reprennent les validations de /api/admin/* et écrivent au journal d'audit.

type Admin={id:string};

const offerNames:Record<string,string>={signature:'Accompagné — Structurer et automatiser',autonomous:'Claude + ChatGPT · 100 % autonome','immo-pro':'i-Courtier · extension courtiers'};
const subStatus:Record<string,string>={active:'Actif',trialing:'Essai',past_due:'En retard',canceled:'Annulé',unpaid:'Impayé',incomplete:'Incomplet',incomplete_expired:'Expiré',paused:'En pause'};
const invoiceStatus:Record<string,string>={paid:'Payé',open:'En attente',draft:'Brouillon',void:'Annulé',uncollectible:'Irrécouvrable'};
const payoutStatus:Record<string,string>={paid:'Versé',pending:'En attente',in_transit:'En transit',canceled:'Annulé',failed:'Échoué'};
const txType:Record<string,string>={charge:'Paiement',payment:'Paiement',refund:'Remboursement',payment_refund:'Remboursement',payout:'Versement',stripe_fee:'Frais Stripe',adjustment:'Ajustement',application_fee:'Frais',dispute:'Litige',tax_fee:'Frais de taxe'};
const month=(t:number)=>new Date(t*1000).toISOString().slice(0,7);
const iso=(t:number|null|undefined)=>t?new Date(t*1000).toISOString():null;
const custEmail=(c:string|Stripe.Customer|Stripe.DeletedCustomer|null)=>c&&typeof c!=='string'&&!('deleted' in c&&c.deleted)?(c as Stripe.Customer).email||'':'';

async function stripeData(){
 if(!process.env.STRIPE_SECRET_KEY)return {error:'STRIPE_SECRET_KEY absent du projet Vercel ai-mmo.'} as const;
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
  const yearStart=Math.floor(Date.UTC(new Date().getUTCFullYear()-1,0,1)/1000);
  const [sessions,txs,subs,invoices,payouts,balance]=await Promise.all([
   stripe.checkout.sessions.list({limit:100,status:'complete'}).autoPagingToArray({limit:500}),
   stripe.balanceTransactions.list({limit:100,created:{gte:yearStart}}).autoPagingToArray({limit:2000}),
   stripe.subscriptions.list({limit:100,status:'all',expand:['data.customer']}).autoPagingToArray({limit:500}),
   stripe.invoices.list({limit:100}),
   stripe.payouts.list({limit:50}),
   stripe.balance.retrieve(),
  ]);
  return {sessions,txs,subs,invoices:invoices.data,payouts:payouts.data,balance};
 }catch(e){console.error('Stripe hub',e instanceof Error?e.message:'unknown');return {error:'Stripe ne répond pas ou la clé est invalide.'} as const}
}

export async function ateliersSnapshot():Promise<HubSnapshot>{
 const sql=db();
 const [users,submissions,attempts,lessonStats,sessions,bookings,threads,quotes,audit,stripe]=await Promise.all([
  sql`SELECT id,name,email,role,access_until,city,agency,created_at,stripe_customer,stripe_subscription FROM users ORDER BY created_at DESC`,
  sql`SELECT s.id,s.lesson_id,s.body,s.status,s.grade,s.feedback,s.updated_at,u.name,u.email FROM submissions s JOIN users u ON u.id=s.user_id ORDER BY (s.status='submitted') DESC,s.updated_at DESC`,
  sql`SELECT user_id,lesson_id,max(score)::int AS score FROM attempts GROUP BY user_id,lesson_id`,
  sql`SELECT lesson_id,count(*)::int AS tries,count(DISTINCT user_id)::int AS learners,round(avg(score))::int AS avg,count(*) FILTER (WHERE score>=80)::int AS passed FROM attempts GROUP BY lesson_id`,
  sql`SELECT c.*,(SELECT count(*)::int FROM bookings b WHERE b.session_id=c.id) AS booked FROM coaching c ORDER BY starts_at DESC`,
  sql`SELECT b.session_id,b.created_at,u.name,u.email,c.title FROM bookings b JOIN users u ON u.id=b.user_id JOIN coaching c ON c.id=b.session_id ORDER BY b.created_at DESC`,
  sql`SELECT u.id,u.name,u.email,count(m.id)::int AS total,max(m.created_at) AS last_at,(SELECT m2.body FROM messages m2 WHERE m2.thread_user_id=u.id ORDER BY m2.created_at DESC LIMIT 1) AS last_body,(SELECT r.role FROM messages m3 JOIN users r ON r.id=m3.sender_id WHERE m3.thread_user_id=u.id ORDER BY m3.created_at DESC LIMIT 1) AS last_role FROM messages m JOIN users u ON u.id=m.thread_user_id GROUP BY u.id,u.name,u.email ORDER BY max(m.created_at) DESC LIMIT 200`,
  sql`SELECT m.body,m.created_at,u.id,u.name,u.email FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.body LIKE 'DEMANDE DE FORMATION%' ORDER BY m.created_at DESC LIMIT 200`,
  sql`SELECT a.action,a.target,a.created_at,u.name FROM audit_log a LEFT JOIN users u ON u.id=a.actor ORDER BY a.created_at DESC LIMIT 150`,
  stripeData(),
 ]);
 const now=Date.now(),year=new Date().getFullYear();
 const members=users.filter((u:any)=>u.role==='member');
 const active=members.filter((u:any)=>u.access_until&&new Date(u.access_until).getTime()>now);
 const toReview=submissions.filter((s:any)=>s.status==='submitted');
 const upcoming=sessions.filter((s:any)=>new Date(s.starts_at).getTime()>now);
 const awaiting=threads.filter((t:any)=>t.last_role==='member');
 const passed=(id:string)=>attempts.filter((a:any)=>a.user_id===id&&a.score>=80&&catalog.some(l=>l.id===a.lesson_id)).length;
 const lessonTitle=(id:string)=>catalog.find(l=>l.id===id)?.title||('Ancien programme · '+id);

 // ---------- Stripe : ventes, abonnements, comptabilité ----------
 const s='error' in stripe?null:stripe;
 const paidSessions=(s?.sessions||[]).filter(x=>x.payment_status==='paid'||x.mode==='subscription');
 const spentByEmail=new Map<string,number>();
 for(const x of paidSessions){const e=(x.customer_details?.email||x.customer_email||'').toLowerCase();if(e)spentByEmail.set(e,(spentByEmail.get(e)||0)+(x.amount_total||0))}
 const thisYear=(t:number)=>new Date(t*1000).getFullYear()===year;
 const txs=s?.txs||[];
 const sum=(f:(t:Stripe.BalanceTransaction)=>boolean,k:'amount'|'fee'|'net'='amount')=>txs.filter(f).reduce((a,t)=>a+t[k],0);
 const isSale=(t:Stripe.BalanceTransaction)=>t.type==='charge'||t.type==='payment';
 const isRefund=(t:Stripe.BalanceTransaction)=>t.type==='refund'||t.type==='payment_refund';
 const gross=sum(t=>isSale(t)&&thisYear(t.created));
 const refunds=-sum(t=>isRefund(t)&&thisYear(t.created));
 const fees=sum(t=>t.type!=='payout'&&thisYear(t.created),'fee')+(-sum(t=>t.type==='stripe_fee'&&thisYear(t.created)));
 const net=sum(t=>t.type!=='payout'&&thisYear(t.created),'net');
 const taxes=paidSessions.filter(x=>thisYear(x.created)).reduce((a,x)=>a+(x.total_details?.amount_tax||0),0);
 const sales30=paidSessions.filter(x=>x.created*1000>now-30*86400000).reduce((a,x)=>a+(x.amount_total||0),0);
 const months=new Map<string,{gross:number;refunds:number;fees:number;net:number}>();
 for(const t of txs){if(t.type==='payout')continue;const k=month(t.created);const m=months.get(k)||{gross:0,refunds:0,fees:0,net:0};if(isSale(t))m.gross+=t.amount;if(isRefund(t))m.refunds+=-t.amount;m.fees+=t.fee+(t.type==='stripe_fee'?-t.amount:0);m.net+=t.net;months.set(k,m)}
 const monthRows=[...months].sort((a,b)=>b[0].localeCompare(a[0]));
 const liveSubs=(s?.subs||[]).filter(x=>['active','trialing','past_due'].includes(x.status));
 const monthly=(x:Stripe.Subscription)=>x.items.data.reduce((a,i)=>{const p=i.price;const amt=(p.unit_amount||0)*(i.quantity||1);const iv=p.recurring?.interval;return a+(iv==='year'?amt/12:iv==='week'?amt*52/12:iv==='day'?amt*30:amt)},0);
 const mrr=Math.round(liveSubs.filter(x=>x.status!=='past_due').reduce((a,x)=>a+monthly(x),0));
 const avail=(s?.balance.available||[]).reduce((a,b)=>a+b.amount,0),pending=(s?.balance.pending||[]).reduce((a,b)=>a+b.amount,0);
 const icourtierSubs=(s?.subs||[]).filter(x=>x.metadata?.offer==='immo-pro');
 const freeEmails=(process.env.ICOURTIER_FREE_EMAILS||'').split(',').map(e=>e.trim()).filter(Boolean);
 const stripeMissing:HubBlock[]=[{type:'notes',title:'Stripe non connecté',items:[String('error' in stripe?stripe.error:''),"Les ventes et la comptabilité i-ateliers proviennent directement du compte Stripe. Ajoutez la clé secrète dans le projet Vercel ai-mmo (STRIPE_SECRET_KEY)."]}];

 const memberRows:HubRow[]=users.map((u:any)=>({
  name:u.name,email:u.email,
  access:u.role==='admin'?'Administrateur':u.access_until&&new Date(u.access_until).getTime()>now?(new Date(u.access_until).getFullYear()>=2099?'Actif · permanent':'Actif'):u.access_until?'Expiré':'Découverte',
  until:u.access_until&&new Date(u.access_until).getFullYear()<2099?new Date(u.access_until).toISOString():null,
  progress:`${passed(u.id)}/${catalog.length}`,spent:spentByEmail.get(String(u.email).toLowerCase())||0,city:u.city||'',created:new Date(u.created_at).toISOString(),
  _actions:u.role==='admin'?[{label:'Lien mot de passe',action:'reset',payload:{userId:u.id}}]:[
   {label:'Accès 30 j',action:'access',payload:{userId:u.id,days:30}},
   {label:'Accès 1 an',action:'access',payload:{userId:u.id,days:365}},
   {label:'Retirer l’accès',action:'access',payload:{userId:u.id,days:0},confirm:`Retirer l’accès complet à ${u.name} ?`,tone:'danger'},
   {label:'Écrire',action:'message',payload:{userId:u.id},fields:[{name:'body',label:`Message à ${u.name}`,type:'textarea',required:true}]},
   {label:'Lien mot de passe',action:'reset',payload:{userId:u.id},confirm:'Générer un lien de réinitialisation valable une heure ? Communiquez-le uniquement à la personne, après vérification de son identité.'},
  ],
 }));

 const saleRows:HubRow[]=paidSessions.map(x=>{const pi=typeof x.payment_intent==='string'?x.payment_intent:x.payment_intent?.id;return {
  date:iso(x.created),email:x.customer_details?.email||x.customer_email||'',offer:offerNames[String(x.metadata?.offer)]||String(x.metadata?.offer||'—'),
  mode:x.mode==='subscription'?'Abonnement':'Paiement unique',tax:x.total_details?.amount_tax||0,amount:x.amount_total||0,
  _actions:pi&&x.mode==='payment'?[{label:'Rembourser',action:'refund',payload:{paymentIntent:pi},confirm:`Rembourser intégralement ${((x.amount_total||0)/100).toFixed(2)} $ à ${x.customer_details?.email||'ce client'} ? Cette opération est définitive chez Stripe.`,tone:'danger' as const}]:undefined,
 }});

 const subRows=(list:Stripe.Subscription[]):HubRow[]=>list.map(x=>({
  customer:custEmail(x.customer),offer:offerNames[String(x.metadata?.offer)]||x.items.data[0]?.price.nickname||'Abonnement',
  status:x.cancel_at_period_end&&x.status==='active'?'Annulé en fin de période':subStatus[x.status]||x.status,
  monthly:Math.round(monthly(x)),renewal:iso(Math.max(0,...x.items.data.map(i=>i.current_period_end))),since:iso(x.created),
  _actions:['active','trialing','past_due'].includes(x.status)?[x.cancel_at_period_end
   ?{label:'Réactiver',action:'subscription',payload:{id:x.id,cancel:false}}
   :{label:'Annuler en fin de période',action:'subscription',payload:{id:x.id,cancel:true},confirm:'L’abonnement restera actif jusqu’à la fin de la période payée, puis s’arrêtera. Continuer ?',tone:'danger' as const}]:undefined,
 }));
 const subColumns=[{key:'customer',label:'Client'},{key:'offer',label:'Offre'},{key:'status',label:'Statut',format:'badge' as const},{key:'monthly',label:'Par mois',format:'money' as const,align:'right' as const},{key:'renewal',label:'Prochaine échéance',format:'date' as const},{key:'since',label:'Depuis',format:'date' as const}];

 return {generatedAt:new Date().toISOString(),currency:'CAD',sections:[
  {id:'overview',label:'Vue d’ensemble',icon:'home',blocks:[
   {type:'metrics',items:[
    {label:'Ventes 30 jours',value:s?sales30:'—',format:s?'money':undefined,hint:s?'Paiements Stripe réussis':'Stripe non connecté'},
    {label:'Revenu récurrent (MRR)',value:s?mrr:'—',format:s?'money':undefined,hint:`${liveSubs.length} abonnement(s) actif(s)`},
    {label:'Membres inscrits',value:members.length},
    {label:'Accès actifs',value:active.length},
    {label:'Travaux à corriger',value:toReview.length},
    {label:'Messages en attente',value:awaiting.length},
    {label:'Demandes de devis',value:quotes.length},
    {label:'Séances à venir',value:upcoming.length},
   ]},
   {type:'bars',title:'Revenu net par mois',format:'money',items:monthRows.slice(0,12).reverse().map(([label,m])=>({label,value:m.net}))},
   {type:'table',title:'Dernières ventes',columns:[{key:'date',label:'Date',format:'datetime'},{key:'email',label:'Client'},{key:'offer',label:'Offre'},{key:'amount',label:'Montant',format:'money',align:'right'}],rows:saleRows.slice(0,6).map(({_actions,...r})=>r),empty:s?'Aucune vente pour le moment.':'Stripe non connecté.'},
   {type:'table',title:'Derniers inscrits',columns:[{key:'name',label:'Membre'},{key:'email',label:'Courriel'},{key:'access',label:'Accès',format:'badge'},{key:'created',label:'Inscription',format:'date'}],rows:memberRows.slice(0,6).map(({_actions,...r})=>r),empty:'Aucun membre pour le moment.'},
  ]},
  {id:'sales',label:'Ventes',icon:'cart',badge:paidSessions.length||undefined,blocks:s?[
   {type:'metrics',items:[{label:'Ventes 30 jours',value:sales30,format:'money'},{label:`Ventes ${year}`,value:gross,format:'money'},{label:'Commandes',value:paidSessions.length},{label:'Panier moyen',value:paidSessions.length?Math.round(paidSessions.reduce((a,x)=>a+(x.amount_total||0),0)/paidSessions.length):0,format:'money'}]},
   {type:'table',title:'Paiements',description:'Toutes les commandes payées sur i-ateliers (Stripe Checkout).',columns:[{key:'date',label:'Date',format:'datetime'},{key:'email',label:'Client'},{key:'offer',label:'Offre'},{key:'mode',label:'Type',format:'badge'},{key:'tax',label:'Taxes',format:'money',align:'right'},{key:'amount',label:'Total',format:'money',align:'right'}],rows:saleRows,empty:'Aucune vente pour le moment.'},
  ]:stripeMissing},
  {id:'subscriptions',label:'Abonnements',icon:'repeat',badge:liveSubs.length||undefined,blocks:s?[
   {type:'metrics',items:[{label:'MRR',value:mrr,format:'money'},{label:'Abonnements actifs',value:liveSubs.length},{label:'Revenu annualisé',value:mrr*12,format:'money'},{label:'Annulés',value:(s.subs||[]).filter(x=>x.status==='canceled').length}]},
   {type:'table',title:'Abonnements Stripe',columns:subColumns,rows:subRows(s.subs),empty:'Aucun abonnement.'},
  ]:stripeMissing},
  {id:'accounting',label:'Comptabilité',icon:'wallet',blocks:s?[
   {type:'metrics',items:[
    {label:`Ventes brutes ${year}`,value:gross,format:'money'},
    {label:'Remboursements',value:-refunds,format:'money'},
    {label:'Frais Stripe',value:-fees,format:'money'},
    {label:`Net encaissé ${year}`,value:net,format:'money'},
    {label:'Taxes perçues (TPS/TVQ)',value:taxes,format:'money',hint:'À remettre aux gouvernements'},
    {label:'Solde disponible',value:avail,format:'money',hint:`En attente : ${(pending/100).toFixed(2)} $`},
   ]},
   {type:'bars',title:'Net encaissé par mois',format:'money',items:monthRows.slice(0,12).reverse().map(([label,m])=>({label,value:m.net}))},
   {type:'table',title:'État mensuel',columns:[{key:'month',label:'Mois'},{key:'gross',label:'Ventes brutes',format:'money',align:'right'},{key:'refunds',label:'Remboursements',format:'money',align:'right'},{key:'fees',label:'Frais Stripe',format:'money',align:'right'},{key:'net',label:'Net',format:'money',align:'right'}],
    rows:monthRows.map(([k,m])=>({month:k,gross:m.gross,refunds:-m.refunds,fees:-m.fees,net:m.net})),empty:'Aucune transaction.'},
   {type:'table',title:'Grand livre Stripe',description:'Chaque mouvement du compte Stripe depuis janvier dernier. Exportez-le en CSV pour votre comptable.',columns:[{key:'date',label:'Date',format:'datetime'},{key:'type',label:'Type',format:'badge'},{key:'desc',label:'Description'},{key:'gross',label:'Brut',format:'money',align:'right'},{key:'fee',label:'Frais',format:'money',align:'right'},{key:'net',label:'Net',format:'money',align:'right'}],
    rows:txs.map(t=>({date:iso(t.created),type:txType[t.type]||t.type,desc:t.description||'',gross:t.amount,fee:-t.fee,net:t.net})),empty:'Aucun mouvement.'},
  ]:stripeMissing},
  {id:'invoices',label:'Factures & versements',icon:'receipt',blocks:s?[
   {type:'table',title:'Factures',columns:[{key:'number',label:'Numéro'},{key:'date',label:'Date',format:'date'},{key:'customer',label:'Client'},{key:'status',label:'Statut',format:'badge'},{key:'amount',label:'Montant',format:'money',align:'right'},{key:'url',label:'Facture',format:'link'},{key:'pdf',label:'PDF',format:'link'}],
    rows:s.invoices.map(i=>({number:i.number||'—',date:iso(i.created),customer:i.customer_email||'',status:invoiceStatus[i.status||'']||i.status||'',amount:i.total,url:i.hosted_invoice_url||null,pdf:i.invoice_pdf||null})),empty:'Aucune facture (les paiements uniques génèrent un reçu Stripe).'},
   {type:'table',title:'Versements vers votre compte bancaire',columns:[{key:'date',label:'Arrivée',format:'date'},{key:'status',label:'Statut',format:'badge'},{key:'amount',label:'Montant',format:'money',align:'right'}],
    rows:s.payouts.map(p=>({date:iso(p.arrival_date),status:payoutStatus[p.status]||p.status,amount:p.amount})),empty:'Aucun versement.'},
  ]:stripeMissing},
  {id:'members',label:'Membres & accès',icon:'users',badge:members.length||undefined,blocks:[
   {type:'table',title:'Membres',description:'Les accès invités s’ouvrent immédiatement. Les liens de mot de passe expirent après une heure.',columns:[{key:'name',label:'Membre'},{key:'email',label:'Courriel'},{key:'access',label:'Accès',format:'badge'},{key:'until',label:'Jusqu’au',format:'date'},{key:'progress',label:'QCM réussis'},{key:'spent',label:'Achats',format:'money',align:'right'},{key:'city',label:'Ville'},{key:'created',label:'Inscription',format:'date'}],rows:memberRows,empty:'Aucun membre.'},
  ]},
  {id:'icourtier',label:'i-Courtier',icon:'puzzle',badge:icourtierSubs.filter(x=>x.status==='active'||x.status==='trialing').length||undefined,blocks:[
   {type:'metrics',items:[{label:'Abonnés actifs',value:icourtierSubs.filter(x=>x.status==='active'||x.status==='trialing').length},{label:'MRR i-Courtier',value:Math.round(icourtierSubs.filter(x=>x.status==='active'||x.status==='trialing').reduce((a,x)=>a+monthly(x),0)),format:'money'},{label:'Accès offerts',value:freeEmails.length}]},
   {type:'table',title:'Abonnements à l’extension',columns:subColumns,rows:subRows(icourtierSubs),empty:s?'Aucun abonné i-Courtier pour le moment.':'Stripe non connecté.'},
   {type:'table',title:'Accès gratuits (équipe)',description:'Liste ICOURTIER_FREE_EMAILS du projet Vercel ai-mmo. Les administrateurs ont toujours accès.',columns:[{key:'email',label:'Courriel'}],rows:freeEmails.map(email=>({email})),empty:'Aucun accès offert.'},
   {type:'links',title:'Raccourcis',items:[{label:'Page i-Courtier',href:'https://www.i-ateliers.com/i-courtier'},{label:'Page d’installation',href:'https://www.i-ateliers.com/i-courtier/installer'}]},
  ]},
  {id:'courses',label:'Formations',icon:'book',blocks:[
   {type:'metrics',items:[{label:'Leçons au programme',value:catalog.length},{label:'QCM passés',value:lessonStats.reduce((a:number,l:any)=>a+l.tries,0)},{label:'Travaux déposés',value:submissions.length}]},
   {type:'table',title:'Résultats par leçon',columns:[{key:'lesson',label:'Leçon'},{key:'learners',label:'Apprenants',align:'right'},{key:'tries',label:'Tentatives',align:'right'},{key:'avg',label:'Moyenne',format:'percent',align:'right'},{key:'rate',label:'Taux de réussite',format:'percent',align:'right'}],
    rows:catalog.map(l=>{const st:any=lessonStats.find((x:any)=>x.lesson_id===l.id);return {lesson:l.title,learners:st?.learners||0,tries:st?.tries||0,avg:st?.avg??null,rate:st?.tries?100*st.passed/st.tries:null}}),empty:'Aucune leçon.'},
  ]},
  {id:'work',label:'Travaux à corriger',icon:'pen',badge:toReview.length||undefined,blocks:[
   {type:'table',title:'Travaux déposés',description:'80 et plus : validé. En dessous : à retravailler. Le membre retrouve le retour dans sa leçon.',columns:[{key:'status',label:'Statut',format:'badge'},{key:'lesson',label:'Leçon'},{key:'member',label:'Membre'},{key:'body',label:'Travail',format:'longtext'},{key:'grade',label:'Note',align:'right'},{key:'updated',label:'Mis à jour',format:'date'}],
    rows:submissions.map((x:any)=>({status:x.status==='submitted'?'À corriger':x.status==='approved'?'Validé':'À retravailler',lesson:lessonTitle(x.lesson_id),member:`${x.name} · ${x.email}`,body:x.body,grade:x.grade,updated:new Date(x.updated_at).toISOString(),
     _actions:[{label:x.status==='submitted'?'Corriger':'Modifier la note',action:'review',payload:{id:x.id},fields:[{name:'grade',label:'Note sur 100',type:'number',min:0,max:100,required:true,default:x.grade??80},{name:'feedback',label:'Retour au membre',type:'textarea',required:true,default:x.feedback||''}]}]})),
    empty:'Aucun travail déposé pour le moment.'},
  ]},
  {id:'sessions',label:'Visioconférences',icon:'video',badge:upcoming.length||undefined,blocks:[
   {type:'form',title:'Programmer une séance',description:'Créez la réunion chez Zoom, Meet, Teams ou Jitsi puis collez le lien ici. L’heure est celle de Montréal.',action:{label:'Publier la séance',action:'coaching',fields:[
    {name:'title',label:'Titre',type:'text',required:true},
    {name:'description',label:'Description',type:'textarea'},
    {name:'date',label:'Date et heure à Montréal',type:'datetime-local',required:true},
    {name:'duration',label:'Durée (minutes)',type:'number',min:15,max:240,default:60,required:true},
    {name:'capacity',label:'Places',type:'number',min:1,max:100,default:10,required:true},
    {name:'meeting_url',label:'Lien Zoom, Meet, Teams ou Jitsi',type:'url',required:true,placeholder:'https://meet.google.com/…'},
   ]}},
   {type:'table',title:'Séances',columns:[{key:'title',label:'Séance'},{key:'starts',label:'Date (Montréal)',format:'datetime'},{key:'duration',label:'Durée',align:'right'},{key:'seats',label:'Inscrits',align:'right'},{key:'url',label:'Lien',format:'link'}],
    rows:sessions.map((x:any)=>({title:x.title,starts:new Date(x.starts_at).toISOString(),duration:`${x.duration} min`,seats:`${x.booked}/${x.capacity}`,url:x.meeting_url,_actions:[{label:'Annuler',action:'coaching-delete',payload:{id:x.id},confirm:'Annuler cette séance et ses réservations ?',tone:'danger'}]})),empty:'Aucune séance programmée.'},
   {type:'table',title:'Réservations',columns:[{key:'name',label:'Membre'},{key:'email',label:'Courriel'},{key:'title',label:'Séance'},{key:'created',label:'Réservé le',format:'date'}],rows:bookings.map((b:any)=>({name:b.name,email:b.email,title:b.title,created:new Date(b.created_at).toISOString()})),empty:'Aucune réservation.'},
  ]},
  {id:'messages',label:'Messagerie',icon:'chat',badge:awaiting.length||undefined,blocks:[
   {type:'table',title:'Conversations',description:'« En attente » : le dernier message vient du membre.',columns:[{key:'state',label:'État',format:'badge'},{key:'name',label:'Membre'},{key:'last',label:'Dernier message',format:'longtext'},{key:'total',label:'Messages',align:'right'},{key:'at',label:'Le',format:'datetime'}],
    rows:threads.map((t:any)=>({state:t.last_role==='member'?'En attente':'Répondu',name:`${t.name} · ${t.email}`,last:t.last_body,total:t.total,at:new Date(t.last_at).toISOString(),_actions:[{label:'Répondre',action:'message',payload:{userId:t.id},fields:[{name:'body',label:`Réponse à ${t.name}`,type:'textarea',required:true}]}]})),empty:'Aucune conversation.'},
  ]},
  {id:'quotes',label:'Demandes entreprises',icon:'briefcase',badge:quotes.length||undefined,blocks:[
   {type:'table',title:'Demandes de formation et devis',description:'Envoyées depuis la page Entreprises. Répondez directement au client.',columns:[{key:'at',label:'Reçue le',format:'datetime'},{key:'name',label:'Client'},{key:'body',label:'Demande',format:'longtext'}],
    rows:quotes.map((q:any)=>({at:new Date(q.created_at).toISOString(),name:`${q.name} · ${q.email}`,body:String(q.body).replace(/^DEMANDE DE FORMATION \/ DEVIS\n/,''),_actions:[{label:'Répondre',action:'message',payload:{userId:q.id},fields:[{name:'body',label:`Réponse à ${q.name}`,type:'textarea',required:true}]}]})),empty:'Aucune demande pour le moment.'},
  ]},
  {id:'audit',label:'Journal d’activité',icon:'log',blocks:[
   {type:'table',title:'Dernières actions d’administration',columns:[{key:'at',label:'Date',format:'datetime'},{key:'who',label:'Par'},{key:'action',label:'Action'},{key:'target',label:'Cible'}],rows:audit.map((a:any)=>({at:new Date(a.created_at).toISOString(),who:a.name||'—',action:a.action,target:a.target})),empty:'Aucune action enregistrée.'},
  ]},
  {id:'setup',label:'Configuration',icon:'settings',blocks:[
   {type:'status',title:'Branchements',items:[
    {label:'Base de données Neon',ok:true},
    {label:'Paiements Stripe',ok:!!s,detail:'STRIPE_SECRET_KEY'},
    {label:'Webhook Stripe (accès automatiques)',ok:!!process.env.STRIPE_WEBHOOK_SECRET,detail:'STRIPE_WEBHOOK_SECRET'},
    {label:'Assistant i-Courtier (Claude)',ok:!!process.env.ANTHROPIC_API_KEY,detail:'ANTHROPIC_API_KEY'},
    {label:'Console ↔ Guides Immo Québec',ok:!!process.env.GUIDES_HUB_SECRET,detail:'GUIDES_HUB_SECRET'},
    {label:'Console ↔ Mémoire Maison',ok:!!process.env.MEMOIRE_HUB_SECRET,detail:'MEMOIRE_HUB_SECRET'},
   ]},
   {type:'notes',title:'Avant l’ouverture commerciale',items:['Compléter l’identité juridique de l’exploitant, le contact de confidentialité et les conditions de vente définitives.','Le programme est une formation indépendante et ne revendique pas de reconnaissance OACIQ.']},
  ]},
 ]};
}

export async function ateliersAction(admin:Admin,action:string,p:Record<string,any>,origin:string):Promise<HubActionResult>{
 const sql=db();
 if(action==='access'){const id=uuid(p.userId);const days=Number(p.days);if(!Number.isInteger(days)||days<0||days>365)throw new ApiError('Durée invalide');await sql`UPDATE users SET access_until=now()+(${days} * interval '1 day') WHERE id=${id} AND role='member'`;await sql`INSERT INTO audit_log(actor,action,target) VALUES(${admin.id},${'access:'+days},${id})`;return {ok:true,message:days?`Accès ouvert pour ${days} jours.`:'Accès retiré.'}}
 if(action==='review'){const id=uuid(p.id);const grade=Number(p.grade);if(!Number.isInteger(grade)||grade<0||grade>100)throw new ApiError('Note invalide');const feedback=textField(p.feedback,10000);await sql`UPDATE submissions SET grade=${grade},feedback=${feedback},status=${grade>=80?'approved':'revision'},updated_at=now() WHERE id=${id}`;await sql`INSERT INTO audit_log(actor,action,target) VALUES(${admin.id},'review',${id})`;return {ok:true,message:'Correction transmise au membre.'}}
 if(action==='reset'){const id=uuid(p.userId),token=randomBytes(32).toString('hex');await sql`INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(${digest(token)},${id},now()+interval '1 hour')`;await sql`INSERT INTO audit_log(actor,action,target) VALUES(${admin.id},'password-reset',${id})`;return {ok:true,message:'Lien valable une heure, à transmettre uniquement à la personne concernée.',url:new URL('/?view=reset&token='+token,origin).href}}
 if(action==='message'){const id=uuid(p.userId);const body=textField(p.body,5000);const found=await sql`SELECT id FROM users WHERE id=${id}`;if(!found.length)throw new ApiError('Membre introuvable',404);await sql`INSERT INTO messages(thread_user_id,sender_id,body) VALUES(${id},${admin.id},${body})`;return {ok:true,message:'Message envoyé.'}}
 if(action==='coaching'){
  const title=textField(p.title,150),description=String(p.description||'').slice(0,2000);
  // La date saisie est l'heure de Montréal ; on calcule le décalage réel (été/hiver) à cette date.
  const local=String(p.date||'');if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw new ApiError('Date invalide');
  const date=montrealToUtc(local);if(date<=new Date())throw new ApiError('Choisissez une date future.');
  let url:URL;try{url=new URL(textField(p.meeting_url,1000))}catch{throw new ApiError('Lien invalide')}
  if(url.protocol!=='https:'||!(/(^|\.)(zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|meet\.jit\.si)$/.test(url.hostname)))throw new ApiError('Utilisez un lien HTTPS Zoom, Meet, Teams ou Jitsi.');
  const capacity=Number(p.capacity),duration=Number(p.duration);if(!Number.isInteger(capacity)||capacity<1||capacity>100||!Number.isInteger(duration)||duration<15||duration>240)throw new ApiError('Durée ou nombre de places invalide.');
  await sql`INSERT INTO coaching(title,description,starts_at,duration,capacity,meeting_url) VALUES(${title},${description},${date.toISOString()},${duration},${capacity},${url.href})`;
  return {ok:true,message:'Séance publiée.'};
 }
 if(action==='coaching-delete'){await sql`DELETE FROM coaching WHERE id=${uuid(p.id)}`;return {ok:true,message:'Séance annulée.'}}
 if(action==='refund'||action==='subscription'){
  if(!process.env.STRIPE_SECRET_KEY)throw new ApiError('Stripe non configuré.');
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
  if(action==='refund'){
   const pi=String(p.paymentIntent||'');if(!/^pi_[A-Za-z0-9]+$/.test(pi))throw new ApiError('Paiement invalide');
   try{await stripe.refunds.create({payment_intent:pi})}catch(e){throw new ApiError(e instanceof Stripe.errors.StripeError?e.message:'Remboursement refusé par Stripe.')}
   await sql`INSERT INTO audit_log(actor,action,target) VALUES(${admin.id},'stripe-refund',${pi})`;
   return {ok:true,message:'Remboursement envoyé. Le client le reçoit sous 5 à 10 jours ouvrables.'};
  }
  const id=String(p.id||'');if(!/^sub_[A-Za-z0-9]+$/.test(id))throw new ApiError('Abonnement invalide');
  const cancel=p.cancel===true;
  try{await stripe.subscriptions.update(id,{cancel_at_period_end:cancel})}catch(e){throw new ApiError(e instanceof Stripe.errors.StripeError?e.message:'Modification refusée par Stripe.')}
  await sql`INSERT INTO audit_log(actor,action,target) VALUES(${admin.id},${cancel?'stripe-cancel':'stripe-resume'},${id})`;
  return {ok:true,message:cancel?'L’abonnement s’arrêtera à la fin de la période payée.':'Abonnement réactivé.'};
 }
 throw new ApiError('Action introuvable',404);
}

function montrealToUtc(local:string){
 const guess=new Date(local+'Z');
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(guess);
 const g=(t:string)=>Number(parts.find(x=>x.type===t)?.value);
 const asMontreal=Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'));
 return new Date(guess.getTime()-(asMontreal-guess.getTime()));
}
