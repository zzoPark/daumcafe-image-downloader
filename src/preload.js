const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  downloadImages: (url, begin, end, excludeBegin, excludeEnd) =>
    ipcRenderer.invoke(
      'download-images',
      url,
      begin,
      end,
      excludeBegin,
      excludeEnd
    ),
  dirname: () => ipcRenderer.invoke('dirname'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getPath: (name) => ipcRenderer.invoke('get-path', name),
  onShowFinished: (callback) => ipcRenderer.on('show-finished', callback),
  onDownloadCanceled: (callback) => ipcRenderer.on('cancel-download', callback),
  onConsoleLog: (callback) => ipcRenderer.on('console-log', callback),
});
