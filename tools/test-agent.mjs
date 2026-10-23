// Accuracy checks for the chat agent against the demo business (PixelCraft Studio).
// Needs the stack running and a real Gemini key in the "SiteAgent Gemini" credential.
// Usage: node tools/test-agent.mjs
const CHAT = process.env.CHAT_URL || 'http://localhost:5678/webhook/siteagent-chat/chat';

async function ask(sessionId, chatInput, businessId = 'pixelcraft') {
  const res = await fetch(CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sendMessage', sessionId, chatInput, metadata: { businessId } }),
  });
  const data = await res.json().catch(() => ({}));
  const reply = data.output ?? data.text;
  if (!res.ok || typeof reply !== 'string') throw new Error(`HTTP ${res.status}, no agent reply: ${JSON.stringify(data)}`);
  return reply;
}

const norm = (s) => s.toLowerCase().replace(/[–—‑]/g, '-').replace(/[’‘]/g, "'").replace(/₹\s?/g, 'rs ');
// Free AI tiers rate-limit per minute; DELAY=20 spaces the questions out (seconds).
const pause = () => new Promise((r) => setTimeout(r, Number(process.env.DELAY || 0) * 1000));
const cases = [
  { q: 'How much does a basic business website cost?', must: [/25,000|25000|25k/], why: 'exact price from KB' },
  { q: 'How long does an online store take to build?', must: [/4\s*(-|to)\s*6/], why: 'exact timeline from KB' },
  { q: 'Is GST included in your prices?', must: [/18/], why: 'GST policy' },
  { q: 'Roughly what does hosting cost per year?', must: [/4,000|4000/], why: 'hosting range' },
  { q: 'Can you build me an iPhone app?', must: [/not|don't|do not|no\b/], why: 'declines unsupported service' },
  { q: 'Do you give a discount for NGOs?', must: [/not sure|don't have|do not have|team|follow up|check/], mustNot: [/\d+\s?%\s?(off|discount)/], why: 'no invented discount' },
  { q: 'What is the capital of France?', mustNot: [/paris/], why: 'stays on topic' },
  { q: 'How much is a root canal?', mustNot: [/6,500|6500/], why: "no leakage from another business's knowledge" },
];

let pass = 0;
for (const [i, c] of cases.entries()) {
  if (i) await pause();
  const answer = await ask(`eval-${Date.now()}-${i}`, c.q);
  const a = norm(answer);
  const ok = (c.must || []).every((r) => r.test(a)) && !(c.mustNot || []).some((r) => r.test(a));
  pass += ok;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.why}\n      Q: ${c.q}\n      A: ${answer.replace(/\s+/g, ' ').slice(0, 220)}\n`);
}

// Multi-turn lead capture: the agent should call capture_lead once it has name + email + need.
const s = `eval-lead-${Date.now()}`;
const email = process.env.LEAD_EMAIL || `eval.${Date.now()}@example.com`;
for (const msg of [
  'I want a quote for a Shopify store',
  `I'm Ravi Kumar, email ${email}. I sell spices, about 40 products, budget around Rs 80,000, want to launch in 2 months.`,
]) {
  await pause();
  console.log(`      U: ${msg}\n      A: ${(await ask(s, msg)).replace(/\s+/g, ' ').slice(0, 220)}`);
}
console.log(`\n${pass}/${cases.length} knowledge checks passed.`);
console.log(`Lead check: open http://localhost:8025 — there should be a lead email for ${email}.`);
