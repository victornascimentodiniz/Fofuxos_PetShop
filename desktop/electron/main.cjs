'use strict';
const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let win;
function configPath() { return path.join(app.getPath('userData'), 'config.json'); }
function validUrl(input) {
  try {
    const u = new URL(input);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return null;
    if (u.username || u.password) return null;
    return u;
  } catch { return null; }
}
function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); }
  catch { return { webUrl: 'http://localhost:5173/caixa' }; }
}
function saveConfig(webUrl) {
  const u = validUrl(webUrl);
  if (!u) throw new Error('Use HTTPS ou HTTP somente para localhost.');
  const target = new URL('/caixa', u.origin).toString();
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify({ webUrl: target }, null, 2), { mode: 0o600 });
  return target;
}
function welcomePage(message) {
  win.loadFile(path.join(__dirname, 'setup.html'), { query: { message: message || '' } });
}
async function openWeb(url) {
  const u = validUrl(url);
  if (!u) { welcomePage('Endereço inválido. Informe HTTPS ou localhost.'); return; }
  try {
    const response = await fetch(u.origin, { signal: AbortSignal.timeout(5000) });
    if (!response.ok && response.status >= 500) throw new Error(`Servidor retornou ${response.status}`);
    await win.loadURL(u.toString());
  } catch { welcomePage('Não foi possível conectar ao sistema web. Confira o endereço e a conexão.'); }
}
function createWindow() {
  win = new BrowserWindow({
    title: 'Fofuxos PDV', width: 1280, height: 830, minWidth: 920, minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      webSecurity: true, allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    const target = validUrl(url);
    const home = validUrl(readConfig().webUrl);
    if (target && home && target.origin === home.origin) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const home = validUrl(readConfig().webUrl);
    const target = validUrl(url);
    if (!home || !target || home.origin !== target.origin) event.preventDefault();
  });
  // Redirecionamentos para outros domínios não devem carregar dentro do app.
  win.webContents.on('will-redirect', (event, url) => {
    const home = validUrl(readConfig().webUrl);
    const target = validUrl(url);
    if (!home || !target || home.origin !== target.origin) event.preventDefault();
  });
  win.webContents.on('did-fail-load', (_, errorCode, description, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) welcomePage(`Falha de conexão: ${description}`);
  });
  openWeb(readConfig().webUrl);
}
app.whenReady().then(() => {
  ipcMain.handle('pdv:get-config', (event) => {
    if (event.sender !== win?.webContents || !event.sender.getURL().startsWith('file:')) return null;
    return readConfig();
  });
  ipcMain.handle('pdv:save-config', async (event, url) => {
    if (event.sender !== win?.webContents || !event.sender.getURL().startsWith('file:')) return { ok: false };
    try { const target = saveConfig(url); await openWeb(target); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('pdv:retry', async (event) => {
    if (event.sender !== win?.webContents || !event.sender.getURL().startsWith('file:')) return;
    await openWeb(readConfig().webUrl);
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
