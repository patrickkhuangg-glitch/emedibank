import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {vercel,team,vercelProject} from './lib/interview-operator.mjs'
const dir='artifacts/qr-exclusive-mocks-release',read=n=>JSON.parse(readFileSync(`${dir}/${n}.json`))
const previous=read('deployment'),manifest=read('manifest'),paths=read('paths'),production=read('production')
const changes=new Map(paths.map(p=>[p,readFileSync(p,'utf8')]).filter(([p,s])=>s!==production[p]))
assert.equal(changes.size,11)
assert.equal(JSON.parse(readFileSync('../output/ucat-qr-fresh-mocks-02-08/audit.json')).status,'passed')
const project=await vercel(`/v9/projects/${vercelProject}?teamId=${team}`);assert.equal(project.targets.production.id,previous.id,'Production moved; review source before deploying')
const files=manifest.map(({file,sha,mode})=>changes.has(file)?{file,data:changes.get(file),encoding:'utf-8'}:{file,sha,mode})
for(const[file,data]of changes)if(!manifest.some(f=>f.file===file))files.push({file,data,encoding:'utf-8'})
writeFileSync(`${dir}/released-source.json`,JSON.stringify(Object.fromEntries(changes),null,2))
const result=await vercel(`/v13/deployments?teamId=${team}`,{method:'POST',body:JSON.stringify({name:previous.name,project:vercelProject,target:'production',files,meta:{purpose:'Seven additional QR mini-mocks with exclusive content excluded from practice discovery, access, grading and review queues',sourceDeployment:previous.id}})})
writeFileSync(`${dir}/release.json`,JSON.stringify(result,null,2))
console.log(JSON.stringify({id:result.id,state:result.readyState,url:result.url,changedFiles:changes.size}))
