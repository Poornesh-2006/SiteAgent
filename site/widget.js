// Mounts the SiteAgent chat widget for a business.
// Usage: <script type="module" src="widget.js" data-business="pixelcraft" data-name="PixelCraft Studio"></script>
// document.currentScript is null inside modules, so find our tag by its attribute.
const me = document.querySelector('script[data-business]');
const { n8n, prefix = '', chatVersion } = window.SITEAGENT;
const businessId = me.dataset.business;
const name = me.dataset.name || 'our team';

const css = document.createElement('link');
css.rel = 'stylesheet';
css.href = `https://cdn.jsdelivr.net/npm/@n8n/chat@${chatVersion}/dist/style.css`;
document.head.appendChild(css);

const { createChat } = await import(`https://cdn.jsdelivr.net/npm/@n8n/chat@${chatVersion}/dist/chat.bundle.es.js`);
createChat({
  webhookUrl: `${n8n}/webhook/${prefix}siteagent-chat/chat`,
  metadata: { businessId },
  showWelcomeScreen: false,
  initialMessages: [`Hi! 👋 Welcome to ${name}.`, 'Ask me anything about our services, pricing or how we work.'],
  i18n: { en: { title: name, subtitle: 'Typically replies instantly', footer: '', getStarted: 'New conversation', inputPlaceholder: 'Type your question…' } },
});
