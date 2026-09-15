import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { vercel, team, vercelProject } from './lib/interview-operator.mjs';

const artifactDir = 'artifacts/interview-practice-polish-release';
const sourceDir = '.vercel/interview-practice-polish-release';
const readArtifact = (name) =>
  JSON.parse(readFileSync(`${artifactDir}/${name}.json`, 'utf8'));

if (process.argv.includes('--status')) {
  const release = readArtifact('release');
  const deployment = await vercel(`/v13/deployments/${release.id}?teamId=${team}`);
  writeFileSync(
    `${artifactDir}/deployment-status.json`,
    JSON.stringify(deployment, null, 2),
  );
  console.log(
    JSON.stringify({
      id: deployment.id,
      state: deployment.readyState,
      url: deployment.url,
      aliases: deployment.alias,
      error: deployment.errorMessage,
    }),
  );
  process.exit(0);
}

assert(
  !existsSync(`${artifactDir}/release.json`),
  'A release has already been submitted; check its status.',
);
assert(
  existsSync(`${sourceDir}/.next/BUILD_ID`),
  'The exact release source has not completed a production build.',
);

const baseline = readArtifact('deployment');
const manifest = readArtifact('manifest');
const changes = readArtifact('releasedSource');
const paths = readArtifact('paths');

assert.deepEqual(
  [...Object.keys(changes)].sort(),
  [...paths].sort(),
  'The reviewed release path list does not match the prepared source.',
);

for (const [file, data] of Object.entries(changes)) {
  assert.equal(
    readFileSync(`${sourceDir}/${file}`, 'utf8'),
    data,
    `Built source changed after review: ${file}`,
  );
}

for (const { file, sha } of manifest) {
  if (file in changes) continue;
  const digest = createHash('sha1')
    .update(readFileSync(`${sourceDir}/${file}`))
    .digest('hex');
  assert.equal(digest, sha, `Production baseline changed locally: ${file}`);
}

const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`);
assert.equal(
  project.targets.production.id,
  baseline.id,
  'Production changed while preparing this release; refresh the baseline.',
);

const files = manifest.map(({ file, sha, mode }) =>
  file in changes
    ? { file, data: changes[file], encoding: 'utf-8' }
    : { file, sha, mode },
);

for (const [file, data] of Object.entries(changes)) {
  if (!manifest.some((entry) => entry.file === file)) {
    files.push({ file, data, encoding: 'utf-8' });
  }
}

const result = await vercel(`/v13/deployments?teamId=${team}`, {
  method: 'POST',
  body: JSON.stringify({
    name: baseline.name,
    project: vercelProject,
    target: 'production',
    files,
    meta: {
      purpose: 'Interactive interview workspace polish and two-minute panel practice',
      sourceDeployment: baseline.id,
    },
  }),
});

writeFileSync(`${artifactDir}/release.json`, JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({
    id: result.id,
    state: result.readyState,
    url: result.url,
    changedFiles: Object.keys(changes).length,
  }),
);
