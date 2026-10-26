import type {HubCell,HubFormat} from './types';

export function formatCell(value:HubCell|undefined,format:HubFormat='text',currency='CAD'):string{
 if(value===null||value===undefined||value==='')return '—';
 if(typeof value==='boolean')return value?'Oui':'Non';
 switch(format){
  case 'money':return typeof value==='number'?new Intl.NumberFormat('fr-CA',{style:'currency',currency}).format(value/100):String(value);
  case 'number':return typeof value==='number'?new Intl.NumberFormat('fr-CA').format(value):String(value);
  case 'percent':return typeof value==='number'?`${Math.round(value)} %`:String(value);
  case 'date':{const d=new Date(String(value));return isNaN(d.getTime())?String(value):d.toLocaleDateString('fr-CA',{timeZone:'America/Toronto',day:'numeric',month:'short',year:'numeric'})}
  case 'datetime':{const d=new Date(String(value));return isNaN(d.getTime())?String(value):d.toLocaleString('fr-CA',{timeZone:'America/Toronto',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
  default:return typeof value==='number'?new Intl.NumberFormat('fr-CA').format(value):String(value);
 }
}

const good=/^(actif|active|validé|payé|paid|publié|oui|répondu|livr|expédi|abonné|confirmé|approuv|admin)/i;
const warn=/^(à corriger|en attente|à retravailler|expiré|past|retard|brouillon|non publié|pending|remboursé|refunded|annul|failed|échou)/i;
export const badgeTone=(text:string)=>good.test(text)?'good':warn.test(text)?'warn':'neutral';
