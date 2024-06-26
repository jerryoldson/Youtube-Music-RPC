const { autoUpdater } = require('electron-updater');
const { ipcMain, app, BrowserWindow, Menu, Tray } = require('electron');
const path = require('path');
const initializeIPC = require('./src/connection');
var win = null;
app.disableHardwareAcceleration(false);


const createWindow = () => {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: __dirname + '/build/goodicon.png',
        show: false,
        title: "Youtube Music",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, './src/contentReader.js'),
            devTools: true
        },
    });
    win.webContents.setWindowOpenHandler(() => {
        return { action: "deny" };
    });
    win.removeMenu();

    win.loadURL("https://music.youtube.com/").then(() => {
        win.show();
        discordConnection();
    });

    win.on('close', (evt) => {
        evt.preventDefault();
        win.hide();
    })
}

let tray = null;

app.whenReady().then(() => {
    autoUpdater.checkForUpdates();
    const trayIcnPath = process.env.APP_DEV
        ? path.join(__dirname, `/build/icon.png`)
        : path.join(__dirname, `../../build/icon.png`);
    tray = new Tray(trayIcnPath);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Mostrar', type: 'normal', click: () => win.show() },
        { label: 'Salir', type: 'normal', click: () => app.exit() },
    ])
    tray.setToolTip('Youtube Music')
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => {
        win.show();
    });
    createWindow();
});

async function discordConnection() {
    const IPC = await initializeIPC();
    if (IPC !== null) {
        DSRPCEvents();
    }
}

function DSRPCEvents() {
    ipcMain.on('dsrpc', (e, msg) => {
        if (msg.type == "SET_PRESENCE") {
            IPC.setActivity(msg.text);
        } else {
            IPC.clearActivity();
        }
    })
};