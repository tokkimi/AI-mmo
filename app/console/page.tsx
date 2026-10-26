import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/server';
import {projects,findProject,isConsoleAdmin,remoteSnapshot,HubUnavailable} from '@/lib/hub/projects';
import {ateliersSnapshot} from '@/lib/hub/ateliers';
import type {HubSnapshot} from '@/lib/hub/types';
import {ConsoleView} from './view';
import './console.css';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Console — Emilie Cauvier',robots:{index:false,follow:false}};

export default async function Console({searchParams}:{searchParams:Promise<{p?:string;s?:string}>}){
 const user=await currentUser();
 if(!user)redirect('/?view=login&next=console');
 if(!isConsoleAdmin(user))return <div className="console c-denied"><h1>Accès réservé à l’administration</h1><p>Connectez-vous avec le compte administrateur.</p><Link className="c-btn" href="/">Retour au site</Link></div>;

 const {p,s}=await searchParams;
 const project=findProject(p)||projects[0];
 let snapshot:HubSnapshot|null=null,error='';
 try{snapshot=project.id==='ateliers'?await ateliersSnapshot():await remoteSnapshot(project)}
 catch(e){error=e instanceof HubUnavailable?e.message:'Impossible de charger les données de ce site.';if(!(e instanceof HubUnavailable))console.error('Console',e instanceof Error?e.message:'unknown')}
 return <ConsoleView projects={projects} project={project} snapshot={snapshot} error={error} sectionId={s} userName={String(user.name||'Emilie Cauvier')}/>;
}
