const input = document.querySelector('#url');
const msg = document.querySelector('#message');
const status = document.querySelector('#status');
const params = new URLSearchParams(location.search);
msg.textContent = params.get('message') || msg.textContent;
window.pdvSetup?.getConfig().then(config => { if (config?.webUrl) input.value = config.webUrl; });
document.querySelector('#form').addEventListener('submit', async (e) => {
  e.preventDefault(); status.textContent = 'Conectando...';
  const result = await window.pdvSetup?.saveConfig(input.value);
  if (!result?.ok) status.textContent = result?.error || 'Não foi possível salvar.';
});
document.querySelector('#retry').addEventListener('click', () => window.pdvSetup?.retry());
