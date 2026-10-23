# SiteAgent

**An AI sales assistant you can add to any website.** Paste one snippet and visitors get a chat assistant that answers from *your* business knowledge, turns interested visitors into scored leads, and takes them through proposal → acceptance → invoice automatically.

Built with **n8n** (agent + automations), **Google Gemini**, **Postgres**, **Gotenberg** (HTML → PDF) and the official **n8n chat widget**. Inspired by [AgentOps](https://github.com/merajstack/AgentOps), but the website bot is a real AI agent instead of a scripted form, and the whole flow ships as importable workflows.

```
Visitor ──chat──► AI agent (answers ONLY from the business's knowledge base)
                     │ wants a quote?
                     ▼
              capture_lead tool ──► validate ─► AI lead score (hot/warm/cold) ─► save
                                        │                                      │
                                        ▼                                      ▼
                         🔥 hot: auto-reply to visitor          owner email + "Create proposal" button
                                                                               │
                                     owner fills form (price, qty, GST, terms) ◄┘
                                                    │
                                     proposal PDF ─► client email with "Accept" button
                                                    │ client clicks Accept
                                                    ▼
                                     invoice PDF ─► client (owner CC'd), lead marked "won"
```

## The four workflows

| # | Workflow | Webhooks | What it does |
|---|----------|----------|--------------|
| 1 | Chat Agent | `siteagent-chat/chat` | Looks up the business by `businessId`, injects its full knowledge base into the agent, keeps per-visitor memory, calls `capture_lead` |
| 2 | Lead Capture & Scoring | `POST capture-lead` | Validates, scores 0–100 with Gemini against the business's services, saves, emails owner, auto-replies to hot leads |
| 3 | Proposals & Invoices | `GET proposal-form`, `POST proposal-submit`, `GET accept-proposal` | Owner's proposal form → PDF → client email → one-click accept → invoice PDF |
| 4 | Business Setup | `POST save-business`, `GET get-business` | Any business can register, write its knowledge base and get its embed snippet; edit later with an edit key |

### Why answers stay accurate
Each business's knowledge base is fetched **by ID on every message** and given to the agent in full, with strict rules: answer only from it, quote prices exactly, say "I don't know" and offer a follow-up instead of guessing, and refuse off-topic questions. For small-business knowledge bases (up to tens of pages) this is more reliable than vector search, which can retrieve the wrong chunk. Businesses are isolated: one business's facts never reach another's assistant. `tools/test-agent.mjs` checks this.

## Run it locally

Requirements: Docker Desktop, Node 18+.

```powershell
docker compose up -d                                   # n8n, Postgres, Gotenberg, Mailpit, demo site
powershell -ExecutionPolicy Bypass -File tools/import.ps1   # build + import + publish workflows
```

1. Open **http://localhost:5678** and create your n8n owner account.
2. Get a free Gemini API key at **https://aistudio.google.com/apikey**.
3. In n8n go to **Overview → Credentials → "SiteAgent Gemini"**, paste the key and save. (Postgres and SMTP credentials are already set up.)
4. Open **http://localhost:8080** (demo business PixelCraft Studio) and chat with the bubble in the bottom-right corner.
5. Open **http://localhost:8025** (Mailpit) to see every email: lead alerts, proposals and invoices with PDFs.
6. Open **http://localhost:8080/setup.html** to create an assistant for another business.

Run the accuracy checks: `node tools/test-agent.mjs`

| URL | What |
|-----|------|
| http://localhost:5678 | n8n editor |
| http://localhost:8080 | Demo website with the assistant |
| http://localhost:8080/setup.html | Create or edit a business assistant |
| http://localhost:8025 | Mailpit, catches all outgoing email |

## Project layout

```
docker-compose.yml          the whole stack
db/init.sql                 schema + demo business (PixelCraft Studio) knowledge base
credentials/credentials.json  local credentials imported into n8n (placeholder Gemini key)
tools/build-workflows.mjs   source of truth for the workflows — edit here, then re-run import.ps1
tools/import.ps1            build → import → publish → restart n8n
tools/test-agent.mjs        knowledge-accuracy + lead-capture checks
workflows/*.json            generated, importable n8n workflows
site/                       demo website, setup page, preview page, widget loader
```

## Going to production
- **Email:** edit the "SiteAgent SMTP" credential to use a real provider (Gmail: `smtp.gmail.com`, port 465, SSL, and an [App Password](https://myaccount.google.com/apppasswords)), and set `SITEAGENT_FROM_EMAIL` to that address.
- **Public URL:** set `SITEAGENT_PUBLIC_URL` (e.g. `https://n8n.yourdomain.com`) in a `.env` file so links in emails and snippets point to it, and set `n8n` in `site/config.js`.
- **Model:** swap the Gemini nodes for Anthropic Claude or OpenAI chat-model nodes. Nothing else changes.
- **Never commit real API keys.** Keys you add in the n8n UI stay in the n8n database, not in this repo.
- Restrict `allowedOrigins` on the chat trigger to your customers' domains.

## License
MIT
