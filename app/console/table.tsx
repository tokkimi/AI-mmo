'use client';
import {useMemo,useState} from 'react';
import {Search,Download} from 'lucide-react';
import {formatCell,badgeTone} from '@/lib/hub/format';
import type {HubCell,HubColumn,HubRow} from '@/lib/hub/types';
import {RowActions} from './actions';

const PAGE=25;

function csv(columns:HubColumn[],rows:HubRow[]){
 const esc=(v:string)=>/[",;\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;
 const cell=(c:HubColumn,v:HubCell)=>v===null||v===undefined?'':c.format==='money'&&typeof v==='number'?(v/100).toFixed(2):c.format==='date'||c.format==='datetime'?String(v).slice(0,c.format==='date'?10:16).replace('T',' '):String(v);
 return '﻿'+[columns.map(c=>esc(c.label)).join(';'),...rows.map(r=>columns.map(c=>esc(cell(c,r[c.key] as HubCell))).join(';'))].join('\n');
}

export function DataTable({title,description,columns,rows,empty,project,currency}:{title:string;description?:string;columns:HubColumn[];rows:HubRow[];empty?:string;project:string;currency:string}){
 const [q,setQ]=useState('');const [limit,setLimit]=useState(PAGE);
 const filtered=useMemo(()=>{const s=q.trim().toLowerCase();return s?rows.filter(r=>columns.some(c=>{const v=r[c.key];return (typeof v==='string'||typeof v==='number')&&String(v).toLowerCase().includes(s)})):rows},[q,rows,columns]);
 const hasActions=rows.some(r=>r._actions?.length);
 function download(){
  const blob=new Blob([csv(columns,filtered)],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${project}-${title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-')}-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
 }
 return <section className="c-panel">
  <div className="c-panel-head">
   <div><h2>{title}<span className="c-count">{rows.length}</span></h2>{description&&<p className="c-desc">{description}</p>}</div>
   {rows.length>0&&<div className="c-tools">
    {rows.length>6&&<label className="c-search"><Search size={14}/><input value={q} onChange={e=>{setQ(e.target.value);setLimit(PAGE)}} placeholder="Rechercher" aria-label={`Rechercher dans ${title}`}/></label>}
    <button type="button" className="c-btn ghost" onClick={download} title="Exporter en CSV (Excel)"><Download size={14}/>CSV</button>
   </div>}
  </div>
  {!rows.length?<p className="c-empty">{empty||'Aucune donnée.'}</p>:!filtered.length?<p className="c-empty">Aucun résultat pour « {q} ».</p>:<div className="c-table-wrap"><table className="c-table">
   <thead><tr>{columns.map(c=><th key={c.key} className={c.align==='right'?'r':''}>{c.label}</th>)}{hasActions&&<th className="c-th-actions">Actions</th>}</tr></thead>
   <tbody>{filtered.slice(0,limit).map((r,i)=><tr key={i}>{columns.map(c=>{const v=r[c.key] as HubCell;return <td key={c.key} className={c.align==='right'?'r':c.format==='date'||c.format==='datetime'||c.format==='badge'?'nw':''} data-label={c.label}>
    {c.format==='badge'&&v?<mark className={`c-badge ${badgeTone(String(v))}`}>{String(v)}</mark>
    :c.format==='longtext'&&v?<details><summary>{String(v).slice(0,80)}{String(v).length>80?'…':''}</summary><pre>{String(v)}</pre></details>
    :c.format==='link'&&v?<a href={String(v)} target="_blank" rel="noreferrer">Ouvrir ↗</a>
    :formatCell(v,c.format,currency)}
   </td>})}{hasActions&&<td data-label="Actions">{r._actions?.length?<RowActions project={project} actions={r._actions}/>:null}</td>}</tr>)}</tbody>
  </table></div>}
  {filtered.length>limit&&<button type="button" className="c-more" onClick={()=>setLimit(l=>l+PAGE*2)}>Afficher plus ({filtered.length-limit} restants)</button>}
 </section>;
}
