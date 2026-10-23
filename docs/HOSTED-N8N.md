# Running SiteAgent on a hosted n8n (learning portal / n8n Cloud)

A hosted n8n can't reach the Docker containers from the local setup, so swap them for hosted services:

| Local (Docker) | Hosted replacement |
|---|---|
| Postgres container | **Supabase** (free Postgres) |
| Gotenberg container | `demo.gotenberg.dev` (free, rate-limited, fine for testing) or your own Gotenberg |
| Mailpit | **Gmail SMTP** with an App Password |
| `$env` variables | Baked into the files by the cloud build |

## 1. Database: Supabase (5 min)
1. Create a free project at https://supabase.com and save the database password.
2. Go to **SQL Editor → New query**, paste all of [`db/init.sql`](../db/init.sql) and click **Run**. This creates the tables and the PixelCraft demo business.
3. Click **Connect** (top bar) and copy the **Session pooler** details: host (like `aws-0-ap-south-1.pooler.supabase.com`), port `5432`, database `postgres`, user `postgres.<project-ref>`.

## 2. Find your n8n base URL
Open any workflow in your portal's n8n and add a **Webhook** node. Its *Production URL* looks like
`https://something.example.com/webhook/...`. Your base URL is everything before `/webhook`. Delete the test node afterwards.

## 3. Build the workflow files
Pick a short personal prefix so your webhook paths don't clash with other people on a shared n8n:

```powershell
node tools/build-workflows.mjs --cloud --base-url=https://YOUR-N8N-HOST --from=you@gmail.com --prefix=yourname-
```

This writes 4 files to `workflows-cloud/`. Optional flags: `--tz=Asia/Kolkata`, `--pdf-url=https://your-gotenberg/forms/chromium/convert/html`.

**Limited publish slots?** (e.g. "Publish 0/3"): add `--single` to get **two** files: `siteagent-all-in-one.json` (the bot, leads, proposals, setup and knowledge builder) and `siteagent-setup-assistant.json` (the AI setup assistant). n8n allows only one chat trigger per workflow, which is why the assistant is separate. That's two imports and two publish slots.

**Using Groq?** Add `--llm=groq`. Conversations use `openai/gpt-oss-120b` and background jobs (website organizing, lead scoring) use `openai/gpt-oss-20b`, because Groq's free tier limits tokens per minute *per model*.

**Test before importing:** `node tools/portal-test.mjs` builds the same files pointed at your local Docker n8n with local credentials attached (`workflows/portal-test/`), so you can import and test them locally first.

## 4. Create 3 credentials in n8n
Go to **Overview → Credentials → Create**:

| Credential type | Values |
|---|---|
| **Postgres** | Supabase pooler host, database `postgres`, user `postgres.<ref>`, your DB password, port `5432`, SSL **Require** |
| **SMTP** | host `smtp.gmail.com`, port `465`, SSL on, user = your Gmail, password = a [Gmail App Password](https://myaccount.google.com/apppasswords) (needs 2-step verification) |
| **Google Gemini (PaLM) API** | your key from https://aistudio.google.com/apikey |

Can't use Gemini? Delete the two Gemini nodes and attach any other chat-model node your n8n offers: **Groq** (free key at console.groq.com), OpenAI or Anthropic. Nothing else changes.

## 5. Import the workflows
For each file in `workflows-cloud/`, in this order: **4 → 2 → 3 → 1**
1. **Workflows → Create workflow**, then the **⋯** menu (top right) → **Import from File**.
2. Open each node that shows a ⚠️ and select your credential (Postgres / SMTP / Gemini).
3. **Save**, then **Publish** (or toggle **Active**, depending on the n8n version).

## 6. Point the website at your n8n
In `site/config.js`, set `n8n` to your base URL and `prefix` to the same prefix you used in step 3. Then open the site:
- with Docker: `docker compose up -d site` → http://localhost:8080
- or upload the `site/` folder to any static host (Netlify, Vercel, GitHub Pages).

## 7. Test
1. Chat on the demo page. Ask a price question, then ask for a quote.
2. Check your owner inbox. The demo business emails `owner@pixelcraft.test`, so edit it to your own email in Supabase (**Table editor → businesses**), or create your own business at `setup.html`.
3. Click **Create proposal** → submit → open the client email → **Accept** → the invoice arrives.

Things to know on a shared portal:
- **Executions** in n8n show every run. Click a failed one to see which node broke.
- Most errors come from a node that is still missing its credential.
