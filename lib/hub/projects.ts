import type {HubSnapshot,HubActionResult} from './types';

// Les trois sites administrés depuis la console. Chaque site garde sa propre base :
// la console ne mélange jamais leurs données, elle interroge le site sélectionné uniquement.
export const projects=[
 {id:'ateliers',name:'i-ateliers',logo:'/console/ateliers.png',domain:'i-ateliers.com',site:'https://www.i-ateliers.com',admin:'https://www.i-ateliers.com/?view=admin',hub:null,secretEnv:null},
 {id:'guides',name:'Guides Immo Québec',logo:'/console/guides.png',domain:'guidesimmoquebec.com',site:'https://www.guidesimmoquebec.com',admin:'https://www.guidesimmoquebec.com/admin',hub:process.env.GUIDES_HUB_URL||'https://www.guidesimmoquebec.com/api/hub',secretEnv:'GUIDES_HUB_SECRET'},
 {id:'memoire',name:'Mémoire Maison',logo:'/console/memoire.png',domain:'memoiremaison.com',site:'https://memoiremaison.com',admin:'https://memoiremaison.com/admin',hub:process.env.MEMOIRE_HUB_URL||'https://memoiremaison.com/api/hub',secretEnv:'MEMOIRE_HUB_SECRET'},
] as const;

export type ProjectId=(typeof projects)[number]['id'];
export const findProject=(id:string|undefined)=>projects.find(p=>p.id===id);

// Super administrateurs de la console : rôle admin i-ateliers, ou adresse autorisée
// (CONSOLE_ADMIN_EMAILS, séparées par des virgules ; par défaut le compte d'Emilie).
export function isConsoleAdmin(user:{role?:string;email?:string}|null|undefined){
 if(!user)return false;if(user.role==='admin')return true;
 const allowed=(process.env.CONSOLE_ADMIN_EMAILS||'emilie@equipecauvier.com').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean);
 return !!user.email&&allowed.includes(String(user.email).toLowerCase());
}

export class HubUnavailable extends Error{}

async function call(project:(typeof projects)[number],init?:RequestInit){
 const secret=project.secretEnv?process.env[project.secretEnv]:undefined;
 if(!project.hub||!secret)throw new HubUnavailable(`Connexion non configurée : ajoutez ${project.secretEnv} dans le projet Vercel ai-mmo et HUB_SECRET (même valeur) dans le site ${project.name}.`);
 let res:Response;
 try{res=await fetch(project.hub,{...init,cache:'no-store',signal:AbortSignal.timeout(20000),headers:{authorization:`Bearer ${secret}`,'content-type':'application/json'}})}
 catch{throw new HubUnavailable(`${project.name} ne répond pas pour le moment.`)}
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw new HubUnavailable(data?.error||`${project.name} a refusé la demande (${res.status}).`);
 return data;
}

export async function remoteSnapshot(project:(typeof projects)[number]):Promise<HubSnapshot>{return call(project)}

export async function remoteAction(project:(typeof projects)[number],action:string,payload:unknown):Promise<HubActionResult>{
 return call(project,{method:'POST',body:JSON.stringify({action,payload})});
}
