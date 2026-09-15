import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {vercel,team,vercelProject} from './lib/interview-operator.mjs'
const dir='artifacts/qr-explanations'
const paths=['src/components/session-runner.tsx','src/components/mock-runner.tsx','src/app/(app)/exams/[examSlug]/[subtestSlug]/runner.tsx']
const project=await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
const deployment=await vercel(`/v13/deployments/${project.targets.production.id}?teamId=${team}`)
const tree=await vercel(`/v6/deployments/${deployment.id}/files?teamId=${team}`)
const manifest=[]
function walk(nodes,prefix=''){for(const n of nodes){const path=prefix+n.name;if(n.type==='directory')walk(n.children??[],path+'/');else manifest.push({file:path,sha:n.uid,mode:n.mode??33188})}}
walk(tree.find(n=>n.name==='src').children)
const localBefore={},productionBefore={}
for(const file of paths){
 const entry=manifest.find(e=>e.file===file);assert.ok(entry,file)
 const result=await vercel(`/v8/deployments/${deployment.id}/files/${entry.sha}?teamId=${team}`)
 productionBefore[file]=Buffer.from(result.data,'base64').toString('utf8')
 localBefore[file]=readFileSync(file,'utf8')
 assert.equal(localBefore[file],productionBefore[file],`Rebase ${file}`)
}
for(const [name,value] of Object.entries({'display-deployment-before':deployment,'display-manifest':manifest,'display-local-before':localBefore,'display-production-before':productionBefore}))writeFileSync(`${dir}/${name}.json`,JSON.stringify(value,null,2)+'\n')
console.log(JSON.stringify({sourceDeployment:deployment.id,matchingFiles:paths.length,manifestFiles:manifest.length}))
