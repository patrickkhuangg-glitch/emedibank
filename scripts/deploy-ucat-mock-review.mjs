import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {vercel,team,vercelProject} from './lib/interview-operator.mjs'
const dir='artifacts/ucat-mock-review-release',read=n=>JSON.parse(readFileSync(`${dir}/${n}.json`))
const previous=read('deployment'),manifest=read('manifest'),before=read('before')
const changed=Object.keys(before).filter(file=>before[file]!==readFileSync(file,'utf8'))
assert.equal(changed.length,15)
const replacements=new Map(changed.map(file=>[file,readFileSync(file,'utf8')]))
const existing=new Set(manifest.map(f=>f.file))
const files=manifest.map(({file,sha,mode})=>replacements.has(file)?{file,data:replacements.get(file),encoding:'utf-8'}:{file,sha,mode})
for(const [file,data]of replacements)if(!existing.has(file))files.push({file,data,encoding:'utf-8'})
const project=await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
assert.equal(project.targets.production.id,previous.id,'Production changed; refresh the source snapshot before deploying')
writeFileSync(`${dir}/released-source.json`,JSON.stringify(Object.fromEntries(replacements),null,2))
const result=await vercel(`/v13/deployments?teamId=${team}`,{method:'POST',body:JSON.stringify({name:previous.name,project:vercelProject,target:'production',files,meta:{actor:'codex',purpose:'Publish QR Mini Mock 1 with website-themed reviews, question timing, navigation and provisional UCAT scoring across mock and practice sessions',sourceDeployment:previous.id}})})
writeFileSync(`${dir}/release.json`,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({id:result.id,state:result.readyState,url:result.url,changedFiles:changed}))
