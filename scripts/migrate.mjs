import {neon} from '@neondatabase/serverless';
import fs from 'node:fs';
process.loadEnvFile('.env.local');
const sql=neon(process.env.DATABASE_URL);
for(const statement of fs.readFileSync('scripts/schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean)) await sql.query(statement);
console.log('Database schema ready');
