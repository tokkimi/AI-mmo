'use client';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,Building2,Users,Sparkles,ArrowUpRight,X} from 'lucide-react';
import {useMoney} from './currency';
export default function FormationBubble({go}: {go:(view:string,id?:string)=>void}) {
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const money=useMoney();
  useEffect(()=>{
    if(!open)return;
    function outside(e:PointerEvent){if(!root.current?.contains(e.target as Node))setOpen(false)}
    function escape(e:KeyboardEvent){if(e.key==='Escape'){setOpen(false);trigger.current?.focus()}}
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[open]);
  function navigate(view:string,id?:string){setOpen(false);go(view,id)}
  const items=[
    {name:'Structurer & automatiser',detail:`${money(1200)} ou ${money(100)}/mois`,icon:BookOpen,view:'business-info',offer:'signature'},
    {name:'Former votre équipe',detail:`20 h en groupe · dès ${money(4900)}`,icon:Users,view:'enterprise'},
    {name:'Claude + ChatGPT',detail:`100 % autonome · ${money(499)}`,icon:Sparkles,view:'autonomous-info',offer:'autonomous'},
    {name:'Immobilier Québec',detail:`${money(1200)} ou ${money(100)}/mois`,icon:Building2,view:'immo',offer:'immo-signature'},
  ];
  return <div className="formation-bubble" ref={root}>
    {open&&<section className="formation-bubble-panel" id="formation-bubble-panel" aria-label="Choisir une formation">
      <header><h2>Votre prochain pas commence ici.</h2><button type="button" onClick={()=>{setOpen(false);trigger.current?.focus()}} aria-label="Fermer les formations"><X size={22}/></button></header>
      <p>Découvrez votre parcours ou inscrivez-vous directement.</p>
      {items.map(item=><article key={item.name}><item.icon size={25}/><div><h3>{item.name}</h3><p>{item.detail} · taxes en sus</p><div className="row">{item.view==='immo'?<a href="/immobilier-quebec" onClick={()=>setOpen(false)}>Découvrir <ArrowUpRight size={13}/></a>:<button onClick={()=>navigate(item.view)}>Découvrir <ArrowUpRight size={13}/></button>}{item.offer&&<button onClick={()=>navigate('checkout',item.offer)}>M’inscrire →</button>}</div></div></article>)}
      <small>Prix convertis à titre indicatif en EUR. Paiement en CAD.</small>
    </section>}
    <button type="button" className="formation-bubble-trigger" ref={trigger} aria-expanded={open} aria-controls="formation-bubble-panel" onClick={()=>setOpen(!open)}><span><BookOpen size={22}/></span><span><b>Les formations</b><small>Choisir · S’inscrire</small></span>{open?<X size={18}/>:<ArrowUpRight size={18}/>}</button>
  </div>;
}
