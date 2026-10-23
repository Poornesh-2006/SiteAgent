// Builds the hosted-n8n files (--cloud --single) exactly as they are imported into a portal,
// but pointed at the local Docker n8n, then attaches local credentials the way you would by hand.
// Output: workflows/portal-test/*.json, ready for `n8n import:workflow` inside the container.
//
// Usage: node tools/portal-test.mjs [--llm=groq] [--prefix=poornesh-]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const llm = args.llm || 'groq';
const prefix = args.prefix ?? 'poornesh-';
const cloudDir = join(root, 'workflows-cloud');
const outDir = join(root, 'workflows', 'portal-test');
mkdirSync(outDir, { recursive: true });

// Keep whatever portal files are already built; restore them afterwards.
const files = ['siteagent-all-in-one.json', 'siteagent-setup-assistant.json'];
const backup = files.filter((f) => existsSync(join(cloudDir, f)));
for (const f of backup) copyFileSync(join(cloudDir, f), join(outDir, f + '.bak'));

// Inside the container the n8n service is reachable as http://n8n:5678.
execFileSync('node', [join(root, 'tools', 'build-workflows.mjs'), '--cloud', '--single', `--llm=${llm}`,
  '--base-url=http://n8n:5678', '--from=noreply@siteagent.local', `--prefix=${prefix}`], { stdio: 'inherit' });

const CREDS = {
  postgres: { postgres: { id: 'SiteAgentPg00001', name: 'SiteAgent Postgres' } },
  emailSend: { smtp: { id: 'SiteAgentSmtp001', name: 'SiteAgent SMTP' } },
  lmChatGroq: { groqApi: { id: 'SiteAgentGroq001', name: 'SiteAgent Groq' } },
  lmChatGoogleGemini: { googlePalmApi: { id: 'SiteAgentGemini1', name: 'SiteAgent Gemini' } },
};
const ids = { 'siteagent-all-in-one.json': 'PortalTestMain01', 'siteagent-setup-assistant.json': 'PortalTestAsst01' };
for (const f of files) {
  const wf = JSON.parse(readFileSync(join(cloudDir, f), 'utf8'));
  for (const n of wf.nodes) {
    const cred = CREDS[n.type.split('.').pop()];
    if (cred) n.credentials = cred;
  }
  writeFileSync(join(outDir, f), JSON.stringify({ ...wf, id: ids[f], name: 'PORTAL TEST - ' + wf.name }, null, 2));
  console.log('test copy:', join('workflows', 'portal-test', f), `-> id ${ids[f]}`);
}
for (const f of backup) copyFileSync(join(outDir, f + '.bak'), join(cloudDir, f));
