import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {vercel,team,vercelProject} from './lib/interview-operator.mjs'
const dir='artifacts/qr-explanations',read=name=>JSON.parse(readFileSync(`${dir}/${name}.json`))
const previous=read('display-deployment-before'),manifest=read('display-manifest'),localBefore=read('display-local-before'),productionBefore=read('display-production-before')
const replacements=new Map()
for(const [file,original] of Object.entries(localBefore)){
 assert.equal(productionBefore[file],original,`Rebase ${file}`)
 const updated=readFileSync(file,'utf8');assert.notEqual(updated,original,file)
 // Each file changes only by wrapping the explanation in a whitespace-preserving div.
 assert.equal(updated.replace(/<div className="whitespace-pre-line">(\{(?:result|graded\.result|answered\.result)\.explanation_text\})<\/div>/g,'$1'),original,file)
 replacements.set(file,updated)
}
assert.equal(replacements.size,3)
const project=await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
assert.equal(project.targets.production.id,previous.id,'Live deployment changed')
const files=manifest.map(({file,sha,mode})=>replacements.has(file)?{file,data:replacements.get(file),encoding:'utf-8'}:{file,sha,mode})
const result=await vercel(`/v13/deployments?teamId=${team}`,{method:'POST',body:JSON.stringify({name:previous.name,project:vercelProject,target:'production',files,meta:{actor:'codex',purpose:'Preserve paragraphs in worked question explanations across practice and mock review',sourceDeployment:previous.id}})})
writeFileSync(`${dir}/display-release.json`,JSON.stringify(result,null,2)+'\n')
writeFileSync(`${dir}/display-released-source.json`,JSON.stringify(Object.fromEntries(replacements),null,2)+'\n')
console.log(JSON.stringify({id:result.id,state:result.readyState,url:result.url,changedFiles:[...replacements.keys()]}))
