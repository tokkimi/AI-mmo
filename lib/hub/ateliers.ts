import Stripe from 'stripe';
import {randomBytes} from 'node:crypto';
import {db,digest,ApiError,textField,uuid} from '@/lib/server';
import {catalog} from '@/content/catalog';
import type {HubSnapshot,HubActionResult,HubRow} from './types';

// Sections d'administration i-ateliers, lues directement dans la base Neon du site.
// Les actions reprennent les mêmes validations que /api/admin/* et écrivent au journal d'audit.

type Admin={id:string};

async function stripeSales(){
 if(!process.env.STRIPE_SECRET_KEY)return null;
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
  const list=await stripe.checkout.sessions.list({limit:100,status:'complete'});
  return list.data.filter(s=>s.payment_status==='paid'||s.mode==='subscription').map(s=>({
   id:s.id,date:new Date(s.created*1000).toISOString(),email:s.customer_details?.email||s.customer_email||'',
   offer:String(s.metadata?.offer||s.mode),amount:s.amount_total||0,currency:(s.currency||'cad').toUpperCase(),mode:s.mode,
  }));
 }catch(e){console.error('Stripe hub',e instanceof Error?e.message:'unknown');return null}
}

export async function ateliersSnapshot():Promise<HubSnapshot>{
 const sql=db();
 const [users,submissions,attempts,sessions,bookings,threads,audit,sales]=await Promise.all([
  sql`SELECT id,name,email,role,access_until,city,agency,created_at,stripe_subscription FROM users ORDER BY created_at DESC`,
  sql`SELECT s.id,s.lesson_id,s.body,s.status,s.grade,s.feedback,s.updated_at,u.name,u.email FROM submissions s JOIN users u ON u.id=s.user_id ORDER BY (s.status='submitted') DESC,s.updated_at DESC`,
  sql`SELECT user_id,lesson_id,max(score)::int AS score FROM attempts GROUP BY user_id,lesson_id`,
  sql`SELECT c.*,(SELECT count(*)::int FROM bookings b WHERE b.session_id=c.id) AS booked FROM coaching c ORDER BY starts_at DESC`,
  sql`SELECT b.session_id,b.created_at,u.name,u.email,c.title FROM bookings b JOIN users u ON u.id=b.user_id JOIN coaching c ON c.id=b.session_id ORDER BY b.created_at DESC`,
  sql`SELECT u.id,u.name,u.email,count(m.id)::int AS total,max(m.created_at) AS last_at,(SELECT m2.body FROM messages m2 WHERE m2.thread_user_id=u.id ORDER BY m2.created_at DESC LIMIT 1) AS last_body,(SELECT r.role FROM messages m3 JOIN users r ON r.id=m3.sender_id WHERE m3.thread_user_id=u.id ORDER BY m3.created_at DESC LIMIT 1) AS last_role FROM messages m JOIN users u ON u.id=m.thread_user_id GROUP BY u.id,u.name,u.email ORDER BY max(m.created_at) DESC LIMIT 200`,
  sql`SELECT a.action,a.target,a.created_at,u.name FROM audit_log a LEFT JOIN users u ON u.id=a.actor ORDER BY a.created_at DESC LIMIT 100`,
  stripeSales(),
 ]);
 const now=Date.now();
 const members=users.filter((u:any)=>u.role==='member');
 const active=members.filter((u:any)=>u.access_until&&new Date(u.access_until).getTime()>now);
 const toReview=submissions.filter((s:any)=>s.status==='submitted');
 const upcoming=sessions.filter((s:any)=>new Date(s.starts_at).getTime()>now);
 const awaiting=threads.filter((t:any)=>t.last_role==='member');
 const passed=(id:string)=>attempts.filter((a:any)=>a.user_id===id&&a.score>=80&&catalog.some(l=>l.id===a.lesson_id)).length;
 const month=now-30*86400000;
 const sales30=(sales||[]).filter(s=>new Date(s.date).getTime()>month).reduce((t,s)=>t+s.amount,0);
 const lessonTitle=(id:string)=>catalog.find(l=>l.id===id)?.title||('Ancien programme · '+id);
 const byMonth=new Map<string,number>();for(const s of sales||[]){const k=s.date.slice(0,7);byMonth.set(k,(byMonth.get(k)||0)+s.amount)}

 const memberRows:HubRow[]=users.map((u:any)=>({
  name:u.name,email:u.email,
  access:u.role==='admin'?'Administrateur':u.access_until&&new Date(u.access_until).getTime()>now?'Actif':u.access_until?'Expiré':'Découverte',
  until:u.access_until?new Date(u.access_until).toISOString():null,
  progress:`${passed(u.id)}/${catalog.length}`,city:u.city||'',created:new Date(u.created_at).toISOString(),
  _actions:u.role==='admin'?[{label:'Lien mot de passe',action:'reset',payload:{userId:u.id}}]:[
   {label:'Accès 30 j',action:'access',payload:{userId:u.id,days:30}},
   {label:'Accès 1 an',action:'access',payload:{userId:u.id,days:365}},
   {label:'Retirer l’accès',action:'access',payload:{userId:u.id,days:0},confirm:`Retirer l’accès complet à ${u.name} ?`,tone:'danger'},
   {label:'Écrire',action:'message',payload:{userId:u.id},fields:[{name:'body',label:`Message à ${u.name}`,type:'textarea',required:true}]},
   {label:'Lien mot de passe',action:'reset',payload:{userId:u.id},confirm:'Générer un lien de réinitialisation valable une heure ? Communiquez-le uniquement à la personne, après vérification de son identité.'},
  ],
 }));

 return {generatedAt:new Date().toISOString(),currency:'CAD',sections:[
  {id:'overview',label:'Vue d’ensemble',icon:'⌂',blocks:[
   {type:'metrics',items:[
    {label:'Membres inscrits',value:members.length},
    {label:'Accès actifs',value:active.length},
    {label:'Travaux à corriger',value:toReview.length},
    {label:'Séances à venir',value:upcoming.length},
    {label:'Messages en attente',value:awaiting.length},
    {label:'Ventes 30 jours',value:sales?sales30:'—',format:sales?'money':undefined,hint:sales?'Stripe, paiements réussis':'Stripe non configuré'},
   ]},
   {type:'table',title:'Derniers inscrits',columns:[{key:'name',label:'Membre'},{key:'email',label:'Courriel'},{key:'access',label:'Accès',format:'badge'},{key:'created',label:'Inscription',format:'date'}],rows:memberRows.slice(0,8).map(({_actions,...r})=>r),empty:'Aucun membre pour le moment.'},
  ]},
  {id:'members',label:'Membres & accès',icon:'◎',badge:members.length,blocks:[
   {type:'table',title:'Membres',description:'Les accès invités s’ouvrent immédiatement. Les liens de mot de passe expirent après une heure.',columns:[{key:'name',label:'Membre'},{key:'email',label:'Courriel'},{key:'access',label:'Accès',format:'badge'},{key:'until',label:'Jusqu’au',format:'date'},{key:'progress',label:'QCM réussis'},{key:'city',label:'Ville'}],rows:memberRows,empty:'Aucun membre.'},
  ]},
  {id:'work',label:'Travaux à corriger',icon:'✎',badge:toReview.length,blocks:[
   {type:'table',title:'Travaux déposés',description:'80 et plus : validé. En dessous : à retravailler. Le membre retrouve le retour dans sa leçon.',columns:[{key:'status',label:'Statut',format:'badge'},{key:'lesson',label:'Leçon'},{key:'member',label:'Membre'},{key:'body',label:'Travail',format:'longtext'},{key:'grade',label:'Note',align:'right'},{key:'updated',label:'Mis à jour',format:'date'}],
    rows:submissions.map((s:any)=>({status:s.status==='submitted'?'À corriger':s.status==='approved'?'Validé':'À retravailler',lesson:lessonTitle(s.lesson_id),member:`${s.name} · ${s.email}`,body:s.body,grade:s.grade,updated:new Date(s.updated_at).toISOString(),
     _actions:[{label:s.status==='submitted'?'Corriger':'Modifier la note',action:'review',payload:{id:s.id},fields:[{name:'grade',label:'Note sur 100',type:'number',min:0,max:100,required:true,default:s.grade??80},{name:'feedback',label:'Retour au membre',type:'textarea',required:true,default:s.feedback||''}]}]})),
    empty:'Aucun travail déposé pour le moment.'},
  ]},
  {id:'sessions',label:'Visioconférences',icon:'▶',badge:upcoming.length,blocks:[
   {type:'form',title:'Programmer une séance',description:'Créez la réunion chez Zoom, Meet, Teams ou Jitsi puis collez le lien ici.',action:{label:'Publier la séance',action:'coaching',fields:[
    {name:'title',label:'Titre',type:'text',required:true},
    {name:'description',label:'Description',type:'textarea'},
    {name:'date',label:'Date et heure à Montréal',type:'datetime-local',required:true},
    {name:'duration',label:'Durée (minutes)',type:'number',min:15,max:240,default:60,required:true},
    {name:'capacity',label:'Places',type:'number',min:1,max:100,default:10,required:true},
    {name:'meeting_url',label:'Lien Zoom, Meet, Teams ou Jitsi',type:'url',required:true,placeholder:'https://meet.google.com/…'},
   ]}},
   {type:'table',title:'Séances',columns:[{key:'title',label:'Séance'},{key:'starts',label:'Date (Montréal)',format:'datetime'},{key:'duration',label:'Durée',align:'right'},{key:'seats',label:'Inscrits',align:'right'},{key:'url',label:'Lien',format:'link'}],
    rows:sessions.map((s:any)=>({title:s.title,starts:new Date(s.starts_at).toISOString(),duration:`${s.duration} min`,seats:`${s.booked}/${s.capacity}`,url:s.meeting_url,_actions:[{label:'Annuler',action:'coaching-delete',payload:{id:s.id},confirm:'Annuler cette séance et ses réservations ?',tone:'danger'}]})),empty:'Aucune séance programmée.'},
   {type:'table',title:'Réservations',columns:[{key:'name',label:'Membre'},{key:'email',label:'Courriel'},{key:'title',label:'Séance'},{key:'created',label:'Réservé le',format:'date'}],rows:bookings.map((b:any)=>({name:b.name,email:b.email,title:b.title,created:new Date(b.created_at).toISOString()})),empty:'Aucune réservation.'},
  ]},
  {id:'messages',label:'Messagerie',icon:'◉',badge:awaiting.length,blocks:[
   {type:'table',title:'Conversations',description:'« En attente » : le dernier message vient du membre.',columns:[{key:'state',label:'État',format:'badge'},{key:'name',label:'Membre'},{key:'last',label:'Dernier message',format:'longtext'},{key:'total',label:'Messages',align:'right'},{key:'at',label:'Le',format:'datetime'}],
    rows:threads.map((t:any)=>({state:t.last_role==='member'?'En attente':'Répondu',name:`${t.name} · ${t.email}`,last:t.last_body,total:t.total,at:new Date(t.last_at).toISOString(),_actions:[{label:'Répondre',action:'message',payload:{userId:t.id},fields:[{name:'body',label:`Réponse à ${t.name}`,type:'textarea',required:true}]}]})),empty:'Aucune conversation.'},
  ]},
  {id:'sales',label:'Ventes',icon:'$',blocks:sales?[
   {type:'metrics',items:[{label:'Ventes 30 jours',value:sales30,format:'money'},{label:'Ventes listées',value:sales.length},{label:'Total listé',value:sales.reduce((t,s)=>t+s.amount,0),format:'money',hint:'100 dernières sessions Stripe'}]},
   {type:'bars',title:'Revenu par mois',format:'money',items:[...byMonth].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12).map(([label,value])=>({label,value}))},
   {type:'table',title:'Paiements Stripe',columns:[{key:'date',label:'Date',format:'datetime'},{key:'email',label:'Client'},{key:'offer',label:'Offre'},{key:'mode',label:'Type',format:'badge'},{key:'amount',label:'Montant',format:'money',align:'right'}],rows:sales.map(s=>({date:s.date,email:s.email,offer:s.offer,mode:s.mode==='subscription'?'Abonnement':'Paiement',amount:s.amount})),empty:'Aucune vente pour le moment.'},
  ]:[{type:'notes',title:'Stripe non configuré',items:['Ajoutez STRIPE_SECRET_KEY dans le projet Vercel ai-mmo pour afficher les ventes i-ateliers ici.']}]},
  {id:'audit',label:'Journal d’activité',icon:'≡',blocks:[
   {type:'table',title:'Dernières actions d’administration',columns:[{key:'at',label:'Date',format:'datetime'},{key:'who',label:'Par'},{key:'action',label:'Action'},{key:'target',label:'Cible'}],rows:audit.map((a:any)=>({at:new Date(a.created_at).toISOString(),who:a.name||'—',action:a.action,target:a.target})),empty:'Aucune action enregistrée.'},
  ]},
  {id:'setup',label:'Configuration',icon:'⚙',blocks:[
   {type:'status',title:'État de la plateforme',items:[
    {label:'Base de données Neon',ok:true},
    {label:'Paiements Stripe',ok:!!process.env.STRIPE_SECRET_KEY,detail:'STRIPE_SECRET_KEY'},
    {label:'Webhook Stripe',ok:!!process.env.STRIPE_WEBHOOK_SECRET,detail:'STRIPE_WEBHOOK_SECRET'},
    {label:'Connexion Guides Immo Québec',ok:!!process.env.GUIDES_HUB_SECRET,detail:'GUIDES_HUB_SECRET'},
    {label:'Connexion Mémoire Maison',ok:!!process.env.MEMOIRE_HUB_SECRET,detail:'MEMOIRE_HUB_SECRET'},
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
 throw new ApiError('Action introuvable',404);
}

function montrealToUtc(local:string){
 const guess=new Date(local+'Z');
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(guess);
 const g=(t:string)=>Number(parts.find(x=>x.type===t)?.value);
 const asMontreal=Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'));
 return new Date(guess.getTime()-(asMontreal-guess.getTime()));
}
