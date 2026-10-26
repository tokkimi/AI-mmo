import Link from 'next/link';
import Image from 'next/image';
import {Home,Users,PenLine,Video,MessageSquare,Wallet,ScrollText,Settings,BookOpen,ShoppingBag,Briefcase,Printer,Link2,BarChart3,Mail,FileText,Rocket,Repeat,Receipt,Puzzle,FolderKanban,Library,GraduationCap,ExternalLink,ArrowLeft,Circle,type LucideIcon} from 'lucide-react';
import {formatCell} from '@/lib/hub/format';
import type {HubBlock,HubSnapshot} from '@/lib/hub/types';
import {ActionForm,Refresh} from './actions';
import {DataTable} from './table';

// Icônes : noms (i-ateliers) ou anciens glyphes envoyés par les sites connectés.
const icons:Record<string,LucideIcon>={
 home:Home,'⌂':Home,users:Users,'◎':Users,pen:PenLine,'✎':PenLine,video:Video,'▶':Video,chat:MessageSquare,'◉':MessageSquare,
 wallet:Wallet,'$':Wallet,log:ScrollText,'≡':ScrollText,settings:Settings,'⚙':Settings,book:BookOpen,cart:ShoppingBag,'□':ShoppingBag,
 briefcase:Briefcase,'◇':Briefcase,printer:Printer,'◫':Printer,link:Link2,'⌁':Link2,chart:BarChart3,'↗':BarChart3,mail:Mail,'✉':Mail,
 file:FileText,'✦':FileText,rocket:Rocket,'✓':Rocket,repeat:Repeat,receipt:Receipt,puzzle:Puzzle,folder:FolderKanban,'▤':FolderKanban,library:Library,school:GraduationCap,
};

export type ConsoleProject={id:string;name:string;logo:string;site:string;admin:string;domain:string};

export function ConsoleView({projects,project,snapshot,error,sectionId,userName}:{projects:readonly ConsoleProject[];project:ConsoleProject;snapshot:HubSnapshot|null;error:string;sectionId?:string;userName:string}){
 const sections=snapshot?.sections||[];
 const section=sections.find(x=>x.id===sectionId)||sections[0];
 const currency=snapshot?.currency||'CAD';
 const words=userName.trim().split(/\s+/).filter(Boolean);const initials=(words.length>1?words[0][0]+words[1][0]:userName.slice(0,2)).toUpperCase()||'EC';
 return <div className="console" data-project={project.id}>
  <header className="c-top">
   <div className="c-brand"><span className="c-brand-mark">EC</span><div><b>Emilie Cauvier</b><small>Console d’administration</small></div></div>
   <nav className="c-switch" aria-label="Choisir le site">
    {projects.map(x=><Link key={x.id} href={`/console?p=${x.id}`} className={x.id===project.id?'active':''} aria-current={x.id===project.id?'page':undefined} data-project={x.id}>
     <span className="c-logo"><Image src={x.logo} alt="" width={32} height={32}/></span><span className="c-switch-name">{x.name}</span>
    </Link>)}
   </nav>
   <div className="c-top-right">
    <a className="c-btn dark" href={project.site} target="_blank" rel="noreferrer"><ExternalLink size={14}/><span>Voir le site</span></a>
    <span className="c-avatar" title={userName}>{initials}</span>
   </div>
  </header>
  <div className="c-body">
   <aside className="c-side">
    <div className="c-side-project">
     <span className="c-logo lg"><Image src={project.logo} alt="" width={44} height={44}/></span>
     <div><b>{project.name}</b><a href={project.site} target="_blank" rel="noreferrer">{project.domain}</a></div>
    </div>
    <p className="c-side-title">Administration</p>
    <nav>{sections.map(x=>{const Icon=icons[x.icon||'']||Circle;return <Link key={x.id} href={`/console?p=${project.id}&s=${x.id}`} className={x.id===section?.id?'active':''} aria-current={x.id===section?.id?'page':undefined}>
     <Icon size={17} strokeWidth={1.8}/><span>{x.label}</span>{x.badge?<em>{x.badge}</em>:null}
    </Link>})}</nav>
    <div className="c-side-foot">
     <a href={project.admin} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Admin d’origine</a>
     <Link href="/"><ArrowLeft size={14}/>Retour au campus</Link>
    </div>
   </aside>
   <main className="c-main">
    {error?<div className="c-panel c-error"><h2>{project.name} n’est pas joignable</h2><p>{error}</p></div>
    :section?<>
     <div className="c-heading">
      <div><p>{project.name}</p><h1>{section.label}</h1></div>
      <div className="c-heading-right"><span className="c-live"><i/>Données en direct · {formatCell(snapshot!.generatedAt,'datetime')}</span><Refresh/></div>
     </div>
     {section.blocks.map((b,i)=><Block key={i} block={b} project={project.id} currency={currency}/>)}
    </>:<div className="c-panel"><p className="c-empty">Aucune section disponible.</p></div>}
   </main>
  </div>
 </div>;
}

function Block({block:b,project,currency}:{block:HubBlock;project:string;currency:string}){
 switch(b.type){
  case 'metrics':return <div className="c-metrics">{b.items.map(m=><div key={m.label} className="c-metric"><span>{m.label}</span><b>{typeof m.value==='number'?formatCell(m.value,m.format||'number',currency):m.value}</b>{m.hint&&<small>{m.hint}</small>}</div>)}</div>;
  case 'table':return <DataTable title={b.title} description={b.description} columns={b.columns} rows={b.rows} empty={b.empty} project={project} currency={currency}/>;
  case 'form':return <section className="c-panel"><div className="c-panel-head"><div><h2>{b.title}</h2>{b.description&&<p className="c-desc">{b.description}</p>}</div></div><ActionForm project={project} action={b.action}/></section>;
  case 'status':return <section className="c-panel"><h2>{b.title}</h2><ul className="c-status">{b.items.map(x=><li key={x.label}><i className={x.ok?'ok':'ko'}/><span>{x.label}</span>{x.detail&&<code>{x.detail}</code>}<mark className={`c-badge ${x.ok?'good':'warn'}`}>{x.ok?'Connecté':'À configurer'}</mark></li>)}</ul></section>;
  case 'bars':{const max=Math.max(1,...b.items.map(x=>Math.abs(x.value)));return <section className="c-panel"><h2>{b.title}</h2>{!b.items.length?<p className="c-empty">Pas encore de données.</p>:<div className="c-bars">{b.items.map(x=><div key={x.label} className="c-bar"><span>{x.label}</span><div><i style={{width:`${Math.max(1.5,100*Math.abs(x.value)/max)}%`}}/></div><b>{formatCell(x.value,b.format||'number',currency)}</b></div>)}</div>}</section>}
  case 'notes':return <section className="c-panel">{b.title&&<h2>{b.title}</h2>}<ul className="c-notes">{b.items.filter(Boolean).map(x=><li key={x}>{x}</li>)}</ul></section>;
  case 'links':return <section className="c-panel"><h2>{b.title}</h2><div className="c-links">{b.items.map(x=><a key={x.href} className="c-btn" href={x.href} target="_blank" rel="noreferrer">{x.label}<ExternalLink size={13}/></a>)}</div></section>;
 }
}
