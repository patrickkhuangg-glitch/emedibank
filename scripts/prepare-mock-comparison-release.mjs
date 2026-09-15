import {writeFileSync,mkdirSync} from 'node:fs';
import {vercel,team,vercelProject} from './lib/interview-operator.mjs';
const dir='artifacts/mock-comparison-release';mkdirSync(dir,{recursive:true});
const paths=['src/components/mock-review.tsx','src/components/mock-review-base.tsx','src/lib/mock/report/actions.ts','src/lib/mock/report/types.ts','src/lib/mock/report/comparison.ts','src/components/mock-report/previous-average.tsx','src/components/mock-report/previous-average.module.css'];
const project=await vercel(`/v9/projects/${vercelProject}?teamId=${team}`);const deployment=await vercel(`/v13/deployments/${project.targets.production.id}?teamId=${team}`);const tree=await vercel(`/v6/deployments/${deployment.id}/files?teamId=${team}`),manifest=[];
function walk(nodes,prefix=''){for(const n of nodes){const path=prefix+n.name;if(n.type==='directory')walk(n.children??[],path+'/');else manifest.push({file:path,sha:n.uid,mode:n.mode??33188})}}walk(tree.find(n=>n.name==='src').children);
const production={};await Promise.all(paths.map(async path=>{const entry=manifest.find(e=>e.file===path);production[path]=entry?Buffer.from((await vercel(`/v8/deployments/${deployment.id}/files/${entry.sha}?teamId=${team}`)).data,'base64').toString('utf8'):null;}));
for(const[name,value]of Object.entries({deployment,manifest,production,paths}))writeFileSync(`${dir}/${name}.json`,JSON.stringify(value,null,2));
console.log(JSON.stringify({deployment:deployment.id,files:manifest.length,paths:paths.length}));
