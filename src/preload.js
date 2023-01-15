// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
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
  onShowFinished: (callback) => ipcRenderer.on('show-finished', callback),
  onDownloadCanceled: (callback) => ipcRenderer.on('cancel-download', callback),
});
