import {NextRequest,NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {randomBytes} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {db,currentUser,hasAccess,createSession,rateLimit,digest,ApiError,textField,uuid} from '@/lib/server';
import {catalog} from '@/content/catalog';
import {lessons,publicLesson} from '@/content/lessons';
import {autonomousLessons,safeAutonomous} from '@/content/autonomous-lessons';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function handle(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){try{
 const {path}=await params; const route=path.join('/');const sql=db();const user=await currentUser();
 if(req.method==='POST'){
  const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)throw new ApiError('Origine non autorisée',403);
  if(Number(req.headers.get('content-length')||0)>100000)throw new ApiError('Requête trop volumineuse',413);
 }
 if(req.method==='GET'){
  if(route==='me')return json({user,access:hasAccess(user),paymentsConfigured:!!process.env.STRIPE_SECRET_KEY&&!!process.env.STRIPE_PRICE_ID});
  if(route==='autonomous'){if(!hasAccess(user))throw new ApiError('Accès actif requis pour les ateliers autonomes.',403);const lesson=autonomousLessons.find(l=>l.id===req.nextUrl.searchParams.get('id'));if(!lesson)throw new ApiError('Atelier introuvable',404);return json(safeAutonomous(lesson));}
  if(route==='lesson'){
   const lesson=lessons.find(l=>l.id===req.nextUrl.searchParams.get('id'));if(!lesson)throw new ApiError('Leçon introuvable',404);
   if(!hasAccess(user))throw new ApiError('Connectez-vous avec un accès actif pour ouvrir cette leçon.',403);
   const submitted=user?await sql`SELECT id FROM submissions WHERE user_id=${user.id} AND lesson_id=${lesson.id}`:[];return json(publicLesson(lesson,!!submitted.length));
  }
  if(route==='prompts'){if(!user)throw new ApiError('Connexion requise.',401);if(!hasAccess(user))throw new ApiError('Accès actif requis pour consulter les prompts.',403);return json(lessons.map(l=>({id:l.id,title:l.title,prompt:l.prompt})));}
  if(!user)throw new ApiError('Connectez-vous pour continuer.',401);
  if(route==='progress'){const [attempts,submissions,notes,favorites]=await Promise.all([sql`SELECT * FROM attempts WHERE user_id=${user.id} ORDER BY created_at DESC`,sql`SELECT * FROM submissions WHERE user_id=${user.id}`,sql`SELECT * FROM notes WHERE user_id=${user.id}`,sql`SELECT lesson_id FROM favorites WHERE user_id=${user.id}`]);return json({attempts,submissions,notes,favorites})}
  if(route==='export'){const [attempts,submissions,notes,messages]=await Promise.all([sql`SELECT * FROM attempts WHERE user_id=${user.id}`,sql`SELECT * FROM submissions WHERE user_id=${user.id}`,sql`SELECT * FROM notes WHERE user_id=${user.id}`,sql`SELECT body,created_at FROM messages WHERE thread_user_id=${user.id}`]);return json({profile:user,attempts,submissions,notes,messages})}
  if(route==='messages'){const thread=user.role==='admin'&&req.nextUrl.searchParams.get('user')?uuid(req.nextUrl.searchParams.get('user')):user.id;return json(await sql`SELECT m.id,m.body,m.created_at,m.sender_id,u.name,u.role FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.thread_user_id=${thread} ORDER BY m.created_at LIMIT 500`)}
  if(route==='coaching'){const rows=await sql`SELECT c.id,c.title,c.description,c.starts_at,c.duration,c.capacity,CASE WHEN ${hasAccess(user)} THEN c.meeting_url ELSE NULL END AS meeting_url,(SELECT count(*)::int FROM bookings b WHERE b.session_id=c.id) AS booked,EXISTS(SELECT 1 FROM bookings b WHERE b.session_id=c.id AND b.user_id=${user.id}) AS reserved FROM coaching c ORDER BY starts_at`;return json(rows)}
  if(route==='admin'){
   if(user.role!=='admin')throw new ApiError('Accès administrateur requis',403);
   const [users,submissions,attempts,bookings]=await Promise.all([sql`SELECT id,name,email,role,access_until,city,agency,created_at FROM users ORDER BY created_at DESC`,sql`SELECT s.*,u.name,u.email FROM submissions s JOIN users u ON u.id=s.user_id ORDER BY updated_at DESC`,sql`SELECT user_id,lesson_id,max(score)::int AS score FROM attempts GROUP BY user_id,lesson_id`,sql`SELECT b.*,u.name,c.title FROM bookings b JOIN users u ON u.id=b.user_id JOIN coaching c ON c.id=b.session_id`]);return json({users,submissions,attempts,bookings});
  }
  throw new ApiError('Page introuvable',404);
 }
 const raw=await req.text();if(raw.length>100000)throw new ApiError('Requête trop volumineuse',413);let b:any;try{b=JSON.parse(raw)}catch{throw new ApiError('Données invalides')}
 if(route==='auth/login'||route==='auth/register'){
  const email=textField(b.email,254).toLowerCase();const password=textField(b.password,72);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ApiError('Adresse courriel invalide');
  await rateLimit('auth:'+email,12);await rateLimit('ip:'+req.headers.get('x-forwarded-for'),60);
  if(route==='auth/register'){
   if(password.length<12||Buffer.byteLength(password)>72)throw new ApiError('Mot de passe : 12 caractères minimum, 72 octets maximum.');
   if(b.accept!==true)throw new ApiError('Acceptez les conditions et la confidentialité.');
   const name=textField(b.name,100);const hash=await bcrypt.hash(password,12);
   const rows=await sql`INSERT INTO users(email,name,password_hash) VALUES(${email},${name},${hash}) ON CONFLICT(email) DO NOTHING RETURNING id`;
   if(!rows.length)throw new ApiError('Impossible de créer ce compte. Essayez de vous connecter.');await createSession(rows[0].id);return json({ok:true});
  }
  const rows=await sql`SELECT id,password_hash FROM users WHERE email=${email}`;
  if(!rows.length||!await bcrypt.compare(password,rows[0].password_hash))throw new ApiError('Courriel ou mot de passe incorrect.',401);
  await createSession(rows[0].id);return json({ok:true});
 }
 if(route==='auth/reset'){
  await rateLimit('reset:'+req.headers.get('x-forwarded-for'),10);const token=textField(b.token,128);const password=textField(b.password,72);if(password.length<12||Buffer.byteLength(password)>72)throw new ApiError('Choisissez un mot de passe de 12 caractères minimum.');
  const rows=await sql`DELETE FROM password_resets WHERE token_hash=${digest(token)} AND expires_at>now() RETURNING user_id`;if(!rows.length)throw new ApiError('Lien expiré ou invalide.');
  await sql`UPDATE users SET password_hash=${await bcrypt.hash(password,12)} WHERE id=${rows[0].user_id}`;await sql`DELETE FROM sessions WHERE user_id=${rows[0].user_id}`;return json({ok:true});
 }
 if(!user)throw new ApiError('Connectez-vous pour continuer.',401);
 await rateLimit('write:'+user.id,150);
 if(route==='auth/logout'){const t=(await cookies()).get('ai_session')?.value;if(t)await sql`DELETE FROM sessions WHERE token_hash=${digest(t)}`;(await cookies()).delete('ai_session');return json({ok:true})}
 if(route==='profile'){
  const name=textField(b.name,100);const city=String(b.city||'').slice(0,100),agency=String(b.agency||'').slice(0,150),bio=String(b.bio||'').slice(0,1500),goal=String(b.goal||'').slice(0,500),level=String(b.level||'Débutant').slice(0,30);const weekly=Math.max(1,Math.min(20,Number(b.weekly_goal)||3));
  await sql`UPDATE users SET name=${name},city=${city},agency=${agency},bio=${bio},goal=${goal},level=${level},weekly_goal=${weekly} WHERE id=${user.id}`;return json({ok:true});
 }
 if(route==='password'){const old=textField(b.current,72),next=textField(b.password,72);if(next.length<12||Buffer.byteLength(next)>72)throw new ApiError('12 caractères minimum, 72 octets maximum.');const rows=await sql`SELECT password_hash FROM users WHERE id=${user.id}`;if(!await bcrypt.compare(old,rows[0].password_hash))throw new ApiError('Mot de passe actuel incorrect.');await sql`UPDATE users SET password_hash=${await bcrypt.hash(next,12)} WHERE id=${user.id}`;await sql`DELETE FROM sessions WHERE user_id=${user.id}`;await createSession(user.id);return json({ok:true})}
 if(route==='messages'){const body=textField(b.body,5000);const thread=user.role==='admin'?uuid(b.userId):user.id;const found=await sql`SELECT id FROM users WHERE id=${thread}`;if(!found.length)throw new ApiError('Membre introuvable',404);await sql`INSERT INTO messages(thread_user_id,sender_id,body) VALUES(${thread},${user.id},${body})`;return json({ok:true})}
 if(route.startsWith('admin/')){
  if(user.role!=='admin')throw new ApiError('Accès administrateur requis',403);
  if(route==='admin/access'){const id=uuid(b.userId);const days=Number(b.days);if(!Number.isInteger(days)||days<0||days>365)throw new ApiError('Durée invalide');await sql`UPDATE users SET access_until=now()+(${days} * interval '1 day') WHERE id=${id} AND role='member'`;await sql`INSERT INTO audit_log(actor,action,target) VALUES(${user.id},${'access:'+days},${id})`;return json({ok:true})}
  if(route==='admin/review'){const id=uuid(b.id);const grade=Number(b.grade);if(!Number.isInteger(grade)||grade<0||grade>100)throw new ApiError('Note invalide');const feedback=textField(b.feedback,10000);await sql`UPDATE submissions SET grade=${grade},feedback=${feedback},status=${grade>=80?'approved':'revision'},updated_at=now() WHERE id=${id}`;await sql`INSERT INTO audit_log(actor,action,target) VALUES(${user.id},'review',${id})`;return json({ok:true})}
  if(route==='admin/reset'){const id=uuid(b.userId),token=randomBytes(32).toString('hex');await sql`INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(${digest(token)},${id},now()+interval '1 hour')`;await sql`INSERT INTO audit_log(actor,action,target) VALUES(${user.id},'password-reset',${id})`;return json({url:new URL('/?view=reset&token='+token,req.url).href})}
  if(route==='admin/coaching'){
   const title=textField(b.title,150),description=String(b.description||'').slice(0,2000);const date=new Date(b.starts_at);if(isNaN(date.getTime())||date<=new Date())throw new ApiError('Choisissez une date future.');const url=new URL(textField(b.meeting_url,1000));if(url.protocol!=='https:'||!(/(^|\.)(zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|meet\.jit\.si)$/.test(url.hostname)))throw new ApiError('Utilisez un lien HTTPS Zoom, Meet, Teams ou Jitsi.');const capacity=Number(b.capacity),duration=Number(b.duration);if(!Number.isInteger(capacity)||capacity<1||capacity>100||!Number.isInteger(duration)||duration<15||duration>240)throw new ApiError('Capacité ou durée invalide');await sql`INSERT INTO coaching(title,description,starts_at,duration,capacity,meeting_url) VALUES(${title},${description},${date.toISOString()},${duration},${capacity},${url.href})`;return json({ok:true});
  }
  if(route==='admin/coaching-delete'){await sql`DELETE FROM coaching WHERE id=${uuid(b.id)}`;return json({ok:true})}
  throw new ApiError('Action introuvable',404);
 }
 const lesson=[...lessons,...autonomousLessons].find(l=>l.id===b.lessonId);
 if(['quiz','submission','note','favorite'].includes(route)){
  if(!lesson)throw new ApiError('Leçon introuvable',404);if(!hasAccess(user))throw new ApiError('Accès complet requis.',403);
  if(route==='quiz'){
   if(!Array.isArray(b.answers)||b.answers.length!==lesson.questions.length||b.answers.some((a:any,i:number)=>!Number.isInteger(a)||a<0||a>=lesson.questions[i].options.length))throw new ApiError('Répondez à chaque question.');
   const score=Math.round(100*lesson.questions.filter((q,i)=>q.answer===b.answers[i]).length/lesson.questions.length);
   await sql`INSERT INTO attempts(user_id,lesson_id,answers,score) VALUES(${user.id},${lesson.id},${JSON.stringify(b.answers)}::jsonb,${score})`;
   return json({score,passed:score>=80,corrections:lesson.questions.map(q=>({answer:q.answer,explanation:q.explanation}))});
  }
  if(route==='submission'){const body=textField(b.body,30000);if(body.length<80)throw new ApiError('Développez votre réponse : 80 caractères minimum.');await sql`INSERT INTO submissions(user_id,lesson_id,body) VALUES(${user.id},${lesson.id},${body}) ON CONFLICT(user_id,lesson_id) DO UPDATE SET body=EXCLUDED.body,status='submitted',grade=NULL,feedback='',updated_at=now()`;return json({ok:true})}
  if(route==='note'){const body=String(b.body||'').slice(0,10000);await sql`INSERT INTO notes(user_id,lesson_id,body) VALUES(${user.id},${lesson.id},${body}) ON CONFLICT(user_id,lesson_id) DO UPDATE SET body=EXCLUDED.body`;return json({ok:true})}
  if(route==='favorite'){if(b.active)await sql`INSERT INTO favorites(user_id,lesson_id) VALUES(${user.id},${lesson.id}) ON CONFLICT DO NOTHING`;else await sql`DELETE FROM favorites WHERE user_id=${user.id} AND lesson_id=${lesson.id}`;return json({ok:true})}
 }
 if(route==='booking'){
  if(!hasAccess(user))throw new ApiError('Accès complet requis',403);const id=uuid(b.id);
  if(b.cancel){await sql`DELETE FROM bookings WHERE session_id=${id} AND user_id=${user.id}`;return json({ok:true})}
  const result=await sql.transaction(tx=>[tx`SELECT id FROM coaching WHERE id=${id} FOR UPDATE`,tx`INSERT INTO bookings(session_id,user_id) SELECT id,${user.id} FROM coaching WHERE id=${id} AND starts_at>now() AND (SELECT count(*) FROM bookings WHERE session_id=${id})<capacity ON CONFLICT DO NOTHING RETURNING session_id`]);
  if(!result[1].length)throw new ApiError('Séance complète, passée ou déjà réservée.');return json({ok:true});
 }
 throw new ApiError('Action introuvable',404);
 }catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);console.error('API error',e instanceof Error?e.message:'unknown');return json({error:'Une erreur est survenue. Réessayez dans un instant.'},500)}}
export const GET=handle;export const POST=handle;
