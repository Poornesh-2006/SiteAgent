/*
 * SiteAgent embed. One script tag adds the chat bubble to any website:
 *
 *   <script src="https://YOUR-SITE/embed.js" data-business="pixelcraft" data-name="PixelCraft Studio"
 *     data-type="ai" data-chat="https://n8n/webhook/siteagent-chat/chat"
 *     data-lead="https://n8n/webhook/capture-lead" defer></script>
 *
 * data-type: "ai"      AI assistant that answers from the business's knowledge base (n8n chat widget)
 *            "inquiry" guided chat: name -> email -> enquiry          (proposal / invoice flow)
 *            "lead"    guided chat: name -> mobile -> email -> requirement (AI lead scoring)
 * data-color (optional): bubble colour, default #4f46e5
 */
(function () {
  'use strict';
  var tag = document.currentScript || document.querySelector('script[data-business]');
  if (!tag) return;
  var d = tag.dataset;
  var cfg = {
    business: d.business || '',
    name: d.name || 'our team',
    type: ['ai', 'inquiry', 'lead'].indexOf(d.type) >= 0 ? d.type : 'ai',
    chat: d.chat,
    lead: d.lead,
    color: /^#[0-9a-f]{3,8}$/i.test(d.color || '') ? d.color : '#4f46e5',
  };
  var CHAT_VERSION = '1.41.3'; // @n8n/chat, pinned

  if (cfg.type === 'ai') {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/@n8n/chat@' + CHAT_VERSION + '/dist/style.css';
    document.head.appendChild(css);
    document.documentElement.style.setProperty('--chat--color--primary', cfg.color);
    import('https://cdn.jsdelivr.net/npm/@n8n/chat@' + CHAT_VERSION + '/dist/chat.bundle.es.js').then(function (m) {
      m.createChat({
        webhookUrl: cfg.chat,
        metadata: { businessId: cfg.business },
        showWelcomeScreen: false,
        initialMessages: ['Hi! 👋 Welcome to ' + cfg.name + '.', 'Ask me anything about our services, pricing or how we work.'],
        i18n: { en: { title: cfg.name, subtitle: 'Typically replies instantly', footer: '', getStarted: 'New conversation', inputPlaceholder: 'Type your question…' } },
      });
    });
    return;
  }

  // ---------- guided (scripted) bots ----------
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var FLOWS = {
    inquiry: {
      title: cfg.name + ' · Enquiries',
      steps: [
        { key: 'name', ask: function () { return "Hi! 👋 Welcome to " + cfg.name + ". What's your name?"; }, ok: function (v) { return v.length >= 2; }, err: 'Please enter your name (at least 2 characters).' },
        { key: 'email', ask: function (a) { return 'Nice to meet you, ' + a.name.split(' ')[0] + "! What's your email address?"; }, ok: function (v) { return EMAIL.test(v); }, err: "That email doesn't look right. Please try again." },
        { key: 'query', ask: function () { return 'Great! Please describe your enquiry or what you need a proposal for.'; }, ok: function (v) { return v.length >= 10; }, err: 'Please add a bit more detail (at least 10 characters).' },
      ],
      payload: function (a) { return { business_id: cfg.business, name: a.name, email: a.email, requirement: a.query }; },
    },
    lead: {
      title: cfg.name + ' · Contact us',
      steps: [
        { key: 'name', ask: function () { return "Hi! 👋 Welcome to " + cfg.name + ". What's your full name?"; }, ok: function (v) { return v.length >= 2; }, err: 'Please enter your name (at least 2 characters).' },
        { key: 'mobile', ask: function (a) { return 'Thanks ' + a.name.split(' ')[0] + "! What's your mobile number?"; }, ok: function (v) { return v.replace(/\D/g, '').length >= 7; }, err: 'Please enter a valid mobile number.' },
        { key: 'email', ask: function () { return "What's your email address?"; }, ok: function (v) { return EMAIL.test(v); }, err: "That email doesn't look right. Please try again." },
        { key: 'requirement', ask: function () { return 'Please describe what you need in a sentence or two.'; }, ok: function (v) { return v.length >= 10; }, err: 'Please add a bit more detail (at least 10 characters).' },
      ],
      payload: function (a) { return { business_id: cfg.business, name: a.name, email: a.email, phone: a.mobile, requirement: a.requirement }; },
    },
  };
  var flow = FLOWS[cfg.type];

  var style = document.createElement('style');
  style.textContent =
    '#sa-bubble{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;background:' + cfg.color + ';color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center}' +
    '#sa-panel{position:fixed;right:20px;bottom:90px;z-index:2147483000;width:min(370px,calc(100vw - 32px));height:min(520px,calc(100vh - 120px));background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2330}' +
    '#sa-panel.open{display:flex}#sa-head{background:' + cfg.color + ';color:#fff;padding:14px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center}' +
    '#sa-head button{background:none;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1}' +
    '#sa-msgs{flex:1;overflow-y:auto;padding:14px;background:#f6f7fb;display:flex;flex-direction:column;gap:8px}' +
    '.sa-m{max-width:82%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}.sa-bot{background:#fff;border:1px solid #e6e7ee;align-self:flex-start;border-bottom-left-radius:4px}' +
    '.sa-me{background:' + cfg.color + ';color:#fff;align-self:flex-end;border-bottom-right-radius:4px}' +
    '#sa-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e6e7ee;background:#fff}#sa-in{flex:1;border:1px solid #d6d8e0;border-radius:10px;padding:10px;font:inherit;outline:none}' +
    '#sa-form button{border:0;border-radius:10px;background:' + cfg.color + ';color:#fff;padding:0 14px;font-weight:600;cursor:pointer}#sa-form button:disabled,#sa-in:disabled{opacity:.5}';
  document.head.appendChild(style);

  var bubble = el('button', { id: 'sa-bubble', 'aria-label': 'Open chat' });
  bubble.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var panel = el('div', { id: 'sa-panel', role: 'dialog', 'aria-label': flow.title });
  var head = el('div', { id: 'sa-head' }, flow.title);
  var close = el('button', { 'aria-label': 'Close chat' }, '×');
  head.appendChild(close);
  var msgs = el('div', { id: 'sa-msgs' });
  var form = el('form', { id: 'sa-form' });
  var input = el('input', { id: 'sa-in', autocomplete: 'off', placeholder: 'Type your answer…' });
  var send = el('button', { type: 'submit' }, 'Send');
  form.appendChild(input); form.appendChild(send);
  panel.appendChild(head); panel.appendChild(msgs); panel.appendChild(form);
  document.body.appendChild(panel); document.body.appendChild(bubble);

  var answers = {}, step = 0, started = false, done = false;
  bubble.onclick = function () {
    panel.classList.toggle('open');
    if (!started) { started = true; say(flow.steps[0].ask(answers)); }
    if (panel.classList.contains('open')) input.focus();
  };
  close.onclick = function () { panel.classList.remove('open'); };

  form.onsubmit = function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v) return;
    input.value = '';
    say(v, true);
    if (done) { restart(); return; }
    var s = flow.steps[step];
    if (!s.ok(v)) { say(s.err); return; }
    answers[s.key] = v;
    step++;
    if (step < flow.steps.length) say(flow.steps[step].ask(answers));
    else submit();
  };

  function submit() {
    busy(true);
    say('Thanks ' + answers.name.split(' ')[0] + '! Sending your details… ⏳');
    fetch(cfg.lead, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flow.payload(answers)) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || 'HTTP ' + r.status); }); })
      .then(function () {
        done = true;
        say('✅ Done! The ' + cfg.name + ' team will email you at ' + answers.email + ' within one business day.\n\nType anything to start a new request.');
      })
      .catch(function (err) {
        step = 0; answers = {};
        say('❌ Sorry, that didn\'t go through (' + err.message + '). Let\'s try again.');
        say(flow.steps[0].ask(answers));
      })
      .then(function () { busy(false); });
  }
  function restart() { step = 0; answers = {}; done = false; say(flow.steps[0].ask(answers)); }
  function busy(b) { input.disabled = b; send.disabled = b; if (!b) input.focus(); }
  function say(text, me) {
    msgs.appendChild(el('div', { 'class': 'sa-m ' + (me ? 'sa-me' : 'sa-bot') }, text));
    msgs.scrollTop = msgs.scrollHeight;
  }
  function el(tagName, attrs, text) {
    var n = document.createElement(tagName);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
})();
