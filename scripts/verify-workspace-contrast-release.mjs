import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { vercel, team, vercelProject, APP } from './lib/interview-operator.mjs';
const dir = 'artifacts/workspace-contrast-release';
const read = name => JSON.parse(readFileSync(`${dir}/${name}.json`, 'utf8'));
const release = read('release'), baseline = read('manifest'), changes = read('released-source');
const deployment = await vercel(`/v13/deployments/${release.id}?teamId=${team}`);
assert.equal(deployment.readyState, 'READY');
const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`);
assert.equal(project.targets.production.id, release.id);
assert(deployment.alias.includes(new URL(APP).hostname), 'The production domain is not assigned to this release.');
const tree = await vercel(`/v6/deployments/${release.id}/files?teamId=${team}`), manifest = [];
function walk(nodes, prefix = '') { for(const n of nodes) { const file = prefix + n.name; if(n.type === 'directory') walk(n.children ?? [], file + '/'); else manifest.push({file, sha:n.uid}); } }
walk(tree.find(n => n.name === 'src').children);
for(const {file,sha} of baseline) {
  const expected = file in changes ? createHash('sha1').update(changes[file]).digest('hex') : sha;
  assert.equal(manifest.find(entry => entry.file === file)?.sha, expected, `Unexpected published source: ${file}`);
}
for(const [file, data] of Object.entries(changes)) assert.equal(manifest.find(entry => entry.file === file)?.sha, createHash('sha1').update(data).digest('hex'));
const checks = await Promise.all(['/', '/login', '/app', '/dashboard', '/practice/ucat', '/interviews', '/api/health', '/prototypes/workspace'].map(async path => {
  const response = await fetch(APP + path, {redirect:'manual', signal:AbortSignal.timeout(30000)});
  const result = {path, status:response.status, location:response.headers.get('location')};
  if(path === '/api/health') { result.health = await response.json(); assert.equal(response.status, 200); assert.equal(result.health.status, 'ok'); }
  else if(path === '/prototypes/workspace') assert.equal(response.status, 404);
  else if(['/app', '/dashboard', '/practice/ucat', '/interviews'].includes(path)) { assert([303,307,308].includes(response.status)); assert(result.location?.includes('/login')); }
  else assert.equal(response.status, 200);
  return result;
}));
const result = {deployment:release.id, url:APP, verifiedFiles:manifest.length, changedFiles:Object.keys(changes).length, checks};
writeFileSync(`${dir}/verification.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
