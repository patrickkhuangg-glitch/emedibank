import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { vercel, team, vercelProject } from './lib/interview-operator.mjs';
const dir = 'artifacts/workspace-release';
const read = name => JSON.parse(readFileSync(`${dir}/${name}.json`, 'utf8'));
if(process.argv.includes('--status')) {
  const release = read('release');
  const d = await vercel(`/v13/deployments/${release.id}?teamId=${team}`);
  writeFileSync(`${dir}/deployment-status.json`, JSON.stringify(d, null, 2));
  console.log(JSON.stringify({id:d.id, state:d.readyState, url:d.url, aliases:d.alias, error:d.errorMessage}));
  process.exit(0);
}
assert(!existsSync(`${dir}/release.json`), 'A release has already been submitted; check its status.');
const baseline = read('deployment'), manifest = read('manifest'), changes = read('released-source');
const build = readFileSync(`${dir}/build.log`, 'utf8');
assert(build.includes('Compiled successfully') && build.includes('ƒ Proxy (Middleware)'), 'Exact release production build has not passed.');
assert(/fail 0/.test(readFileSync(`${dir}/tests.log`, 'utf8')), 'Release checks have not passed.');
const protectedFiles = Object.keys(JSON.parse(readFileSync('artifacts/workspace-redesign/protected-before.json', 'utf8')));
for(const file of protectedFiles) assert(!(file in changes), `Protected exam source changed: ${file}`);
const source = readFileSync(`${dir}/source-path.txt`, 'utf8');
for(const [file, data] of Object.entries(changes)) assert.equal(readFileSync(`${source}/${file}`, 'utf8'), data, `Built source changed: ${file}`);
for(const {file, sha} of manifest) if(!(file in changes)) assert.equal(createHash('sha1').update(readFileSync(`${source}/${file}`)).digest('hex'), sha, `Production source changed: ${file}`);
const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`);
assert.equal(project.targets.production.id, baseline.id, 'Production changed while preparing this release; refresh the baseline.');
const files = manifest.map(({file, sha, mode}) => file in changes ? {file, data:changes[file], encoding:'utf-8'} : {file, sha, mode});
for(const [file, data] of Object.entries(changes)) if(!manifest.some(entry => entry.file === file)) files.push({file, data, encoding:'utf-8'});
const result = await vercel(`/v13/deployments?teamId=${team}`, {method:'POST', body:JSON.stringify({
  name:baseline.name, project:vercelProject, target:'production', files,
  meta:{purpose:'Publish approved compact student workspace, dashboard milestones and restrained scroll motion', sourceDeployment:baseline.id},
})});
writeFileSync(`${dir}/release.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({id:result.id, state:result.readyState, url:result.url, changedFiles:Object.keys(changes).length}));
