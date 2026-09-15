import { readFileSync, writeFileSync, mkdirSync, existsSync, symlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { vercel, team } from './lib/interview-operator.mjs';
const dir = 'artifacts/trial-notice-release';
const read = name => JSON.parse(readFileSync(`${dir}/${name}.json`, 'utf8'));
const baseline = read('deployment'), manifest = read('manifest'), paths = read('paths');
const destination = resolve('.vercel/trial-notice-release');
mkdirSync(destination, { recursive: true });
for (const entry of manifest) {
  let content;
  for (const candidate of [entry.file, `.vercel/workspace-contrast-release/${entry.file}`, `.vercel/workspace-entry-release/${entry.file}`, `.vercel/workspace-redesign-release/${entry.file}`]) {
    if (existsSync(candidate)) {
      const local = readFileSync(candidate);
      if(createHash('sha1').update(local).digest('hex') === entry.sha) { content = local; break; }
    }
  }
  if(!content) content = Buffer.from((await vercel(`/v8/deployments/${baseline.id}/files/${entry.sha}?teamId=${team}`)).data, 'base64');
  if(createHash('sha1').update(content).digest('hex') !== entry.sha) throw Error(`Hash mismatch: ${entry.file}`);
  const file = `${destination}/${entry.file}`;
  mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content);
}
const changes = {};
for(const path of paths) {
  const content = readFileSync(path, 'utf8');
  mkdirSync(dirname(`${destination}/${path}`), { recursive: true });
  writeFileSync(`${destination}/${path}`, content); changes[path] = content;
}
if(!existsSync(`${destination}/node_modules`)) symlinkSync(resolve('node_modules'), `${destination}/node_modules`, 'dir');
writeFileSync(`${dir}/released-source.json`, JSON.stringify(changes, null, 2));
writeFileSync(`${dir}/source-path.txt`, destination);
console.log(JSON.stringify({destination, baseline:baseline.id, changedFiles:paths.length, verifiedBaselineFiles:manifest.length}));
