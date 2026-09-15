import { mkdirSync,readFileSync,writeFileSync } from 'node:fs'
import { fullDatabase } from '../tests/helpers/full-database.mjs'
const db=await fullDatabase()
try {
  const {rows}=await db.query(readFileSync('supabase/security-inventory.sql','utf8'))
  mkdirSync('docs/security',{recursive:true})
  writeFileSync('docs/security/database-inventory.local.json',JSON.stringify({scope:'Local migrations only; hosted project not verified',...rows[0].inventory},null,2)+'\n')
  console.log(`Inventoried ${rows[0].inventory.relations.length} relations and ${rows[0].inventory.functions.length} functions; saved local report.`)
} finally {await db.close()}
