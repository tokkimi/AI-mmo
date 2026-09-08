import {neon} from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
process.loadEnvFile('.env.local');const sql=neon(process.env.DATABASE_URL);
const accounts=[{email:'admin@ai-immo.test',name:'Administration AI IMMO',role:'admin'},{email:'membre@ai-immo.test',name:'Camille · Compte de test',role:'member'}];
const out=[];
for(const a of accounts){const password='AI!'+randomBytes(15).toString('base64url');const hash=await bcrypt.hash(password,12);const rows=await sql`INSERT INTO users(email,name,role,password_hash,access_until,city,agency,goal) VALUES(${a.email},${a.name},${a.role},${hash},now()+interval '365 days','Québec','Agence de démonstration','Construire un système marketing avec ChatGPT') ON CONFLICT(email) DO NOTHING RETURNING id`;if(rows.length)out.push({...a,password,id:rows[0].id});}
if(out.length){fs.writeFileSync('../../admin-test-access.json',JSON.stringify(out,null,2));console.log('Deux comptes créés. Identifiants enregistrés dans le fichier de travail privé.');}else console.log('Comptes existants conservés.');
