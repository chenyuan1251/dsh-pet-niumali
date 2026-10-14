import { contextBridge, ipcRenderer } from "electron";

// 只暴露桌面宠物需要的安全 API，不暴露完整 ipc 或 node
contextBridge.exposeInMainWorld("niumaliPet", {
  close: () => ipcRenderer.send("pet:close"),
  minimize: () => ipcRenderer.send("pet:minimize"),
  setAlwaysOnTop: (value) => ipcRenderer.send("pet:pin", value),
});
