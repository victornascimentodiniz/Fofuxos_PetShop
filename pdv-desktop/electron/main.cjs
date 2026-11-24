const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged;
const apiBase = (process.env.PDV_API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');
const server = new URL(apiBase);
if (!['http:', 'https:'].includes(server.protocol) ||
    (server.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(server.hostname))) {
  throw new Error('PDV_API_URL precisa ser HTTPS ou HTTP local (localhost).');
}
let cookies = new Map();
const allowed = [
  /^\/auth\/pos-operators$/,
  /^\/auth\/login$/,
  /^\/auth\/me$/,
  /^\/auth\/logout$/,
  /^\/pos\/cash\/(open|current|withdrawal|supply|close|history)$/,
  /^\/pos\/attendance-groups$/,
  /^\/pos\/sales(?:\/products|\/[0-9a-f-]{36})?$/,
];
function updateCookies(response) {
  const values = response.headers.getSetCookie?.() || [];
  for (const line of values) {
    const first = line.split(';')[0];
    const idx = first.indexOf('=');
    if (idx <= 0) continue;
    const key = first.slice(0, idx);
    const value = first.slice(idx + 1);
    if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(line) || !value) cookies.delete(key);
    else cookies.set(key, value);
  }
}
function authorizedPath(raw) {
  if (typeof raw !== 'string' || raw.length > 500) throw new Error('Rota inválida.');
  const url = new URL(raw, 'http://pdv.local');
  if (url.origin !== 'http://pdv.local' || !allowed.some((pattern) => pattern.test(url.pathname))) {
    throw new Error('Operação não permitida no PDV.');
  }
  return url.pathname + url.search;
}
async function requestApi({ method, route, body }) {
  if (!['GET', 'POST'].includes(method)) throw new Error('Método não permitido.');
  const safePath = authorizedPath(route);
  if (safePath.startsWith('/auth/login') && method !== 'POST') throw new Error('Método inválido.');
  if (body !== undefined && JSON.stringify(body).length > 120000) throw new Error('Requisição muito grande.');
  try {
    const response = await fetch(apiBase + safePath, {
      method,
      headers: {
        'Accept': 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookies.size ? { Cookie: Array.from(cookies).map(([k,v]) => `${k}=${v}`).join('; ') } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    updateCookies(response);
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = { message: raw.slice(0, 500) }; }
    if (safePath.startsWith('/auth/logout')) cookies.clear();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { message: `Não foi possível acessar a API (${error.message}).` } };
  }
}

ipcMain.handle('pdv:request', (_event, payload) => requestApi(payload));
ipcMain.handle('pdv:config', () => ({ apiBase, version: app.getVersion() }));
ipcMain.handle('pdv:clearSession', () => { cookies.clear(); return true; });
// A janela e controlada somente pelo renderer deste BrowserWindow.
ipcMain.handle('pdv:windowMode', (event, mode) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return false;
  if (mode === 'pdv') {
    win.maximize();
    return true;
  }
  if (mode === 'login') {
    if (win.isFullScreen()) win.setFullScreen(false);
    if (win.isMaximized()) win.unmaximize();
    win.setSize(1220, 800);
    win.center();
    return true;
  }
  return false;
});
ipcMain.handle('pdv:quit', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return false;
  // O botao Sair so e apresentado na tela de login.
  win.close();
  return true;
});
function createWindow() {
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1220, height: 800, minWidth: 900, minHeight: 640,
    title: 'Fofuxos PDV', backgroundColor: '#f6f7fa', show: false,
    autoHideMenuBar: true,
    frame: true,
    fullscreen: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
    },
  });
  win.once('ready-to-show', () => {
    // Login no tamanho normal. Somente o PDV autenticado fica maximizado.
    win.center();
    win.show();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  if (isDev) win.loadURL('http://127.0.0.1:5180');
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
