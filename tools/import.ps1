# Rebuilds the workflow JSON, imports credentials + workflows into the running
# n8n container, publishes them and restarts n8n so the webhooks go live.
# Usage (from the repo root):  powershell -File tools/import.ps1 [-SkipCredentials]
param([switch]$SkipCredentials)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

node tools/build-workflows.mjs

if (-not $SkipCredentials) {
  docker exec siteagent-n8n n8n import:credentials --input=/import/credentials/credentials.json
}
$ids = @{
  '1-chat-agent' = 'SiteAgentChat001'; '2-leads' = 'SiteAgentLeads01'
  '3-proposals-invoices' = 'SiteAgentDeals01'; '4-business-setup' = 'SiteAgentSetup01'
}
foreach ($f in $ids.Keys) {
  docker exec siteagent-n8n n8n import:workflow --input=/import/workflows/$f.json
  docker exec siteagent-n8n n8n publish:workflow --id=$($ids[$f])
}
docker restart siteagent-n8n | Out-Null
Write-Host 'Waiting for n8n...'
do { Start-Sleep 2 } until ((curl.exe -s -o NUL -w '%{http_code}' http://localhost:5678/healthz) -eq '200')
Write-Host 'n8n is up: http://localhost:5678'
