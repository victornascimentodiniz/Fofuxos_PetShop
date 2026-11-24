'use strict';
const { contextBridge, ipcRenderer } = require('electron');
// A camada principal valida a origem de cada chamada. Sites remotos nao podem
// consultar ou alterar a configuracao; somente a tela file:// de configuracao.
contextBridge.exposeInMainWorld('pdvSetup', {
  getConfig: () => ipcRenderer.invoke('pdv:get-config'),
  saveConfig: url => ipcRenderer.invoke('pdv:save-config', url),
  retry: () => ipcRenderer.invoke('pdv:retry'),
});
