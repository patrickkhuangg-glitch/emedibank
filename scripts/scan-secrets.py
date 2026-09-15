"""Read-only, redacted pattern scan of both Git histories and application files.
No credential values, source excerpts or credential fingerprints are emitted.
This supplements (does not replace) an independent scanner and provider review.
"""
import base64, json, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rules = {
    'stripe_secret': re.compile(r'\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}'),
    'openai_secret': re.compile(r'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}'),
    'github_secret': re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})'),
    'google_api_key': re.compile(r'\bAIza[A-Za-z0-9_-]{30,}'),
    'supabase_secret': re.compile(r'\bsb_secret_[A-Za-z0-9_-]{20,}'),
    'private_key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'webhook_secret': re.compile(r'\bwhsec_[A-Za-z0-9]{20,}'),
}
jwt = re.compile(r'\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+')
findings=[]
scanned={'working_files':0,'historical_patches':0}
incomplete=[]

def scan(data,location):
    text=data.decode('utf-8',errors='replace')
    for rule,pattern in rules.items():
        for match in pattern.finditer(text):
            findings.append({'location':location,'line':text.count('\n',0,match.start())+1,'rule':rule})
    for match in jwt.finditer(text):
        try:
            payload=json.loads(base64.urlsafe_b64decode(match[1]+'='*(-len(match[1])%4)))
            if payload.get('role')=='service_role':
                findings.append({'location':location,'line':text.count('\n',0,match.start())+1,'rule':'supabase_service_role_jwt'})
        except (ValueError,UnicodeError): pass

repos=[repo for repo in [ROOT,ROOT.parent] if subprocess.run(
    ['git','rev-parse','--is-inside-work-tree'],cwd=repo,
    stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
).returncode==0]
for repo in repos:
    # Git's exclusion rules keep local credentials/artifacts out of this tracked-source report.
    paths=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=repo).decode().split('\0')
    for path in set(paths):
        if not path or (repo==ROOT.parent and path.startswith(('studocyte/','.agents/','.codex/','output/','tmp/'))): continue
        f=repo/path
        if f.is_file() and f.suffix in ('.ts','.tsx','.js','.mjs','.cjs','.json','.sql','.md','.yaml','.yml','.toml','.example','.py') and f.stat().st_size<2_000_000:
            scan(f.read_bytes(),str(f.relative_to(ROOT.parent)));scanned['working_files']+=1
    history=subprocess.check_output(['git','log','--all','--format=COMMIT:%H','--no-ext-diff','--no-textconv','--no-renames','-p'],cwd=repo,timeout=60).decode(errors='replace')
    for revision in history.split('COMMIT:')[1:]:
        commit,_,patch=revision.partition('\n')
        for change in patch.split('diff --git ')[1:]:
            heading,_,content=change.partition('\n')
            scan(content.encode(),f'{repo.name}:git-commit:{commit}:{heading} (patch line)')
            scanned['historical_patches']+=1
    for build in [repo/'.next/static',repo/'dist/client']:
        if build.exists():
            for f in build.rglob('*.js'):
                scan(f.read_bytes(),str(f.relative_to(ROOT.parent)));scanned['working_files']+=1

report={'scope':'Local application files, reachable Git history, existing client bundles; excludes remote logs/screenshots/deployments and ignored local secrets','counts':scanned,'incomplete':incomplete,'findings':findings}
out=ROOT/'docs/security/secret-scan.local.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'counts':scanned,'finding_count':len(findings),'report':str(out)}))
