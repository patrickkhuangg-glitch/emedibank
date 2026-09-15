import assert from 'node:assert/strict';import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {vercel,team,vercelProject} from './lib/interview-operator.mjs';
const dir='artifacts/diagnostic-release',read=n=>JSON.parse(readFileSync(`${dir}/${n}.json`));
if(process.argv.includes('--status')){const r=read('release');const d=await vercel(`/v13/deployments/${r.id}?teamId=${team}`);writeFileSync(`${dir}/deployment-status.json`,JSON.stringify(d,null,2));console.log(JSON.stringify({id:d.id,state:d.readyState,url:d.url,error:d.errorMessage}));process.exit(0)}
const previous=read('deployment'),manifest=read('manifest'),planned=read('changes'),verified=read('content-verification');assert(verified.allRowsMatch);
assert.equal(readFileSync(`${dir}/typecheck.txt`,'utf8'),'','Typecheck must pass');
const changes=new Map(Object.keys(planned).map(file=>[file,readFileSync(file,'utf8')]));
assert(!changes.get('src/components/mock-review-base.tsx').includes('Scores have not been calibrated to a Studocyte cohort.'));
assert(!changes.get('src/app/(app)/mock/[examSlug]/page.tsx').includes('View mini mocks'));
assert(!changes.get('src/components/diagnostic/runner.tsx').includes("from './data.json'"));
const project=await vercel(`/v9/projects/${vercelProject}?teamId=${team}`);const expected=existsSync(`${dir}/release.json`)?read('release').id:previous.id;assert.equal(project.targets.production.id,expected,'Production changed; rebase the scoped release first');
const files=manifest.map(({file,sha,mode})=>changes.has(file)?{file,data:changes.get(file),encoding:'utf-8'}:{file,sha,mode});
for(const[file,data]of changes)if(!manifest.some(f=>f.file===file))files.push({file,data,encoding:'utf-8'});
writeFileSync(`${dir}/released-source.json`,JSON.stringify(Object.fromEntries(changes),null,2));
const result=await vercel(`/v13/deployments?teamId=${team}`,{method:'POST',body:JSON.stringify({name:previous.name,project:vercelProject,target:'production',files,meta:{purpose:'Publish approved Studocyte UCAT Diagnostic Mock Exam and compact website review; remove mini-mock catalogue options',sourceDeployment:previous.id}})});
writeFileSync(`${dir}/release.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({id:result.id,state:result.readyState,url:result.url,changedFiles:changes.size}));
