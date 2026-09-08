import fs from 'node:fs';import assert from 'node:assert/strict';import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.local');const sql=neon(process.env.DATABASE_URL);const base=process.env.TEST_URL||'http://localhost:3000';const accounts=JSON.parse(fs.readFileSync('../../admin-test-access.json','utf8'));const cookies={};let submissionId,coachingId;
async function req(path,body,who='member',expected=200){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{origin:base,'content-type':'application/json',...(cookies[who]?{cookie:cookies[who]}:{})},body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{throw Error(path+': non-JSON '+r.status+' '+text.slice(0,200))}assert.equal(r.status,expected,path+': '+JSON.stringify(data));if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data;}
try{
await req('admin',undefined,'anon',401);await req('lesson?id=quebec-1',undefined,'anon',403);
for(const a of accounts)await req('auth/login',{email:a.email,password:a.password},a.role);
assert.equal((await req('me')).access,true);assert.equal((await req('me',undefined,'admin')).user.role,'admin');
await req('admin',undefined,'member',403);await req('admin/access',{userId:accounts.find(a=>a.role==='member').id,days:365},'member',403);
const lesson=await req('lesson?id=quebec-1');assert.equal(lesson.questions.length,2);assert.ok(!('answer' in lesson.questions[0]));
const quiz=await req('quiz',{lessonId:'fondations-1',answers:[1,1]});assert.equal(quiz.score,100);assert.equal(quiz.passed,true);
await req('quiz',{lessonId:'fondations-1',answers:[]},'member',400);
await req('note',{lessonId:'fondations-1',body:'SMOKE TEST : note persistante'});await req('favorite',{lessonId:'fondations-1',active:true});
await req('submission',{lessonId:'fondations-1',body:'SMOKE TEST — Ordre du jour fictif : accueil cinq minutes, objectifs dix minutes, questions dix minutes et prochaines étapes cinq minutes. Aucun fait client réel.'});
let p=await req('progress');assert.ok(p.notes.some(n=>n.body.includes('SMOKE TEST')));submissionId=p.submissions.find(s=>s.lesson_id==='fondations-1').id;
await req('admin/review',{id:submissionId,grade:90,feedback:'SMOKE TEST — Travail clair ; ajouter les sources et conserver la validation humaine.'},'admin');
p=await req('progress');assert.equal(p.submissions.find(s=>s.id===submissionId).grade,90);
await req('messages',{body:'SMOKE TEST — Question du membre.'});const member=accounts.find(a=>a.role==='member');const msgs=await req('messages?user='+member.id,undefined,'admin');assert.ok(msgs.some(m=>m.body.includes('Question du membre')));
await req('messages',{userId:member.id,body:'SMOKE TEST — Réponse du formateur.'},'admin');assert.ok((await req('messages')).some(m=>m.body.includes('Réponse du formateur')));
await req('admin/coaching',{title:'SMOKE TEST SESSION',description:'Test technique fictif',starts_at:new Date(Date.now()+86400000).toISOString(),duration:60,capacity:1,meeting_url:'https://meet.google.com/test-smoke-test'},'admin');coachingId=(await req('coaching')).find(s=>s.title==='SMOKE TEST SESSION').id;
await req('booking',{id:coachingId});await req('booking',{id:coachingId},'member',400);assert.ok((await req('coaching')).find(s=>s.id===coachingId).reserved);await req('booking',{id:coachingId,cancel:true});
const r=await fetch(base+'/api/note',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json',cookie:cookies.member},body:JSON.stringify({lessonId:'fondations-1',body:'bad'})});assert.equal(r.status,403);
assert.equal((await req('prompts')).length,36);await req('auth/logout',{},'member');assert.equal((await req('me')).user,null);
console.log('PASS: authentification, permissions, 36 prompts, QCM serveur, progression, notes, favoris, travaux, correction, messagerie, réservation, doublon, origine et déconnexion.');
}finally{
const member=accounts.find(a=>a.role==='member');await sql`DELETE FROM attempts WHERE user_id=${member.id} AND lesson_id='fondations-1'`;await sql`DELETE FROM notes WHERE user_id=${member.id} AND body LIKE 'SMOKE TEST%'`;await sql`DELETE FROM favorites WHERE user_id=${member.id} AND lesson_id='fondations-1'`;await sql`DELETE FROM submissions WHERE user_id=${member.id} AND body LIKE 'SMOKE TEST%'`;await sql`DELETE FROM messages WHERE body LIKE 'SMOKE TEST%'`;await sql`DELETE FROM coaching WHERE title='SMOKE TEST SESSION'`;console.log('Données de test nettoyées.');}
