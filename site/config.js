// Where the site pages reach n8n. For a hosted n8n, set n8n to its URL and
// prefix to the --prefix you built the cloud workflows with.
window.SITEAGENT = {
  n8n: 'https://workflow.ccbp.in',
  prefix: 'poornesh-',
};

// Webhook URL for one of the SiteAgent endpoints, e.g. url('capture-lead').
window.SITEAGENT.url = function (path) {
  return this.n8n + '/webhook/' + this.prefix + path;
};

// Mounts a bot on this page the same way the customer snippet does.
window.siteAgentEmbed = function (opts) {
  var s = document.createElement('script');
  s.src = 'embed.js';
  s.dataset.business = opts.business;
  s.dataset.name = opts.name || '';
  s.dataset.type = opts.type || 'ai';
  s.dataset.chat = window.SITEAGENT.url('siteagent-chat/chat');
  s.dataset.lead = window.SITEAGENT.url('capture-lead');
  document.body.appendChild(s);
};
