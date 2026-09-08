import {neon} from '@neondatabase/serverless';
import {cookies} from 'next/headers';
import {createHash,randomBytes} from 'node:crypto';
export function db(){if(!process.env.DATABASE_URL)throw new Error('Base indisponible');return neon(process.env.DATABASE_URL)}
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
export async function currentUser(){const t=(await cookies()).get('ai_session')?.value;if(!t)return null;const rows=await db()`SELECT u.id,u.email,u.name,u.role,u.access_until,u.city,u.agency,u.bio,u.goal,u.level,u.weekly_goal,u.stripe_customer FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${digest(t)} AND s.expires_at>now()`;return rows[0]||null}
export function hasAccess(u:any){return !!u&&(u.role==='admin'||(u.access_until&&new Date(u.access_until)>new Date()))}
export async function createSession(id:string){const token=randomBytes(32).toString('hex');await db()`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(${digest(token)},${id},now()+interval '7 days')`; (await cookies()).set('ai_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:604800});}
export async function rateLimit(key:string,limit=20){const rows=await db()`INSERT INTO rate_limits(key,count,expires_at) VALUES(${digest(key)},1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.count+1 END,expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+interval '15 minutes' ELSE rate_limits.expires_at END RETURNING count`;if(rows[0].count>limit)throw new ApiError('Trop de tentatives. Réessayez dans 15 minutes.',429)}
export class ApiError extends Error{constructor(message:string,public status=400){super(message)}}
export function textField(value:unknown,max=1000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new ApiError('Champ manquant ou trop long.');return value.trim()}
export function uuid(v:unknown){if(typeof v!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))throw new ApiError('Identifiant invalide');return v}
