const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('fofuxos', {
  request: (payload) => ipcRenderer.invoke('pdv:request', payload),
  config: () => ipcRenderer.invoke('pdv:config'),
  clearSession: () => ipcRenderer.invoke('pdv:clearSession'),
  windowMode: (mode) => ipcRenderer.invoke('pdv:windowMode', mode),
  quit: () => ipcRenderer.invoke('pdv:quit'),
});
