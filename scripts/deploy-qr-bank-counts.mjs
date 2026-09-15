import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {vercel,team,vercelProject} from './lib/interview-operator.mjs'
const dir='artifacts/qr-480-upload',read=name=>JSON.parse(readFileSync(`${dir}/${name}.json`))
const previous=read('display-deployment-before'),manifest=read('display-manifest'),before=read('display-production-before')
const file='src/lib/practice/stats.ts',updated=readFileSync(file,'utf8'),original=before[file]
const start=original.indexOf('  const subIds = subs.map'),end=original.indexOf('  // This user\'s attempts')
const newStart=updated.indexOf('  // Exact counts'),newEnd=updated.indexOf('  // This user\'s attempts')
assert.ok(start>0&&end>start&&newStart>0&&newEnd>newStart)
assert.equal(original.slice(0,start),updated.slice(0,newStart));assert.equal(original.slice(end),updated.slice(newEnd))
assert.ok(updated.includes(".select('id', { count: 'exact', head: true })"));assert.ok(updated.includes(".eq('published', true)"));assert.ok(updated.includes(".eq('subtest_id', subtest.id)"))
const project=await vercel(`/v9/projects/${vercelProject}?teamId=${team}`);assert.equal(project.targets.production.id,previous.id,'Live deployment changed; rebase first')
const files=manifest.map(({file:entry,sha,mode})=>entry===file?{file:entry,data:updated,encoding:'utf-8'}:{file:entry,sha,mode})
const result=await vercel(`/v13/deployments?teamId=${team}`,{method:'POST',body:JSON.stringify({name:previous.name,project:vercelProject,target:'production',files,meta:{actor:'codex',purpose:'Show exact published question counts after QR bank expansion',sourceDeployment:previous.id}})})
writeFileSync(`${dir}/count-release.json`,JSON.stringify(result,null,2)+'\n');writeFileSync(`${dir}/count-released-source.json`,JSON.stringify({[file]:updated},null,2)+'\n');console.log(JSON.stringify({id:result.id,state:result.readyState,url:result.url,changedFiles:[file]}))
