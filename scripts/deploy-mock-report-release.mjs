import assert from 'node:assert/strict';import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';import {vercel,team,vercelProject} from './lib/interview-operator.mjs';
const dir='artifacts/mock-report-release',read=n=>JSON.parse(readFileSync(`${dir}/${n}.json`));
if(process.argv.includes('--status')){const r=read('release');const d=await vercel(`/v13/deployments/${r.id}?teamId=${team}`);writeFileSync(`${dir}/deployment-status.json`,JSON.stringify(d,null,2));console.log(JSON.stringify({id:d.id,state:d.readyState,url:d.url,error:d.errorMessage}));process.exit(0)}
const previous=read('deployment'),manifest=read('manifest');assert.equal(readFileSync(`${dir}/typecheck.txt`,'utf8'),'');
const paths=read('paths');for(const dir of ['src/lib/mock/report','src/components/mock-report'])for(const f of readdirSync(dir))paths.push(`${dir}/${f}`);
const changes=new Map(paths.map(file=>[file,readFileSync(file,'utf8')]));
const project=await vercel(`/v9/projects/${vercelProject}?teamId=${team}`);assert.equal(project.targets.production.id,existsSync(`${dir}/release.json`)?read('release').id:previous.id,'Production changed; rebase the scoped release');
const files=manifest.map(({file,sha,mode})=>changes.has(file)?{file,data:changes.get(file),encoding:'utf-8'}:{file,sha,mode});for(const[file,data]of changes)if(!manifest.some(f=>f.file===file))files.push({file,data,encoding:'utf-8'});
writeFileSync(`${dir}/released-source.json`,JSON.stringify(Object.fromEntries(changes),null,2));
const result=await vercel(`/v13/deployments?teamId=${team}`,{method:'POST',body:JSON.stringify({name:previous.name,project:vercelProject,target:'production',files,meta:{purpose:'Add paid mock reports and gated free-trial previews',sourceDeployment:previous.id}})});
writeFileSync(`${dir}/release.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({id:result.id,state:result.readyState,url:result.url,changedFiles:changes.size}));
