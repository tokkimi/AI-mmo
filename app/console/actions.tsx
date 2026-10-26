'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import type {HubAction,HubActionResult,HubField} from '@/lib/hub/types';

async function send(project:string,a:HubAction,values:Record<string,unknown>):Promise<HubActionResult>{
 const res=await fetch('/api/console/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project,action:a.action,payload:{...a.payload,...values}})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)return {ok:false,message:data.error||'Action impossible pour le moment.'};
 return data;
}

function readForm(form:HTMLFormElement,fields:HubField[]){
 const data=new FormData(form);const out:Record<string,unknown>={};
 for(const f of fields){
  if(f.type==='checkbox')out[f.name]=data.get(f.name)==='on';
  else{const raw=data.get(f.name);const v=typeof raw==='string'?raw:'';out[f.name]=f.type==='number'?(v===''?null:Number(v)):v}
 }
 return out;
}

function Fields({fields}:{fields:HubField[]}){
 return <>{fields.map(f=><label key={f.name} className={f.type==='checkbox'?'c-check':'c-field'}>
  {f.type==='checkbox'?<><input type="checkbox" name={f.name} defaultChecked={!!f.default}/>{f.label}</>:<>
   <span>{f.label}{f.required?' *':''}</span>
   {f.type==='textarea'?<textarea name={f.name} required={f.required} placeholder={f.placeholder} defaultValue={f.default===undefined?undefined:String(f.default)}/>
   :f.type==='select'?<select name={f.name} required={f.required} defaultValue={f.default===undefined?undefined:String(f.default)}>{f.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
   :<input type={f.type} name={f.name} required={f.required} min={f.min} max={f.max} step={f.type==='number'?'any':undefined} placeholder={f.placeholder} defaultValue={f.default===undefined?undefined:String(f.default)}/>}
  </>}
 </label>)}</>;
}

function Result({r}:{r:HubActionResult|null}){
 if(!r)return null;
 return <div className={r.ok?'c-result ok':'c-result err'} role="status">{r.message||(r.ok?'Modification enregistrée.':'Erreur')}{r.url&&<input aria-label="Lien généré" readOnly value={r.url} onFocus={e=>e.currentTarget.select()}/>}</div>;
}

export function RowActions({project,actions}:{project:string;actions:HubAction[]}){
 const router=useRouter();const [open,setOpen]=useState<HubAction|null>(null);const [result,setResult]=useState<HubActionResult|null>(null);const [pending,start]=useTransition();
 function run(a:HubAction,values:Record<string,unknown>={}){
  if(a.confirm&&!confirm(a.confirm))return;
  start(async()=>{const r=await send(project,a,values);setResult(r);if(r.ok){setOpen(null);router.refresh()}});
 }
 return <div className="c-actions">
  {actions.map(a=><button key={a.label} type="button" disabled={pending} className={a.tone==='danger'?'c-btn danger':'c-btn'} onClick={()=>{setResult(null);a.fields?.length?setOpen(open?.label===a.label?null:a):run(a)}}>{a.label}</button>)}
  {open&&<form className="c-inline-form" onSubmit={e=>{e.preventDefault();run(open,readForm(e.currentTarget,open.fields||[]))}}>
   <Fields fields={open.fields||[]}/>
   <div className="c-row"><button className="c-btn primary" disabled={pending}>{pending?'Envoi…':'Valider'}</button><button type="button" className="c-btn" onClick={()=>setOpen(null)}>Fermer</button></div>
  </form>}
  <Result r={result}/>
 </div>;
}

export function ActionForm({project,action}:{project:string;action:HubAction}){
 const router=useRouter();const [result,setResult]=useState<HubActionResult|null>(null);const [pending,start]=useTransition();
 return <form className="c-form" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const values=readForm(form,action.fields||[]);if(action.confirm&&!confirm(action.confirm))return;start(async()=>{const r=await send(project,action,values);setResult(r);if(r.ok){form.reset();router.refresh()}})}}>
  <Fields fields={action.fields||[]}/>
  <button className="c-btn primary" disabled={pending}>{pending?'Envoi…':action.label}</button>
  <Result r={result}/>
 </form>;
}

export function Refresh(){
 const router=useRouter();const [pending,start]=useTransition();
 return <button type="button" className="c-btn" disabled={pending} onClick={()=>start(()=>router.refresh())}>{pending?'Actualisation…':'Actualiser'}</button>;
}
