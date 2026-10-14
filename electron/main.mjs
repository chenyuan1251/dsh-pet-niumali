import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, "..", "web");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preload.mjs"),
    },
  });

  mainWindow.loadFile(join(WEB_ROOT, "index.html"));

  // 默认隐藏菜单栏
  mainWindow.setMenuBarVisibility(false);

  // 保持置顶但可被临时隐藏；开发者可按 Cmd/Ctrl+Shift+H 隐藏/显示
  // 快捷键注册在 app 就绪后处理
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC：退出、最小化、置顶切换
ipcMain.on("pet:close", () => {
  if (mainWindow) mainWindow.close();
});
ipcMain.on("pet:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on("pet:pin", (_event, value) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(!!value);
});
