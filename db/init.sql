-- SiteAgent schema. Runs once, when the Postgres volume is first created.

CREATE TABLE businesses (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  owner_email  TEXT NOT NULL,
  knowledge    TEXT NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'INR',
  bot_type     TEXT NOT NULL DEFAULT 'ai',      -- ai | inquiry | lead
  edit_key     TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id                 SERIAL PRIMARY KEY,
  business_id        TEXT NOT NULL REFERENCES businesses(id),
  token              TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  name               TEXT NOT NULL,
  email              TEXT NOT NULL,
  phone              TEXT,
  requirement        TEXT NOT NULL,
  budget             TEXT,
  score              INT,
  tier               TEXT,
  reason             TEXT,
  suggested_service  TEXT,
  status             TEXT NOT NULL DEFAULT 'new',  -- new | proposal_sent | won
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE proposals (
  id              SERIAL PRIMARY KEY,
  lead_id         INT NOT NULL REFERENCES leads(id),
  token           TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  title           TEXT NOT NULL,
  scope           TEXT NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  quantity        INT NOT NULL,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 18,
  subtotal        NUMERIC(12,2) NOT NULL,
  tax             NUMERIC(12,2) NOT NULL,
  total           NUMERIC(12,2) NOT NULL,
  payment_terms   TEXT NOT NULL,
  due_days        INT NOT NULL DEFAULT 15,
  status          TEXT NOT NULL DEFAULT 'sent',  -- sent | accepted
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at     TIMESTAMPTZ
);

CREATE TABLE invoices (
  id           SERIAL PRIMARY KEY,
  proposal_id  INT NOT NULL UNIQUE REFERENCES proposals(id),
  amount       NUMERIC(12,2) NOT NULL,
  due_date     DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge bases built from a website / documents / notes, waiting for the owner to review.
CREATE TABLE knowledge_drafts (
  id          TEXT PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  knowledge   TEXT NOT NULL,
  source_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversation memory for the chat agents (n8n Postgres Chat Memory). Kept in the database so it
-- works when n8n runs several worker processes; in-process memory would forget between messages.
CREATE TABLE n8n_chat_histories (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(255) NOT NULL,
  message     JSONB NOT NULL
);
CREATE INDEX n8n_chat_histories_session ON n8n_chat_histories (session_id);

-- Demo business used by the sample website (site/index.html)
INSERT INTO businesses (id, name, owner_email, knowledge, edit_key) VALUES (
  'pixelcraft',
  'PixelCraft Studio',
  'owner@pixelcraft.test',
  $kb$
# PixelCraft Studio
Small web design & development agency based in Bengaluru, India. Team of 6. In business since 2019, 140+ websites delivered.

## Services and pricing (all prices exclude 18% GST)
1. Business website - up to 5 pages, mobile responsive, contact form, basic on-page SEO. From Rs 25,000. Delivered in 2-3 weeks.
2. E-commerce store - Shopify or WooCommerce, up to 50 products, payment gateway (Razorpay/Stripe), shipping setup. From Rs 60,000. Delivered in 4-6 weeks.
3. Custom web app - dashboards, customer portals, booking systems, internal tools. From Rs 1,50,000, quoted per project after a discovery call. Typically 6-12 weeks.
4. Website maintenance - Rs 3,000 per month: updates, daily backups, security monitoring, up to 2 hours of content changes.
5. SEO & Google Business Profile setup - Rs 8,000 one-time.
6. Extra pages on a business website - Rs 2,500 per page.

## Process
1. Free 20-minute discovery call.
2. Written proposal within 48 hours of the call.
3. 50% advance to start, remaining 50% on launch.
4. Design -> build -> two rounds of revisions -> launch.
Every project includes 30 days of free support after launch.

## Policies & FAQ
- Domain and hosting: we can set them up for you; hosting costs about Rs 4,000-8,000 per year depending on the plan and is billed at cost.
- You own all code and content once the final payment is made.
- We work with clients anywhere in India and abroad (remote, over video calls).
- Payment methods: UPI, bank transfer, or card (via Razorpay).
- Rush delivery (half the normal timeline) is available for +30% of the project price.
- We do NOT build native mobile apps, do logo-only design jobs, or manage social media.

## Contact
Email: hello@pixelcraft.example | Phone: +91 98450 00000
Hours: Monday-Saturday, 10am-7pm IST
$kb$,
  'demo-edit-key'
);

-- Supabase exposes the public schema through its REST API. RLS with no policies
-- blocks that API; n8n connects as the table owner, which bypasses RLS.
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;
