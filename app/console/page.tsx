import type {Metadata} from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/server';
import {projects,findProject,isConsoleAdmin,remoteSnapshot,HubUnavailable} from '@/lib/hub/projects';
import {ateliersSnapshot} from '@/lib/hub/ateliers';
import {formatCell,badgeTone} from '@/lib/hub/format';
import type {HubBlock,HubCell,HubSnapshot} from '@/lib/hub/types';
import {RowActions,ActionForm,Refresh} from './actions';
import './console.css';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Console — Emilie Cauvier',robots:{index:false,follow:false}};

export default async function Console({searchParams}:{searchParams:Promise<{p?:string;s?:string}>}){
 const user=await currentUser();
 if(!user)redirect('/?view=login&next=console');
 if(!isConsoleAdmin(user))return <div className="console c-denied"><h1>Accès réservé à l’administration</h1><p>Connectez-vous avec un compte administrateur i-ateliers.</p><Link className="c-btn" href="/">Retour au site</Link></div>;

 const {p,s}=await searchParams;
 const project=findProject(p)||projects[0];
 let snapshot:HubSnapshot|null=null,error='';
 try{snapshot=project.id==='ateliers'?await ateliersSnapshot():await remoteSnapshot(project)}
 catch(e){error=e instanceof HubUnavailable?e.message:'Impossible de charger les données de ce site.';if(!(e instanceof HubUnavailable))console.error('Console',e instanceof Error?e.message:'unknown')}
 const sections=snapshot?.sections||[];
 const section=sections.find(x=>x.id===s)||sections[0];
 const currency=snapshot?.currency||'CAD';

 return <div className="console">
  <header className="c-top">
   <div className="c-owner"><b>Console</b><small>Emilie Cauvier</small></div>
   <nav className="c-projects" aria-label="Sites">
    {projects.map(x=><Link key={x.id} href={`/console?p=${x.id}`} className={x.id===project.id?'c-project active':'c-project'} aria-current={x.id===project.id?'page':undefined} title={x.name}>
     <Image src={x.logo} alt="" width={44} height={34}/><span>{x.name}</span>
    </Link>)}
   </nav>
   <div className="c-top-right"><Refresh/><a className="c-btn" href={project.site} target="_blank" rel="noreferrer">Voir le site ↗</a></div>
  </header>
  <div className="c-body">
   <aside className="c-side" aria-label={`Administration ${project.name}`}>
    <p className="c-side-title">{project.name}</p>
    <nav>{sections.map(x=><Link key={x.id} href={`/console?p=${project.id}&s=${x.id}`} className={x.id===section?.id?'active':''} aria-current={x.id===section?.id?'page':undefined}>
     <i aria-hidden>{x.icon||'•'}</i><span>{x.label}</span>{x.badge?<em>{x.badge}</em>:null}
    </Link>)}</nav>
    <a className="c-side-link" href={project.admin} target="_blank" rel="noreferrer">Admin d’origine ↗</a>
   </aside>
   <main className="c-main">
    {error?<div className="c-panel c-error"><h2>{project.name} n’est pas joignable</h2><p>{error}</p></div>
    :section?<>
     <div className="c-heading"><p>{project.name}</p><h1>{section.label}</h1><small>Données en direct · {formatCell(snapshot!.generatedAt,'datetime')}</small></div>
     {section.blocks.map((b,i)=><Block key={i} block={b} project={project.id} currency={currency}/>)}
    </>:<div className="c-panel"><p>Aucune section disponible.</p></div>}
   </main>
  </div>
 </div>;
}

function Block({block:b,project,currency}:{block:HubBlock;project:string;currency:string}){
 switch(b.type){
  case 'metrics':return <div className="c-metrics">{b.items.map(m=><div key={m.label} className="c-metric"><span>{m.label}</span><b>{typeof m.value==='number'?formatCell(m.value,m.format||'number',currency):m.value}</b>{m.hint&&<small>{m.hint}</small>}</div>)}</div>;
  case 'table':return <section className="c-panel">
   <div className="c-panel-head"><h2>{b.title}</h2><span className="c-count">{b.rows.length}</span></div>
   {b.description&&<p className="c-desc">{b.description}</p>}
   {!b.rows.length?<p className="c-empty">{b.empty||'Aucune donnée.'}</p>:<div className="c-table-wrap"><table className="c-table">
    <thead><tr>{b.columns.map(c=><th key={c.key} className={c.align==='right'?'r':''}>{c.label}</th>)}{b.rows.some(r=>r._actions?.length)&&<th>Actions</th>}</tr></thead>
    <tbody>{b.rows.map((r,i)=><tr key={i}>{b.columns.map(c=>{const v=r[c.key] as HubCell;return <td key={c.key} className={c.align==='right'?'r':''} data-label={c.label}>
     {c.format==='badge'&&v?<mark className={`c-badge ${badgeTone(String(v))}`}>{String(v)}</mark>
     :c.format==='longtext'&&v?<details><summary>{String(v).slice(0,70)}{String(v).length>70?'…':''}</summary><pre>{String(v)}</pre></details>
     :c.format==='link'&&v?<a href={String(v)} target="_blank" rel="noreferrer">Ouvrir ↗</a>
     :formatCell(v,c.format,currency)}
    </td>})}{b.rows.some(x=>x._actions?.length)&&<td data-label="Actions">{r._actions?.length?<RowActions project={project} actions={r._actions}/>:null}</td>}</tr>)}</tbody>
   </table></div>}
  </section>;
  case 'form':return <section className="c-panel"><h2>{b.title}</h2>{b.description&&<p className="c-desc">{b.description}</p>}<ActionForm project={project} action={b.action}/></section>;
  case 'status':return <section className="c-panel"><h2>{b.title}</h2><ul className="c-status">{b.items.map(x=><li key={x.label}><mark className={`c-badge ${x.ok?'good':'warn'}`}>{x.ok?'Actif':'À configurer'}</mark><span>{x.label}</span>{x.detail&&<small>{x.detail}</small>}</li>)}</ul></section>;
  case 'bars':{const max=Math.max(1,...b.items.map(x=>x.value));return <section className="c-panel"><h2>{b.title}</h2>{!b.items.length?<p className="c-empty">Pas encore de données.</p>:<div className="c-bars">{b.items.map(x=><div key={x.label} className="c-bar"><span>{x.label}</span><div><i style={{width:`${Math.max(2,100*x.value/max)}%`}}/></div><b>{formatCell(x.value,b.format||'number',currency)}</b></div>)}</div>}</section>}
  case 'notes':return <section className="c-panel">{b.title&&<h2>{b.title}</h2>}<ul className="c-notes">{b.items.map(x=><li key={x}>{x}</li>)}</ul></section>;
  case 'links':return <section className="c-panel"><h2>{b.title}</h2><div className="c-links">{b.items.map(x=><a key={x.href} className="c-btn" href={x.href} target="_blank" rel="noreferrer">{x.label} ↗</a>)}</div></section>;
 }
}
