import {NextRequest,NextResponse} from 'next/server';
import {currentUser,rateLimit,ApiError} from '@/lib/server';
import {findProject,isConsoleAdmin,remoteAction,HubUnavailable} from '@/lib/hub/projects';
import {ateliersAction} from '@/lib/hub/ateliers';

export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});

// Point d'entrée unique des actions de la console : vérifie la session admin i-ateliers,
// puis exécute l'action localement (i-ateliers) ou la transmet au seul site concerné.
export async function POST(req:NextRequest){
 try{
  if(req.headers.get('origin')!==new URL(req.url).origin)throw new ApiError('Origine non autorisée',403);
  const user=await currentUser();
  if(!user||!isConsoleAdmin(user))throw new ApiError('Accès administrateur requis',403);
  await rateLimit('console:'+user.id,120);
  const raw=await req.text();if(raw.length>100000)throw new ApiError('Requête trop volumineuse',413);
  let body:any;try{body=JSON.parse(raw)}catch{throw new ApiError('Données invalides')}
  const project=findProject(body?.project);if(!project)throw new ApiError('Site inconnu',404);
  const action=typeof body.action==='string'?body.action:'';if(!action||action.length>60)throw new ApiError('Action invalide');
  const payload=body.payload&&typeof body.payload==='object'?body.payload:{};
  const result=project.id==='ateliers'?await ateliersAction({id:String(user.id)},action,payload,new URL(req.url).origin):await remoteAction(project,action,payload);
  return json(result,result.ok?200:400);
 }catch(e){
  if(e instanceof ApiError)return json({error:e.message},e.status);
  if(e instanceof HubUnavailable)return json({error:e.message},502);
  console.error('Console action',e instanceof Error?e.message:'unknown');
  return json({error:'Une erreur est survenue. Réessayez dans un instant.'},500);
 }
}
