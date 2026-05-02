import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

import { resolveDevRendererUrl } from './devRendererUrl';
import { registerIpc } from './ipc/registerIpc';
import { loadSettings } from './settings/settingsStore';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
	mainWindow = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 1280,
		minHeight: 800,
		show: false,
		backgroundColor: '#08060c',
		titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
		trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 14 } : undefined,
		webPreferences: {
			preload: join(__dirname, '../preload/index.js'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	mainWindow.on('ready-to-show', () => {
		mainWindow?.show();
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	if (process.env.ELECTRON_RENDERER_URL) {
		const url = await resolveDevRendererUrl(process.env.ELECTRON_RENDERER_URL);
		await mainWindow.loadURL(url);
		if (process.env.NODE_ENV_ELECTRON_VITE === 'development' && process.env.VEX_OPEN_DEVTOOLS === '1') {
			mainWindow.webContents.openDevTools({ mode: 'detach' });
		}
	} else {
		mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
	}
}

app.whenReady().then(() => {
	const ud = app.getPath('userData');
	registerIpc(() => ud);
	try {
		const s = loadSettings(ud);
		app.setLoginItemSettings({ openAtLogin: Boolean(s.startOnBoot) });
	} catch {
		/* ignore */
	}
	void createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			void createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
