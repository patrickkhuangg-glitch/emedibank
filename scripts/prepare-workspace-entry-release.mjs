import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { vercel, team, vercelProject } from './lib/interview-operator.mjs';
const dir = 'artifacts/workspace-entry-release';
mkdirSync(dir, { recursive: true });
const paths = [
  "src/components/workspace/entry-motion.module.css",
  "src/components/workspace/workspace-loading.tsx",
  "src/components/workspace/entry-link.tsx",
  "src/components/workspace/workspace-frame.tsx",
  "src/app/(app)/app/exam-picker.tsx",
  "src/app/(app)/app/loading.tsx",
  "src/app/(app)/app/error.tsx",
  "src/app/(app)/dashboard/loading.tsx",
  "src/app/(app)/layout.tsx",
  "src/components/site-nav.tsx",
  "src/lib/exam/actions.ts",
  "src/components/marketing-header.tsx",
  "src/components/mobile-nav.tsx",
  "src/app/(marketing)/page.tsx"
];
const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`);
const deployment = await vercel(`/v13/deployments/${project.targets.production.id}?teamId=${team}`);
const tree = await vercel(`/v6/deployments/${deployment.id}/files?teamId=${team}`);
const manifest = [];
function walk(nodes, prefix = '') { for (const n of nodes) { const file = prefix + n.name; if(n.type === 'directory') walk(n.children ?? [], file + '/'); else manifest.push({file, sha:n.uid, mode:n.mode ?? 33188}); } }
walk(tree.find(n => n.name === 'src').children);
const production = {};
const inspectPaths = [...new Set([...paths, 'package.json', 'package-lock.json', 'src/components/container.tsx', 'src/components/app-header.tsx', 'src/components/ui/wordmark.tsx', 'src/app/(app)/interviews/page.tsx', 'src/app/prototypes/layout.tsx', ...Object.keys(JSON.parse(readFileSync('artifacts/workspace-redesign/protected-before.json', 'utf8')))])];
for(let i = 0; i < inspectPaths.length; i += 8) await Promise.all(inspectPaths.slice(i,i+8).map(async file => {
  const entry = manifest.find(e => e.file === file);
  production[file] = entry ? Buffer.from((await vercel(`/v8/deployments/${deployment.id}/files/${entry.sha}?teamId=${team}`)).data, 'base64').toString('utf8') : null;
}));
for(const [name, value] of Object.entries({ deployment, manifest, production, paths })) writeFileSync(`${dir}/${name}.json`, JSON.stringify(value, null, 2));
console.log(JSON.stringify({deployment:deployment.id, url:deployment.url, files:manifest.length, planned:paths.length}));
